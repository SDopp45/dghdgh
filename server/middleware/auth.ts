import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { db, pool, setUserSchema, resetToPublicSchema, createClientSchema } from '../db/index';
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
    return resetToPublicSchema();
  }
  
  try {
    // Vérifier si le schéma existe
    const schemaExists = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)',
      [`client_${userId}`]
    );

    if (!schemaExists.rows[0].exists) {
      // Si le schéma n'existe pas, le créer
      await createClientSchema(userId);
    }

    // Définir le search_path pour inclure le schéma du client puis le schéma public
    await setUserSchema(userId);
    logger.debug(`Set search_path to client_${userId}, public`);
    return true;
  } catch (error) {
    logger.error(`Failed to set schema for user ${userId}:`, error);
    await resetToPublicSchema();
    return false;
  }
}

/**
 * Vérifie si l'utilisateur est un administrateur
 * @param req Requête Express
 * @returns Booléen indiquant si l'utilisateur est admin
 */
export function isAdmin(req: Request): boolean {
  if (!req.isAuthenticated?.()) return false;
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
  return req.isAuthenticated?.() || false;
}

/**
 * Middleware pour la gestion de l'authentification
 * Configure également le contexte PostgreSQL pour le schéma approprié
 */
export const ensureAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated?.()) {
      logger.warn(`Tentative d'accès non autorisé: ${req.originalUrl}`);
      return res.status(401).json({ message: "Non autorisé" });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      logger.warn("Session utilisateur invalide (pas d'ID)");
      return res.status(401).json({ message: "Session invalide" });
    }

    // Configurer automatiquement le schéma client
    await setSchemaForUser(userId);
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
  if (!req.isAuthenticated?.()) {
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
  if (!req.isAuthenticated?.() || !req.user) {
    return null;
  }
  
  const user = req.user as any;
  return user.id || null;
}

/**
 * Récupère les informations de l'utilisateur à partir de la requête
 */
export function getUser(req: Request): AuthUser | null {
  if (!req.isAuthenticated?.() || !req.user) {
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
      await setUserSchema(user.id);
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

/**
 * Middleware pour vérifier l'authentification
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated?.()) {
      logger.debug('Accès non autorisé: utilisateur non authentifié');
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const user = req.user as AuthUser;
    if (!user || !user.id) {
      logger.debug('Accès non autorisé: utilisateur invalide');
      return res.status(401).json({ error: 'Session utilisateur invalide' });
    }

    // Définir le schéma pour cet utilisateur
    await setUserSchema(user.id);
    
    next();
  } catch (error) {
    logger.error('Erreur lors de la vérification de l\'authentification:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la vérification de l\'authentification' });
  }
};

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const user = req.user as AuthUser;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès administrateur requis' });
    }

    // Pour les administrateurs, utiliser le schéma public
    await resetToPublicSchema();
    
    next();
  } catch (error) {
    logger.error('Erreur lors de la vérification des droits administrateur:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la vérification des droits' });
  }
};