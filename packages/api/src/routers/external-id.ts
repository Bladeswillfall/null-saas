import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { createExternalId, deleteExternalId, listExternalIdsByWork } from '../analytics-repo';

export const externalIdRouter = router({
  listByWork: protectedProcedure
    .input(z.object({ workId: z.string().uuid() }))
    .query(({ ctx, input }) => listExternalIdsByWork(ctx, input)),

  create: protectedProcedure
    .input(
      z.object({
        workId: z.string().uuid(),
        sourceProviderId: z.string().uuid(),
        externalId: z.string().min(1).max(300),
        externalUrl: z.string().url().optional().or(z.literal('')),
        matchType: z.enum(['exact', 'probable', 'manual']).optional()
      })
    )
    .mutation(({ ctx, input }) =>
      createExternalId(ctx, {
        ...input,
        externalUrl: input.externalUrl || undefined
      })
    ),

  delete: protectedProcedure
    .input(z.object({ externalIdId: z.string().uuid() }))
    .mutation(({ ctx, input }) => deleteExternalId(ctx, input))
});
