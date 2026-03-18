import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { creatorAgreements, creators } from '@null/db';
import {
  assertSameOrganization,
  requireAgreementOrganizationId,
  requireCreatorOrganizationId,
  requireOrganizationAdmin,
  requireOrganizationMember
} from '../auth';

export const agreementRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationMember(ctx, input.organizationId);
      return await ctx.db
        .select({
          id: creatorAgreements.id,
          organizationId: creatorAgreements.organizationId,
          creatorId: creatorAgreements.creatorId,
          title: creatorAgreements.title,
          terms: creatorAgreements.terms,
          ratePercentage: creatorAgreements.ratePercentage,
          effectiveDate: creatorAgreements.effectiveDate,
          expiresDate: creatorAgreements.expiresDate,
          status: creatorAgreements.status,
          createdAt: creatorAgreements.createdAt,
          updatedAt: creatorAgreements.updatedAt,
          creatorName: creators.name
        })
        .from(creatorAgreements)
        .leftJoin(creators, eq(creatorAgreements.creatorId, creators.id))
        .where(eq(creatorAgreements.organizationId, input.organizationId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireAgreementOrganizationId(ctx, input.id);
      await requireOrganizationMember(ctx, organizationId);
      const [agreement] = await ctx.db
        .select()
        .from(creatorAgreements)
        .where(eq(creatorAgreements.id, input.id))
        .limit(1);
      return agreement ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        creatorId: z.string().uuid(),
        title: z.string().min(1).max(200),
        terms: z.string().max(5000).optional(),
        ratePercentage: z.string().optional(),
        effectiveDate: z.string().optional(),
        expiresDate: z.string().optional(),
        status: z.enum(['draft', 'active', 'expired']).default('draft')
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx, input.organizationId);
      const creatorOrganizationId = await requireCreatorOrganizationId(ctx, input.creatorId);
      assertSameOrganization(input.organizationId, creatorOrganizationId, 'Creator');
      const [agreement] = await ctx.db
        .insert(creatorAgreements)
        .values({
          organizationId: input.organizationId,
          creatorId: input.creatorId,
          title: input.title,
          terms: input.terms,
          ratePercentage: input.ratePercentage,
          effectiveDate: input.effectiveDate,
          expiresDate: input.expiresDate,
          status: input.status
        })
        .returning();

      return agreement;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        terms: z.string().max(5000).optional(),
        ratePercentage: z.string().optional(),
        effectiveDate: z.string().optional(),
        expiresDate: z.string().optional(),
        status: z.enum(['draft', 'active', 'expired']).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = await requireAgreementOrganizationId(ctx, id);
      await requireOrganizationAdmin(ctx, organizationId);
      const [updated] = await ctx.db
        .update(creatorAgreements)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(creatorAgreements.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireAgreementOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      await ctx.db.delete(creatorAgreements).where(eq(creatorAgreements.id, input.id));
      return { success: true };
    })
});
