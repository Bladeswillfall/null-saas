import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getDb } from '@null/db';

// Use generic type to accept any typed SupabaseClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export interface CreateContextOptions {
  supabase: AnySupabaseClient;
  user: User | null;
}

// NonNullable because we throw if db is null
export interface Context {
  db: NonNullable<ReturnType<typeof getDb>>;
  supabase: AnySupabaseClient;
  user: User | null;
}

export function createContext(opts: CreateContextOptions): Context {
  const db = getDb();

  if (!db) {
    console.error('[api/context] Database connection failed. POSTGRES_URL or DATABASE_URL is not available to the API context.');
    throw new Error(
      'Database connection not available. Ensure POSTGRES_URL is set and accessible to the API package.'
    );
  }

  return {
    db,
    supabase: opts.supabase,
    user: opts.user
  };
}

export type { Context as TRPCContext };
