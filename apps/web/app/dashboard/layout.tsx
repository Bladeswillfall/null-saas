import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { Sidebar } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { DashboardProviders } from './providers';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check authentication first - this is the only valid reason to redirect to login
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Now fetch organizations - any error here is a DB/config issue, not auth
  const trpc = await createServerTRPCClient();
  let organizations: Array<{ id: string; name: string; slug: string }> = [];

  try {
    organizations = await trpc.organization.list.query();
  } catch (error) {
    console.error('Dashboard organization load failed:', error);
    throw new Error(
      'Failed to load dashboard organizations. Check POSTGRES_URL/DATABASE_URL and database migrations.'
    );
  }

  // If user has no organizations, redirect to onboarding
  if (organizations.length === 0) {
    redirect('/onboarding');
  }

  // Use first organization as default
  const currentOrg = organizations[0];

  return (
    <DashboardProviders organization={currentOrg}>
      <div className="dashboard-container">
        <Sidebar />
        <main className="dashboard-main">
          <div className="dashboard-header">
            <Breadcrumbs />
          </div>
          <div className="dashboard-content">
            {children}
          </div>
        </main>
      </div>
    </DashboardProviders>
  );
}
