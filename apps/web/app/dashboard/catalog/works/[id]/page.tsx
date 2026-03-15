import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@null/ui';
import { WorkCatalogDetailContent } from './content';

export const metadata: Metadata = {
  title: 'Work Record - NULL',
  description: 'Inspect a tracked work and manage its external IDs.'
};

export default function WorkCatalogDetailPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Work Record</h1>
        <p>Review the tracked work metadata and manage source-specific external IDs inline.</p>
      </div>

      <div className="analytics-actions">
        <Button asChild variant="secondary">
          <Link href="/dashboard/catalog/works">Back to Work Catalog</Link>
        </Button>
      </div>

      <WorkCatalogDetailContent />
    </main>
  );
}
