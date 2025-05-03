import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function isAuthenticated(req: Request): boolean {
  // En mode développement, toujours considérer comme authentifié
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  return req.isAuthenticated();
}

export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  // Désactiver complètement en développement pour faciliter les tests
  if (process.env.NODE_ENV === 'development') {
    logger.info('Development mode: bypassing authentication check');
    
    // Si aucun utilisateur n'est présent, créer un utilisateur factice
    if (!req.user) {
      (req as any).user = {
        id: 1,
        username: 'testuser',
        fullName: 'Test User',
        role: 'manager',
        email: 'test@example.com'
      };
    }
    
    return next();
  }
  
  // En production, vérifier normalement l'authentification
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Non authentifié' });
}

export function getUserId(req: Request): number | undefined {
  // En développement, toujours retourner l'ID 1
  if (process.env.NODE_ENV === 'development' && !req.user) {
    return 1;
  }
  return req.user?.id;
}

// Middleware d'authentification pour les routes
export const authenticateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    // En développement, créer un utilisateur factice si nécessaire
    if (!req.user) {
      (req as any).user = {
        id: 1,
        username: 'testuser',
        fullName: 'Test User',
        role: 'manager',
        email: 'test@example.com'
      };
    }
    return next();
  }
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  next();
};