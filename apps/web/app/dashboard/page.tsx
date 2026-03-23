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

      {overviewData?.rawObservationFallbackActive ? (
        <AnalyticsStateNotice
          title="Showing raw observation data"
          body={`Source records have not been promoted yet. Displaying ${formatCompactNumber(overviewData.rawObservationCount)} raw observation rows as a fallback. This count will be replaced once import promotion completes.`}
          tone="info"
        />
      ) : null}

      {!overviewData?.rawObservationFallbackActive && overviewData?.importedButUnresolved ? (
        <AnalyticsStateNotice
          title="Imported data pending resolution"
          body="Source records are present but canonical works have not been resolved yet. Once imports are processed and matched to canonical works, leaderboard and scoring data will appear here."
          tone="info"
        />
      ) : null}

      {overviewData?.resolvedButNotScored ? (
        <AnalyticsStateNotice
          title="Canonical works pending scoring"
          body="Canonical works exist but scores have not been rebuilt yet. Run the score rebuild process to calculate performance metrics across all works."
          tone="info"
        />
      ) : null}

      {overviewData ? (
        <section className="analytics-grid-4">
          <StatCard
            label="Latest Import"
            value={overviewData.latestImportAt ? formatDateTime(overviewData.latestImportAt) : 'Never'}
            caption="Most recent import batch timestamp"
          />
          {/* Primary data source: source_records. Falls back to raw_observations when source_records is empty. */}
          {overviewData.rawObservationFallbackActive ? (
            <StatCard
              label="Raw Observations"
              value={formatCompactNumber(overviewData.rawObservationCount)}
              caption={`Verbatim CSV rows (fallback) · latest ${overviewData.latestRawObservationAt ? formatDateTime(overviewData.latestRawObservationAt) : '—'}`}
            />
          ) : (
            <StatCard
              label="Imported Records"
              value={formatCompactNumber(overviewData.sourceRecordCount)}
              caption="Source records promoted from raw observations"
            />
          )}
          <StatCard label="Canonical Works" value={formatCompactNumber(overviewData.trackedWorkCount)} caption="Works available in the catalog" />
          <StatCard label="Franchises / IPs" value={formatCompactNumber(overviewData.activeIpCount)} caption="Tracked intellectual property units" />
          <StatCard label="Review Queue" value={formatCompactNumber(overviewData.reviewQueueCount)} caption="Records needing manual review" />
          <StatCard label="Open Flags" value={formatCompactNumber(overviewData.unresolvedFlagCount)} caption="Unresolved quality flags" />
          {overviewData.topWorkCount > 0 && (
            <StatCard label="Top Works" value={formatCompactNumber(overviewData.topWorkCount)} caption="Leaderboard rows in latest snapshot" />
          )}
        </section>
      ) : null}

      <section className="analytics-grid-2">
        <SectionCard
          title="Navigation"
          description={overviewData
            ? overviewData.rawObservationFallbackActive
              ? `${formatCompactNumber(overviewData.rawObservationCount)} raw observation rows available as fallback data source.`
              : `Latest import ${formatDateTime(overviewData.latestImportAt ?? new Date())} · ${overviewData.sourceRecordCount} source records available.`
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
