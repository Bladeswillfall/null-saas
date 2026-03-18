import Link from 'next/link';
import { Button } from '@null/ui';

const features = [
  {
    title: 'Real-time IP rankings',
    description:
      'Track which media franchises and titles are outperforming across books, manga, manhwa, and web comics with leaderboard views that stay easy to scan.',
    icon: '📊'
  },
  {
    title: 'Multi-source intelligence',
    description:
      'Compare Kindle, Goodreads, MyAnimeList, Webtoon, and other source signals in one place so cross-platform momentum is immediately visible.',
    icon: '🔗'
  },
  {
    title: 'Confidence-weighted scoring',
    description:
      'Separate direct market signals, modeled estimates, and engagement metrics with transparent provenance that makes every ranking easier to trust.',
    icon: '✓'
  },
  {
    title: 'CSV-first ingestion',
    description:
      'Upload ranking and metadata batches through CSV workflows with versioned imports, traceability, and built-in quality control checks.',
    icon: '⬆️'
  }
] as const;

const stats = [
  { value: '5+', label: 'Source families' },
  { value: '100%', label: 'Transparent scoring' },
  { value: '8x', label: 'Time windows' },
  { value: 'Fast', label: 'Dashboard access' }
] as const;

const footerLinks = [
  { href: '/auth/sign-up', label: 'Start free' },
  { href: '/auth/login', label: 'Sign in' }
] as const;

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <main style={{ padding: 0 }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '1rem 2rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            maxWidth: '1120px',
            margin: '0 auto'
          }}
        >
          <Link
            href="/"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '-0.02em'
            }}
          >
            NULL
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="#features" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Features
            </a>
            <a href="#benefits" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Benefits
            </a>
            <Button asChild variant="primary">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section
        style={{
          padding: '5rem 2rem',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--background)) 0%, var(--background) 100%)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.4rem 0.8rem',
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              IP Intelligence Platform
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(2.75rem, 7vw, 4.75rem)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              margin: '0 0 1.5rem 0',
              maxWidth: '900px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
          >
            Which IPs and titles are winning right now?
          </h1>
          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--muted)',
              margin: '0 0 2rem 0',
              maxWidth: '700px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6
            }}
          >
            Market intelligence for books, manga, and web comics. Rank media franchises across
            multiple platforms with confidence-weighted signals and traceable provenance.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button asChild variant="primary" style={{ padding: '0.9rem 1.5rem', fontSize: '1rem' }}>
              <Link href="/auth/sign-up">Start Free Trial</Link>
            </Button>
            <Button asChild variant="secondary" style={{ padding: '0.9rem 1.5rem', fontSize: '1rem' }}>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: '5rem 2rem', background: 'var(--background)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
              Built for media market analysis
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', margin: 0 }}>
              Track rankings, aggregate signals, and surface trends across every major platform.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem'
            }}
          >
            {features.map((feature) => (
              <article
                key={feature.title}
                style={{
                  padding: '2rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  minHeight: '100%'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }} aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="benefits"
        style={{
          padding: '5rem 2rem',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '2rem',
              textAlign: 'center'
            }}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    marginBottom: '0.5rem'
                  }}
                >
                  {stat.value}
                </div>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.95rem' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: '4rem 2rem',
          background: 'var(--background)',
          borderTop: '1px solid var(--border)'
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
            See what&apos;s trending in media right now
          </h2>
          <p style={{ color: 'var(--muted)', margin: '0 0 2rem 0', fontSize: '1rem' }}>
            Get instant access to ranked media intelligence across books, manga, and web comics.
          </p>
          <Button asChild variant="primary" style={{ padding: '0.9rem 1.5rem', fontSize: '1rem' }}>
            <Link href="/auth/sign-up">Get Started Free</Link>
          </Button>
        </div>
      </section>

      <footer
        style={{
          padding: '2rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)'
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.875rem'
          }}
        >
          <p style={{ color: 'var(--muted)', margin: 0 }}>© {year} NULL. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
