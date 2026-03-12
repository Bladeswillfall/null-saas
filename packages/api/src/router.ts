import { router } from './trpc';
import { healthRouter } from './routers/health';
import { organizationRouter } from './routers/organization';
import { workspaceRouter } from './routers/workspace';

export const appRouter = router({
  health: healthRouter,
  organization: organizationRouter,
  workspace: workspaceRouter
});

export type AppRouter = typeof appRouter;
