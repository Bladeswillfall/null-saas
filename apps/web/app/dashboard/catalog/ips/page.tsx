'use client';

import { useState } from 'react';
import { analyticsMediaTypes } from '@null/domain';
import { Button, Input, Label } from '@null/ui';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';
import { AnalyticsStateNotice, Badge, DataTable, EmptyState, SectionCard } from '../../_components/analytics-ui';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  primaryCategory: '',
  status: 'active'
};

export default function CatalogIpsPage() {
  const { organization } = useOrganization();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const ipQuery = trpc.analyticsIp.list.useQuery(
    {
      organizationId: organization?.id ?? ''
    },
    { enabled: Boolean(organization) }
  );

  const createMutation = trpc.analyticsIp.create.useMutation({
    onSuccess: () => {
      setForm(emptyForm);
      utils.analyticsIp.list.invalidate();
    }
  });

  const updateMutation = trpc.analyticsIp.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setForm(emptyForm);
      utils.analyticsIp.list.invalidate();
    }
  });

  const deleteMutation = trpc.analyticsIp.delete.useMutation({
    onSuccess: () => {
      utils.analyticsIp.list.invalidate();
    }
  });

  const items = ipQuery.data?.status === 'ready' ? ipQuery.data.data : [];

  const submit = async () => {
    if (!organization || !form.name.trim()) {
      return;
    }

    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || undefined,
      primaryCategory: form.primaryCategory ? (form.primaryCategory as (typeof analyticsMediaTypes)[number]) : null,
      status: form.status
    };

    if (editingId) {
      await updateMutation.mutateAsync({
        ipId: editingId,
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
        <h1>IP Catalog</h1>
        <p>Manage analytics umbrella properties and keep product-facing IP records in sync.</p>
      </div>

      {ipQuery.data?.status === 'unavailable' ? (
        <AnalyticsStateNotice title="Analytics schema not deployed" body={ipQuery.data.reason} />
      ) : null}

      <SectionCard title={editingId ? 'Edit IP' : 'New IP'} description="Create or update an analytics IP record.">
        <div className="analytics-form">
          <div className="analytics-form__row">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Attack on Titan" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="attack-on-titan" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea className="null-ui-input" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          <div className="analytics-form__row">
            <div>
              <Label>Primary Category</Label>
              <select className="null-ui-input" value={form.primaryCategory} onChange={(event) => setForm({ ...form, primaryCategory: event.target.value })}>
                <option value="">Unspecified</option>
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
          </div>
          <div className="analytics-actions">
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Save IP' : 'Create IP'}
            </Button>
            {editingId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Current IPs" description="These records back the IP leaderboard and work rollups.">
        {items.length === 0 ? (
          <EmptyState title="No analytics IPs yet" body="Create your first IP to start organizing works and scores." />
        ) : (
          <DataTable headers={['IP', 'Category', 'Status', 'Works', 'Actions']}>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  <span className="analytics-table__muted">{item.slug}</span>
                </td>
                <td>{item.primaryCategory ?? 'Unspecified'}</td>
                <td>
                  <Badge tone={item.status === 'active' ? 'success' : item.status === 'archived' ? 'warning' : 'neutral'}>
                    {item.status}
                  </Badge>
                </td>
                <td>{item.workCount}</td>
                <td>
                  <div className="analytics-actions">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          name: item.name,
                          slug: item.slug,
                          description: item.description ?? '',
                          primaryCategory: item.primaryCategory ?? '',
                          status: item.status
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => deleteMutation.mutate({ ipId: item.id })}>
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
