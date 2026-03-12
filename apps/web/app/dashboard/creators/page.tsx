import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creators - NULL SaaS',
  description: 'Manage creator profiles and contributions',
};

export default function CreatorsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Creators</h1>
        <p className="muted">Manage creator profiles and verify contributions</p>
      </div>
      <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <p className="muted">Creators management page coming soon</p>
      </div>
    </main>
  );
}
