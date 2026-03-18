'use client';

import { ReactNode } from 'react';
import { OrganizationProvider, Organization } from '@/lib/context/organization-context';

interface DashboardProvidersProps {
  children: ReactNode;
  organization: Organization | null;
  organizationError?: string | null;
}

export function DashboardProviders({
  children,
  organization,
  organizationError = null
}: DashboardProvidersProps) {
  return (
    <OrganizationProvider organization={organization} loading={false} error={organizationError}>
      {children}
    </OrganizationProvider>
  );
}
