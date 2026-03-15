import { z } from 'zod';
import { accessTypes, confidenceTiers, sourceFamilies } from '@null/domain';
import { protectedProcedure, router } from '../trpc';
import {
  createSourceProvider,
  deleteSourceProvider,
  listSourceProviders,
  updateSourceProvider
} from '../analytics-repo';

export const sourceProviderRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(({ ctx, input }) => listSourceProviders(ctx, input)),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        slug: z.string().min(1).max(100),
        name: z.string().min(1).max(200),
        sourceFamily: z.enum(sourceFamilies),
        accessType: z.enum(accessTypes),
        confidenceTier: z.enum(confidenceTiers),
        isActive: z.boolean().optional()
      })
    )
    .mutation(({ ctx, input }) => createSourceProvider(ctx, input)),

  update: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        sourceProviderId: z.string().uuid(),
        slug: z.string().min(1).max(100).optional(),
        name: z.string().min(1).max(200).optional(),
        sourceFamily: z.enum(sourceFamilies).optional(),
        accessType: z.enum(accessTypes).optional(),
        confidenceTier: z.enum(confidenceTiers).optional(),
        isActive: z.boolean().optional()
      })
    )
    .mutation(({ ctx, input }) => updateSourceProvider(ctx, input)),

  delete: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        sourceProviderId: z.string().uuid()
      })
    )
    .mutation(({ ctx, input }) => deleteSourceProvider(ctx, input))
});
