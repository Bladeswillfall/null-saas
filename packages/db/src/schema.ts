import { pgTable, uuid, text, timestamp, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
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

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  organizationMemberships: many(organizationMembers)
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  workspaces: many(workspaces)
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
