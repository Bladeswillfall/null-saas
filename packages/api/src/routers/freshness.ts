import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { listFreshnessRows } from '../analytics-repo';

export const freshnessRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ ctx, input }) => listFreshnessRows(ctx, input))
});
