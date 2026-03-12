'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';

interface Agreement {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string | null;
  status: string;
  ratePercentage: string | null;
  effectiveDate: string | null;
  expiresDate: string | null;
  createdAt: Date;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  draft: { bg: 'oklch(0.35 0.05 250)', border: 'oklch(0.45 0.08 250)', text: 'oklch(0.75 0.05 250)' },
  active: { bg: 'oklch(0.35 0.12 145)', border: 'oklch(0.45 0.15 145)', text: 'oklch(0.85 0.1 145)' },
  expired: { bg: 'oklch(0.35 0.08 25)', border: 'oklch(0.45 0.1 25)', text: 'oklch(0.75 0.05 25)' }
};

export function AgreementsList() {
  const { organization } = useOrganization();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    creatorId: '',
    ratePercentage: '',
    status: 'draft' as 'draft' | 'active' | 'expired'
  });

  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.agreement.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization }
  );
  const { data: creators } = trpc.creator.list.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization }
  );
  const createMutation = trpc.agreement.create.useMutation({
    onSuccess: () => utils.agreement.list.invalidate()
  });
  const updateMutation = trpc.agreement.update.useMutation({
    onSuccess: () => utils.agreement.list.invalidate()
  });
  const deleteMutation = trpc.agreement.delete.useMutation({
    onSuccess: () => utils.agreement.list.invalidate()
  });

  const handleCreate = async () => {
    if (!formData.title || !formData.creatorId || !organization) return;

    await createMutation.mutateAsync({
      organizationId: organization.id,
      creatorId: formData.creatorId,
      title: formData.title,
      ratePercentage: formData.ratePercentage || undefined,
      status: formData.status
    });

    setFormData({ title: '', creatorId: '', ratePercentage: '', status: 'draft' });
    setShowForm(false);
  };

  const handleStatusChange = async (agreement: Agreement, newStatus: 'draft' | 'active' | 'expired') => {
    await updateMutation.mutateAsync({
      id: agreement.id,
      status: newStatus
    });
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
  };

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>All Agreements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="null-ui-button null-ui-button--primary"
        >
          {showForm ? 'Cancel' : 'New Agreement'}
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
              <label className="null-ui-label">Creator</label>
              <select
                className="null-ui-input"
                value={formData.creatorId}
                onChange={(e) => setFormData({ ...formData, creatorId: e.target.value })}
              >
                <option value="">Select a creator</option>
                {creators?.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="null-ui-label">Agreement Title</label>
              <input
                type="text"
                className="null-ui-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Standard Royalty Agreement"
              />
            </div>
            <div>
              <label className="null-ui-label">Rate Percentage</label>
              <input
                type="number"
                className="null-ui-input"
                value={formData.ratePercentage}
                onChange={(e) => setFormData({ ...formData, ratePercentage: e.target.value })}
                placeholder="e.g., 15.00"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="null-ui-label">Status</label>
              <select
                className="null-ui-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'active' | 'expired' })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={!formData.title || !formData.creatorId || createMutation.isPending}
              className="null-ui-button null-ui-button--primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Agreement'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {list?.map((agreement: Agreement) => {
          const colors = statusColors[agreement.status] || statusColors.draft;
          return (
            <div
              key={agreement.id}
              style={{
                padding: '1rem 1.25rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                      {agreement.title}
                    </h3>
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '999px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: colors.text,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {agreement.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                    <span>Creator: {agreement.creatorName || 'Unknown'}</span>
                    {agreement.ratePercentage && (
                      <span>Rate: {agreement.ratePercentage}%</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {agreement.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(agreement, 'active')}
                      disabled={updateMutation.isPending}
                      className="null-ui-button null-ui-button--primary"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      Activate
                    </button>
                  )}
                  {agreement.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(agreement, 'expired')}
                      disabled={updateMutation.isPending}
                      className="null-ui-button null-ui-button--secondary"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      Expire
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(agreement.id)}
                    disabled={deleteMutation.isPending}
                    className="null-ui-button null-ui-button--secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>Loading agreements...</p>
        </div>
      )}

      {!isLoading && list && list.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>No agreements yet. Create one to define creator terms.</p>
        </div>
      )}
    </div>
  );
}
