'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface IP {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
}

export function IPsList({ organizationId, subsidiaryId }: { organizationId: string; subsidiaryId?: string }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subsidiaryId: subsidiaryId || '',
    status: 'active'
  });

  const { data: subsidiaries } = trpc.subsidiary.list.useQuery({ organizationId });
  const { data: list } = subsidiaryId
    ? trpc.ip.listBySubsidiary.useQuery({ subsidiaryId })
    : trpc.ip.list.useQuery({ organizationId });

  const createMutation = trpc.ip.create.useMutation();
  const deleteMutation = trpc.ip.delete.useMutation();
  const updateMutation = trpc.ip.update.useMutation();

  const handleCreate = async () => {
    if (!formData.title || !formData.subsidiaryId) return;

    await createMutation.mutateAsync({
      subsidiaryId: formData.subsidiaryId,
      organizationId,
      title: formData.title,
      description: formData.description || undefined,
      status: 'active'
    });

    setFormData({ title: '', description: '', subsidiaryId: subsidiaryId || '', status: 'active' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Intellectual Properties</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="null-ui-button null-ui-button--primary"
        >
          {showForm ? 'Cancel' : 'New IP'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div className="space-y-4">
            <div>
              <label className="null-ui-label">Subsidiary</label>
              <select
                className="null-ui-input"
                value={formData.subsidiaryId}
                onChange={(e) => setFormData({ ...formData, subsidiaryId: e.target.value })}
              >
                <option value="">Select a subsidiary</option>
                {subsidiaries?.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="null-ui-label">Title</label>
              <input
                type="text"
                className="null-ui-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter IP title"
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
              disabled={!formData.title || !formData.subsidiaryId || createMutation.isPending}
              className="null-ui-button null-ui-button--primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {list?.map((ip: IP) => (
          <div
            key={ip.id}
            style={{
              padding: '1.25rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                  {ip.title}
                </h3>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: 'var(--accent) / 0.15',
                    border: '1px solid var(--accent) / 0.35',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {ip.status}
                </span>
              </div>
              {ip.description && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                  {ip.description}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(ip.id)}
              disabled={deleteMutation.isPending}
              className="null-ui-button null-ui-button--secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', marginLeft: '1rem' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {list && list.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>No IPs yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
