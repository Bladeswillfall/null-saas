import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { Sidebar } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { DashboardProviders } from './providers';

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

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

  // Try to fetch organizations, but keep the dashboard shell available even when
  // org data has not been set up yet or the backing DB is temporarily unavailable.
  const trpc = await createServerTRPCClient();
  let organizations: OrganizationSummary[] = [];
  let organizationError: string | null = null;

  try {
    organizations = await trpc.organization.list.query();
  } catch (error) {
    console.error('Failed to load organizations for dashboard', error);
    organizationError =
      'We could not load your organization yet. You can still browse the dashboard shell while data setup is completed.';
  }

  const currentOrg = organizations[0] ?? null;

  return (
    <DashboardProviders organization={currentOrg} organizationError={organizationError}>
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
