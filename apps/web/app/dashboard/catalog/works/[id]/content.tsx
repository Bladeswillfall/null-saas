'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Input, Label } from '@null/ui';
import { trpc } from '@/lib/trpc';
import { formatDateOnly, formatDateTime } from '@/lib/analytics';
import { useOrganization } from '@/lib/context/organization-context';
import {
  AnalyticsStateNotice,
  Badge,
  DataTable,
  EmptyState,
  SectionCard
} from '../../../_components/analytics-ui';

const emptyForm = {
  sourceProviderId: '',
  externalId: '',
  externalUrl: '',
  matchType: 'manual'
};

export function WorkCatalogDetailContent() {
  const params = useParams();
  const workId = params.id as string;
  const { organization } = useOrganization();
  const utils = trpc.useUtils();
  const [form, setForm] = useState(emptyForm);

  const workQuery = trpc.work.getById.useQuery(
    { workId },
    { enabled: Boolean(workId) }
  );
  const sourceQuery = trpc.sourceProvider.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: Boolean(organization) }
  );

  const createMutation = trpc.externalId.create.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      utils.work.getById.invalidate({ workId });
      utils.externalId.listByWork.invalidate({ workId });
    }
  });

  const deleteMutation = trpc.externalId.delete.useMutation({
    onSuccess: () => {
      utils.work.getById.invalidate({ workId });
      utils.externalId.listByWork.invalidate({ workId });
    }
  });

  const workState = workQuery.data;
  const sourceState = sourceQuery.data;

  if (workState?.status === 'ready' && !workState.data) {
    return (
      <SectionCard title="Work not found" description="The requested work record does not exist or is no longer available.">
        <EmptyState title="Missing work record" body="Return to the work catalog and select another record." />
      </SectionCard>
    );
  }

  const work = workState?.status === 'ready' ? workState.data : null;
  const sources = sourceState?.status === 'ready' ? sourceState.data : [];

  const submit = async () => {
    if (!form.sourceProviderId || !form.externalId.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      workId,
      sourceProviderId: form.sourceProviderId,
      externalId: form.externalId,
      externalUrl: form.externalUrl,
      matchType: form.matchType as 'exact' | 'probable' | 'manual'
    });
  };

  return (
    <div className="stack">
      {workState?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={workState.reason} />
      ) : null}
      {sourceState?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Source catalog unavailable" body={sourceState.reason} />
      ) : null}

      <SectionCard title="Work Snapshot" description="This record powers leaderboard ranking, source matching, and downstream quality review.">
        {work ? (
          <div className="analytics-grid-2">
            <div className="analytics-stack-sm">
              <div>
                <strong>{work.title}</strong>
                <p className="muted" style={{ margin: '0.25rem 0 0 0' }}>
                  {work.ipName ?? 'No parent IP assigned'}
                </p>
              </div>
              <div className="analytics-actions">
                <Badge tone="accent">{work.mediaType}</Badge>
                <Badge tone={work.status === 'active' ? 'success' : work.status === 'archived' ? 'warning' : 'neutral'}>
                  {work.status}
                </Badge>
              </div>
            </div>

            <div className="analytics-grid-2">
              <div>
                <span className="analytics-table__muted">Series</span>
                <div>{work.seriesName ?? 'Standalone'}</div>
              </div>
              <div>
                <span className="analytics-table__muted">Release</span>
                <div>{formatDateOnly(work.releaseDate)}</div>
              </div>
              <div>
                <span className="analytics-table__muted">Language / Region</span>
                <div>{[work.language, work.region].filter(Boolean).join(' / ') || 'Unspecified'}</div>
              </div>
              <div>
                <span className="analytics-table__muted">Publisher</span>
                <div>{work.publisher ?? 'Unspecified'}</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">Loading work details.</p>
        )}
      </SectionCard>

      <SectionCard title="Link External ID" description="External IDs drive exact matching during normalization and future refreshes.">
        {sources.length === 0 ? (
          <EmptyState
            title="No source providers yet"
            body="Create at least one source provider before linking external IDs."
            actionLabel="Open Source Catalog"
            actionHref="/dashboard/catalog/sources"
          />
        ) : (
          <div className="analytics-form">
            <div className="analytics-form__row">
              <div>
                <Label>Source Provider</Label>
                <select
                  className="null-ui-input"
                  value={form.sourceProviderId}
                  onChange={(event) => setForm({ ...form, sourceProviderId: event.target.value })}
                >
                  <option value="">Select source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Match Type</Label>
                <select
                  className="null-ui-input"
                  value={form.matchType}
                  onChange={(event) => setForm({ ...form, matchType: event.target.value })}
                >
                  <option value="manual">Manual</option>
                  <option value="exact">Exact</option>
                  <option value="probable">Probable</option>
                </select>
              </div>
            </div>
            <div className="analytics-form__row">
              <div>
                <Label>External ID</Label>
                <Input value={form.externalId} onChange={(event) => setForm({ ...form, externalId: event.target.value })} />
              </div>
              <div>
                <Label>External URL</Label>
                <Input value={form.externalUrl} onChange={(event) => setForm({ ...form, externalUrl: event.target.value })} />
              </div>
            </div>
            <div className="analytics-actions">
              <Button onClick={submit} disabled={createMutation.isPending || !work}>
                {createMutation.isPending ? 'Saving...' : 'Attach External ID'}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Current External IDs" description="These IDs are checked first during normalization before title-based fallback matching.">
        {!work ? (
          <p className="muted">Loading linked identifiers.</p>
        ) : work.externalIds.length === 0 ? (
          <EmptyState title="No external IDs linked" body="Attach source-specific IDs to improve exact work matching." />
        ) : (
          <DataTable headers={['Source', 'External ID', 'Match', 'Created', 'Actions']}>
            {work.externalIds.map((externalId) => (
              <tr key={externalId.id}>
                <td>
                  <strong>{externalId.sourceProviderName}</strong>
                  <span className="analytics-table__muted">{externalId.sourceProviderSlug}</span>
                </td>
                <td>
                  <span>{externalId.externalId}</span>
                  {externalId.externalUrl ? (
                    <a href={externalId.externalUrl} target="_blank" rel="noreferrer" className="analytics-table__muted">
                      {externalId.externalUrl}
                    </a>
                  ) : null}
                </td>
                <td>
                  <Badge tone={externalId.matchType === 'exact' ? 'success' : externalId.matchType === 'probable' ? 'warning' : 'neutral'}>
                    {externalId.matchType}
                  </Badge>
                </td>
                <td>{formatDateTime(externalId.createdAt.toString())}</td>
                <td>
                  <div className="analytics-actions">
                    <Button
                      variant="secondary"
                      onClick={() => deleteMutation.mutate({ externalIdId: externalId.id })}
                      disabled={deleteMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </div>
  );
}
