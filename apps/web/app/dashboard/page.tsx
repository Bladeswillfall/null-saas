import { Card, CardBody, CardTitle } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';

export default async function DashboardPage() {
  const trpc = await createServerTRPCClient();
  const health = await trpc.health.check.query();

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Manage your IP portfolio, creators, and earnings</p>
      </div>

      <section className="grid grid-3">
        <Card>
          <CardBody>
            <CardTitle>Platform Health</CardTitle>
            <p className="muted">{health.message}</p>
            <p className="muted text-xs">{health.timestamp}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Quick Stats</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><span className="muted">Subsidiaries:</span> <strong>—</strong></div>
              <div><span className="muted">IPs:</span> <strong>—</strong></div>
              <div><span className="muted">Creators:</span> <strong>—</strong></div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Payout Summary</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><span className="muted">Pending:</span> <strong>$0.00</strong></div>
              <div><span className="muted">This Period:</span> <strong>—</strong></div>
            </div>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
