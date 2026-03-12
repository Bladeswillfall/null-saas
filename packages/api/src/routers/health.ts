import { router, publicProcedure } from '../trpc';

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return {
      ok: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString()
    };
  })
});
