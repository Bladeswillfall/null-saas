import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { listImportBatches, normalizeImportBatch } from '../analytics-repo';

export const importBatchRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ ctx, input }) => listImportBatches(ctx, input)),

  normalize: protectedProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .mutation(({ ctx, input }) => normalizeImportBatch(ctx, input))
});
