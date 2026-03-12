-- RLS Policies for Subsidiaries
create policy "subsidiaries_select" on public.subsidiaries for select
using (public.is_org_member(organization_id));

create policy "subsidiaries_insert" on public.subsidiaries for insert
with check (
  public.is_org_member(organization_id) and
  (select role from public.organization_members 
   where organization_id = public.subsidiaries.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

create policy "subsidiaries_update" on public.subsidiaries for update
using (public.is_org_member(organization_id))
with check (
  (select role from public.organization_members 
   where organization_id = public.subsidiaries.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

create policy "subsidiaries_delete" on public.subsidiaries for delete
using (
  (select role from public.organization_members 
   where organization_id = public.subsidiaries.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

-- RLS Policies for IPs
create policy "ips_select" on public.ips for select
using (public.is_org_member(organization_id));

create policy "ips_insert" on public.ips for insert
with check (
  public.is_org_member(organization_id) and
  (select role from public.organization_members 
   where organization_id = public.ips.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

create policy "ips_update" on public.ips for update
using (public.is_org_member(organization_id))
with check (
  (select role from public.organization_members 
   where organization_id = public.ips.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

create policy "ips_delete" on public.ips for delete
using (
  (select role from public.organization_members 
   where organization_id = public.ips.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

-- RLS Policies for Creators
create policy "creators_select" on public.creators for select
using (public.is_org_member(organization_id));

create policy "creators_insert" on public.creators for insert
with check (
  public.is_org_member(organization_id) and
  (select role from public.organization_members 
   where organization_id = public.creators.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner', 'member')
);

create policy "creators_update" on public.creators for update
using (public.is_org_member(organization_id))
with check (
  (select role from public.organization_members 
   where organization_id = public.creators.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

-- RLS Policies for IP Contributors (read-accessible to org members)
create policy "ip_contributors_select" on public.ip_contributors for select
using (
  exists (
    select 1 from public.ips
    where ips.id = ip_contributors.ip_id
    and public.is_org_member(ips.organization_id)
  )
);

create policy "ip_contributors_insert" on public.ip_contributors for insert
with check (
  exists (
    select 1 from public.ips
    where ips.id = ip_contributors.ip_id
    and public.is_org_member(ips.organization_id)
    and (select role from public.organization_members 
         where organization_id = ips.organization_id 
         and user_id = auth.uid()) in ('admin', 'owner')
  )
);

-- RLS Policies for Creator Agreements
create policy "creator_agreements_select" on public.creator_agreements for select
using (public.is_org_member(organization_id));

create policy "creator_agreements_insert" on public.creator_agreements for insert
with check (
  public.is_org_member(organization_id) and
  (select role from public.organization_members 
   where organization_id = public.creator_agreements.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

create policy "creator_agreements_update" on public.creator_agreements for update
using (public.is_org_member(organization_id))
with check (
  (select role from public.organization_members 
   where organization_id = public.creator_agreements.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

-- RLS Policies for Payout Periods
create policy "payout_periods_select" on public.payout_periods for select
using (public.is_org_member(organization_id));

create policy "payout_periods_insert" on public.payout_periods for insert
with check (
  public.is_org_member(organization_id) and
  (select role from public.organization_members 
   where organization_id = public.payout_periods.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

create policy "payout_periods_update" on public.payout_periods for update
using (public.is_org_member(organization_id))
with check (
  (select role from public.organization_members 
   where organization_id = public.payout_periods.organization_id 
   and user_id = auth.uid()) in ('admin', 'owner')
);

-- RLS Policies for Payout Ledger (read-only for org members)
create policy "payout_ledger_select" on public.payout_ledger_entries for select
using (
  exists (
    select 1 from public.payout_periods
    where payout_periods.id = payout_ledger_entries.payout_period_id
    and public.is_org_member(payout_periods.organization_id)
  )
);

create policy "payout_ledger_insert" on public.payout_ledger_entries for insert
with check (
  exists (
    select 1 from public.payout_periods
    where payout_periods.id = payout_ledger_entries.payout_period_id
    and public.is_org_member(payout_periods.organization_id)
    and (select role from public.organization_members 
         where organization_id = payout_periods.organization_id 
         and user_id = auth.uid()) in ('admin', 'owner')
  )
);
