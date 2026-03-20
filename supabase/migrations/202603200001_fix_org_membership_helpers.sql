create or replace function public.is_org_member(lookup_org_id uuid)
returns boolean
language sql
security definer
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
security definer
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
