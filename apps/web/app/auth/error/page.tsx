import Link from 'next/link';
import { Card, CardBody, Button } from '@null/ui';

export const metadata = {
  title: 'Authentication Error - NULL',
  description: 'An error occurred during authentication'
};

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Authentication Error</h1>
          <p className="auth-subtitle">Something went wrong during sign in</p>
        </div>

        <Card>
          <CardBody>
            <div style={{ textAlign: 'center' }}>
              {params?.error && (
                <p className="auth-error" style={{ marginBottom: '1.5rem' }}>
                  Error code: {params.error}
                </p>
              )}
              <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                Please try signing in again. If the problem persists, contact support.
              </p>
              <Button asChild>
                <Link href="/auth/login">Back to sign in</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
