export type ParsedInputRow = {
  line: number;
  values: Record<string, string>;
};

export type StagedImportRow = {
  source_provider: string;
  observed_at: string;
  title: string;
  ip_name: string;
  media_type: string;
  region: string;
  language: string;
  external_id: string;
  external_url: string;
  rank_value?: string;
  rating_value?: string;
  review_count?: string;
  view_count?: string;
  engagement_count?: string;
  sales_value?: string;
  sales_is_estimated?: string;
  award_name?: string;
  award_result?: string;
  metadata_json?: Record<string, unknown>;
  search_interest?: string;
};

export type ProviderRecord = {
  id: string;
  slug: string;
  name: string;
};

export type FileValidationResult = {
  ok: boolean;
  message?: string;
  fileType?: 'csv';
};

export type MappingResult = {
  stagedRows: StagedImportRow[];
  invalidRows: Array<{ line: number; message: string }>;
  rowsReceived: number;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/^\ufeff/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function buildLookup(row: Record<string, string>) {
  const lookup = new Map<string, string>();

  Object.entries(row).forEach(([key, value]) => {
    lookup.set(normalizeKey(key), value.trim());
  });

  return lookup;
}

function pickValue(lookup: Map<string, string>, candidates: string[]) {
  for (const candidate of candidates) {
    const value = lookup.get(normalizeKey(candidate));
    if (value) {
      return value;
    }
  }
  return '';
}

function cleanNumberLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.replace(/,/g, '').replace(/[^0-9.+-]/g, '');
  if (!normalized) {
    return '';
  }

  return Number.isFinite(Number(normalized)) ? normalized : '';
}

function parseRankValue(value: string) {
  const match = value.replace(/,/g, '').match(/(\d+)/);
  return match ? match[1] : '';
}

function toIsoTimestamp(value: string, fallback: string) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

export function validateImportFile(fileName: string): FileValidationResult {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.csv')) {
    return { ok: true, fileType: 'csv' };
  }

  if (lower.endsWith('.xlsx')) {
    return {
      ok: false,
      message: 'XLSX upload is not yet supported directly. Convert the workbook to CSV and upload that instead.'
    };
  }

  return {
    ok: false,
    message: 'Unsupported file type. Upload a CSV file for this V1 import flow.'
  };
}

export function parseCsvUpload(csvText: string): ParsedInputRow[] {
  const rows = parseCsvMatrix(csvText.replace(/^\uFEFF/, ''));
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());

  return rows
    .slice(1)
    .map((row, index) => {
      const values: Record<string, string> = {};
      headers.forEach((header, headerIndex) => {
        if (!header) {
          return;
        }
        values[header] = row[headerIndex] ?? '';
      });
      return {
        line: index + 2,
        values
      };
    })
    .filter((row) => Object.values(row.values).some((value) => value.trim() !== ''));
}

function mapGoodreadsRow(row: ParsedInputRow, provider: ProviderRecord, observedAtFallback: string): StagedImportRow | null {
  const lookup = buildLookup(row.values);
  const title = pickValue(lookup, ['Title']);

  if (!title) {
    return null;
  }

  const authors = pickValue(lookup, ['Authors', 'Author']);
  const asin = pickValue(lookup, ['ASIN']);
  const externalUrl = pickValue(lookup, ['URL', 'Link', 'External URL']);
  const ratingValue = cleanNumberLike(pickValue(lookup, ['Rating', 'Average Rating']));
  const ratingsCount = cleanNumberLike(pickValue(lookup, ['Ratings', 'Ratings Count', 'Number of Ratings']));
  const reviewsCount = cleanNumberLike(pickValue(lookup, ['Reviews', 'Reviews Count', 'Number of Reviews']));

  return {
    source_provider: provider.slug,
    observed_at: toIsoTimestamp(pickValue(lookup, ['Observed At', 'Date', 'Snapshot Date']), observedAtFallback),
    title,
    ip_name: title,
    media_type: 'book',
    region: 'unknown',
    language: pickValue(lookup, ['Language']) || 'en',
    external_id: asin || `goodreads:${title}`,
    external_url: externalUrl,
    rating_value: ratingValue || undefined,
    review_count: ratingsCount || undefined,
    metadata_json: {
      source_row: row.values,
      authors,
      first_published: pickValue(lookup, ['First_published', 'First Published', 'Published']),
      ratings_count: ratingsCount || null,
      reviews_count: reviewsCount || null,
      genres: pickValue(lookup, ['Genres'])
    }
  };
}

function mapAmazonBooksRow(row: ParsedInputRow, provider: ProviderRecord, observedAtFallback: string): StagedImportRow | null {
  const lookup = buildLookup(row.values);
  const title = pickValue(lookup, ['title', 'Title']);

  if (!title) {
    return null;
  }

  const asin = pickValue(lookup, ['ASIN', 'asin']);
  const externalUrl = pickValue(lookup, ['external_url', 'External URL', 'url', 'URL']);
  const ratingValue = cleanNumberLike(pickValue(lookup, ['rating_avg_text', 'rating', 'average_rating']));
  const reviewCount = cleanNumberLike(pickValue(lookup, ['ratings_count_text', 'ratings_count', 'review_count']));
  const parsedRank = parseRankValue(pickValue(lookup, ['bestseller_rank_raw', 'rank', 'best_seller_rank']));

  return {
    source_provider: provider.slug,
    observed_at: toIsoTimestamp(pickValue(lookup, ['observed_at', 'snapshot_date', 'date']), observedAtFallback),
    title,
    ip_name: title,
    media_type: 'book',
    region: provider.slug.includes('uk') || provider.name.toLowerCase().includes('uk') ? 'UK' : 'US',
    language: pickValue(lookup, ['language']) || 'en',
    external_id: asin || `amazon:${title}`,
    external_url: externalUrl,
    rank_value: parsedRank || undefined,
    rating_value: ratingValue || undefined,
    review_count: reviewCount || undefined,
    metadata_json: {
      source_row: row.values,
      author_primary: pickValue(lookup, ['author_primary', 'author']),
      publisher: pickValue(lookup, ['publisher']),
      publication_date: pickValue(lookup, ['publication_date', 'pub_date']),
      bestseller_rank_raw: pickValue(lookup, ['bestseller_rank_raw', 'rank']),
      isbn_10: pickValue(lookup, ['ISBN_10', 'isbn_10']),
      isbn_13: pickValue(lookup, ['ISBN_13', 'isbn_13'])
    }
  };
}

export function mapRowsForProvider(rows: ParsedInputRow[], provider: ProviderRecord, now = new Date()): MappingResult {
  const observedAtFallback = now.toISOString();
  const invalidRows: Array<{ line: number; message: string }> = [];

  const stagedRows = rows.flatMap((row) => {
    const mapper = provider.slug === 'goodreads' || provider.slug.includes('goodreads')
      ? mapGoodreadsRow
      : provider.slug.includes('kindle') || provider.slug.includes('amazon')
        ? mapAmazonBooksRow
        : null;

    if (!mapper) {
      invalidRows.push({
        line: row.line,
        message: `Provider "${provider.slug}" does not have a CSV mapping yet.`
      });
      return [];
    }

    const mapped = mapper(row, provider, observedAtFallback);
    if (!mapped) {
      invalidRows.push({ line: row.line, message: 'Missing a title in this CSV row.' });
      return [];
    }

    return [mapped];
  });

  return {
    stagedRows,
    invalidRows,
    rowsReceived: rows.length
  };
}
