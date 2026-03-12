'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';

interface Creator {
  id: string;
  name: string;
  email: string | null;
  verified: boolean | null;
  createdAt: Date;
}

export function CreatorsList() {
  const { organization } = useOrganization();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.creator.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization }
  );
  const createMutation = trpc.creator.create.useMutation({
    onSuccess: () => utils.creator.list.invalidate()
  });
  const deleteMutation = trpc.creator.delete.useMutation({
    onSuccess: () => utils.creator.list.invalidate()
  });
  const updateMutation = trpc.creator.update.useMutation({
    onSuccess: () => utils.creator.list.invalidate()
  });

  const handleCreate = async () => {
    if (!formData.name || !organization) return;

    await createMutation.mutateAsync({
      organizationId: organization.id,
      name: formData.name,
      email: formData.email || undefined,
      verified: false
    });

    setFormData({ name: '', email: '' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
  };

  const handleToggleVerified = async (creator: Creator) => {
    await updateMutation.mutateAsync({
      id: creator.id,
      verified: !creator.verified
    });
  };

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>All Creators</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="null-ui-button null-ui-button--primary"
        >
          {showForm ? 'Cancel' : 'Add Creator'}
        </button>
      </div>

      {showForm && (
        <div style={{ 
          padding: '1.5rem', 
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius)' 
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="null-ui-label">Name</label>
              <input
                type="text"
                className="null-ui-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Creator name"
              />
            </div>
            <div>
              <label className="null-ui-label">Email (optional)</label>
              <input
                type="email"
                className="null-ui-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="creator@example.com"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!formData.name || createMutation.isPending}
              className="null-ui-button null-ui-button--primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Creator'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {list?.map((creator: Creator) => (
          <div
            key={creator.id}
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'var(--accent)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--background)'
                }}
              >
                {creator.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                    {creator.name}
                  </h3>
                  {creator.verified && (
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      background: 'oklch(0.45 0.15 145)',
                      border: '1px solid oklch(0.55 0.18 145)',
                      borderRadius: '999px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'oklch(0.85 0.1 145)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Verified
                    </span>
                  )}
                </div>
                {creator.email && (
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {creator.email}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleToggleVerified(creator)}
                disabled={updateMutation.isPending}
                className="null-ui-button null-ui-button--secondary"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
              >
                {creator.verified ? 'Unverify' : 'Verify'}
              </button>
              <button
                onClick={() => handleDelete(creator.id)}
                disabled={deleteMutation.isPending}
                className="null-ui-button null-ui-button--secondary"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>Loading creators...</p>
        </div>
      )}

      {!isLoading && list && list.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>No creators yet. Add one to get started.</p>
        </div>
      )}
    </div>
  );
}
