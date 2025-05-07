import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import logger from "./utils/logger";

const dbLogger = logger.child({ context: 'Database' });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Configuration de la connexion PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Augmenter le nombre de connexions disponibles
  idleTimeoutMillis: 30000, // 30 secondes
  connectionTimeoutMillis: 10000, // 10 secondes
});

// Vérifier l'état de la connexion
pool.on('error', (err) => {
  logger.error('Erreur inattendue de connexion PostgreSQL:', err);
  // Ne pas arrêter le processus, laisser l'application gérer la reconnexion
});

// Fonction pour tester la connexion
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as now');
      logger.info(`Connexion à la base de données réussie: ${result.rows[0].now}`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Erreur de connexion à la base de données:', error);
    return false;
  }
}

// Create the Drizzle instance
export const db = drizzle(pool, { schema });

// Initialize the database connection
testDatabaseConnection().catch(error => {
  dbLogger.error('Database initialization failed:', error);
  process.exit(1);
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