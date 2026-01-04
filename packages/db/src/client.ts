import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// During build time, use a dummy connection string to avoid errors
// The real connection string will be used at runtime
const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";

// For local development and production with regular PostgreSQL/Neon
// Configure connection pool to prevent "too many clients" error
const client = postgres(databaseUrl, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Timeout for new connections
});

export const db = drizzle(client, { schema });
