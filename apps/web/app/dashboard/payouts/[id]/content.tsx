'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';

interface LedgerEntry {
  id: string;
  creatorId: string;
  creatorName: string | null;
  ipId: string | null;
  ipTitle: string | null;
  amount: string;
  createdAt: Date;
}

export function PayoutDetailContent() {
  const params = useParams();
  const payoutId = params.id as string;
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [formData, setFormData] = useState({ creatorId: '', ipId: '', amount: '' });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.payout.getPeriod.useQuery({ id: payoutId });

  const addEntryMutation = trpc.payout.addLedgerEntry.useMutation({
    onSuccess: () => {
      utils.payout.getPeriod.invalidate({ id: payoutId });
      setFormData({ creatorId: '', ipId: '', amount: '' });
      setShowAddEntry(false);
    }
  });

  const removeEntryMutation = trpc.payout.removeLedgerEntry.useMutation({
    onSuccess: () => utils.payout.getPeriod.invalidate({ id: payoutId })
  });

  const updateEntryMutation = trpc.payout.updateLedgerEntry.useMutation({
    onSuccess: () => utils.payout.getPeriod.invalidate({ id: payoutId })
  });

  const handleAddEntry = async () => {
    if (!formData.creatorId || !formData.amount || !payoutId) return;

    await addEntryMutation.mutateAsync({
      payoutPeriodId: payoutId,
      creatorId: formData.creatorId,
      ipId: formData.ipId || undefined,
      amount: formData.amount
    });
  };

  const handleRemoveEntry = async (entryId: string) => {
    if (confirm('Remove this ledger entry?')) {
      await removeEntryMutation.mutateAsync({ id: entryId });
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Payout period not found</div>;
  }

  const { period, entries } = data;
  const totalAmount = entries?.reduce((sum, entry) => sum + parseFloat(entry.amount), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              {format(new Date(period.periodStart), 'MMM dd, yyyy')} - {format(new Date(period.periodEnd), 'MMM dd, yyyy')}
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Status: <strong>{period.status}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>Total Payout</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 700 }}>
              ${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ledger Entries</h3>
          {period.status === 'draft' && (
            <button
              onClick={() => setShowAddEntry(!showAddEntry)}
              className="null-ui-button null-ui-button--primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              {showAddEntry ? 'Cancel' : 'Add Entry'}
            </button>
          )}
        </div>

        {showAddEntry && period.status === 'draft' && (
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="null-ui-label">Creator ID</label>
                <input
                  type="text"
                  className="null-ui-input"
                  placeholder="Enter creator UUID"
                  value={formData.creatorId}
                  onChange={(e) => setFormData({ ...formData, creatorId: e.target.value })}
                />
              </div>
              <div>
                <label className="null-ui-label">IP ID (optional)</label>
                <input
                  type="text"
                  className="null-ui-input"
                  placeholder="Enter IP UUID"
                  value={formData.ipId}
                  onChange={(e) => setFormData({ ...formData, ipId: e.target.value })}
                />
              </div>
              <div>
                <label className="null-ui-label">Amount</label>
                <input
                  type="text"
                  className="null-ui-input"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <button
                onClick={handleAddEntry}
                disabled={!formData.creatorId || !formData.amount || addEntryMutation.isPending}
                className="null-ui-button null-ui-button--primary"
              >
                {addEntryMutation.isPending ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries?.map((entry: LedgerEntry) => (
            <div
              key={entry.id}
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
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                  {entry.creatorName || 'Unknown Creator'}
                </p>
                {entry.ipTitle && (
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)', fontSize: '0.8rem' }}>
                    IP: {entry.ipTitle}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  ${parseFloat(entry.amount).toFixed(2)}
                </p>
                {period.status === 'draft' && (
                  <button
                    onClick={() => handleRemoveEntry(entry.id)}
                    disabled={removeEntryMutation.isPending}
                    className="null-ui-button null-ui-button--secondary"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!entries || entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
            <p>No ledger entries yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
