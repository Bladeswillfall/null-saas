import Link from 'next/link';
import { Button } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { formatCompactNumber, formatDateTime } from '@/lib/analytics';
import { AnalyticsStateNotice, SectionCard, StatCard } from './_components/analytics-ui';

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

    const overview = await trpc.leaderboard.overview.query({ organizationId: currentOrganization.id });
    return {
      organizationId: currentOrganization.id,
      organizationError: null,
      overview
    };
  } catch (error) {
    console.error('Failed to load dashboard shell', error);

    return {
      organizationId: null,
      organizationError: 'Dashboard data is not available yet. Check your database configuration and organization setup, then refresh.',
      overview: null
    };
  }
}

export default async function DashboardPage() {
  const { organizationId, organizationError, overview } = await loadDashboardShell();
  const overviewData = overview?.status === 'ready' ? overview.data : null;
  const overviewReason = overview?.status === 'unavailable' ? overview.reason : null;

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
      ) : overviewReason ? (
        <AnalyticsStateNotice
          title="Analytics overview unavailable"
          body={overviewReason}
        />
      ) : null}

      {overviewData ? (
        <section className="analytics-grid-4">
          <StatCard label="Top Works" value={formatCompactNumber(overviewData.topWorkCount)} caption="Leaderboard rows in the latest weekly snapshot" />
          <StatCard label="Active IPs" value={formatCompactNumber(overviewData.activeIpCount)} caption="Tracked franchises currently returned by analytics" />
          <StatCard label="Tracked Works" value={formatCompactNumber(overviewData.trackedWorkCount)} caption="Canonical works available to score and review" />
          <StatCard label="Open Flags" value={formatCompactNumber(overviewData.unresolvedFlagCount)} caption="Unresolved quality flags still affecting review readiness" />
        </section>
      ) : null}

      <section className="analytics-grid-2">
        <SectionCard
          title="Navigation"
          description={overviewData
            ? `Latest import ${formatDateTime(overviewData.latestImportAt)} · latest score snapshot ${formatDateTime(overviewData.latestScoreDate)}.`
            : 'Open the main dashboard areas while analytics overview data is unavailable.'}
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
          description={overviewData
            ? `Manage ${formatCompactNumber(overviewData.sourceProviderCount)} connected source providers and keep import approvals flowing.`
            : 'Catalog curation remains available even when overview analytics are unavailable.'}
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
