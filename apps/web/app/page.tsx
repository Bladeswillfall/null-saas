import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardBody, CardTitle, Button } from '@null/ui';
import { createClient } from '@/lib/supabase/server';

const pillars = [
  {
    title: 'One canonical web shell',
    body: 'All product logic lives in apps/web with shared packages. No duplicate web trees, no root-level drift.'
  },
  {
    title: 'Type-safe API layer',
    body: 'tRPC + React Query on the frontend, Drizzle ORM for database queries. End-to-end type safety.'
  },
  {
    title: 'Desktop-ready boundary',
    body: 'Tauri integration planned through a dedicated bridge package instead of baking complexity into the web.'
  }
];

const benefits = [
  { stat: '100%', label: 'Type coverage with tRPC' },
  { stat: 'Monorepo', label: 'Shared packages and logic' },
  { stat: 'Drizzle ORM', label: 'Type-safe database queries' },
  { stat: 'Zero config', label: 'tRPC + React Query setup' }
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect authenticated users to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="stack">
      <div className="nav">
        <span className="badge">NULL starter / modern foundation</span>
        <Link href="/auth/login">Sign in</Link>
      </div>

      <section className="hero stack">
        <span className="kicker">Ship fast with zero boilerplate</span>
        <h1>The monorepo starter that scales with your team.</h1>
        <p>
          NULL combines a clean web shell, type-safe APIs with tRPC, database-first with Drizzle, and a
          planned Tauri desktop integration. No split-brain architecture. No redundant code. Just one source
          of truth across web and future native platforms.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button asChild>
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/auth/login">Sign in</Link>
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

      <section style={{ padding: '2rem 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          {benefits.map((benefit) => (
            <div key={benefit.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem' }}>
                {benefit.stat}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {benefit.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="stack">
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Get started in minutes</h2>
          <p className="muted">Create an account and start building your SaaS application.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button asChild>
            <Link href="/auth/sign-up">Create account</Link>
          </Button>
          <Button variant="secondary" asChild>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
