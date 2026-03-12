import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing database connection string. Set POSTGRES_URL or DATABASE_URL.');
}

// Connection for queries (with pooling)
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Drizzle instance with schema
export const db = drizzle(queryClient, { schema });

// Export the raw postgres client for advanced use cases
export { queryClient };
