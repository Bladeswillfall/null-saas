import { Card, CardBody, CardTitle, Button } from '@null/ui';

export default function SignInPage() {
  return (
    <main>
      <div className="nav">
        <span className="badge">Auth shell</span>
      </div>
      <Card>
        <CardBody className="stack">
          <CardTitle>Sign in</CardTitle>
          <p className="muted">
            This page is intentionally simple. Wire your real Supabase auth flow here after environment
            variables are configured.
          </p>
          <Button type="button">Continue with email</Button>
        </CardBody>
      </Card>
    </main>
  );
}
