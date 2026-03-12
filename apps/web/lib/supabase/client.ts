import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@null/db-types';
import { clientEnv } from '../env';

export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
