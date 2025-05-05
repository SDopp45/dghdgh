import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

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
 * Middleware d'authentification pour les routes
 */
export const authenticateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  ensureAuth(req, res, next);
};