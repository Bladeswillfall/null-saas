import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@null/ui';
import { IpLeaderboardDetailContent } from './content';

export const metadata: Metadata = {
  title: 'IP Detail - NULL',
  description: 'Inspect score history, top works, and source coverage for a ranked IP.'
};

export default function IpLeaderboardDetailPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>IP Score Detail</h1>
        <p>Inspect the current and historical score evidence for a single analytics IP rollup.</p>
      </div>

      <div className="analytics-actions">
        <Button asChild variant="secondary">
          <Link href="/dashboard/leaderboard/ips">Back to IP Leaderboard</Link>
        </Button>
      </div>

      <IpLeaderboardDetailContent />
    </main>
  );
}
