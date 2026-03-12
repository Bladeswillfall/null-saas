import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agreements - NULL SaaS',
  description: 'Manage creator agreements and contracts',
};

export default function AgreementsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Agreements</h1>
        <p className="muted">Configure creator agreements, terms, and payout rates</p>
      </div>
      <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <p className="muted">Agreements management page coming soon</p>
      </div>
    </main>
  );
}
