import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const getDb = (schemaName: string) => {
  return drizzle(pool, {
    schema: {
      ...schema,
      formDefinitions: schema.formDefinitions,
      formResponses: schema.formResponses
    }
  });
}; 