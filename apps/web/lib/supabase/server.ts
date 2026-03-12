import { createServerClient } from '@supabase/ssr';
import type { Database } from '@null/db-types';
import { cookies } from 'next/headers';
import { clientEnv } from '../env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // No-op in contexts where cookies cannot be set.
          }
        }
      }
    }
  );
}
