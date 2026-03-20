import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import {
  franchises,
  importBatches,
  ipScores,
  leaderboardSnapshots,
  normalizedObservations,
  qualityFlags,
  rawObservations,
  scoreComponents,
  sourceProviders,
  workExternalIds,
  workScores,
  works
} from '@null/db';
import type {
  AccessType,
  AnalyticsIp,
  AnalyticsMediaType,
  AnalyticsMetricType,
  AnalyticsProvenanceTag,
  AnalyticsQueryResult,
  AnalyticsTimeWindow,
  AnalyticsWork,
  CsvValidationError,
  FreshnessRow,
  ImportBatchSummary,
  IpDetail,
  IpLeaderboardRow,
  LeaderboardFilters,
  LeaderboardRow,
  MetricObservation,
  QualityFlagRow,
  ScoreComponentBreakdown,
  ScoreComponentType,
  SourceFamily,
  SourceProviderRecord,
  WorkDetail,
  WorkExternalIdRecord
} from '@null/domain';
import {
  analyticsTimeWindows,
  availableResult,
  buildImportedMetrics,
  canonicalizeTitle,
  coerceBoolean,
  coerceNumber,
  computeCompositeScore,
  formatScoreDate,
  getConfidenceBand,
  getWindowStart,
  lowReviewSampleThreshold,
  median,
  parseCsv,
  parseJsonObject,
  rankJumpThreshold,
  roundConfidence,
  roundScore,
  scoreAwardObservations,
  scoreConfidence,
  scoreMomentumObservations,
  scoreRankingObservations,
  scoreReviewObservations,
  scoreSalesObservations,
  scoreComponentTypes,
  scoreComponentWeights,
  sourceFreshnessHours,
  unavailableResult,
  validateCsvHeaders,
  validateCsvRow,
  spikeMultiplierThreshold,
  slugify
} from '@null/domain';
import type { TRPCContext } from './context';
import { requireOrganizationAdmin, requireOrganizationMember } from './auth';
import { ingestSourceRecordsForBatch, matchSourceRecordsForBatch } from './entity-resolution-repo';

type AnalyticsContext = Pick<TRPCContext, 'db' | 'user'>;
type RawMetadata = Record<string, unknown>;

export type UploadImportResult = {
  batch: ImportBatchSummary | null;
  storedRowCount: number;
  errorCount: number;
  errors: CsvValidationError[];
};

export type NormalizationResult = {
  normalizedCount: number;
  unresolvedCount: number;
  flagCount: number;
};

export type ScoreRebuildResult = {
  scoreDate: string;
  workScoreCount: number;
  ipScoreCount: number;
  componentCount: number;
};

const analyticsUnavailableMessage =
  'Analytics schema is unavailable. Apply the deferred Supabase changes before using this feature.';

function isAnalyticsUnavailableError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  return ['42P01', '42703', '42704'].includes(code);
}

async function withAnalyticsQuery<T>(fallback: T, action: () => Promise<T>): Promise<AnalyticsQueryResult<T>> {
  try {
    return availableResult(await action());
  } catch (error) {
    if (isAnalyticsUnavailableError(error)) {
      return unavailableResult(fallback, analyticsUnavailableMessage);
    }
    throw error;
  }
}

function ensureAnalyticsMutationAvailable(error: unknown): never {
  if (isAnalyticsUnavailableError(error)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: analyticsUnavailableMessage
    });
  }
  throw error;
}

function requireUser(ctx: AnalyticsContext): string {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to use analytics.'
    });
  }
  return ctx.user.id;
}

function asTimestamp(value: Date | string | null | undefined): number {
  if (!value) {
    return 0;
  }
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sortByNewest<T>(rows: T[], accessor: (row: T) => Date | string | null | undefined): T[] {
  return [...rows].sort((left, right) => asTimestamp(accessor(right)) - asTimestamp(accessor(left)));
}

function selectBestProvenance(tags: AnalyticsProvenanceTag[]): AnalyticsProvenanceTag {
  const order: AnalyticsProvenanceTag[] = ['direct', 'estimated', 'engagement', 'awards', 'metadata'];
  return order.find((tag) => tags.includes(tag)) ?? 'metadata';
}

function mapIp(row: typeof franchises.$inferSelect, workCount: number): AnalyticsIp {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    primaryCategory: row.primaryCategory as AnalyticsMediaType | null,
    status: row.status,
    workCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapWork(
  row: typeof works.$inferSelect,
  ipName: string | null,
  externalIdCount: number
): AnalyticsWork {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ipId: row.franchiseId,
    ipName,
    title: row.title,
    canonicalTitle: row.canonicalTitle,
    mediaType: row.mediaType as AnalyticsMediaType,
    seriesName: row.seriesName,
    volumeNumber: row.volumeNumber,
    releaseDate: row.releaseDate ? String(row.releaseDate) : null,
    language: row.language,
    region: row.region,
    publisher: row.publisher,
    status: row.status,
    externalIdCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapSourceProvider(
  row: typeof sourceProviders.$inferSelect,
  importCount = 0,
  lastImportAt: Date | null = null
): SourceProviderRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sourceFamily: row.sourceFamily as SourceFamily,
    accessType: row.accessType as AccessType,
    confidenceTier: row.confidenceTier,
    isActive: row.isActive,
    createdAt: row.createdAt,
    importCount,
    lastImportAt
  };
}

function mapExternalId(
  row: typeof workExternalIds.$inferSelect,
  provider: typeof sourceProviders.$inferSelect | undefined
): WorkExternalIdRecord {
  return {
    id: row.id,
    workId: row.workId,
    sourceProviderId: row.sourceProviderId,
    sourceProviderName: provider?.name ?? 'Unknown source',
    sourceProviderSlug: provider?.slug ?? 'unknown',
    externalId: row.externalId,
    externalUrl: row.externalUrl,
    matchType: row.matchType,
    createdAt: row.createdAt
  };
}

async function getOrganizationAnalyticsBase(ctx: AnalyticsContext, organizationId: string) {
  const [ipRows, workRows] = await Promise.all([
    ctx.db.select().from(franchises).where(eq(franchises.organizationId, organizationId)),
    ctx.db.select().from(works).where(eq(works.organizationId, organizationId))
  ]);

  return {
    ipRows,
    workRows,
    providerRows: [] // Providers are fetched separately when needed to avoid loading ALL providers
  };
}

async function getWorkOrganizationId(ctx: AnalyticsContext, workId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: works.organizationId })
    .from(works)
    .where(eq(works.id, workId))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Work not found.' });
  }
  return row.organizationId;
}

async function getIpOrganizationId(ctx: AnalyticsContext, ipId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: franchises.organizationId })
    .from(franchises)
    .where(eq(franchises.id, ipId))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'IP not found.' });
  }
  return row.organizationId;
}

export async function listAnalyticsIps(
  ctx: AnalyticsContext,
  input: { organizationId: string; query?: string; status?: string }
): Promise<AnalyticsQueryResult<AnalyticsIp[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery([], async () => {
    const { ipRows, workRows } = await getOrganizationAnalyticsBase(ctx, input.organizationId);
    const workCountByIp = new Map<string, number>();
    workRows.forEach((row) => {
      if (row.franchiseId) {
        workCountByIp.set(row.franchiseId, (workCountByIp.get(row.franchiseId) ?? 0) + 1);
      }
    });

    const normalizedQuery = input.query ? canonicalizeTitle(input.query) : '';

    return ipRows
      .filter((row) => (input.status ? row.status === input.status : true))
      .filter((row) => {
        if (!normalizedQuery) {
          return true;
        }
        return canonicalizeTitle(`${row.name} ${row.description ?? ''}`).includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((row) => mapIp(row, workCountByIp.get(row.id) ?? 0));
  });
}

export async function getAnalyticsIp(
  ctx: AnalyticsContext,
  input: { organizationId: string; ipId: string }
): Promise<AnalyticsQueryResult<AnalyticsIp | null>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery<AnalyticsIp | null>(null, async () => {
    const [row] = await ctx.db
      .select()
      .from(franchises)
      .where(and(eq(franchises.id, input.ipId), eq(franchises.organizationId, input.organizationId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const ipWorks = await ctx.db.select({ id: works.id }).from(works).where(eq(works.franchiseId, row.id));
    return mapIp(row, ipWorks.length);
  });
}

export async function createAnalyticsIp(
  ctx: AnalyticsContext,
  input: {
    organizationId: string;
    name: string;
    slug?: string;
    description?: string;
    primaryCategory?: AnalyticsMediaType | null;
    status?: string;
  }
): Promise<AnalyticsIp> {
  await requireOrganizationAdmin(ctx, input.organizationId);

  try {
    const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
    const [conflict] = await ctx.db
      .select({ id: franchises.id })
      .from(franchises)
      .where(and(eq(franchises.organizationId, input.organizationId), eq(franchises.slug, slug)))
      .limit(1);

    if (conflict) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An IP with this slug already exists.'
      });
    }

    const [row] = await ctx.db
      .insert(franchises)
      .values({
        organizationId: input.organizationId,
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        primaryCategory: input.primaryCategory ?? null,
        status: input.status ?? 'active'
      })
      .returning();

    return mapIp(row, 0);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function updateAnalyticsIp(
  ctx: AnalyticsContext,
  input: {
    ipId: string;
    name?: string;
    slug?: string;
    description?: string | null;
    primaryCategory?: AnalyticsMediaType | null;
    status?: string;
  }
): Promise<AnalyticsIp> {
  const organizationId = await getIpOrganizationId(ctx, input.ipId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    const updates: Partial<typeof franchises.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }
    if (input.slug !== undefined) {
      updates.slug = slugify(input.slug);
    }
    if (input.description !== undefined) {
      updates.description = input.description?.trim() || null;
    }
    if (input.primaryCategory !== undefined) {
      updates.primaryCategory = input.primaryCategory;
    }
    if (input.status !== undefined) {
      updates.status = input.status;
    }

    const [row] = await ctx.db.update(franchises).set(updates).where(eq(franchises.id, input.ipId)).returning();
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'IP not found.' });
    }

    const ipWorks = await ctx.db.select({ id: works.id }).from(works).where(eq(works.franchiseId, row.id));
    return mapIp(row, ipWorks.length);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function deleteAnalyticsIp(
  ctx: AnalyticsContext,
  input: { ipId: string }
): Promise<{ success: true }> {
  const organizationId = await getIpOrganizationId(ctx, input.ipId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    await ctx.db.delete(franchises).where(eq(franchises.id, input.ipId));
    return { success: true };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function listWorks(
  ctx: AnalyticsContext,
  input: {
    organizationId: string;
    ipId?: string;
    query?: string;
    category?: AnalyticsMediaType | 'all';
    status?: string;
  }
): Promise<AnalyticsQueryResult<AnalyticsWork[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery([], async () => {
    const { ipRows, workRows } = await getOrganizationAnalyticsBase(ctx, input.organizationId);
    const ipById = new Map(ipRows.map((row) => [row.id, row]));
    const workIds = workRows.map((row) => row.id);
    const externalRows = workIds.length
      ? await ctx.db.select().from(workExternalIds).where(inArray(workExternalIds.workId, workIds))
      : [];

    const externalCountByWork = new Map<string, number>();
    externalRows.forEach((row) => {
      externalCountByWork.set(row.workId, (externalCountByWork.get(row.workId) ?? 0) + 1);
    });

    const normalizedQuery = input.query ? canonicalizeTitle(input.query) : '';

    return workRows
      .filter((row) => (input.ipId ? row.franchiseId === input.ipId : true))
      .filter((row) => (input.category && input.category !== 'all' ? row.mediaType === input.category : true))
      .filter((row) => (input.status ? row.status === input.status : true))
      .filter((row) => {
        if (!normalizedQuery) {
          return true;
        }
        const ipName = row.franchiseId ? ipById.get(row.franchiseId)?.name ?? '' : '';
        return canonicalizeTitle(`${row.title} ${row.canonicalTitle ?? ''} ${ipName}`).includes(normalizedQuery);
      })
      .sort((left, right) => left.title.localeCompare(right.title))
      .map((row) => mapWork(row, row.franchiseId ? ipById.get(row.franchiseId)?.name ?? null : null, externalCountByWork.get(row.id) ?? 0));
  });
}

export async function getWork(
  ctx: AnalyticsContext,
  input: { workId: string }
): Promise<AnalyticsQueryResult<(AnalyticsWork & { externalIds: WorkExternalIdRecord[] }) | null>> {
  const organizationId = await getWorkOrganizationId(ctx, input.workId);
  await requireOrganizationMember(ctx, organizationId);

  return withAnalyticsQuery<(AnalyticsWork & { externalIds: WorkExternalIdRecord[] }) | null>(null, async () => {
    const [workRow] = await ctx.db.select().from(works).where(eq(works.id, input.workId)).limit(1);
    if (!workRow) {
      return null;
    }

    const [ipRows, providerRows, externalRows] = await Promise.all([
      workRow.franchiseId ? ctx.db.select().from(franchises).where(eq(franchises.id, workRow.franchiseId)).limit(1) : Promise.resolve([]),
      ctx.db.select().from(sourceProviders),
      ctx.db.select().from(workExternalIds).where(eq(workExternalIds.workId, input.workId))
    ]);

    const providerById = new Map(providerRows.map((row) => [row.id, row]));

    return {
      ...mapWork(workRow, ipRows[0]?.name ?? null, externalRows.length),
      externalIds: externalRows.map((row) => mapExternalId(row, providerById.get(row.sourceProviderId)))
    };
  });
}

export async function createWork(
  ctx: AnalyticsContext,
  input: {
    organizationId: string;
    ipId?: string | null;
    title: string;
    mediaType: AnalyticsMediaType;
    seriesName?: string;
    volumeNumber?: number | null;
    releaseDate?: string | null;
    language?: string;
    region?: string;
    publisher?: string;
    status?: string;
  }
): Promise<AnalyticsWork> {
  await requireOrganizationAdmin(ctx, input.organizationId);

  try {
    const [row] = await ctx.db
      .insert(works)
      .values({
        organizationId: input.organizationId,
        franchiseId: input.ipId ?? null,
        title: input.title.trim(),
        canonicalTitle: canonicalizeTitle(input.title),
        mediaType: input.mediaType,
        seriesName: input.seriesName?.trim() || null,
        volumeNumber: input.volumeNumber ?? null,
        releaseDate: input.releaseDate ?? null,
        language: input.language?.trim() || null,
        region: input.region?.trim() || null,
        publisher: input.publisher?.trim() || null,
        status: input.status ?? 'active'
      })
      .returning();

    let ipName: string | null = null;
    if (row.franchiseId) {
      const [ipRow] = await ctx.db.select().from(franchises).where(eq(franchises.id, row.franchiseId)).limit(1);
      ipName = ipRow?.name ?? null;
    }

    return mapWork(row, ipName, 0);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function updateWork(
  ctx: AnalyticsContext,
  input: {
    workId: string;
    ipId?: string | null;
    title?: string;
    mediaType?: AnalyticsMediaType;
    seriesName?: string | null;
    volumeNumber?: number | null;
    releaseDate?: string | null;
    language?: string | null;
    region?: string | null;
    publisher?: string | null;
    status?: string;
  }
): Promise<AnalyticsWork> {
  const organizationId = await getWorkOrganizationId(ctx, input.workId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    const updates: Partial<typeof works.$inferInsert> = { updatedAt: new Date() };
    if (input.ipId !== undefined) {
      updates.franchiseId = input.ipId ?? null;
    }
    if (input.title !== undefined) {
      updates.title = input.title.trim();
      updates.canonicalTitle = canonicalizeTitle(input.title);
    }
    if (input.mediaType !== undefined) {
      updates.mediaType = input.mediaType;
    }
    if (input.seriesName !== undefined) {
      updates.seriesName = input.seriesName?.trim() || null;
    }
    if (input.volumeNumber !== undefined) {
      updates.volumeNumber = input.volumeNumber ?? null;
    }
    if (input.releaseDate !== undefined) {
      updates.releaseDate = input.releaseDate ?? null;
    }
    if (input.language !== undefined) {
      updates.language = input.language?.trim() || null;
    }
    if (input.region !== undefined) {
      updates.region = input.region?.trim() || null;
    }
    if (input.publisher !== undefined) {
      updates.publisher = input.publisher?.trim() || null;
    }
    if (input.status !== undefined) {
      updates.status = input.status;
    }

    const [row] = await ctx.db.update(works).set(updates).where(eq(works.id, input.workId)).returning();
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Work not found.' });
    }

    const externalRows = await ctx.db.select().from(workExternalIds).where(eq(workExternalIds.workId, row.id));
    let ipName: string | null = null;
    if (row.franchiseId) {
      const [ipRow] = await ctx.db.select().from(franchises).where(eq(franchises.id, row.franchiseId)).limit(1);
      ipName = ipRow?.name ?? null;
    }

    return mapWork(row, ipName, externalRows.length);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function deleteWork(
  ctx: AnalyticsContext,
  input: { workId: string }
): Promise<{ success: true }> {
  const organizationId = await getWorkOrganizationId(ctx, input.workId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    await ctx.db.delete(works).where(eq(works.id, input.workId));
    return { success: true };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function listSourceProviders(
  ctx: AnalyticsContext,
  input: { organizationId: string }
): Promise<AnalyticsQueryResult<SourceProviderRecord[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery([], async () => {
    // Only fetch batches for this organization
    const batchRows = await ctx.db
      .select()
      .from(importBatches)
      .where(eq(importBatches.organizationId, input.organizationId));

    // Get unique provider IDs used by this org
    const providerIds = [...new Set(batchRows.map((row) => row.sourceProviderId))];

    // If no imports, return empty list
    if (providerIds.length === 0) {
      return [];
    }

    // Fetch only providers used by this organization
    const providerRows = await ctx.db
      .select()
      .from(sourceProviders)
      .where(inArray(sourceProviders.id, providerIds));

    const batchMap = new Map<string, Array<typeof importBatches.$inferSelect>>();
    batchRows.forEach((row) => {
      const current = batchMap.get(row.sourceProviderId) ?? [];
      current.push(row);
      batchMap.set(row.sourceProviderId, current);
    });

    return providerRows
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((row) => {
        const batches = sortByNewest(batchMap.get(row.id) ?? [], (entry) => entry.completedAt ?? entry.createdAt);
        return mapSourceProvider(row, batches.length, batches[0]?.completedAt ?? batches[0]?.createdAt ?? null);
      });
  });
}

export async function createSourceProvider(
  ctx: AnalyticsContext,
  input: {
    organizationId: string;
    slug: string;
    name: string;
    sourceFamily: SourceFamily;
    accessType: AccessType;
    confidenceTier: 'gold' | 'silver' | 'bronze' | 'community';
    isActive?: boolean;
  }
): Promise<SourceProviderRecord> {
  await requireOrganizationAdmin(ctx, input.organizationId);

  try {
    const [row] = await ctx.db
      .insert(sourceProviders)
      .values({
        slug: slugify(input.slug),
        name: input.name.trim(),
        sourceFamily: input.sourceFamily,
        accessType: input.accessType,
        confidenceTier: input.confidenceTier,
        isActive: input.isActive ?? true
      })
      .returning();

    return mapSourceProvider(row);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function updateSourceProvider(
  ctx: AnalyticsContext,
  input: {
    organizationId: string;
    sourceProviderId: string;
    slug?: string;
    name?: string;
    sourceFamily?: SourceFamily;
    accessType?: AccessType;
    confidenceTier?: 'gold' | 'silver' | 'bronze' | 'community';
    isActive?: boolean;
  }
): Promise<SourceProviderRecord> {
  await requireOrganizationAdmin(ctx, input.organizationId);

  try {
    const updates: Partial<typeof sourceProviders.$inferInsert> = {};
    if (input.slug !== undefined) {
      updates.slug = slugify(input.slug);
    }
    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }
    if (input.sourceFamily !== undefined) {
      updates.sourceFamily = input.sourceFamily;
    }
    if (input.accessType !== undefined) {
      updates.accessType = input.accessType;
    }
    if (input.confidenceTier !== undefined) {
      updates.confidenceTier = input.confidenceTier;
    }
    if (input.isActive !== undefined) {
      updates.isActive = input.isActive;
    }

    const [row] = await ctx.db
      .update(sourceProviders)
      .set(updates)
      .where(eq(sourceProviders.id, input.sourceProviderId))
      .returning();

    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Source provider not found.' });
    }

    return mapSourceProvider(row);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function deleteSourceProvider(
  ctx: AnalyticsContext,
  input: { organizationId: string; sourceProviderId: string }
): Promise<{ success: true }> {
  await requireOrganizationAdmin(ctx, input.organizationId);

  try {
    await ctx.db.delete(sourceProviders).where(eq(sourceProviders.id, input.sourceProviderId));
    return { success: true };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function listExternalIdsByWork(
  ctx: AnalyticsContext,
  input: { workId: string }
): Promise<AnalyticsQueryResult<WorkExternalIdRecord[]>> {
  const organizationId = await getWorkOrganizationId(ctx, input.workId);
  await requireOrganizationMember(ctx, organizationId);

  return withAnalyticsQuery([], async () => {
    const [externalRows, providerRows] = await Promise.all([
      ctx.db.select().from(workExternalIds).where(eq(workExternalIds.workId, input.workId)),
      ctx.db.select().from(sourceProviders)
    ]);
    const providerById = new Map(providerRows.map((row) => [row.id, row]));
    return externalRows.map((row) => mapExternalId(row, providerById.get(row.sourceProviderId)));
  });
}

export async function createExternalId(
  ctx: AnalyticsContext,
  input: {
    workId: string;
    sourceProviderId: string;
    externalId: string;
    externalUrl?: string;
    matchType?: 'exact' | 'probable' | 'manual';
  }
): Promise<WorkExternalIdRecord> {
  const organizationId = await getWorkOrganizationId(ctx, input.workId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    const [row] = await ctx.db
      .insert(workExternalIds)
      .values({
        workId: input.workId,
        sourceProviderId: input.sourceProviderId,
        externalId: input.externalId.trim(),
        externalUrl: input.externalUrl?.trim() || null,
        matchType: input.matchType ?? 'manual'
      })
      .returning();

    const [provider] = await ctx.db
      .select()
      .from(sourceProviders)
      .where(eq(sourceProviders.id, row.sourceProviderId))
      .limit(1);

    return mapExternalId(row, provider);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function deleteExternalId(
  ctx: AnalyticsContext,
  input: { externalIdId: string }
): Promise<{ success: true }> {
  const [row] = await ctx.db
    .select({ workId: workExternalIds.workId })
    .from(workExternalIds)
    .where(eq(workExternalIds.id, input.externalIdId))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'External ID not found.' });
  }

  const organizationId = await getWorkOrganizationId(ctx, row.workId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    await ctx.db.delete(workExternalIds).where(eq(workExternalIds.id, input.externalIdId));
    return { success: true };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

function makeDuplicateKey(
  workId: string,
  sourceProviderId: string,
  metricType: AnalyticsMetricType,
  observedAt: Date | string
): string {
  return `${workId}:${sourceProviderId}:${metricType}:${new Date(observedAt).toISOString()}`;
}

function rawObservationToCsvShape(record: typeof rawObservations.$inferSelect): Record<string, string> {
  const metadata = ((record.metadataJson ?? {}) as RawMetadata) ?? {};
  return {
    source_provider: String(metadata.source_provider ?? ''),
    observed_at: toIsoString(record.observedAt) ?? '',
    title: record.rawWorkTitle ?? '',
    ip_name: record.rawIpName ?? '',
    media_type: String(metadata.media_type ?? record.rawCategory ?? ''),
    region: record.rawRegion ?? '',
    language: record.rawLanguage ?? '',
    external_id: String(metadata.external_id ?? ''),
    external_url: String(metadata.external_url ?? ''),
    rank_value: record.rankValue === null ? '' : String(record.rankValue),
    rating_value: record.ratingValue === null ? '' : String(record.ratingValue),
    review_count: record.reviewCount === null ? '' : String(record.reviewCount),
    view_count: record.viewCount === null ? '' : String(record.viewCount),
    engagement_count: record.engagementCount === null ? '' : String(record.engagementCount),
    sales_value: record.salesValue === null ? '' : String(record.salesValue),
    sales_is_estimated: record.salesIsEstimated === null ? '' : String(record.salesIsEstimated),
    award_name: String(metadata.award_name ?? ''),
    award_result: String(metadata.award_result ?? ''),
    search_interest: String(metadata.search_interest ?? '')
  };
}

function combineAwardValue(row: Record<string, string>): string | null {
  const parts = [row.award_name?.trim(), row.award_result?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(': ') : null;
}

async function getBatchOrganizationId(ctx: AnalyticsContext, batchId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: importBatches.organizationId })
    .from(importBatches)
    .where(eq(importBatches.id, batchId))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Import batch not found.' });
  }

  return row.organizationId;
}

async function getRawObservationOrganizationId(ctx: AnalyticsContext, rawObservationId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: importBatches.organizationId })
    .from(rawObservations)
    .innerJoin(importBatches, eq(rawObservations.importBatchId, importBatches.id))
    .where(eq(rawObservations.id, rawObservationId))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Raw observation not found.' });
  }

  return row.organizationId;
}

async function getFlagOrganizationId(ctx: AnalyticsContext, flagId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ workId: qualityFlags.workId, rawObservationId: qualityFlags.rawObservationId })
    .from(qualityFlags)
    .where(eq(qualityFlags.id, flagId))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Quality flag not found.' });
  }

  if (row.workId) {
    return getWorkOrganizationId(ctx, row.workId);
  }

  if (row.rawObservationId) {
    return getRawObservationOrganizationId(ctx, row.rawObservationId);
  }

  throw new TRPCError({ code: 'NOT_FOUND', message: 'Quality flag organization not found.' });
}

async function getImportBatchSummaries(ctx: AnalyticsContext, organizationId: string): Promise<ImportBatchSummary[]> {
  const batches = await ctx.db
    .select()
    .from(importBatches)
    .where(eq(importBatches.organizationId, organizationId))
    .orderBy(desc(importBatches.createdAt));

  if (batches.length === 0) {
    return [];
  }

  const batchIds = batches.map((batch) => batch.id);

  // Fetch only providers used by this organization's batches (not ALL providers)
  const batchProviders = await ctx.db
    .select({ id: sourceProviders.id, name: sourceProviders.name, slug: sourceProviders.slug })
    .from(sourceProviders)
    .where(
      inArray(
        sourceProviders.id,
        batches.map((b) => b.sourceProviderId)
      )
    );
  const providerById = new Map(batchProviders.map((provider) => [provider.id, provider]));

  // Use COUNT aggregations instead of fetching all rows then counting
  const rawRows = await ctx.db
    .select({ 
      id: rawObservations.id, 
      importBatchId: rawObservations.importBatchId 
    })
    .from(rawObservations)
    .where(inArray(rawObservations.importBatchId, batchIds));
  
  const rawIds = rawRows.map((row) => row.id);
  const rawToBatch = new Map(rawRows.map((row) => [row.id, row.importBatchId]));

  // Only fetch normalized and quality flags if we have raw observations
  if (rawIds.length === 0) {
    return batches.map((batch) => ({
      id: batch.id,
      organizationId: batch.organizationId,
      sourceProviderId: batch.sourceProviderId,
      sourceProviderName: providerById.get(batch.sourceProviderId)?.name ?? 'Unknown source',
      sourceProviderSlug: providerById.get(batch.sourceProviderId)?.slug ?? 'unknown',
      importType: batch.importType,
      status: batch.status,
      rowCount: batch.rowCount,
      errorCount: batch.errorCount,
      normalizedCount: 0,
      unresolvedFlagCount: 0,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      createdAt: batch.createdAt
    }));
  }

  const [normalizedRows, unresolvedRows] = await Promise.all([
    ctx.db
      .select({ rawObservationId: normalizedObservations.rawObservationId })
      .from(normalizedObservations)
      .where(inArray(normalizedObservations.rawObservationId, rawIds)),
    ctx.db
      .select({ rawObservationId: qualityFlags.rawObservationId })
      .from(qualityFlags)
      .where(and(inArray(qualityFlags.rawObservationId, rawIds), isNull(qualityFlags.resolvedAt)))
  ]);

  const normalizedCountByBatch = new Map<string, number>();
  normalizedRows.forEach((row) => {
    const batchId = rawToBatch.get(row.rawObservationId);
    if (batchId) {
      normalizedCountByBatch.set(batchId, (normalizedCountByBatch.get(batchId) ?? 0) + 1);
    }
  });

  const unresolvedCountByBatch = new Map<string, number>();
  unresolvedRows.forEach((row) => {
    if (row.rawObservationId) {
      const batchId = rawToBatch.get(row.rawObservationId);
      if (batchId) {
        unresolvedCountByBatch.set(batchId, (unresolvedCountByBatch.get(batchId) ?? 0) + 1);
      }
    }
  });

  return batches.map((batch) => ({
    id: batch.id,
    organizationId: batch.organizationId,
    sourceProviderId: batch.sourceProviderId,
    sourceProviderName: providerById.get(batch.sourceProviderId)?.name ?? 'Unknown source',
    sourceProviderSlug: providerById.get(batch.sourceProviderId)?.slug ?? 'unknown',
    importType: batch.importType,
    status: batch.status,
    rowCount: batch.rowCount,
    errorCount: batch.errorCount,
    normalizedCount: normalizedCountByBatch.get(batch.id) ?? 0,
    unresolvedFlagCount: unresolvedCountByBatch.get(batch.id) ?? 0,
    startedAt: batch.startedAt,
    completedAt: batch.completedAt,
    createdAt: batch.createdAt
  }));
}

type MatchResult =
  | {
      work: typeof works.$inferSelect;
      confidence: number;
      matchType: 'exact' | 'probable' | 'manual';
    }
  | {
      work: null;
      confidence: 0;
      matchType: 'manual';
    };

function matchRawObservationToWork(
  raw: typeof rawObservations.$inferSelect,
  workRows: Array<typeof works.$inferSelect>,
  ipRows: Array<typeof franchises.$inferSelect>,
  externalRows: Array<typeof workExternalIds.$inferSelect>
): MatchResult {
  const metadata = ((raw.metadataJson ?? {}) as RawMetadata) ?? {};
  const externalId = String(metadata.external_id ?? '').trim();
  const workById = new Map(workRows.map((row) => [row.id, row]));
  const ipById = new Map(ipRows.map((row) => [row.id, row]));
  const externalMap = new Map<string, typeof works.$inferSelect>();
  externalRows.forEach((row) => {
    const work = workById.get(row.workId);
    if (work) {
      externalMap.set(`${row.sourceProviderId}:${row.externalId}`, work);
    }
  });

  if (externalId) {
    const directMatch = externalMap.get(`${raw.sourceProviderId}:${externalId}`);
    if (directMatch) {
      return {
        work: directMatch,
        confidence: 1,
        matchType: 'exact'
      };
    }
  }

  const rawTitle = canonicalizeTitle(raw.rawWorkTitle ?? '');
  const rawIpName = canonicalizeTitle(raw.rawIpName ?? '');
  const rawMediaType = String(metadata.media_type ?? raw.rawCategory ?? '').trim();

  let bestScore = 0;
  let bestWork: typeof works.$inferSelect | null = null;

  workRows.forEach((work) => {
    let score = 0;
    if (canonicalizeTitle(work.canonicalTitle || work.title) === rawTitle) {
      score += 3;
    }
    if (rawIpName && work.franchiseId && canonicalizeTitle(ipById.get(work.franchiseId)?.name ?? '') === rawIpName) {
      score += 2;
    }
    if (rawMediaType && work.mediaType === rawMediaType) {
      score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestWork = work;
    }
  });

  if (!bestWork || bestScore < 3) {
    return {
      work: null,
      confidence: 0,
      matchType: 'manual'
    };
  }

  return {
    work: bestWork,
    confidence: bestScore >= 5 ? 0.9 : 0.76,
    matchType: bestScore >= 5 ? 'probable' : 'manual'
  };
}

export async function listImportBatches(
  ctx: AnalyticsContext,
  input: { organizationId: string }
): Promise<AnalyticsQueryResult<ImportBatchSummary[]>> {
  await requireOrganizationMember(ctx, input.organizationId);
  return withAnalyticsQuery([], async () => getImportBatchSummaries(ctx, input.organizationId));
}

export async function uploadCsvImport(
  ctx: AnalyticsContext,
  input: {
    organizationId: string;
    sourceProviderId: string;
    fileName: string;
    csvText: string;
  }
): Promise<UploadImportResult> {
  const userId = requireUser(ctx);
  await requireOrganizationAdmin(ctx, input.organizationId);

  try {
    const [provider] = await ctx.db
      .select()
      .from(sourceProviders)
      .where(eq(sourceProviders.id, input.sourceProviderId))
      .limit(1);

    if (!provider) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Source provider not found.' });
    }

    const [batch] = await ctx.db
      .insert(importBatches)
      .values({
        organizationId: input.organizationId,
        sourceProviderId: provider.id,
        importType: 'csv',
        uploadedBy: userId,
        status: 'processing',
        startedAt: new Date()
      })
      .returning();

    const headerLine = input.csvText.split(/\r?\n/, 1)[0] ?? '';
    const headers = headerLine.split(',').map((header) => header.trim());
    const missingHeaders = validateCsvHeaders(headers);
    const parsedRows = parseCsv(input.csvText);

    if (missingHeaders.length > 0 || parsedRows.length === 0) {
      const errors =
        missingHeaders.length > 0
          ? missingHeaders.map((header) => ({
              line: 1,
              field: header,
              message: `Missing required CSV header "${header}".`
            }))
          : [{ line: 1, message: 'CSV file does not contain any data rows.' }];

      await ctx.db
        .update(importBatches)
        .set({
          status: 'failed',
          rowCount: 0,
          errorCount: errors.length,
          completedAt: new Date()
        })
        .where(eq(importBatches.id, batch.id));

      return {
        batch: {
          id: batch.id,
          organizationId: batch.organizationId,
          sourceProviderId: batch.sourceProviderId,
          sourceProviderName: provider.name,
          sourceProviderSlug: provider.slug,
          importType: batch.importType,
          status: 'failed',
          rowCount: 0,
          errorCount: errors.length,
          normalizedCount: 0,
          unresolvedFlagCount: 0,
          startedAt: batch.startedAt,
          completedAt: new Date(),
          createdAt: batch.createdAt
        },
        storedRowCount: 0,
        errorCount: errors.length,
        errors
      };
    }

    const validRows: typeof parsedRows = [];
    const errors: CsvValidationError[] = [];

    parsedRows.forEach((row) => {
      const rowErrors = validateCsvRow(row.values).map((error) => ({
        ...error,
        line: row.line
      }));

      const providerValue = row.values.source_provider?.trim().toLowerCase();
      if (providerValue && ![provider.slug.toLowerCase(), provider.name.toLowerCase()].includes(providerValue)) {
        rowErrors.push({
          line: row.line,
          field: 'source_provider',
          message: `Row source_provider "${row.values.source_provider}" does not match the selected provider.`
        });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        return;
      }

      validRows.push(row);
    });

    if (validRows.length > 0) {
      await ctx.db.insert(rawObservations).values(
        validRows.map((row) => {
          const metadata = {
            ...parseJsonObject(row.values.metadata_json),
            file_name: input.fileName,
            source_provider: row.values.source_provider,
            external_id: row.values.external_id,
            external_url: row.values.external_url,
            media_type: row.values.media_type,
            award_name: row.values.award_name ?? null,
            award_result: row.values.award_result ?? null,
            search_interest: coerceNumber(row.values.search_interest),
            original_row: row.values
          };

          return {
            importBatchId: batch.id,
            sourceProviderId: provider.id,
            rawWorkTitle: row.values.title.trim(),
            rawIpName: row.values.ip_name.trim(),
            rawAuthorOrCreator: row.values.author?.trim() || row.values.creator?.trim() || null,
            rawCategory: row.values.media_type.trim(),
            rawRegion: row.values.region.trim(),
            rawLanguage: row.values.language.trim(),
            observedAt: new Date(row.values.observed_at),
            rankValue: coerceNumber(row.values.rank_value),
            ratingValue: coerceNumber(row.values.rating_value)?.toString() ?? null,
            reviewCount: coerceNumber(row.values.review_count),
            viewCount: coerceNumber(row.values.view_count),
            engagementCount: coerceNumber(row.values.engagement_count),
            salesValue: coerceNumber(row.values.sales_value)?.toString() ?? null,
            salesIsEstimated: coerceBoolean(row.values.sales_is_estimated),
            awardsValue: combineAwardValue(row.values),
            metadataJson: metadata
          };
        })
      );
      await ingestSourceRecordsForBatch(ctx, batch.id, validRows.map((row) => ({
        ...row.values,
        title: row.values.title,
        author: row.values.author ?? row.values.creator ?? null,
        creator: row.values.creator ?? row.values.author ?? null,
        publisher: row.values.publisher ?? null,
        asin: row.values.asin ?? null,
        isbn_10: row.values.isbn_10 ?? row.values.isbn10 ?? null,
        isbn_13: row.values.isbn_13 ?? row.values.isbn13 ?? null,
        rating_value: row.values.rating_value ?? row.values.rating_avg_text ?? null,
        review_count: row.values.review_count ?? row.values.ratings_count_text ?? null,
        rank_value: row.values.rank_value ?? row.values.bestseller_rank_raw ?? null,
        observed_at: row.values.observed_at
      })));
      await matchSourceRecordsForBatch(ctx, { batchId: batch.id, selectedBy: userId });
    }

    const status = validRows.length === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'complete';
    const [updated] = await ctx.db
      .update(importBatches)
      .set({
        status,
        rowCount: validRows.length,
        errorCount: errors.length,
        completedAt: new Date()
      })
      .where(eq(importBatches.id, batch.id))
      .returning();

    return {
      batch: {
        id: updated.id,
        organizationId: updated.organizationId,
        sourceProviderId: updated.sourceProviderId,
        sourceProviderName: provider.name,
        sourceProviderSlug: provider.slug,
        importType: updated.importType,
        status: updated.status,
        rowCount: updated.rowCount,
        errorCount: updated.errorCount,
        normalizedCount: 0,
        unresolvedFlagCount: 0,
        startedAt: updated.startedAt,
        completedAt: updated.completedAt,
        createdAt: updated.createdAt
      },
      storedRowCount: validRows.length,
      errorCount: errors.length,
      errors
    };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function normalizeImportBatch(
  ctx: AnalyticsContext,
  input: { batchId: string }
): Promise<NormalizationResult> {
  const organizationId = await getBatchOrganizationId(ctx, input.batchId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    const [batch] = await ctx.db.select().from(importBatches).where(eq(importBatches.id, input.batchId)).limit(1);
    if (!batch) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Import batch not found.' });
    }

    const rawRows = await ctx.db.select().from(rawObservations).where(eq(rawObservations.importBatchId, batch.id));
    if (rawRows.length === 0) {
      return {
        normalizedCount: 0,
        unresolvedCount: 0,
        flagCount: 0
      };
    }

    const { ipRows, workRows } = await getOrganizationAnalyticsBase(ctx, batch.organizationId);
    const workIds = workRows.map((row) => row.id);
    const externalRows = workIds.length
      ? await ctx.db.select().from(workExternalIds).where(inArray(workExternalIds.workId, workIds))
      : [];
    const existingNormalized = workIds.length
      ? await ctx.db.select().from(normalizedObservations).where(inArray(normalizedObservations.workId, workIds))
      : [];

    const rawIds = rawRows.map((row) => row.id);
    await ctx.db.delete(normalizedObservations).where(inArray(normalizedObservations.rawObservationId, rawIds));
    await ctx.db
      .delete(qualityFlags)
      .where(and(inArray(qualityFlags.rawObservationId, rawIds), isNull(qualityFlags.resolvedAt)));

    const duplicateKeys = new Set(
      existingNormalized.map((row) => makeDuplicateKey(row.workId, row.sourceProviderId, row.metricType as AnalyticsMetricType, row.observedAt))
    );

    const historyByMetric = new Map<string, Array<{ observedAt: Date; value: number }>>();
    existingNormalized.forEach((row) => {
      const key = `${row.workId}:${row.metricType}`;
      const current = historyByMetric.get(key) ?? [];
      current.push({ observedAt: row.observedAt, value: Number(row.metricValue) });
      historyByMetric.set(key, current);
    });

    const normalizedPayloads: Array<typeof normalizedObservations.$inferInsert> = [];
    const flagPayloads: Array<typeof qualityFlags.$inferInsert> = [];
    let unresolvedCount = 0;

    rawRows.forEach((raw) => {
      const metadata = ((raw.metadataJson ?? {}) as RawMetadata) ?? {};
      const externalId = String(metadata.external_id ?? '').trim();
      const match = matchRawObservationToWork(raw, workRows, ipRows, externalRows);
      const metrics = buildImportedMetrics(rawObservationToCsvShape(raw));

      if (!externalId) {
        flagPayloads.push({
          rawObservationId: raw.id,
          workId: match.work?.id ?? null,
          flagType: 'missing_id',
          severity: 'warning',
          notes: 'Row is missing an external ID; exact matching is unavailable.'
        });
      }

      if (!match.work) {
        unresolvedCount += 1;
        flagPayloads.push({
          rawObservationId: raw.id,
          workId: null,
          flagType: 'manual_review',
          severity: 'warning',
          notes: 'No matching work was found for this observation.'
        });
        return;
      }

      if (metrics.length === 0) {
        flagPayloads.push({
          rawObservationId: raw.id,
          workId: match.work.id,
          flagType: 'manual_review',
          severity: 'info',
          notes: 'No supported metrics were found in this row.'
        });
        return;
      }

      if (match.confidence < 0.85) {
        unresolvedCount += 1;
        flagPayloads.push({
          rawObservationId: raw.id,
          workId: match.work.id,
          flagType: 'manual_review',
          severity: 'warning',
          notes: 'Observation matched with low confidence and should be reviewed.'
        });
      }

      const reviewMetric = metrics.find((metric) => metric.metricType === 'review_count');
      const ratingMetric = metrics.find((metric) => metric.metricType === 'rating_average');
      if (ratingMetric && reviewMetric && reviewMetric.metricValue < lowReviewSampleThreshold) {
        flagPayloads.push({
          rawObservationId: raw.id,
          workId: match.work.id,
          flagType: 'low_sample',
          severity: 'warning',
          notes: `Rating signal has only ${reviewMetric.metricValue} reviews.`
        });
      }

      metrics.forEach((metric) => {
        const duplicateKey = makeDuplicateKey(match.work!.id, raw.sourceProviderId, metric.metricType, raw.observedAt);
        if (duplicateKeys.has(duplicateKey)) {
          flagPayloads.push({
            rawObservationId: raw.id,
            workId: match.work!.id,
            flagType: 'duplicate',
            severity: 'info',
            notes: `${metric.metricType} already exists for this work, source, and timestamp.`
          });
          return;
        }

        duplicateKeys.add(duplicateKey);
        normalizedPayloads.push({
          rawObservationId: raw.id,
          workId: match.work!.id,
          sourceProviderId: raw.sourceProviderId,
          observedAt: raw.observedAt,
          metricType: metric.metricType,
          metricValue: String(metric.metricValue),
          metricUnit: metric.metricUnit,
          windowHint: null,
          confidenceScore: roundConfidence(match.confidence).toString(),
          provenanceTag: metric.provenanceTag
        });

        const historyKey = `${match.work!.id}:${metric.metricType}`;
        const priorHistory = sortByNewest(historyByMetric.get(historyKey) ?? [], (entry) => entry.observedAt);

        if (metric.metricType === 'rank_position' && priorHistory.length > 0) {
          const previous = priorHistory[0];
          if (Math.abs(previous.value - metric.metricValue) > rankJumpThreshold) {
            flagPayloads.push({
              rawObservationId: raw.id,
              workId: match.work!.id,
              flagType: 'suspect_spike',
              severity: 'warning',
              notes: `Rank moved by more than ${rankJumpThreshold} positions since the last observation.`
            });
          }
        }

        if (metric.metricType !== 'rank_position' && priorHistory.length >= 3) {
          const recentMedian = median(priorHistory.slice(0, 5).map((entry) => entry.value));
          if (recentMedian > 0 && metric.metricValue > recentMedian * spikeMultiplierThreshold) {
            flagPayloads.push({
              rawObservationId: raw.id,
              workId: match.work!.id,
              flagType: 'outlier',
              severity: 'warning',
              notes: `${metric.metricType} exceeded ${spikeMultiplierThreshold}x the recent median.`
            });
          }
        }

        const nextHistory = historyByMetric.get(historyKey) ?? [];
        nextHistory.unshift({ observedAt: raw.observedAt, value: metric.metricValue });
        historyByMetric.set(historyKey, nextHistory);
      });
    });

    if (normalizedPayloads.length > 0) {
      await ctx.db.insert(normalizedObservations).values(normalizedPayloads);
    }
    if (flagPayloads.length > 0) {
      await ctx.db.insert(qualityFlags).values(flagPayloads);
    }

    return {
      normalizedCount: normalizedPayloads.length,
      unresolvedCount,
      flagCount: flagPayloads.length
    };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function listQualityFlags(
  ctx: AnalyticsContext,
  input: { organizationId: string; unresolvedOnly?: boolean; batchId?: string }
): Promise<AnalyticsQueryResult<QualityFlagRow[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery([], async () => {
    const batchRows = await ctx.db
      .select({ id: importBatches.id })
      .from(importBatches)
      .where(eq(importBatches.organizationId, input.organizationId));

    const batchIds = input.batchId ? batchRows.filter((row) => row.id === input.batchId).map((row) => row.id) : batchRows.map((row) => row.id);
    if (batchIds.length === 0) {
      return [];
    }

    const rawRows = await ctx.db.select().from(rawObservations).where(inArray(rawObservations.importBatchId, batchIds));
    const rawIds = rawRows.map((row) => row.id);
    const workRows = await ctx.db.select().from(works).where(eq(works.organizationId, input.organizationId));
    const filters = [];
    if (rawIds.length > 0) {
      filters.push(inArray(qualityFlags.rawObservationId, rawIds));
    }
    if (workRows.length > 0) {
      filters.push(inArray(qualityFlags.workId, workRows.map((row) => row.id)));
    }
    if (filters.length === 0) {
      return [];
    }

    const allFlags = await ctx.db.select().from(qualityFlags).where(or(...filters));
    const providerIds = [...new Set(rawRows.map((row) => row.sourceProviderId))];
    const providerRows = providerIds.length
      ? await ctx.db.select().from(sourceProviders).where(inArray(sourceProviders.id, providerIds))
      : [];
    const rawById = new Map(rawRows.map((row) => [row.id, row]));
    const workById = new Map(workRows.map((row) => [row.id, row]));
    const providerById = new Map(providerRows.map((row) => [row.id, row]));

    return sortByNewest(
      allFlags.filter((row) => (input.unresolvedOnly ? row.resolvedAt === null : true)),
      (row) => row.createdAt
    ).map((row) => {
      const raw = row.rawObservationId ? rawById.get(row.rawObservationId) : undefined;
      const work = row.workId ? workById.get(row.workId) : undefined;
      const provider = raw ? providerById.get(raw.sourceProviderId) : undefined;
      return {
        id: row.id,
        rawObservationId: row.rawObservationId,
        workId: row.workId,
        workTitle: work?.title ?? null,
        rawTitle: raw?.rawWorkTitle ?? null,
        rawIpName: raw?.rawIpName ?? null,
        sourceProviderName: provider?.name ?? null,
        flagType: row.flagType,
        severity: row.severity,
        notes: row.notes,
        observedAt: raw?.observedAt ?? null,
        resolvedAt: row.resolvedAt,
        createdAt: row.createdAt
      };
    });
  });
}

export async function resolveQualityFlag(
  ctx: AnalyticsContext,
  input: { flagId: string; notes?: string }
): Promise<{ success: true }> {
  const organizationId = await getFlagOrganizationId(ctx, input.flagId);
  const userId = requireUser(ctx);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    await ctx.db
      .update(qualityFlags)
      .set({
        resolvedAt: new Date(),
        resolvedBy: userId,
        notes: input.notes?.trim() || null
      })
      .where(eq(qualityFlags.id, input.flagId));

    return { success: true };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function assignRawObservationToWork(
  ctx: AnalyticsContext,
  input: { rawObservationId: string; workId: string }
): Promise<{ success: true; normalizedCount: number }> {
  const [rawRows, workRows] = await Promise.all([
    ctx.db.select().from(rawObservations).where(eq(rawObservations.id, input.rawObservationId)).limit(1),
    ctx.db.select().from(works).where(eq(works.id, input.workId)).limit(1)
  ]);

  const raw = rawRows[0];
  const work = workRows[0];
  if (!raw || !work) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Raw observation or work not found.' });
  }

  const organizationId = await getRawObservationOrganizationId(ctx, raw.id);
  const userId = requireUser(ctx);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    await ctx.db.delete(normalizedObservations).where(eq(normalizedObservations.rawObservationId, raw.id));
    const metrics = buildImportedMetrics(rawObservationToCsvShape(raw));

    if (metrics.length > 0) {
      await ctx.db.insert(normalizedObservations).values(
        metrics.map((metric) => ({
          rawObservationId: raw.id,
          workId: work.id,
          sourceProviderId: raw.sourceProviderId,
          observedAt: raw.observedAt,
          metricType: metric.metricType,
          metricValue: String(metric.metricValue),
          metricUnit: metric.metricUnit,
          windowHint: null,
          confidenceScore: roundConfidence(0.98).toString(),
          provenanceTag: metric.provenanceTag
        }))
      );
    }

    const metadata = ((raw.metadataJson ?? {}) as RawMetadata) ?? {};
    const externalId = String(metadata.external_id ?? '').trim();
    const externalUrl = String(metadata.external_url ?? '').trim();
    if (externalId) {
      const [existing] = await ctx.db
        .select({ id: workExternalIds.id })
        .from(workExternalIds)
        .where(and(eq(workExternalIds.sourceProviderId, raw.sourceProviderId), eq(workExternalIds.externalId, externalId)))
        .limit(1);

      if (!existing) {
        await ctx.db.insert(workExternalIds).values({
          workId: work.id,
          sourceProviderId: raw.sourceProviderId,
          externalId,
          externalUrl: externalUrl || null,
          matchType: 'manual'
        });
      }
    }

    await ctx.db
      .update(qualityFlags)
      .set({
        workId: work.id,
        resolvedAt: new Date(),
        resolvedBy: userId,
        notes: 'Resolved by manual work assignment.'
      })
      .where(and(eq(qualityFlags.rawObservationId, raw.id), isNull(qualityFlags.resolvedAt)));

    return {
      success: true,
      normalizedCount: metrics.length
    };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

function buildMetricObservations(rows: Array<typeof normalizedObservations.$inferSelect>): MetricObservation[] {
  return rows.map((row) => ({
    metricType: row.metricType as AnalyticsMetricType,
    value: numberValue(row.metricValue),
    provenanceTag: row.provenanceTag as AnalyticsProvenanceTag,
    observedAt: row.observedAt
  }));
}

function groupNormalizedByWork(rows: Array<typeof normalizedObservations.$inferSelect>) {
  const grouped = new Map<string, Array<typeof normalizedObservations.$inferSelect>>();
  rows.forEach((row) => {
    const current = grouped.get(row.workId) ?? [];
    current.push(row);
    grouped.set(row.workId, current);
  });
  return grouped;
}

async function getLatestWorkScoreDate(
  ctx: AnalyticsContext,
  workIds: string[],
  window: AnalyticsTimeWindow
): Promise<string | null> {
  if (workIds.length === 0) {
    return null;
  }

  const [row] = await ctx.db
    .select({ scoreDate: workScores.scoreDate })
    .from(workScores)
    .where(and(inArray(workScores.workId, workIds), eq(workScores.timeWindow, window)))
    .orderBy(desc(workScores.scoreDate))
    .limit(1);

  return row?.scoreDate ? formatScoreDate(row.scoreDate) : null;
}

async function getLatestIpScoreDate(
  ctx: AnalyticsContext,
  ipIds: string[],
  window: AnalyticsTimeWindow
): Promise<string | null> {
  if (ipIds.length === 0) {
    return null;
  }

  const [row] = await ctx.db
    .select({ scoreDate: ipScores.scoreDate })
    .from(ipScores)
    .where(and(inArray(ipScores.franchiseId, ipIds), eq(ipScores.timeWindow, window)))
    .orderBy(desc(ipScores.scoreDate))
    .limit(1);

  return row?.scoreDate ? formatScoreDate(row.scoreDate) : null;
}

async function getPreviousWorkScores(
  ctx: AnalyticsContext,
  workIds: string[],
  window: AnalyticsTimeWindow,
  currentScoreDate: string
) {
  if (workIds.length === 0) {
    return new Map<string, typeof workScores.$inferSelect>();
  }

  const rows = await ctx.db
    .select()
    .from(workScores)
    .where(and(inArray(workScores.workId, workIds), eq(workScores.timeWindow, window)))
    .orderBy(desc(workScores.scoreDate));

  const result = new Map<string, typeof workScores.$inferSelect>();
  rows.forEach((row) => {
    const scoreDate = formatScoreDate(row.scoreDate);
    if (scoreDate >= currentScoreDate || result.has(row.workId)) {
      return;
    }
    result.set(row.workId, row);
  });
  return result;
}

async function getPreviousIpScores(
  ctx: AnalyticsContext,
  ipIds: string[],
  window: AnalyticsTimeWindow,
  currentScoreDate: string
) {
  if (ipIds.length === 0) {
    return new Map<string, typeof ipScores.$inferSelect>();
  }

  const rows = await ctx.db
    .select()
    .from(ipScores)
    .where(and(inArray(ipScores.franchiseId, ipIds), eq(ipScores.timeWindow, window)))
    .orderBy(desc(ipScores.scoreDate));

  const result = new Map<string, typeof ipScores.$inferSelect>();
  rows.forEach((row) => {
    const scoreDate = formatScoreDate(row.scoreDate);
    if (scoreDate >= currentScoreDate || result.has(row.franchiseId)) {
      return;
    }
    result.set(row.franchiseId, row);
  });
  return result;
}

function filterLeaderboardRowsByConfidence(
  rows: LeaderboardRow[],
  confidence: LeaderboardFilters['confidence']
): LeaderboardRow[] {
  if (!confidence || confidence === 'all') {
    return rows;
  }
  return rows.filter((row) => row.confidenceBand === confidence);
}

export async function rebuildScores(
  ctx: AnalyticsContext,
  input: { organizationId: string }
): Promise<ScoreRebuildResult> {
  await requireOrganizationAdmin(ctx, input.organizationId);

  try {
    const scoreDate = formatScoreDate(new Date());
    const { ipRows, workRows } = await getOrganizationAnalyticsBase(ctx, input.organizationId);
    const workIds = workRows.map((row) => row.id);
    const ipIds = ipRows.map((row) => row.id);
    const normalizedRows = workIds.length
      ? await ctx.db.select().from(normalizedObservations).where(inArray(normalizedObservations.workId, workIds))
      : [];

    if (workIds.length > 0) {
      await ctx.db.delete(scoreComponents).where(inArray(scoreComponents.workId, workIds));
      await ctx.db.delete(workScores).where(inArray(workScores.workId, workIds));
    }
    if (ipIds.length > 0) {
      await ctx.db.delete(ipScores).where(inArray(ipScores.franchiseId, ipIds));
    }
    await ctx.db.delete(leaderboardSnapshots).where(eq(leaderboardSnapshots.snapshotDate, scoreDate));

    const normalizedByWork = groupNormalizedByWork(normalizedRows);
    const workToProviders = new Map<string, Set<string>>();
    normalizedRows.forEach((row) => {
      const current = workToProviders.get(row.workId) ?? new Set<string>();
      current.add(row.sourceProviderId);
      workToProviders.set(row.workId, current);
    });

    const componentPayloads: Array<typeof scoreComponents.$inferInsert> = [];
    const workScorePayloads: Array<typeof workScores.$inferInsert> = [];

    for (const window of analyticsTimeWindows) {
      const start = getWindowStart(window);
      const previousScoreMap = await getPreviousWorkScores(ctx, workIds, window, scoreDate);
      const scoreRowsForWindow: Array<{
        workId: string;
        mediaType: AnalyticsMediaType;
        compositeScore: number;
        momentumScore: number;
        confidenceScore: number;
        previousRank: number | null;
      }> = [];

      workRows.forEach((work) => {
        const filteredRows = (normalizedByWork.get(work.id) ?? []).filter((row) => !start || asTimestamp(row.observedAt) >= start.getTime());
        const observations = buildMetricObservations(filteredRows);
        const ranking = scoreRankingObservations(observations);
        const reviews = scoreReviewObservations(observations);
        const momentum = scoreMomentumObservations(observations);
        const awards = scoreAwardObservations(observations);
        const sales = scoreSalesObservations(observations);
        const compositeScore = computeCompositeScore({ ranking, reviews, momentum, awards, sales });
        const confidenceScore = scoreConfidence(observations, workToProviders.get(work.id)?.size ?? 0);

        scoreRowsForWindow.push({
          workId: work.id,
          mediaType: work.mediaType as AnalyticsMediaType,
          compositeScore,
          momentumScore: momentum,
          confidenceScore,
          previousRank: previousScoreMap.get(work.id)?.rankOverall ?? null
        });

        scoreComponentTypes.forEach((componentType) => {
          const componentScores: Record<ScoreComponentType, number> = {
            ranking,
            reviews,
            momentum,
            awards,
            sales
          };
          componentPayloads.push({
            workId: work.id,
            scoreDate,
            timeWindow: window,
            componentType,
            componentScore: String(roundScore(componentScores[componentType])),
            weightUsed: String(scoreComponentWeights[componentType]),
            provenanceSummary: componentType === 'ranking' ? 'rank positions capped at top 250' : null
          });
        });
      });

      const rankedOverall = [...scoreRowsForWindow].sort((left, right) => right.compositeScore - left.compositeScore);
      const rankedByCategory = new Map<AnalyticsMediaType, typeof scoreRowsForWindow>();
      rankedOverall.forEach((row) => {
        const current = rankedByCategory.get(row.mediaType) ?? [];
        current.push(row);
        rankedByCategory.set(row.mediaType, current);
      });

      rankedOverall.forEach((row, index) => {
        const categoryRows = rankedByCategory.get(row.mediaType) ?? [];
        const rankInCategory = categoryRows.findIndex((candidate) => candidate.workId === row.workId) + 1;
        workScorePayloads.push({
          workId: row.workId,
          scoreDate,
          timeWindow: window,
          compositeScore: String(roundScore(row.compositeScore)),
          momentumScore: String(roundScore(row.momentumScore)),
          confidenceScore: String(roundConfidence(row.confidenceScore)),
          rankOverall: index + 1,
          rankInCategory,
          rankDelta: row.previousRank ? row.previousRank - (index + 1) : null
        });
      });
    }

    if (componentPayloads.length > 0) {
      await ctx.db.insert(scoreComponents).values(componentPayloads);
    }
    if (workScorePayloads.length > 0) {
      await ctx.db.insert(workScores).values(workScorePayloads);
    }

    const workById = new Map(workRows.map((row) => [row.id, row]));
    const ipScorePayloads: Array<typeof ipScores.$inferInsert> = [];

    for (const window of analyticsTimeWindows) {
      const previousIpMap = await getPreviousIpScores(ctx, ipIds, window, scoreDate);
      const groupedByIp = new Map<string, Array<typeof workScorePayloads[number]>>();
      workScorePayloads
        .filter((row) => row.timeWindow === window)
        .forEach((row) => {
          const work = workById.get(row.workId);
          if (!work?.franchiseId) {
            return;
          }
          const current = groupedByIp.get(work.franchiseId) ?? [];
          current.push(row);
          groupedByIp.set(work.franchiseId, current);
        });

      const currentIpScores = ipRows.map((ip) => {
        const rows = groupedByIp.get(ip.id) ?? [];
        const compositeScore = rows.length > 0 ? rows.reduce((sum, row) => sum + numberValue(row.compositeScore), 0) / rows.length : 0;
        const momentumScore = rows.length > 0 ? rows.reduce((sum, row) => sum + numberValue(row.momentumScore), 0) / rows.length : 0;
        const confidenceScore = rows.length > 0 ? rows.reduce((sum, row) => sum + numberValue(row.confidenceScore), 0) / rows.length : 0;
        return {
          ipId: ip.id,
          compositeScore,
          momentumScore,
          confidenceScore,
          activeWorkCount: rows.length,
          previousRank: previousIpMap.get(ip.id)?.rankOverall ?? null
        };
      });

      const rankedIps = [...currentIpScores].sort((left, right) => right.compositeScore - left.compositeScore);
      rankedIps.forEach((row, index) => {
        ipScorePayloads.push({
          franchiseId: row.ipId,
          scoreDate,
          timeWindow: window,
          compositeScore: String(roundScore(row.compositeScore)),
          momentumScore: String(roundScore(row.momentumScore)),
          confidenceScore: String(roundConfidence(row.confidenceScore)),
          rankOverall: index + 1,
          rankDelta: row.previousRank ? row.previousRank - (index + 1) : null,
          activeWorkCount: row.activeWorkCount
        });
      });
    }

    if (ipScorePayloads.length > 0) {
      await ctx.db.insert(ipScores).values(ipScorePayloads);
    }

    await ctx.db.insert(leaderboardSnapshots).values([
      {
        snapshotDate: scoreDate,
        timeWindow: '1w',
        scopeType: 'global',
        scopeValue: 'all'
      },
      {
        snapshotDate: scoreDate,
        timeWindow: '1w',
        scopeType: 'ip',
        scopeValue: 'all'
      }
    ]);

    return {
      scoreDate,
      workScoreCount: workScorePayloads.length,
      ipScoreCount: ipScorePayloads.length,
      componentCount: componentPayloads.length
    };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function listLeaderboardRows(
  ctx: AnalyticsContext,
  input: LeaderboardFilters
): Promise<AnalyticsQueryResult<LeaderboardRow[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery([], async () => {
    const { ipRows, workRows } = await getOrganizationAnalyticsBase(ctx, input.organizationId);
    const workIds = workRows.map((row) => row.id);
    const latestScoreDate = await getLatestWorkScoreDate(ctx, workIds, input.window);
    if (!latestScoreDate) {
      return [];
    }

    const selectedScores = workIds.length
      ? await ctx.db
          .select()
          .from(workScores)
          .where(and(inArray(workScores.workId, workIds), eq(workScores.timeWindow, input.window), eq(workScores.scoreDate, latestScoreDate)))
      : [];
    const normalizedRows = workIds.length
      ? await ctx.db.select().from(normalizedObservations).where(inArray(normalizedObservations.workId, workIds))
      : [];

    // Fetch only providers that are referenced in normalizedRows
    const providerIds = [...new Set(normalizedRows.map((row) => row.sourceProviderId))];
    const providerRows = providerIds.length
      ? await ctx.db.select().from(sourceProviders).where(inArray(sourceProviders.id, providerIds))
      : [];

    const ipById = new Map(ipRows.map((row) => [row.id, row]));
    const providerById = new Map(providerRows.map((row) => [row.id, row]));
    const workById = new Map(workRows.map((row) => [row.id, row]));
    const workToProviders = new Map<string, Set<string>>();
    const workToTags = new Map<string, AnalyticsProvenanceTag[]>();

    normalizedRows.forEach((row) => {
      const providers = workToProviders.get(row.workId) ?? new Set<string>();
      providers.add(row.sourceProviderId);
      workToProviders.set(row.workId, providers);
      const tags = workToTags.get(row.workId) ?? [];
      tags.push(row.provenanceTag as AnalyticsProvenanceTag);
      workToTags.set(row.workId, tags);
    });

    let rows = selectedScores
      .map<LeaderboardRow | null>((score) => {
        const work = workById.get(score.workId);
        if (!work) {
          return null;
        }
        return {
          workId: work.id,
          title: work.title,
          ipId: work.franchiseId,
          ipName: work.franchiseId ? ipById.get(work.franchiseId)?.name ?? null : null,
          category: work.mediaType as AnalyticsMediaType,
          compositeScore: numberValue(score.compositeScore),
          momentumScore: numberValue(score.momentumScore),
          confidenceScore: numberValue(score.confidenceScore),
          confidenceBand: getConfidenceBand(numberValue(score.confidenceScore)),
          rankOverall: score.rankOverall,
          rankInCategory: score.rankInCategory,
          rankDelta: score.rankDelta,
          sourceCoverageCount: workToProviders.get(work.id)?.size ?? 0,
          provenanceBadge: selectBestProvenance(workToTags.get(work.id) ?? ['metadata']),
          latestScoreDate
        };
      })
      .filter((row): row is LeaderboardRow => row !== null);

    if (input.category && input.category !== 'all') {
      rows = rows.filter((row) => row.category === input.category);
    }

    if (input.query) {
      const normalizedQuery = canonicalizeTitle(input.query);
      rows = rows.filter((row) => canonicalizeTitle(`${row.title} ${row.ipName ?? ''}`).includes(normalizedQuery));
    }

    if (input.source) {
      rows = rows.filter((row) => {
        const slugs = normalizedRows
          .filter((entry) => entry.workId === row.workId)
          .map((entry) => providerById.get(entry.sourceProviderId)?.slug ?? '');
        return slugs.includes(input.source as string);
      });
    }

    rows = filterLeaderboardRowsByConfidence(rows, input.confidence);

    const sortMode = input.sort ?? 'rank';
    rows.sort((left, right) => {
      if (sortMode === 'score') {
        return right.compositeScore - left.compositeScore;
      }
      if (sortMode === 'momentum') {
        return right.momentumScore - left.momentumScore;
      }
      if (sortMode === 'coverage') {
        return right.sourceCoverageCount - left.sourceCoverageCount;
      }
      return (left.rankOverall ?? Number.MAX_SAFE_INTEGER) - (right.rankOverall ?? Number.MAX_SAFE_INTEGER);
    });

    return rows.slice(0, input.limit ?? 250);
  });
}

export async function getWorkDetail(
  ctx: AnalyticsContext,
  input: { workId: string }
): Promise<AnalyticsQueryResult<WorkDetail | null>> {
  const organizationId = await getWorkOrganizationId(ctx, input.workId);
  await requireOrganizationMember(ctx, organizationId);

  return withAnalyticsQuery<WorkDetail | null>(null, async () => {
    const [workResponse, qualityResponse] = await Promise.all([
      getWork(ctx, { workId: input.workId }),
      listQualityFlags(ctx, { organizationId, unresolvedOnly: false })
    ]);

    if (workResponse.status !== 'ready' || !workResponse.data) {
      return null;
    }

    const [scoreRows, componentRows, normalizedRows] = await Promise.all([
      ctx.db.select().from(workScores).where(eq(workScores.workId, input.workId)),
      ctx.db.select().from(scoreComponents).where(eq(scoreComponents.workId, input.workId)),
      ctx.db.select().from(normalizedObservations).where(eq(normalizedObservations.workId, input.workId))
    ]);

    const providerIds = [...new Set(normalizedRows.map((row) => row.sourceProviderId))];
    const providerRows = providerIds.length
      ? await ctx.db.select().from(sourceProviders).where(inArray(sourceProviders.id, providerIds))
      : [];
    const providerById = new Map(providerRows.map((row) => [row.id, row]));

    const sourceBreakdown = providerIds.map((providerId) => {
      const rows = normalizedRows.filter((row) => row.sourceProviderId === providerId);
      return {
        sourceProviderId: providerId,
        sourceProviderName: providerById.get(providerId)?.name ?? 'Unknown source',
        sourceProviderSlug: providerById.get(providerId)?.slug ?? 'unknown',
        observationCount: rows.length,
        latestObservedAt: toIsoString(sortByNewest(rows, (row) => row.observedAt)[0]?.observedAt) ?? null,
        provenanceTags: [...new Set(rows.map((row) => row.provenanceTag as AnalyticsProvenanceTag))]
      };
    });

    const latestScoreDate = sortByNewest(scoreRows, (row) => row.scoreDate)[0]?.scoreDate;
    const componentBreakdown: ScoreComponentBreakdown[] = componentRows
      .filter((row) => (latestScoreDate ? formatScoreDate(row.scoreDate) === formatScoreDate(latestScoreDate) : true))
      .map((row) => ({
        componentType: row.componentType as ScoreComponentType,
        componentScore: numberValue(row.componentScore),
        weightUsed: numberValue(row.weightUsed),
        provenanceSummary: row.provenanceSummary
      }));

    return {
      work: workResponse.data,
      scoreHistory: sortByNewest(scoreRows, (row) => row.scoreDate).map((row) => ({
        window: row.timeWindow as AnalyticsTimeWindow,
        compositeScore: numberValue(row.compositeScore),
        momentumScore: numberValue(row.momentumScore),
        confidenceScore: numberValue(row.confidenceScore),
        rankOverall: row.rankOverall,
        rankDelta: row.rankDelta,
        scoreDate: formatScoreDate(row.scoreDate)
      })),
      sourceBreakdown,
      componentBreakdown,
      qualityFlags:
        qualityResponse.status === 'ready'
          ? qualityResponse.data.filter((row) => row.workId === input.workId)
          : []
    };
  });
}

export async function listIpLeaderboardRows(
  ctx: AnalyticsContext,
  input: {
    organizationId: string;
    window: AnalyticsTimeWindow;
    query?: string;
    category?: AnalyticsMediaType | 'all';
    limit?: number;
  }
): Promise<AnalyticsQueryResult<IpLeaderboardRow[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery([], async () => {
    const { ipRows, workRows } = await getOrganizationAnalyticsBase(ctx, input.organizationId);
    const latestScoreDate = await getLatestIpScoreDate(ctx, ipRows.map((row) => row.id), input.window);
    if (!latestScoreDate) {
      return [];
    }

    const scoreRows = ipRows.length
      ? await ctx.db
          .select()
          .from(ipScores)
          .where(and(inArray(ipScores.franchiseId, ipRows.map((row) => row.id)), eq(ipScores.timeWindow, input.window), eq(ipScores.scoreDate, latestScoreDate)))
      : [];

    const workCountByIp = new Map<string, number>();
    workRows.forEach((row) => {
      if (row.franchiseId) {
        workCountByIp.set(row.franchiseId, (workCountByIp.get(row.franchiseId) ?? 0) + 1);
      }
    });

    let rows = scoreRows
      .map<IpLeaderboardRow | null>((row) => {
        const ip = ipRows.find((candidate) => candidate.id === row.franchiseId);
        if (!ip) {
          return null;
        }
        return {
          ipId: ip.id,
          name: ip.name,
          slug: ip.slug,
          primaryCategory: ip.primaryCategory as AnalyticsMediaType | null,
          compositeScore: numberValue(row.compositeScore),
          momentumScore: numberValue(row.momentumScore),
          confidenceScore: numberValue(row.confidenceScore),
          rankOverall: row.rankOverall,
          rankDelta: row.rankDelta,
          activeWorkCount: workCountByIp.get(ip.id) ?? 0,
          strongestCategory: ip.primaryCategory as AnalyticsMediaType | null,
          latestScoreDate
        };
      })
      .filter((row): row is IpLeaderboardRow => row !== null);

    if (input.category && input.category !== 'all') {
      rows = rows.filter((row) => row.primaryCategory === input.category);
    }

    if (input.query) {
      const normalizedQuery = canonicalizeTitle(input.query);
      rows = rows.filter((row) => canonicalizeTitle(row.name).includes(normalizedQuery));
    }

    rows.sort((left, right) => (left.rankOverall ?? Number.MAX_SAFE_INTEGER) - (right.rankOverall ?? Number.MAX_SAFE_INTEGER));
    return rows.slice(0, input.limit ?? 250);
  });
}

export async function getIpDetail(
  ctx: AnalyticsContext,
  input: { ipId: string }
): Promise<AnalyticsQueryResult<IpDetail | null>> {
  const organizationId = await getIpOrganizationId(ctx, input.ipId);
  await requireOrganizationMember(ctx, organizationId);

  return withAnalyticsQuery<IpDetail | null>(null, async () => {
    const [ipResponse, leaderboardResponse] = await Promise.all([
      getAnalyticsIp(ctx, { organizationId, ipId: input.ipId }),
      listLeaderboardRows(ctx, {
        organizationId,
        window: '1w',
        category: 'all',
        limit: 250
      })
    ]);

    if (ipResponse.status !== 'ready' || !ipResponse.data) {
      return null;
    }

    const workRows = await ctx.db
      .select()
      .from(works)
      .where(and(eq(works.organizationId, organizationId), eq(works.franchiseId, input.ipId)));
    const scoreRows = await ctx.db.select().from(ipScores).where(eq(ipScores.franchiseId, input.ipId));

    const normalizedRows = workRows.length
      ? await ctx.db.select().from(normalizedObservations).where(inArray(normalizedObservations.workId, workRows.map((row) => row.id)))
      : [];
    const providerIds = [...new Set(normalizedRows.map((row) => row.sourceProviderId))];
    const providerRows = providerIds.length
      ? await ctx.db.select().from(sourceProviders).where(inArray(sourceProviders.id, providerIds))
      : [];
    const providerById = new Map(providerRows.map((row) => [row.id, row]));

    const sourceCoverage = providerIds.map((providerId) => {
      const rows = normalizedRows.filter((row) => row.sourceProviderId === providerId);
      return {
        sourceProviderId: providerId,
        sourceProviderName: providerById.get(providerId)?.name ?? 'Unknown source',
        observationCount: rows.length,
        latestObservedAt: toIsoString(sortByNewest(rows, (row) => row.observedAt)[0]?.observedAt) ?? null
      };
    });

    return {
      ip: ipResponse.data,
      scores: sortByNewest(scoreRows, (row) => row.scoreDate).map((row) => ({
        window: row.timeWindow as AnalyticsTimeWindow,
        compositeScore: numberValue(row.compositeScore),
        momentumScore: numberValue(row.momentumScore),
        confidenceScore: numberValue(row.confidenceScore),
        rankOverall: row.rankOverall,
        rankDelta: row.rankDelta,
        activeWorkCount: row.activeWorkCount,
        scoreDate: formatScoreDate(row.scoreDate)
      })),
      topWorks:
        leaderboardResponse.status === 'ready'
          ? leaderboardResponse.data.filter((row) => row.ipId === input.ipId).slice(0, 10)
          : [],
      sourceCoverage
    };
  });
}

export async function listFreshnessRows(
  ctx: AnalyticsContext,
  input: { organizationId: string }
): Promise<AnalyticsQueryResult<FreshnessRow[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery([], async () => {
    const [providerRows, batchRows] = await Promise.all([
      ctx.db.select().from(sourceProviders),
      ctx.db.select().from(importBatches).where(eq(importBatches.organizationId, input.organizationId))
    ]);

    const batchIds = batchRows.map((row) => row.id);
    const rawRows = batchIds.length
      ? await ctx.db.select().from(rawObservations).where(inArray(rawObservations.importBatchId, batchIds))
      : [];
    const rawIds = rawRows.map((row) => row.id);
    const normalizedRows = rawIds.length
      ? await ctx.db.select().from(normalizedObservations).where(inArray(normalizedObservations.rawObservationId, rawIds))
      : [];
    const unresolvedRows = rawIds.length
      ? await ctx.db
          .select()
          .from(qualityFlags)
          .where(and(inArray(qualityFlags.rawObservationId, rawIds), isNull(qualityFlags.resolvedAt)))
      : [];
    const externalRows = await ctx.db.select().from(workExternalIds);

    return providerRows
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((provider) => {
        const providerBatches = sortByNewest(
          batchRows.filter((row) => row.sourceProviderId === provider.id),
          (row) => row.completedAt ?? row.createdAt
        );
        const providerBatchIds = providerBatches.map((row) => row.id);
        const providerRawRows = rawRows.filter((row) => providerBatchIds.includes(row.importBatchId));
        const providerRawIds = providerRawRows.map((row) => row.id);
        const providerNormalizedRows = normalizedRows.filter((row) => providerRawIds.includes(row.rawObservationId));
        const providerUnresolvedRows = unresolvedRows.filter((row) => row.rawObservationId && providerRawIds.includes(row.rawObservationId));
        const lastCompletedAt = providerBatches[0]?.completedAt ?? null;
        const staleCutoff = new Date(Date.now() - sourceFreshnessHours * 60 * 60 * 1000);

        return {
          sourceProviderId: provider.id,
          sourceProviderName: provider.name,
          sourceProviderSlug: provider.slug,
          sourceFamily: provider.sourceFamily as SourceFamily,
          confidenceTier: provider.confidenceTier,
          lastImportAt: toIsoString(providerBatches[0]?.createdAt) ?? null,
          lastCompletedAt: toIsoString(lastCompletedAt) ?? null,
          lastObservedAt: toIsoString(sortByNewest(providerRawRows, (row) => row.observedAt)[0]?.observedAt) ?? null,
          latestStatus: providerBatches[0]?.status ?? 'never',
          batchCount: providerBatches.length,
          rawObservationCount: providerRawRows.length,
          normalizedObservationCount: providerNormalizedRows.length,
          unresolvedFlagCount: providerUnresolvedRows.length,
          mappedWorkCount: new Set(externalRows.filter((row) => row.sourceProviderId === provider.id).map((row) => row.workId)).size,
          isStale: !lastCompletedAt || lastCompletedAt < staleCutoff
        };
      });
  });
}

export async function getAnalyticsOverview(
  ctx: AnalyticsContext,
  input: { organizationId: string }
): Promise<AnalyticsQueryResult<{
  latestScoreDate: string | null;
  topWorkCount: number;
  activeIpCount: number;
  trackedWorkCount: number;
  sourceProviderCount: number;
  unresolvedFlagCount: number;
  latestImportAt: string | null;
}>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return withAnalyticsQuery(
    {
      latestScoreDate: null,
      topWorkCount: 0,
      activeIpCount: 0,
      trackedWorkCount: 0,
      sourceProviderCount: 0,
      unresolvedFlagCount: 0,
      latestImportAt: null
    },
    async () => {
      const [leaderboardResponse, ipResponse, workResponse, sourceResponse, batchResponse, qualityResponse] = await Promise.all([
        listLeaderboardRows(ctx, {
          organizationId: input.organizationId,
          window: '1w',
          category: 'all',
          limit: 10
        }),
        listAnalyticsIps(ctx, { organizationId: input.organizationId }),
        listWorks(ctx, { organizationId: input.organizationId, category: 'all' }),
        listSourceProviders(ctx, { organizationId: input.organizationId }),
        listImportBatches(ctx, { organizationId: input.organizationId }),
        listQualityFlags(ctx, { organizationId: input.organizationId, unresolvedOnly: true })
      ]);

      return {
        latestScoreDate:
          leaderboardResponse.status === 'ready' && leaderboardResponse.data.length > 0
            ? leaderboardResponse.data[0].latestScoreDate
            : null,
        topWorkCount: leaderboardResponse.status === 'ready' ? leaderboardResponse.data.length : 0,
        activeIpCount: ipResponse.status === 'ready' ? ipResponse.data.length : 0,
        trackedWorkCount: workResponse.status === 'ready' ? workResponse.data.length : 0,
        sourceProviderCount: sourceResponse.status === 'ready' ? sourceResponse.data.length : 0,
        unresolvedFlagCount: qualityResponse.status === 'ready' ? qualityResponse.data.length : 0,
        latestImportAt:
          batchResponse.status === 'ready' && batchResponse.data.length > 0
            ? toIsoString(batchResponse.data[0].createdAt)
            : null
      };
    }
  );
}
