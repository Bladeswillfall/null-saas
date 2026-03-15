import { Metadata } from 'next';
import { CreatorsList } from './components/creators-list';

export const metadata: Metadata = {
  title: 'Creators - NULL SaaS',
  description: 'Manage creator profiles and contributions',
};

export default function CreatorsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Creators</h1>
        <p>Manage creator profiles and verify contributions</p>
      </div>
      <CreatorsList />
    </main>
  );
}
