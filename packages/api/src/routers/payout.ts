import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { payoutPeriods, payoutLedgerEntries, creators, ips } from '@null/db';
import {
  assertSameOrganization,
  requireCreatorOrganizationId,
  requireIpOrganizationId,
  requireLedgerEntryOrganizationId,
  requireOrganizationAdmin,
  requireOrganizationMember,
  requirePayoutPeriodOrganizationId
} from '../auth';

export const payoutRouter = router({
  // List all payout periods for an organization
  listPeriods: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireOrganizationMember(ctx, input.organizationId);
      return await ctx.db
        .select()
        .from(payoutPeriods)
        .where(eq(payoutPeriods.organizationId, input.organizationId))
        .orderBy(desc(payoutPeriods.periodStart));
    }),

  // Get a single payout period with its ledger entries
  getPeriod: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requirePayoutPeriodOrganizationId(ctx, input.id);
      await requireOrganizationMember(ctx, organizationId);
      const [period] = await ctx.db
        .select()
        .from(payoutPeriods)
        .where(eq(payoutPeriods.id, input.id))
        .limit(1);

      if (!period) return null;

      const entries = await ctx.db
        .select({
          id: payoutLedgerEntries.id,
          creatorId: payoutLedgerEntries.creatorId,
          creatorName: creators.name,
          ipId: payoutLedgerEntries.ipId,
          ipTitle: ips.title,
          amount: payoutLedgerEntries.amount,
          createdAt: payoutLedgerEntries.createdAt
        })
        .from(payoutLedgerEntries)
        .leftJoin(creators, eq(payoutLedgerEntries.creatorId, creators.id))
        .leftJoin(ips, eq(payoutLedgerEntries.ipId, ips.id))
        .where(eq(payoutLedgerEntries.payoutPeriodId, input.id))
        .orderBy(desc(payoutLedgerEntries.createdAt));

      return { period, entries };
    }),

  // Create a new draft payout period
  createPeriod: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        periodStart: z.string().date(),
        periodEnd: z.string().date()
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrganizationAdmin(ctx, input.organizationId);
      const [newPeriod] = await ctx.db
        .insert(payoutPeriods)
        .values({
          organizationId: input.organizationId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: 'draft'
        })
        .returning();

      return newPeriod;
    }),

  // Update payout period status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'published', 'finalized'])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requirePayoutPeriodOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      const [updated] = await ctx.db
        .update(payoutPeriods)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(payoutPeriods.id, input.id))
        .returning();

      return updated;
    }),

  // Add ledger entry for a creator
  addLedgerEntry: protectedProcedure
    .input(
      z.object({
        payoutPeriodId: z.string().uuid(),
        creatorId: z.string().uuid(),
        ipId: z.string().uuid().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requirePayoutPeriodOrganizationId(ctx, input.payoutPeriodId);
      await requireOrganizationAdmin(ctx, organizationId);
      const creatorOrganizationId = await requireCreatorOrganizationId(ctx, input.creatorId);
      assertSameOrganization(organizationId, creatorOrganizationId, 'Creator');
      if (input.ipId) {
        const ipOrganizationId = await requireIpOrganizationId(ctx, input.ipId);
        assertSameOrganization(organizationId, ipOrganizationId, 'IP');
      }
      const [entry] = await ctx.db
        .insert(payoutLedgerEntries)
        .values({
          payoutPeriodId: input.payoutPeriodId,
          creatorId: input.creatorId,
          ipId: input.ipId || null,
          amount: input.amount
        })
        .returning();

      return entry;
    }),

  // Remove ledger entry
  removeLedgerEntry: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireLedgerEntryOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      await ctx.db.delete(payoutLedgerEntries).where(eq(payoutLedgerEntries.id, input.id));
      return { success: true };
    }),

  // Update ledger entry amount
  updateLedgerEntry: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireLedgerEntryOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      const [updated] = await ctx.db
        .update(payoutLedgerEntries)
        .set({ amount: input.amount })
        .where(eq(payoutLedgerEntries.id, input.id))
        .returning();

      return updated;
    }),

  // Delete a payout period (only if draft)
  deletePeriod: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requirePayoutPeriodOrganizationId(ctx, input.id);
      await requireOrganizationAdmin(ctx, organizationId);
      // First delete all ledger entries
      await ctx.db.delete(payoutLedgerEntries).where(eq(payoutLedgerEntries.payoutPeriodId, input.id));

      // Then delete the period
      await ctx.db.delete(payoutPeriods).where(eq(payoutPeriods.id, input.id));

      return { success: true };
    })
});
