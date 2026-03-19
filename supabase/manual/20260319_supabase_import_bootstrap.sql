-- =============================================================================
-- Supabase import bootstrap
-- Run this in the Supabase SQL editor to create the catalog/import tables needed
-- for spreadsheet-based ingestion.
--
-- IMPORTANT:
--   * Supabase SQL cannot read .xlsx files directly.
--   * Convert .xlsx -> .csv in your app, script, or admin workflow before loading.
--   * The app in this repo currently uploads CSV rows and stores them in
--     public.raw_observations.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Base enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('owner', 'admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'media_type_enum') then
    create type public.media_type_enum as enum (
      'book', 'manga', 'manhwa', 'manhua', 'web_comic', 'comic'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'source_family_enum') then
    create type public.source_family_enum as enum (
      'ranking', 'reviews', 'awards', 'search', 'social',
      'sales_estimated', 'sales_direct', 'metadata'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'access_type_enum') then
    create type public.access_type_enum as enum ('csv', 'api', 'scrape', 'manual');
  end if;

  if not exists (select 1 from pg_type where typname = 'confidence_tier_enum') then
    create type public.confidence_tier_enum as enum ('gold', 'silver', 'bronze', 'community');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_type_enum') then
    create type public.match_type_enum as enum ('exact', 'probable', 'manual');
  end if;

  if not exists (select 1 from pg_type where typname = 'import_status_enum') then
    create type public.import_status_enum as enum (
      'pending', 'processing', 'complete', 'failed', 'partial'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'provenance_tag_enum') then
    create type public.provenance_tag_enum as enum (
      'direct', 'estimated', 'engagement', 'awards', 'metadata'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'flag_type_enum') then
    create type public.flag_type_enum as enum (
      'duplicate', 'outlier', 'missing_id', 'suspect_spike', 'low_sample', 'manual_review'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'flag_severity_enum') then
    create type public.flag_severity_enum as enum ('info', 'warning', 'critical');
  end if;

  if not exists (select 1 from pg_type where typname = 'time_window_enum') then
    create type public.time_window_enum as enum (
      'all_time', '5y', '1y', '6m', '3m', '1m', '2w', '1w'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'scope_type_enum') then
    create type public.scope_type_enum as enum ('global', 'category', 'ip');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Core org/auth tables used by the import schema
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_org_member(lookup_org_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = lookup_org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(lookup_org_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = lookup_org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin')
  );
$$;

-- -----------------------------------------------------------------------------
-- Business catalog tables
-- -----------------------------------------------------------------------------
create table if not exists public.subsidiaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

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

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  verified boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, email)
);

create table if not exists public.ip_contributors (
  id uuid primary key default gen_random_uuid(),
  ip_id uuid not null references public.ips (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  role text not null default 'contributor',
  contribution_percentage numeric(5, 2),
  created_at timestamptz not null default now(),
  unique (ip_id, creator_id)
);

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

create table if not exists public.payout_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  payout_period_id uuid not null references public.payout_periods (id) on delete cascade,
  creator_id uuid not null references public.creators (id) on delete cascade,
  ip_id uuid references public.ips (id) on delete set null,
  amount numeric(15, 2) not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Analytics/import catalog tables
-- -----------------------------------------------------------------------------
create table if not exists public.franchises (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  primary_category public.media_type_enum,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  franchise_id uuid references public.franchises(id) on delete set null,
  title text not null,
  canonical_title text,
  media_type public.media_type_enum not null,
  series_name text,
  volume_number int,
  release_date date,
  language text,
  region text,
  publisher text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source_family public.source_family_enum not null,
  access_type public.access_type_enum not null default 'csv',
  confidence_tier public.confidence_tier_enum not null default 'bronze',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.work_external_ids (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete cascade,
  external_id text not null,
  external_url text,
  match_type public.match_type_enum not null default 'manual',
  created_at timestamptz not null default now(),
  unique (source_provider_id, external_id)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete restrict,
  import_type text not null default 'csv',
  uploaded_by uuid references public.profiles(id) on delete set null,
  status public.import_status_enum not null default 'pending',
  row_count int not null default 0,
  error_count int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.raw_observations (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete restrict,
  raw_work_title text,
  raw_ip_name text,
  raw_author_or_creator text,
  raw_category text,
  raw_region text,
  raw_language text,
  observed_at timestamptz not null,
  rank_value int,
  rating_value numeric(4, 2),
  review_count int,
  view_count bigint,
  engagement_count bigint,
  sales_value numeric(15, 2),
  sales_is_estimated boolean,
  awards_value text,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.normalized_observations (
  id uuid primary key default gen_random_uuid(),
  raw_observation_id uuid not null references public.raw_observations(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete restrict,
  observed_at timestamptz not null,
  metric_type text not null,
  metric_value numeric(20, 6) not null,
  metric_unit text,
  window_hint text,
  confidence_score numeric(5, 4) check (confidence_score >= 0 and confidence_score <= 1),
  provenance_tag public.provenance_tag_enum not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quality_flags (
  id uuid primary key default gen_random_uuid(),
  raw_observation_id uuid references public.raw_observations(id) on delete cascade,
  work_id uuid references public.works(id) on delete cascade,
  flag_type public.flag_type_enum not null,
  severity public.flag_severity_enum not null default 'warning',
  notes text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.score_components (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  score_date date not null,
  time_window public.time_window_enum not null,
  component_type text not null check (component_type in ('ranking', 'reviews', 'momentum', 'awards', 'sales')),
  component_score numeric(10, 6) not null,
  weight_used numeric(5, 4),
  provenance_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_scores (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  score_date date not null,
  time_window public.time_window_enum not null,
  composite_score numeric(10, 6) not null default 0,
  momentum_score numeric(10, 6),
  confidence_score numeric(5, 4) check (confidence_score >= 0 and confidence_score <= 1),
  rank_overall int,
  rank_in_category int,
  rank_delta int,
  created_at timestamptz not null default now(),
  unique (work_id, score_date, time_window)
);

create table if not exists public.ip_scores (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  score_date date not null,
  time_window public.time_window_enum not null,
  composite_score numeric(10, 6) not null default 0,
  momentum_score numeric(10, 6),
  confidence_score numeric(5, 4) check (confidence_score >= 0 and confidence_score <= 1),
  rank_overall int,
  rank_delta int,
  active_work_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (franchise_id, score_date, time_window)
);

create table if not exists public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  time_window public.time_window_enum not null,
  scope_type public.scope_type_enum not null,
  scope_value text not null default '',
  generated_at timestamptz not null default now()
);

create unique index if not exists idx_leaderboard_snapshots_unique
  on public.leaderboard_snapshots(snapshot_date, time_window, scope_type, scope_value);

-- -----------------------------------------------------------------------------
-- Staging table for CSV/XLSX-derived rows before they are promoted to raw_observations.
-- Upload spreadsheets in your app, convert rows to JSON/CSV, then insert here.
-- -----------------------------------------------------------------------------
create table if not exists public.import_file_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete restrict,
  import_batch_id uuid references public.import_batches(id) on delete cascade,
  source_file_name text not null,
  source_file_type text not null check (source_file_type in ('csv', 'xlsx')),
  row_number int not null,
  row_data jsonb not null,
  is_valid boolean not null default true,
  validation_errors jsonb,
  created_at timestamptz not null default now(),
  unique (import_batch_id, row_number)
);

-- -----------------------------------------------------------------------------
-- Helpful indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_subsidiaries_org on public.subsidiaries(organization_id);
create index if not exists idx_ips_subsidiary on public.ips(subsidiary_id);
create index if not exists idx_ips_org on public.ips(organization_id);
create index if not exists idx_creators_org on public.creators(organization_id);
create index if not exists idx_ip_contributors_ip on public.ip_contributors(ip_id);
create index if not exists idx_ip_contributors_creator on public.ip_contributors(creator_id);
create index if not exists idx_creator_agreements_creator on public.creator_agreements(creator_id);
create index if not exists idx_creator_agreements_org on public.creator_agreements(organization_id);
create index if not exists idx_payout_periods_org on public.payout_periods(organization_id);
create index if not exists idx_payout_ledger_creator on public.payout_ledger_entries(creator_id);
create index if not exists idx_payout_ledger_period on public.payout_ledger_entries(payout_period_id);
create index if not exists idx_franchises_org on public.franchises(organization_id);
create index if not exists idx_franchises_status on public.franchises(status);
create index if not exists idx_works_org on public.works(organization_id);
create index if not exists idx_works_franchise on public.works(franchise_id);
create index if not exists idx_works_media_type on public.works(media_type);
create index if not exists idx_works_status on public.works(status);
create index if not exists idx_import_batches_org on public.import_batches(organization_id);
create index if not exists idx_import_batches_status on public.import_batches(status);
create index if not exists idx_import_batches_provider on public.import_batches(source_provider_id);
create index if not exists idx_raw_obs_batch on public.raw_observations(import_batch_id);
create index if not exists idx_raw_obs_provider on public.raw_observations(source_provider_id);
create index if not exists idx_raw_obs_observed_at on public.raw_observations(observed_at);
create index if not exists idx_norm_obs_work on public.normalized_observations(work_id);
create index if not exists idx_norm_obs_observed_at on public.normalized_observations(observed_at);
create index if not exists idx_norm_obs_metric_type on public.normalized_observations(metric_type);
create index if not exists idx_norm_obs_provenance on public.normalized_observations(provenance_tag);
create index if not exists idx_qflags_work on public.quality_flags(work_id);
create index if not exists idx_qflags_severity on public.quality_flags(severity);
create index if not exists idx_qflags_unresolved on public.quality_flags(resolved_at) where resolved_at is null;
create index if not exists idx_score_components_work_date on public.score_components(work_id, score_date);
create index if not exists idx_score_components_window on public.score_components(time_window);
create index if not exists idx_work_scores_date_window on public.work_scores(score_date, time_window);
create index if not exists idx_work_scores_rank on public.work_scores(rank_overall) where rank_overall is not null;
create index if not exists idx_ip_scores_date_window on public.ip_scores(score_date, time_window);
create index if not exists idx_ip_scores_rank on public.ip_scores(rank_overall) where rank_overall is not null;
create index if not exists idx_import_file_rows_batch on public.import_file_rows(import_batch_id);
create index if not exists idx_import_file_rows_org on public.import_file_rows(organization_id);
create index if not exists idx_import_file_rows_provider on public.import_file_rows(source_provider_id);
create index if not exists idx_import_file_rows_valid on public.import_file_rows(is_valid);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subsidiaries enable row level security;
alter table public.ips enable row level security;
alter table public.creators enable row level security;
alter table public.ip_contributors enable row level security;
alter table public.creator_agreements enable row level security;
alter table public.payout_periods enable row level security;
alter table public.payout_ledger_entries enable row level security;
alter table public.franchises enable row level security;
alter table public.works enable row level security;
alter table public.source_providers enable row level security;
alter table public.work_external_ids enable row level security;
alter table public.import_batches enable row level security;
alter table public.raw_observations enable row level security;
alter table public.normalized_observations enable row level security;
alter table public.quality_flags enable row level security;
alter table public.score_components enable row level security;
alter table public.work_scores enable row level security;
alter table public.ip_scores enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.import_file_rows enable row level security;

drop policy if exists "profiles are readable by the signed-in user" on public.profiles;
create policy "profiles are readable by the signed-in user"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles are updatable by the signed-in user" on public.profiles;
create policy "profiles are updatable by the signed-in user"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "orgs readable by members" on public.organizations;
create policy "orgs readable by members"
on public.organizations for select
using (public.is_org_member(id));

drop policy if exists "org members readable by members" on public.organization_members;
create policy "org members readable by members"
on public.organization_members for select
using (public.is_org_member(organization_id));

drop policy if exists "business tables readable by org members" on public.subsidiaries;
create policy "business tables readable by org members"
on public.subsidiaries for select
using (public.is_org_member(organization_id));

drop policy if exists "business tables writable by org admins" on public.subsidiaries;
create policy "business tables writable by org admins"
on public.subsidiaries for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "ips readable by org members" on public.ips;
create policy "ips readable by org members"
on public.ips for select
using (public.is_org_member(organization_id));

drop policy if exists "ips writable by org admins" on public.ips;
create policy "ips writable by org admins"
on public.ips for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "creators readable by org members" on public.creators;
create policy "creators readable by org members"
on public.creators for select
using (public.is_org_member(organization_id));

drop policy if exists "creators writable by org admins" on public.creators;
create policy "creators writable by org admins"
on public.creators for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "agreements readable by org members" on public.creator_agreements;
create policy "agreements readable by org members"
on public.creator_agreements for select
using (public.is_org_member(organization_id));

drop policy if exists "agreements writable by org admins" on public.creator_agreements;
create policy "agreements writable by org admins"
on public.creator_agreements for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "payout periods readable by org members" on public.payout_periods;
create policy "payout periods readable by org members"
on public.payout_periods for select
using (public.is_org_member(organization_id));

drop policy if exists "payout periods writable by org admins" on public.payout_periods;
create policy "payout periods writable by org admins"
on public.payout_periods for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "payout ledger readable by org members" on public.payout_ledger_entries;
create policy "payout ledger readable by org members"
on public.payout_ledger_entries for select
using (
  exists (
    select 1
    from public.payout_periods pp
    where pp.id = payout_ledger_entries.payout_period_id
      and public.is_org_member(pp.organization_id)
  )
);

drop policy if exists "payout ledger writable by org admins" on public.payout_ledger_entries;
create policy "payout ledger writable by org admins"
on public.payout_ledger_entries for all
using (
  exists (
    select 1
    from public.payout_periods pp
    where pp.id = payout_ledger_entries.payout_period_id
      and public.is_org_admin(pp.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.payout_periods pp
    where pp.id = payout_ledger_entries.payout_period_id
      and public.is_org_admin(pp.organization_id)
  )
);

drop policy if exists "franchises readable by org members" on public.franchises;
create policy "franchises readable by org members"
on public.franchises for select
using (public.is_org_member(organization_id));

drop policy if exists "franchises writable by org admins" on public.franchises;
create policy "franchises writable by org admins"
on public.franchises for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "works readable by org members" on public.works;
create policy "works readable by org members"
on public.works for select
using (public.is_org_member(organization_id));

drop policy if exists "works writable by org admins" on public.works;
create policy "works writable by org admins"
on public.works for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "source_providers readable by authenticated" on public.source_providers;
create policy "source_providers readable by authenticated"
on public.source_providers for select
using (auth.uid() is not null);

drop policy if exists "work_external_ids readable by authenticated" on public.work_external_ids;
create policy "work_external_ids readable by authenticated"
on public.work_external_ids for select
using (auth.uid() is not null);

drop policy if exists "import_batches readable by org members" on public.import_batches;
create policy "import_batches readable by org members"
on public.import_batches for select
using (public.is_org_member(organization_id));

drop policy if exists "import_batches writable by org admins" on public.import_batches;
create policy "import_batches writable by org admins"
on public.import_batches for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "raw_observations readable by authenticated" on public.raw_observations;
create policy "raw_observations readable by authenticated"
on public.raw_observations for select
using (auth.uid() is not null);

drop policy if exists "normalized_observations readable" on public.normalized_observations;
create policy "normalized_observations readable"
on public.normalized_observations for select
using (auth.uid() is not null);

drop policy if exists "quality_flags readable" on public.quality_flags;
create policy "quality_flags readable"
on public.quality_flags for select
using (auth.uid() is not null);

drop policy if exists "quality_flags resolvable by authenticated" on public.quality_flags;
create policy "quality_flags resolvable by authenticated"
on public.quality_flags for update
using (auth.uid() is not null);

drop policy if exists "score_components readable" on public.score_components;
create policy "score_components readable"
on public.score_components for select
using (auth.uid() is not null);

drop policy if exists "work_scores readable" on public.work_scores;
create policy "work_scores readable"
on public.work_scores for select
using (auth.uid() is not null);

drop policy if exists "ip_scores readable" on public.ip_scores;
create policy "ip_scores readable"
on public.ip_scores for select
using (auth.uid() is not null);

drop policy if exists "leaderboard_snapshots readable" on public.leaderboard_snapshots;
create policy "leaderboard_snapshots readable"
on public.leaderboard_snapshots for select
using (auth.uid() is not null);

drop policy if exists "import_file_rows readable by org members" on public.import_file_rows;
create policy "import_file_rows readable by org members"
on public.import_file_rows for select
using (public.is_org_member(organization_id));

drop policy if exists "import_file_rows writable by org admins" on public.import_file_rows;
create policy "import_file_rows writable by org admins"
on public.import_file_rows for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- Seed source providers
-- -----------------------------------------------------------------------------
insert into public.source_providers (slug, name, source_family, access_type, confidence_tier) values
  ('kindle-charts',       'Kindle Best Sellers',       'ranking', 'csv', 'silver'),
  ('goodreads',           'Goodreads',                 'reviews', 'csv', 'silver'),
  ('google-play-books',   'Google Play Books',         'ranking', 'csv', 'bronze'),
  ('apple-books',         'Apple Books',               'ranking', 'csv', 'bronze'),
  ('nyt-bestsellers',     'NYT Best Sellers',          'ranking', 'csv', 'gold'),
  ('manga-plus',          'Manga Plus',                'ranking', 'csv', 'silver'),
  ('myanimelist',         'MyAnimeList / Jikan',       'reviews', 'api', 'silver'),
  ('anilist',             'AniList',                   'reviews', 'api', 'silver'),
  ('webtoon',             'Webtoon',                   'ranking', 'csv', 'bronze'),
  ('tapas',               'Tapas',                     'ranking', 'csv', 'bronze'),
  ('globalcomix',         'GlobalComix',               'ranking', 'csv', 'bronze'),
  ('google-trends',       'Google Trends',             'search',  'csv', 'bronze')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Upload helper: validates and stores spreadsheet rows in the staging table.
-- Pass an array of objects derived from CSV or XLSX rows.
-- -----------------------------------------------------------------------------
create or replace function public.stage_import_rows(
  p_organization_id uuid,
  p_source_provider_id uuid,
  p_import_batch_id uuid,
  p_source_file_name text,
  p_source_file_type text,
  p_rows jsonb
)
returns table (
  inserted_count integer,
  invalid_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_count integer := 0;
  v_invalid_count integer := 0;
begin
  if p_source_file_type not in ('csv', 'xlsx') then
    raise exception 'source_file_type must be csv or xlsx';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  with prepared as (
    select
      row_number() over () as row_number,
      value as row_data,
      (
        coalesce(value ? 'source_provider', false)
        and coalesce(value ? 'observed_at', false)
        and coalesce(value ? 'title', false)
        and coalesce(value ? 'ip_name', false)
        and coalesce(value ? 'media_type', false)
        and coalesce(value ? 'region', false)
        and coalesce(value ? 'language', false)
        and coalesce(value ? 'external_id', false)
        and coalesce(value ? 'external_url', false)
      ) as is_valid,
      case
        when (
          coalesce(value ? 'source_provider', false)
          and coalesce(value ? 'observed_at', false)
          and coalesce(value ? 'title', false)
          and coalesce(value ? 'ip_name', false)
          and coalesce(value ? 'media_type', false)
          and coalesce(value ? 'region', false)
          and coalesce(value ? 'language', false)
          and coalesce(value ? 'external_id', false)
          and coalesce(value ? 'external_url', false)
        ) then null
        else jsonb_build_array(
          'Missing one or more required fields: source_provider, observed_at, title, ip_name, media_type, region, language, external_id, external_url'
        )
      end as validation_errors
    from jsonb_array_elements(p_rows)
  ), inserted as (
    insert into public.import_file_rows (
      organization_id,
      source_provider_id,
      import_batch_id,
      source_file_name,
      source_file_type,
      row_number,
      row_data,
      is_valid,
      validation_errors
    )
    select
      p_organization_id,
      p_source_provider_id,
      p_import_batch_id,
      p_source_file_name,
      p_source_file_type,
      prepared.row_number,
      prepared.row_data,
      prepared.is_valid,
      prepared.validation_errors
    from prepared
    on conflict (import_batch_id, row_number) do update
      set row_data = excluded.row_data,
          is_valid = excluded.is_valid,
          validation_errors = excluded.validation_errors,
          source_file_name = excluded.source_file_name,
          source_file_type = excluded.source_file_type
    returning is_valid
  )
  select
    count(*) filter (where is_valid),
    count(*) filter (where not is_valid)
  into v_inserted_count, v_invalid_count
  from inserted;

  return query
  select v_inserted_count, v_invalid_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- View that exposes staged rows in the same shape expected by raw_observations.
-- -----------------------------------------------------------------------------
create or replace view public.v_import_rows_formatted as
select
  ifr.id,
  ifr.organization_id,
  ifr.source_provider_id,
  ifr.import_batch_id,
  ifr.source_file_name,
  ifr.source_file_type,
  ifr.row_number,
  trim(ifr.row_data ->> 'source_provider') as source_provider,
  nullif(trim(ifr.row_data ->> 'observed_at'), '')::timestamptz as observed_at,
  trim(ifr.row_data ->> 'title') as title,
  trim(ifr.row_data ->> 'ip_name') as ip_name,
  trim(ifr.row_data ->> 'media_type') as media_type,
  trim(ifr.row_data ->> 'region') as region,
  trim(ifr.row_data ->> 'language') as language,
  trim(ifr.row_data ->> 'external_id') as external_id,
  trim(ifr.row_data ->> 'external_url') as external_url,
  nullif(trim(ifr.row_data ->> 'rank_value'), '')::int as rank_value,
  nullif(trim(ifr.row_data ->> 'rating_value'), '')::numeric(4, 2) as rating_value,
  nullif(trim(ifr.row_data ->> 'review_count'), '')::int as review_count,
  nullif(trim(ifr.row_data ->> 'view_count'), '')::bigint as view_count,
  nullif(trim(ifr.row_data ->> 'engagement_count'), '')::bigint as engagement_count,
  nullif(trim(ifr.row_data ->> 'sales_value'), '')::numeric(15, 2) as sales_value,
  case
    when lower(coalesce(ifr.row_data ->> 'sales_is_estimated', '')) in ('true', 't', '1', 'yes', 'y') then true
    when lower(coalesce(ifr.row_data ->> 'sales_is_estimated', '')) in ('false', 'f', '0', 'no', 'n') then false
    else null
  end as sales_is_estimated,
  nullif(trim(ifr.row_data ->> 'award_name'), '') as award_name,
  nullif(trim(ifr.row_data ->> 'award_result'), '') as award_result,
  case
    when jsonb_typeof(ifr.row_data -> 'metadata_json') = 'object' then ifr.row_data -> 'metadata_json'
    else '{}'::jsonb
  end as metadata_json,
  nullif(trim(ifr.row_data ->> 'search_interest'), '')::numeric(15, 4) as search_interest,
  ifr.is_valid,
  ifr.validation_errors,
  ifr.created_at
from public.import_file_rows ifr;

commit;
