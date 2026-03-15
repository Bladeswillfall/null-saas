import { Card, CardBody, CardTitle } from '@null/ui';

export default function FreshnessPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Source Freshness & Coverage</h1>
        <p>Monitor pipeline health and data availability</p>
      </div>

      <Card>
        <CardBody>
          <CardTitle>Coming Soon</CardTitle>
          <p className="muted">
            Operations dashboard showing source health, last refresh timestamps, stale source warnings, and data coverage gaps.
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Features: Per-source import status, batch success/failure summaries, freshness indicators, missing-data alerts.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
