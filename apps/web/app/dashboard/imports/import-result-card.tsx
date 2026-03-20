export type UploadResult = {
  ok: true;
  importBatchId: string;
  providerSlug: string;
  fileName: string;
  rowsReceived: number;
  rowsInserted: number;
  rowsInvalid: number;
  reviewCount: number;
  autoApproved: boolean;
  status: string;
  autoReviewStatus: "pending" | "ready" | "needs_manual_review" | "published";
  autoReviewSummary: {
    invalidRowCount: number;
    sourceRecordCount: number;
    matchedCount: number;
    needsReviewCount: number;
    normalizedCount: number;
    unresolvedCount: number;
    flagCount: number;
  };
  published: boolean;
  message: string;
  invalidRows?: Array<{ line: number; message: string }>;
};

export function ImportResultCard({ result }: { result: UploadResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className="analytics-panel"
      style={{ marginTop: "1rem", background: "var(--panel-subtle)" }}
    >
      <h3 style={{ marginTop: 0 }}>Upload staged successfully</h3>
      <dl className="analytics-grid-4" style={{ marginBottom: "1rem" }}>
        <div>
          <dt>File name</dt>
          <dd>{result.fileName}</dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>{result.providerSlug}</dd>
        </div>
        <div>
          <dt>Import batch ID</dt>
          <dd>{result.importBatchId}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{result.status}</dd>
        </div>
        <div>
          <dt>Auto review</dt>
          <dd>{result.autoReviewStatus}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{result.published ? "Yes" : "Needs confirmation"}</dd>
        </div>
        <div>
          <dt>Rows received</dt>
          <dd>{result.rowsReceived}</dd>
        </div>
        <div>
          <dt>Rows inserted</dt>
          <dd>{result.rowsInserted}</dd>
        </div>
        <div>
          <dt>Rows invalid</dt>
          <dd>{result.rowsInvalid}</dd>
        </div>
        <div>
          <dt>Rows matched</dt>
          <dd>{result.autoReviewSummary.matchedCount}</dd>
        </div>
        <div>
          <dt>Needs review</dt>
          <dd>{result.autoReviewSummary.needsReviewCount}</dd>
        </div>
        <div>
          <dt>QC flags</dt>
          <dd>{result.autoReviewSummary.flagCount}</dd>
        </div>
        <div>
          <dt>Message</dt>
          <dd>{result.message}</dd>
        </div>
      </dl>

      {result.invalidRows && result.invalidRows.length > 0 ? (
        <div style={{ marginBottom: "1rem" }}>
          <strong>Invalid rows</strong>
          <ul>
            {result.invalidRows.slice(0, 5).map((row) => (
              <li key={`${row.line}-${row.message}`}>
                Line {row.line}: {row.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p style={{ marginBottom: 0 }}>
        {result.published
          ? "Next actions: Verify the live leaderboard output and keep an eye on new review candidates."
          : "Next actions: Review flagged rows in the web app, resolve anything suspicious, then confirm publish."}
      </p>
    </div>
  );
}
