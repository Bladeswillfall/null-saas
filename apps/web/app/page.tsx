import Link from 'next/link';
import { Button } from '@null/ui';

const pillars = [
  {
    title: 'Cross-source leaderboard',
    body: 'Rank books, manga, manhwa, manhua, comics, and web comics across multiple providers with explainable composite scoring.'
  },
  {
    title: 'Catalog-backed matching',
    body: 'Keep works and IPs curated in one place, attach provider IDs, and let exact matches beat title fallback during normalization.'
  },
  {
    title: 'Import and QC workflow',
    body: 'Validate CSV uploads, store raw observations, surface unresolved rows, and resolve flags before rebuilding scores.'
  },
  {
    title: 'Freshness and evidence',
    body: 'Trace source coverage, provenance tags, quality flags, component weights, and score history from every leaderboard row.'
  }
];

const workflow = [
  'Configure IPs, works, source providers, and external IDs in the catalog.',
  'Upload provider CSVs through the multipart import endpoint.',
  'Normalize batches, clear manual review flags, and assign unresolved rows.',
  'Rebuild scores to refresh the global board, IP board, and detail evidence.'
];

const deferred = [
  'Apply the analytics Supabase schema and regenerate database types.',
  'Decide whether database storage keeps the current franchises naming or moves to ips.',
  'Persist malformed import rows durably instead of reporting them only in the upload response.',
  'Add tighter analytics RLS and DB-side jobs or views for scheduled refresh flows.'
];

export default function HomePage() {
  return (
    <main style={{ paddingTop: '4rem' }}>
      <section
        style={{
          display: 'grid',
          gap: '2rem',
          padding: '2rem',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          background:
            'linear-gradient(135deg, oklch(5% 0 0) 0%, oklch(7% 0.02 205) 50%, oklch(5% 0 0) 100%)'
        }}
      >
        <div style={{ display: 'grid', gap: '1rem', maxWidth: '760px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid oklch(68% 0.15 200 / 0.35)',
              color: 'var(--accent)',
              background: 'oklch(68% 0.15 200 / 0.08)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            IP Intelligence Terminal
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2.75rem, 5vw, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.04em'
            }}
          >
            Track which IPs and works are actually winning.
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.7 }}>
            NULL is a repo-first analytics product for ranking media IPs across multiple sources,
            explaining the score behind every row, and keeping imports, QC, and freshness visible in
            the same workspace.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button asChild>
            <Link href="/auth/sign-up">Create Account</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/auth/login">Open Dashboard</Link>
          </Button>
        </div>
      </section>

      <section className="analytics-grid-4" style={{ marginTop: '1.5rem' }}>
        <div className="analytics-stat">
          <span className="analytics-stat__label">Primary Surfaces</span>
          <strong className="analytics-stat__value">4</strong>
          <span className="analytics-stat__caption">Leaderboard, IP board, imports, freshness</span>
        </div>
        <div className="analytics-stat">
          <span className="analytics-stat__label">Windows</span>
          <strong className="analytics-stat__value">8</strong>
          <span className="analytics-stat__caption">From 1 week to all time</span>
        </div>
        <div className="analytics-stat">
          <span className="analytics-stat__label">Metric Types</span>
          <strong className="analytics-stat__value">8</strong>
          <span className="analytics-stat__caption">Rank, reviews, engagement, sales, awards, search</span>
        </div>
        <div className="analytics-stat">
          <span className="analytics-stat__label">Repo Pass</span>
          <strong className="analytics-stat__value">Active</strong>
          <span className="analytics-stat__caption">Supabase schema updates remain deferred</span>
        </div>
      </section>

      <section className="analytics-grid-2" style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            padding: '1.5rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)'
          }}
        >
          <h2 style={{ marginTop: 0 }}>What the product does</h2>
          <div className="analytics-links">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="analytics-stack-sm">
                <strong>{pillar.title}</strong>
                <span className="muted">{pillar.body}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '1.5rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)'
          }}
        >
          <h2 style={{ marginTop: 0 }}>Current repo workflow</h2>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--muted)', display: 'grid', gap: '0.75rem' }}>
            {workflow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: 'var(--surface)'
        }}
      >
        <h2 style={{ marginTop: 0 }}>Deferred Supabase / v0 work</h2>
        <div className="analytics-links">
          {deferred.map((item) => (
            <span key={item} className="muted">
              {item}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
