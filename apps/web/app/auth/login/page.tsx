import { Card, CardBody } from '@null/ui';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Sign In - NULL',
  description: 'Sign in to your NULL account'
};

export default function LoginPage() {
  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <NullLogo />
            <span>NULL</span>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue to your account</p>
        </div>

        <Card>
          <CardBody>
            <LoginForm />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

function NullLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect
        width="32"
        height="32"
        rx="8"
        fill="url(#null-gradient)"
      />
      <path
        d="M10 22V10h2.5l5 8V10H20v12h-2.5l-5-8v8H10z"
        fill="white"
      />
      <defs>
        <linearGradient id="null-gradient" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#6ea8fe" />
          <stop offset="1" stopColor="#2f6fed" />
        </linearGradient>
      </defs>
    </svg>
  );
}
