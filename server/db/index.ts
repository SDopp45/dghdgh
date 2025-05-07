import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import logger from '../utils/logger';
import * as schema from '@shared/schema';
import fs from 'fs';
import path from 'path';

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
    
    // Modification: Par défaut, utiliser uniquement le schéma public
    // Le schéma client sera défini dynamiquement lors de l'authentification
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
  db = drizzle(pool, { schema });
  
} catch (error) {
  logger.error('Failed to initialize database connection:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Database connection failed: ${errorMessage}`);
}

// Nouvelle fonction pour définir le schéma client en fonction de l'utilisateur
async function setSchemaForUser(userId: number | null) {
  if (!userId) {
    // Si pas d'utilisateur, utiliser uniquement le schéma public
    return dbPool.query('SET search_path TO public');
  }
  
  try {
    // Définir le search_path pour inclure le schéma du client puis le schéma public
    await dbPool.query(`SET search_path TO client_${userId}, public`);
    logger.info(`Set search_path to client_${userId}, public`);
    return true;
  } catch (error) {
    logger.error(`Failed to set schema for user ${userId}:`, error);
    // En cas d'échec, revenir au schéma public
    await dbPool.query('SET search_path TO public');
    return false;
  }
}

/**
 * Initialiser les fonctions de gestion des schémas
 */
export async function initializeSchemaFunctions() {
  try {
    logger.info('Initialisation des fonctions de gestion des schémas...');
    
    // Vérifier si la fonction setup_user_environment existe déjà
    const checkFunctionResult = await dbPool.query(`
      SELECT 1 FROM pg_proc 
      WHERE proname = 'setup_user_environment' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);
    
    // Si les fonctions existent déjà, les supprimer d'abord
    if (checkFunctionResult && checkFunctionResult.rowCount && checkFunctionResult.rowCount > 0) {
      logger.info('Suppression des fonctions de schéma existantes...');
      try {
        await dbPool.query(`DROP FUNCTION IF EXISTS public.setup_user_environment(integer);`);
        await dbPool.query(`DROP FUNCTION IF EXISTS public.create_client_schema(integer);`);
        logger.info('Fonctions de schéma supprimées avec succès');
      } catch (dropError) {
        logger.error('Erreur lors de la suppression des fonctions:', dropError);
      }
    }
    
    // Définir les fonctions SQL directement dans le code
    const setupSchemaSql = `
    -- Fonction pour configurer l'environnement utilisateur
    CREATE OR REPLACE FUNCTION public.setup_user_environment(p_user_id integer)
    RETURNS void AS
    $$
    DECLARE
        schema_name text := 'client_' || p_user_id;
    BEGIN
        -- Vérifier si le schéma existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
            -- Créer le schéma s'il n'existe pas
            EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
            RAISE NOTICE 'Schéma % créé', schema_name;
        END IF;
        
        -- Configurer le chemin de recherche des schémas pour la session actuelle
        EXECUTE format('SET search_path TO %I, public', schema_name);
        RAISE NOTICE 'Search path configuré à %', schema_name;

        -- Configurer les autorisations
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO current_user', schema_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO current_user', schema_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO current_user', schema_name);
        
        RETURN;
    END;
    $$
    LANGUAGE plpgsql;

    -- Fonction pour créer un nouveau schéma client
    CREATE OR REPLACE FUNCTION public.create_client_schema(p_user_id integer)
    RETURNS boolean AS
    $$
    DECLARE
        schema_name text := 'client_' || p_user_id;
    BEGIN
        -- Vérifier si le schéma existe déjà
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
            RAISE NOTICE 'Le schéma % existe déjà', schema_name;
            RETURN true;
        END IF;
        
        -- Créer le schéma
        BEGIN
            EXECUTE format('CREATE SCHEMA %I', schema_name);
            RAISE NOTICE 'Schéma % créé avec succès', schema_name;
            
            -- Configurer les autorisations
            EXECUTE format('GRANT USAGE ON SCHEMA %I TO current_user', schema_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO current_user', schema_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO current_user', schema_name);
            
            RETURN true;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erreur lors de la création du schéma %: %', schema_name, SQLERRM;
            RETURN false;
        END;
    END;
    $$
    LANGUAGE plpgsql;
    `;
    
    // Exécuter le script SQL
    await dbPool.query(setupSchemaSql);
    logger.info('Fonctions de gestion des schémas installées avec succès');
    return true;
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation des fonctions de schéma:', error);
    return false;
  }
}

// Module d'initialisation
export async function initializeDatabase() {
  try {
    // Tester la connexion
    await dbPool.query('SELECT NOW()');
    logger.info('Connexion à la base de données établie');
    
    // Initialiser les fonctions de schéma
    await initializeSchemaFunctions();
    
    return true;
  } catch (error) {
    logger.error('Erreur de connexion à la base de données:', error);
    process.exit(1);
  }
}

// Exporter les variables après le bloc try/catch
export { dbPool, db, setSchemaForUser }; 