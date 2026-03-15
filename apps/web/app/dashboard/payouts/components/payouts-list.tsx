'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/lib/context/organization-context';
import { format } from 'date-fns';

interface PayoutPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'published' | 'finalized';
  totalAmount: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function PayoutsList() {
  const { organization } = useOrganization();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ periodStart: '', periodEnd: '' });

  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.payout.listPeriods.useQuery(
    { organizationId: organization?.id ?? '' },
    { enabled: !!organization }
  );
  
  const createMutation = trpc.payout.createPeriod.useMutation({
    onSuccess: () => utils.payout.listPeriods.invalidate()
  });

  const updateStatusMutation = trpc.payout.updateStatus.useMutation({
    onSuccess: () => utils.payout.listPeriods.invalidate()
  });

  const deleteMutation = trpc.payout.deletePeriod.useMutation({
    onSuccess: () => utils.payout.listPeriods.invalidate()
  });

  const handleCreate = async () => {
    if (!formData.periodStart || !formData.periodEnd || !organization) return;

    await createMutation.mutateAsync({
      organizationId: organization.id,
      periodStart: formData.periodStart,
      periodEnd: formData.periodEnd
    });

    setFormData({ periodStart: '', periodEnd: '' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this payout period? This action cannot be undone.')) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleUpdateStatus = async (id: string, status: 'draft' | 'published' | 'finalized') => {
    await updateStatusMutation.mutateAsync({ id, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'oklch(0.65 0.09 45)';
      case 'published':
        return 'oklch(0.55 0.15 240)';
      case 'finalized':
        return 'oklch(0.45 0.15 145)';
      default:
        return 'var(--muted)';
    }
  };

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Payout Periods</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="null-ui-button null-ui-button--primary"
        >
          {showForm ? 'Cancel' : 'Create Period'}
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
              <label className="null-ui-label">Period Start</label>
              <input
                type="date"
                className="null-ui-input"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
              />
            </div>
            <div>
              <label className="null-ui-label">Period End</label>
              <input
                type="date"
                className="null-ui-input"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!formData.periodStart || !formData.periodEnd || createMutation.isPending}
              className="null-ui-button null-ui-button--primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Period'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {list?.map((period: PayoutPeriod) => (
          <div
            key={period.id}
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                  {format(new Date(period.periodStart), 'MMM dd, yyyy')} - {format(new Date(period.periodEnd), 'MMM dd, yyyy')}
                </h3>
                <span style={{
                  padding: '0.15rem 0.5rem',
                  background: getStatusColor(period.status),
                  borderRadius: '999px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {period.status}
                </span>
              </div>
              {period.totalAmount && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8rem' }}>
                  Total: ${parseFloat(period.totalAmount).toFixed(2)}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {period.status === 'draft' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(period.id, 'published')}
                    disabled={updateStatusMutation.isPending}
                    className="null-ui-button null-ui-button--secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => handleDelete(period.id)}
                    disabled={deleteMutation.isPending}
                    className="null-ui-button null-ui-button--secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Delete
                  </button>
                </>
              )}
              {period.status === 'published' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(period.id, 'finalized')}
                    disabled={updateStatusMutation.isPending}
                    className="null-ui-button null-ui-button--secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Finalize
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(period.id, 'draft')}
                    disabled={updateStatusMutation.isPending}
                    className="null-ui-button null-ui-button--secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Back to Draft
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>Loading payout periods...</p>
        </div>
      )}

      {!isLoading && list && list.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          <p>No payout periods yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
