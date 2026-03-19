export type UploadResult = {
  ok: true;
  importBatchId: string;
  providerSlug: string;
  fileName: string;
  rowsReceived: number;
  rowsInserted: number;
  rowsInvalid: number;
  status: string;
  message: string;
  invalidRows?: Array<{ line: number; message: string }>;
};

export function ImportResultCard({ result }: { result: UploadResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <div className="analytics-panel" style={{ marginTop: '1rem', background: 'var(--panel-subtle)' }}>
      <h3 style={{ marginTop: 0 }}>Upload staged successfully</h3>
      <dl className="analytics-grid-4" style={{ marginBottom: '1rem' }}>
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
          <dt>Message</dt>
          <dd>{result.message}</dd>
        </div>
      </dl>

      {result.invalidRows && result.invalidRows.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <strong>Invalid rows</strong>
          <ul>
            {result.invalidRows.slice(0, 5).map((row) => (
              <li key={`${row.line}-${row.message}`}>Line {row.line}: {row.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p style={{ marginBottom: 0 }}>
        Next actions: Review this batch, resolve unmatched rows, and rebuild scores.
      </p>
    </div>
  );
}
