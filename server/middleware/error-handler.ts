import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error('Global error handler caught:', err);

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // If headers already sent, delegate to Express' default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle authentication errors
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      error: 'Non authentifié',
      details: isDevelopment ? err.message : 'Veuillez vous connecter pour accéder à cette ressource'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError' || err.status === 400) {
    return res.status(400).json({
      error: 'Données invalides',
      details: isDevelopment ? err.message : 'Les données fournies sont invalides'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: 'Erreur serveur',
    details: isDevelopment ? err.message : 'Une erreur est survenue'
  });
}
