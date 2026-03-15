import { SubsidiariesList } from './components/subsidiaries-list';

export default function SubsidiariesPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Subsidiaries</h1>
        <p>Manage your subsidiary entities and IP portfolios</p>
      </div>
      <SubsidiariesList />
    </main>
  );
}
