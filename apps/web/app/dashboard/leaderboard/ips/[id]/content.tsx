'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatDateOnly, formatDateTime, formatDelta, formatScore } from '@/lib/analytics';
import {
  AnalyticsStateNotice,
  Badge,
  DataTable,
  EmptyState,
  SectionCard,
  StatCard
} from '../../../_components/analytics-ui';

export function IpLeaderboardDetailContent() {
  const params = useParams();
  const ipId = params.id as string;
  const detailQuery = trpc.leaderboard.ipDetail.useQuery(
    { ipId },
    { enabled: Boolean(ipId) }
  );

  const state = detailQuery.data;
  const detail = state?.status === 'ready' ? state.data : null;

  return (
    <div className="stack">
      {state?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={state.reason} />
      ) : null}

      {!detail ? (
        <SectionCard title="IP not available" description="The requested IP may not exist yet or analytics tables are still pending.">
          <EmptyState title="No IP score detail found" body="Return to the IP board after catalog setup, normalization, and a score rebuild." />
        </SectionCard>
      ) : (
        <>
          <section className="analytics-grid-4">
            <StatCard label="Latest Score" value={formatScore(detail.scores[0]?.compositeScore ?? null)} caption="Most recent composite IP score" />
            <StatCard label="Latest Rank" value={detail.scores[0]?.rankOverall ?? '-'} caption={`Delta ${formatDelta(detail.scores[0]?.rankDelta ?? 0)}`} />
            <StatCard label="Top Works" value={detail.topWorks.length} caption="Linked leaderboard rows returned for this IP" />
            <StatCard label="Source Coverage" value={detail.sourceCoverage.length} caption="Providers currently contributing observations" />
          </section>

          <SectionCard title="IP Snapshot" description="This repo keeps the product copy as IP-first while the current storage still maps through franchises internally.">
            <div className="analytics-grid-2">
              <div className="analytics-stack-sm">
                <div>
                  <strong>{detail.ip.name}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0 0' }}>
                    {detail.ip.slug}
                  </p>
                </div>
                <div className="analytics-actions">
                  {detail.ip.primaryCategory ? <Badge tone="accent">{detail.ip.primaryCategory}</Badge> : null}
                  <Badge tone={detail.ip.status === 'active' ? 'success' : detail.ip.status === 'archived' ? 'warning' : 'neutral'}>
                    {detail.ip.status}
                  </Badge>
                </div>
              </div>
              <div className="analytics-grid-2">
                <div>
                  <span className="analytics-table__muted">Tracked Works</span>
                  <div>{detail.ip.workCount}</div>
                </div>
                <div>
                  <span className="analytics-table__muted">Catalog Record</span>
                  <div>
                    <Link href="/dashboard/catalog/ips">Open IP catalog</Link>
                  </div>
                </div>
                <div>
                  <span className="analytics-table__muted">Created</span>
                  <div>{formatDateTime(detail.ip.createdAt.toString())}</div>
                </div>
                <div>
                  <span className="analytics-table__muted">Updated</span>
                  <div>{formatDateTime(detail.ip.updatedAt.toString())}</div>
                </div>
              </div>
            </div>
            {detail.ip.description ? <p className="muted">{detail.ip.description}</p> : null}
          </SectionCard>

          <SectionCard title="Score History" description="Stored IP-level rollups across each time window.">
            {detail.scores.length === 0 ? (
              <EmptyState title="No IP scores stored" body="Run a rebuild after normalization to materialize IP score history." />
            ) : (
              <DataTable headers={['Window', 'Composite', 'Momentum', 'Confidence', 'Rank', 'Delta', 'Active Works', 'Score Date']}>
                {detail.scores.map((score) => (
                  <tr key={`${score.window}-${score.scoreDate}`}>
                    <td>{score.window}</td>
                    <td>{formatScore(score.compositeScore)}</td>
                    <td>{formatScore(score.momentumScore)}</td>
                    <td>{formatScore(score.confidenceScore)}</td>
                    <td>{score.rankOverall ?? '-'}</td>
                    <td>{formatDelta(score.rankDelta)}</td>
                    <td>{score.activeWorkCount}</td>
                    <td>{formatDateOnly(score.scoreDate)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </SectionCard>

          <section className="analytics-grid-2">
            <SectionCard title="Top Works" description="Current work-level rows contributing to this IP rollup.">
              {detail.topWorks.length === 0 ? (
                <EmptyState title="No linked work rows" body="Populate the work leaderboard first to see the highest-contributing titles." />
              ) : (
                <DataTable headers={['Rank', 'Work', 'Category', 'Score', 'Momentum', 'Confidence']}>
                  {detail.topWorks.map((work) => (
                    <tr key={work.workId}>
                      <td>
                        <strong>#{work.rankOverall ?? '-'}</strong>
                        <span className="analytics-table__muted">Delta {formatDelta(work.rankDelta)}</span>
                      </td>
                      <td>
                        <Link href={`/dashboard/leaderboard/works/${work.workId}`}>
                          <strong>{work.title}</strong>
                        </Link>
                      </td>
                      <td>{work.category}</td>
                      <td>{formatScore(work.compositeScore)}</td>
                      <td>{formatScore(work.momentumScore)}</td>
                      <td>{formatScore(work.confidenceScore)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </SectionCard>

            <SectionCard title="Source Coverage" description="Providers contributing observations to works inside this IP rollup.">
              {detail.sourceCoverage.length === 0 ? (
                <EmptyState title="No source coverage yet" body="Normalize provider observations against works in this IP to build coverage." />
              ) : (
                <DataTable headers={['Source', 'Observations', 'Latest Observation']}>
                  {detail.sourceCoverage.map((source) => (
                    <tr key={source.sourceProviderId}>
                      <td>{source.sourceProviderName}</td>
                      <td>{source.observationCount}</td>
                      <td>{formatDateTime(source.latestObservedAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </SectionCard>
          </section>
        </>
      )}
    </div>
  );
}
