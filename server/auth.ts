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

// Utilitaires de cryptage pour la gestion des mots de passe
const crypto = {
  hash: async (password: string): Promise<string> => {
    try {
      const salt = randomBytes(SALT_BYTES).toString("hex");
      const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
      const hashedPassword = derivedKey.toString("hex");
      logger.info(`Hashing password - salt length: ${salt.length}, hash length: ${hashedPassword.length}`);
      return `${hashedPassword}.${salt}`;
    } catch (error) {
      logger.error("Error hashing password:", error);
      throw new Error("Could not hash password");
    }
  },

  verify: async (suppliedPassword: string, storedPassword: string): Promise<boolean> => {
    try {
      if (!storedPassword || !storedPassword.includes('.')) {
        logger.warn("Invalid stored password format - missing separator");
        return false;
      }

      const [hashedPassword, salt] = storedPassword.split(".");

      if (!hashedPassword || !salt) {
        logger.warn("Invalid stored password format - missing components");
        return false;
      }

      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const derivedKey = (await scryptAsync(suppliedPassword, salt, SCRYPT_KEYLEN)) as Buffer;

      if (hashedPasswordBuf.length !== derivedKey.length) {
        logger.warn(`Buffer length mismatch: stored=${hashedPasswordBuf.length}, derived=${derivedKey.length}`);
        return false;
      }

      return timingSafeEqual(hashedPasswordBuf, derivedKey);
    } catch (error) {
      logger.error("Error verifying password:", error);
      return false;
    }
  }
};

// Fonction pour créer un utilisateur de test (utile pour le développement)
export async function createTestUser() {
  try {
    const hashedPassword = await crypto.hash("testpass123");
    logger.info("Creating test user with hashed password");

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, "testuser"))
      .limit(1);

    if (!existingUser) {
      // Créer un utilisateur administrateur pour les tests
      await db.insert(users).values({
        username: "testuser",
        password: hashedPassword,
        role: "admin",
        fullName: "Test Admin",
        email: "test@example.com",
        settings: {},
        accountType: "individual",
        phoneNumber: null,
        profileImage: null,
        archived: false,
        parentAccountId: null,
        storageUsed: "0",
        storageLimit: "5368709120",
        storageTier: "basic",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info("Test admin user created successfully");
      
      // Créer un utilisateur client pour les tests
      await db.insert(users).values({
        username: "testclient",
        password: hashedPassword,
        role: "clients",
        fullName: "Test Client",
        email: "client@example.com",
        settings: {},
        accountType: "individual",
        phoneNumber: null,
        profileImage: null,
        archived: false,
        parentAccountId: null,
        storageUsed: "0",
        storageLimit: "5368709120",
        storageTier: "basic",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info("Test client user created successfully");
    } else {
      await db.update(users)
        .set({ 
          password: hashedPassword,
          role: "admin",
          storageUsed: existingUser.storageUsed || "0",
          storageLimit: existingUser.storageLimit || "5368709120",
          storageTier: existingUser.storageTier || "basic"
        })
        .where(eq(users.username, "testuser"));
      logger.info("Test admin user password and role updated");
      
      // Mettre à jour ou créer l'utilisateur client
      const [existingClient] = await db
        .select()
        .from(users)
        .where(eq(users.username, "testclient"))
        .limit(1);
        
      if (existingClient) {
        await db.update(users)
          .set({ 
            password: hashedPassword,
            role: "clients",
            storageUsed: existingClient.storageUsed || "0",
            storageLimit: existingClient.storageLimit || "5368709120",
            storageTier: existingClient.storageTier || "basic"
          })
          .where(eq(users.username, "testclient"));
        logger.info("Test client user password and role updated");
      } else {
        await db.insert(users).values({
          username: "testclient",
          password: hashedPassword,
          role: "clients",
          fullName: "Test Client",
          email: "client@example.com",
          settings: {},
          accountType: "individual",
          phoneNumber: null,
          profileImage: null,
          archived: false,
          parentAccountId: null,
          storageUsed: "0",
          storageLimit: "5368709120",
          storageTier: "basic",
          createdAt: new Date(),
          updatedAt: new Date()
        });
        logger.info("Test client user created successfully");
      }
    }
  } catch (error) {
    logger.error("Error creating test users:", error);
  }
}

// Middleware pour définir l'ID utilisateur dans le contexte PostgreSQL pour le RLS
export const setUserIdForRLS = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.isAuthenticated() && (req as any).user && (req as any).user.id) {
      // Si l'utilisateur est authentifié, on définit son ID dans le contexte PostgreSQL
      const userId = (req as any).user.id;
      
      // Utiliser la pool de connexion pour exécuter la requête
      try {
        await db.transaction(async (tx) => {
          // Définir l'ID utilisateur pour RLS
          await tx.execute(`SELECT set_config('app.user_id', '${userId.toString()}', false)`);
          logger.info(`RLS: Set PostgreSQL user_id to ${userId}`);
          
          // Si l'utilisateur a le rôle 'clients', s'assurer que les restrictions sont appliquées
          const userRole = (req as any).user.role;
          if (userRole === 'clients') {
            // Définir le rôle PostgreSQL à 'clients' pour appliquer les restrictions RLS
            await tx.execute(`SET ROLE clients`);
            logger.info(`RLS: Set PostgreSQL role to 'clients' for user ${userId}`);
          } else {
            // Pour les administrateurs, garder le rôle 'postgres' avec tous les privilèges
            await tx.execute(`SET ROLE postgres`);
            logger.info(`RLS: Set PostgreSQL role to 'postgres' for admin user ${userId}`);
          }
        });
      } catch (dbError) {
        logger.error("Database transaction error during RLS setup:", dbError);
      }
    } else {
      // Si l'utilisateur n'est pas authentifié, on utilise un ID anonyme (0)
      try {
        await db.transaction(async (tx) => {
          await tx.execute(`SELECT set_config('app.user_id', '0', false)`);
          logger.info(`RLS: Set PostgreSQL user_id to 0 (anonymous)`);
          
          // Pour les accès anonymes, utiliser le rôle clients avec des restrictions
          await tx.execute(`SET ROLE clients`);
          logger.info(`RLS: Set PostgreSQL role to 'clients' for anonymous access`);
        });
      } catch (dbError) {
        logger.error("Database transaction error during anonymous RLS setup:", dbError);
      }
    }
    next();
  } catch (error) {
    logger.error("Error setting user ID for RLS:", error);
    next();
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

  // Ajouter le middleware pour définir l'ID utilisateur pour RLS
  app.use(setUserIdForRLS);

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
    logger.debug(`Authenticated: ${req.isAuthenticated()}`);
    if (req.user) {
      logger.debug(`User ID: ${req.user.id}, Username: ${req.user.username}`);
    }
  }
};

// Middleware d'authentification pour les routes API
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ error: 'Non authentifié' });
};

// Middleware de contrôle d'accès basé sur les rôles
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userRole = (req.user as any).role;
    
    // Si l'utilisateur est administrateur (role 'admin'), il a accès à tout
    if (userRole === 'admin') {
      return next();
    }
    
    // Pour le rôle 'clients', vérifier les restrictions d'accès
    if (roles.includes(userRole)) {
      // Vérifier que l'utilisateur accède à ses propres ressources
      // Cela est déjà garanti par le Row-Level Security en base de données
      return next();
    }
    
    return res.status(403).json({ error: 'Accès non autorisé' });
  };
};