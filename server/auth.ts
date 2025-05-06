import passport from "passport";
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
import { setClientSchema } from "./middleware/schema";
import { pool as dbPool } from "./db";

// Importer la configuration Passport
import './config/passport';

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
    const newUser = await db.insert(users).values({
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
    });

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

// Middleware pour vérifier l'authentification
// Fonctions pour la sérialisation/désérialisation des utilisateurs
// NOTE: Ces fonctions sont utilisées par Passport.js
export async function serializeUser(user: any, done: any) {
  // Stocker uniquement l'ID utilisateur dans la session
  done(null, user.id);
}

export async function deserializeUser(id: number, done: any) {
  try {
    // Récupérer l'utilisateur complet à partir de l'ID
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      logger.warn(`Session utilisateur invalide: utilisateur ${id} non trouvé`);
      return done(null, null);
    }

    // Normaliser et sanitiser l'utilisateur pour la session
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      storageUsed: user.storageUsed?.toString() || '0',
      storageLimit: user.storageLimit?.toString() || '5368709120', // 5GB par défaut
      storageTier: user.storageTier || 'basic'
    };

    done(null, sessionUser);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error);
    done(error, null);
  }
}

// Fonction de débogage des sessions pour le développement
const debugSession = (req: any) => {
  if (process.env.DEBUG_SESSION === 'true') {
    logger.debug(`Session ID: ${req.sessionID}`);
    logger.debug(`Authenticated: ${req.isAuthenticated()}`);
    if (req.user) {
      logger.debug(`User ID: ${req.user.id}, Username: ${req.user.username}`);
    }
  }
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
  app.use(passport.initialize());
  
  // N'activer les sessions que si on est en mode session ou hybride
  if (AUTH_CONFIG.mode !== 'jwt') {
    app.use(passport.session());
  }
  
  // Utiliser le middleware de schéma client
  app.use(setClientSchema);

  // Middleware de débogage des sessions (activé uniquement si la variable DEBUG_SESSION est à true)
  if (process.env.DEBUG_SESSION === 'true') {
    app.use((req, res, next) => {
      debugSession(req);
      next();
    });
  }
  
  logger.info(`Authentication configured in ${AUTH_CONFIG.mode} mode`);
}

// Middleware d'authentification pour les routes API
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ error: 'Non authentifié' });
};

// Middleware simple pour vérifier l'authentification
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  next();
};

/** Fonction pour authentifier un utilisateur et configurer le contexte PostgreSQL */
export async function loginUser(email: string, password: string) {
  try {
    // Tentative de récupération de l'utilisateur
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    // Vérifier si l'utilisateur existe
    if (!user) {
      return { success: false, message: "Identifiants invalides" };
    }

    // Vérifier le mot de passe
    const passwordValid = await compareSync(password, user.password);
    if (!passwordValid) {
      return { success: false, message: "Identifiants invalides" };
    }

    // Journalisation de la connexion
    logger.info(`Utilisateur connecté: ${user.email} (${user.id})`);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        settings: user.settings,
      },
    };
  } catch (error) {
    logger.error(`Erreur d'authentification: ${error}`);
    return { success: false, message: "Erreur de serveur" };
  }
}
