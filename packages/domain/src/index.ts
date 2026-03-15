export type UUID = string;

export type StarterFeature = {
  slug: string;
  name: string;
  summary: string;
};

export type Organization = {
  id: UUID;
  name: string;
  slug: string;
};

export type Workspace = {
  id: UUID;
  organizationId: UUID;
  name: string;
  slug: string;
};

export * from './analytics';

export function listStarterFeatures(): StarterFeature[] {
  return [
    {
      slug: 'organizations',
      name: 'Organizations',
      summary: 'Tenant boundary for teams, billing, permissions, and data access.'
    },
    {
      slug: 'workspaces',
      name: 'Workspaces',
      summary: 'Operational boundary inside an organization for scoped product data and collaboration.'
    },
    {
      slug: 'intelligence',
      name: 'Intelligence',
      summary: 'A future feature module for entities, signals, analytics, or whatever NULL turns into.'
    }
  ];
}
