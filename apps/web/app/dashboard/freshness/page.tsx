'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCompactNumber, formatDateTime } from '@/lib/analytics';
import { useOrganization } from '@/lib/context/organization-context';
import {
  AnalyticsStateNotice,
  Badge,
  DataTable,
  EmptyState,
  SectionCard,
  StatCard
} from '../_components/analytics-ui';

export default function FreshnessPage() {
  const { organization } = useOrganization();
  const freshnessQuery = trpc.freshness.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: Boolean(organization) }
  );

  const rows = freshnessQuery.data?.status === 'ready' ? freshnessQuery.data.data : [];
  const summary = useMemo(() => {
    const staleCount = rows.filter((row) => row.isStale).length;
    const unresolvedFlags = rows.reduce((sum, row) => sum + row.unresolvedFlagCount, 0);
    const normalizedRows = rows.reduce((sum, row) => sum + row.normalizedObservationCount, 0);
    const latestCompletion = rows
      .map((row) => row.lastCompletedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    return {
      staleCount,
      unresolvedFlags,
      normalizedRows,
      latestCompletion
    };
  }, [rows]);

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Source Freshness</h1>
        <p>Monitor provider recency, unresolved QC pressure, and observation coverage before the next score rebuild.</p>
      </div>

      {freshnessQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={freshnessQuery.data.reason} />
      ) : null}

      <section className="analytics-grid-4">
        <StatCard label="Providers" value={rows.length} caption="Configured source providers" />
        <StatCard label="Stale Providers" value={summary.staleCount} caption="Providers older than the freshness threshold" />
        <StatCard label="Open Flags" value={summary.unresolvedFlags} caption="Unresolved quality findings attached to provider batches" />
        <StatCard label="Normalized Rows" value={formatCompactNumber(summary.normalizedRows)} caption="Observation rows already normalized" />
        <StatCard label="Latest Completion" value={summary.latestCompletion ? formatDateTime(summary.latestCompletion) : 'No imports'} caption="Most recent successful import completion" />
      </section>

      <SectionCard title="Provider Coverage" description="Use this table to spot stale sources, partial imports, and providers that still need mapping work.">
        {rows.length === 0 ? (
          <EmptyState
            title="No source providers tracked"
            body="Add a provider in the catalog, then upload and normalize at least one batch to populate freshness metrics."
            actionLabel="Open Source Catalog"
            actionHref="/dashboard/catalog/sources"
          />
        ) : (
          <DataTable headers={['Provider', 'Family', 'Tier', 'Status', 'Last Import', 'Last Observation', 'Raw', 'Normalized', 'Mapped Works', 'Open Flags']}>
            {rows.map((row) => (
              <tr key={row.sourceProviderId}>
                <td>
                  <strong>{row.sourceProviderName}</strong>
                  <span className="analytics-table__muted">{row.sourceProviderSlug}</span>
                </td>
                <td>{row.sourceFamily}</td>
                <td>
                  <Badge tone={row.confidenceTier === 'gold' ? 'success' : row.confidenceTier === 'silver' ? 'accent' : 'neutral'}>
                    {row.confidenceTier}
                  </Badge>
                </td>
                <td>
                  <Badge tone={row.isStale ? 'warning' : row.latestStatus === 'failed' ? 'error' : row.latestStatus === 'partial' ? 'warning' : 'success'}>
                    {row.isStale ? 'stale' : row.latestStatus}
                  </Badge>
                </td>
                <td>{formatDateTime(row.lastCompletedAt ?? row.lastImportAt)}</td>
                <td>{formatDateTime(row.lastObservedAt)}</td>
                <td>{formatCompactNumber(row.rawObservationCount)}</td>
                <td>{formatCompactNumber(row.normalizedObservationCount)}</td>
                <td>{row.mappedWorkCount}</td>
                <td>{row.unresolvedFlagCount}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>

      <SectionCard title="Readiness Notes" description="Use these repo-side signals before relying on any leaderboard snapshot.">
        <div className="analytics-links">
          <span>Stale providers often indicate missing CSV refreshes or an upload that never reached normalization.</span>
          <span>High open-flag counts usually mean exact IDs are missing, low-confidence matches need review, or duplicate/outlier checks fired.</span>
          <span>Low mapped-work counts are a catalog problem first: create works and attach provider IDs so exact matching wins over title fallback.</span>
        </div>
      </SectionCard>
    </main>
  );
}
