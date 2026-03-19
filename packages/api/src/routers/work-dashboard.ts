import { z } from 'zod';
import { workDashboardSorts } from '@null/domain';
import { protectedProcedure, router } from '../trpc';
import {
  createWorkFromSourceRecord,
  getWorkDashboardRows,
  getWorkEvidenceRows,
  listManualReviewQueue,
  rebuildBatchSummaries,
  selectManualMatch
} from '../entity-resolution-repo';

export const workDashboardRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid(), page: z.number().int().min(1).optional(), pageSize: z.number().int().min(1).max(100).optional(), sort: z.enum(workDashboardSorts).optional() }))
    .query(({ ctx, input }) => getWorkDashboardRows(ctx, input)),

  evidence: protectedProcedure
    .input(z.object({ workId: z.string().uuid() }))
    .query(({ ctx, input }) => getWorkEvidenceRows(ctx, input.workId)),

  reviewQueue: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ ctx, input }) => listManualReviewQueue(ctx, input.organizationId)),

  selectMatch: protectedProcedure
    .input(z.object({ sourceRecordId: z.string().uuid(), workId: z.string().uuid() }))
    .mutation(({ ctx, input }) => selectManualMatch(ctx, input)),

  createWorkFromSourceRecord: protectedProcedure
    .input(z.object({ sourceRecordId: z.string().uuid() }))
    .mutation(({ ctx, input }) => createWorkFromSourceRecord(ctx, input)),

  rebuildBatch: protectedProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .mutation(({ ctx, input }) => rebuildBatchSummaries(ctx, input.batchId))
});
