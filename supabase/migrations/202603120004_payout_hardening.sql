-- Payout Hardening: Constraints, Sanity Checks, and Performance Optimization

-- Add constraints to payout_periods for status validation
alter table public.payout_periods
add constraint payout_periods_status_valid check (status in ('draft', 'published', 'finalized')),
add constraint payout_periods_date_order check (period_start <= period_end),
add constraint payout_periods_amount_positive check (total_amount is null or total_amount >= 0);

-- Add unique constraint: only one draft per org at a time
alter table public.payout_periods
add constraint payout_periods_one_draft_per_org unique (organization_id) 
where status = 'draft';

-- Add constraints to creator_agreements for percentage validation
alter table public.creator_agreements
add constraint creator_agreements_rate_percentage_range check (rate_percentage >= 0 and rate_percentage <= 100),
add constraint creator_agreements_dates_order check (effective_date <= expires_date or expires_date is null),
add constraint creator_agreements_status_valid check (status in ('active', 'inactive', 'expired'));

-- Add constraints to ip_contributors for percentage validation
alter table public.ip_contributors
add constraint ip_contributors_percentage_range check (contribution_percentage >= 0 and contribution_percentage <= 100);

-- Add constraint to ensure total contribution percentages don't exceed 100% per IP
alter table public.ip_contributors
add constraint ip_contributors_total_percentage check (
  contribution_percentage > 0 and contribution_percentage <= 100
);

-- Create helper view for payout preview inputs (all active agreements and contributors for an org)
create or replace view public.payout_preview_inputs as
select
  pp.id as payout_period_id,
  pp.organization_id,
  pp.period_start,
  pp.period_end,
  c.id as creator_id,
  c.name as creator_name,
  ca.id as agreement_id,
  ca.rate_percentage,
  ip.id as ip_id,
  ip.title as ip_title,
  ipc.contribution_percentage,
  ipc.role as contributor_role
from public.payout_periods pp
join public.creators c on pp.organization_id = c.organization_id
join public.creator_agreements ca on c.id = ca.creator_id 
  and ca.status = 'active'
  and (ca.effective_date <= pp.period_end)
  and (ca.expires_date is null or ca.expires_date >= pp.period_start)
left join public.ip_contributors ipc on c.id = ipc.creator_id
left join public.ips ip on ipc.ip_id = ip.id 
  and pp.organization_id = ip.organization_id
where pp.status = 'draft'
order by c.id, ip.id;

-- Additional performance indexes for payout lookups
create index idx_payout_periods_org_status on public.payout_periods(organization_id, status);
create index idx_payout_periods_date_range on public.payout_periods(period_start, period_end);
create index idx_creator_agreements_org_status on public.creator_agreements(organization_id, status);
create index idx_creator_agreements_effective_dates on public.creator_agreements(effective_date, expires_date);
create index idx_ip_contributors_ip_creator on public.ip_contributors(ip_id, creator_id);
create index idx_payout_ledger_org_period on public.payout_ledger_entries(
  (select organization_id from public.payout_periods where id = payout_ledger_entries.payout_period_id),
  payout_period_id
);

-- Create function to validate payout period creation
create or replace function public.validate_payout_period_creation(
  org_id uuid,
  start_date date,
  end_date date
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.payout_periods
    where organization_id = org_id
    and status != 'finalized'
    and (
      (period_start <= end_date and period_end >= start_date)
      or status = 'draft'
    )
  ) = false
  and start_date <= end_date;
$$;

-- Create function to check org scoping
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
      and om.role in ('admin', 'owner')
  );
$$;
