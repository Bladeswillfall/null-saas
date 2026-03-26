import Link from 'next/link';
import { Button } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { formatCompactNumber, formatDateTime } from '@/lib/analytics';
import { AnalyticsStateNotice, SectionCard, StatCard } from './_components/analytics-ui';
import { IPLeaderboardPreview } from './_components/ip-leaderboard-preview';

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

      {/* Pipeline stage notices — explain current data processing state */}
      {overviewData?.pipelineStage === 'raw_only' ? (
        <AnalyticsStateNotice
          title="Raw observations loaded"
          body={`${formatCompactNumber(overviewData.rawObservationCount)} raw observation rows are available. Source record promotion is pending — once complete, enriched data will appear below.`}
          tone="info"
        />
      ) : overviewData?.pipelineStage === 'promoted' ? (
        <AnalyticsStateNotice
          title="Source records promoted"
          body="Records have been promoted from raw observations. Entity resolution is pending — canonical works will appear once matching completes."
          tone="info"
        />
      ) : overviewData?.pipelineStage === 'resolved' ? (
        <AnalyticsStateNotice
          title="Canonical works resolved"
          body="Works have been matched and resolved. Score calculation is pending — leaderboard rankings will appear after the next scoring run."
          tone="info"
        />
      ) : null}

      {overviewData ? (
        <section className="analytics-grid-4">
          {/* ─── PRIMARY LAYER: raw_observations (always shown first) ─── */}
          <StatCard
            label="Raw Observations"
            value={formatCompactNumber(overviewData.rawObservationCount)}
            caption={overviewData.latestRawObservationAt 
              ? `Primary data · latest ${formatDateTime(overviewData.latestRawObservationAt)}`
              : 'Primary data source · no observations yet'}
          />
          {/* ─── ENRICHED LAYER: source_records ─── */}
          <StatCard
            label="Source Records"
            value={formatCompactNumber(overviewData.sourceRecordCount)}
            caption={overviewData.sourceRecordCount > 0 
              ? `Promoted from raw · ${formatCompactNumber(overviewData.reviewQueueCount)} pending review`
              : 'Awaiting promotion from raw observations'}
          />
          {/* ─── RESOLVED LAYER: canonical works ─── */}
          <StatCard 
            label="Canonical Works" 
            value={formatCompactNumber(overviewData.trackedWorkCount)} 
            caption={overviewData.trackedWorkCount > 0 
              ? 'Matched entities in catalog'
              : 'Awaiting entity resolution'}
          />
          <StatCard 
            label="Franchises / IPs" 
            value={formatCompactNumber(overviewData.activeIpCount)} 
            caption="Tracked intellectual property units" 
          />
          {/* ─── METADATA ─── */}
          <StatCard 
            label="Latest Import" 
            value={overviewData.latestImportAt ? formatDateTime(overviewData.latestImportAt) : 'Never'} 
            caption="Most recent import batch" 
          />
          <StatCard 
            label="Open Flags" 
            value={formatCompactNumber(overviewData.unresolvedFlagCount)} 
            caption="Unresolved quality flags" 
          />
          {/* ─── SCORED LAYER: only shown when data exists ─── */}
          {overviewData.topWorkCount > 0 && (
            <StatCard 
              label="Leaderboard Entries" 
              value={formatCompactNumber(overviewData.topWorkCount)} 
              caption={overviewData.latestScoreDate 
                ? `Scored ${formatDateTime(overviewData.latestScoreDate)}`
                : 'Latest leaderboard snapshot'}
            />
          )}
        </section>
      ) : null}

      {/* IP Leaderboard Preview — shows real data from ip_scores table */}
      <SectionCard
        title="IP Leaderboard"
        description={overviewData?.activeIpCount 
          ? `Top performing IPs from ${formatCompactNumber(overviewData.activeIpCount)} tracked franchises.`
          : 'IP rankings will appear once scoring data is available.'}
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/leaderboard/ips">View Full Leaderboard</Link>
          </Button>
        }
      >
        <IPLeaderboardPreview organizationId={organizationId} />
      </SectionCard>

      <section className="analytics-grid-2">
        <SectionCard
          title="Navigation"
          description={overviewData
            ? `Pipeline: ${overviewData.pipelineStage} · ${formatCompactNumber(overviewData.rawObservationCount)} raw observations → ${formatCompactNumber(overviewData.sourceRecordCount)} records → ${formatCompactNumber(overviewData.trackedWorkCount)} works`
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
