import { Request, Response, NextFunction } from 'express';
import { pool as dbPool } from './db/index';
import logger from './utils/logger';

/**
 * Middleware de débogage pour tracer des informations utiles sur les requêtes
 * Ce middleware est utile pour déboguer les problèmes d'authentification et de schéma
 */
export const debugMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Ne pas entraver les requêtes de ressources statiques
  if (req.path.includes('.') || req.path.startsWith('/assets/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  
  // Journaliser les informations de base de la requête
  const reqInfo = {
    method: req.method,
    path: req.path,
    isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false,
    hasUserId: req.session?.userId ? true : false,
    hasUser: req.user ? true : false,
    timestamp: new Date().toISOString()
  };
  
  logger.debug(`[DEBUG] Requête: ${JSON.stringify(reqInfo)}`);
  
  // Pour les routes sensibles, ajouter plus d'informations de débogage
  if (req.path.startsWith('/api/auth/') || req.path.includes('login') || req.path.includes('logout')) {
    logger.debug(`[AUTH-DEBUG] Session ID: ${req.sessionID}, Session données: ${JSON.stringify(req.session)}`);
  }
  
  // Vérifier le schéma PostgreSQL actuel (seulement pour certaines routes)
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth/')) {
    try {
      const schemaResult = await dbPool.query('SHOW search_path');
      logger.debug(`[SCHEMA-DEBUG] Chemin de recherche actuel: ${schemaResult.rows[0].search_path}`);
    } catch (error) {
      logger.error(`[SCHEMA-DEBUG] Erreur lors de la vérification du schéma: ${(error as Error).message}`);
    }
  }
  
  // Ajouter des en-têtes de débogage dans l'environnement de développement
  res.on('finish', () => {
    const responseInfo = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      contentType: res.getHeader('content-type'),
      responseTime: (new Date().getTime() - new Date(reqInfo.timestamp).getTime()) + 'ms'
    };
    
    logger.debug(`[DEBUG] Réponse: ${JSON.stringify(responseInfo)}`);
  });
  
  next();
}; 