import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketFreshness,
  computeCompositeWorkScore,
  computeSourceRecordFingerprint,
  confidenceScoreForMatches,
  determineIdentifierMatchMethod,
  disagreementScore,
  normalizeBookText,
  scoreBibliographicMatch,
  weightedDisplayRating
} from './entity-resolution.ts';

test('normalizeBookText removes edition noise and punctuation', () => {
  assert.equal(normalizeBookText('Blue Box: Kindle Edition!!'), 'blue box');
  assert.equal(normalizeBookText('  Hardcover  My Book '), 'my book');
});

test('computeSourceRecordFingerprint is stable for normalized identifiers', () => {
  assert.equal(
    computeSourceRecordFingerprint({ title: 'Blue Box', creator: 'Kouji Miura', asin: 'B0123' }),
    'blue box|kouji miura||||b0123|'
  );
});

test('weightedDisplayRating uses review counts instead of naive mean', () => {
  const result = weightedDisplayRating([
    { ratingValue: 4.9, reviewCount: 10 },
    { ratingValue: 4.0, reviewCount: 1000 }
  ]);
  assert.equal(result, 4.009);
});

test('disagreementScore captures cross-source variance', () => {
  const result = disagreementScore([
    { ratingValue: 4.8, rankValue: 5 },
    { ratingValue: 3.9, rankValue: 500 }
  ]);
  assert.equal(result, 0.18);
});

test('composite and confidence scores are bounded and non-naive', () => {
  assert.equal(
    computeCompositeWorkScore({ aggregateDisplayRating: 4.6, bestRank: 12, totalReviewCount: 3200, freshnessScore: 0.8 }),
    91.8989
  );
  assert.equal(
    confidenceScoreForMatches({ matchTypes: ['exact', 'probable'], exactIdentifierCount: 1, sourceCoverageCount: 2 }),
    0.96
  );
});

test('bucketFreshness downgrades aging evidence', () => {
  assert.equal(bucketFreshness('2026-03-18T12:00:00Z', new Date('2026-03-19T00:00:00Z')), 'live');
  assert.equal(bucketFreshness('2026-03-10T00:00:00Z', new Date('2026-03-19T00:00:00Z')), 'stale');
});


test('determineIdentifierMatchMethod detects exact asin/isbn matches', () => {
  assert.equal(determineIdentifierMatchMethod({ source: { asin: 'B0ABC' }, candidate: { asin: 'b0abc' } }), 'asin_exact');
  assert.equal(determineIdentifierMatchMethod({ source: { isbn13: '9781234567890' }, candidate: { isbn13: '9781234567890' } }), 'isbn13_exact');
  assert.equal(determineIdentifierMatchMethod({ source: { isbn10: '1234567890' }, candidate: { isbn10: '1234567890' } }), 'isbn10_exact');
});

test('scoreBibliographicMatch distinguishes probable and no-match cases', () => {
  assert.equal(scoreBibliographicMatch({ sourceTitle: 'Blue Box Paperback', sourceCreator: 'Kouji Miura', candidateTitle: 'Blue Box', candidateCreator: 'Kouji Miura' }), 0.92);
  assert.equal(scoreBibliographicMatch({ sourceTitle: 'Blue Box', sourceCreator: 'Kouji Miura', candidateTitle: 'Red Box', candidateCreator: 'Another Author' }), 0);
});
