import Link from 'next/link';
import { Button } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { AnalyticsStateNotice, SectionCard } from './_components/analytics-ui';

async function loadDashboardShell() {
  const trpc = await createServerTRPCClient();

  try {
    const organizations = await trpc.organization.list.query();
    const currentOrganization = organizations[0];

    if (!currentOrganization) {
      return {
        organizationId: null,
        organizationError: 'Create your first organization to unlock analytics data and admin workflows.'
      };
    }

    // TODO: Restore trpc.leaderboard.overview.query(...) after analytics query performance is fixed.
    return {
      organizationId: currentOrganization.id,
      organizationError: null
    };
  } catch (error) {
    console.error('Failed to load dashboard shell', error);

    return {
      organizationId: null,
      organizationError: 'Dashboard data is not available yet. Check your database configuration and organization setup, then refresh.'
    };
  }
}

export default async function DashboardPage() {
  const { organizationId, organizationError } = await loadDashboardShell();

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Use the quick links below to reach imports, leaderboard views, freshness checks, and catalog tools.</p>
      </div>

      {organizationError ? (
        <AnalyticsStateNotice
          title="Dashboard setup still needed"
          body={organizationError}
        />
      ) : (
        <AnalyticsStateNotice
          title="Analytics overview temporarily disabled"
          body="Overview analytics are temporarily bypassed while leaderboard query performance is being fixed. Use the links below to continue working."
        />
      )}

      <section className="analytics-grid-2">
        <SectionCard
          title="Navigation"
          description="Open the main dashboard areas without waiting for analytics overview data to load."
        >
          <div className="analytics-links">
            <Link href="/dashboard/imports">Imports &amp; QC</Link>
            <Link href="/dashboard/leaderboard">Global Leaderboard</Link>
            <Link href="/dashboard/leaderboard/ips">IP Leaderboard</Link>
            <Link href="/dashboard/freshness">Source Freshness</Link>
            <Link href="/dashboard/catalog">Catalog</Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Admin Actions"
          description="Catalog curation remains available even while overview analytics are disabled."
          action={organizationId ? (
            <Button asChild variant="secondary">
              <Link href="/dashboard/catalog">Open Catalog</Link>
            </Button>
          ) : null}
        >
          <div className="analytics-actions">
            <Button asChild>
              <Link href="/dashboard/imports">Open Imports</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/leaderboard">Open Global Leaderboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/leaderboard/ips">Open IP Leaderboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/freshness">Open Freshness</Link>
            </Button>
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
