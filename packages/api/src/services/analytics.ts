import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  franchises,
  importBatches,
  normalizedObservations,
  organizationMembers,
  qualityFlags,
  rawObservations,
  scoreComponents,
  sourceProviders,
  workExternalIds,
  workScores,
  works,
  ipScores,
  leaderboardSnapshots
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
  analyticsMediaTypes,
  analyticsTimeWindows,
  availableResult,
  buildImportedMetrics,
  canonicalizeTitle,
  clamp,
  computeCompositeScore,
  csvRequiredColumns,
  formatScoreDate,
  getConfidenceBand,
  getWindowStart,
  lowReviewSampleThreshold,
  median,
  parseCsv,
  parseJsonObject,
  provenanceMultipliers,
  qualityFlagSeverities,
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
  slugify,
  sourceFamilies,
  spikeMultiplierThreshold,
  sourceFreshnessHours,
  unavailableResult,
  validateCsvHeaders,
  validateCsvRow
} from '@null/domain';
import type { TRPCContext } from '../context';

type AnalyticsContext = Pick<TRPCContext, 'db' | 'user'>;

type OrganizationRole = 'owner' | 'admin' | 'member';

type RawMetadata = Record<string, unknown>;

type RawObservationRecord = typeof rawObservations.$inferSelect;

function isAnalyticsUnavailableError(error: unknown): boolean {
  const maybeCode =
    typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  return ['42P01', '42703', '42704'].includes(maybeCode);
}

async function runAnalyticsQuery<T>(
  fallback: T,
  action: () => Promise<T>
): Promise<AnalyticsQueryResult<T>> {
  try {
    return availableResult(await action());
  } catch (error) {
    if (isAnalyticsUnavailableError(error)) {
      return unavailableResult(fallback);
    }
    throw error;
  }
}

function ensureAnalyticsMutationAvailable(error: unknown): never {
  if (isAnalyticsUnavailableError(error)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Analytics schema is unavailable. Apply the deferred Supabase changes before using this feature.'
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

async function getOrganizationRole(
  ctx: AnalyticsContext,
  organizationId: string
): Promise<OrganizationRole | null> {
  const userId = requireUser(ctx);
  const [membership] = await ctx.db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)))
    .limit(1);

  return membership?.role ?? null;
}

async function requireOrganizationMember(ctx: AnalyticsContext, organizationId: string): Promise<OrganizationRole> {
  const role = await getOrganizationRole(ctx, organizationId);
  if (!role) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this organization.'
    });
  }

  return role;
}

async function requireOrganizationAdmin(ctx: AnalyticsContext, organizationId: string): Promise<OrganizationRole> {
  const role = await requireOrganizationMember(ctx, organizationId);
  if (role === 'member') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to modify analytics data.'
    });
  }

  return role;
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

function sortByDateDescending<T>(rows: T[], accessor: (row: T) => Date | string | null | undefined): T[] {
  return [...rows].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);
    return new Date(rightValue ?? 0).getTime() - new Date(leftValue ?? 0).getTime();
  });
}

function selectBestProvenance(tags: AnalyticsProvenanceTag[]): AnalyticsProvenanceTag {
  const order: AnalyticsProvenanceTag[] = ['direct', 'estimated', 'engagement', 'awards', 'metadata'];
  return order.find((tag) => tags.includes(tag)) ?? 'metadata';
}

function mapAnalyticsIpRecord(
  record: typeof franchises.$inferSelect,
  workCount: number
): AnalyticsIp {
  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    slug: record.slug,
    description: record.description,
    primaryCategory: record.primaryCategory as AnalyticsMediaType | null,
    status: record.status,
    workCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function mapAnalyticsWorkRecord(
  record: typeof works.$inferSelect,
  ipName: string | null,
  externalIdCount: number
): AnalyticsWork {
  return {
    id: record.id,
    organizationId: record.organizationId,
    ipId: record.franchiseId,
    ipName,
    title: record.title,
    canonicalTitle: record.canonicalTitle,
    mediaType: record.mediaType as AnalyticsMediaType,
    seriesName: record.seriesName,
    volumeNumber: record.volumeNumber,
    releaseDate: record.releaseDate ? String(record.releaseDate) : null,
    language: record.language,
    region: record.region,
    publisher: record.publisher,
    status: record.status,
    externalIdCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function mapExternalIdRecord(
  record: typeof workExternalIds.$inferSelect,
  provider: typeof sourceProviders.$inferSelect | undefined
): WorkExternalIdRecord {
  return {
    id: record.id,
    workId: record.workId,
    sourceProviderId: record.sourceProviderId,
    sourceProviderName: provider?.name ?? 'Unknown source',
    sourceProviderSlug: provider?.slug ?? 'unknown',
    externalId: record.externalId,
    externalUrl: record.externalUrl,
    matchType: record.matchType,
    createdAt: record.createdAt
  };
}

async function getWorkOrganizationId(ctx: AnalyticsContext, workId: string): Promise<string> {
  const [work] = await ctx.db
    .select({ organizationId: works.organizationId })
    .from(works)
    .where(eq(works.id, workId))
    .limit(1);

  if (!work) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Work not found.'
    });
  }

  return work.organizationId;
}

async function getIpOrganizationId(ctx: AnalyticsContext, ipId: string): Promise<string> {
  const [ip] = await ctx.db
    .select({ organizationId: franchises.organizationId })
    .from(franchises)
    .where(eq(franchises.id, ipId))
    .limit(1);

  if (!ip) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'IP not found.'
    });
  }

  return ip.organizationId;
}

async function getBatchOrganizationId(ctx: AnalyticsContext, batchId: string): Promise<string> {
  const [batch] = await ctx.db
    .select({ organizationId: importBatches.organizationId })
    .from(importBatches)
    .where(eq(importBatches.id, batchId))
    .limit(1);

  if (!batch) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Import batch not found.'
    });
  }

  return batch.organizationId;
}

async function getFlagOrganizationId(ctx: AnalyticsContext, flagId: string): Promise<string> {
  const [flag] = await ctx.db
    .select({
      rawObservationId: qualityFlags.rawObservationId,
      workId: qualityFlags.workId
    })
    .from(qualityFlags)
    .where(eq(qualityFlags.id, flagId))
    .limit(1);

  if (!flag) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Quality flag not found.'
    });
  }

  if (flag.workId) {
    return getWorkOrganizationId(ctx, flag.workId);
  }

  if (flag.rawObservationId) {
    const [raw] = await ctx.db
      .select({ organizationId: importBatches.organizationId })
      .from(rawObservations)
      .innerJoin(importBatches, eq(rawObservations.importBatchId, importBatches.id))
      .where(eq(rawObservations.id, flag.rawObservationId))
      .limit(1);

    if (raw) {
      return raw.organizationId;
    }
  }

  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Quality flag organization not found.'
  });
}

async function getLatestWorkScoreDate(
  ctx: AnalyticsContext,
  workIds: string[],
  window: AnalyticsTimeWindow
): Promise<string | null> {
  if (workIds.length === 0) {
    return null;
  }

  const rows = await ctx.db
    .select({ scoreDate: workScores.scoreDate })
    .from(workScores)
    .where(and(inArray(workScores.workId, workIds), eq(workScores.timeWindow, window)))
    .orderBy(desc(workScores.scoreDate))
    .limit(1);

  return rows[0]?.scoreDate ? formatScoreDate(rows[0].scoreDate) : null;
}

async function getLatestIpScoreDate(
  ctx: AnalyticsContext,
  ipIds: string[],
  window: AnalyticsTimeWindow
): Promise<string | null> {
  if (ipIds.length === 0) {
    return null;
  }

  const rows = await ctx.db
    .select({ scoreDate: ipScores.scoreDate })
    .from(ipScores)
    .where(and(inArray(ipScores.franchiseId, ipIds), eq(ipScores.timeWindow, window)))
    .orderBy(desc(ipScores.scoreDate))
    .limit(1);

  return rows[0]?.scoreDate ? formatScoreDate(rows[0].scoreDate) : null;
}

export async function listAnalyticsIps(
  ctx: AnalyticsContext,
  input: { organizationId: string; query?: string; status?: string }
): Promise<AnalyticsQueryResult<AnalyticsIp[]>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return runAnalyticsQuery([], async () => {
    const [ipRows, workRows] = await Promise.all([
      ctx.db.select().from(franchises).where(eq(franchises.organizationId, input.organizationId)),
      ctx.db.select({ id: works.id, franchiseId: works.franchiseId }).from(works).where(eq(works.organizationId, input.organizationId))
    ]);

    const workCountByIp = new Map<string, number>();
    workRows.forEach((row) => {
      if (!row.franchiseId) {
        return;
      }

      workCountByIp.set(row.franchiseId, (workCountByIp.get(row.franchiseId) ?? 0) + 1);
    });

    const normalizedQuery = input.query ? canonicalizeTitle(input.query) : '';

    return ipRows
      .filter((row) => (input.status ? row.status === input.status : true))
      .filter((row) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = canonicalizeTitle(`${row.name} ${row.description ?? ''}`);
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((row) => mapAnalyticsIpRecord(row, workCountByIp.get(row.id) ?? 0));
  });
}

export async function getAnalyticsIp(
  ctx: AnalyticsContext,
  input: { organizationId: string; ipId: string }
): Promise<AnalyticsQueryResult<AnalyticsIp | null>> {
  await requireOrganizationMember(ctx, input.organizationId);

  return runAnalyticsQuery<AnalyticsIp | null>(null, async () => {
    const [ip] = await ctx.db
      .select()
      .from(franchises)
      .where(and(eq(franchises.id, input.ipId), eq(franchises.organizationId, input.organizationId)))
      .limit(1);

    if (!ip) {
      return null;
    }

    const ipWorks = await ctx.db
      .select({ id: works.id })
      .from(works)
      .where(and(eq(works.organizationId, input.organizationId), eq(works.franchiseId, input.ipId)));

    return mapAnalyticsIpRecord(ip, ipWorks.length);
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
    const existing = await ctx.db
      .select({ id: franchises.id })
      .from(franchises)
      .where(and(eq(franchises.organizationId, input.organizationId), eq(franchises.slug, slug)))
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An IP with this slug already exists.'
      });
    }

    const [created] = await ctx.db
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

    return mapAnalyticsIpRecord(created, 0);
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
    const updates: Partial<typeof franchises.$inferInsert> = {
      updatedAt: new Date()
    };

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

    const [updated] = await ctx.db
      .update(franchises)
      .set(updates)
      .where(eq(franchises.id, input.ipId))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'IP not found.'
      });
    }

    const ipWorks = await ctx.db
      .select({ id: works.id })
      .from(works)
      .where(and(eq(works.organizationId, updated.organizationId), eq(works.franchiseId, updated.id)));

    return mapAnalyticsIpRecord(updated, ipWorks.length);
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

  return runAnalyticsQuery([], async () => {
    const [workRows, ipRows, externalIds] = await Promise.all([
      ctx.db.select().from(works).where(eq(works.organizationId, input.organizationId)),
      ctx.db.select().from(franchises).where(eq(franchises.organizationId, input.organizationId)),
      ctx.db
        .select()
        .from(workExternalIds)
        .where(
          inArray(
            workExternalIds.workId,
            (
              await ctx.db.select({ id: works.id }).from(works).where(eq(works.organizationId, input.organizationId))
            ).map((row) => row.id)
          )
        )
    ]);

    const ipById = new Map(ipRows.map((row) => [row.id, row]));
    const externalCountByWork = new Map<string, number>();
    externalIds.forEach((row) => {
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
      .map((row) => mapAnalyticsWorkRecord(row, row.franchiseId ? ipById.get(row.franchiseId)?.name ?? null : null, externalCountByWork.get(row.id) ?? 0));
  });
}

export async function getWork(
  ctx: AnalyticsContext,
  input: { workId: string }
): Promise<AnalyticsQueryResult<(AnalyticsWork & { externalIds: WorkExternalIdRecord[] }) | null>> {
  const organizationId = await getWorkOrganizationId(ctx, input.workId);
  await requireOrganizationMember(ctx, organizationId);

  return runAnalyticsQuery<(AnalyticsWork & { externalIds: WorkExternalIdRecord[] }) | null>(null, async () => {
    const [work] = await ctx.db.select().from(works).where(eq(works.id, input.workId)).limit(1);
    if (!work) {
      return null;
    }

    const [ipRows, externalIdRows, providerRows] = await Promise.all([
      work.franchiseId ? ctx.db.select().from(franchises).where(eq(franchises.id, work.franchiseId)).limit(1) : Promise.resolve([]),
      ctx.db.select().from(workExternalIds).where(eq(workExternalIds.workId, input.workId)),
      ctx.db.select().from(sourceProviders)
    ]);

    const providerById = new Map(providerRows.map((row) => [row.id, row]));
    return {
      ...mapAnalyticsWorkRecord(work, ipRows[0]?.name ?? null, externalIdRows.length),
      externalIds: externalIdRows.map((row) => mapExternalIdRecord(row, providerById.get(row.sourceProviderId)))
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
    const [created] = await ctx.db
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
    if (created.franchiseId) {
      const [ip] = await ctx.db.select().from(franchises).where(eq(franchises.id, created.franchiseId)).limit(1);
      ipName = ip?.name ?? null;
    }

    return mapAnalyticsWorkRecord(created, ipName, 0);
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
    const updates: Partial<typeof works.$inferInsert> = {
      updatedAt: new Date()
    };

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

    const [updated] = await ctx.db
      .update(works)
      .set(updates)
      .where(eq(works.id, input.workId))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Work not found.'
      });
    }

    let ipName: string | null = null;
    if (updated.franchiseId) {
      const [ip] = await ctx.db.select().from(franchises).where(eq(franchises.id, updated.franchiseId)).limit(1);
      ipName = ip?.name ?? null;
    }

    const externalIds = await ctx.db.select().from(workExternalIds).where(eq(workExternalIds.workId, updated.id));
    return mapAnalyticsWorkRecord(updated, ipName, externalIds.length);
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

  return runAnalyticsQuery([], async () => {
    const [providers, batches] = await Promise.all([
      ctx.db.select().from(sourceProviders),
      ctx.db.select().from(importBatches).where(eq(importBatches.organizationId, input.organizationId))
    ]);

    const batchesByProvider = new Map<string, typeof importBatches.$inferSelect[]>();
    batches.forEach((batch) => {
      const current = batchesByProvider.get(batch.sourceProviderId) ?? [];
      current.push(batch);
      batchesByProvider.set(batch.sourceProviderId, current);
    });

    return providers
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((provider) => {
        const providerBatches = sortByDateDescending(
          batchesByProvider.get(provider.id) ?? [],
          (row) => row.completedAt ?? row.createdAt
        );
        return {
          id: provider.id,
          slug: provider.slug,
          name: provider.name,
          sourceFamily: provider.sourceFamily as SourceFamily,
          accessType: provider.accessType as AccessType,
          confidenceTier: provider.confidenceTier,
          isActive: provider.isActive,
          createdAt: provider.createdAt,
          importCount: providerBatches.length,
          lastImportAt: providerBatches[0]?.completedAt ?? providerBatches[0]?.createdAt ?? null
        };
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
    const slug = slugify(input.slug);
    const [created] = await ctx.db
      .insert(sourceProviders)
      .values({
        slug,
        name: input.name.trim(),
        sourceFamily: input.sourceFamily,
        accessType: input.accessType,
        confidenceTier: input.confidenceTier,
        isActive: input.isActive ?? true
      })
      .returning();

    return {
      id: created.id,
      slug: created.slug,
      name: created.name,
      sourceFamily: created.sourceFamily as SourceFamily,
      accessType: created.accessType as AccessType,
      confidenceTier: created.confidenceTier,
      isActive: created.isActive,
      createdAt: created.createdAt
    };
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

    const [updated] = await ctx.db
      .update(sourceProviders)
      .set(updates)
      .where(eq(sourceProviders.id, input.sourceProviderId))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Source provider not found.'
      });
    }

    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      sourceFamily: updated.sourceFamily as SourceFamily,
      accessType: updated.accessType as AccessType,
      confidenceTier: updated.confidenceTier,
      isActive: updated.isActive,
      createdAt: updated.createdAt
    };
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

  return runAnalyticsQuery([], async () => {
    const [externalIds, providers] = await Promise.all([
      ctx.db.select().from(workExternalIds).where(eq(workExternalIds.workId, input.workId)),
      ctx.db.select().from(sourceProviders)
    ]);
    const providerById = new Map(providers.map((row) => [row.id, row]));
    return externalIds.map((row) => mapExternalIdRecord(row, providerById.get(row.sourceProviderId)));
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
    const [created] = await ctx.db
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
      .where(eq(sourceProviders.id, created.sourceProviderId))
      .limit(1);

    return mapExternalIdRecord(created, provider);
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}

export async function deleteExternalId(
  ctx: AnalyticsContext,
  input: { externalIdId: string }
): Promise<{ success: true }> {
  const [externalId] = await ctx.db
    .select({ workId: workExternalIds.workId })
    .from(workExternalIds)
    .where(eq(workExternalIds.id, input.externalIdId))
    .limit(1);

  if (!externalId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'External ID not found.'
    });
  }

  const organizationId = await getWorkOrganizationId(ctx, externalId.workId);
  await requireOrganizationAdmin(ctx, organizationId);

  try {
    await ctx.db.delete(workExternalIds).where(eq(workExternalIds.id, input.externalIdId));
    return { success: true };
  } catch (error) {
    ensureAnalyticsMutationAvailable(error);
  }
}
