'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';
import { AnalyticsStateNotice, Badge, EmptyState, SectionCard, StatCard, Toolbar, ToolbarField, ToolbarSelect } from '../_components/analytics-ui';
import { formatDateOnly, formatScore, mergeSearchParams } from '@/lib/analytics';

const sortOptions = [
  { value: 'composite', label: 'Composite' },
  { value: 'rating', label: 'Rating' },
  { value: 'movement', label: 'Movement' },
  { value: 'freshness', label: 'Freshness' },
  { value: 'coverage', label: 'Coverage' },
  { value: 'confidence', label: 'Confidence' }
] as const;

type SortValue = (typeof sortOptions)[number]['value'];

function EvidenceRows({ workId, expanded }: { workId: string; expanded: boolean }) {
  const evidenceQuery = trpc.workDashboard.evidence.useQuery({ workId }, { enabled: expanded });
  const evidence = evidenceQuery.data ?? [];

  if (evidenceQuery.isLoading) {
    return <div className="analytics-table__muted">Loading source evidence…</div>;
  }

  if (evidence.length === 0) {
    return <div className="analytics-table__muted">No child evidence rows are linked yet.</div>;
  }

  return (
    <table className="analytics-child-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Source title / creator</th>
          <th>Rank</th>
          <th>Rating</th>
          <th>Reviews</th>
          <th>ISBN / ASIN</th>
          <th>Observed</th>
          <th>Freshness</th>
          <th>Match</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {evidence.map((child) => (
          <tr key={child.id} className="analytics-child-row">
            <td><Badge tone="accent">{child.sourceProviderName}</Badge></td>
            <td>
              <strong>{child.displayTitle ?? '—'}</strong>
              <span className="analytics-table__muted">{child.displayCreator ?? 'Unknown creator'}</span>
            </td>
            <td>{child.rankValue ?? '—'}</td>
            <td>{child.ratingValue ? formatScore(child.ratingValue) : '—'}</td>
            <td>{child.reviewCount ?? '—'}</td>
            <td>
              <div>{child.isbn13 ?? child.isbn10 ?? '—'}</div>
              <span className="analytics-table__muted">{child.asin ?? '—'}</span>
            </td>
            <td>{formatDateOnly(child.observedAt)}</td>
            <td>{child.freshnessBucket ?? '—'}</td>
            <td>
              <div>{child.matchMethod ?? '—'}</div>
              <span className="analytics-table__muted">{child.matchType ?? '—'} {child.matchScore ? `(${formatScore(child.matchScore)})` : ''}</span>
            </td>
            <td>{child.varianceNotes ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LeaderboardPage() {
  const { organization } = useOrganization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sort = (searchParams.get('sort') ?? 'composite') as SortValue;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const listQuery = trpc.workDashboard.list.useQuery({ organizationId: organization?.id ?? '', sort, page, pageSize: 25 }, { enabled: Boolean(organization) });
  const reviewQuery = trpc.workDashboard.reviewQueue.useQuery({ organizationId: organization?.id ?? '' }, { enabled: Boolean(organization) });

  const rows = listQuery.data ?? [];
  const reviewQueue = reviewQuery.data ?? [];
  const summary = useMemo(() => ({
    rowCount: rows.length,
    avgCoverage: rows.length ? rows.reduce((sum, row) => sum + row.sourceCoverageCount, 0) / rows.length : 0,
    highestScore: rows[0]?.compositeScore ?? 0,
    reviewCount: reviewQueue.length
  }), [rows, reviewQueue]);

  const updateFilters = (updates: Record<string, string | null | undefined>) => {
    const query = mergeSearchParams(new URLSearchParams(searchParams.toString()), updates);
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Canonical Work Rankings</h1>
        <p>Each parent row is one canonical work. Expand it to inspect the source evidence, disagreement, and match provenance behind the aggregate summary.</p>
      </div>

      {listQuery.error ? <AnalyticsStateNotice title="Unable to load summaries" body={listQuery.error.message} tone="error" /> : null}

      <section className="analytics-grid-4">
        <StatCard label="Parent Rows" value={summary.rowCount} caption="Canonical works on this page" />
        <StatCard label="Avg Coverage" value={formatScore(summary.avgCoverage)} caption="Average number of contributing sources" />
        <StatCard label="Top Score" value={formatScore(summary.highestScore)} caption="Highest composite score in the current sort slice" />
        <StatCard label="Needs Review" value={summary.reviewCount} caption="Source records still awaiting manual resolution" />
      </section>

      <SectionCard title="Ranking controls" description="Parent rows can be sorted independently from their child evidence rows.">
        <Toolbar>
          <ToolbarField label="Sort">
            <ToolbarSelect value={sort} onChange={(event) => updateFilters({ sort: event.target.value === 'composite' ? null : event.target.value, page: null })}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </ToolbarSelect>
          </ToolbarField>
        </Toolbar>
      </SectionCard>

      <SectionCard title="Canonical ranking dashboard" description="Aggregate metrics are derived from linked source evidence and are intentionally distinct from source-specific ratings or ranks.">
        {rows.length === 0 ? (
          <EmptyState title="No aggregate summaries yet" body="Import provider files and run the batch rebuild flow to populate parent/child ranking evidence." actionLabel="Open Imports" actionHref="/dashboard/imports" />
        ) : (
          <div className="analytics-table-wrap">
            <table className="analytics-table analytics-evidence-table">
              <thead>
                <tr>
                  <th />
                  <th>Title</th>
                  <th>Creator</th>
                  <th>Publisher</th>
                  <th>Composite</th>
                  <th>Move</th>
                  <th>Rating</th>
                  <th>Coverage</th>
                  <th>Freshness</th>
                  <th>Confidence</th>
                  <th>ISBN-10</th>
                  <th>ISBN-13 / ASIN</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ParentAndChildren key={row.workId} row={row} expanded={Boolean(expanded[row.workId])} onToggle={() => setExpanded((current) => ({ ...current, [row.workId]: !current[row.workId] }))} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Manual review queue" description="Unresolved source records stay auditable until an admin selects a candidate work or creates a new canonical work.">
        {reviewQueue.length === 0 ? (
          <EmptyState title="No unresolved source records" body="Exact identifier matches and strong title/creator matches are already selected automatically." />
        ) : (
          <div className="analytics-review-list">
            {reviewQueue.map((item) => (
              <div key={item.sourceRecordId} className="analytics-review-card">
                <div>
                  <strong>{item.title}</strong>
                  <p className="muted">{item.sourceProviderName} · {item.creator ?? 'Unknown creator'} · {formatDateOnly(item.observedAt)}</p>
                </div>
                <div className="analytics-review-candidates">
                  {item.candidates.length === 0 ? (
                    <span className="analytics-table__muted">No candidates yet.</span>
                  ) : item.candidates.map((candidate) => (
                    <Badge key={candidate.id} tone={candidate.matchType === 'exact' ? 'success' : candidate.matchType === 'probable' ? 'warning' : 'neutral'}>
                      {candidate.title} · {candidate.matchMethod} · {formatScore(candidate.matchScore)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function ParentAndChildren({ row, expanded, onToggle }: { row: any; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="analytics-parent-row">
        <td>
          <button className="analytics-expand" onClick={onToggle} aria-expanded={expanded ? 'true' : 'false'}>
            {expanded ? '▾' : '▸'}
          </button>
        </td>
        <td><strong>{row.title}</strong></td>
        <td>{row.creator ?? '—'}</td>
        <td>{row.publisher ?? '—'}</td>
        <td>{formatScore(row.compositeScore)}</td>
        <td>
          <Badge tone={row.movementValue && row.movementValue > 0 ? 'success' : row.movementValue && row.movementValue < 0 ? 'error' : 'neutral'}>
            {row.movementValue && row.movementValue > 0 ? `+${row.movementValue}` : row.movementValue ?? 0}
          </Badge>
        </td>
        <td>{row.aggregateDisplayRating ? formatScore(row.aggregateDisplayRating) : '—'}</td>
        <td>{row.sourceCoverageCount}</td>
        <td>
          <div>{formatDateOnly(row.freshestObservedAt)}</div>
          <span className="analytics-table__muted">{row.freshnessScore ? formatScore(row.freshnessScore) : '—'}</span>
        </td>
        <td>
          <div>{row.confidenceScore ? formatScore(row.confidenceScore) : '—'}</div>
          <span className="analytics-table__muted">variance {row.disagreementScore ? formatScore(row.disagreementScore) : '—'}</span>
        </td>
        <td>{row.canonicalIsbn10 ?? '—'}</td>
        <td>
          <div>{row.canonicalIsbn13 ?? '—'}</div>
          <span className="analytics-table__muted">{row.canonicalAsin ?? '—'}</span>
        </td>
      </tr>
      {expanded ? (
        <tr className="analytics-child-wrap">
          <td colSpan={12}><EvidenceRows workId={row.workId} expanded={expanded} /></td>
        </tr>
      ) : null}
    </>
  );
}
