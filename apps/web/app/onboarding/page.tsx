'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardTitle } from '@null/ui';
import { trpc } from '@/lib/trpc';

export default function OnboardingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      router.push('/dashboard');
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.slug) {
      setError('Please fill in all fields');
      return;
    }

    createMutation.mutate({
      name: formData.name,
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setFormData({ name, slug });
  };

  return (
    <main className="stack" style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Welcome to NULL</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Create your organization to get started
        </p>
      </div>

      <Card>
        <CardBody>
          <CardTitle>Create Organization</CardTitle>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="null-ui-label" htmlFor="org-name">
                  Organization Name
                </label>
                <input
                  id="org-name"
                  type="text"
                  className="null-ui-input"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="My Company"
                  required
                />
              </div>

              <div>
                <label className="null-ui-label" htmlFor="org-slug">
                  URL Slug
                </label>
                <input
                  id="org-slug"
                  type="text"
                  className="null-ui-input"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="my-company"
                  pattern="[a-z0-9-]+"
                  required
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Only lowercase letters, numbers, and hyphens
                </p>
              </div>

              {error && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'oklch(0.35 0.12 25)', 
                  border: '1px solid oklch(0.45 0.15 25)', 
                  borderRadius: 'var(--radius)',
                  color: 'oklch(0.85 0.08 25)',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="null-ui-button null-ui-button--primary"
                disabled={createMutation.isPending}
                style={{ marginTop: '0.5rem' }}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
