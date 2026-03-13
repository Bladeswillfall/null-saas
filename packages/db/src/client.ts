import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

// Singleton instances - lazily initialized
let queryClientInstance: Sql | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;

function getConnectionString(): string {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
}

// Lazy getter for postgres client
export function getQueryClient(): Sql | null {
  const connectionString = getConnectionString();
  if (!connectionString) {
    return null;
  }
  
  if (!queryClientInstance) {
    queryClientInstance = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }
  return queryClientInstance;
}

// Lazy getter for drizzle instance
export function getDb(): PostgresJsDatabase<typeof schema> | null {
  const client = getQueryClient();
  if (!client) {
    return null;
  }
  
  if (!dbInstance) {
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

// For backward compatibility - use getters internally
export const queryClient = null as Sql | null; // Deprecated: use getQueryClient()
export const db = null as PostgresJsDatabase<typeof schema> | null; // Deprecated: use getDb()
