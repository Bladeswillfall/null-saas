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
