import { Metadata } from 'next';
import { PayoutDetailContent } from './content';

export const metadata: Metadata = {
  title: 'Payout Details - NULL SaaS',
  description: 'View and manage ledger entries for a payout period',
};

export default function PayoutDetailPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Payout Period</h1>
        <p>View and manage ledger entries</p>
      </div>
      <PayoutDetailContent />
    </main>
  );
}
