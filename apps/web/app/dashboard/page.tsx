import { Card, CardBody, CardTitle } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { cookies } from 'next/headers';

async function getHealthStatus() {
  try {
    const trpc = await createServerTRPCClient();
    return await trpc.health.check.query();
  } catch {
    return { message: 'Unable to connect', timestamp: new Date().toISOString() };
  }
}

async function getDashboardData() {
  try {
    const trpc = await createServerTRPCClient();
    const cookieStore = await cookies();
    
    // Get current organization from context
    const orgs = await trpc.organization.list.query();
    const currentOrg = orgs[0];
    
    if (!currentOrg) {
      return {
        subsidiaries: 0,
        ips: 0,
        creators: 0,
        totalCreators: 0,
        totalSubsidiaries: 0,
        totalIps: 0
      };
    }

    const [subsidiaries, ips, creators] = await Promise.all([
      trpc.subsidiary.list.query({ organizationId: currentOrg.id }).then((data: any[]) => data || []),
      trpc.ip.list.query({ organizationId: currentOrg.id }).then((data: any[]) => data || []),
      trpc.creator.list.query({ organizationId: currentOrg.id }).then((data: any[]) => data || [])
    ]);

    return {
      subsidiaries: subsidiaries.length,
      ips: ips.length,
      creators: creators.length,
      totalCreators: creators.length,
      totalSubsidiaries: subsidiaries.length,
      totalIps: ips.length
    };
  } catch (error) {
    console.error('[v0] Error fetching dashboard data:', error);
    return {
      subsidiaries: 0,
      ips: 0,
      creators: 0,
      totalCreators: 0,
      totalSubsidiaries: 0,
      totalIps: 0
    };
  }
}

export default async function DashboardPage() {
  const [health, data] = await Promise.all([
    getHealthStatus(),
    getDashboardData()
  ]);

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
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--muted)', fontSize: '0.75rem' }}>{health.timestamp}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>IP Portfolio</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><span className="muted">Subsidiaries:</span> <strong>{data.totalSubsidiaries}</strong></div>
              <div><span className="muted">IP Assets:</span> <strong>{data.totalIps}</strong></div>
              <div><span className="muted">Contributors:</span> <strong>{data.totalCreators}</strong></div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Payout Status</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><span className="muted">Active Creators:</span> <strong>{data.totalCreators}</strong></div>
              <div><span className="muted">Total Assets:</span> <strong>{data.totalIps}</strong></div>
              <div><span className="muted">Status:</span> <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', background: 'var(--success) / 0.12', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--success)' }}>Ready</span></div>
            </div>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
