import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { subsidiaries } from '@null/db';
import {
  requireOrganizationAdmin,
  requireOrganizationMember,
  requireSubsidiaryOrganizationId
} from '../auth';

export const subsidiaryRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationMember(ctx, input.organizationId);
      return await ctx.db
        .select()
        .from(subsidiaries)
        .where(eq(subsidiaries.organizationId, input.organizationId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireSubsidiaryOrganizationId(ctx, input.id);
      await requireOrganizationMember(ctx, organizationId);
      const [subsidiary] = await ctx.db
        .select()
        .from(subsidiaries)
        .where(eq(subsidiaries.id, input.id))
        .limit(1);
      return subsidiary ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx, input.organizationId);
      const [subsidiary] = await ctx.db
        .insert(subsidiaries)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description
        })
        .returning();

      return subsidiary;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = await requireSubsidiaryOrganizationId(ctx, id);
      await requireOrganizationAdmin(ctx, organizationId);
      const [updated] = await ctx.db
        .update(subsidiaries)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(subsidiaries.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireSubsidiaryOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      await ctx.db.delete(subsidiaries).where(eq(subsidiaries.id, input.id));
      return { success: true };
    })
});
