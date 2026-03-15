'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development, would send to monitoring service in production
    console.error('[GlobalError] Uncaught application error:', {
      message: error.message,
      digest: error.digest,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          background: 'oklch(1% 0 0)',
          color: 'oklch(96% 0 0)',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            padding: '2rem',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: 'oklch(55% 0.15 30 / 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}
          >
            !
          </div>
          <h1
            style={{
              margin: '0 0 0.75rem',
              fontSize: '1.5rem',
              fontWeight: 600
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: '0 0 1.5rem',
              color: 'oklch(50% 0 0)',
              lineHeight: 1.6
            }}
          >
            The application encountered an unexpected error. Our team has been
            notified.
          </p>
          {error.digest && (
            <p
              style={{
                margin: '0 0 1.5rem',
                padding: '0.5rem 1rem',
                background: 'oklch(3% 0 0)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: 'oklch(50% 0 0)',
                fontFamily: 'monospace'
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: 'oklch(68% 0.15 200)',
                color: 'oklch(1% 0 0)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid oklch(6% 0 0)',
                background: 'oklch(5% 0 0)',
                color: 'oklch(96% 0 0)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
