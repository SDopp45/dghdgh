import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { dbPool } from '../db/index';

/**
 * Configure le schéma PostgreSQL en fonction de l'ID utilisateur
 * en utilisant la fonction set_schema_for_user dans PostgreSQL
 * @param userId ID de l'utilisateur
 * @returns Succès de l'opération
 */
export async function setSchemaForUser(userId: number | null) {
  if (!userId) {
    // Si pas d'utilisateur, utiliser uniquement le schéma public
    await dbPool.query('SET search_path TO public');
    logger.debug('Schema set to public (no user)');
    return true;
  }
  
  try {
    // Utiliser la fonction SQL set_schema_for_user qui retourne le search_path approprié
    const result = await dbPool.query('SELECT public.set_schema_for_user($1) as search_path', [userId]);
    
    if (result.rows && result.rows.length > 0) {
      const searchPath = result.rows[0].search_path;
      // Appliquer le search_path retourné par la fonction
      await dbPool.query(`SET search_path TO ${searchPath}`);
      logger.debug(`Schema set to ${searchPath}`);
      return true;
    } else {
      logger.error(`Aucun résultat retourné par set_schema_for_user pour l'utilisateur ${userId}`);
      // En cas d'échec, revenir au schéma public
      await dbPool.query('SET search_path TO public');
      return false;
    }
  } catch (error) {
    logger.error(`Failed to set schema for user ${userId}:`, error);
    // En cas d'échec, revenir au schéma public
    await dbPool.query('SET search_path TO public');
    return false;
  }
}

/**
 * Middleware pour configurer le schéma client dans PostgreSQL
 * Cette fonction est appelée sur chaque requête pour garantir
 * que l'utilisateur n'accède qu'à ses propres données
 */
export const setClientSchema = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    
    // Éviter de reconfigurer le schéma pour des requêtes statiques ou sans importance
    const skipPaths = ['/favicon.ico', '/api/health', '/assets/', '.js', '.css', '.map', '.html', '.svg', '.jpg', '.png'];
    
    // Vérifier si le chemin doit être ignoré
    const shouldSkip = skipPaths.some(path => {
      return req.path.includes(path) || req.path.startsWith('/src/') || req.path.startsWith('/node_modules/');
    });
    
    if (shouldSkip) {
      return next();
    }
    
    // Journaliser le chemin et si l'utilisateur est authentifié (seulement pour les URLs API)
    if (req.path.startsWith('/api/')) {
      logger.debug(`[SCHEMA] Path: ${req.path}, User authentifié: ${typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false}, UserID: ${userId || 'none'}`);
    }
    
    // Configurer le schéma en fonction de l'utilisateur
    if (userId) {
      const success = await setSchemaForUser(userId);
      if (!success && req.path.startsWith('/api/')) {
        logger.warn(`[SCHEMA] Échec de configuration du schéma pour l'utilisateur ${userId}, path: ${req.path}`);
      }
    } else {
      // Si aucun utilisateur, utiliser le schéma public par défaut
      await dbPool.query('SET search_path TO public');
      
      if (req.path.startsWith('/api/') && !req.path.includes('/auth/') && !req.path.includes('/health')) {
        logger.debug(`[SCHEMA] Schéma public configuré (aucun utilisateur), path: ${req.path}`);
      }
    }
    
    next();
  } catch (error) {
    logger.error(`[SCHEMA] Erreur lors de la configuration du schéma: ${(error as Error).message}`);
    // Continuer malgré l'erreur pour ne pas bloquer la requête
    next();
  }
};

/**
 * Fonction pour appeler la procédure stockée setup_user_environment
 * @param userId ID de l'utilisateur
 */
export async function setupUserEnvironment(userId: number) {
  if (!userId) {
    logger.warn('Tentative de configuration d\'environnement sans ID utilisateur');
    return false;
  }
  
  try {
    // Appeler la procédure stockée setup_user_environment
    await dbPool.query('SELECT public.setup_user_environment($1)', [userId]);
    logger.debug(`Environnement utilisateur ${userId} configuré avec succès`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la configuration de l'environnement utilisateur (ID: ${userId}):`, error);
    
    // En cas d'erreur, essayer la méthode de secours avec setSchemaForUser
    try {
      logger.info(`Tentative de configuration alternative pour l'utilisateur ${userId}`);
      return await setSchemaForUser(userId);
    } catch (backupError) {
      logger.error(`Échec de la configuration alternative:`, backupError);
      return false;
    }
  }
}

/**
 * Fonction pour créer un nouveau schéma client
 * @param userId ID de l'utilisateur
 * @returns Succès de la création
 */
export async function createClientSchema(userId: number) {
  if (!userId) return false;
  
  try {
    // Utiliser la fonction SQL create_client_schema
    const result = await dbPool.query('SELECT public.create_client_schema($1) as success', [userId]);
    
    if (result.rows && result.rows.length > 0 && result.rows[0].success) {
      logger.info(`Schéma client_${userId} créé avec succès via la fonction SQL`);
      
      // Configurer immédiatement ce schéma comme search_path
      await setSchemaForUser(userId);
      return true;
    } else {
      logger.warn(`La fonction create_client_schema n'a pas réussi pour l'utilisateur ${userId}, utilisation de la méthode alternative`);
      // Méthode alternative - créer le schéma directement
      await dbPool.query(`CREATE SCHEMA IF NOT EXISTS client_${userId}`);
      logger.info(`Schéma client_${userId} créé avec succès (méthode alternative)`);
      
      // Configurer immédiatement ce schéma comme search_path
      await setSchemaForUser(userId);
      return true;
    }
  } catch (error) {
    logger.error(`Erreur lors de la création du schéma client_${userId}:`, error);
    
    // Essayer la méthode alternative
    try {
      await dbPool.query(`CREATE SCHEMA IF NOT EXISTS client_${userId}`);
      logger.info(`Schéma client_${userId} créé avec succès (après échec initial)`);
      await setSchemaForUser(userId);
      return true;
    } catch (secondError) {
      logger.error(`Échec définitif lors de la création du schéma client_${userId}:`, secondError);
      return false;
    }
  }
} 