# Dashboard imports V1

The dashboard import flow lives at `/dashboard/imports`.

## What V1 supports

- Upload provider CSV files from the dashboard UI.
- Supported provider mappings:
  - `goodreads`
  - `kindle-charts` / Amazon books style CSV exports
- Direct `.xlsx` parsing is **not** supported yet.
- Goodreads `.xlsx` exports should be converted to `.csv` before upload.

## Upload flow

1. Open `/dashboard/imports` while signed in.
2. Choose a provider.
3. Select a `.csv` file.
4. Submit the form.
5. The app:
   - validates auth and organization membership,
   - verifies the provider in `public.source_providers`,
   - parses the CSV,
   - creates a row in `public.import_batches`,
   - maps rows into the staging contract,
   - calls `public.stage_import_rows(...)`,
   - materializes source records and auto-match candidates,
   - runs QC / normalization checks,
   - auto-publishes clean batches or marks the batch for manual confirmation,
   - updates the batch status to `complete`, `partial`, or `failed`.

## Tables and functions involved

- `public.source_providers`
- `public.import_batches`
- `public.import_file_rows`
- `public.stage_import_rows(...)`
- `public.v_import_rows_formatted`

## Row-mapping assumptions in V1

### Goodreads

Best-effort header mapping includes:

- `Title` -> `title`
- `Authors` -> `metadata_json.authors`
- `First Published` / `First_published` -> `metadata_json.first_published`
- `Rating` -> `rating_value`
- `Ratings` -> `review_count`
- `Reviews` -> `metadata_json.reviews_count`
- `Genres` -> `metadata_json.genres`
- `ASIN` -> `external_id`

Defaults:

- `ip_name` falls back to `title`
- `media_type` defaults to `book`
- `region` defaults to `unknown`
- `language` defaults to `en`

### Amazon / Kindle charts

Best-effort header mapping includes:

- `title` -> `title`
- `author_primary` -> `metadata_json.author_primary`
- `publisher` -> `metadata_json.publisher`
- `publication_date` -> `metadata_json.publication_date`
- `rating_avg_text` -> `rating_value`
- `ratings_count_text` -> `review_count`
- `bestseller_rank_raw` -> `rank_value` when parseable
- `ISBN_10` -> `metadata_json.isbn_10`
- `ISBN_13` -> `metadata_json.isbn_13`
- `ASIN` -> `external_id`

Defaults:

- `ip_name` falls back to `title`
- `media_type` defaults to `book`
- `language` defaults to `en`
- `region` defaults to `UK` when the provider looks UK-specific, otherwise `US`

## What to do after upload

1. Check the batch auto-review status on `/dashboard/imports`.
2. If the batch is flagged, review unresolved source rows in `/dashboard/leaderboard`.
3. Confirm publish once the staged data looks correct.

## Recommended next follow-up

- Add a dedicated unmatched-row review UI.
- Add first-class row editing on the imports page before final publish.
- Add app-layer XLSX parsing before the staging call.
