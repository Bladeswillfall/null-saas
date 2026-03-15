import Link from 'next/link';
import type { Metadata } from 'next';
import { SectionCard } from '../_components/analytics-ui';

export const metadata: Metadata = {
  title: 'Settings - NULL',
  description: 'Analytics settings, legacy operations links, and repo-only rollout notes.'
};

export default function SettingsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="muted">Analytics rollout notes and secondary operational surfaces.</p>
      </div>

      <SectionCard
        title="Analytics Rollout"
        description="This repo pass keeps analytics workflows in-app while leaving Supabase migrations, generated types, and overnight jobs for the later v0 update."
      >
        <div className="analytics-stack-sm">
          <p className="muted" style={{ margin: 0 }}>
            Live analytics pages now read from the current `franchises`-based schema and degrade cleanly when those tables have not been deployed yet.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Remaining database follow-ups stay deferred: generated `db-types`, durable import error storage, RLS tightening, and scheduled refresh jobs.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Legacy Operations"
        description="These routes remain available, but they are no longer part of the primary product IA."
      >
        <div className="analytics-links">
          <Link href="/dashboard/subsidiaries">Subsidiaries</Link>
          <Link href="/dashboard/ips">Legacy IPs</Link>
          <Link href="/dashboard/creators">Creators</Link>
          <Link href="/dashboard/agreements">Agreements</Link>
          <Link href="/dashboard/payouts">Payouts</Link>
        </div>
      </SectionCard>
    </main>
  );
}
