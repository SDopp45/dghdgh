import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import logger from '../utils/logger';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

logger.info(`Initializing database connection with URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Ajouter un timeout plus long pour les requêtes
  query_timeout: 10000,
  // Ajouter plus de temps pour la connexion
  connectionTimeoutMillis: 10000,
  // Ajouter plus de tentatives de connexion
  max: 20,
  idleTimeoutMillis: 30000
});

// Tester la connexion
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error:', err);
});

// Exporter le pool pour pouvoir le réutiliser et le fermer proprement au besoin
export const dbPool = pool;
export const db = drizzle(pool); 