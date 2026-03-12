import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { subsidiaries, organizations } from '@null/db';

export const subsidiaryRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(subsidiaries)
        .where(eq(subsidiaries.organizationId, input.organizationId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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
      await ctx.db.delete(subsidiaries).where(eq(subsidiaries.id, input.id));
      return { success: true };
    })
});
