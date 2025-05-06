import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { db, pool } from '../db';
import jwt from 'jsonwebtoken';
import config from '../config';

// Interface pour représenter un utilisateur authentifié
export interface AuthUser {
  id: number;
  username: string;
  role: string;
  email?: string;
}

// Interface pour le token décodé
interface DecodedToken {
  userId: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Configure le schéma PostgreSQL en fonction de l'ID utilisateur
 */
async function setSchemaForUser(userId: number | null) {
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
 * Vérifie si l'utilisateur est un administrateur
 * @param req Requête Express
 * @returns Booléen indiquant si l'utilisateur est admin
 */
export function isAdmin(req: Request): boolean {
  if (!req.isAuthenticated()) return false;
  const user = req.user as any;
  return user && user.role === 'admin';
}

/**
 * Middleware pour vérifier si l'utilisateur est administrateur
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Accès réservé aux administrateurs" });
  }
  next();
};

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated();
}

/**
 * Middleware pour la gestion de l'authentification
 * Configure également le contexte PostgreSQL pour le schéma approprié
 */
export const ensureAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated()) {
      logger.warn(`Tentative d'accès non autorisé: ${req.originalUrl}`);
      return res.status(401).json({ message: "Non autorisé" });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      logger.warn("Session utilisateur invalide (pas d'ID)");
      return res.status(401).json({ message: "Session invalide" });
    }

    try {
      // Utiliser la fonction pour définir le schéma client
      await setSchemaForUser(userId);
    } catch (error) {
      logger.error(`Erreur lors de la configuration du schéma: ${error}`);
      // Ne pas bloquer la requête en cas d'erreur de configuration du schéma
    }

    return next();
  } catch (error) {
    logger.error(`Erreur d'authentification: ${error}`);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Middleware pour les routes nécessitant une authentification Manager ou Admin
 */
export const managerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentification requise" });
  }
  
  const user = req.user as any;
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return res.status(403).json({ message: "Accès réservé aux gestionnaires et administrateurs" });
  }
  
  next();
};

/**
 * Récupère l'ID de l'utilisateur à partir de la requête
 */
export function getUserId(req: Request): number | null {
  if (!req.isAuthenticated() || !req.user) {
    return null;
  }
  
  const user = req.user as any;
  return user.id || null;
}

/**
 * Récupère les informations de l'utilisateur à partir de la requête
 */
export function getUser(req: Request): AuthUser | null {
  if (!req.isAuthenticated() || !req.user) {
    return null;
  }
  
  const user = req.user as any;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email
  };
}

/**
 * Middleware d'authentification pour les routes
 */
export const authenticateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  ensureAuth(req, res, next);
};

// Middleware d'authentification JWT
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Récupérer le token d'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const token = authHeader.split(' ')[1];

    // Vérifier et décoder le token
    // Utiliser directement la variable d'environnement
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-replace-in-production';
    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;

    // Extraire les informations de l'utilisateur
    const user: AuthUser = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    // Attacher l'utilisateur à la requête
    req.user = user;

    // Configurer le schéma PostgreSQL pour l'utilisateur
    try {
      // Utiliser la fonction pour définir le schéma client
      await setSchemaForUser(user.id);
      
      // Continuer avec le traitement de la requête
      next();
    } catch (error) {
      logger.error(`Erreur lors de la configuration du schéma: ${error}`);
      return res.status(500).json({ message: 'Erreur serveur lors de la configuration de la session' });
    }
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}