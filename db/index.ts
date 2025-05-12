import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Créer un pool de connexion PostgreSQL standard
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Exporter la connexion Drizzle avec PostgreSQL local
export const db = drizzle(pool, { schema });
