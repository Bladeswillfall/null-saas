import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - NULL SaaS',
  description: 'Organization settings and configuration',
};

export default function SettingsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="muted">Organization settings, member management, and configuration</p>
      </div>
      <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <p className="muted">Settings page coming soon</p>
      </div>
    </main>
  );
}
