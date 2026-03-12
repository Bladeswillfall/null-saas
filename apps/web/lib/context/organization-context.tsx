'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children, organization, loading, error }: {
  children: ReactNode;
  organization: Organization | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <OrganizationContext.Provider value={{ organization, loading, error }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}
