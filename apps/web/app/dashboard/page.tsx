import { listStarterFeatures } from '@null/domain';
import { Card, CardBody, CardTitle } from '@null/ui';
import { createServerTRPCClient } from '@/lib/trpc/server';

export default async function DashboardPage() {
  const trpc = await createServerTRPCClient();
  const health = await trpc.health.check.query();
  const features = listStarterFeatures();

  return (
    <main className="stack">
      <div className="nav">
        <span className="badge">App shell / dashboard</span>
      </div>

      <section className="grid grid-3">
        <Card>
          <CardBody>
            <CardTitle>Platform health</CardTitle>
            <p className="muted">{health.message}</p>
            <p className="muted text-xs">{health.timestamp}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Shared packages</CardTitle>
            <p className="muted">Domain, UI, API, DB (Drizzle), DB types, and desktop bridge are now separated.</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>tRPC + Drizzle</CardTitle>
            <p className="muted">Type-safe API layer with tRPC and Drizzle ORM for database queries.</p>
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-3">
        {features.map((feature) => (
          <Card key={feature.slug}>
            <CardBody>
              <CardTitle>{feature.name}</CardTitle>
              <p className="muted">{feature.summary}</p>
            </CardBody>
          </Card>
        ))}
      </section>
    </main>
  );
}
