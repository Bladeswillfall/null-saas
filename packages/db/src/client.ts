import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

// Connection for queries (with pooling)
// Only create if connection string is available
const queryClient = connectionString
  ? postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    })
  : null;

// Drizzle instance with schema
export const db = queryClient ? drizzle(queryClient, { schema }) : null;

// Export the raw postgres client for advanced use cases
export { queryClient };
