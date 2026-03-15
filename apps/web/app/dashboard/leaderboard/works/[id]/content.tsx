'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import {
  formatDateOnly,
  formatDateTime,
  formatDelta,
  formatScore,
  provenanceLabel
} from '@/lib/analytics';
import {
  AnalyticsStateNotice,
  Badge,
  DataTable,
  EmptyState,
  SectionCard,
  StatCard
} from '../../../_components/analytics-ui';

export function WorkLeaderboardDetailContent() {
  const params = useParams();
  const workId = params.id as string;
  const detailQuery = trpc.leaderboard.workDetail.useQuery(
    { workId },
    { enabled: Boolean(workId) }
  );

  const state = detailQuery.data;
  const detail = state?.status === 'ready' ? state.data : null;

  return (
    <div className="stack">
      {state?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={state.reason} />
      ) : null}

      {!detail ? (
        <SectionCard title="Work not available" description="The work may not exist yet or the analytics schema has not been applied.">
          <EmptyState title="No score detail found" body="Return to the leaderboard after imports, normalization, and a score rebuild." />
        </SectionCard>
      ) : (
        <>
          <section className="analytics-grid-4">
            <StatCard label="Latest Score" value={formatScore(detail.scoreHistory[0]?.compositeScore ?? null)} caption="Most recent composite score" />
            <StatCard label="Latest Rank" value={detail.scoreHistory[0]?.rankOverall ?? '-'} caption={`Delta ${formatDelta(detail.scoreHistory[0]?.rankDelta ?? 0)}`} />
            <StatCard label="Source Coverage" value={detail.sourceBreakdown.length} caption="Distinct providers contributing observations" />
            <StatCard label="QC Flags" value={detail.qualityFlags.length} caption="All flags attached to this work" />
          </section>

          <SectionCard title="Work Snapshot" description="The ranked work record mapped from the catalog and used by the score builder.">
            <div className="analytics-grid-2">
              <div className="analytics-stack-sm">
                <div>
                  <strong>{detail.work.title}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0 0' }}>
                    {detail.work.ipId ? (
                      <Link href={`/dashboard/leaderboard/ips/${detail.work.ipId}`}>{detail.work.ipName ?? 'Unknown IP'}</Link>
                    ) : (
                      'No parent IP assigned'
                    )}
                  </p>
                </div>
                <div className="analytics-actions">
                  <Badge tone="accent">{detail.work.mediaType}</Badge>
                  <Badge tone={detail.work.status === 'active' ? 'success' : detail.work.status === 'archived' ? 'warning' : 'neutral'}>
                    {detail.work.status}
                  </Badge>
                </div>
              </div>
              <div className="analytics-grid-2">
                <div>
                  <span className="analytics-table__muted">Release</span>
                  <div>{formatDateOnly(detail.work.releaseDate)}</div>
                </div>
                <div>
                  <span className="analytics-table__muted">Series</span>
                  <div>{detail.work.seriesName ?? 'Standalone'}</div>
                </div>
                <div>
                  <span className="analytics-table__muted">Language / Region</span>
                  <div>{[detail.work.language, detail.work.region].filter(Boolean).join(' / ') || 'Unspecified'}</div>
                </div>
                <div>
                  <span className="analytics-table__muted">Catalog Record</span>
                  <div>
                    <Link href={`/dashboard/catalog/works/${detail.work.id}`}>Manage external IDs</Link>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Score History" description="Every rebuilt window stored for this work, ordered from newest to oldest.">
            {detail.scoreHistory.length === 0 ? (
              <EmptyState title="No scores stored" body="Run a score rebuild after normalization to populate historical windows." />
            ) : (
              <DataTable headers={['Window', 'Composite', 'Momentum', 'Confidence', 'Rank', 'Delta', 'Score Date']}>
                {detail.scoreHistory.map((score) => (
                  <tr key={`${score.window}-${score.scoreDate}`}>
                    <td>{score.window}</td>
                    <td>{formatScore(score.compositeScore)}</td>
                    <td>{formatScore(score.momentumScore)}</td>
                    <td>{formatScore(score.confidenceScore)}</td>
                    <td>{score.rankOverall ?? '-'}</td>
                    <td>{formatDelta(score.rankDelta)}</td>
                    <td>{formatDateOnly(score.scoreDate)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </SectionCard>

          <section className="analytics-grid-2">
            <SectionCard title="Component Breakdown" description="Explainable score components from the latest stored score date.">
              {detail.componentBreakdown.length === 0 ? (
                <EmptyState title="No component breakdown" body="Run a rebuild to materialize weighted score components." />
              ) : (
                <DataTable headers={['Component', 'Score', 'Weight', 'Notes']}>
                  {detail.componentBreakdown.map((component) => (
                    <tr key={component.componentType}>
                      <td>{component.componentType}</td>
                      <td>{formatScore(component.componentScore)}</td>
                      <td>{formatScore(component.weightUsed)}</td>
                      <td>{component.provenanceSummary ?? 'Stored from score rebuild logic'}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </SectionCard>

            <SectionCard title="Source Breakdown" description="Observation counts and provenance tags by provider.">
              {detail.sourceBreakdown.length === 0 ? (
                <EmptyState title="No source evidence" body="Normalize at least one batch to attach providers and provenance tags." />
              ) : (
                <DataTable headers={['Source', 'Observations', 'Latest Observation', 'Provenance']}>
                  {detail.sourceBreakdown.map((source) => (
                    <tr key={source.sourceProviderId}>
                      <td>
                        <strong>{source.sourceProviderName}</strong>
                        <span className="analytics-table__muted">{source.sourceProviderSlug}</span>
                      </td>
                      <td>{source.observationCount}</td>
                      <td>{formatDateTime(source.latestObservedAt)}</td>
                      <td>{source.provenanceTags.map((tag) => provenanceLabel(tag)).join(', ')}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </SectionCard>
          </section>

          <SectionCard title="Quality Flags" description="Resolved and unresolved quality findings attached to this work.">
            {detail.qualityFlags.length === 0 ? (
              <EmptyState title="No quality flags" body="This work currently has no stored QC findings." />
            ) : (
              <DataTable headers={['Severity', 'Type', 'Notes', 'Observed', 'Resolved']}>
                {detail.qualityFlags.map((flag) => (
                  <tr key={flag.id}>
                    <td>
                      <Badge tone={flag.severity === 'critical' ? 'error' : flag.severity === 'warning' ? 'warning' : 'neutral'}>
                        {flag.severity}
                      </Badge>
                    </td>
                    <td>{flag.flagType}</td>
                    <td>{flag.notes ?? 'No notes'}</td>
                    <td>{formatDateTime(flag.observedAt?.toString())}</td>
                    <td>{flag.resolvedAt ? formatDateTime(flag.resolvedAt.toString()) : 'Open'}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
