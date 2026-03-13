import Link from 'next/link';
import { Card, CardBody, Button } from '@null/ui';

export default function NotFound() {
  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'var(--muted) / 0.12',
              border: '1px solid var(--muted) / 0.3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--muted)'
            }}
          >
            ?
          </div>
          <h1 className="auth-title">Page not found</h1>
          <p className="auth-subtitle">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Card>
          <CardBody>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                textAlign: 'center'
              }}
            >
              <Button asChild variant="primary">
                <Link href="/">Go to homepage</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
