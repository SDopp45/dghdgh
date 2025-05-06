/**
 * Middleware pour gérer la sélection automatique du schéma PostgreSQL
 * en fonction de l'utilisateur connecté dans l'architecture multi-schémas
 */

import { Request, Response, NextFunction } from 'express';
import { setSchemaForUser, pool as dbPool } from '../db';
import logger from '../utils/logger';

/**
 * Middleware qui configure le schéma PostgreSQL pour l'utilisateur connecté
 */
export const setClientSchema = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Vérifier si l'utilisateur est authentifié
    const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
    
    if (isAuthenticated && req.user) {
      // Récupérer l'ID utilisateur à partir de la session
      const userId = typeof req.user === 'object' ? (req.user as any).id : req.user;
      
      // Définir le schéma du client + public comme chemin de recherche
      if (userId) {
        await setSchemaForUser(userId);
        logger.debug(`Schema set for user ${userId}`);
      }
    } else {
      // Si pas authentifié, utiliser le schéma public uniquement
      await setSchemaForUser(null);
      logger.debug(`Schema set to public only (no authentication)`);
    }
    
    next();
  } catch (error) {
    logger.error('Error in schema middleware:', error);
    // Ne pas bloquer la requête en cas d'erreur
    next();
  }
};

/**
 * Middleware pour les routes administratives qui nécessitent un accès à 
 * toutes les données des clients via les vues admin_views
 */
export const setAdminSchemaViews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Dans cette application, tous les utilisateurs sont des clients
    // Nous n'utilisons plus la vérification du rôle admin
    const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
    
    if (isAuthenticated && req.user) {
      // Pour tous les utilisateurs authentifiés, utiliser le schéma du client
      // Ne pas utiliser les vues admin car tous les utilisateurs sont des clients
      const userId = typeof req.user === 'object' ? (req.user as any).id : req.user;
      if (userId) {
        await setSchemaForUser(userId);
        logger.debug(`Schema set for client user ${userId}`);
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error in admin schema middleware:', error);
    next();
  }
};

/**
 * Configure le chemin de recherche pour inclure les vues admin
 * Note: Cette fonction n'est plus utilisée car nous n'avons plus d'administrateurs
 */
export async function setAdminViews() {
  try {
    // Par défaut, utiliser le schéma public uniquement
    await dbPool.query('SET search_path TO public');
    return true;
  } catch (error) {
    logger.error('Failed to set schema:', error);
    return false;
  }
}

/**
 * Fonction utilitaire pour exécuter une requête dans le schéma d'un client spécifique
 */
export async function runInClientSchema(clientId: number, callback: () => Promise<any>) {
  try {
    // Sauvegarder le search_path actuel
    const { rows } = await dbPool.query('SHOW search_path');
    const originalSearchPath = rows[0].search_path;
    
    // Définir le search_path pour le client
    await dbPool.query(`SET search_path TO client_${clientId}, public`);
    
    // Exécuter le callback
    const result = await callback();
    
    // Restaurer le search_path d'origine
    await dbPool.query(`SET search_path TO ${originalSearchPath}`);
    
    return result;
  } catch (error) {
    logger.error(`Error running in client schema ${clientId}:`, error);
    throw error;
  }
} 