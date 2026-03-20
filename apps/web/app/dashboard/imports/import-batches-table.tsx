"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@null/ui";
import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/analytics";

type BatchRow = {
  id: string;
  sourceProviderName: string;
  sourceProviderSlug: string;
  importType: string;
  status: string;
  autoReviewStatus: "pending" | "ready" | "needs_manual_review" | "published";
  rowCount: number;
  errorCount: number;
  normalizedCount: number;
  unresolvedFlagCount: number;
  sourceRecordCount: number;
  reviewQueueCount: number;
  publishedAt: Date | string | null;
  reviewedAt: Date | string | null;
  autoReviewSummary: {
    invalidRowCount: number;
    sourceRecordCount: number;
    matchedCount: number;
    needsReviewCount: number;
    normalizedCount: number;
    unresolvedCount: number;
    flagCount: number;
  } | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
};

function renderReviewStatus(batch: BatchRow) {
  if (batch.autoReviewStatus === "published") {
    return "Published";
  }
  if (batch.autoReviewStatus === "needs_manual_review") {
    return "Manual review required";
  }
  if (batch.autoReviewStatus === "ready") {
    return "Ready to publish";
  }
  return "Pending";
}

export function ImportBatchesTable({ batches }: { batches: BatchRow[] }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const publishMutation = trpc.importBatch.publish.useMutation({
    onSuccess: async () => {
      await utils.importBatch.list.invalidate();
      router.refresh();
    },
  });

  return (
    <section className="analytics-panel">
      <div className="page-header" style={{ marginBottom: "1rem" }}>
        <h2>Recent import batches</h2>
        <p>
          Newest first. Auto-review runs immediately after upload; only flagged
          batches need your approval before publish.
        </p>
      </div>

      {batches.length === 0 ? (
        <div
          className="analytics-panel"
          style={{ background: "var(--panel-subtle)" }}
        >
          <h3 style={{ marginTop: 0 }}>No import batches yet</h3>
          <p style={{ marginBottom: 0 }}>
            Upload your first provider CSV to create a staged import batch.
            Goodreads Excel files should be converted to CSV first.
          </p>
        </div>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Auto review</th>
                <th>Staged</th>
                <th>Matched</th>
                <th>Needs review</th>
                <th>QC flags</th>
                <th>Published</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>{formatDateTime(String(batch.createdAt))}</td>
                  <td>
                    <strong>{batch.sourceProviderName}</strong>
                    <div className="analytics-table__muted">
                      {batch.sourceProviderSlug}
                    </div>
                  </td>
                  <td>
                    <div>{batch.status}</div>
                    <div className="analytics-table__muted">
                      {batch.importType}
                    </div>
                  </td>
                  <td>
                    <div>{renderReviewStatus(batch)}</div>
                    <div className="analytics-table__muted">
                      {batch.startedAt
                        ? `Started ${formatDateTime(String(batch.startedAt))}`
                        : "Awaiting worker"}
                    </div>
                  </td>
                  <td>{batch.sourceRecordCount || batch.rowCount}</td>
                  <td>{batch.autoReviewSummary?.matchedCount ?? 0}</td>
                  <td>{batch.reviewQueueCount}</td>
                  <td>{batch.unresolvedFlagCount}</td>
                  <td>
                    {batch.publishedAt
                      ? formatDateTime(String(batch.publishedAt))
                      : "—"}
                  </td>
                  <td>
                    <div
                      className="analytics-actions"
                      style={{ flexDirection: "column", alignItems: "stretch" }}
                    >
                      <Button asChild variant="secondary">
                        <Link href="/dashboard/leaderboard">Review queue</Link>
                      </Button>
                      {batch.autoReviewStatus !== "published" ? (
                        <Button
                          onClick={() =>
                            publishMutation.mutate({ batchId: batch.id })
                          }
                          disabled={publishMutation.isPending}
                        >
                          {publishMutation.isPending
                            ? "Publishing…"
                            : "Confirm publish"}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
