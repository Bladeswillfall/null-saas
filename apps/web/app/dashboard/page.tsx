import { getHealth } from '@null/api-client';
import { listStarterFeatures } from '@null/domain';
import { Card, CardBody, CardTitle } from '@null/ui';

export default async function DashboardPage() {
  const health = await getHealth('');
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
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Shared packages</CardTitle>
            <p className="muted">Domain, UI, API client, DB types, and desktop bridge are already separated.</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle>Desktop future</CardTitle>
            <p className="muted">Tauri stays a host shell. Optional Bun sidecars remain outside product core.</p>
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
