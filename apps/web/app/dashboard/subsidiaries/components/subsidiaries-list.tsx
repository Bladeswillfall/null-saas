'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';

interface Subsidiary {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export function SubsidiariesList() {
  const { organization } = useOrganization();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.subsidiary.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization }
  );
  const createMutation = trpc.subsidiary.create.useMutation({
    onSuccess: () => utils.subsidiary.list.invalidate()
  });
  const deleteMutation = trpc.subsidiary.delete.useMutation({
    onSuccess: () => utils.subsidiary.list.invalidate()
  });

  const handleCreate = async () => {
    if (!formData.name || !organization) return;

    await createMutation.mutateAsync({
      organizationId: organization.id,
      name: formData.name,
      description: formData.description || undefined
    });

    setFormData({ name: '', description: '' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Subsidiaries</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="null-ui-button null-ui-button--primary"
        >
          {showForm ? 'Cancel' : 'New Subsidiary'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div className="space-y-4">
            <div>
              <label className="null-ui-label">Name</label>
              <input
                type="text"
                className="null-ui-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter subsidiary name"
              />
            </div>
            <div>
              <label className="null-ui-label">Description</label>
              <textarea
                className="null-ui-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!formData.name || createMutation.isPending}
              className="null-ui-button null-ui-button--primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {list?.map((subsidiary: Subsidiary) => (
          <div
            key={subsidiary.id}
            style={{
              padding: '1.25rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
                {subsidiary.name}
              </h3>
              {subsidiary.description && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                  {subsidiary.description}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(subsidiary.id)}
              disabled={deleteMutation.isPending}
              className="null-ui-button null-ui-button--secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>Loading subsidiaries...</p>
        </div>
      )}

      {!isLoading && list && list.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>No subsidiaries yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
