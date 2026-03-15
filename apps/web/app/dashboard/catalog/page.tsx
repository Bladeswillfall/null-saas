import { Card, CardBody, CardTitle } from '@null/ui';
import Link from 'next/link';

export default function CatalogPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Catalog Management</h1>
        <p>Manage IPs, works, and source providers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <Card>
          <CardBody>
            <CardTitle>IPs & Franchises</CardTitle>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Create and manage IP/franchise records. Link multiple works under each umbrella property.
            </p>
            <Link href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
              View IPs →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Works & Titles</CardTitle>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Manage individual titles (books, manga, web comics). Assign to IPs and set media types.
            </p>
            <Link href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
              View Works →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Source Providers</CardTitle>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              Registry of external data sources (Kindle, MyAnimeList, Webtoon, etc). Manage external ID mapping.
            </p>
            <Link href="#" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
              View Sources →
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <CardTitle>Notes</CardTitle>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Catalog management is available for admins but de-emphasized in the main product UI. The leaderboard is the primary interface.
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
