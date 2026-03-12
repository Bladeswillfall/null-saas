import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payouts - NULL SaaS',
  description: 'Manage payout periods and ledger entries',
};

export default function PayoutsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Payouts</h1>
        <p className="muted">Track creator earnings, payout periods, and payment history</p>
      </div>
      <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <p className="muted">Payouts management page coming soon</p>
      </div>
    </main>
  );
}
