import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRowsForProvider, parseCsvUpload, validateImportFile } from './imports.ts';

test('validateImportFile accepts csv and rejects xlsx', () => {
  assert.equal(validateImportFile('sample.csv').ok, true);
  assert.equal(validateImportFile('sample.xlsx').ok, false);
  assert.match(validateImportFile('sample.xlsx').message ?? '', /Convert the workbook to CSV/);
  assert.equal(validateImportFile('sample.txt').ok, false);
});

test('maps Goodreads CSV rows into staged import rows', () => {
  const rows = parseCsvUpload('Title,Authors,First Published,Rating,Ratings,Reviews,Genres,ASIN\nThe Test Book,Jane Doe,2001,4.5,1234,88,Fantasy,B000123');
  const result = mapRowsForProvider(rows, { id: '1', slug: 'goodreads', name: 'Goodreads' }, new Date('2026-03-19T00:00:00Z'));

  assert.equal(result.rowsReceived, 1);
  assert.equal(result.invalidRows.length, 0);
  assert.equal(result.stagedRows[0]?.title, 'The Test Book');
  assert.equal(result.stagedRows[0]?.review_count, '1234');
  assert.equal(result.stagedRows[0]?.external_id, 'B000123');
  assert.deepEqual(result.stagedRows[0]?.metadata_json, {
    source_row: rows[0]?.values,
    authors: 'Jane Doe',
    first_published: '2001',
    ratings_count: '1234',
    reviews_count: '88',
    genres: 'Fantasy'
  });
});

test('maps Amazon books CSV rows into staged import rows', () => {
  const rows = parseCsvUpload('title,author_primary,publisher,publication_date,rating_avg_text,ratings_count_text,bestseller_rank_raw,ISBN_10,ISBN_13,ASIN\nCharts Book,John Smith,Example Press,2025-01-01,4.7,"2,345",#12 in Books,1234567890,1234567890123,B00XYZ');
  const result = mapRowsForProvider(rows, { id: '2', slug: 'kindle-charts', name: 'Kindle Charts' }, new Date('2026-03-19T00:00:00Z'));

  assert.equal(result.invalidRows.length, 0);
  assert.equal(result.stagedRows[0]?.title, 'Charts Book');
  assert.equal(result.stagedRows[0]?.rank_value, '12');
  assert.equal(result.stagedRows[0]?.review_count, '2345');
  assert.equal(result.stagedRows[0]?.external_id, 'B00XYZ');
  assert.deepEqual(result.stagedRows[0]?.metadata_json, {
    source_row: rows[0]?.values,
    author_primary: 'John Smith',
    publisher: 'Example Press',
    publication_date: '2025-01-01',
    bestseller_rank_raw: '#12 in Books',
    isbn_10: '1234567890',
    isbn_13: '1234567890123'
  });
});
