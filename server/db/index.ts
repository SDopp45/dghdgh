import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import logger from '../utils/logger';

// Déclarer les variables pour l'export en dehors du bloc try
let dbPool: Pool;
let db: ReturnType<typeof drizzle>;

// Validation de la chaîne de connexion
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Afficher une version anonymisée de l'URL pour le débogage
logger.info(`Initializing database connection with URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

try {
  // Configuration plus robuste du pool de connexions
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Paramètres optimisés pour la stabilité
    query_timeout: 30000, // 30 secondes pour les requêtes
    connectionTimeoutMillis: 10000, // 10 secondes pour établir une connexion
    max: 10, // Nombre maximum de clients dans le pool
    idleTimeoutMillis: 30000, // Fermer les clients inactifs après 30 secondes
    // Activer SSL en production uniquement
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false
  });

  // Gestion avancée des événements de connexion
  pool.on('connect', (client) => {
    logger.info('New client connected to PostgreSQL database');
    
    // Configurer automatiquement le schéma RLS pour chaque nouvelle connexion
    client.query('SET search_path TO public').catch(err => {
      logger.warn('Error setting search path:', err);
    });
  });

  pool.on('error', (err, client) => {
    logger.error('PostgreSQL pool error:', err);
    
    // En cas d'erreur fatale, essayer de récupérer le client
    if (err && typeof err === 'object' && 'fatal' in err && err.fatal === true) {
      logger.error('Fatal database connection error - attempting recovery');
    }
  });

  // Test de connexion initial
  pool.query('SELECT NOW()').then(() => {
    logger.info('✅ PostgreSQL connection verified successfully');
  }).catch(err => {
    logger.error('❌ Failed to verify PostgreSQL connection:', err);
  });

  // Affecter les valeurs aux variables exportées
  dbPool = pool;
  db = drizzle(pool);
  
} catch (error) {
  logger.error('Failed to initialize database connection:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Database connection failed: ${errorMessage}`);
}

// Exporter les variables après le bloc try/catch
export { dbPool, db }; 