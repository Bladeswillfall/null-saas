import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

declare const process: {
  env: Record<string, string | undefined>;
};

// In serverless, we need fresh connections per request due to cold starts
// Use a cache key based on connection string to allow reuse within same process
const clientCache = new Map<string, Sql>();
const dbCache = new Map<string, PostgresJsDatabase<typeof schema>>();

function getConnectionString(): string {
  // Try multiple env var names for compatibility
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
  return connectionString;
}

// Get or create postgres client
export function getQueryClient(): Sql | null {
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    console.error('[db] No connection string found. Checked: POSTGRES_URL, DATABASE_URL, POSTGRES_URL_NON_POOLING');
    return null;
  }
  
  // Use cached client if available for this connection string
  const cached = clientCache.get(connectionString);
  if (cached) {
    return cached;
  }
  
  // Create new client with serverless-optimized settings
  const client = postgres(connectionString, {
    max: 1, // Serverless: single connection per instance
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false // Better for serverless - avoids prepared statement conflicts
  });
  
  clientCache.set(connectionString, client);
  return client;
}

// Get or create drizzle instance
export function getDb(): PostgresJsDatabase<typeof schema> | null {
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    return null;
  }
  
  // Use cached db if available
  const cached = dbCache.get(connectionString);
  if (cached) {
    return cached;
  }
  
  const client = getQueryClient();
  if (!client) {
    return null;
  }
  
  const db = drizzle(client, { schema });
  dbCache.set(connectionString, db);
  return db;
}

// For backward compatibility - these now call the getters
export const queryClient = null as Sql | null; // Deprecated: use getQueryClient()
export const db = null as PostgresJsDatabase<typeof schema> | null; // Deprecated: use getDb()
