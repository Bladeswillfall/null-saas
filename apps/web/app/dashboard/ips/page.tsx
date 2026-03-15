import { IPsList } from './components/ips-list';

export default function IPsPage() {
  return (
    <main className="stack">
      <div className="page-header">
        <h1>Intellectual Properties</h1>
        <p>Manage and track your intellectual properties across subsidiaries</p>
      </div>
      <IPsList />
    </main>
  );
}
