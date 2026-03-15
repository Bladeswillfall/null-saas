import { router } from './trpc';
import { healthRouter } from './routers/health';
import { organizationRouter } from './routers/organization';
import { workspaceRouter } from './routers/workspace';
import { subsidiaryRouter } from './routers/subsidiary';
import { ipRouter } from './routers/ip';
import { creatorRouter } from './routers/creator';
import { agreementRouter } from './routers/agreement';
import { payoutRouter } from './routers/payout';
import { analyticsIpRouter } from './routers/analytics-ip';
import { workRouter } from './routers/work';
import { sourceProviderRouter } from './routers/source-provider';
import { externalIdRouter } from './routers/external-id';
import { importBatchRouter } from './routers/import-batch';
import { qualityRouter } from './routers/quality';
import { leaderboardRouter } from './routers/leaderboard';
import { freshnessRouter } from './routers/freshness';

export const appRouter = router({
  health: healthRouter,
  organization: organizationRouter,
  workspace: workspaceRouter,
  subsidiary: subsidiaryRouter,
  ip: ipRouter,
  creator: creatorRouter,
  agreement: agreementRouter,
  payout: payoutRouter,
  analyticsIp: analyticsIpRouter,
  work: workRouter,
  sourceProvider: sourceProviderRouter,
  externalId: externalIdRouter,
  importBatch: importBatchRouter,
  quality: qualityRouter,
  leaderboard: leaderboardRouter,
  freshness: freshnessRouter
});

export type AppRouter = typeof appRouter;
