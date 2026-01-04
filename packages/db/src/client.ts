import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// For local development and production with regular PostgreSQL/Neon
// Configure connection pool to prevent "too many clients" error
const client = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Timeout for new connections
});

export const db = drizzle(client, { schema });
