export const analyticsMediaTypes = [
  "book",
  "manga",
  "manhwa",
  "manhua",
  "web_comic",
  "comic",
] as const;
export type AnalyticsMediaType = (typeof analyticsMediaTypes)[number];

export const analyticsTimeWindows = [
  "all_time",
  "5y",
  "1y",
  "6m",
  "3m",
  "1m",
  "2w",
  "1w",
] as const;
export type AnalyticsTimeWindow = (typeof analyticsTimeWindows)[number];

export const analyticsProvenanceTags = [
  "direct",
  "estimated",
  "engagement",
  "awards",
  "metadata",
] as const;
export type AnalyticsProvenanceTag = (typeof analyticsProvenanceTags)[number];

export const analyticsMetricTypes = [
  "rank_position",
  "rating_average",
  "review_count",
  "view_count",
  "engagement_count",
  "sales_value",
  "award_signal",
  "search_interest",
] as const;
export type AnalyticsMetricType = (typeof analyticsMetricTypes)[number];

export const sourceFamilies = [
  "ranking",
  "reviews",
  "awards",
  "search",
  "social",
  "sales_estimated",
  "sales_direct",
  "metadata",
] as const;
export type SourceFamily = (typeof sourceFamilies)[number];

export const accessTypes = ["csv", "api", "scrape", "manual"] as const;
export type AccessType = (typeof accessTypes)[number];

export const confidenceTiers = [
  "gold",
  "silver",
  "bronze",
  "community",
] as const;
export type ConfidenceTier = (typeof confidenceTiers)[number];

export const analyticsMatchTypes = ["exact", "probable", "manual"] as const;
export type AnalyticsMatchType = (typeof analyticsMatchTypes)[number];

export const importStatuses = [
  "pending",
  "processing",
  "complete",
  "failed",
  "partial",
] as const;
export type ImportStatus = (typeof importStatuses)[number];

export const qualityFlagTypes = [
  "duplicate",
  "outlier",
  "missing_id",
  "suspect_spike",
  "low_sample",
  "manual_review",
] as const;
export type QualityFlagType = (typeof qualityFlagTypes)[number];

export const qualityFlagSeverities = ["info", "warning", "critical"] as const;
export type QualityFlagSeverity = (typeof qualityFlagSeverities)[number];

export const scoreComponentTypes = [
  "ranking",
  "reviews",
  "momentum",
  "awards",
  "sales",
] as const;
export type ScoreComponentType = (typeof scoreComponentTypes)[number];

export const leaderboardSorts = [
  "rank",
  "score",
  "momentum",
  "coverage",
] as const;
export type LeaderboardSort = (typeof leaderboardSorts)[number];

export const csvRequiredColumns = [
  "source_provider",
  "observed_at",
  "title",
  "ip_name",
  "media_type",
  "region",
  "language",
  "external_id",
  "external_url",
] as const;

export const csvOptionalColumns = [
  "rank_value",
  "rating_value",
  "review_count",
  "view_count",
  "engagement_count",
  "sales_value",
  "sales_is_estimated",
  "award_name",
  "award_result",
  "metadata_json",
  "search_interest",
] as const;

export const scoreComponentWeights: Record<ScoreComponentType, number> = {
  ranking: 0.4,
  reviews: 0.25,
  momentum: 0.2,
  sales: 0.1,
  awards: 0.05,
};

export const provenanceMultipliers: Record<AnalyticsProvenanceTag, number> = {
  direct: 1,
  estimated: 0.7,
  engagement: 0.55,
  awards: 0.25,
  metadata: 0.4,
};

export const lowReviewSampleThreshold = 25;
export const rankJumpThreshold = 100;
export const spikeMultiplierThreshold = 3;
export const leaderboardRankCap = 250;
export const sourceFreshnessHours = 48;

export type AnalyticsQueryResult<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; data: T; reason: string };

export interface AnalyticsIp {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  primaryCategory: AnalyticsMediaType | null;
  status: string;
  workCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkExternalIdRecord {
  id: string;
  workId: string;
  sourceProviderId: string;
  sourceProviderName: string;
  sourceProviderSlug: string;
  externalId: string;
  externalUrl: string | null;
  matchType: AnalyticsMatchType;
  createdAt: Date;
}

export interface AnalyticsWork {
  id: string;
  organizationId: string;
  ipId: string | null;
  ipName: string | null;
  title: string;
  canonicalTitle: string | null;
  mediaType: AnalyticsMediaType;
  seriesName: string | null;
  volumeNumber: number | null;
  releaseDate: string | null;
  language: string | null;
  region: string | null;
  publisher: string | null;
  status: string;
  externalIdCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceProviderRecord {
  id: string;
  slug: string;
  name: string;
  sourceFamily: SourceFamily;
  accessType: AccessType;
  confidenceTier: ConfidenceTier;
  isActive: boolean;
  createdAt: Date;
  importCount?: number;
  lastImportAt?: Date | null;
}

export interface ImportBatchSummary {
  id: string;
  organizationId: string;
  sourceProviderId: string;
  sourceProviderName: string;
  sourceProviderSlug: string;
  importType: string;
  status: ImportStatus;
  autoReviewStatus: "pending" | "ready" | "needs_manual_review" | "published";
  rowCount: number;
  errorCount: number;
  normalizedCount: number;
  unresolvedFlagCount: number;
  sourceRecordCount: number;
  reviewQueueCount: number;
  publishedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  autoReviewSummary: {
    invalidRowCount: number;
    sourceRecordCount: number;
    matchedCount: number;
    needsReviewCount: number;
    normalizedCount: number;
    unresolvedCount: number;
    flagCount: number;
  } | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface QualityFlagRow {
  id: string;
  rawObservationId: string | null;
  workId: string | null;
  workTitle: string | null;
  rawTitle: string | null;
  rawIpName: string | null;
  sourceProviderName: string | null;
  flagType: QualityFlagType;
  severity: QualityFlagSeverity;
  notes: string | null;
  observedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface LeaderboardFilters {
  organizationId: string;
  window: AnalyticsTimeWindow;
  category?: AnalyticsMediaType | "all";
  query?: string;
  source?: string;
  confidence?: "all" | "high" | "medium" | "low";
  sort?: LeaderboardSort;
  limit?: number;
}

export interface LeaderboardRow {
  workId: string;
  title: string;
  ipId: string | null;
  ipName: string | null;
  category: AnalyticsMediaType;
  compositeScore: number;
  momentumScore: number;
  confidenceScore: number;
  confidenceBand: "high" | "medium" | "low";
  rankOverall: number | null;
  rankInCategory: number | null;
  rankDelta: number | null;
  sourceCoverageCount: number;
  provenanceBadge: AnalyticsProvenanceTag;
  latestScoreDate: string | null;
}

export interface ScoreComponentBreakdown {
  componentType: ScoreComponentType;
  componentScore: number;
  weightUsed: number;
  provenanceSummary: string | null;
}

export interface WorkDetail {
  work: AnalyticsWork;
  scoreHistory: Array<{
    window: AnalyticsTimeWindow;
    compositeScore: number;
    momentumScore: number;
    confidenceScore: number;
    rankOverall: number | null;
    rankDelta: number | null;
    scoreDate: string;
  }>;
  sourceBreakdown: Array<{
    sourceProviderId: string;
    sourceProviderName: string;
    sourceProviderSlug: string;
    observationCount: number;
    latestObservedAt: string | null;
    provenanceTags: AnalyticsProvenanceTag[];
  }>;
  componentBreakdown: ScoreComponentBreakdown[];
  qualityFlags: QualityFlagRow[];
}

export interface IpLeaderboardRow {
  ipId: string;
  name: string;
  slug: string;
  primaryCategory: AnalyticsMediaType | null;
  compositeScore: number;
  momentumScore: number;
  confidenceScore: number;
  rankOverall: number | null;
  rankDelta: number | null;
  activeWorkCount: number;
  strongestCategory: AnalyticsMediaType | null;
  latestScoreDate: string | null;
}

export interface IpDetail {
  ip: AnalyticsIp;
  scores: Array<{
    window: AnalyticsTimeWindow;
    compositeScore: number;
    momentumScore: number;
    confidenceScore: number;
    rankOverall: number | null;
    rankDelta: number | null;
    activeWorkCount: number;
    scoreDate: string;
  }>;
  topWorks: LeaderboardRow[];
  sourceCoverage: Array<{
    sourceProviderId: string;
    sourceProviderName: string;
    observationCount: number;
    latestObservedAt: string | null;
  }>;
}

export interface FreshnessRow {
  sourceProviderId: string;
  sourceProviderName: string;
  sourceProviderSlug: string;
  sourceFamily: SourceFamily;
  confidenceTier: ConfidenceTier;
  lastImportAt: string | null;
  lastCompletedAt: string | null;
  lastObservedAt: string | null;
  latestStatus: ImportStatus | "never";
  batchCount: number;
  rawObservationCount: number;
  normalizedObservationCount: number;
  unresolvedFlagCount: number;
  mappedWorkCount: number;
  isStale: boolean;
}

export interface AnalyticsOverview {
  latestScoreDate: string | null;
  topWorkCount: number;
  activeIpCount: number;
  trackedWorkCount: number;
  sourceProviderCount: number;
  unresolvedFlagCount: number;
  latestImportAt: string | null;
}

export interface ParsedCsvRow {
  line: number;
  values: Record<string, string>;
}

export interface CsvValidationError {
  line: number;
  field?: string;
  message: string;
}

export interface MetricObservation {
  metricType: AnalyticsMetricType;
  value: number;
  provenanceTag: AnalyticsProvenanceTag;
  observedAt: Date | string;
}

export interface ImportedMetric {
  metricType: AnalyticsMetricType;
  metricValue: number;
  metricUnit: string | null;
  provenanceTag: AnalyticsProvenanceTag;
}

export function availableResult<T>(data: T): AnalyticsQueryResult<T> {
  return { status: "ready", data };
}

export function unavailableResult<T>(
  data: T,
  reason = "Analytics schema is unavailable. Apply the deferred Supabase changes before using this feature.",
): AnalyticsQueryResult<T> {
  return { status: "unavailable", data, reason };
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function canonicalizeTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['"`’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(vol|volume|chapter|issue|edition)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function coerceNumber(
  value: string | number | null | undefined,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function coerceBoolean(
  value: string | boolean | null | undefined,
): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  return null;
}

export function normalizeCsvHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseJsonObject(
  value: string | null | undefined,
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

export function parseCsv(text: string): ParsedCsvRow[] {
  const rows = parseCsvMatrix(text);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) =>
    normalizeCsvHeader(header.replace(/^\uFEFF/, "")),
  );

  return rows
    .slice(1)
    .map((row, index) => {
      const values: Record<string, string> = {};

      headers.forEach((header, headerIndex) => {
        if (!header) {
          return;
        }

        values[header] = row[headerIndex] ?? "";
      });

      return {
        line: index + 2,
        values,
      };
    })
    .filter((row) =>
      Object.values(row.values).some((value) => value.trim() !== ""),
    );
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
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

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
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

export function validateCsvHeaders(headers: string[]): string[] {
  const normalizedHeaders = headers.map((header) => normalizeCsvHeader(header));
  return csvRequiredColumns.filter(
    (column) => !normalizedHeaders.includes(column),
  );
}

export function validateCsvRow(
  values: Record<string, string>,
): CsvValidationError[] {
  const errors: CsvValidationError[] = [];

  csvRequiredColumns.forEach((column) => {
    if (!values[column]?.trim()) {
      errors.push({
        line: 0,
        field: column,
        message: `Missing required value for ${column}.`,
      });
    }
  });

  if (
    values.media_type &&
    !analyticsMediaTypes.includes(values.media_type as AnalyticsMediaType)
  ) {
    errors.push({
      line: 0,
      field: "media_type",
      message: `Unsupported media_type "${values.media_type}".`,
    });
  }

  if (
    values.observed_at &&
    Number.isNaN(new Date(values.observed_at).getTime())
  ) {
    errors.push({
      line: 0,
      field: "observed_at",
      message: "Invalid observed_at timestamp.",
    });
  }

  const numericColumns: Array<keyof typeof values> = [
    "rank_value",
    "rating_value",
    "review_count",
    "view_count",
    "engagement_count",
    "sales_value",
    "search_interest",
  ];

  numericColumns.forEach((column) => {
    const value = values[column];
    if (value?.trim() && coerceNumber(value) === null) {
      errors.push({
        line: 0,
        field: column,
        message: `${column} must be numeric.`,
      });
    }
  });

  if (
    values.sales_is_estimated?.trim() &&
    coerceBoolean(values.sales_is_estimated) === null
  ) {
    errors.push({
      line: 0,
      field: "sales_is_estimated",
      message: "sales_is_estimated must be true or false.",
    });
  }

  return errors;
}

export function buildImportedMetrics(
  row: Record<string, string>,
): ImportedMetric[] {
  const metrics: ImportedMetric[] = [];
  const maybePush = (
    metricType: AnalyticsMetricType,
    rawValue: string | undefined,
    provenanceTag: AnalyticsProvenanceTag,
    metricUnit: string | null = null,
  ) => {
    const value = coerceNumber(rawValue);
    if (value === null) {
      return;
    }

    metrics.push({
      metricType,
      metricValue: value,
      metricUnit,
      provenanceTag,
    });
  };

  maybePush("rank_position", row.rank_value, "direct", "position");
  maybePush("rating_average", row.rating_value, "direct", "five_point");
  maybePush("review_count", row.review_count, "direct", "count");
  maybePush("view_count", row.view_count, "engagement", "count");
  maybePush("engagement_count", row.engagement_count, "engagement", "count");

  const salesProvenance = coerceBoolean(row.sales_is_estimated)
    ? "estimated"
    : "direct";
  maybePush("sales_value", row.sales_value, salesProvenance, "currency");

  if (row.award_name?.trim() || row.award_result?.trim()) {
    metrics.push({
      metricType: "award_signal",
      metricValue: 1,
      metricUnit: "award",
      provenanceTag: "awards",
    });
  }

  maybePush("search_interest", row.search_interest, "engagement", "index");

  return metrics;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function normalizeRankPosition(rank: number): number {
  const boundedRank = clamp(rank, 1, leaderboardRankCap);
  return clamp(
    ((leaderboardRankCap + 1 - boundedRank) / leaderboardRankCap) * 100,
    0,
    100,
  );
}

export function scoreRankingObservations(
  observations: MetricObservation[],
): number {
  const rankingObservations = observations.filter(
    (item) => item.metricType === "rank_position" && item.value > 0,
  );
  return roundScore(
    average(
      rankingObservations.map(
        (item) =>
          normalizeRankPosition(item.value) *
          provenanceMultipliers[item.provenanceTag],
      ),
    ),
  );
}

export function scoreReviewObservations(
  observations: MetricObservation[],
): number {
  const ratings = observations.filter(
    (item) => item.metricType === "rating_average" && item.value > 0,
  );
  const reviewCounts = observations.filter(
    (item) => item.metricType === "review_count" && item.value >= 0,
  );

  if (ratings.length === 0) {
    return 0;
  }

  const weightedRating = average(
    ratings.map(
      (item) =>
        clamp((item.value / 5) * 100, 0, 100) *
        provenanceMultipliers[item.provenanceTag],
    ),
  );
  const sampleFactor = clamp(
    average(reviewCounts.map((item) => item.value)) / 1000,
    0,
    1,
  );

  return roundScore(weightedRating * (0.4 + sampleFactor * 0.6));
}

export function scoreSalesObservations(
  observations: MetricObservation[],
): number {
  const sales = observations.filter(
    (item) => item.metricType === "sales_value" && item.value > 0,
  );
  return roundScore(
    average(
      sales.map(
        (item) =>
          clamp((Math.log10(item.value + 1) / 6) * 100, 0, 100) *
          provenanceMultipliers[item.provenanceTag],
      ),
    ),
  );
}

export function scoreAwardObservations(
  observations: MetricObservation[],
): number {
  const awards = observations.filter(
    (item) => item.metricType === "award_signal",
  );
  return roundScore(
    clamp(
      awards.reduce(
        (sum, item) => sum + 18 * provenanceMultipliers[item.provenanceTag],
        0,
      ),
      0,
      100,
    ),
  );
}

export function scoreMomentumObservations(
  observations: MetricObservation[],
): number {
  const ranked = observations
    .filter((item) => item.metricType === "rank_position")
    .sort(
      (left, right) =>
        asTimestamp(left.observedAt) - asTimestamp(right.observedAt),
    );
  const searches = observations
    .filter(
      (item) =>
        item.metricType === "search_interest" ||
        item.metricType === "engagement_count",
    )
    .sort(
      (left, right) =>
        asTimestamp(left.observedAt) - asTimestamp(right.observedAt),
    );

  const parts: number[] = [];

  if (ranked.length >= 2) {
    const first = ranked[0];
    const last = ranked[ranked.length - 1];
    const delta = first.value - last.value;
    parts.push(clamp(50 + delta / 2, 0, 100));
  }

  if (searches.length >= 2) {
    const first = searches[0];
    const last = searches[searches.length - 1];
    const denominator = Math.max(first.value, 1);
    const changeRatio = (last.value - first.value) / denominator;
    parts.push(clamp(50 + changeRatio * 50, 0, 100));
  }

  return roundScore(average(parts));
}

export function scoreConfidence(
  observations: MetricObservation[],
  sourceCoverageCount = 0,
): number {
  if (observations.length === 0) {
    return 0;
  }

  const provenanceAverage = average(
    observations.map((item) => provenanceMultipliers[item.provenanceTag]),
  );
  const coverageFactor = clamp(sourceCoverageCount / 5, 0, 1);
  return roundConfidence(
    clamp(provenanceAverage * 0.7 + coverageFactor * 0.3, 0, 1),
  );
}

export function getConfidenceBand(
  confidenceScore: number,
): "high" | "medium" | "low" {
  if (confidenceScore >= 0.75) {
    return "high";
  }

  if (confidenceScore >= 0.45) {
    return "medium";
  }

  return "low";
}

export function computeCompositeScore(
  components: Record<ScoreComponentType, number>,
): number {
  return roundScore(
    scoreComponentTypes.reduce(
      (sum, componentType) =>
        sum + components[componentType] * scoreComponentWeights[componentType],
      0,
    ),
  );
}

export function getWindowStart(
  window: AnalyticsTimeWindow,
  scoreDate = new Date(),
): Date | null {
  const baseDate = new Date(scoreDate);
  switch (window) {
    case "all_time":
      return null;
    case "5y":
      baseDate.setFullYear(baseDate.getFullYear() - 5);
      return baseDate;
    case "1y":
      baseDate.setFullYear(baseDate.getFullYear() - 1);
      return baseDate;
    case "6m":
      baseDate.setMonth(baseDate.getMonth() - 6);
      return baseDate;
    case "3m":
      baseDate.setMonth(baseDate.getMonth() - 3);
      return baseDate;
    case "1m":
      baseDate.setMonth(baseDate.getMonth() - 1);
      return baseDate;
    case "2w":
      baseDate.setDate(baseDate.getDate() - 14);
      return baseDate;
    case "1w":
      baseDate.setDate(baseDate.getDate() - 7);
      return baseDate;
    default:
      return null;
  }
}

export function formatScoreDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function asTimestamp(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function roundConfidence(value: number): number {
  return Math.round(value * 10000) / 10000;
}
