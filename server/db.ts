import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import logger from "./utils/logger";

const dbLogger = logger.child({ context: 'Database' });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create the connection pool with retry options
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});

// Test the database connection with retries
async function testConnection(retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      dbLogger.info('Successfully connected to database');
      client.release();
      return true;
    } catch (error) {
      dbLogger.error(`Failed to connect to database (attempt ${i + 1}/${retries}):`, error);
      if (i < retries - 1) {
        dbLogger.info(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  return false;
}

// Create the Drizzle instance
export const db = drizzle(pool, { schema });

// Initialize the database connection
testConnection().catch(error => {
  dbLogger.error('Database initialization failed:', error);
  process.exit(1);
});

// Handle pool errors
pool.on('error', (err) => {
  dbLogger.error('Unexpected database pool error:', err);
});

// Handle pool connect events
pool.on('connect', () => {
  dbLogger.info('New client connected to database');
});

// Handle pool acquire events
pool.on('acquire', () => {
  dbLogger.debug('Client acquired from pool');
});

/**
 * Configure le schéma PostgreSQL en fonction de l'ID utilisateur
 */
export async function setSchemaForUser(userId: number | null) {
  if (!userId) {
    // Si pas d'utilisateur, utiliser uniquement le schéma public
    return pool.query('SET search_path TO public');
  }
  
  try {
    // Définir le search_path pour inclure le schéma du client puis le schéma public
    await pool.query(`SET search_path TO client_${userId}, public`);
    dbLogger.debug(`Set search_path to client_${userId}, public`);
    return true;
  } catch (error) {
    dbLogger.error(`Failed to set schema for user ${userId}:`, error);
    // En cas d'échec, revenir au schéma public
    await pool.query('SET search_path TO public');
    return false;
  }
}