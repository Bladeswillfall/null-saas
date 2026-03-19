import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getQueryClient, organizations, organizationMembers, profiles } from '@null/db';
import { router, protectedProcedure } from '../trpc';
import { requireOrganizationMember } from '../auth';

function logOrganizationListError(error: unknown, userId: string) {
  const details =
    error && typeof error === 'object'
      ? {
          message: 'message' in error ? error.message : undefined,
          code: 'code' in error ? error.code : undefined,
          detail: 'detail' in error ? error.detail : undefined,
          hint: 'hint' in error ? error.hint : undefined,
          severity: 'severity' in error ? error.severity : undefined
        }
      : undefined;

  console.error('[organization.list] Failed to load organizations', {
    userId,
    error,
    ...details
  });
}

export const organizationRouter = router({
  // List organizations the user is a member of
  list: protectedProcedure.query(async ({ ctx }) => {
    const queryClient = getQueryClient();

    if (!queryClient) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database query client is not available.'
      });
    }

    try {
      const memberships = await queryClient<{
        id: string;
        name: string;
        slug: string;
        role: string;
        created_at: Date | string;
      }[]>`
        select
          o.id,
          o.name,
          o.slug,
          om.role,
          o.created_at
        from public.organization_members om
        inner join public.organizations o
          on om.organization_id = o.id
        where om.user_id = ${ctx.user.id}
        order by o.created_at asc
      `;

      return memberships.map((membership) => ({
        id: membership.id,
        name: membership.name,
        slug: membership.slug,
        role: membership.role,
        createdAt: membership.created_at
      }));
    } catch (error) {
      logOrganizationListError(error, ctx.user.id);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load organizations.'
      });
    }
  }),

  // Get a single organization by slug
  getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const [org] = await ctx.db.select().from(organizations).where(eq(organizations.slug, input.slug)).limit(1);
    if (!org) {
      return null;
    }

    await requireOrganizationMember(ctx, org.id);

    return org;
  }),

  // Create a new organization
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const name = input.name.trim();
      const slug = input.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      return await ctx.db.transaction(async (tx) => {
        // Ensure profile exists for the user (handles case where trigger failed)
        await tx
          .insert(profiles)
          .values({
            id: ctx.user.id,
            email: ctx.user.email ?? null
          })
          .onConflictDoNothing();

        // Check if slug already exists
        const existing = await tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, slug))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Organization slug already exists.'
          });
        }

        // Create organization
        const [newOrg] = await tx
          .insert(organizations)
          .values({ name, slug })
          .returning();

        // Add user as owner (all in transaction, so both succeed or both fail)
        await tx.insert(organizationMembers).values({
          organizationId: newOrg.id,
          userId: ctx.user.id,
          role: 'owner'
        });

        return newOrg;
      });
    })
});
