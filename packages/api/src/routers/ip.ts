import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { ips } from '@null/db';
import {
  assertSameOrganization,
  requireIpOrganizationId,
  requireOrganizationAdmin,
  requireOrganizationMember,
  requireSubsidiaryOrganizationId
} from '../auth';

export const ipRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationMember(ctx, input.organizationId);
      return await ctx.db
        .select()
        .from(ips)
        .where(eq(ips.organizationId, input.organizationId));
    }),

  listBySubsidiary: protectedProcedure
    .input(z.object({ subsidiaryId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireSubsidiaryOrganizationId(ctx, input.subsidiaryId);
      await requireOrganizationMember(ctx, organizationId);
      return await ctx.db
        .select()
        .from(ips)
        .where(eq(ips.subsidiaryId, input.subsidiaryId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireIpOrganizationId(ctx, input.id);
      await requireOrganizationMember(ctx, organizationId);
      const [ip] = await ctx.db
        .select()
        .from(ips)
        .where(eq(ips.id, input.id))
        .limit(1);
      return ip ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        subsidiaryId: z.string().uuid(),
        organizationId: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        status: z.enum(['active', 'inactive', 'archived']).default('active')
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx, input.organizationId);
      const subsidiaryOrganizationId = await requireSubsidiaryOrganizationId(ctx, input.subsidiaryId);
      assertSameOrganization(input.organizationId, subsidiaryOrganizationId, 'Subsidiary');
      const [ip] = await ctx.db
        .insert(ips)
        .values({
          subsidiaryId: input.subsidiaryId,
          organizationId: input.organizationId,
          title: input.title,
          description: input.description,
          status: input.status
        })
        .returning();

      return ip;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        status: z.enum(['active', 'inactive', 'archived']).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = await requireIpOrganizationId(ctx, id);
      await requireOrganizationAdmin(ctx, organizationId);
      const [updated] = await ctx.db
        .update(ips)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ips.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireIpOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      await ctx.db.delete(ips).where(eq(ips.id, input.id));
      return { success: true };
    })
});
