import { formatDateTime } from '@/lib/analytics';

export function ImportBatchesTable({
  batches
}: {
  batches: Array<{
    id: string;
    sourceProviderName: string;
    sourceProviderSlug: string;
    importType: string;
    status: string;
    rowCount: number;
    errorCount: number;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    createdAt: Date | string;
  }>;
}) {
  return (
    <section className="analytics-panel">
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h2>Recent import batches</h2>
        <p>Newest first. Use this list to confirm staging and see which batches need follow-up review.</p>
      </div>

      {batches.length === 0 ? (
        <div className="analytics-panel" style={{ background: 'var(--panel-subtle)' }}>
          <h3 style={{ marginTop: 0 }}>No import batches yet</h3>
          <p style={{ marginBottom: 0 }}>
            Upload your first provider CSV to create a staged import batch. Goodreads Excel files should be converted to CSV first.
          </p>
        </div>
      ) : (
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Provider</th>
                <th>File type</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Errors</th>
                <th>Started</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>{formatDateTime(String(batch.createdAt))}</td>
                  <td>
                    <strong>{batch.sourceProviderName}</strong>
                    <div className="analytics-table__muted">{batch.sourceProviderSlug}</div>
                  </td>
                  <td>{batch.importType}</td>
                  <td>{batch.status}</td>
                  <td>{batch.rowCount}</td>
                  <td>{batch.errorCount}</td>
                  <td>{batch.startedAt ? formatDateTime(String(batch.startedAt)) : '—'}</td>
                  <td>{batch.completedAt ? formatDateTime(String(batch.completedAt)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
