'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, Button } from '@null/ui';

export default function OnboardingError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[OnboardingError] Error during onboarding:', {
      message: error.message,
      digest: error.digest,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }, [error]);

  return (
    <main
      style={{
        maxWidth: '480px',
        margin: '4rem auto',
        padding: '0 1rem'
      }}
    >
      <Card>
        <CardBody>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 1rem',
                borderRadius: '50%',
                background: 'var(--error) / 0.12',
                border: '1px solid var(--error) / 0.3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                color: 'var(--error)'
              }}
            >
              !
            </div>

            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              Onboarding Error
            </h2>
            <p
              style={{
                margin: '0 0 1.5rem',
                color: 'var(--muted)',
                lineHeight: 1.5
              }}
            >
              Something went wrong during setup. This is usually a temporary
              issue with our service.
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
                Try again
              </Button>
              <Button asChild variant="secondary">
                <Link href="/auth/login">Sign out</Link>
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
