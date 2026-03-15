import 'server-only';

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { headers } from 'next/headers';
import superjson from 'superjson';
import type { AppRouter } from '@null/api';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export async function createServerTRPCClient() {
  const headersList = await headers();

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers() {
          const headersObj: Record<string, string> = {};
          headersList.forEach((value, key) => {
            headersObj[key] = value;
          });
          return headersObj;
        }
      })
    ]
  });
}
