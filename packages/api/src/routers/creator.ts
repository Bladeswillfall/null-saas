import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { creators } from '@null/db';
import {
  requireCreatorOrganizationId,
  requireOrganizationAdmin,
  requireOrganizationMember
} from '../auth';

export const creatorRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationMember(ctx, input.organizationId);
      return await ctx.db
        .select()
        .from(creators)
        .where(eq(creators.organizationId, input.organizationId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireCreatorOrganizationId(ctx, input.id);
      await requireOrganizationMember(ctx, organizationId);
      const [creator] = await ctx.db
        .select()
        .from(creators)
        .where(eq(creators.id, input.id))
        .limit(1);
      return creator ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(200),
        email: z.string().email().optional(),
        verified: z.boolean().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx, input.organizationId);
      const [creator] = await ctx.db
        .insert(creators)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          email: input.email,
          verified: input.verified
        })
        .returning();

      return creator;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        email: z.string().email().optional(),
        verified: z.boolean().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = await requireCreatorOrganizationId(ctx, id);
      await requireOrganizationAdmin(ctx, organizationId);
      const [updated] = await ctx.db
        .update(creators)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(creators.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireCreatorOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      await ctx.db.delete(creators).where(eq(creators.id, input.id));
      return { success: true };
    })
});
