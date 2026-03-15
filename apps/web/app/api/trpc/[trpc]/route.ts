import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@null/api';
import { createClient } from '@/lib/supabase/server';

const handler = async (req: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('[trpc/route] Auth error:', authError.message);
    }

    return fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () =>
        createContext({
          supabase,
          user
        }),
      onError: ({ error, path }) => {
        console.error(`[trpc/route] Error in ${path}:`, error.message);
      }
    });
  } catch (error) {
    console.error('[trpc/route] Handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export { handler as GET, handler as POST };
