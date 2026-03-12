import { createServerTRPCClient } from '@/lib/trpc/server';
import { IPsList } from './components/ips-list';

interface IPsPageProps {
  params: {
    organizationId: string;
  };
}

export default async function IPsPage({ params }: IPsPageProps) {
  const trpc = await createServerTRPCClient();

  return (
    <main style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 600 }}>
          Intellectual Properties
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
          Manage and track your intellectual properties across subsidiaries.
        </p>
      </div>

      <IPsList organizationId={params.organizationId} />
    </main>
  );
}
