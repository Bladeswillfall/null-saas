import Link from 'next/link';
import { Card, CardBody, CardTitle } from '@null/ui';

export default function LeaderboardPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Global Leaderboard</h1>
        <p>Ranked media titles across all sources and platforms</p>
      </div>

      <Card>
        <CardBody>
          <CardTitle>Coming Soon</CardTitle>
          <p className="muted">
            This is the core product screen. Global rankings for books, manga, and web comics across multiple data sources.
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Features: Time window filters, category filters, confidence/provenance badges, rank deltas, source coverage indicators.
          </p>
        </CardBody>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <Card>
          <CardBody>
            <CardTitle>Next Steps</CardTitle>
            <ul style={{ margin: '0', paddingLeft: '1.25rem', color: 'var(--muted)' }}>
              <li>Chunk 2: Analytics schema setup</li>
              <li>Chunk 3: Catalog management</li>
              <li>Chunk 4: CSV import</li>
              <li>Chunk 5-7: Data processing pipeline</li>
              <li>Chunk 8: Launch leaderboard</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Leaderboard Sections</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
              <Link href="/dashboard/leaderboard/ips" style={{ color: 'var(--accent)', textDecoration: 'none' }}>IP Leaderboard</Link>
              <Link href="/dashboard/imports" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Imports & QC</Link>
              <Link href="/dashboard/freshness" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Source Freshness</Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
