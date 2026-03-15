'use client';

import Link from 'next/link';
import { useState } from 'react';
import { analyticsMediaTypes } from '@null/domain';
import { Button, Input, Label } from '@null/ui';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';
import { AnalyticsStateNotice, Badge, DataTable, EmptyState, SectionCard } from '../../_components/analytics-ui';

const emptyForm = {
  ipId: '',
  title: '',
  mediaType: 'book',
  seriesName: '',
  volumeNumber: '',
  releaseDate: '',
  language: '',
  region: '',
  publisher: '',
  status: 'active'
};

export default function CatalogWorksPage() {
  const { organization } = useOrganization();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const ipQuery = trpc.analyticsIp.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: Boolean(organization) }
  );
  const workQuery = trpc.work.list.useQuery(
    { organizationId: organization?.id ?? '', category: 'all' },
    { enabled: Boolean(organization) }
  );

  const createMutation = trpc.work.create.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      utils.work.list.invalidate();
    }
  });
  const updateMutation = trpc.work.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setForm(emptyForm);
      utils.work.list.invalidate();
      utils.work.getById.invalidate();
    }
  });
  const deleteMutation = trpc.work.delete.useMutation({
    onSuccess: () => {
      utils.work.list.invalidate();
    }
  });

  const works = workQuery.data?.status === 'ready' ? workQuery.data.data : [];
  const ips = ipQuery.data?.status === 'ready' ? ipQuery.data.data : [];

  const submit = async () => {
    if (!organization || !form.title.trim()) {
      return;
    }

    const payload = {
      ipId: form.ipId || null,
      title: form.title,
      mediaType: form.mediaType as (typeof analyticsMediaTypes)[number],
      seriesName: form.seriesName || undefined,
      volumeNumber: form.volumeNumber ? Number(form.volumeNumber) : null,
      releaseDate: form.releaseDate || null,
      language: form.language || undefined,
      region: form.region || undefined,
      publisher: form.publisher || undefined,
      status: form.status
    };

    if (editingId) {
      await updateMutation.mutateAsync({
        workId: editingId,
        ...payload
      });
      return;
    }

    await createMutation.mutateAsync({
      organizationId: organization.id,
      ...payload
    });
  };

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Work Catalog</h1>
        <p>Maintain individual works, attach them to IPs, and open each work for external ID management.</p>
      </div>

      {workQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={workQuery.data.reason} />
      ) : null}

      <SectionCard title={editingId ? 'Edit Work' : 'New Work'} description="Works are the primary rankable objects in the leaderboard.">
        <div className="analytics-form">
          <div className="analytics-form__row">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div>
              <Label>IP</Label>
              <select className="null-ui-input" value={form.ipId} onChange={(event) => setForm({ ...form, ipId: event.target.value })}>
                <option value="">No parent IP</option>
                {ips.map((ip) => (
                  <option key={ip.id} value={ip.id}>
                    {ip.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="analytics-form__row">
            <div>
              <Label>Media Type</Label>
              <select className="null-ui-input" value={form.mediaType} onChange={(event) => setForm({ ...form, mediaType: event.target.value })}>
                {analyticsMediaTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="null-ui-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <Label>Volume Number</Label>
              <Input value={form.volumeNumber} onChange={(event) => setForm({ ...form, volumeNumber: event.target.value })} />
            </div>
          </div>
          <div className="analytics-form__row">
            <div>
              <Label>Series Name</Label>
              <Input value={form.seriesName} onChange={(event) => setForm({ ...form, seriesName: event.target.value })} />
            </div>
            <div>
              <Label>Release Date</Label>
              <Input type="date" value={form.releaseDate} onChange={(event) => setForm({ ...form, releaseDate: event.target.value })} />
            </div>
            <div>
              <Label>Language</Label>
              <Input value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} />
            </div>
          </div>
          <div className="analytics-form__row">
            <div>
              <Label>Region</Label>
              <Input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} />
            </div>
            <div>
              <Label>Publisher</Label>
              <Input value={form.publisher} onChange={(event) => setForm({ ...form, publisher: event.target.value })} />
            </div>
          </div>
          <div className="analytics-actions">
            <Button onClick={submit}>{editingId ? 'Save Work' : 'Create Work'}</Button>
            {editingId ? (
              <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Tracked Works" description="Open a work record to manage external IDs and inspect the current linked metadata.">
        {works.length === 0 ? (
          <EmptyState title="No works yet" body="Create a work to start linking analytics signals and external IDs." />
        ) : (
          <DataTable headers={['Work', 'IP', 'Type', 'External IDs', 'Actions']}>
            {works.map((work) => (
              <tr key={work.id}>
                <td>
                  <strong>{work.title}</strong>
                  <span className="analytics-table__muted">{work.seriesName ?? 'Standalone'}</span>
                </td>
                <td>{work.ipName ?? 'Unassigned'}</td>
                <td>
                  <Badge tone="accent">{work.mediaType}</Badge>
                </td>
                <td>{work.externalIdCount}</td>
                <td>
                  <div className="analytics-actions">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(work.id);
                        setForm({
                          ipId: work.ipId ?? '',
                          title: work.title,
                          mediaType: work.mediaType,
                          seriesName: work.seriesName ?? '',
                          volumeNumber: work.volumeNumber ? String(work.volumeNumber) : '',
                          releaseDate: work.releaseDate ?? '',
                          language: work.language ?? '',
                          region: work.region ?? '',
                          publisher: work.publisher ?? '',
                          status: work.status
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={`/dashboard/catalog/works/${work.id}`}>External IDs</Link>
                    </Button>
                    <Button variant="secondary" onClick={() => deleteMutation.mutate({ workId: work.id })}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </SectionCard>
    </main>
  );
}
