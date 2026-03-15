import Link from 'next/link';
import { Button } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { AnalyticsStateNotice, SectionCard, StatCard } from './_components/analytics-ui';

async function loadOverview() {
  const trpc = await createServerTRPCClient();
  const organizations = await trpc.organization.list.query();
  const currentOrganization = organizations[0];

  if (!currentOrganization) {
    return {
      organizationId: null,
      overview: null
    };
  }

  const overview = await trpc.leaderboard.overview.query({
    organizationId: currentOrganization.id
  });

  return {
    organizationId: currentOrganization.id,
    overview
  };
}

export default async function DashboardPage() {
  const { organizationId, overview } = await loadOverview();

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Analytics Overview</h1>
        <p>Track the current state of your IP intelligence board, imports, and score coverage.</p>
      </div>

      {overview?.status === 'unavailable' ? (
        <AnalyticsStateNotice
          title="Analytics schema not deployed yet"
          body={overview.reason}
        />
      ) : null}

      <section className="analytics-grid-4">
        <StatCard
          label="Latest Score Date"
          value={overview?.status === 'ready' ? overview.data.latestScoreDate ?? 'No scores' : 'Unavailable'}
          caption="Weekly board snapshot"
        />
        <StatCard
          label="Tracked Works"
          value={overview?.status === 'ready' ? overview.data.trackedWorkCount : 0}
          caption="Works in analytics catalog"
        />
        <StatCard
          label="Tracked IPs"
          value={overview?.status === 'ready' ? overview.data.activeIpCount : 0}
          caption="Umbrella properties with analytics records"
        />
        <StatCard
          label="Open QC Flags"
          value={overview?.status === 'ready' ? overview.data.unresolvedFlagCount : 0}
          caption="Rows still needing review"
        />
      </section>

      <section className="analytics-grid-2">
        <SectionCard
          title="Main Views"
          description="Jump directly into the leaderboard and pipeline screens that matter day to day."
        >
          <div className="analytics-links">
            <Link href="/dashboard/leaderboard">Global Leaderboard</Link>
            <Link href="/dashboard/leaderboard/ips">IP Leaderboard</Link>
            <Link href="/dashboard/imports">Imports & QC</Link>
            <Link href="/dashboard/freshness">Source Freshness</Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Admin Actions"
          description="Catalog curation and score rebuilds stay manual in this repo pass."
          action={
            organizationId ? (
              <Button asChild variant="secondary">
                <Link href="/dashboard/catalog">Open Catalog</Link>
              </Button>
            ) : null
          }
        >
          <div className="analytics-actions">
            <Button asChild variant="secondary">
              <Link href="/dashboard/catalog/ips">Manage IPs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/catalog/works">Manage Works</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/catalog/sources">Manage Sources</Link>
            </Button>
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
