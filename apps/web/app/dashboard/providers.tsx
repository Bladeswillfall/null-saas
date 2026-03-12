'use client';

import { ReactNode } from 'react';
import { OrganizationProvider, Organization } from '@/lib/context/organization-context';

interface DashboardProvidersProps {
  children: ReactNode;
  organization: Organization;
}

export function DashboardProviders({ children, organization }: DashboardProvidersProps) {
  return (
    <OrganizationProvider organization={organization} loading={false} error={null}>
      {children}
    </OrganizationProvider>
  );
}
