import Link from 'next/link';
import { Card, CardBody, CardTitle, Button } from '@null/ui';

export const metadata = {
  title: 'Check Your Email - NULL',
  description: 'Confirm your email to complete sign up'
};

export default function SignUpSuccessPage() {
  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <NullLogo />
            <span>NULL</span>
          </div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">We sent you a confirmation link</p>
        </div>

        <Card>
          <CardBody>
            <div className="stack" style={{ gap: '1.5rem', textAlign: 'center' }}>
              <MailIcon />
              <p className="muted">
                {"We've sent a confirmation email to your inbox. Click the link in the email to verify your account and complete sign up."}
              </p>
              <Button variant="secondary" asChild>
                <Link href="/auth/login">Back to sign in</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

function NullLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M10 22V10h2.5l5 8V10H20v12h-2.5l-5-8v8H10z"
        fill="var(--background)"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ margin: '0 auto' }}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
