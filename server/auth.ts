import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import logger from "./utils/logger";

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

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
      await db.insert(users).values({
        username: "testuser",
        password: hashedPassword,
        role: "admin",
        fullName: "Test User",
        email: "test@example.com",
        settings: {},
        accountType: "individual",
        phoneNumber: null,
        profileImage: null,
        archived: false,
        parentAccountId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info("Test user created successfully");
    } else {
      await db.update(users)
        .set({ 
          password: hashedPassword,
          role: "admin"
        })
        .where(eq(users.username, "testuser"));
      logger.info("Test user password and role updated");
    }
  } catch (error) {
    logger.error("Error creating test user:", error);
  }
}

// Middleware pour définir l'ID utilisateur dans le contexte PostgreSQL pour le RLS
export const setUserIdForRLS = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.isAuthenticated() && (req as any).user && (req as any).user.id) {
      // Si l'utilisateur est authentifié, on définit son ID dans le contexte PostgreSQL
      const userId = (req as any).user.id;
      
      // Utiliser la pool de connexion pour exécuter la requête SET ROLE
      const client = await db.$client;
      await client.query(`SELECT set_config('app.user_id', $1, false)`, [userId.toString()]);
      
      logger.info(`RLS: Set PostgreSQL user_id to ${userId}`);
    } else {
      // Si l'utilisateur n'est pas authentifié, on utilise un ID anonyme (0)
      const client = await db.$client;
      await client.query(`SELECT set_config('app.user_id', '0', false)`);
      
      logger.info(`RLS: Set PostgreSQL user_id to 0 (anonymous)`);
    }
    next();
  } catch (error) {
    logger.error("Error setting user ID for RLS:", error);
    next();
  }
};

export function setupAuth(app: Express) {
  // Create test user on startup
  createTestUser();

  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secure-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
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
  app.use(passport.session());

  // Middleware de développement pour créer une session automatique
  if (process.env.NODE_ENV === 'development' && process.env.AUTO_LOGIN !== 'false') {
    logger.info('Activating development authentication middleware');
    app.use((req, res, next) => {
      // Si aucun utilisateur n'est connecté, créer une session pour le testuser
      if (!req.isAuthenticated()) {
        logger.info('Creating dev session with test user');
        // Créer un utilisateur factice pour le développement
        const devUser = {
          id: 1,
          username: 'testuser',
          fullName: 'Test User',
          role: 'admin',
          email: 'test@example.com',
          settings: {},
        };
        // Attacher l'utilisateur à la requête
        (req as any).user = devUser;
        // Remplacer la fonction isAuthenticated
        (req as any).isAuthenticated = () => true;
      }
      next();
    });
  }

  // Ajouter le middleware pour définir l'ID utilisateur pour RLS
  app.use(setUserIdForRLS);

  app.use((req, res, next) => {
    debugSession(req);
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        logger.info(`Attempting login for username: [REDACTED]`);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          logger.warn(`Login failed: User ${username} not found`);
          return done(null, false, { message: "Invalid username or password" });
        }

        logger.info(`User found, verifying credentials`);
        const isMatch = await crypto.verify(password, user.password);

        if (!isMatch) {
          logger.warn(`Login failed: Invalid password for user ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        logger.info(`Authentication successful for user ID: ${user.id}`);
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword as Express.User);
      } catch (err) {
        logger.error("Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    logger.info("Serializing user ID:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      logger.info("Deserializing user ID:", id);
      
      // Définir manuellement l'ID utilisateur pour contourner le RLS pendant la désérialisation
      const client = await db.$client;
      await client.query(`SELECT set_config('app.user_id', '0', false)`);
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        logger.warn(`Deserialize failed: User ${id} not found`);
        return done(null, false);
      }

      const { password: _, ...userWithoutPassword } = user;
      
      // Réinitialiser l'ID utilisateur après la désérialisation
      await client.query(`SELECT set_config('app.user_id', $1, false)`, [id.toString()]);
      
      done(null, userWithoutPassword as Express.User);
    } catch (err) {
      logger.error("Deserializing error:", err);
      done(err);
    }
  });

  // Middleware d'authentification pour les routes d'API
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        logger.error("Login error:", err);
        return res.status(500).json({
          success: false,
          message: "Une erreur est survenue lors de la connexion."
        });
      }

      if (!user) {
        logger.warn("Login failed: Invalid credentials");
        return res.status(401).json({
          success: false,
          message: info?.message || "Identifiants invalides."
        });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) {
          logger.error("Session login error:", loginErr);
          return res.status(500).json({
            success: false,
            message: "Une erreur est survenue lors de la création de la session."
          });
        }
        
        // Définir l'ID utilisateur pour RLS après la connexion
        try {
          const client = await db.$client;
          await client.query(`SELECT set_config('app.user_id', $1, false)`, [user.id.toString()]);
          logger.info(`RLS: Set PostgreSQL user_id to ${user.id} after login`);
        } catch (error) {
          logger.error("Error setting user ID for RLS after login:", error);
        }

        logger.info(`User ${user.username} (ID: ${user.id}) logged in successfully`);
        return res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            email: user.email,
            settings: user.settings,
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const username = (req.user as any)?.username;
    req.logout((err) => {
      if (err) {
        logger.error("Logout error:", err);
        return res.status(500).json({
          success: false,
          message: "Une erreur est survenue lors de la déconnexion."
        });
      }
      
      // Réinitialiser l'ID utilisateur à 0 (anonyme) après la déconnexion
      try {
        // Utiliser async/await au lieu de .then()
        (async () => {
          try {
            const client = await db.$client;
            await client.query(`SELECT set_config('app.user_id', '0', false)`);
            logger.info(`RLS: Reset PostgreSQL user_id to 0 after logout`);
            
            logger.info(`User ${username} logged out successfully`);
            res.json({
              success: true,
              message: "Vous avez été déconnecté avec succès."
            });
          } catch (error) {
            logger.error("Error resetting user ID for RLS after logout:", error);
            
            // Toujours renvoyer une réponse même en cas d'erreur
            res.json({
              success: true,
              message: "Vous avez été déconnecté avec succès, mais une erreur est survenue avec la base de données."
            });
          }
        })();
      } catch (err) {
        logger.error("Error connecting to database after logout:", err);
        
        // Renvoyer une réponse en cas d'erreur
        res.json({
          success: true,
          message: "Vous avez été déconnecté avec succès, mais une erreur est survenue avec la base de données."
        });
      }
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      logger.info(`Session check: User ${user.username} is authenticated`);
      res.json({
        isAuthenticated: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          settings: user.settings,
        }
      });
    } else {
      logger.info("Session check: No authenticated user");
      res.json({
        isAuthenticated: false,
        user: null
      });
    }
  });
}

// Function to debug session
const debugSession = (req: any) => {
  if (process.env.NODE_ENV !== 'production') {
    const sessionId = req.sessionID;
    const isAuth = req.isAuthenticated();
    const userId = req.user?.id;
    logger.debug(`Session debug: ID=${sessionId}, Auth=${isAuth}, UserID=${userId}`);
  }
};

// Authentication middleware for protected routes
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }

  logger.warn("Unauthorized access attempt");
  res.status(401).json({
    success: false,
    message: "Non autorisé. Veuillez vous connecter."
  });
};

// Role-based access control middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      logger.warn("Unauthorized access attempt (not authenticated)");
      return res.status(401).json({
        success: false,
        message: "Non autorisé. Veuillez vous connecter."
      });
    }

    const user = req.user as any;
    if (!user.role || !roles.includes(user.role)) {
      logger.warn(`Forbidden: User ${user.username} (role: ${user.role}) attempted to access a restricted resource`);
      return res.status(403).json({
        success: false,
        message: "Accès interdit. Vous n'avez pas les droits nécessaires."
      });
    }

    next();
  };
};