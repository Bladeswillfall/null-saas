import Link from 'next/link';
import { Button } from '@null/ui';
import { SectionCard } from '../_components/analytics-ui';

export default function CatalogPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Catalog</h1>
        <p>Maintain analytics IPs, works, and source providers without leaving the dashboard.</p>
      </div>

      <section className="analytics-grid-2">
        <SectionCard
          title="IP Catalog"
          description="Manage umbrella properties, slugs, categories, and current status."
          action={
            <Button asChild variant="secondary">
              <Link href="/dashboard/catalog/ips">Open</Link>
            </Button>
          }
        >
          <p className="muted" style={{ margin: 0 }}>
            Product copy stays in IP terms while the current analytics storage still maps these records to `franchises`.
          </p>
        </SectionCard>

        <SectionCard
          title="Work Catalog"
          description="Create and edit works, assign them to IPs, and manage external IDs inline."
          action={
            <Button asChild variant="secondary">
              <Link href="/dashboard/catalog/works">Open</Link>
            </Button>
          }
        >
          <p className="muted" style={{ margin: 0 }}>
            External ID mappings remain the primary exact-match strategy for normalization and future imports.
          </p>
        </SectionCard>
      </section>

      <SectionCard
        title="Source Providers"
        description="Maintain the shared registry of source providers, access modes, and confidence tiers."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/catalog/sources">Open</Link>
          </Button>
        }
      >
        <p className="muted" style={{ margin: 0 }}>
          Source providers stay global, but import history and freshness remain organization-scoped.
        </p>
      </SectionCard>
    </main>
  );
}
