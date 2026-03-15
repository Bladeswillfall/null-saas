import { z } from 'zod';
import { analyticsMediaTypes } from '@null/domain';
import { protectedProcedure, router } from '../trpc';
import {
  createAnalyticsIp,
  deleteAnalyticsIp,
  getAnalyticsIp,
  listAnalyticsIps,
  updateAnalyticsIp
} from '../analytics-repo';

export const analyticsIpRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        query: z.string().optional(),
        status: z.string().optional()
      })
    )
    .query(({ ctx, input }) => listAnalyticsIps(ctx, input)),

  getById: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        ipId: z.string().uuid()
      })
    )
    .query(({ ctx, input }) => getAnalyticsIp(ctx, input)),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(200),
        slug: z.string().optional(),
        description: z.string().max(2000).optional(),
        primaryCategory: z.enum(analyticsMediaTypes).nullable().optional(),
        status: z.string().optional()
      })
    )
    .mutation(({ ctx, input }) => createAnalyticsIp(ctx, input)),

  update: protectedProcedure
    .input(
      z.object({
        ipId: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        slug: z.string().optional(),
        description: z.string().nullable().optional(),
        primaryCategory: z.enum(analyticsMediaTypes).nullable().optional(),
        status: z.string().optional()
      })
    )
    .mutation(({ ctx, input }) => updateAnalyticsIp(ctx, input)),

  delete: protectedProcedure
    .input(z.object({ ipId: z.string().uuid() }))
    .mutation(({ ctx, input }) => deleteAnalyticsIp(ctx, input))
});
