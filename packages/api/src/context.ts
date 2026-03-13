import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getDb } from '@null/db';

// Use generic type to accept any typed SupabaseClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export interface CreateContextOptions {
  supabase: AnySupabaseClient;
  user: User | null;
}

export interface Context {
  db: ReturnType<typeof getDb>;
  supabase: AnySupabaseClient;
  user: User | null;
}

export function createContext(opts: CreateContextOptions): Context {
  const db = getDb();
  if (!db) {
    throw new Error('Database connection not available. Check POSTGRES_URL environment variable.');
  }
  return {
    db,
    supabase: opts.supabase,
    user: opts.user
  };
}

export type { Context as TRPCContext };
