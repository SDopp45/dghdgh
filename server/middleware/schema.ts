import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { pool } from '../db';

/**
 * Configure le schéma PostgreSQL en fonction de l'ID utilisateur
 * @param userId ID de l'utilisateur
 * @returns Résultat de la requête SQL
 */
export async function setSchemaForUser(userId: number | null) {
  if (!userId) {
    // Si pas d'utilisateur, utiliser uniquement le schéma public
    return pool.query('SET search_path TO public');
  }
  
  try {
    // Définir le search_path pour inclure le schéma du client puis le schéma public
    await pool.query(`SET search_path TO client_${userId}, public`);
    logger.debug(`Set search_path to client_${userId}, public`);
    return true;
  } catch (error) {
    logger.error(`Failed to set schema for user ${userId}:`, error);
    // En cas d'échec, revenir au schéma public
    await pool.query('SET search_path TO public');
    return false;
  }
}

/**
 * Middleware pour configurer le schéma client dans PostgreSQL
 * Cette fonction utilise l'architecture multi-schémas au lieu de RLS
 */
export const setClientSchema = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any)?.id;
    if (userId) {
      await setSchemaForUser(userId);
    } else {
      // Si aucun utilisateur, utiliser le schéma public par défaut
      await pool.query('SET search_path TO public');
    }
    next();
  } catch (error) {
    logger.error('Erreur lors de la configuration du schéma:', error);
    // Continuer malgré l'erreur
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
    // Vérifier d'abord si la fonction existe pour éviter les erreurs
    const checkFunction = await pool.query(`
      SELECT 1 FROM pg_proc 
      WHERE proname = 'setup_user_environment' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);
    
    if (checkFunction.rowCount === 0) {
      logger.warn('La fonction setup_user_environment n\'existe pas dans la base de données');
      // Utiliser la méthode alternative
      return await setSchemaForUser(userId);
    }
    
    // Appeler la procédure stockée
    await pool.query('SELECT public.setup_user_environment($1)', [userId]);
    logger.debug(`Environnement utilisateur ${userId} configuré avec succès`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la configuration de l'environnement utilisateur (ID: ${userId}):`, error);
    
    // En cas d'erreur, essayer la méthode de secours
    try {
      logger.info(`Tentative de configuration alternative pour l'utilisateur ${userId}`);
      return await setSchemaForUser(userId);
    } catch (backupError) {
      logger.error(`Échec de la configuration alternative:`, backupError);
      return false;
    }
  }
} 