import { Metadata } from 'next';
import { PayoutsList } from './components/payouts-list';

export const metadata: Metadata = {
  title: 'Payouts - NULL SaaS',
  description: 'Manage payout periods and ledger entries',
};

export default function PayoutsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Payouts</h1>
        <p>Create and manage payout periods for your creators</p>
      </div>
      <PayoutsList />
    </main>
  );
}
