-- Subsidiaries: Organization sub-entities for IP portfolios
create table if not exists public.subsidiaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- Intellectual Properties: Assets managed by subsidiaries
create table if not exists public.ips (
  id uuid primary key default gen_random_uuid(),
  subsidiary_id uuid not null references public.subsidiaries (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Creators: Individuals contributing to IPs
create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  verified boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

-- IP Contributors: Junction table linking creators to IPs
create table if not exists public.ip_contributors (
  id uuid primary key default gen_random_uuid(),
  ip_id uuid not null references public.ips (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  role text not null default 'contributor',
  contribution_percentage numeric(5, 2),
  created_at timestamptz not null default now(),
  unique (ip_id, creator_id)
);

-- Creator Agreements: Contract/payout terms
create table if not exists public.creator_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  title text not null,
  terms text,
  rate_percentage numeric(5, 2),
  effective_date date,
  expires_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payout Periods: Time-based payout cycles
create table if not exists public.payout_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  total_amount numeric(15, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end)
);

-- Payout Ledger: Actual payout records
create table if not exists public.payout_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  payout_period_id uuid not null references public.payout_periods (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  ip_id uuid references public.ips (id) on delete set null,
  amount numeric(15, 2) not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on all new tables
alter table public.subsidiaries enable row level security;
alter table public.ips enable row level security;
alter table public.creators enable row level security;
alter table public.ip_contributors enable row level security;
alter table public.creator_agreements enable row level security;
alter table public.payout_periods enable row level security;
alter table public.payout_ledger_entries enable row level security;

-- Create indexes for performance
create index idx_subsidiaries_org on public.subsidiaries(organization_id);
create index idx_ips_subsidiary on public.ips(subsidiary_id);
create index idx_ips_org on public.ips(organization_id);
create index idx_creators_org on public.creators(organization_id);
create index idx_ip_contributors_ip on public.ip_contributors(ip_id);
create index idx_ip_contributors_creator on public.ip_contributors(creator_id);
create index idx_creator_agreements_creator on public.creator_agreements(creator_id);
create index idx_creator_agreements_org on public.creator_agreements(organization_id);
create index idx_payout_periods_org on public.payout_periods(organization_id);
create index idx_payout_ledger_creator on public.payout_ledger_entries(creator_id);
create index idx_payout_ledger_period on public.payout_ledger_entries(payout_period_id);
