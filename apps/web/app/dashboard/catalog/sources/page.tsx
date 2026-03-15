'use client';

import { useState } from 'react';
import { accessTypes, confidenceTiers, sourceFamilies } from '@null/domain';
import { Button, Input, Label } from '@null/ui';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';
import { AnalyticsStateNotice, Badge, DataTable, EmptyState, SectionCard } from '../../_components/analytics-ui';

const emptyForm = {
  slug: '',
  name: '',
  sourceFamily: 'ranking',
  accessType: 'csv',
  confidenceTier: 'bronze',
  isActive: true
};

export default function CatalogSourcesPage() {
  const { organization } = useOrganization();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const sourceQuery = trpc.sourceProvider.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: Boolean(organization) }
  );

  const createMutation = trpc.sourceProvider.create.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      utils.sourceProvider.list.invalidate();
    }
  });
  const updateMutation = trpc.sourceProvider.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setForm(emptyForm);
      utils.sourceProvider.list.invalidate();
    }
  });
  const deleteMutation = trpc.sourceProvider.delete.useMutation({
    onSuccess: () => {
      utils.sourceProvider.list.invalidate();
    }
  });

  const sources = sourceQuery.data?.status === 'ready' ? sourceQuery.data.data : [];

  const submit = async () => {
    if (!organization || !form.slug.trim() || !form.name.trim()) {
      return;
    }

    const payload = {
      organizationId: organization.id,
      slug: form.slug,
      name: form.name,
      sourceFamily: form.sourceFamily as (typeof sourceFamilies)[number],
      accessType: form.accessType as (typeof accessTypes)[number],
      confidenceTier: form.confidenceTier as (typeof confidenceTiers)[number],
      isActive: form.isActive
    };

    if (editingId) {
      await updateMutation.mutateAsync({
        sourceProviderId: editingId,
        ...payload
      });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Source Providers</h1>
        <p>Maintain the registry of data sources, access modes, and confidence tiers.</p>
      </div>

      {sourceQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={sourceQuery.data.reason} />
      ) : null}

      <SectionCard title={editingId ? 'Edit Source' : 'New Source'} description="Keep slugs stable; imports and freshness use them directly.">
        <div className="analytics-form">
          <div className="analytics-form__row">
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
          </div>
          <div className="analytics-form__row">
            <div>
              <Label>Source Family</Label>
              <select className="null-ui-input" value={form.sourceFamily} onChange={(event) => setForm({ ...form, sourceFamily: event.target.value })}>
                {sourceFamilies.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Access Type</Label>
              <select className="null-ui-input" value={form.accessType} onChange={(event) => setForm({ ...form, accessType: event.target.value })}>
                {accessTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Confidence Tier</Label>
              <select className="null-ui-input" value={form.confidenceTier} onChange={(event) => setForm({ ...form, confidenceTier: event.target.value })}>
                {confidenceTiers.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            <span className="muted">Provider is active</span>
          </label>
          <div className="analytics-actions">
            <Button onClick={submit}>{editingId ? 'Save Source' : 'Create Source'}</Button>
            {editingId ? (
              <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Registered Sources" description="This list powers imports, normalization matching, and freshness reporting.">
        {sources.length === 0 ? (
          <EmptyState title="No source providers yet" body="Create a provider so imports and external IDs can reference it." />
        ) : (
          <DataTable headers={['Source', 'Family', 'Access', 'Confidence', 'Actions']}>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>
                  <strong>{source.name}</strong>
                  <span className="analytics-table__muted">{source.slug}</span>
                </td>
                <td>{source.sourceFamily}</td>
                <td>{source.accessType}</td>
                <td>
                  <Badge tone={source.confidenceTier === 'gold' ? 'success' : source.confidenceTier === 'community' ? 'warning' : 'accent'}>
                    {source.confidenceTier}
                  </Badge>
                </td>
                <td>
                  <div className="analytics-actions">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(source.id);
                        setForm({
                          slug: source.slug,
                          name: source.name,
                          sourceFamily: source.sourceFamily,
                          accessType: source.accessType,
                          confidenceTier: source.confidenceTier,
                          isActive: source.isActive
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => deleteMutation.mutate({ organizationId: organization!.id, sourceProviderId: source.id })}>
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
