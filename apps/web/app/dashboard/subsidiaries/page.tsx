import { createServerTRPCClient } from '@/lib/trpc/server';
import { SubsidiariesList } from './components/subsidiaries-list';

interface SubsidiariesPageProps {
  params: {
    organizationId: string;
  };
}

export default async function SubsidiariesPage({ params }: SubsidiariesPageProps) {
  const trpc = await createServerTRPCClient();

  return (
    <main style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 600 }}>
          Subsidiaries
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
          Manage your subsidiary entities and IP portfolios.
        </p>
      </div>

      <SubsidiariesList organizationId={params.organizationId} />
    </main>
  );
}
