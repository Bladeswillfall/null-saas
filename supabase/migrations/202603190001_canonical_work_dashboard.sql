create table if not exists public.import_file_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number int not null,
  row_payload jsonb not null default '{}'::jsonb,
  row_hash text,
  created_at timestamptz not null default now(),
  unique (import_batch_id, row_number)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_book_text(input text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(coalesce(input, '')),
            '\m(paperback|hardcover|kindle edition|illustrated edition|audio(cd|book)?|mass market paperback|special edition|collector''s edition|revised edition)\M',
            ' ',
            'gi'
          ),
          '[^a-z0-9\s]',
          ' ',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function public.compute_source_record_fingerprint(
  raw_title text,
  raw_creator text,
  raw_publisher text,
  raw_isbn_10 text,
  raw_isbn_13 text,
  raw_asin text,
  external_id text
)
returns text
language sql
immutable
as $$
  select md5(
    concat_ws(
      '|',
      coalesce(public.normalize_book_text(raw_title), ''),
      coalesce(public.normalize_book_text(raw_creator), ''),
      coalesce(public.normalize_book_text(raw_publisher), ''),
      lower(coalesce(raw_isbn_10, '')),
      lower(coalesce(raw_isbn_13, '')),
      lower(coalesce(raw_asin, '')),
      lower(coalesce(external_id, ''))
    )
  );
$$;

create table if not exists public.source_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete restrict,
  import_batch_id uuid references public.import_batches(id) on delete cascade,
  import_file_row_id uuid references public.import_file_rows(id) on delete set null,
  external_id text,
  external_url text,
  raw_title text not null,
  raw_creator text,
  raw_publisher text,
  raw_series text,
  raw_language text,
  raw_region text,
  raw_isbn_10 text,
  raw_isbn_13 text,
  raw_asin text,
  raw_publication_date text,
  raw_format text,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_title text,
  normalized_creator text,
  normalized_publisher text,
  normalized_series text,
  parsed_publication_date date,
  parsed_rating_value numeric(6,3),
  parsed_review_count int,
  parsed_rank_value int,
  parsed_sales_value numeric(15,2),
  parsed_currency text,
  observed_at timestamptz,
  record_fingerprint text,
  ingestion_status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_source_records_org on public.source_records(organization_id);
create index if not exists idx_source_records_provider on public.source_records(source_provider_id);
create index if not exists idx_source_records_batch on public.source_records(import_batch_id);
create index if not exists idx_source_records_asin on public.source_records(raw_asin);
create index if not exists idx_source_records_isbn10 on public.source_records(raw_isbn_10);
create index if not exists idx_source_records_isbn13 on public.source_records(raw_isbn_13);
create index if not exists idx_source_records_norm_title on public.source_records(normalized_title);
create index if not exists idx_source_records_norm_creator on public.source_records(normalized_creator);
create index if not exists idx_source_records_fingerprint on public.source_records(record_fingerprint);

create table if not exists public.source_record_matches (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references public.source_records(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  match_method text not null,
  match_score numeric(6,4) not null default 0,
  match_type public.match_type_enum not null default 'probable',
  matched_on jsonb not null default '{}'::jsonb,
  is_selected boolean not null default false,
  selected_by uuid references public.profiles(id) on delete set null,
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_record_id, work_id)
);
create index if not exists idx_source_record_matches_source on public.source_record_matches(source_record_id);
create index if not exists idx_source_record_matches_work on public.source_record_matches(work_id);
create unique index if not exists idx_source_record_matches_selected_one
  on public.source_record_matches(source_record_id)
  where is_selected = true;

create table if not exists public.work_source_summaries (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  source_provider_id uuid not null references public.source_providers(id) on delete cascade,
  source_record_id uuid references public.source_records(id) on delete set null,
  external_id text,
  external_url text,
  display_title text,
  display_creator text,
  display_publisher text,
  isbn_10 text,
  isbn_13 text,
  asin text,
  rank_value int,
  rating_value numeric(6,3),
  review_count int,
  sales_value numeric(15,2),
  observed_at timestamptz,
  freshness_bucket text,
  variance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_work_source_summaries_external_unique
  on public.work_source_summaries(work_id, source_provider_id, external_id)
  where external_id is not null;
create index if not exists idx_work_source_summaries_work on public.work_source_summaries(work_id);
create index if not exists idx_work_source_summaries_provider on public.work_source_summaries(source_provider_id);

create table if not exists public.work_aggregate_summaries (
  work_id uuid primary key references public.works(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  canonical_title text not null,
  canonical_creator text,
  canonical_publisher text,
  canonical_isbn_10 text,
  canonical_isbn_13 text,
  canonical_asin text,
  aggregate_display_rating numeric(6,3),
  composite_score numeric(10,4) not null default 0,
  movement_value int,
  source_coverage_count int not null default 0,
  freshest_observed_at timestamptz,
  confidence_score numeric(5,4),
  disagreement_score numeric(5,4),
  freshness_score numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_work_aggregate_summaries_org on public.work_aggregate_summaries(organization_id);
create index if not exists idx_work_aggregate_summaries_score on public.work_aggregate_summaries(composite_score desc);

create table if not exists public.work_aggregate_summary_history (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  composite_score numeric(10,4) not null,
  aggregate_display_rating numeric(6,3),
  source_coverage_count int not null default 0,
  captured_at timestamptz not null default now()
);
create index if not exists idx_work_aggregate_summary_history_work on public.work_aggregate_summary_history(work_id, captured_at desc);

create trigger set_source_records_updated_at before update on public.source_records
for each row execute function public.set_updated_at();
create trigger set_work_source_summaries_updated_at before update on public.work_source_summaries
for each row execute function public.set_updated_at();
create trigger set_work_aggregate_summaries_updated_at before update on public.work_aggregate_summaries
for each row execute function public.set_updated_at();

alter table public.import_file_rows enable row level security;
alter table public.source_records enable row level security;
alter table public.source_record_matches enable row level security;
alter table public.work_source_summaries enable row level security;
alter table public.work_aggregate_summaries enable row level security;
alter table public.work_aggregate_summary_history enable row level security;

create policy "import_file_rows_select" on public.import_file_rows for select
using (exists (select 1 from public.import_batches ib where ib.id = import_file_rows.import_batch_id and public.is_org_member(ib.organization_id)));
create policy "import_file_rows_insert" on public.import_file_rows for insert
with check (exists (select 1 from public.import_batches ib join public.organization_members om on om.organization_id = ib.organization_id and om.user_id = auth.uid() where ib.id = import_file_rows.import_batch_id and om.role in ('admin','owner')));
create policy "import_file_rows_update" on public.import_file_rows for update
using (exists (select 1 from public.import_batches ib where ib.id = import_file_rows.import_batch_id and public.is_org_member(ib.organization_id)))
with check (exists (select 1 from public.import_batches ib join public.organization_members om on om.organization_id = ib.organization_id and om.user_id = auth.uid() where ib.id = import_file_rows.import_batch_id and om.role in ('admin','owner')));

create policy "source_records_select" on public.source_records for select
using (public.is_org_member(organization_id));
create policy "source_records_insert" on public.source_records for insert
with check (exists (select 1 from public.organization_members om where om.organization_id = source_records.organization_id and om.user_id = auth.uid() and om.role in ('admin','owner')));
create policy "source_records_update" on public.source_records for update
using (public.is_org_member(organization_id))
with check (exists (select 1 from public.organization_members om where om.organization_id = source_records.organization_id and om.user_id = auth.uid() and om.role in ('admin','owner')));

create policy "source_record_matches_select" on public.source_record_matches for select
using (exists (select 1 from public.source_records sr where sr.id = source_record_matches.source_record_id and public.is_org_member(sr.organization_id)));
create policy "source_record_matches_insert" on public.source_record_matches for insert
with check (exists (select 1 from public.source_records sr join public.organization_members om on om.organization_id = sr.organization_id and om.user_id = auth.uid() where sr.id = source_record_matches.source_record_id and om.role in ('admin','owner')));
create policy "source_record_matches_update" on public.source_record_matches for update
using (exists (select 1 from public.source_records sr where sr.id = source_record_matches.source_record_id and public.is_org_member(sr.organization_id)))
with check (exists (select 1 from public.source_records sr join public.organization_members om on om.organization_id = sr.organization_id and om.user_id = auth.uid() where sr.id = source_record_matches.source_record_id and om.role in ('admin','owner')));

create policy "work_source_summaries_select" on public.work_source_summaries for select
using (exists (select 1 from public.works w where w.id = work_source_summaries.work_id and public.is_org_member(w.organization_id)));
create policy "work_source_summaries_insert" on public.work_source_summaries for insert
with check (exists (select 1 from public.works w join public.organization_members om on om.organization_id = w.organization_id and om.user_id = auth.uid() where w.id = work_source_summaries.work_id and om.role in ('admin','owner')));
create policy "work_source_summaries_update" on public.work_source_summaries for update
using (exists (select 1 from public.works w where w.id = work_source_summaries.work_id and public.is_org_member(w.organization_id)))
with check (exists (select 1 from public.works w join public.organization_members om on om.organization_id = w.organization_id and om.user_id = auth.uid() where w.id = work_source_summaries.work_id and om.role in ('admin','owner')));

create policy "work_aggregate_summaries_select" on public.work_aggregate_summaries for select
using (public.is_org_member(organization_id));
create policy "work_aggregate_summaries_insert" on public.work_aggregate_summaries for insert
with check (exists (select 1 from public.organization_members om where om.organization_id = work_aggregate_summaries.organization_id and om.user_id = auth.uid() and om.role in ('admin','owner')));
create policy "work_aggregate_summaries_update" on public.work_aggregate_summaries for update
using (public.is_org_member(organization_id))
with check (exists (select 1 from public.organization_members om where om.organization_id = work_aggregate_summaries.organization_id and om.user_id = auth.uid() and om.role in ('admin','owner')));

create policy "work_aggregate_summary_history_select" on public.work_aggregate_summary_history for select
using (exists (select 1 from public.works w where w.id = work_aggregate_summary_history.work_id and public.is_org_member(w.organization_id)));
create policy "work_aggregate_summary_history_insert" on public.work_aggregate_summary_history for insert
with check (exists (select 1 from public.works w join public.organization_members om on om.organization_id = w.organization_id and om.user_id = auth.uid() where w.id = work_aggregate_summary_history.work_id and om.role in ('admin','owner')));
