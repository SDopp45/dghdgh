import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import logger from "./utils/logger";
import { pool } from "./db/index";
import bcrypt from "bcrypt";
import { setUserSchema, resetToPublicSchema } from "./db/index";
import { Router } from 'express';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Déclaration d'interface pour Session
declare module 'express-session' {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

// Étendre la requête Express pour inclure isAuthenticated et user
declare global {
  namespace Express {
    interface Request {
      isAuthenticated?: () => boolean;
      user?: {
        id: number;
        username: string;
        role: string;
        fullName?: string;
        email?: string;
        storageUsed?: string;
        storageLimit?: string;
        storageTier?: string;
      };
    }
  }
}

// Store de session en mémoire
const MemoryStore = createMemoryStore(session);

// Configuration du hash de mot de passe
const SALT_ROUNDS = 10;

/**
 * Hash un mot de passe avec bcrypt
 * @param password Mot de passe en clair
 * @returns Mot de passe hashé
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Vérifie un mot de passe hashé
 * @param password Mot de passe en clair
 * @param hashedPassword Mot de passe hashé
 * @returns True si le mot de passe correspond
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Résultat de l'authentification
 */
export type LoginResult = {
  success: boolean;
  userId?: number;
  username?: string;
  role?: string;
  message?: string;
};

/**
 * Fonction d'authentification utilisant la base de données
 * @param username Nom d'utilisateur
 * @param password Mot de passe
 * @returns Résultat de l'authentification
 */
export async function loginUser(username: string, password: string): Promise<LoginResult> {
  try {
    // Rechercher l'utilisateur dans la base de données
    const userResult = await pool.query(
      'SELECT id, username, password, role FROM public.users WHERE username = $1',
      [username]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      logger.warn(`Tentative de connexion avec un nom d'utilisateur inexistant: ${username}`);
      return { success: false, message: "Nom d'utilisateur ou mot de passe incorrect" };
    }

    const user = userResult.rows[0];
    
    // Vérifier le mot de passe
    const passwordValid = await verifyPassword(password, user.password);
    
    if (!passwordValid) {
      logger.warn(`Tentative de connexion avec un mot de passe invalide pour l'utilisateur: ${username}`);
      return { success: false, message: "Nom d'utilisateur ou mot de passe incorrect" };
    }

    // Configuration du schéma pour cet utilisateur
    await setUserSchema(user.id);
    
    logger.info(`Utilisateur ${username} (ID: ${user.id}, Role: ${user.role}) connecté avec succès`);
    
    return {
      success: true,
      userId: user.id,
      username: user.username,
      role: user.role
    };
  } catch (error) {
    logger.error(`Erreur lors de la connexion pour l'utilisateur ${username}:`, error);
    return { success: false, message: "Erreur interne du serveur lors de la connexion" };
  }
}

/**
 * Déconnecte un utilisateur
 * @param req Requête Express
 * @returns Succès de la déconnexion
 */
export async function logoutUser(req: Request): Promise<boolean> {
  try {
    // Détruire la session
    req.session.destroy((err) => {
      if (err) {
        logger.error("Erreur lors de la destruction de la session:", err);
        return false;
      }
    });
    
    // Réinitialiser le search_path à public
    await resetToPublicSchema();
    
    return true;
  } catch (error) {
    logger.error("Erreur lors de la déconnexion:", error);
    return false;
  }
}

/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Vérifier si la méthode isAuthenticated existe et retourne true
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    return next();
  }
  
  // Si nous avons un userId dans la session mais pas req.isAuthenticated
  if (req.session && req.session.userId) {
    return next();
  }
  
  logger.debug(`Accès non autorisé: ${req.originalUrl}`);
  res.status(401).json({ success: false, message: "Authentification requise" });
};

/**
 * Configure l'authentification pour l'application Express
 * @param app Application Express
 */
export const configureAuth = (app: Express) => {
  // Configurer le middleware de session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000 // 24 heures
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
      }
    })
  );

  // Middleware pour attacher isAuthenticated et user à la requête
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Définir la méthode isAuthenticated
      req.isAuthenticated = () => {
        return Boolean(req.session && req.session.userId);
      };
      
      // Si l'utilisateur est authentifié, récupérer ses informations
      if (req.session && req.session.userId) {
        // Configurer le schéma pour cet utilisateur
        await setUserSchema(req.session.userId);
        
        // Récupérer l'utilisateur en utilisant l'ID de session
        const userResult = await pool.query(
          'SELECT * FROM public.users WHERE id = $1',
          [req.session.userId]
        );
        
        if (userResult.rows && userResult.rows.length > 0) {
          const user = userResult.rows[0];
          
          // Configurer req.user
          req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.full_name,
            email: user.email,
            storageUsed: user.storage_used,
            storageLimit: user.storage_limit,
            storageTier: user.storage_tier
          };
        } else {
          // Utilisateur non trouvé malgré l'ID en session - problème de cohérence
          logger.warn(`Session avec ID utilisateur ${req.session.userId} mais utilisateur non trouvé en base de données`);
          req.session.destroy((err) => {
            if (err) logger.error("Erreur lors de la destruction de la session invalide:", err);
          });
        }
      }
      
      next();
    } catch (error) {
      logger.error("Erreur lors de la vérification de l'authentification:", error);
      next();
    }
  });
};
