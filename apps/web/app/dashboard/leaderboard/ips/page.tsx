'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { analyticsMediaTypes, analyticsTimeWindows } from '@null/domain';
import { trpc } from '@/lib/trpc';
import { formatDateOnly, formatDelta, formatScore, mergeSearchParams } from '@/lib/analytics';
import { useOrganization } from '@/lib/context/organization-context';
import {
  AnalyticsStateNotice,
  Badge,
  DataTable,
  EmptyState,
  SectionCard,
  StatCard,
  Toolbar,
  ToolbarField,
  ToolbarInput,
  ToolbarSelect
} from '../../_components/analytics-ui';

export default function IPLeaderboardPage() {
  const { organization } = useOrganization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftQuery, setDraftQuery] = useState(searchParams.get('query') ?? '');

  useEffect(() => {
    setDraftQuery(searchParams.get('query') ?? '');
  }, [searchParams]);

  const windowValue = analyticsTimeWindows.includes(searchParams.get('window') as (typeof analyticsTimeWindows)[number])
    ? (searchParams.get('window') as (typeof analyticsTimeWindows)[number])
    : '1w';
  const categoryValue =
    searchParams.get('category') && analyticsMediaTypes.includes(searchParams.get('category') as (typeof analyticsMediaTypes)[number])
      ? (searchParams.get('category') as (typeof analyticsMediaTypes)[number])
      : 'all';

  const updateFilters = (updates: Record<string, string | null | undefined>) => {
    const query = mergeSearchParams(new URLSearchParams(searchParams.toString()), updates);
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const leaderboardQuery = trpc.leaderboard.listIps.useQuery(
    {
      organizationId: organization?.id ?? '',
      window: windowValue,
      category: categoryValue,
      query: searchParams.get('query') ?? undefined,
      limit: 250
    },
    { enabled: Boolean(organization) }
  );

  const rows = leaderboardQuery.data?.status === 'ready' ? leaderboardQuery.data.data : [];
  const summary = useMemo(() => {
    const activeWorks = rows.reduce((sum, row) => sum + row.activeWorkCount, 0);
    return {
      latestScoreDate: rows[0]?.latestScoreDate ?? null,
      activeWorks,
      averageMomentum: rows.length > 0 ? rows.reduce((sum, row) => sum + row.momentumScore, 0) / rows.length : 0
    };
  }, [rows]);

  return (
    <main className="stack">
      <div className="page-header">
        <h1>IP Leaderboard</h1>
        <p>Roll up work-level signals into portfolio-level IP rankings and compare active coverage across your catalog.</p>
      </div>

      {leaderboardQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={leaderboardQuery.data.reason} />
      ) : null}

      <section className="analytics-grid-4">
        <StatCard label="Snapshot Date" value={summary.latestScoreDate ?? 'No scores'} caption="Latest IP score rebuild" />
        <StatCard label="IPs Returned" value={rows.length} caption="Current filter result size" />
        <StatCard label="Active Works" value={summary.activeWorks} caption="Works contributing to the shown IPs" />
        <StatCard label="Avg Momentum" value={formatScore(summary.averageMomentum)} caption="Average momentum score across filtered IPs" />
      </section>

      <SectionCard title="Filters" description="Window, category, and query remain in the URL so IP board states are shareable.">
        <Toolbar>
          <ToolbarField label="Window">
            <ToolbarSelect value={windowValue} onChange={(event) => updateFilters({ window: event.target.value })}>
              {analyticsTimeWindows.map((window) => (
                <option key={window} value={window}>
                  {window}
                </option>
              ))}
            </ToolbarSelect>
          </ToolbarField>
          <ToolbarField label="Category">
            <ToolbarSelect value={categoryValue} onChange={(event) => updateFilters({ category: event.target.value === 'all' ? null : event.target.value })}>
              <option value="all">all</option>
              {analyticsMediaTypes.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </ToolbarSelect>
          </ToolbarField>
          <ToolbarField label="Search">
            <ToolbarInput
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              onBlur={() => updateFilters({ query: draftQuery || null })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  updateFilters({ query: draftQuery || null });
                }
              }}
              placeholder="IP name"
            />
          </ToolbarField>
        </Toolbar>
      </SectionCard>

      <SectionCard title="Ranked IPs" description="Each row represents the current rollup of work-level composite, momentum, and confidence signals.">
        {rows.length === 0 ? (
          <EmptyState
            title="No IP scores yet"
            body="Create IPs, connect works, then rebuild scores after normalization to populate this view."
            actionLabel="Open Catalog"
            actionHref="/dashboard/catalog"
          />
        ) : (
          <DataTable headers={['Rank', 'IP', 'Category', 'Composite', 'Momentum', 'Confidence', 'Active Works', 'Snapshot']}>
            {rows.map((row) => (
              <tr key={row.ipId}>
                <td>
                  <strong>#{row.rankOverall ?? '-'}</strong>
                  <span className="analytics-table__muted">Delta {formatDelta(row.rankDelta)}</span>
                </td>
                <td>
                  <Link href={`/dashboard/leaderboard/ips/${row.ipId}`}>
                    <strong>{row.name}</strong>
                  </Link>
                  <span className="analytics-table__muted">{row.slug}</span>
                </td>
                <td>
                  {row.primaryCategory ? <Badge tone="accent">{row.primaryCategory}</Badge> : <span className="analytics-table__muted">Mixed</span>}
                </td>
                <td>{formatScore(row.compositeScore)}</td>
                <td>{formatScore(row.momentumScore)}</td>
                <td>{formatScore(row.confidenceScore)}</td>
                <td>{row.activeWorkCount}</td>
                <td>{formatDateOnly(row.latestScoreDate)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </main>
  );
}
