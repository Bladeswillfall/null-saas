import type { SupabaseClient, User } from '@supabase/supabase-js';
import { db } from '@null/db';

export interface CreateContextOptions {
  supabase: SupabaseClient;
  user: User | null;
}

export interface Context {
  db: typeof db;
  supabase: SupabaseClient;
  user: User | null;
}

export function createContext(opts: CreateContextOptions): Context {
  return {
    db,
    supabase: opts.supabase,
    user: opts.user
  };
}

export type { Context as TRPCContext };
