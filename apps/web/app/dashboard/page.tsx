import { Card, CardBody, CardTitle } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';

async function getHealthStatus() {
  try {
    const trpc = await createServerTRPCClient();
    return await trpc.health.check.query();
  } catch {
    return { message: 'Unable to connect', timestamp: new Date().toISOString() };
  }
}

export default async function DashboardPage() {
  const health = await getHealthStatus();

  return (
    <main className="stack">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Manage your IP portfolio, creators, and earnings</p>
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
