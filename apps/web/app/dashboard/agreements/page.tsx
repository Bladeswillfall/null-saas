import { Metadata } from 'next';
import { AgreementsList } from './components/agreements-list';

export const metadata: Metadata = {
  title: 'Agreements - NULL SaaS',
  description: 'Manage creator agreements and contracts',
};

export default function AgreementsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Agreements</h1>
        <p>Configure creator agreements, terms, and payout rates</p>
      </div>
      <AgreementsList />
    </main>
  );
}
