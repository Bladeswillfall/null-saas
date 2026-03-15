import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { workspaces, organizationMembers } from '@null/db';
import { TRPCError } from '@trpc/server';

export const workspaceRouter = router({
  // List workspaces for an organization
  listByOrg: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check membership
      const [membership] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, ctx.user.id))
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this organization.'
        });
      }

      const orgWorkspaces = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.organizationId, input.organizationId));

      return orgWorkspaces;
    }),

  // Create a new workspace
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/)
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check membership
      const [membership] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(eq(organizationMembers.organizationId, input.organizationId), eq(organizationMembers.userId, ctx.user.id))
        )
        .limit(1);

      if (!membership || membership.role === 'member') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create workspaces.'
        });
      }

      const [newWorkspace] = await ctx.db
        .insert(workspaces)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          slug: input.slug
        })
        .returning();

      return newWorkspace;
    })
});
