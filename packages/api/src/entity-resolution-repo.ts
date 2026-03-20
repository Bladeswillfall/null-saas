import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  importBatches,
  importFileRows,
  sourceProviders,
  sourceRecordMatches,
  sourceRecords,
  workAggregateSummaries,
  workAggregateSummaryHistory,
  workExternalIds,
  works,
  workSourceSummaries
} from '@null/db';
import {
  bucketFreshness,
  computeCompositeWorkScore,
  computeSourceRecordFingerprint,
  confidenceScoreForMatches,
  disagreementScore,
  normalizeBookText,
  weightedDisplayRating,
  type ManualReviewQueueRow,
  type WorkDashboardRow,
  type WorkEvidenceRow,
  workDashboardSorts
} from '@null/domain';
import type { TRPCContext } from './context';
import { requireOrganizationAdmin, requireOrganizationMember } from './auth';

type AnalyticsContext = Pick<TRPCContext, 'db' | 'user'>;

type SourceRecordInsert = typeof sourceRecords.$inferInsert;

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

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function buildSourceRecordFromPayload(input: {
  organizationId: string;
  sourceProviderId: string;
  importBatchId: string;
  importFileRowId: string;
  payload: Record<string, unknown>;
  observedAtFallback?: Date | null;
}): SourceRecordInsert {
  const title = extractString(input.payload, ['title', 'name']) ?? 'Untitled';
  const creator = extractString(input.payload, ['author', 'authors', 'creator']);
  const publisher = extractString(input.payload, ['publisher', 'imprint']);
  const isbn10 = extractString(input.payload, ['isbn10', 'isbn_10', 'isbn-10']);
  const isbn13 = extractString(input.payload, ['isbn13', 'isbn_13', 'isbn-13']);
  const asin = extractString(input.payload, ['asin']);
  const publicationDate = extractString(input.payload, ['publication_date', 'published_at', 'pub_date']);
  const observedAt = parseDate(extractString(input.payload, ['observed_at', 'timestamp']) ?? null) ?? input.observedAtFallback ?? null;
  const externalId = extractString(input.payload, ['external_id', 'id', 'book_id']);
  const externalUrl = extractString(input.payload, ['external_url', 'url', 'link']);
  const rating = parseNumber(input.payload.rating_value ?? input.payload.rating_avg_text ?? input.payload.avg_rating);
  const reviewCount = parseInteger(input.payload.review_count ?? input.payload.ratings_count_text ?? input.payload.rating_count);
  const rankValue = parseInteger(input.payload.rank_value ?? input.payload.bestseller_rank_raw ?? input.payload.rank);
  const salesValue = parseNumber(input.payload.sales_value);
  const rawSeries = extractString(input.payload, ['series', 'series_name']);
  const rawFormat = extractString(input.payload, ['format', 'binding']);
  const rawLanguage = extractString(input.payload, ['language']);
  const rawRegion = extractString(input.payload, ['region']);

  return {
    organizationId: input.organizationId,
    sourceProviderId: input.sourceProviderId,
    importBatchId: input.importBatchId,
    importFileRowId: input.importFileRowId,
    externalId,
    externalUrl,
    rawTitle: title,
    rawCreator: creator,
    rawPublisher: publisher,
    rawSeries,
    rawLanguage,
    rawRegion,
    rawIsbn10: isbn10,
    rawIsbn13: isbn13,
    rawAsin: asin,
    rawPublicationDate: publicationDate,
    rawFormat,
    rawPayload: input.payload,
    normalizedTitle: normalizeBookText(title),
    normalizedCreator: normalizeBookText(creator),
    normalizedPublisher: normalizeBookText(publisher),
    normalizedSeries: normalizeBookText(rawSeries),
    parsedPublicationDate: publicationDate ?? null,
    parsedRatingValue: rating?.toString(),
    parsedReviewCount: reviewCount,
    parsedRankValue: rankValue,
    parsedSalesValue: salesValue?.toString(),
    parsedCurrency: extractString(input.payload, ['currency']),
    observedAt,
    recordFingerprint: computeSourceRecordFingerprint({ title, creator, publisher, isbn10, isbn13, asin, externalId }),
    ingestionStatus: 'ready'
  };
}

type MatchResult = {
  workId: string;
  matchMethod: string;
  matchScore: number;
  matchType: 'exact' | 'probable' | 'manual';
  matchedOn: Record<string, unknown>;
  select: boolean;
};

async function findMatchCandidates(ctx: AnalyticsContext, record: typeof sourceRecords.$inferSelect): Promise<MatchResult[]> {
  const orgWorks = await ctx.db.select().from(works).where(eq(works.organizationId, record.organizationId));
  if (orgWorks.length === 0) return [];
  const workIds = orgWorks.map((work) => work.id);
  const externalIds = workIds.length ? await ctx.db.select().from(workExternalIds).where(inArray(workExternalIds.workId, workIds)) : [];

  const pushExact = (method: string, needle: string | null, key: 'asin' | 'isbn13' | 'isbn10'): MatchResult[] => {
    if (!needle) return [];
    return externalIds
      .filter((external) => external.externalId.toLowerCase() === needle.toLowerCase())
      .map((external) => ({
        workId: external.workId,
        matchMethod: method,
        matchScore: 1,
        matchType: 'exact' as const,
        matchedOn: { [key]: needle, providerId: record.sourceProviderId },
        select: true
      }));
  };

  const exactMatches = [
    ...pushExact('asin_exact', record.rawAsin, 'asin'),
    ...pushExact('isbn13_exact', record.rawIsbn13, 'isbn13'),
    ...pushExact('isbn10_exact', record.rawIsbn10, 'isbn10')
  ];
  if (exactMatches.length > 0) return dedupeByWork(exactMatches);

  const normalizedTitle = record.normalizedTitle ?? normalizeBookText(record.rawTitle);
  const normalizedCreator = record.normalizedCreator ?? normalizeBookText(record.rawCreator);
  const probable = orgWorks
    .map((work) => {
      const titleScore = normalizeBookText(work.canonicalTitle ?? work.title) === normalizedTitle ? 0.7 : 0;
      const creatorScore = normalizeBookText(work.seriesName) === normalizedCreator ? 0.1 : 0;
      const publisherScore = normalizeBookText(work.publisher) === (record.normalizedPublisher ?? '') ? 0.05 : 0;
      const yearScore = work.releaseDate && record.parsedPublicationDate && String(work.releaseDate).slice(0, 4) === String(record.parsedPublicationDate).slice(0, 4) ? 0.05 : 0;
      const score = titleScore + (normalizedCreator ? 0.2 : 0) + creatorScore + publisherScore + yearScore;
      return {
        workId: work.id,
        matchMethod: 'title_creator_probable',
        matchScore: Number(score.toFixed(4)),
        matchType: score >= 0.8 ? ('probable' as const) : ('manual' as const),
        matchedOn: {
          normalizedTitle,
          normalizedCreator,
          publisherMatched: publisherScore > 0,
          publicationYearMatched: yearScore > 0
        },
        select: score >= 0.92
      };
    })
    .filter((candidate) => candidate.matchScore >= 0.7)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return probable;
}

function dedupeByWork(matches: MatchResult[]): MatchResult[] {
  const byWork = new Map<string, MatchResult>();
  for (const match of matches) {
    const existing = byWork.get(match.workId);
    if (!existing || match.matchScore > existing.matchScore) byWork.set(match.workId, match);
  }
  return [...byWork.values()];
}

async function upsertMatchCandidates(
  ctx: AnalyticsContext,
  sourceRecordId: string,
  candidates: MatchResult[],
  selectedBy: string | null,
  forceManualSelectionWorkId?: string
) {
  await ctx.db.delete(sourceRecordMatches).where(eq(sourceRecordMatches.sourceRecordId, sourceRecordId));
  if (candidates.length === 0) return [] as typeof sourceRecordMatches.$inferSelect[];
  const selectedWorkId = forceManualSelectionWorkId ?? candidates.find((candidate) => candidate.select)?.workId ?? null;
  return ctx.db.insert(sourceRecordMatches).values(
    candidates.map((candidate) => ({
      sourceRecordId,
      workId: candidate.workId,
      matchMethod: forceManualSelectionWorkId === candidate.workId ? 'manual' : candidate.matchMethod,
      matchScore: candidate.matchScore.toString(),
      matchType: forceManualSelectionWorkId === candidate.workId ? 'manual' : candidate.matchType,
      matchedOn: candidate.matchedOn,
      isSelected: selectedWorkId === candidate.workId,
      selectedBy: selectedWorkId === candidate.workId ? selectedBy : null,
      selectedAt: selectedWorkId === candidate.workId ? new Date() : null
    }))
  ).returning();
}

async function syncExternalId(ctx: AnalyticsContext, input: { workId: string; sourceProviderId: string; externalId: string | null; externalUrl: string | null; matchType: 'exact' | 'probable' | 'manual' }) {
  if (!input.externalId) return;
  const existing = await ctx.db.select().from(workExternalIds).where(eq(workExternalIds.externalId, input.externalId));
  const target = existing.find((row) => row.sourceProviderId === input.sourceProviderId || row.workId === input.workId);
  if (target) {
    await ctx.db.update(workExternalIds).set({ workId: input.workId, externalUrl: input.externalUrl, matchType: input.matchType }).where(eq(workExternalIds.id, target.id));
  } else {
    await ctx.db.insert(workExternalIds).values({ workId: input.workId, sourceProviderId: input.sourceProviderId, externalId: input.externalId, externalUrl: input.externalUrl, matchType: input.matchType });
  }
}

async function rebuildWorkSummaries(ctx: AnalyticsContext, workId: string) {
  const [work] = await ctx.db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work) throw new TRPCError({ code: 'NOT_FOUND', message: 'Work not found.' });

  const selectedMatches = await ctx.db.select().from(sourceRecordMatches).where(and(eq(sourceRecordMatches.workId, workId), eq(sourceRecordMatches.isSelected, true)));
  const sourceRecordIds = selectedMatches.map((match) => match.sourceRecordId);
  const records = sourceRecordIds.length ? await ctx.db.select().from(sourceRecords).where(inArray(sourceRecords.id, sourceRecordIds)) : [];
  const providerIds = [...new Set(records.map((record) => record.sourceProviderId))];
  const providers = providerIds.length ? await ctx.db.select().from(sourceProviders).where(inArray(sourceProviders.id, providerIds)) : [];
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));

  await ctx.db.delete(workSourceSummaries).where(eq(workSourceSummaries.workId, workId));
  if (records.length > 0) {
    await ctx.db.insert(workSourceSummaries).values(records.map((record) => ({
      workId,
      sourceProviderId: record.sourceProviderId,
      sourceRecordId: record.id,
      externalId: record.externalId,
      externalUrl: record.externalUrl,
      displayTitle: record.rawTitle,
      displayCreator: record.rawCreator,
      displayPublisher: record.rawPublisher,
      isbn10: record.rawIsbn10,
      isbn13: record.rawIsbn13,
      asin: record.rawAsin,
      rankValue: record.parsedRankValue,
      ratingValue: record.parsedRatingValue,
      reviewCount: record.parsedReviewCount,
      salesValue: record.parsedSalesValue,
      observedAt: record.observedAt,
      freshnessBucket: bucketFreshness(record.observedAt),
      varianceNotes: buildVarianceNote(record, work)
    })));
  }

  const rating = weightedDisplayRating(records.map((record) => ({ ratingValue: asNumber(record.parsedRatingValue), reviewCount: record.parsedReviewCount })));
  const bestRank = minPositive(records.map((record) => record.parsedRankValue));
  const totalReviews = records.reduce((sum, record) => sum + Math.max(0, record.parsedReviewCount ?? 0), 0);
  const freshest = records.map((record) => record.observedAt).filter((v): v is Date => Boolean(v)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const freshness = freshest ? (bucketFreshness(freshest) === 'live' ? 1 : bucketFreshness(freshest) === 'recent' ? 0.8 : bucketFreshness(freshest) === 'aging' ? 0.55 : 0.25) : 0;
  const confidence = confidenceScoreForMatches({
    matchTypes: selectedMatches.map((match) => match.matchType as 'exact' | 'probable' | 'manual'),
    exactIdentifierCount: selectedMatches.filter((match) => match.matchType === 'exact').length,
    sourceCoverageCount: records.length
  });
  const disagreement = disagreementScore(records.map((record) => ({ ratingValue: asNumber(record.parsedRatingValue), rankValue: record.parsedRankValue })));
  const composite = computeCompositeWorkScore({ aggregateDisplayRating: rating, bestRank, totalReviewCount: totalReviews, freshnessScore: freshness });

  const [existingAgg] = await ctx.db.select().from(workAggregateSummaries).where(eq(workAggregateSummaries.workId, workId)).limit(1);
  const movementValue = existingAgg ? Math.round(composite - asNumber(existingAgg.compositeScore)) : 0;
  if (existingAgg) {
    await ctx.db.insert(workAggregateSummaryHistory).values({
      workId,
      compositeScore: existingAgg.compositeScore,
      aggregateDisplayRating: existingAgg.aggregateDisplayRating,
      sourceCoverageCount: existingAgg.sourceCoverageCount
    });
    await ctx.db.update(workAggregateSummaries).set({
      organizationId: work.organizationId,
      canonicalTitle: work.canonicalTitle ?? work.title,
      canonicalCreator: records.find((record) => record.rawCreator)?.rawCreator ?? null,
      canonicalPublisher: work.publisher ?? records.find((record) => record.rawPublisher)?.rawPublisher ?? null,
      canonicalIsbn10: records.find((record) => record.rawIsbn10)?.rawIsbn10 ?? null,
      canonicalIsbn13: records.find((record) => record.rawIsbn13)?.rawIsbn13 ?? null,
      canonicalAsin: records.find((record) => record.rawAsin)?.rawAsin ?? null,
      aggregateDisplayRating: rating?.toString() ?? null,
      compositeScore: composite.toString(),
      movementValue,
      sourceCoverageCount: records.length,
      freshestObservedAt: freshest,
      confidenceScore: confidence.toString(),
      disagreementScore: disagreement?.toString() ?? null,
      freshnessScore: freshness.toString()
    }).where(eq(workAggregateSummaries.workId, workId));
  } else {
    await ctx.db.insert(workAggregateSummaries).values({
      workId,
      organizationId: work.organizationId,
      canonicalTitle: work.canonicalTitle ?? work.title,
      canonicalCreator: records.find((record) => record.rawCreator)?.rawCreator ?? null,
      canonicalPublisher: work.publisher ?? records.find((record) => record.rawPublisher)?.rawPublisher ?? null,
      canonicalIsbn10: records.find((record) => record.rawIsbn10)?.rawIsbn10 ?? null,
      canonicalIsbn13: records.find((record) => record.rawIsbn13)?.rawIsbn13 ?? null,
      canonicalAsin: records.find((record) => record.rawAsin)?.rawAsin ?? null,
      aggregateDisplayRating: rating?.toString() ?? null,
      compositeScore: composite.toString(),
      movementValue,
      sourceCoverageCount: records.length,
      freshestObservedAt: freshest,
      confidenceScore: confidence.toString(),
      disagreementScore: disagreement?.toString() ?? null,
      freshnessScore: freshness.toString()
    });
  }

  return {
    workId,
    sourceCoverageCount: records.length,
    compositeScore: composite
  };
}

function buildVarianceNote(record: typeof sourceRecords.$inferSelect, work: typeof works.$inferSelect): string | null {
  const notes: string[] = [];
  if (record.rawTitle && normalizeBookText(record.rawTitle) !== normalizeBookText(work.canonicalTitle ?? work.title)) notes.push('title differs from canonical');
  if (record.rawPublisher && work.publisher && normalizeBookText(record.rawPublisher) !== normalizeBookText(work.publisher)) notes.push('publisher differs');
  return notes.length > 0 ? notes.join('; ') : null;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function minPositive(values: Array<number | null | undefined>): number | null {
  const positives = values.filter((value): value is number => typeof value === 'number' && value > 0);
  return positives.length ? Math.min(...positives) : null;
}

export async function ingestSourceRecordsForBatch(ctx: AnalyticsContext, batchId: string, rows: Array<Record<string, unknown>>) {
  const [batch] = await ctx.db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import batch not found.' });
  await ctx.db.delete(importFileRows).where(eq(importFileRows.importBatchId, batchId));
  await ctx.db.delete(sourceRecords).where(eq(sourceRecords.importBatchId, batchId));

  const insertedRows = rows.length
    ? await ctx.db.insert(importFileRows).values(rows.map((payload, index) => ({
        importBatchId: batchId,
        rowNumber: index + 1,
        rowPayload: payload,
        rowHash: computeSourceRecordFingerprint({
          title: typeof payload.title === 'string' ? payload.title : null,
          creator: typeof payload.author === 'string' ? payload.author : typeof payload.creator === 'string' ? payload.creator : null,
          publisher: typeof payload.publisher === 'string' ? payload.publisher : null,
          isbn10: typeof payload.isbn_10 === 'string' ? payload.isbn_10 : null,
          isbn13: typeof payload.isbn_13 === 'string' ? payload.isbn_13 : null,
          asin: typeof payload.asin === 'string' ? payload.asin : null,
          externalId: typeof payload.external_id === 'string' ? payload.external_id : null
        })
      }))).returning()
    : [];

  if (insertedRows.length === 0) return { count: 0 };
  await ctx.db.insert(sourceRecords).values(insertedRows.map((row) => buildSourceRecordFromPayload({
    organizationId: batch.organizationId,
    sourceProviderId: batch.sourceProviderId,
    importBatchId: batch.id,
    importFileRowId: row.id,
    payload: (row.rowPayload ?? {}) as Record<string, unknown>
  })));
  return { count: insertedRows.length };
}

export async function matchSourceRecordsForBatch(ctx: AnalyticsContext, input: { batchId: string; selectedBy?: string | null; reviewOnly?: boolean }) {
  const [batch] = await ctx.db.select().from(importBatches).where(eq(importBatches.id, input.batchId)).limit(1);
  if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import batch not found.' });
  const records = await ctx.db.select().from(sourceRecords).where(eq(sourceRecords.importBatchId, batch.id));
  const touchedWorkIds = new Set<string>();
  let reviewCount = 0;
  for (const record of records) {
    const candidates = await findMatchCandidates(ctx, record);
    const inserted = await upsertMatchCandidates(ctx, record.id, candidates, input.selectedBy ?? null);
    const selected = inserted.find((match) => match.isSelected);
    if (selected) {
      touchedWorkIds.add(selected.workId);
      if (!input.reviewOnly) {
        await syncExternalId(ctx, {
          workId: selected.workId,
          sourceProviderId: record.sourceProviderId,
          externalId: record.externalId ?? record.rawAsin ?? record.rawIsbn13 ?? record.rawIsbn10,
          externalUrl: record.externalUrl,
          matchType: selected.matchType as 'exact' | 'probable' | 'manual'
        });
      }
      await ctx.db.update(sourceRecords).set({ ingestionStatus: 'matched' }).where(eq(sourceRecords.id, record.id));
    } else {
      reviewCount += 1;
      await ctx.db.update(sourceRecords).set({ ingestionStatus: 'needs_review' }).where(eq(sourceRecords.id, record.id));
    }
  }
  if (!input.reviewOnly) {
    for (const workId of touchedWorkIds) {
      await rebuildWorkSummaries(ctx, workId);
    }
  }
  return { matchedCount: touchedWorkIds.size, reviewCount, workIds: [...touchedWorkIds] };
}

export async function getWorkDashboardRows(ctx: AnalyticsContext, input: { organizationId: string; page?: number; pageSize?: number; sort?: typeof workDashboardSorts[number] }) {
  await requireOrganizationMember(ctx, input.organizationId);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const sort = input.sort ?? 'composite';
  const sortColumn = sort === 'rating' ? workAggregateSummaries.aggregateDisplayRating : sort === 'movement' ? workAggregateSummaries.movementValue : sort === 'freshness' ? workAggregateSummaries.freshnessScore : sort === 'coverage' ? workAggregateSummaries.sourceCoverageCount : sort === 'confidence' ? workAggregateSummaries.confidenceScore : workAggregateSummaries.compositeScore;
  const rows = await ctx.db.select().from(workAggregateSummaries).where(eq(workAggregateSummaries.organizationId, input.organizationId)).orderBy(desc(sortColumn)).limit(pageSize).offset((page - 1) * pageSize);
  return rows.map((row): WorkDashboardRow => ({
    workId: row.workId,
    organizationId: row.organizationId,
    title: row.canonicalTitle,
    creator: row.canonicalCreator,
    publisher: row.canonicalPublisher,
    compositeScore: asNumber(row.compositeScore),
    aggregateDisplayRating: row.aggregateDisplayRating ? asNumber(row.aggregateDisplayRating) : null,
    movementValue: row.movementValue,
    sourceCoverageCount: row.sourceCoverageCount,
    freshestObservedAt: row.freshestObservedAt?.toISOString() ?? null,
    freshnessScore: row.freshnessScore ? asNumber(row.freshnessScore) : null,
    confidenceScore: row.confidenceScore ? asNumber(row.confidenceScore) : null,
    disagreementScore: row.disagreementScore ? asNumber(row.disagreementScore) : null,
    canonicalIsbn10: row.canonicalIsbn10,
    canonicalIsbn13: row.canonicalIsbn13,
    canonicalAsin: row.canonicalAsin
  }));
}

export async function getWorkEvidenceRows(ctx: AnalyticsContext, workId: string) {
  const [work] = await ctx.db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work) throw new TRPCError({ code: 'NOT_FOUND', message: 'Work not found.' });
  await requireOrganizationMember(ctx, work.organizationId);
  const summaries = await ctx.db.select().from(workSourceSummaries).where(eq(workSourceSummaries.workId, workId)).orderBy(desc(workSourceSummaries.observedAt));
  const providerIds = [...new Set(summaries.map((summary) => summary.sourceProviderId))];
  const providers = providerIds.length ? await ctx.db.select().from(sourceProviders).where(inArray(sourceProviders.id, providerIds)) : [];
  const matches = await ctx.db.select().from(sourceRecordMatches).where(and(eq(sourceRecordMatches.workId, workId), eq(sourceRecordMatches.isSelected, true)));
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const matchBySourceRecordId = new Map(matches.map((match) => [match.sourceRecordId, match]));
  return summaries.map((summary): WorkEvidenceRow => {
    const provider = providerById.get(summary.sourceProviderId);
    const match = summary.sourceRecordId ? matchBySourceRecordId.get(summary.sourceRecordId) : undefined;
    return {
      id: summary.id,
      workId: summary.workId,
      sourceRecordId: summary.sourceRecordId,
      sourceProviderId: summary.sourceProviderId,
      sourceProviderName: provider?.name ?? 'Unknown',
      sourceProviderSlug: provider?.slug ?? 'unknown',
      externalId: summary.externalId,
      externalUrl: summary.externalUrl,
      displayTitle: summary.displayTitle,
      displayCreator: summary.displayCreator,
      displayPublisher: summary.displayPublisher,
      isbn10: summary.isbn10,
      isbn13: summary.isbn13,
      asin: summary.asin,
      rankValue: summary.rankValue,
      ratingValue: summary.ratingValue ? asNumber(summary.ratingValue) : null,
      reviewCount: summary.reviewCount,
      salesValue: summary.salesValue ? asNumber(summary.salesValue) : null,
      observedAt: summary.observedAt?.toISOString() ?? null,
      freshnessBucket: summary.freshnessBucket,
      varianceNotes: summary.varianceNotes,
      matchMethod: match?.matchMethod ?? null,
      matchType: (match?.matchType as 'exact' | 'probable' | 'manual' | null) ?? null,
      matchScore: match?.matchScore ? asNumber(match.matchScore) : null
    };
  });
}

export async function listManualReviewQueue(ctx: AnalyticsContext, organizationId: string): Promise<ManualReviewQueueRow[]> {
  await requireOrganizationMember(ctx, organizationId);
  const records = await ctx.db.select().from(sourceRecords).where(and(eq(sourceRecords.organizationId, organizationId), eq(sourceRecords.ingestionStatus, 'needs_review')));
  const providerIds = [...new Set(records.map((record) => record.sourceProviderId))];
  const providers = providerIds.length ? await ctx.db.select().from(sourceProviders).where(inArray(sourceProviders.id, providerIds)) : [];
  const matches = records.length ? await ctx.db.select().from(sourceRecordMatches).where(inArray(sourceRecordMatches.sourceRecordId, records.map((record) => record.id))) : [];
  const candidateWorkIds = [...new Set(matches.map((match) => match.workId))];
  const candidateWorks = candidateWorkIds.length ? await ctx.db.select().from(works).where(inArray(works.id, candidateWorkIds)) : [];
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const workById = new Map(candidateWorks.map((work) => [work.id, work]));
  return records.map((record) => ({
    sourceRecordId: record.id,
    title: record.rawTitle,
    creator: record.rawCreator,
    publisher: record.rawPublisher,
    sourceProviderId: record.sourceProviderId,
    sourceProviderName: providerById.get(record.sourceProviderId)?.name ?? 'Unknown',
    sourceProviderSlug: providerById.get(record.sourceProviderId)?.slug ?? 'unknown',
    observedAt: record.observedAt?.toISOString() ?? null,
    ingestionStatus: record.ingestionStatus,
    candidates: matches.filter((match) => match.sourceRecordId === record.id).map((match) => ({
      id: match.id,
      workId: match.workId,
      title: workById.get(match.workId)?.title ?? 'Unknown work',
      publisher: workById.get(match.workId)?.publisher ?? null,
      matchMethod: match.matchMethod,
      matchType: match.matchType as 'exact' | 'probable' | 'manual',
      matchScore: asNumber(match.matchScore),
      matchedOn: (match.matchedOn ?? {}) as Record<string, unknown>,
      isSelected: match.isSelected
    }))
  }));
}

export async function selectManualMatch(ctx: AnalyticsContext, input: { sourceRecordId: string; workId: string }) {
  const [record] = await ctx.db.select().from(sourceRecords).where(eq(sourceRecords.id, input.sourceRecordId)).limit(1);
  if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source record not found.' });
  const userId = ctx.user?.id ?? null;
  await requireOrganizationAdmin(ctx, record.organizationId);
  let candidates = await findMatchCandidates(ctx, record);
  if (!candidates.some((candidate) => candidate.workId === input.workId)) {
    candidates = [{ workId: input.workId, matchMethod: 'manual', matchScore: 0.5, matchType: 'manual', matchedOn: { manual: true }, select: true }, ...candidates];
  }
  const matches = await upsertMatchCandidates(ctx, record.id, candidates, userId, input.workId);
  const selected = matches.find((match) => match.isSelected);
  if (!selected) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unable to select match.' });
  await syncExternalId(ctx, { workId: input.workId, sourceProviderId: record.sourceProviderId, externalId: record.externalId ?? record.rawAsin ?? record.rawIsbn13 ?? record.rawIsbn10, externalUrl: record.externalUrl, matchType: 'manual' });
  await ctx.db.update(sourceRecords).set({ ingestionStatus: 'matched' }).where(eq(sourceRecords.id, record.id));
  await rebuildWorkSummaries(ctx, input.workId);
  return { success: true };
}

export async function createWorkFromSourceRecord(ctx: AnalyticsContext, input: { sourceRecordId: string }) {
  const [record] = await ctx.db.select().from(sourceRecords).where(eq(sourceRecords.id, input.sourceRecordId)).limit(1);
  if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source record not found.' });
  await requireOrganizationAdmin(ctx, record.organizationId);
  const [work] = await ctx.db.insert(works).values({ organizationId: record.organizationId, title: record.rawTitle, canonicalTitle: record.rawTitle, mediaType: 'book', language: record.rawLanguage, region: record.rawRegion, publisher: record.rawPublisher, status: 'active' }).returning();
  await selectManualMatch(ctx, { sourceRecordId: record.id, workId: work.id });
  return work;
}

export async function rebuildBatchSummaries(ctx: AnalyticsContext, batchId: string) {
  const [batch] = await ctx.db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Import batch not found.' });
  await requireOrganizationAdmin(ctx, batch.organizationId);
  await matchSourceRecordsForBatch(ctx, { batchId, selectedBy: ctx.user?.id ?? null });
  return { success: true };
}
