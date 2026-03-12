import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerTRPCClient } from '@/lib/trpc/server';
import { OrganizationProvider } from '@/lib/context/organization-context';
import { Sidebar } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { DashboardProviders } from './providers';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const trpc = await createServerTRPCClient();
  
  let organizations: Array<{ id: string; name: string; slug: string }> = [];
  try {
    organizations = await trpc.organization.list.query();
  } catch {
    // User not authenticated or DB error
    redirect('/auth/login');
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
