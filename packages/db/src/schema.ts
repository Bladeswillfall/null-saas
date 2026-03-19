import { pgTable, uuid, text, timestamp, pgEnum, primaryKey, numeric, date, boolean, integer, bigint, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member']);

// Profiles table (linked to auth.users)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Organization members junction table
export const organizationMembers = pgTable(
  'organization_members',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] })]
);

// Workspaces table
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Subsidiaries table
export const subsidiaries = pgTable('subsidiaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// IPs table
export const ips = pgTable('ips', {
  id: uuid('id').primaryKey().defaultRandom(),
  subsidiaryId: uuid('subsidiary_id')
    .notNull()
    .references(() => subsidiaries.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Creators table
export const creators = pgTable('creators', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// IP Contributors table
export const ipContributors = pgTable('ip_contributors', {
  id: uuid('id').primaryKey().defaultRandom(),
  ipId: uuid('ip_id')
    .notNull()
    .references(() => ips.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => creators.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('contributor'),
  contributionPercentage: numeric('contribution_percentage', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Creator Agreements table
export const creatorAgreements = pgTable('creator_agreements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => creators.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  terms: text('terms'),
  ratePercentage: numeric('rate_percentage', { precision: 5, scale: 2 }),
  effectiveDate: date('effective_date'),
  expiresDate: date('expires_date'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Payout Periods table
export const payoutPeriods = pgTable('payout_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: text('status').notNull().default('draft'),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Payout Ledger Entries table
export const payoutLedgerEntries = pgTable('payout_ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  payoutPeriodId: uuid('payout_period_id')
    .notNull()
    .references(() => payoutPeriods.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => creators.id, { onDelete: 'cascade' }),
  ipId: uuid('ip_id').references(() => ips.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  organizationMemberships: many(organizationMembers)
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  workspaces: many(workspaces),
  subsidiaries: many(subsidiaries),
  creators: many(creators),
  creatorAgreements: many(creatorAgreements),
  payoutPeriods: many(payoutPeriods)
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id]
  }),
  user: one(profiles, {
    fields: [organizationMembers.userId],
    references: [profiles.id]
  })
}));

export const workspacesRelations = relations(workspaces, ({ one }) => ({
  organization: one(organizations, {
    fields: [workspaces.organizationId],
    references: [organizations.id]
  })
}));

export const subsidiariesRelations = relations(subsidiaries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subsidiaries.organizationId],
    references: [organizations.id]
  }),
  ips: many(ips)
}));

export const ipsRelations = relations(ips, ({ one, many }) => ({
  subsidiary: one(subsidiaries, {
    fields: [ips.subsidiaryId],
    references: [subsidiaries.id]
  }),
  organization: one(organizations, {
    fields: [ips.organizationId],
    references: [organizations.id]
  }),
  contributors: many(ipContributors),
  payoutLedger: many(payoutLedgerEntries)
}));

export const creatorsRelations = relations(creators, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [creators.organizationId],
    references: [organizations.id]
  }),
  contributions: many(ipContributors),
  agreements: many(creatorAgreements),
  payoutEntries: many(payoutLedgerEntries)
}));

export const ipContributorsRelations = relations(ipContributors, ({ one }) => ({
  ip: one(ips, {
    fields: [ipContributors.ipId],
    references: [ips.id]
  }),
  creator: one(creators, {
    fields: [ipContributors.creatorId],
    references: [creators.id]
  })
}));

export const creatorAgreementsRelations = relations(creatorAgreements, ({ one }) => ({
  organization: one(organizations, {
    fields: [creatorAgreements.organizationId],
    references: [organizations.id]
  }),
  creator: one(creators, {
    fields: [creatorAgreements.creatorId],
    references: [creators.id]
  })
}));

export const payoutPeriodsRelations = relations(payoutPeriods, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [payoutPeriods.organizationId],
    references: [organizations.id]
  }),
  ledgerEntries: many(payoutLedgerEntries)
}));

export const payoutLedgerEntriesRelations = relations(payoutLedgerEntries, ({ one }) => ({
  payoutPeriod: one(payoutPeriods, {
    fields: [payoutLedgerEntries.payoutPeriodId],
    references: [payoutPeriods.id]
  }),
  creator: one(creators, {
    fields: [payoutLedgerEntries.creatorId],
    references: [creators.id]
  }),
  ip: one(ips, {
    fields: [payoutLedgerEntries.ipId],
    references: [ips.id]
  })
}));

// =============================================================================
// ANALYTICS SCHEMA (Chunk 2)
// =============================================================================

// ── enums ─────────────────────────────────────────────────────────────────────
export const mediaTypeEnum      = pgEnum('media_type_enum',    ['book','manga','manhwa','manhua','web_comic','comic']);
export const sourceFamilyEnum   = pgEnum('source_family_enum', ['ranking','reviews','awards','search','social','sales_estimated','sales_direct','metadata']);
export const accessTypeEnum     = pgEnum('access_type_enum',   ['csv','api','scrape','manual']);
export const confidenceTierEnum = pgEnum('confidence_tier_enum', ['gold','silver','bronze','community']);
export const matchTypeEnum      = pgEnum('match_type_enum',    ['exact','probable','manual']);
export const importStatusEnum   = pgEnum('import_status_enum', ['pending','processing','complete','failed','partial']);
export const provenanceTagEnum  = pgEnum('provenance_tag_enum',['direct','estimated','engagement','awards','metadata']);
export const flagTypeEnum       = pgEnum('flag_type_enum',     ['duplicate','outlier','missing_id','suspect_spike','low_sample','manual_review']);
export const flagSeverityEnum   = pgEnum('flag_severity_enum', ['info','warning','critical']);
export const timeWindowEnum     = pgEnum('time_window_enum',   ['all_time','5y','1y','6m','3m','1m','2w','1w']);
export const scopeTypeEnum      = pgEnum('scope_type_enum',    ['global','category','ip']);

// ── franchises ────────────────────────────────────────────────────────────────
export const franchises = pgTable('franchises', {
  id:              uuid('id').primaryKey().defaultRandom(),
  organizationId:  uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name:            text('name').notNull(),
  slug:            text('slug').notNull(),
  description:     text('description'),
  primaryCategory: mediaTypeEnum('primary_category'),
  status:          text('status').notNull().default('active'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── works ─────────────────────────────────────────────────────────────────────
export const works = pgTable('works', {
  id:             uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  franchiseId:    uuid('franchise_id').references(() => franchises.id, { onDelete: 'set null' }),
  title:          text('title').notNull(),
  canonicalTitle: text('canonical_title'),
  mediaType:      mediaTypeEnum('media_type').notNull(),
  seriesName:     text('series_name'),
  volumeNumber:   integer('volume_number'),
  releaseDate:    date('release_date'),
  language:       text('language'),
  region:         text('region'),
  publisher:      text('publisher'),
  status:         text('status').notNull().default('active'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── source_providers ──────────────────────────────────────────────────────────
export const sourceProviders = pgTable('source_providers', {
  id:             uuid('id').primaryKey().defaultRandom(),
  slug:           text('slug').notNull().unique(),
  name:           text('name').notNull(),
  sourceFamily:   sourceFamilyEnum('source_family').notNull(),
  accessType:     accessTypeEnum('access_type').notNull().default('csv'),
  confidenceTier: confidenceTierEnum('confidence_tier').notNull().default('bronze'),
  isActive:       boolean('is_active').notNull().default(true),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── work_external_ids ─────────────────────────────────────────────────────────
export const workExternalIds = pgTable('work_external_ids', {
  id:               uuid('id').primaryKey().defaultRandom(),
  workId:           uuid('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  sourceProviderId: uuid('source_provider_id').notNull().references(() => sourceProviders.id, { onDelete: 'cascade' }),
  externalId:       text('external_id').notNull(),
  externalUrl:      text('external_url'),
  matchType:        matchTypeEnum('match_type').notNull().default('manual'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── import_batches ────────────────────────────────────────────────────────────
export const importBatches = pgTable('import_batches', {
  id:               uuid('id').primaryKey().defaultRandom(),
  organizationId:   uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceProviderId: uuid('source_provider_id').notNull().references(() => sourceProviders.id, { onDelete: 'restrict' }),
  importType:       text('import_type').notNull().default('csv'),
  uploadedBy:       uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
  status:           importStatusEnum('status').notNull().default('pending'),
  rowCount:         integer('row_count').notNull().default(0),
  errorCount:       integer('error_count').notNull().default(0),
  startedAt:        timestamp('started_at', { withTimezone: true }),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── raw_observations ──────────────────────────────────────────────────────────
export const rawObservations = pgTable('raw_observations', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  importBatchId:      uuid('import_batch_id').notNull().references(() => importBatches.id, { onDelete: 'cascade' }),
  sourceProviderId:   uuid('source_provider_id').notNull().references(() => sourceProviders.id, { onDelete: 'restrict' }),
  rawWorkTitle:       text('raw_work_title'),
  rawIpName:          text('raw_ip_name'),
  rawAuthorOrCreator: text('raw_author_or_creator'),
  rawCategory:        text('raw_category'),
  rawRegion:          text('raw_region'),
  rawLanguage:        text('raw_language'),
  observedAt:         timestamp('observed_at', { withTimezone: true }).notNull(),
  rankValue:          integer('rank_value'),
  ratingValue:        numeric('rating_value', { precision: 4, scale: 2 }),
  reviewCount:        integer('review_count'),
  viewCount:          bigint('view_count', { mode: 'number' }),
  engagementCount:    bigint('engagement_count', { mode: 'number' }),
  salesValue:         numeric('sales_value', { precision: 15, scale: 2 }),
  salesIsEstimated:   boolean('sales_is_estimated'),
  awardsValue:        text('awards_value'),
  metadataJson:       jsonb('metadata_json'),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── normalized_observations ───────────────────────────────────────────────────
export const normalizedObservations = pgTable('normalized_observations', {
  id:               uuid('id').primaryKey().defaultRandom(),
  rawObservationId: uuid('raw_observation_id').notNull().references(() => rawObservations.id, { onDelete: 'cascade' }),
  workId:           uuid('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  sourceProviderId: uuid('source_provider_id').notNull().references(() => sourceProviders.id, { onDelete: 'restrict' }),
  observedAt:       timestamp('observed_at', { withTimezone: true }).notNull(),
  metricType:       text('metric_type').notNull(),
  metricValue:      numeric('metric_value', { precision: 20, scale: 6 }).notNull(),
  metricUnit:       text('metric_unit'),
  windowHint:       text('window_hint'),
  confidenceScore:  numeric('confidence_score', { precision: 5, scale: 4 }),
  provenanceTag:    provenanceTagEnum('provenance_tag').notNull(),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── quality_flags ─────────────────────────────────────────────────────────────
export const qualityFlags = pgTable('quality_flags', {
  id:               uuid('id').primaryKey().defaultRandom(),
  rawObservationId: uuid('raw_observation_id').references(() => rawObservations.id, { onDelete: 'cascade' }),
  workId:           uuid('work_id').references(() => works.id, { onDelete: 'cascade' }),
  flagType:         flagTypeEnum('flag_type').notNull(),
  severity:         flagSeverityEnum('severity').notNull().default('warning'),
  notes:            text('notes'),
  resolvedAt:       timestamp('resolved_at', { withTimezone: true }),
  resolvedBy:       uuid('resolved_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── score_components ──────────────────────────────────────────────────────────
export const scoreComponents = pgTable('score_components', {
  id:                uuid('id').primaryKey().defaultRandom(),
  workId:            uuid('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  scoreDate:         date('score_date').notNull(),
  timeWindow:        timeWindowEnum('time_window').notNull(),
  componentType:     text('component_type').notNull(),
  componentScore:    numeric('component_score', { precision: 10, scale: 6 }).notNull(),
  weightUsed:        numeric('weight_used', { precision: 5, scale: 4 }),
  provenanceSummary: text('provenance_summary'),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── work_scores ───────────────────────────────────────────────────────────────
export const workScores = pgTable('work_scores', {
  id:              uuid('id').primaryKey().defaultRandom(),
  workId:          uuid('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  scoreDate:       date('score_date').notNull(),
  timeWindow:      timeWindowEnum('time_window').notNull(),
  compositeScore:  numeric('composite_score', { precision: 10, scale: 6 }).notNull().default('0'),
  momentumScore:   numeric('momentum_score', { precision: 10, scale: 6 }),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 4 }),
  rankOverall:     integer('rank_overall'),
  rankInCategory:  integer('rank_in_category'),
  rankDelta:       integer('rank_delta'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── ip_scores ─────────────────────────────────────────────────────────────────
export const ipScores = pgTable('ip_scores', {
  id:               uuid('id').primaryKey().defaultRandom(),
  franchiseId:      uuid('franchise_id').notNull().references(() => franchises.id, { onDelete: 'cascade' }),
  scoreDate:        date('score_date').notNull(),
  timeWindow:       timeWindowEnum('time_window').notNull(),
  compositeScore:   numeric('composite_score', { precision: 10, scale: 6 }).notNull().default('0'),
  momentumScore:    numeric('momentum_score', { precision: 10, scale: 6 }),
  confidenceScore:  numeric('confidence_score', { precision: 5, scale: 4 }),
  rankOverall:      integer('rank_overall'),
  rankDelta:        integer('rank_delta'),
  activeWorkCount:  integer('active_work_count').notNull().default(0),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── leaderboard_snapshots ─────────────────────────────────────────────────────

export const importFileRows = pgTable('import_file_rows', {
  id: uuid('id').primaryKey().defaultRandom(),
  importBatchId: uuid('import_batch_id').notNull().references(() => importBatches.id, { onDelete: 'cascade' }),
  rowNumber: integer('row_number').notNull(),
  rowPayload: jsonb('row_payload').notNull().default({}),
  rowHash: text('row_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  importBatchRowUnique: uniqueIndex('import_file_rows_batch_row_unique').on(table.importBatchId, table.rowNumber)
}));

export const sourceRecords = pgTable('source_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceProviderId: uuid('source_provider_id').notNull().references(() => sourceProviders.id, { onDelete: 'restrict' }),
  importBatchId: uuid('import_batch_id').references(() => importBatches.id, { onDelete: 'cascade' }),
  importFileRowId: uuid('import_file_row_id').references(() => importFileRows.id, { onDelete: 'set null' }),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  rawTitle: text('raw_title').notNull(),
  rawCreator: text('raw_creator'),
  rawPublisher: text('raw_publisher'),
  rawSeries: text('raw_series'),
  rawLanguage: text('raw_language'),
  rawRegion: text('raw_region'),
  rawIsbn10: text('raw_isbn_10'),
  rawIsbn13: text('raw_isbn_13'),
  rawAsin: text('raw_asin'),
  rawPublicationDate: text('raw_publication_date'),
  rawFormat: text('raw_format'),
  rawPayload: jsonb('raw_payload').notNull().default({}),
  normalizedTitle: text('normalized_title'),
  normalizedCreator: text('normalized_creator'),
  normalizedPublisher: text('normalized_publisher'),
  normalizedSeries: text('normalized_series'),
  parsedPublicationDate: date('parsed_publication_date'),
  parsedRatingValue: numeric('parsed_rating_value', { precision: 6, scale: 3 }),
  parsedReviewCount: integer('parsed_review_count'),
  parsedRankValue: integer('parsed_rank_value'),
  parsedSalesValue: numeric('parsed_sales_value', { precision: 15, scale: 2 }),
  parsedCurrency: text('parsed_currency'),
  observedAt: timestamp('observed_at', { withTimezone: true }),
  recordFingerprint: text('record_fingerprint'),
  ingestionStatus: text('ingestion_status').notNull().default('ready'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sourceRecordMatches = pgTable('source_record_matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceRecordId: uuid('source_record_id').notNull().references(() => sourceRecords.id, { onDelete: 'cascade' }),
  workId: uuid('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  matchMethod: text('match_method').notNull(),
  matchScore: numeric('match_score', { precision: 6, scale: 4 }).notNull().default('0'),
  matchType: matchTypeEnum('match_type').notNull().default('probable'),
  matchedOn: jsonb('matched_on').notNull().default({}),
  isSelected: boolean('is_selected').notNull().default(false),
  selectedBy: uuid('selected_by').references(() => profiles.id, { onDelete: 'set null' }),
  selectedAt: timestamp('selected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourceWorkUnique: uniqueIndex('source_record_matches_source_work_unique').on(table.sourceRecordId, table.workId),
  sourceIdx: index('idx_source_record_matches_source').on(table.sourceRecordId),
  workIdx: index('idx_source_record_matches_work').on(table.workId)
}));

export const workSourceSummaries = pgTable('work_source_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  workId: uuid('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  sourceProviderId: uuid('source_provider_id').notNull().references(() => sourceProviders.id, { onDelete: 'cascade' }),
  sourceRecordId: uuid('source_record_id').references(() => sourceRecords.id, { onDelete: 'set null' }),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  displayTitle: text('display_title'),
  displayCreator: text('display_creator'),
  displayPublisher: text('display_publisher'),
  isbn10: text('isbn_10'),
  isbn13: text('isbn_13'),
  asin: text('asin'),
  rankValue: integer('rank_value'),
  ratingValue: numeric('rating_value', { precision: 6, scale: 3 }),
  reviewCount: integer('review_count'),
  salesValue: numeric('sales_value', { precision: 15, scale: 2 }),
  observedAt: timestamp('observed_at', { withTimezone: true }),
  freshnessBucket: text('freshness_bucket'),
  varianceNotes: text('variance_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workAggregateSummaries = pgTable('work_aggregate_summaries', {
  workId: uuid('work_id').primaryKey().references(() => works.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  canonicalTitle: text('canonical_title').notNull(),
  canonicalCreator: text('canonical_creator'),
  canonicalPublisher: text('canonical_publisher'),
  canonicalIsbn10: text('canonical_isbn_10'),
  canonicalIsbn13: text('canonical_isbn_13'),
  canonicalAsin: text('canonical_asin'),
  aggregateDisplayRating: numeric('aggregate_display_rating', { precision: 6, scale: 3 }),
  compositeScore: numeric('composite_score', { precision: 10, scale: 4 }).notNull().default('0'),
  movementValue: integer('movement_value'),
  sourceCoverageCount: integer('source_coverage_count').notNull().default(0),
  freshestObservedAt: timestamp('freshest_observed_at', { withTimezone: true }),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 4 }),
  disagreementScore: numeric('disagreement_score', { precision: 5, scale: 4 }),
  freshnessScore: numeric('freshness_score', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workAggregateSummaryHistory = pgTable('work_aggregate_summary_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  workId: uuid('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  compositeScore: numeric('composite_score', { precision: 10, scale: 4 }).notNull(),
  aggregateDisplayRating: numeric('aggregate_display_rating', { precision: 6, scale: 3 }),
  sourceCoverageCount: integer('source_coverage_count').notNull().default(0),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leaderboardSnapshots = pgTable('leaderboard_snapshots', {
  id:           uuid('id').primaryKey().defaultRandom(),
  snapshotDate: date('snapshot_date').notNull(),
  timeWindow:   timeWindowEnum('time_window').notNull(),
  scopeType:    scopeTypeEnum('scope_type').notNull(),
  scopeValue:   text('scope_value').notNull().default(''),
  generatedAt:  timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});

// =============================================================================
// ANALYTICS RELATIONS
// =============================================================================

export const franchisesRelations = relations(franchises, ({ one, many }) => ({
  organization: one(organizations, { fields: [franchises.organizationId], references: [organizations.id] }),
  works: many(works),
  ipScores: many(ipScores),
}));

export const worksRelations = relations(works, ({ one, many }) => ({
  organization:  one(organizations, { fields: [works.organizationId],  references: [organizations.id] }),
  franchise:     one(franchises,    { fields: [works.franchiseId],     references: [franchises.id] }),
  externalIds:   many(workExternalIds),
  observations:  many(normalizedObservations),
  scores:        many(workScores),
  scoreComponents: many(scoreComponents),
  qualityFlags:  many(qualityFlags),
}));

export const sourceProvidersRelations = relations(sourceProviders, ({ many }) => ({
  externalIds:   many(workExternalIds),
  importBatches: many(importBatches),
  rawObservations: many(rawObservations),
  normalizedObservations: many(normalizedObservations),
}));

export const workExternalIdsRelations = relations(workExternalIds, ({ one }) => ({
  work:           one(works,           { fields: [workExternalIds.workId],           references: [works.id] }),
  sourceProvider: one(sourceProviders, { fields: [workExternalIds.sourceProviderId], references: [sourceProviders.id] }),
}));

export const importBatchesRelations = relations(importBatches, ({ one, many }) => ({
  organization:   one(organizations,   { fields: [importBatches.organizationId],   references: [organizations.id] }),
  sourceProvider: one(sourceProviders, { fields: [importBatches.sourceProviderId], references: [sourceProviders.id] }),
  uploadedBy:     one(profiles,        { fields: [importBatches.uploadedBy],        references: [profiles.id] }),
  rawObservations: many(rawObservations),
}));

export const rawObservationsRelations = relations(rawObservations, ({ one, many }) => ({
  importBatch:    one(importBatches,   { fields: [rawObservations.importBatchId],    references: [importBatches.id] }),
  sourceProvider: one(sourceProviders, { fields: [rawObservations.sourceProviderId], references: [sourceProviders.id] }),
  normalized:     many(normalizedObservations),
  qualityFlags:   many(qualityFlags),
}));

export const normalizedObservationsRelations = relations(normalizedObservations, ({ one }) => ({
  rawObservation: one(rawObservations, { fields: [normalizedObservations.rawObservationId], references: [rawObservations.id] }),
  work:           one(works,           { fields: [normalizedObservations.workId],           references: [works.id] }),
  sourceProvider: one(sourceProviders, { fields: [normalizedObservations.sourceProviderId], references: [sourceProviders.id] }),
}));

export const qualityFlagsRelations = relations(qualityFlags, ({ one }) => ({
  rawObservation: one(rawObservations, { fields: [qualityFlags.rawObservationId], references: [rawObservations.id] }),
  work:           one(works,           { fields: [qualityFlags.workId],           references: [works.id] }),
  resolvedBy:     one(profiles,        { fields: [qualityFlags.resolvedBy],       references: [profiles.id] }),
}));

export const scoreComponentsRelations = relations(scoreComponents, ({ one }) => ({
  work: one(works, { fields: [scoreComponents.workId], references: [works.id] }),
}));

export const workScoresRelations = relations(workScores, ({ one }) => ({
  work: one(works, { fields: [workScores.workId], references: [works.id] }),
}));

export const ipScoresRelations = relations(ipScores, ({ one }) => ({
  franchise: one(franchises, { fields: [ipScores.franchiseId], references: [franchises.id] }),
}));


export const importFileRowsRelations = relations(importFileRows, ({ one }) => ({
  importBatch: one(importBatches, { fields: [importFileRows.importBatchId], references: [importBatches.id] }),
}));

export const sourceRecordsRelations = relations(sourceRecords, ({ one, many }) => ({
  organization: one(organizations, { fields: [sourceRecords.organizationId], references: [organizations.id] }),
  sourceProvider: one(sourceProviders, { fields: [sourceRecords.sourceProviderId], references: [sourceProviders.id] }),
  importBatch: one(importBatches, { fields: [sourceRecords.importBatchId], references: [importBatches.id] }),
  importFileRow: one(importFileRows, { fields: [sourceRecords.importFileRowId], references: [importFileRows.id] }),
  matches: many(sourceRecordMatches),
  summaries: many(workSourceSummaries),
}));

export const sourceRecordMatchesRelations = relations(sourceRecordMatches, ({ one }) => ({
  sourceRecord: one(sourceRecords, { fields: [sourceRecordMatches.sourceRecordId], references: [sourceRecords.id] }),
  work: one(works, { fields: [sourceRecordMatches.workId], references: [works.id] }),
  selectedByProfile: one(profiles, { fields: [sourceRecordMatches.selectedBy], references: [profiles.id] }),
}));

export const workSourceSummariesRelations = relations(workSourceSummaries, ({ one }) => ({
  work: one(works, { fields: [workSourceSummaries.workId], references: [works.id] }),
  sourceProvider: one(sourceProviders, { fields: [workSourceSummaries.sourceProviderId], references: [sourceProviders.id] }),
  sourceRecord: one(sourceRecords, { fields: [workSourceSummaries.sourceRecordId], references: [sourceRecords.id] }),
}));

export const workAggregateSummariesRelations = relations(workAggregateSummaries, ({ one }) => ({
  work: one(works, { fields: [workAggregateSummaries.workId], references: [works.id] }),
  organization: one(organizations, { fields: [workAggregateSummaries.organizationId], references: [organizations.id] }),
}));

export const workAggregateSummaryHistoryRelations = relations(workAggregateSummaryHistory, ({ one }) => ({
  work: one(works, { fields: [workAggregateSummaryHistory.workId], references: [works.id] }),
}));
