'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, Button } from '@null/ui';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error details securely - don't expose stack traces in production
    console.error('[AppError] Page error caught:', {
      message: error.message,
      digest: error.digest,
      // Only log stack in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }, [error]);

  // Determine user-friendly message based on error type
  const getUserMessage = () => {
    const msg = error.message?.toLowerCase() || '';

    if (msg.includes('database') || msg.includes('postgres') || msg.includes('db')) {
      return 'We are experiencing database connectivity issues. Please try again in a moment.';
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
      return 'There was a network issue loading this page. Please check your connection and try again.';
    }
    if (msg.includes('unauthorized') || msg.includes('authentication')) {
      return 'Your session may have expired. Please sign in again.';
    }
    return 'Something unexpected happened. Our team has been notified and is working on it.';
  };

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
          <h1 className="auth-title">Error</h1>
          <p className="auth-subtitle">{getUserMessage()}</p>
        </div>

        <Card>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error.digest && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--surface-alt)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    fontFamily: 'monospace',
                    textAlign: 'center'
                  }}
                >
                  Reference: {error.digest}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button
                  onClick={() => reset()}
                  variant="primary"
                  style={{ flex: 1 }}
                >
                  Try again
                </Button>
                <Button asChild variant="secondary" style={{ flex: 1 }}>
                  <Link href="/">Go home</Link>
                </Button>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: 'var(--muted)',
                  textAlign: 'center'
                }}
              >
                If this keeps happening, please{' '}
                <a
                  href="mailto:support@example.com"
                  style={{ color: 'var(--accent)' }}
                >
                  contact support
                </a>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
