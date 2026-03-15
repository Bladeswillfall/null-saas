import { z } from 'zod';
import { analyticsMediaTypes } from '@null/domain';
import { protectedProcedure, router } from '../trpc';
import { createWork, deleteWork, getWork, listWorks, updateWork } from '../analytics-repo';

export const workRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        ipId: z.string().uuid().optional(),
        query: z.string().optional(),
        category: z.enum(analyticsMediaTypes).or(z.literal('all')).optional(),
        status: z.string().optional()
      })
    )
    .query(({ ctx, input }) => listWorks(ctx, input)),

  getById: protectedProcedure
    .input(z.object({ workId: z.string().uuid() }))
    .query(({ ctx, input }) => getWork(ctx, input)),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        ipId: z.string().uuid().nullable().optional(),
        title: z.string().min(1).max(200),
        mediaType: z.enum(analyticsMediaTypes),
        seriesName: z.string().optional(),
        volumeNumber: z.number().int().nullable().optional(),
        releaseDate: z.string().nullable().optional(),
        language: z.string().optional(),
        region: z.string().optional(),
        publisher: z.string().optional(),
        status: z.string().optional()
      })
    )
    .mutation(({ ctx, input }) => createWork(ctx, input)),

  update: protectedProcedure
    .input(
      z.object({
        workId: z.string().uuid(),
        ipId: z.string().uuid().nullable().optional(),
        title: z.string().min(1).max(200).optional(),
        mediaType: z.enum(analyticsMediaTypes).optional(),
        seriesName: z.string().nullable().optional(),
        volumeNumber: z.number().int().nullable().optional(),
        releaseDate: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
        publisher: z.string().nullable().optional(),
        status: z.string().optional()
      })
    )
    .mutation(({ ctx, input }) => updateWork(ctx, input)),

  delete: protectedProcedure
    .input(z.object({ workId: z.string().uuid() }))
    .mutation(({ ctx, input }) => deleteWork(ctx, input))
});
