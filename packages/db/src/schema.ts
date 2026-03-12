import { pgTable, uuid, text, timestamp, pgEnum, primaryKey, numeric, date, boolean } from 'drizzle-orm/pg-core';
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
