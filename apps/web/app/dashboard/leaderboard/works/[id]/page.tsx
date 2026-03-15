import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@null/ui';
import { WorkLeaderboardDetailContent } from './content';

export const metadata: Metadata = {
  title: 'Work Detail - NULL',
  description: 'Inspect score history, source coverage, and quality flags for a ranked work.'
};

export default function WorkLeaderboardDetailPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Work Score Detail</h1>
        <p>Inspect the score history, source evidence, and QC footprint behind a single ranked work.</p>
      </div>

      <div className="analytics-actions">
        <Button asChild variant="secondary">
          <Link href="/dashboard/leaderboard">Back to Global Leaderboard</Link>
        </Button>
      </div>

      <WorkLeaderboardDetailContent />
    </main>
  );
}
