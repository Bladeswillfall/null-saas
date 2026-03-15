import Link from 'next/link';
import { Button } from '@null/ui';

const features = [
  {
    title: 'Real-Time IP Rankings',
    description: 'Track which media franchises and titles are winning across books, manga, manhwa, and web comics with live leaderboard updates.',
    icon: '📊'
  },
  {
    title: 'Multi-Source Intelligence',
    description: 'Aggregate signals from Kindle, Goodreads, MyAnimeList, Webtoon, and more. See which titles are trending across platforms.',
    icon: '🔗'
  },
  {
    title: 'Confidence-Weighted Scoring',
    description: 'Distinguish between direct market signals, estimated data, and engagement metrics. Trust your analysis with transparent provenance.',
    icon: '✓'
  },
  {
    title: 'CSV-First Ingestion',
    description: 'Upload rankings and metadata via CSV. Import batches are versioned, traceable, and quality-controlled automatically.',
    icon: '⬆'
  }
];

const stats = [
  { value: '5+', label: 'Source Families' },
  { value: '100%', label: 'Transparent Scoring' },
  { value: '8x', label: 'Time Windows' },
  { value: '0ms', label: 'Query Latency' }
];

export default async function HomePage() {
  return (
    <main style={{ padding: 0 }}>
      {/* Navigation */}
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50,
        background: 'var(--background)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          maxWidth: '1120px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>NULL</div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a href="#features" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Features</a>
            <a href="#benefits" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Benefits</a>
            <Button asChild variant="primary">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '5rem 2rem',
        background: 'var(--background)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
            <span style={{
              padding: '0.4rem 0.8rem',
              background: 'var(--accent) / 0.1',
              border: '1px solid var(--accent) / 0.2',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              IP Intelligence Platform
            </span>
          </div>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            margin: '0 0 1.5rem 0',
            maxWidth: '900px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Which IPs and titles are winning right now?
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--muted)',
            margin: '0 0 2rem 0',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6
          }}>
            Market intelligence for books, manga, and web comics. Rank media franchises across multiple platforms with confidence-weighted signals and traceable provenance.
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

      {/* Features Section */}
      <section id="features" style={{
        padding: '5rem 2rem',
        background: 'var(--background)'
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
              Built for media market analysis
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', margin: 0 }}>
              Track rankings, aggregate signals, and surface trends across every major platform
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem'
          }}>
            {features.map((feature) => (
              <div key={feature.title} style={{
                padding: '2rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" style={{
        padding: '5rem 2rem',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            textAlign: 'center'
          }}>
            {stats.map((stat) => (
              <div key={stat.label}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  marginBottom: '0.5rem'
                }}>
                  {stat.value}
                </div>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.95rem' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '4rem 2rem',
        background: 'var(--background)',
        borderTop: '1px solid var(--border)'
      }}>
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
            See what's trending in media right now
          </h2>
          <p style={{ color: 'var(--muted)', margin: '0 0 2rem 0', fontSize: '1rem' }}>
            Get instant access to ranked media intelligence across books, manga, and web comics
          </p>
          <Button asChild variant="primary" style={{ padding: '0.9rem 1.5rem', fontSize: '1rem' }}>
            <Link href="/auth/sign-up">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)'
      }}>
        <div style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem'
        }}>
          <p style={{ color: 'var(--muted)', margin: 0 }}>© 2025 NULL. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <a href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
