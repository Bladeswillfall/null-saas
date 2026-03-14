import { Card, CardBody, CardTitle } from '@null/ui';

export default function IPLeaderboardPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>IP Leaderboard</h1>
        <p>Franchise and IP rollup rankings</p>
      </div>

      <Card>
        <CardBody>
          <CardTitle>Coming Soon</CardTitle>
          <p className="muted">
            IP/franchise-level rankings rolled up from individual works and titles.
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Features: Active work count per IP, momentum across all works, category breakdown, score components by source family.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
