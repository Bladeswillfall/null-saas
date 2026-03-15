import { Card, CardBody, CardTitle } from '@null/ui';

export default function ImportsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Imports & QC</h1>
        <p>Manage data ingestion and quality control</p>
      </div>

      <Card>
        <CardBody>
          <CardTitle>Coming Soon</CardTitle>
          <p className="muted">
            CSV import workflow and quality assurance dashboard for tracking raw observations, normalization status, and flagged issues.
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Features: Batch upload history, row-level error reporting, duplicate detection, unresolved match review queue, provenance tagging.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
