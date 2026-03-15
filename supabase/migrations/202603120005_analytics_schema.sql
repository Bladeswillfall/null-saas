-- =============================================================================
-- Chunk 2: Analytics Schema
-- Adds catalog, source, ingestion, QC, scoring, and leaderboard tables.
-- Existing ops tables (ips, subsidiaries, creators, etc.) are left intact.
-- The analytics IP/franchise concept lives in `franchises` to avoid collision.
-- =============================================================================

-- -----------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------
create type public.media_type_enum as enum (
  'book', 'manga', 'manhwa', 'manhua', 'web_comic', 'comic'
);

create type public.source_family_enum as enum (
  'ranking', 'reviews', 'awards', 'search', 'social',
  'sales_estimated', 'sales_direct', 'metadata'
);

create type public.access_type_enum as enum ('csv', 'api', 'scrape', 'manual');

create type public.confidence_tier_enum as enum ('gold', 'silver', 'bronze', 'community');

create type public.match_type_enum as enum ('exact', 'probable', 'manual');

create type public.import_status_enum as enum (
  'pending', 'processing', 'complete', 'failed', 'partial'
);

create type public.provenance_tag_enum as enum (
  'direct', 'estimated', 'engagement', 'awards', 'metadata'
);

create type public.flag_type_enum as enum (
  'duplicate', 'outlier', 'missing_id', 'suspect_spike', 'low_sample', 'manual_review'
);

create type public.flag_severity_enum as enum ('info', 'warning', 'critical');

create type public.time_window_enum as enum (
  'all_time', '5y', '1y', '6m', '3m', '1m', '2w', '1w'
);

create type public.scope_type_enum as enum ('global', 'category', 'ip');

-- -----------------------------------------------------------------------
-- CATALOG: franchises (analytics IP/franchise umbrella)
-- -----------------------------------------------------------------------
create table public.franchises (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  slug            text not null,
  description     text,
  primary_category public.media_type_enum,
  status          text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

-- -----------------------------------------------------------------------
-- CATALOG: works (individual rankable titles)
-- -----------------------------------------------------------------------
create table public.works (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  franchise_id    uuid references public.franchises(id) on delete set null,
  title           text not null,
  canonical_title text,
  media_type      public.media_type_enum not null,
  series_name     text,
  volume_number   int,
  release_date    date,
  language        text,
  region          text,
  publisher       text,
  status          text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- SOURCE REGISTRY: source_providers
-- -----------------------------------------------------------------------
create table public.source_providers (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  source_family   public.source_family_enum not null,
  access_type     public.access_type_enum not null default 'csv',
  confidence_tier public.confidence_tier_enum not null default 'bronze',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- SOURCE REGISTRY: work_external_ids
-- -----------------------------------------------------------------------
create table public.work_external_ids (
  id                 uuid primary key default gen_random_uuid(),
  work_id            uuid not null references public.works(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete cascade,
  external_id        text not null,
  external_url       text,
  match_type         public.match_type_enum not null default 'manual',
  created_at         timestamptz not null default now(),
  unique (source_provider_id, external_id)
);

-- -----------------------------------------------------------------------
-- INGESTION: import_batches
-- -----------------------------------------------------------------------
create table public.import_batches (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete restrict,
  import_type        text not null default 'csv',
  uploaded_by        uuid references public.profiles(id) on delete set null,
  status             public.import_status_enum not null default 'pending',
  row_count          int not null default 0,
  error_count        int not null default 0,
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- INGESTION: raw_observations (verbatim from CSV — never modified)
-- -----------------------------------------------------------------------
create table public.raw_observations (
  id                   uuid primary key default gen_random_uuid(),
  import_batch_id      uuid not null references public.import_batches(id) on delete cascade,
  source_provider_id   uuid not null references public.source_providers(id) on delete restrict,
  raw_work_title       text,
  raw_ip_name          text,
  raw_author_or_creator text,
  raw_category         text,
  raw_region           text,
  raw_language         text,
  observed_at          timestamptz not null,
  rank_value           int,
  rating_value         numeric(4,2),
  review_count         int,
  view_count           bigint,
  engagement_count     bigint,
  sales_value          numeric(15,2),
  sales_is_estimated   boolean,
  awards_value         text,
  metadata_json        jsonb,
  created_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- NORMALIZATION: normalized_observations
-- -----------------------------------------------------------------------
create table public.normalized_observations (
  id                 uuid primary key default gen_random_uuid(),
  raw_observation_id uuid not null references public.raw_observations(id) on delete cascade,
  work_id            uuid not null references public.works(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete restrict,
  observed_at        timestamptz not null,
  metric_type        text not null,
  metric_value       numeric(20,6) not null,
  metric_unit        text,
  window_hint        text,
  confidence_score   numeric(5,4) check (confidence_score >= 0 and confidence_score <= 1),
  provenance_tag     public.provenance_tag_enum not null,
  created_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- QC: quality_flags
-- -----------------------------------------------------------------------
create table public.quality_flags (
  id                 uuid primary key default gen_random_uuid(),
  raw_observation_id uuid references public.raw_observations(id) on delete cascade,
  work_id            uuid references public.works(id) on delete cascade,
  flag_type          public.flag_type_enum not null,
  severity           public.flag_severity_enum not null default 'warning',
  notes              text,
  resolved_at        timestamptz,
  resolved_by        uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- SCORING: score_components (per work, per window, per signal family)
-- -----------------------------------------------------------------------
create table public.score_components (
  id                  uuid primary key default gen_random_uuid(),
  work_id             uuid not null references public.works(id) on delete cascade,
  score_date          date not null,
  time_window         public.time_window_enum not null,
  component_type      text not null check (component_type in ('ranking','reviews','momentum','awards','sales')),
  component_score     numeric(10,6) not null,
  weight_used         numeric(5,4),
  provenance_summary  text,
  created_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- SCORING: work_scores (composite per work per window)
-- -----------------------------------------------------------------------
create table public.work_scores (
  id               uuid primary key default gen_random_uuid(),
  work_id          uuid not null references public.works(id) on delete cascade,
  score_date       date not null,
  time_window      public.time_window_enum not null,
  composite_score  numeric(10,6) not null default 0,
  momentum_score   numeric(10,6),
  confidence_score numeric(5,4) check (confidence_score >= 0 and confidence_score <= 1),
  rank_overall     int,
  rank_in_category int,
  rank_delta       int,
  created_at       timestamptz not null default now(),
  unique (work_id, score_date, time_window)
);

-- -----------------------------------------------------------------------
-- SCORING: ip_scores (rolled up per franchise per window)
-- -----------------------------------------------------------------------
create table public.ip_scores (
  id               uuid primary key default gen_random_uuid(),
  franchise_id     uuid not null references public.franchises(id) on delete cascade,
  score_date       date not null,
  time_window      public.time_window_enum not null,
  composite_score  numeric(10,6) not null default 0,
  momentum_score   numeric(10,6),
  confidence_score numeric(5,4) check (confidence_score >= 0 and confidence_score <= 1),
  rank_overall     int,
  rank_delta       int,
  active_work_count int not null default 0,
  created_at       timestamptz not null default now(),
  unique (franchise_id, score_date, time_window)
);

-- -----------------------------------------------------------------------
-- SCORING: leaderboard_snapshots (cached snapshot metadata)
-- -----------------------------------------------------------------------
create table public.leaderboard_snapshots (
  id            uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  time_window   public.time_window_enum not null,
  scope_type    public.scope_type_enum not null,
  scope_value   text not null default '',
  generated_at  timestamptz not null default now()
);

create unique index idx_leaderboard_snapshots_unique
  on public.leaderboard_snapshots(snapshot_date, time_window, scope_type, scope_value);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- franchises
create index idx_franchises_org on public.franchises(organization_id);
create index idx_franchises_status on public.franchises(status);

-- works
create index idx_works_org on public.works(organization_id);
create index idx_works_franchise on public.works(franchise_id);
create index idx_works_media_type on public.works(media_type);
create index idx_works_status on public.works(status);

-- import_batches
create index idx_import_batches_org on public.import_batches(organization_id);
create index idx_import_batches_status on public.import_batches(status);
create index idx_import_batches_provider on public.import_batches(source_provider_id);

-- raw_observations
create index idx_raw_obs_batch on public.raw_observations(import_batch_id);
create index idx_raw_obs_provider on public.raw_observations(source_provider_id);
create index idx_raw_obs_observed_at on public.raw_observations(observed_at);

-- normalized_observations
create index idx_norm_obs_work on public.normalized_observations(work_id);
create index idx_norm_obs_observed_at on public.normalized_observations(observed_at);
create index idx_norm_obs_metric_type on public.normalized_observations(metric_type);
create index idx_norm_obs_provenance on public.normalized_observations(provenance_tag);

-- quality_flags
create index idx_qflags_work on public.quality_flags(work_id);
create index idx_qflags_severity on public.quality_flags(severity);
create index idx_qflags_unresolved on public.quality_flags(resolved_at) where resolved_at is null;

-- score_components
create index idx_score_components_work_date on public.score_components(work_id, score_date);
create index idx_score_components_window on public.score_components(time_window);

-- work_scores
create index idx_work_scores_date_window on public.work_scores(score_date, time_window);
create index idx_work_scores_rank on public.work_scores(rank_overall) where rank_overall is not null;

-- ip_scores
create index idx_ip_scores_date_window on public.ip_scores(score_date, time_window);
create index idx_ip_scores_rank on public.ip_scores(rank_overall) where rank_overall is not null;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.franchises           enable row level security;
alter table public.works                enable row level security;
alter table public.source_providers     enable row level security;
alter table public.work_external_ids    enable row level security;
alter table public.import_batches       enable row level security;
alter table public.raw_observations     enable row level security;
alter table public.normalized_observations enable row level security;
alter table public.quality_flags        enable row level security;
alter table public.score_components     enable row level security;
alter table public.work_scores          enable row level security;
alter table public.ip_scores            enable row level security;
alter table public.leaderboard_snapshots enable row level security;

-- Helper: is current user a member of an org?
-- (reuses the is_org_admin function already defined in payout_hardening migration)

-- franchises: org members can read; org admins can write
create policy "franchises readable by org members"
  on public.franchises for select
  using (exists (
    select 1 from public.organization_members om
    where om.organization_id = franchises.organization_id and om.user_id = auth.uid()
  ));
create policy "franchises writable by org admins"
  on public.franchises for all
  using (public.is_org_admin(organization_id));

-- works: same pattern
create policy "works readable by org members"
  on public.works for select
  using (exists (
    select 1 from public.organization_members om
    where om.organization_id = works.organization_id and om.user_id = auth.uid()
  ));
create policy "works writable by org admins"
  on public.works for all
  using (public.is_org_admin(organization_id));

-- source_providers: readable by any authenticated user (shared registry)
create policy "source_providers readable by authenticated"
  on public.source_providers for select
  using (auth.uid() is not null);

-- work_external_ids: readable by org members via work join
create policy "work_external_ids readable by authenticated"
  on public.work_external_ids for select
  using (auth.uid() is not null);

-- import_batches: org-scoped
create policy "import_batches readable by org members"
  on public.import_batches for select
  using (exists (
    select 1 from public.organization_members om
    where om.organization_id = import_batches.organization_id and om.user_id = auth.uid()
  ));
create policy "import_batches writable by org admins"
  on public.import_batches for all
  using (public.is_org_admin(organization_id));

-- raw_observations: via import batch org membership
create policy "raw_observations readable by authenticated"
  on public.raw_observations for select
  using (auth.uid() is not null);

-- normalized_observations, quality_flags, score_components, work_scores, ip_scores, leaderboard_snapshots
-- are read-only for authenticated users (written by server-side jobs only)
create policy "normalized_observations readable"
  on public.normalized_observations for select using (auth.uid() is not null);

create policy "quality_flags readable"
  on public.quality_flags for select using (auth.uid() is not null);
create policy "quality_flags resolvable by authenticated"
  on public.quality_flags for update using (auth.uid() is not null);

create policy "score_components readable"
  on public.score_components for select using (auth.uid() is not null);

create policy "work_scores readable"
  on public.work_scores for select using (auth.uid() is not null);

create policy "ip_scores readable"
  on public.ip_scores for select using (auth.uid() is not null);

create policy "leaderboard_snapshots readable"
  on public.leaderboard_snapshots for select using (auth.uid() is not null);

-- =============================================================================
-- SEED: V1 source providers
-- =============================================================================
insert into public.source_providers (slug, name, source_family, access_type, confidence_tier) values
  ('kindle-charts',       'Kindle Best Sellers',       'ranking',          'csv',    'silver'),
  ('goodreads',           'Goodreads',                 'reviews',          'csv',    'silver'),
  ('google-play-books',   'Google Play Books',         'ranking',          'csv',    'bronze'),
  ('apple-books',         'Apple Books',               'ranking',          'csv',    'bronze'),
  ('nyt-bestsellers',     'NYT Best Sellers',          'ranking',          'csv',    'gold'),
  ('manga-plus',          'Manga Plus',                'ranking',          'csv',    'silver'),
  ('myanimelist',         'MyAnimeList / Jikan',       'reviews',          'api',    'silver'),
  ('anilist',             'AniList',                   'reviews',          'api',    'silver'),
  ('webtoon',             'Webtoon',                   'ranking',          'csv',    'bronze'),
  ('tapas',               'Tapas',                     'ranking',          'csv',    'bronze'),
  ('globalcomix',         'GlobalComix',               'ranking',          'csv',    'bronze'),
  ('google-trends',       'Google Trends',             'search',           'csv',    'bronze')
on conflict (slug) do nothing;
