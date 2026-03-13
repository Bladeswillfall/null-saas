import Link from 'next/link';
import { Button } from '@null/ui';

const features = [
  {
    title: 'Centralized IP Management',
    description: 'Track all intellectual property assets, subsidiaries, and contributors in one unified platform with complete audit trails.',
    icon: '📊'
  },
  {
    title: 'Automated Payout Calculations',
    description: 'Streamline creator payments with intelligent payout period management and ledger automation based on contribution percentages.',
    icon: '💰'
  },
  {
    title: 'Transparent Agreements',
    description: 'Manage creator agreements with clear terms, effective dates, and rate percentages. Full visibility into all contributor relationships.',
    icon: '📋'
  },
  {
    title: 'Real-time Analytics',
    description: 'Get instant insights into your IP portfolio performance, creator contributions, and payout history with comprehensive dashboards.',
    icon: '📈'
  }
];

const stats = [
  { value: '100%', label: 'Data Integrity' },
  { value: 'Real-time', label: 'Payout Tracking' },
  { value: 'Zero-config', label: 'Setup Required' },
  { value: 'Enterprise', label: 'Ready' }
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
              Introducing NULL
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
            Manage IP portfolios and creator payouts with precision
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
            The complete platform for tracking intellectual property, managing creator agreements, and automating payout calculations. Built for modern teams that value transparency and efficiency.
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
              Enterprise-grade features for IP management
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', margin: 0 }}>
              Everything you need to track, manage, and pay your creators accurately
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
            Ready to streamline your IP management?
          </h2>
          <p style={{ color: 'var(--muted)', margin: '0 0 2rem 0', fontSize: '1rem' }}>
            Join teams using NULL to manage their intellectual property and creator payouts
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
