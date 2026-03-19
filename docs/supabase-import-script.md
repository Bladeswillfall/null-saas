# Supabase import bootstrap script

Use `supabase/manual/20260319_supabase_import_bootstrap.sql` in the Supabase SQL editor when you want one script that:

1. Creates the core org/auth tables.
2. Creates the business catalog tables.
3. Creates the analytics/import tables used by CSV uploads.
4. Adds a staging table and helper RPC for spreadsheet-derived rows.

## Important note about `.xlsx`

Supabase SQL cannot parse Excel workbooks directly. The recommended flow is:

1. Upload `.xlsx` or `.csv` in your app/admin tool.
2. If the file is `.xlsx`, convert it to row JSON or CSV in the app layer.
3. Call `public.stage_import_rows(...)` with a JSON array of rows.
4. Read the normalized shape from `public.v_import_rows_formatted`.
5. Promote valid rows into `public.raw_observations` from your server logic.

## Required row fields

Each row object should include these keys:

- `source_provider`
- `observed_at`
- `title`
- `ip_name`
- `media_type`
- `region`
- `language`
- `external_id`
- `external_url`

Optional keys match the app's CSV upload contract:

- `rank_value`
- `rating_value`
- `review_count`
- `view_count`
- `engagement_count`
- `sales_value`
- `sales_is_estimated`
- `award_name`
- `award_result`
- `metadata_json`
- `search_interest`

## Example RPC call

```sql
select *
from public.stage_import_rows(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'goodreads-weekly.xlsx',
  'xlsx',
  jsonb_build_array(
    jsonb_build_object(
      'source_provider', 'goodreads',
      'observed_at', '2026-03-19T00:00:00Z',
      'title', 'Example Title',
      'ip_name', 'Example IP',
      'media_type', 'book',
      'region', 'US',
      'language', 'en',
      'external_id', 'gr-123',
      'external_url', 'https://example.com/title/gr-123',
      'rating_value', '4.7',
      'review_count', '1520'
    )
  )
);
```

Then inspect formatted rows:

```sql
select *
from public.v_import_rows_formatted
where import_batch_id = '00000000-0000-0000-0000-000000000003';
```
