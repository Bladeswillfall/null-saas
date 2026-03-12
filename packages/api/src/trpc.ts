import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  }
});

// Base router and procedure helpers
export const router = t.router;
export const middleware = t.middleware;

// Public procedure - no auth required
export const publicProcedure = t.procedure;

// Auth middleware - ensures user is authenticated
const enforceUserIsAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action.'
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Merge routers helper
export const mergeRouters = t.mergeRouters;
