import { createClient } from "@/lib/supabase/server";
import {
  mapRowsForProvider,
  parseCsvUpload,
  validateImportFile,
} from "@/lib/imports";
import { autoReviewStagedImportBatch, createContext } from "@null/api";
import { rawObservations } from "@null/db";

export const runtime = "nodejs";

type StageImportRowsResult = {
  inserted_count: number;
  invalid_count: number;
};

function errorResponse(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("You must be signed in to upload imports.", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const providerSlug = String(formData.get("providerSlug") ?? "").trim();
    const organizationId = String(formData.get("organizationId") ?? "").trim();

    if (!organizationId) {
      return errorResponse("Select an organization before uploading.");
    }

    if (!providerSlug) {
      return errorResponse("Choose a provider before uploading.");
    }

    if (!(file instanceof File)) {
      return errorResponse("Choose a CSV file to upload.");
    }

    const fileValidation = validateImportFile(file.name);
    if (!fileValidation.ok) {
      return errorResponse(
        fileValidation.message ?? "Unsupported upload file.",
        400,
      );
    }

    const { data: membership, error: membershipError } = await (supabase as any)
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      membershipError ||
      !membership ||
      !["admin", "owner"].includes(membership.role)
    ) {
      console.error("[imports/upload] Organization upload auth failed", {
        requestId,
        userId: user.id,
        organizationId,
        membership,
        membershipError,
      });
      return errorResponse(
        "You must be an organization admin to upload imports for this organization.",
        403,
      );
    }

    const { data: provider, error: providerError } = await (supabase as any)
      .from("source_providers")
      .select("id, slug, name")
      .eq("slug", providerSlug)
      .maybeSingle();

    if (providerError) {
      console.error("[imports/upload] Failed to load provider", {
        requestId,
        providerError,
      });
      return errorResponse("We could not verify that provider just now.", 500);
    }

    if (!provider) {
      return errorResponse(
        "Unknown provider. Pick a valid source provider and try again.",
        400,
      );
    }

    const csvText = await file.text();
    const parsedRows = parseCsvUpload(csvText);
    if (parsedRows.length === 0) {
      return errorResponse(
        "The CSV is empty. Add at least one data row and upload again.",
        400,
      );
    }

    const { stagedRows, invalidRows, rowsReceived } = mapRowsForProvider(
      parsedRows,
      provider,
    );

    const { data: batch, error: batchError } = await (supabase as any)
      .from("import_batches")
      .insert({
        organization_id: organizationId,
        source_provider_id: provider.id,
        import_type: "csv",
        uploaded_by: user.id,
        status: "processing",
        row_count: rowsReceived,
        error_count: invalidRows.length,
        started_at: new Date().toISOString(),
      })
      .select("id, created_at, started_at")
      .single();

    if (batchError || !batch) {
      console.error("[imports/upload] Failed to create import batch", {
        requestId,
        batchError,
      });
      return errorResponse("We could not create the import batch.", 500);
    }

    if (stagedRows.length === 0) {
      await (supabase as any)
        .from("import_batches")
        .update({
          status: "failed",
          row_count: rowsReceived,
          error_count: invalidRows.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id);

      return errorResponse(
        invalidRows[0]?.message ?? "No valid rows were found in the CSV.",
        400,
      );
    }

    const { data: stageResult, error: stageError } = await (
      supabase as any
    ).rpc("stage_import_rows", {
      p_organization_id: organizationId,
      p_source_provider_id: provider.id,
      p_import_batch_id: batch.id,
      p_source_file_name: file.name,
      p_source_file_type: "csv",
      p_rows: stagedRows,
    });

    if (stageError) {
      console.error("[imports/upload] Failed to stage rows", {
        requestId,
        stageError,
      });
      await (supabase as any)
        .from("import_batches")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id);
      return errorResponse("We could not stage the CSV rows in Supabase.", 500);
    }

    const stageSummary = Array.isArray(stageResult)
      ? (stageResult[0] as StageImportRowsResult | undefined)
      : (stageResult as StageImportRowsResult | null);

    const rowsInserted = stageSummary?.inserted_count ?? 0;
    const rowsInvalid = (stageSummary?.invalid_count ?? 0) + invalidRows.length;
    const status =
      rowsInserted === 0 ? "failed" : rowsInvalid > 0 ? "partial" : "complete";

    const { error: completeError } = await (supabase as any)
      .from("import_batches")
      .update({
        status,
        row_count: rowsReceived,
        error_count: rowsInvalid,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batch.id);

    if (completeError) {
      console.error("[imports/upload] Failed to finalize batch", {
        requestId,
        completeError,
      });
      return errorResponse(
        "The upload reached staging, but we could not finalize the batch status.",
        500,
      );
    }

    const ctx = createContext({ supabase: supabase as any, user });
    await ctx.db.insert(rawObservations).values(
      stagedRows.map((row) => {
        const metadata =
          row.metadata_json &&
          typeof row.metadata_json === "object" &&
          !Array.isArray(row.metadata_json)
            ? (row.metadata_json as Record<string, unknown>)
            : {};
        const creator =
          typeof metadata.author_primary === "string"
            ? metadata.author_primary
            : Array.isArray(metadata.authors)
              ? metadata.authors
                  .filter((value): value is string => typeof value === "string")
                  .join(", ")
              : null;

        return {
          importBatchId: batch.id,
          sourceProviderId: provider.id,
          rawWorkTitle: String(row.title ?? ""),
          rawIpName: String(row.ip_name ?? row.title ?? ""),
          rawAuthorOrCreator: creator,
          rawCategory: String(row.media_type ?? "book"),
          rawRegion: String(row.region ?? "unknown"),
          rawLanguage: String(row.language ?? "en"),
          observedAt: new Date(String(row.observed_at)),
          rankValue: row.rank_value ? Number(row.rank_value) : null,
          ratingValue: row.rating_value ? String(row.rating_value) : null,
          reviewCount: row.review_count ? Number(row.review_count) : null,
          viewCount: row.view_count ? Number(row.view_count) : null,
          engagementCount: row.engagement_count
            ? Number(row.engagement_count)
            : null,
          salesValue: row.sales_value ? String(row.sales_value) : null,
          salesIsEstimated:
            typeof row.sales_is_estimated === "string"
              ? ["true", "1", "yes", "y"].includes(
                  row.sales_is_estimated.toLowerCase(),
                )
              : null,
          awardsValue:
            typeof row.award_name === "string" ? row.award_name : null,
          metadataJson: {
            ...metadata,
            file_name: file.name,
            source_provider: row.source_provider,
            external_id: row.external_id,
            external_url: row.external_url,
            media_type: row.media_type,
            original_row: row,
          },
        };
      }),
    );

    const autoReview = await autoReviewStagedImportBatch(ctx, {
      organizationId,
      batchId: batch.id,
      rows: stagedRows.map((row) => {
        const metadata =
          row.metadata_json &&
          typeof row.metadata_json === "object" &&
          !Array.isArray(row.metadata_json)
            ? (row.metadata_json as Record<string, unknown>)
            : {};
        const creator =
          typeof metadata.author_primary === "string"
            ? metadata.author_primary
            : Array.isArray(metadata.authors)
              ? metadata.authors
                  .filter((value): value is string => typeof value === "string")
                  .join(", ")
              : null;

        return {
          ...row,
          title: row.title,
          author: creator,
          creator,
          publisher:
            typeof metadata.publisher === "string" ? metadata.publisher : null,
          asin: typeof metadata.asin === "string" ? metadata.asin : null,
          isbn_10:
            typeof metadata.isbn_10 === "string" ? metadata.isbn_10 : null,
          isbn_13:
            typeof metadata.isbn_13 === "string" ? metadata.isbn_13 : null,
        };
      }),
      invalidRowCount: rowsInvalid,
    });

    return Response.json({
      ok: true,
      importBatchId: batch.id,
      providerSlug: provider.slug,
      fileName: file.name,
      rowsReceived,
      rowsInserted,
      rowsInvalid,
      reviewCount,
      autoApproved,
      status,
      autoReviewStatus: autoReview.autoReviewStatus,
      autoReviewSummary: autoReview.autoReviewSummary,
      published: autoReview.published,
      message: autoReview.published
        ? "Import auto-reviewed and published successfully."
        : "Import staged and auto-reviewed successfully.",
      invalidRows,
    });
  } catch (error) {
    console.error("[imports/upload] Unexpected error", { requestId, error });
    return errorResponse("Internal server error", 500);
  }
}
