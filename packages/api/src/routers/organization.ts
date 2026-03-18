import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { organizations, organizationMembers, profiles } from '@null/db';
import { requireOrganizationMember } from '../auth';

export const organizationRouter = router({
  // List organizations the user is a member of
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: organizationMembers.role,
        createdAt: organizations.createdAt
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, ctx.user.id));

    return memberships;
  }),

  // Get a single organization by slug
  getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const [org] = await ctx.db.select().from(organizations).where(eq(organizations.slug, input.slug)).limit(1);
    if (!org) {
      return null;
    }

    await requireOrganizationMember(ctx, org.id);

    return org;
  }),

  // Create a new organization
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const name = input.name.trim();
      const slug = input.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      return await ctx.db.transaction(async (tx) => {
        // Ensure profile exists for the user (handles case where trigger failed)
        await tx
          .insert(profiles)
          .values({
            id: ctx.user.id,
            email: ctx.user.email ?? null
          })
          .onConflictDoNothing();

        // Check if slug already exists
        const existing = await tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, slug))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Organization slug already exists.'
          });
        }

        // Create organization
        const [newOrg] = await tx
          .insert(organizations)
          .values({ name, slug })
          .returning();

        // Add user as owner (all in transaction, so both succeed or both fail)
        await tx.insert(organizationMembers).values({
          organizationId: newOrg.id,
          userId: ctx.user.id,
          role: 'owner'
        });

        return newOrg;
      });
    })
});
