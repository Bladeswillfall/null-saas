export const workDashboardSorts = ['composite', 'rating', 'movement', 'freshness', 'coverage', 'confidence'] as const;
export type WorkDashboardSort = (typeof workDashboardSorts)[number];

export interface WorkEvidenceRow {
  id: string;
  workId: string;
  sourceRecordId: string | null;
  sourceProviderId: string;
  sourceProviderName: string;
  sourceProviderSlug: string;
  externalId: string | null;
  externalUrl: string | null;
  displayTitle: string | null;
  displayCreator: string | null;
  displayPublisher: string | null;
  isbn10: string | null;
  isbn13: string | null;
  asin: string | null;
  rankValue: number | null;
  ratingValue: number | null;
  reviewCount: number | null;
  salesValue: number | null;
  observedAt: string | null;
  freshnessBucket: string | null;
  varianceNotes: string | null;
  matchMethod: string | null;
  matchType: 'exact' | 'probable' | 'manual' | null;
  matchScore: number | null;
}

export interface WorkDashboardRow {
  workId: string;
  organizationId: string;
  title: string;
  creator: string | null;
  publisher: string | null;
  compositeScore: number;
  aggregateDisplayRating: number | null;
  movementValue: number | null;
  sourceCoverageCount: number;
  freshestObservedAt: string | null;
  freshnessScore: number | null;
  confidenceScore: number | null;
  disagreementScore: number | null;
  canonicalIsbn10: string | null;
  canonicalIsbn13: string | null;
  canonicalAsin: string | null;
  evidenceRows?: WorkEvidenceRow[];
}

export interface ManualReviewCandidate {
  id: string;
  workId: string;
  title: string;
  publisher: string | null;
  matchMethod: string;
  matchType: 'exact' | 'probable' | 'manual';
  matchScore: number;
  matchedOn: Record<string, unknown>;
  isSelected: boolean;
}

export interface ManualReviewQueueRow {
  sourceRecordId: string;
  title: string;
  creator: string | null;
  publisher: string | null;
  sourceProviderId: string;
  sourceProviderName: string;
  sourceProviderSlug: string;
  observedAt: string | null;
  ingestionStatus: string;
  candidates: ManualReviewCandidate[];
}

const editionNoisePattern = /\b(paperback|hardcover|kindle edition|illustrated edition|mass market paperback|special edition|collector's edition|revised edition)\b/gi;

export function normalizeBookText(input: string | null | undefined): string {
  return (input ?? '')
    .toLowerCase()
    .replace(editionNoisePattern, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


export function determineIdentifierMatchMethod(input: { source: { asin?: string | null; isbn10?: string | null; isbn13?: string | null }; candidate: { asin?: string | null; isbn10?: string | null; isbn13?: string | null } }): 'asin_exact' | 'isbn13_exact' | 'isbn10_exact' | null {
  if (input.source.asin && input.candidate.asin && input.source.asin.trim().toLowerCase() === input.candidate.asin.trim().toLowerCase()) return 'asin_exact';
  if (input.source.isbn13 && input.candidate.isbn13 && input.source.isbn13.trim().toLowerCase() === input.candidate.isbn13.trim().toLowerCase()) return 'isbn13_exact';
  if (input.source.isbn10 && input.candidate.isbn10 && input.source.isbn10.trim().toLowerCase() === input.candidate.isbn10.trim().toLowerCase()) return 'isbn10_exact';
  return null;
}

export function scoreBibliographicMatch(input: { sourceTitle?: string | null; sourceCreator?: string | null; candidateTitle?: string | null; candidateCreator?: string | null }): number {
  const titleMatched = normalizeBookText(input.sourceTitle) && normalizeBookText(input.sourceTitle) === normalizeBookText(input.candidateTitle);
  const creatorMatched = normalizeBookText(input.sourceCreator) && normalizeBookText(input.sourceCreator) === normalizeBookText(input.candidateCreator);
  if (titleMatched && creatorMatched) return 0.92;
  if (titleMatched) return 0.7;
  return 0;
}

export function computeSourceRecordFingerprint(input: {
  title?: string | null;
  creator?: string | null;
  publisher?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  asin?: string | null;
  externalId?: string | null;
}): string {
  return [
    normalizeBookText(input.title),
    normalizeBookText(input.creator),
    normalizeBookText(input.publisher),
    (input.isbn10 ?? '').trim().toLowerCase(),
    (input.isbn13 ?? '').trim().toLowerCase(),
    (input.asin ?? '').trim().toLowerCase(),
    (input.externalId ?? '').trim().toLowerCase()
  ].join('|');
}

export function weightedDisplayRating(rows: Array<{ ratingValue?: number | null; reviewCount?: number | null }>): number | null {
  const usable = rows.filter((row) => typeof row.ratingValue === 'number' && row.ratingValue! > 0);
  if (usable.length === 0) return null;
  let weighted = 0;
  let totalWeight = 0;
  for (const row of usable) {
    const weight = Math.max(1, Math.min(5000, row.reviewCount ?? 25));
    weighted += (row.ratingValue ?? 0) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? round(weighted / totalWeight, 3) : null;
}

export function disagreementScore(rows: Array<{ ratingValue?: number | null; rankValue?: number | null }>): number | null {
  const ratings = rows.map((row) => row.ratingValue).filter((v): v is number => typeof v === 'number');
  const ranks = rows.map((row) => row.rankValue).filter((v): v is number => typeof v === 'number' && v > 0);
  const ratingSpread = ratings.length >= 2 ? (Math.max(...ratings) - Math.min(...ratings)) / 5 : 0;
  const rankSpread = ranks.length >= 2 ? Math.min(1, (Math.max(...ranks) - Math.min(...ranks)) / 10000) : 0;
  return round(Math.max(ratingSpread, rankSpread), 4);
}

export function freshnessScoreFromObservedAt(observedAt: string | Date | null | undefined, now = new Date()): number {
  if (!observedAt) return 0;
  const ageHours = Math.max(0, (now.getTime() - new Date(observedAt).getTime()) / 36e5);
  if (ageHours <= 24) return 1;
  if (ageHours <= 72) return 0.8;
  if (ageHours <= 168) return 0.55;
  if (ageHours <= 720) return 0.3;
  return 0.1;
}

export function computeCompositeWorkScore(input: {
  aggregateDisplayRating: number | null;
  bestRank: number | null;
  totalReviewCount: number;
  freshnessScore: number;
}): number {
  // Explicit bounded model: 45% rating quality, 25% rank strength, 20% review volume, 10% freshness.
  const ratingSignal = input.aggregateDisplayRating ? Math.max(0, Math.min(1, input.aggregateDisplayRating / 5)) : 0;
  const rankSignal = input.bestRank ? Math.max(0, Math.min(1, 1 - (input.bestRank - 1) / 10000)) : 0;
  const reviewSignal = Math.max(0, Math.min(1, Math.log10(input.totalReviewCount + 1) / 4));
  const freshnessSignal = Math.max(0, Math.min(1, input.freshnessScore));
  return round((ratingSignal * 0.45 + rankSignal * 0.25 + reviewSignal * 0.2 + freshnessSignal * 0.1) * 100, 4);
}

export function confidenceScoreForMatches(input: {
  matchTypes: Array<'exact' | 'probable' | 'manual'>;
  exactIdentifierCount: number;
  sourceCoverageCount: number;
}): number {
  const base = input.matchTypes.reduce((sum, type) => sum + (type === 'exact' ? 1 : type === 'probable' ? 0.72 : 0.55), 0) / Math.max(1, input.matchTypes.length);
  const identifierBoost = Math.min(0.15, input.exactIdentifierCount * 0.05);
  const corroborationBoost = Math.min(0.15, Math.max(0, input.sourceCoverageCount - 1) * 0.05);
  return round(Math.min(1, base + identifierBoost + corroborationBoost), 4);
}

export function bucketFreshness(observedAt: string | Date | null | undefined, now = new Date()): string | null {
  if (!observedAt) return null;
  const score = freshnessScoreFromObservedAt(observedAt, now);
  if (score >= 0.95) return 'live';
  if (score >= 0.75) return 'recent';
  if (score >= 0.5) return 'aging';
  return 'stale';
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
