import Link from 'next/link';
import { Card, CardBody, CardTitle, Button } from '@null/ui';

const pillars = [
  {
    title: 'One canonical web shell',
    body: 'All current product pages live in apps/web. No duplicate web trees, no root-level app drift.'
  },
  {
    title: 'Supabase in git',
    body: 'Schema, RLS, triggers, edge functions, and types are tracked from day one.'
  },
  {
    title: 'Desktop-ready boundary',
    body: 'The desktop host is planned through a dedicated bridge package instead of a future rewrite.'
  }
];

export default function HomePage() {
  return (
    <main className="stack">
      <div className="nav">
        <span className="badge">NULL starter / clean-room foundation</span>
        <Link href="/dashboard">Dashboard</Link>
      </div>

      <section className="hero stack">
        <span className="kicker">Build once, switch shells later</span>
        <h1>NULL starts with one clean web app and zero split-brain architecture.</h1>
        <p>
          This starter keeps product logic in shared packages, puts backend truth in Supabase migrations,
          and reserves desktop-native behavior for a future Tauri shell instead of baking that complexity
          into the web app.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/sign-in">Auth shell</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-3">
        {pillars.map((pillar) => (
          <Card key={pillar.title}>
            <CardBody>
              <CardTitle>{pillar.title}</CardTitle>
              <p className="muted">{pillar.body}</p>
            </CardBody>
          </Card>
        ))}
      </section>
    </main>
  );
}
