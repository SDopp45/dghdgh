import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

declare global {
  namespace Express {
    interface User {
      id: number;
      role: string;
    }
  }
}

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Tout utilisateur authentifié avec rôle 'clients' est autorisé
    if (!req.user || req.user.role !== 'clients') {
      return res.status(403).json({ 
        error: 'Accès refusé. Vous devez être connecté pour effectuer cette action.' 
      });
    }
    next();
  } catch (error) {
    logger.error('Erreur de vérification des permissions:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification des permissions' });
  }
};
