import { router } from './trpc';
import { healthRouter } from './routers/health';
import { organizationRouter } from './routers/organization';
import { workspaceRouter } from './routers/workspace';
import { subsidiaryRouter } from './routers/subsidiary';
import { ipRouter } from './routers/ip';
import { creatorRouter } from './routers/creator';
import { agreementRouter } from './routers/agreement';
import { payoutRouter } from './routers/payout';

export const appRouter = router({
  health: healthRouter,
  organization: organizationRouter,
  workspace: workspaceRouter,
  subsidiary: subsidiaryRouter,
  ip: ipRouter,
  creator: creatorRouter,
  agreement: agreementRouter,
  payout: payoutRouter
});

export type AppRouter = typeof appRouter;
