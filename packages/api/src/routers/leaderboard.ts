import { z } from 'zod';
import { analyticsMediaTypes, analyticsTimeWindows, leaderboardSorts } from '@null/domain';
import { protectedProcedure, router } from '../trpc';
import {
  getAnalyticsOverview,
  getIpDetail,
  getWorkDetail,
  listIpLeaderboardRows,
  listLeaderboardRows,
  rebuildScores
} from '../analytics-repo';

export const leaderboardRouter = router({
  overview: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ ctx, input }) => getAnalyticsOverview(ctx, input)),

  listGlobal: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        window: z.enum(analyticsTimeWindows),
        category: z.enum(analyticsMediaTypes).or(z.literal('all')).optional(),
        query: z.string().optional(),
        source: z.string().optional(),
        confidence: z.enum(['all', 'high', 'medium', 'low']).optional(),
        sort: z.enum(leaderboardSorts).optional(),
        limit: z.number().int().positive().max(250).optional()
      })
    )
    .query(({ ctx, input }) => listLeaderboardRows(ctx, input)),

  workDetail: protectedProcedure
    .input(z.object({ workId: z.string().uuid() }))
    .query(({ ctx, input }) => getWorkDetail(ctx, input)),

  listIps: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        window: z.enum(analyticsTimeWindows),
        category: z.enum(analyticsMediaTypes).or(z.literal('all')).optional(),
        query: z.string().optional(),
        limit: z.number().int().positive().max(250).optional()
      })
    )
    .query(({ ctx, input }) => listIpLeaderboardRows(ctx, input)),

  ipDetail: protectedProcedure
    .input(z.object({ ipId: z.string().uuid() }))
    .query(({ ctx, input }) => getIpDetail(ctx, input)),

  rebuildScores: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .mutation(({ ctx, input }) => rebuildScores(ctx, input))
});
