alter table public.import_batches
  add column if not exists auto_review_status text not null default 'pending',
  add column if not exists auto_review_summary jsonb not null default '{}'::jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.import_batches
  drop constraint if exists import_batches_auto_review_status_check;

alter table public.import_batches
  add constraint import_batches_auto_review_status_check
  check (auto_review_status in ('pending', 'ready', 'needs_manual_review', 'published'));
