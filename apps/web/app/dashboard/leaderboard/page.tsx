'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  analyticsMediaTypes,
  analyticsTimeWindows,
  leaderboardSorts
} from '@null/domain';
import { trpc } from '@/lib/trpc';
import {
  formatDateOnly,
  formatDelta,
  formatScore,
  mergeSearchParams,
  provenanceLabel
} from '@/lib/analytics';
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
} from '../_components/analytics-ui';

export default function LeaderboardPage() {
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
  const confidenceValue =
    searchParams.get('confidence') && ['all', 'high', 'medium', 'low'].includes(searchParams.get('confidence') ?? '')
      ? (searchParams.get('confidence') as 'all' | 'high' | 'medium' | 'low')
      : 'all';
  const sortValue = leaderboardSorts.includes(searchParams.get('sort') as (typeof leaderboardSorts)[number])
    ? (searchParams.get('sort') as (typeof leaderboardSorts)[number])
    : 'rank';
  const sourceValue = searchParams.get('source') ?? '';

  const updateFilters = (updates: Record<string, string | null | undefined>) => {
    const query = mergeSearchParams(new URLSearchParams(searchParams.toString()), updates);
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const sourceQuery = trpc.sourceProvider.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: Boolean(organization) }
  );
  const leaderboardQuery = trpc.leaderboard.listGlobal.useQuery(
    {
      organizationId: organization?.id ?? '',
      window: windowValue,
      category: categoryValue,
      query: searchParams.get('query') ?? undefined,
      source: sourceValue || undefined,
      confidence: confidenceValue,
      sort: sortValue,
      limit: 250
    },
    { enabled: Boolean(organization) }
  );

  const rows = leaderboardQuery.data?.status === 'ready' ? leaderboardQuery.data.data : [];
  const sources = sourceQuery.data?.status === 'ready' ? sourceQuery.data.data : [];
  const summary = useMemo(() => {
    const coverageAverage =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + row.sourceCoverageCount, 0) / rows.length
        : 0;

    return {
      latestScoreDate: rows[0]?.latestScoreDate ?? null,
      highConfidenceCount: rows.filter((row) => row.confidenceBand === 'high').length,
      uniqueIpCount: new Set(rows.map((row) => row.ipId).filter(Boolean)).size,
      coverageAverage
    };
  }, [rows]);

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Global Leaderboard</h1>
        <p>Rank works across every tracked source, using URL-driven filters so each board view can be linked or revisited.</p>
      </div>

      {leaderboardQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={leaderboardQuery.data.reason} />
      ) : null}

      <section className="analytics-grid-4">
        <StatCard label="Snapshot Date" value={summary.latestScoreDate ?? 'No scores'} caption="Latest score rebuild date" />
        <StatCard label="Rows Returned" value={rows.length} caption="Current filter result size" />
        <StatCard label="High Confidence" value={summary.highConfidenceCount} caption="Rows scoring in the high-confidence band" />
        <StatCard label="Avg Coverage" value={formatScore(summary.coverageAverage)} caption="Average source count per ranked work" />
      </section>

      <SectionCard title="Filters" description="These controls write directly into the URL using window, category, query, source, confidence, and sort search params.">
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
          <ToolbarField label="Source">
            <ToolbarSelect value={sourceValue} onChange={(event) => updateFilters({ source: event.target.value || null })}>
              <option value="">all</option>
              {sources.map((source) => (
                <option key={source.id} value={source.slug}>
                  {source.name}
                </option>
              ))}
            </ToolbarSelect>
          </ToolbarField>
          <ToolbarField label="Confidence">
            <ToolbarSelect value={confidenceValue} onChange={(event) => updateFilters({ confidence: event.target.value === 'all' ? null : event.target.value })}>
              <option value="all">all</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </ToolbarSelect>
          </ToolbarField>
          <ToolbarField label="Sort">
            <ToolbarSelect value={sortValue} onChange={(event) => updateFilters({ sort: event.target.value === 'rank' ? null : event.target.value })}>
              {leaderboardSorts.map((sort) => (
                <option key={sort} value={sort}>
                  {sort}
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
              placeholder="title or IP"
            />
          </ToolbarField>
        </Toolbar>
      </SectionCard>

      <SectionCard
        title="Ranked Works"
        description={`Tracking ${summary.uniqueIpCount} distinct IP rollups inside the current board slice.`}
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No ranked works yet"
            body="Import, normalize, and rebuild scores to populate the global board. Filters can also narrow the result to zero."
            actionLabel="Open Imports & QC"
            actionHref="/dashboard/imports"
          />
        ) : (
          <DataTable headers={['Rank', 'Work', 'IP', 'Category', 'Score', 'Momentum', 'Confidence', 'Coverage', 'Evidence']}>
            {rows.map((row) => (
              <tr key={row.workId}>
                <td>
                  <strong>#{row.rankOverall ?? '-'}</strong>
                  <span className="analytics-table__muted">Delta {formatDelta(row.rankDelta)}</span>
                </td>
                <td>
                  <Link href={`/dashboard/leaderboard/works/${row.workId}`}>
                    <strong>{row.title}</strong>
                  </Link>
                  <span className="analytics-table__muted">Updated {formatDateOnly(row.latestScoreDate)}</span>
                </td>
                <td>
                  {row.ipId ? (
                    <Link href={`/dashboard/leaderboard/ips/${row.ipId}`}>{row.ipName ?? 'Unknown IP'}</Link>
                  ) : (
                    <span className="analytics-table__muted">No parent IP</span>
                  )}
                </td>
                <td>
                  <Badge tone="accent">{row.category}</Badge>
                </td>
                <td>{formatScore(row.compositeScore)}</td>
                <td>{formatScore(row.momentumScore)}</td>
                <td>
                  <Badge tone={row.confidenceBand === 'high' ? 'success' : row.confidenceBand === 'medium' ? 'warning' : 'neutral'}>
                    {row.confidenceBand}
                  </Badge>
                  <span className="analytics-table__muted">{formatScore(row.confidenceScore)}</span>
                </td>
                <td>{row.sourceCoverageCount}</td>
                <td>
                  <Badge tone="neutral">{provenanceLabel(row.provenanceBadge)}</Badge>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </main>
  );
}
