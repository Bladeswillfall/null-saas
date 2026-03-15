'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, Button } from '@null/ui';

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError] Dashboard error caught:', {
      message: error.message,
      digest: error.digest,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }, [error]);

  const getUserMessage = () => {
    const msg = error.message?.toLowerCase() || '';

    if (msg.includes('organization')) {
      return 'There was a problem loading your organization data. This may be a temporary issue.';
    }
    if (msg.includes('database') || msg.includes('postgres')) {
      return 'We are having trouble connecting to our database. Please try again shortly.';
    }
    return 'Something went wrong loading the dashboard. Please try again.';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem'
      }}
    >
      <Card style={{ maxWidth: '480px', width: '100%' }}>
        <CardBody>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 1rem',
                borderRadius: '50%',
                background: 'var(--warning) / 0.12',
                border: '1px solid var(--warning) / 0.3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                color: 'var(--warning)'
              }}
            >
              !
            </div>

            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              Dashboard Error
            </h2>
            <p
              style={{
                margin: '0 0 1.5rem',
                color: 'var(--muted)',
                lineHeight: 1.5
              }}
            >
              {getUserMessage()}
            </p>

            {error.digest && (
              <p
                style={{
                  margin: '0 0 1.5rem',
                  padding: '0.5rem',
                  background: 'var(--surface-alt)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.7rem',
                  color: 'var(--muted)',
                  fontFamily: 'monospace'
                }}
              >
                Ref: {error.digest}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Button onClick={() => reset()} variant="primary">
                Retry
              </Button>
              <Button asChild variant="secondary">
                <Link href="/">Home</Link>
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
