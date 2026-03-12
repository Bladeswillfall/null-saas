import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { organizations, organizationMembers } from '@null/db';

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

    return org ?? null;
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
      const [newOrg] = await ctx.db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug
        })
        .returning();

      // Add creator as owner
      await ctx.db.insert(organizationMembers).values({
        organizationId: newOrg.id,
        userId: ctx.user.id,
        role: 'owner'
      });

      return newOrg;
    })
});
