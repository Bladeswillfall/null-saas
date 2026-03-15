import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildImportedMetrics,
  canonicalizeTitle,
  computeCompositeScore,
  parseCsv,
  scoreMomentumObservations,
  scoreRankingObservations,
  scoreReviewObservations,
  validateCsvHeaders,
  validateCsvRow
} from './analytics.ts';

test('canonicalizeTitle removes accents, quotes, and volume markers', () => {
  assert.equal(canonicalizeTitle('L\'Attaque "Volume" 03: Edition speciale'), 'lattaque 03 speciale');
});

test('parseCsv preserves quoted commas and skips blank rows', () => {
  const rows = parseCsv(
    'source_provider,observed_at,title,ip_name,media_type,region,language,external_id,external_url\n' +
      'kindle,2026-03-15T12:00:00Z,"Blue Box, Vol. 1",Blue Box,manga,JP,ja,bb-1,https://example.com/1\n' +
      '\n'
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.values.title, 'Blue Box, Vol. 1');
});

test('validateCsvHeaders and validateCsvRow catch structural issues', () => {
  const missingHeaders = validateCsvHeaders(['source_provider', 'title']);
  assert.deepEqual(missingHeaders, [
    'observed_at',
    'ip_name',
    'media_type',
    'region',
    'language',
    'external_id',
    'external_url'
  ]);

  const rowErrors = validateCsvRow({
    source_provider: 'kindle',
    observed_at: 'not-a-date',
    title: 'Blue Box',
    ip_name: '',
    media_type: 'novel',
    region: 'JP',
    language: 'ja',
    external_id: 'bb-1',
    external_url: 'https://example.com',
    rating_value: 'abc'
  });

  assert.equal(rowErrors.length, 4);
  assert.ok(rowErrors.some((error) => error.field === 'ip_name'));
  assert.ok(rowErrors.some((error) => error.field === 'media_type'));
  assert.ok(rowErrors.some((error) => error.field === 'observed_at'));
  assert.ok(rowErrors.some((error) => error.field === 'rating_value'));
});

test('buildImportedMetrics prefers estimated provenance for estimated sales and includes award signals', () => {
  const metrics = buildImportedMetrics({
    rank_value: '12',
    rating_value: '4.6',
    review_count: '320',
    sales_value: '120000',
    sales_is_estimated: 'true',
    award_name: 'Kodansha',
    award_result: 'Winner',
    search_interest: '85'
  });

  assert.deepEqual(
    metrics.map((metric) => [metric.metricType, metric.provenanceTag]),
    [
      ['rank_position', 'direct'],
      ['rating_average', 'direct'],
      ['review_count', 'direct'],
      ['sales_value', 'estimated'],
      ['award_signal', 'awards'],
      ['search_interest', 'engagement']
    ]
  );
});

test('scoring helpers produce reproducible leaderboard math', () => {
  const rankingScore = scoreRankingObservations([
    { metricType: 'rank_position', value: 1, provenanceTag: 'direct', observedAt: '2026-03-08T00:00:00Z' },
    { metricType: 'rank_position', value: 250, provenanceTag: 'direct', observedAt: '2026-03-09T00:00:00Z' }
  ]);
  const reviewScore = scoreReviewObservations([
    { metricType: 'rating_average', value: 4.5, provenanceTag: 'direct', observedAt: '2026-03-08T00:00:00Z' },
    { metricType: 'review_count', value: 250, provenanceTag: 'direct', observedAt: '2026-03-08T00:00:00Z' }
  ]);
  const momentumScore = scoreMomentumObservations([
    { metricType: 'rank_position', value: 200, provenanceTag: 'direct', observedAt: '2026-03-01T00:00:00Z' },
    { metricType: 'rank_position', value: 50, provenanceTag: 'direct', observedAt: '2026-03-08T00:00:00Z' },
    { metricType: 'search_interest', value: 20, provenanceTag: 'engagement', observedAt: '2026-03-01T00:00:00Z' },
    { metricType: 'search_interest', value: 40, provenanceTag: 'engagement', observedAt: '2026-03-08T00:00:00Z' }
  ]);
  const composite = computeCompositeScore({
    ranking: 80,
    reviews: 70,
    momentum: 60,
    sales: 50,
    awards: 40
  });

  assert.equal(rankingScore, 50.2);
  assert.equal(reviewScore, 49.5);
  assert.equal(momentumScore, 100);
  assert.equal(composite, 68.5);
});
