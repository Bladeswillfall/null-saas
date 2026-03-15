import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { assignRawObservationToWork, listQualityFlags, resolveQualityFlag } from '../analytics-repo';

export const qualityRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        unresolvedOnly: z.boolean().optional(),
        batchId: z.string().uuid().optional()
      })
    )
    .query(({ ctx, input }) => listQualityFlags(ctx, input)),

  resolve: protectedProcedure
    .input(
      z.object({
        flagId: z.string().uuid(),
        notes: z.string().optional()
      })
    )
    .mutation(({ ctx, input }) => resolveQualityFlag(ctx, input)),

  assignWork: protectedProcedure
    .input(
      z.object({
        rawObservationId: z.string().uuid(),
        workId: z.string().uuid()
      })
    )
    .mutation(({ ctx, input }) => assignRawObservationToWork(ctx, input))
});
