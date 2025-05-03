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
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.' 
      });
    }
    next();
  } catch (error) {
    logger.error('Erreur de vérification admin:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification des permissions' });
  }
};
