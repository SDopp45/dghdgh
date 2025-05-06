import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import logger from "./utils/logger";
import { compareSync } from "bcrypt";
import { pool as dbPool } from "./db";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

// Configuration des options d'authentification
const AUTH_CONFIG = {
  // Choisir entre 'session', 'jwt', ou 'hybrid'
  mode: process.env.AUTH_MODE || 'session',
  // Options de session
  session: {
    secret: process.env.SESSION_SECRET || "your-secure-session-secret",
    cookieMaxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE || '86400000'), // 24h par défaut
    secureCookies: process.env.NODE_ENV === 'production',
  },
  // Options JWT (si utilisé)
  jwt: {
    secret: process.env.JWT_SECRET || "your-jwt-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || '1d', // 1 jour par défaut
  }
};

// Fonction pour hasher un mot de passe avec scrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN);
  return `${salt}:${(hash as Buffer).toString("hex")}`;
}

// Fonction pour vérifier un mot de passe avec scrypt
export async function verifyPassword(
  storedPassword: string,
  suppliedPassword: string
): Promise<boolean> {
  const [salt, storedHash] = storedPassword.split(":");
  const hash = await scryptAsync(suppliedPassword, salt, SCRYPT_KEYLEN);
  const suppliedHash = (hash as Buffer).toString("hex");
  return suppliedHash === storedHash;
}

// Créer un utilisateur de test pour le développement
async function createTestUser() {
  try {
    // Ne créer un utilisateur test que dans un environnement de développement
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
      logger.info("Utilisateur test non créé (non en mode développement)");
      return;
    }

    logger.info("Vérification de l'utilisateur test...");

    // Chercher l'utilisateur test existant
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, "admin"),
    });

    if (existingUser) {
      logger.info("L'utilisateur test existe déjà");
      return;
    }

    // Créer l'utilisateur test s'il n'existe pas
    logger.info("Création de l'utilisateur test (admin/admin123)...");

    // Hash du mot de passe pour l'utilisateur test
    const passwordHash = await hashPassword("admin123");

    // Insertion du nouvel utilisateur
    await db.insert(users).values([{
      username: "admin",
      password: passwordHash,
      email: "admin@example.com",
      fullName: "Administrator",
      role: "clients",
      storageUsed: 0,
      storageLimit: 5368709120, // 5 GB
      storageTier: "basic",
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    logger.info("Utilisateur test créé avec succès");
  } catch (error) {
    logger.error("Erreur lors de la création de l'utilisateur test:", error);
  }
}

// Fonction pour authentifier un utilisateur avec le nom d'utilisateur et le mot de passe
export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  try {
    // Rechercher l'utilisateur par nom d'utilisateur
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      logger.warn(`Tentative de connexion avec un nom d'utilisateur inexistant: ${username}`);
      return null;
    }

    // Vérifier le mot de passe
    const isValid = user.password 
      ? await verifyPassword(user.password, password)
      : false;

    if (!isValid) {
      logger.warn(`Tentative de connexion avec un mot de passe incorrect pour: ${username}`);
      return null;
    }

    // Si l'authentification a réussi, renvoyer l'utilisateur
    logger.info(`Authentification réussie pour: ${username}`);
    return user;
  } catch (error) {
    logger.error(`Erreur lors de l'authentification de l'utilisateur ${username}:`, error);
    return null;
  }
}

// Fonction pour vérifier si un utilisateur existe à partir de son ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    // Récupérer l'utilisateur complet à partir de l'ID
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      logger.warn(`Utilisateur ${id} non trouvé`);
      return null;
    }

    // Configurer le schéma PostgreSQL pour l'utilisateur
    try {
      await configureSchemasForUser(id);
    } catch (error) {
      logger.error(`Erreur lors de la configuration du schéma pour l'utilisateur ${id}:`, error);
    }

    return user;
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error);
    return null;
  }
}

// Configurer le schéma PostgreSQL pour un utilisateur
async function configureSchemasForUser(userId: number) {
  try {
    // Essayer d'utiliser la procédure stockée setup_user_environment
    await dbPool.query('SELECT public.setup_user_environment($1)', [userId]);
    logger.debug(`Environnement configuré pour l'utilisateur ${userId}`);
  } catch (error) {
    // Si la procédure échoue, essayer de configurer directement le schéma
    try {
      await dbPool.query(`SET search_path TO client_${userId}, public`);
      logger.debug(`Schéma configuré manuellement pour l'utilisateur ${userId}`);
    } catch (directError) {
      logger.error(`Impossible de configurer le schéma pour l'utilisateur ${userId}:`, directError);
      throw directError;
    }
  }
}

// Middleware d'authentification basé sur la session
export const authenticateSession = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session.userId;
  
  if (!userId) {
    return next();
  }
  
  try {
    const user = await getUserById(userId);
    if (user) {
      req.user = user;
      req.isAuthenticated = () => true;
    } else {
      req.isAuthenticated = () => false;
    }
  } catch (error) {
    logger.error('Erreur lors de l\'authentification par session:', error);
    req.isAuthenticated = () => false;
  }
  
  next();
};

// Configuration principale de l'authentification et des sessions
export function setupAuth(app: Express) {
  // Create test user on startup
  createTestUser();

  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: AUTH_CONFIG.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: AUTH_CONFIG.session.secureCookies,
      httpOnly: true,
      maxAge: AUTH_CONFIG.session.cookieMaxAge,
      sameSite: "lax",
      path: "/"
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    name: "sid"
  };

  app.use(session(sessionSettings));
  
  // Ajouter le middleware d'authentification
  app.use(authenticateSession);
  
  // Middleware de débogage des sessions (activé uniquement si la variable DEBUG_SESSION est à true)
  if (process.env.DEBUG_SESSION === 'true') {
    app.use((req, res, next) => {
      debugSession(req);
      next();
    });
  }
  
  logger.info(`Authentication configured in ${AUTH_CONFIG.mode} mode`);
}

// Fonction de débogage des sessions pour le développement
const debugSession = (req: any) => {
  if (process.env.DEBUG_SESSION === 'true') {
    logger.debug(`Session ID: ${req.sessionID}`);
    logger.debug(`Authenticated: ${req.isAuthenticated?.()}`);
    if (req.user) {
      logger.debug(`User ID: ${req.user.id}, Username: ${req.user.username}`);
    }
  }
};

// Middleware d'authentification pour les routes API
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated?.()) {
    return next();
  }
  
  return res.status(401).json({ error: 'Non authentifié' });
};

// Middleware simple pour vérifier l'authentification
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  next();
};

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

/** Fonction pour connecter un utilisateur */
export async function loginUser(username: string, password: string, req: Request) {
  const user = await authenticateUser(username, password);
  
  if (!user) {
    return { success: false, message: "Identifiants invalides" };
  }
  
  // Stocker l'ID utilisateur dans la session
  req.session.userId = user.id;
  
  // Ajouter l'utilisateur à la requête
  req.user = user;
  req.isAuthenticated = () => true;
  
  // Configurer le schéma PostgreSQL pour l'utilisateur
  await configureSchemasForUser(user.id);
  
  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      storageUsed: user.storageUsed?.toString() || '0',
      storageLimit: user.storageLimit?.toString() || '5368709120',
      storageTier: user.storageTier || 'basic',
    }
  };
}

/** Fonction pour déconnecter un utilisateur */
export function logoutUser(req: Request) {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Erreur lors de la destruction de la session:', err);
    }
  });
  
  // Réinitialiser l'état d'authentification
  req.user = undefined;
  req.isAuthenticated = () => false;
}

// Déclaration pour étendre l'interface Request
declare global {
  namespace Express {
    interface Request {
      isAuthenticated: () => boolean;
      user?: any;
    }
  }
}
