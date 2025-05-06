import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { db } from '@db';

// Fonction pour normaliser les propriétés de stockage utilisateur
function normalizeUser(user: any) {
  if (!user) return null;
  
  // Créer un nouvel objet pour éviter les références directes
  const normalizedUser = { ...user };
  
  // Normaliser les propriétés de stockage (gérer à la fois camelCase et snake_case)
  normalizedUser.storageUsed = (user.storage_used || user.storageUsed || '0').toString();
  normalizedUser.storageLimit = (user.storage_limit || user.storageLimit || '5368709120').toString(); // 5GB par défaut
  normalizedUser.storageTier = user.storage_tier || user.storageTier || 'basic';
  
  return normalizedUser;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated();
}

/**
 * Middleware pour s'assurer que l'utilisateur est authentifié
 * Si oui, normalise les propriétés de stockage
 */
export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  // Vérifier l'authentification via Passport
  if (req.isAuthenticated()) {
    // Normaliser les propriétés de l'utilisateur
    if (req.user) {
      (req as any).user = normalizeUser(req.user);
    }
    return next();
  }
  
  // Renvoyer une erreur 401 si non authentifié
  res.status(401).json({ error: 'Non authentifié' });
}

/**
 * Récupère l'ID de l'utilisateur courant
 */
export function getUserId(req: Request): number | undefined {
  return req.user?.id;
}

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur
 */
export function isAdmin(req: Request): boolean {
  return Boolean(req.user && (req.user as any).role === 'admin');
}

/**
 * Middleware pour s'assurer que l'utilisateur est un administrateur
 */
export function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (isAuthenticated(req) && isAdmin(req)) {
    return next();
  }
  
  // Renvoyer une erreur 403 si l'utilisateur n'est pas administrateur
  res.status(403).json({ error: 'Accès non autorisé' });
}

/**
 * Middleware pour s'assurer que l'utilisateur a le rôle 'clients'
 */
export function ensureClient(req: Request, res: Response, next: NextFunction) {
  if (isAuthenticated(req) && (req.user as any).role === 'clients') {
    return next();
  }
  
  // Les administrateurs peuvent également accéder
  if (isAdmin(req)) {
    return next();
  }
  
  // Renvoyer une erreur 403 si l'utilisateur n'a pas le rôle approprié
  res.status(403).json({ error: 'Accès non autorisé' });
}

/**
 * Middleware pour configurer le contexte PostgreSQL pour RLS
 */
export async function setupRLSContext(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.isAuthenticated() && req.user) {
      const userId = (req.user as any).id;
      
      // Définir l'ID utilisateur pour le contexte RLS
      await db.execute(`SELECT set_config('app.user_id', '${userId}', false)`);
      
      // Définir le rôle PostgreSQL en fonction du rôle de l'utilisateur
      if ((req.user as any).role === 'admin') {
        await db.execute(`SET ROLE postgres`);
      } else {
        await db.execute(`SET ROLE clients`);
      }
    } else {
      // Utilisateur anonyme
      await db.execute(`SELECT set_config('app.user_id', '0', false)`);
      await db.execute(`SET ROLE clients`);
    }
    next();
  } catch (error) {
    logger.error('Erreur lors de la configuration du contexte RLS:', error);
    next();
  }
}

/**
 * Middleware d'authentification pour les routes
 */
export const authenticateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  ensureAuth(req, res, next);
};