import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@null/api';
import { createClient } from '@/lib/supabase/server';

const handler = async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        supabase,
        user
      })
  });
};

export { handler as GET, handler as POST };
