import { computeSourceRecordFingerprint, normalizeBookText } from '@null/domain';

type AnySupabase = any;

export type StagedImportRow = {
  id: string;
  import_batch_id: string;
  row_number: number;
  source_provider: string;
  observed_at: string | null;
  title: string;
  ip_name: string;
  media_type: string;
  region: string;
  language: string;
  external_id: string;
  external_url: string;
  rank_value: number | null;
  rating_value: number | null;
  review_count: number | null;
  view_count: number | null;
  engagement_count: number | null;
  sales_value: number | null;
  sales_is_estimated: boolean | null;
  award_name: string | null;
  award_result: string | null;
  metadata_json: Record<string, unknown> | null;
  is_valid: boolean;
  validation_errors: string[] | null;
};

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: unknown): number | null {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function buildRawObservationInsert(row: StagedImportRow, providerId: string, fileName: string) {
  return {
    import_batch_id: row.import_batch_id,
    source_provider_id: providerId,
    raw_work_title: row.title,
    raw_ip_name: row.ip_name,
    raw_author_or_creator: cleanString(row.metadata_json?.author_primary) ?? cleanString(row.metadata_json?.authors) ?? null,
    raw_category: row.media_type,
    raw_region: row.region,
    raw_language: row.language,
    observed_at: row.observed_at ?? new Date().toISOString(),
    rank_value: row.rank_value,
    rating_value: row.rating_value,
    review_count: row.review_count,
    view_count: row.view_count,
    engagement_count: row.engagement_count,
    sales_value: row.sales_value,
    sales_is_estimated: row.sales_is_estimated,
    awards_value: row.award_name ? 1 : null,
    metadata_json: {
      ...(row.metadata_json ?? {}),
      file_name: fileName,
      source_provider: row.source_provider,
      external_id: row.external_id,
      external_url: row.external_url,
      media_type: row.media_type,
      original_row_number: row.row_number
    }
  };
}

export function buildSourceRecordInsert(row: StagedImportRow, organizationId: string, providerId: string) {
  const metadata = row.metadata_json ?? {};
  const creator = cleanString(metadata.author_primary) ?? cleanString(metadata.authors) ?? cleanString(metadata.creator);
  const publisher = cleanString(metadata.publisher);
  const isbn10 = cleanString(metadata.isbn_10) ?? cleanString(metadata.ISBN_10);
  const isbn13 = cleanString(metadata.isbn_13) ?? cleanString(metadata.ISBN_13);
  const asin = cleanString(metadata.asin) ?? row.external_id;
  const publicationDate = cleanString(metadata.publication_date) ?? cleanString(metadata.first_published);
  const observedAt = parseDate(row.observed_at);
  const ratingValue = parseNumber(row.rating_value);
  const reviewCount = parseInteger(row.review_count);
  const rankValue = parseInteger(row.rank_value);
  const salesValue = parseNumber(row.sales_value);
  const rawSeries = cleanString(metadata.series) ?? null;

  return {
    organization_id: organizationId,
    source_provider_id: providerId,
    import_batch_id: row.import_batch_id,
    import_file_row_id: row.id,
    external_id: row.external_id,
    external_url: row.external_url,
    raw_title: row.title,
    raw_creator: creator,
    raw_publisher: publisher,
    raw_series: rawSeries,
    raw_language: row.language,
    raw_region: row.region,
    raw_isbn_10: isbn10,
    raw_isbn_13: isbn13,
    raw_asin: asin,
    raw_publication_date: publicationDate,
    raw_format: cleanString(metadata.format),
    raw_payload: {
      title: row.title,
      author: creator,
      creator,
      publisher,
      isbn_10: isbn10,
      isbn_13: isbn13,
      asin,
      observed_at: row.observed_at,
      external_id: row.external_id,
      external_url: row.external_url,
      rating_value: row.rating_value,
      review_count: row.review_count,
      rank_value: row.rank_value,
      metadata_json: row.metadata_json ?? {}
    },
    normalized_title: normalizeBookText(row.title),
    normalized_creator: normalizeBookText(creator),
    normalized_publisher: normalizeBookText(publisher),
    normalized_series: normalizeBookText(rawSeries),
    parsed_publication_date: publicationDate,
    parsed_rating_value: ratingValue,
    parsed_review_count: reviewCount,
    parsed_rank_value: rankValue,
    parsed_sales_value: salesValue,
    parsed_currency: cleanString(metadata.currency),
    observed_at: observedAt,
    record_fingerprint: computeSourceRecordFingerprint({
      title: row.title,
      creator,
      publisher,
      isbn10,
      isbn13,
      asin,
      externalId: row.external_id
    }),
    ingestion_status: 'ready'
  };
}

export async function loadFormattedImportRows(supabase: AnySupabase, batchId: string): Promise<StagedImportRow[]> {
  const { data, error } = await supabase
    .from('v_import_rows_formatted')
    .select('*')
    .eq('import_batch_id', batchId)
    .order('row_number', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StagedImportRow[];
}

export async function rebuildBatchSourceRecords(supabase: AnySupabase, input: {
  batchId: string;
  organizationId: string;
  sourceProviderId: string;
  rows: StagedImportRow[];
}) {
  await supabase.from('source_records').delete().eq('import_batch_id', input.batchId);

  const validRows = input.rows.filter((row) => row.is_valid);
  if (validRows.length === 0) {
    return { insertedCount: 0 };
  }

  const payload = validRows.map((row) => buildSourceRecordInsert(row, input.organizationId, input.sourceProviderId));
  const { error } = await supabase.from('source_records').insert(payload);
  if (error) {
    throw new Error(error.message);
  }
  return { insertedCount: payload.length };
}

export async function rebuildBatchRawObservations(supabase: AnySupabase, input: {
  batchId: string;
  sourceProviderId: string;
  rows: StagedImportRow[];
  fileName: string;
}) {
  await supabase.from('raw_observations').delete().eq('import_batch_id', input.batchId);

  const validRows = input.rows.filter((row) => row.is_valid);
  if (validRows.length === 0) {
    return { insertedCount: 0 };
  }

  const payload = validRows.map((row) => buildRawObservationInsert(row, input.sourceProviderId, input.fileName));
  const { error } = await supabase.from('raw_observations').insert(payload);
  if (error) {
    throw new Error(error.message);
  }
  return { insertedCount: payload.length };
}

export async function updateImportRowData(supabase: AnySupabase, rowId: string, patch: Record<string, unknown>) {
  const { data: existing, error: loadError } = await supabase
    .from('import_file_rows')
    .select('id, row_data')
    .eq('id', rowId)
    .single();

  if (loadError || !existing) {
    throw new Error(loadError?.message ?? 'Import row not found.');
  }

  const nextRowData = {
    ...(existing.row_data ?? {}),
    ...patch
  };

  const { error } = await supabase
    .from('import_file_rows')
    .update({ row_data: nextRowData })
    .eq('id', rowId);

  if (error) {
    throw new Error(error.message);
  }
}
