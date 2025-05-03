import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
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
        role: "manager",
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
        .set({ password: hashedPassword })
        .where(eq(users.username, "testuser"));
      logger.info("Test user password updated");
    }
  } catch (error) {
    logger.error("Error creating test user:", error);
  }
}

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
  if (process.env.NODE_ENV === 'development') {
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
          role: 'manager',
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
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        logger.warn("User not found during deserialization:", id);
        return done(null, false);
      }

      const { password: _, ...userWithoutPassword } = user;
      logger.info("User deserialized successfully with ID:", id);
      done(null, userWithoutPassword as Express.User);
    } catch (err) {
      logger.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: result.error.issues
        });
      }

      const { username, password } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          ...result.data,
          password: hashedPassword,
          settings: {},
          accountType: "individual",
        } as User)
        .returning();

      const { password: _, ...userWithoutPassword } = newUser;

      req.login(userWithoutPassword as Express.User, (err) => {
        if (err) {
          logger.error("Login error after registration:", err);
          return res.status(500).json({ error: "Error during login after registration" });
        }
        return res.json({
          message: "Registration successful",
          user: userWithoutPassword,
        });
      });
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error during registration" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    logger.info("Login attempt received");

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        logger.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error during login" });
      }

      if (!user) {
        logger.warn("Login failed:", info.message);
        return res.status(401).json({ error: info.message ?? "Login failed" });
      }

      req.login(user, (err) => {
        if (err) {
          logger.error("Session creation error:", err);
          return res.status(500).json({ error: "Error creating session" });
        }

        logger.info("Login successful for user ID:", user.id);
        return res.json({
          message: "Login successful",
          user,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const user = req.user as any;
    const userIdentifier = user?.email || user?.fullName || user?.id;
    logger.info("Logout attempt received");

    req.logout((err) => {
      if (err) {
        logger.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }

      req.session.destroy((err) => {
        if (err) {
          logger.error("Session destruction error:", err);
          return res.status(500).json({ error: "Session destruction failed" });
        }
        logger.info("Logout successful");
        res.json({ message: "Logout successful" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      logger.warn("Unauthenticated user info request");
      return res.status(401).json({ error: "Not authenticated" });
    }
    logger.info("User info request received");
    res.json(req.user);
  });
}

const debugSession = (req: any) => {
  logger.info("Session Debug Info:", {
    hasSession: !!req.session,
    sessionID: req.sessionID ? '[REDACTED]' : 'None',
    hasUser: !!req.user,
    isAuthenticated: req.isAuthenticated()
  });
};