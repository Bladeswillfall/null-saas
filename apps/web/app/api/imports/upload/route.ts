import { createClient } from '@/lib/supabase/server';
import { mapRowsForProvider, parseCsvUpload, validateImportFile } from '@/lib/imports';

export const runtime = 'nodejs';

type StageImportRowsResult = {
  inserted_count: number;
  invalid_count: number;
};

function errorResponse(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('You must be signed in to upload imports.', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const providerSlug = String(formData.get('providerSlug') ?? '').trim();
    const organizationId = String(formData.get('organizationId') ?? '').trim();

    if (!organizationId) {
      return errorResponse('Select an organization before uploading.');
    }

    if (!providerSlug) {
      return errorResponse('Choose a provider before uploading.');
    }

    if (!(file instanceof File)) {
      return errorResponse('Choose a CSV file to upload.');
    }

    const fileValidation = validateImportFile(file.name);
    if (!fileValidation.ok) {
      return errorResponse(fileValidation.message ?? 'Unsupported upload file.', 400);
    }

    const { data: membership, error: membershipError } = await (supabase as any)
  .from('organization_members')
  .select('role')
  .eq('organization_id', organizationId)
  .eq('user_id', user.id)
  .maybeSingle();

if (membershipError || !membership || !['admin', 'owner'].includes(membership.role)) {
  return errorResponse(
    `Upload auth failed: user=${user.id} org=${organizationId} membership=${JSON.stringify(
      membership ?? null
    )} membershipError=${membershipError?.message ?? 'none'}`,
    403
  );
}

    const { data: provider, error: providerError } = await (supabase as any)
      .from('source_providers')
      .select('id, slug, name')
      .eq('slug', providerSlug)
      .maybeSingle();

    if (providerError) {
      console.error('[imports/upload] Failed to load provider', providerError);
      return errorResponse('We could not verify that provider just now.', 500);
    }

    if (!provider) {
      return errorResponse('Unknown provider. Pick a valid source provider and try again.', 400);
    }

    const csvText = await file.text();
    const parsedRows = parseCsvUpload(csvText);
    if (parsedRows.length === 0) {
      return errorResponse('The CSV is empty. Add at least one data row and upload again.', 400);
    }

    const { stagedRows, invalidRows, rowsReceived } = mapRowsForProvider(parsedRows, provider);

    const { data: batch, error: batchError } = await (supabase as any)
      .from('import_batches')
      .insert({
        organization_id: organizationId,
        source_provider_id: provider.id,
        import_type: 'csv',
        uploaded_by: user.id,
        status: 'processing',
        row_count: rowsReceived,
        error_count: invalidRows.length,
        started_at: new Date().toISOString()
      })
      .select('id, created_at, started_at')
      .single();

    if (batchError || !batch) {
      console.error('[imports/upload] Failed to create import batch', batchError);
      return errorResponse('We could not create the import batch.', 500);
    }

    if (stagedRows.length === 0) {
      await (supabase as any)
        .from('import_batches')
        .update({
          status: 'failed',
          row_count: rowsReceived,
          error_count: invalidRows.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      return errorResponse(invalidRows[0]?.message ?? 'No valid rows were found in the CSV.', 400);
    }

    const { data: stageResult, error: stageError } = await (supabase as any).rpc('stage_import_rows', {
      p_organization_id: organizationId,
      p_source_provider_id: provider.id,
      p_import_batch_id: batch.id,
      p_source_file_name: file.name,
      p_source_file_type: 'csv',
      p_rows: stagedRows
    });

    if (stageError) {
      console.error('[imports/upload] Failed to stage rows', stageError);
      await (supabase as any)
        .from('import_batches')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);
      return errorResponse('We could not stage the CSV rows in Supabase.', 500);
    }

    const stageSummary = Array.isArray(stageResult)
      ? (stageResult[0] as StageImportRowsResult | undefined)
      : (stageResult as StageImportRowsResult | null);

    const rowsInserted = stageSummary?.inserted_count ?? 0;
    const rowsInvalid = (stageSummary?.invalid_count ?? 0) + invalidRows.length;
    const status = rowsInserted === 0 ? 'failed' : rowsInvalid > 0 ? 'partial' : 'complete';

    const { error: completeError } = await (supabase as any)
      .from('import_batches')
      .update({
        status,
        row_count: rowsReceived,
        error_count: rowsInvalid,
        completed_at: new Date().toISOString()
      })
      .eq('id', batch.id);

    if (completeError) {
      console.error('[imports/upload] Failed to finalize batch', completeError);
      return errorResponse('The upload reached staging, but we could not finalize the batch status.', 500);
    }

    return Response.json({
      ok: true,
      importBatchId: batch.id,
      providerSlug: provider.slug,
      fileName: file.name,
      rowsReceived,
      rowsInserted,
      rowsInvalid,
      status,
      message: 'Import staged successfully.',
      invalidRows
    });
  } catch (error) {
    console.error('[imports/upload] Unexpected error', error);
    return errorResponse('Internal server error', 500);
  }
}
