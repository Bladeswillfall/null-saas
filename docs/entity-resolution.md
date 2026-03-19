# Entity resolution and canonical work dashboard

## Overview

The ranking dashboard now treats **canonical works** as parent entities and **source records** as child evidence rows.

- `works` remains the canonical catalog entity.
- `source_records` stores durable imported provider rows.
- `source_record_matches` stores auditable candidate links between imported evidence and canonical works.
- `work_source_summaries` stores the selected child evidence rows shown under each expanded parent row.
- `work_aggregate_summaries` stores the parent-row query surface used by the dashboard.

## Matching model

Matching runs in deterministic-first tiers:

1. **Exact identifier matching**
   - ASIN
   - ISBN-13
   - ISBN-10
2. **Probable bibliographic matching**
   - normalized title
   - normalized creator
   - optional publisher/year reinforcement
3. **Manual review**
   - unresolved records stay in `source_record_matches` / `source_records`
   - admins can select a candidate or create a new canonical work

`match_type_enum` values:

- `exact`
- `probable`
- `manual`

The selected candidate is persisted with `is_selected = true`, `selected_by`, and `selected_at`.

## Aggregate metrics

Parent rows intentionally separate aggregate metrics from source-specific metrics.

### Aggregate display rating

This is **not** a naive average.

It uses a weighted average of child ratings:

- weight by `review_count` when present
- otherwise use a default fallback weight
- cap over-dominant sources so one giant platform cannot totally flatten smaller corroborating sources

### Composite score

Current bounded formula:

- 45% normalized aggregate rating
- 25% normalized best-rank signal
- 20% review volume signal
- 10% freshness signal

The implementation is explicit in shared domain code so the formula can evolve later without changing the UI contract.

### Confidence score

Confidence rises when:

- selected matches are exact identifier matches
- multiple sources corroborate the same work

Confidence is lower for probable/manual matches.

### Disagreement score

Disagreement reflects spread across child ratings/ranks so cross-platform variance is visible instead of hidden.

### Movement

Movement uses the prior `work_aggregate_summaries` value recorded into `work_aggregate_summary_history` before a refresh rebuild updates the current parent row.

## Local workflows

### Apply migrations

```bash
supabase migration up
```

### Import and rebuild

1. Upload a provider CSV from the imports screen.
2. The upload flow stores `raw_observations` and also materializes `source_records`.
3. Matching runs and candidate rows are written to `source_record_matches`.
4. Selected matches refresh `work_source_summaries` and `work_aggregate_summaries`.

### Manual review

Use the `workDashboard.reviewQueue` procedure to list unresolved source rows, then:

- `workDashboard.selectMatch`
- `workDashboard.createWorkFromSourceRecord`

### Rebuild utilities

- `workDashboard.rebuildBatch`
- internal work-level summary refresh during match selection/update

## Migration source of truth

This feature is defined in:

- `supabase/migrations/202603190001_canonical_work_dashboard.sql`

The older manual bootstrap SQL can still be used for reference, but migrations are the source of truth.
