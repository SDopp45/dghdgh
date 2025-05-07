import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import logger from '../utils/logger';
import * as schema from '@shared/schema';
// fs et path ne sont pas utilisés, peuvent être enlevés si non nécessaires ailleurs.
// import fs from 'fs'; 
// import path from 'path';

let dbPool: Pool;
let db: ReturnType<typeof drizzle>;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

logger.info(`Initializing database connection with URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

try {
  const poolInstance = new Pool({
    connectionString: process.env.DATABASE_URL,
    query_timeout: 30000,
    connectionTimeoutMillis: 10000,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false
  });

  poolInstance.on('connect', async (client) => {
    logger.info('New client connected to PostgreSQL database');
    // Par défaut, utiliser le schéma public au niveau de la connexion initiale du pool
    // Le search_path sera ajusté dynamiquement par setUserSchema ou resetToPublicSchema
    await client.query('SET search_path TO public');
  });

  poolInstance.on('error', (err, client) => {
    logger.error('PostgreSQL pool error:', err);
    if (err && typeof err === 'object' && 'fatal' in err && (err as any).fatal === true) {
      logger.error('Fatal database connection error - attempting recovery');
    }
  });

  poolInstance.query('SELECT NOW()').then(() => {
    logger.info('✅ PostgreSQL connection verified successfully');
  }).catch(err => {
    logger.error('❌ Failed to verify PostgreSQL connection:', err);
  });

  dbPool = poolInstance;
  db = drizzle(poolInstance, { schema }); // 'schema' ici fait référence aux définitions Drizzle, pas aux schémas PG en tant que tels pour les requêtes directes.
  
} catch (error) {
  logger.error('Failed to initialize database connection:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Database connection failed: ${errorMessage}`);
}

/**
 * Définit le search_path pour un utilisateur spécifique.
 * Les administrateurs utilisent 'public, admin_views'.
 * Les clients utilisent 'client_X, public'.
 * @param userId ID de l'utilisateur
 * @returns Le nom du schéma principal défini (ou 'public' pour admin)
 */
async function setUserSchema(userId: number): Promise<string> {
  try {
    // Vérifier si l'utilisateur existe et récupérer son rôle
    // Il est crucial que la table 'users' soit accessible, donc dans le schéma 'public' par défaut ou via un search_path qui l'inclut.
    const userResult = await dbPool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
    if (!userResult.rows.length) {
      throw new Error(`Utilisateur ${userId} non trouvé`);
    }

    const user = userResult.rows[0];
    let effectiveSearchPath: string;
    let primarySchema: string;

    if (user.role === 'admin') {
      // Les administrateurs ont accès à 'public' et 'admin_views'
      // 'admin_views' doit être créé dans votre DB pour que ceci fonctionne
      effectiveSearchPath = 'public, admin_views'; 
      primarySchema = 'public';
      // Pour les admins, on peut aussi simplement utiliser le search_path par défaut du rôle admin s'il est configuré en DB.
      // Ou explicitement le positionner :
      await dbPool.query(`SET search_path TO ${effectiveSearchPath}`);
    } else {
      // Les clients utilisent leur schéma dédié et public
      primarySchema = `client_${userId}`;
      // S'assurer que le schéma client existe avant de tenter de le définir.
      // createClientSchema devrait être appelé à l'inscription pour garantir son existence.
      effectiveSearchPath = `${primarySchema}, public`;
      await dbPool.query(`SET search_path TO ${effectiveSearchPath}`);
    }

    logger.info(`Search_path défini à "${effectiveSearchPath}" pour l'utilisateur ${userId} (rôle: ${user.role})`);
    return primarySchema;
  } catch (error) {
    logger.error(`Erreur lors de la définition du search_path pour l'utilisateur ${userId}:`, error);
    // En cas d'erreur, réinitialiser au schéma public pour éviter des états inconsistants
    await resetToPublicSchema();
    throw error;
  }
}

/**
 * Réinitialise le search_path à 'public'.
 * Typiquement utilisé à la déconnexion ou pour les accès anonymes.
 */
async function resetToPublicSchema(): Promise<void> {
      try {
    await dbPool.query('SET search_path TO public');
    logger.info('Search_path réinitialisé à "public"');
  } catch (error) {
    logger.error('Erreur lors de la réinitialisation du search_path:', error);
    throw error;
      }
    }
    
/**
 * Appelle la fonction PostgreSQL pour créer un nouveau schéma client et ses tables.
 * @param userId ID de l'utilisateur pour qui créer le schéma (ex: client_X)
 */
async function createClientSchema(userId: number): Promise<void> {
  try {
    // La fonction public.create_client_schema(p_user_id integer) dans votre SQL
    // s'occupe de créer le schéma, les tables (depuis template), les rôles et les permissions.
    await dbPool.query('SELECT public.create_client_schema($1)', [userId]);
    logger.info(`Fonction public.create_client_schema appelée avec succès pour l'utilisateur ${userId}. Le schéma client_${userId} devrait être créé.`);
  } catch (error) {
    logger.error(`Erreur lors de l'appel à public.create_client_schema pour l'utilisateur ${userId}:`, error);
    throw error; // Propage l'erreur pour qu'elle soit gérée par l'appelant (ex: route d'inscription)
  }
}

// Fonction pour obtenir un client Drizzle pour un schéma spécifique
async function getClientDb(userId: number) {
  try {
    // Vérifier si l'utilisateur existe et son rôle
    const userResult = await dbPool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
    if (!userResult.rows.length) {
      throw new Error(`Utilisateur ${userId} non trouvé`);
    }

    const user = userResult.rows[0];
    const schemaName = user.role === 'admin' ? 'public' : `client_${userId}`;
    
    // Plutôt que de créer une nouvelle connexion pour chaque requête,
    // nous définissons simplement le search_path pour la connexion existante
    // Ce qui est plus efficace et évite les réinitialisations constantes
    await dbPool.query(`SET search_path TO ${schemaName}, public`);
    
    logger.info(`Search_path défini à "${schemaName}, public" pour l'utilisateur ${userId}`);
    
    // Retourner la même instance Drizzle avec le search_path mis à jour
    return {
      db: db,
      // La méthode release est maintenant un no-op pour éviter de réinitialiser le search_path
      release: () => {
        // Ne pas faire de reset ici
        logger.info(`Gardé search_path à "${schemaName}, public" pour l'utilisateur ${userId}`);
      }
    };
  } catch (error) {
    logger.error(`Erreur lors de la création d'un client DB pour l'utilisateur ${userId}:`, error);
    throw error;
  }
}

// Regrouper tous les exports à la fin
export {
  db, // Instance Drizzle
  dbPool as pool, // Pool de connexions pg
  setUserSchema,
  resetToPublicSchema,
  createClientSchema,
  getClientDb // Nouvelle fonction pour obtenir un client Drizzle spécifique à un schéma
}; 