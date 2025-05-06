import type { Express } from "express";
import express from "express";
import { setupAuth } from "./auth";
import { db } from "@db";
import { properties, transactions, users } from '@db/schema';
import { eq, inArray } from 'drizzle-orm';
import multer from "multer";
import path from "path";
import fs from "fs";
import logger from "./utils/logger";
import cors from 'cors';
import { setupDefaultImages } from './utils/default-images';
import { setupRLSContext } from './middleware/auth';

// Import routes
import documentsRouter from './routes/documents';
import foldersRouter from './routes/folders';
import maintenanceRoutes from './routes/maintenance';
import visitsRouter from './routes/visits';
import tenantsRouter from './routes/tenants';
import propertiesRouter from './routes/properties';
import transactionsRouter from './routes/transactions';
import notificationsRouter from './routes/notifications';
import userNotificationSettingsRouter from './routes/user-notifications';
import dataExportRouter from './routes/data-export';
import propertyFeaturesRouter from './routes/property-features';
import aiAssistantRouter from './routes/ai-assistant';
import aiSettingsRouter from './routes/ai-settings';
import financialAnalysisRouter from './routes/financial-analysis';
import feedbacksRouter from './routes/feedbacks';
import tenantHistoryRouter from './routes/tenantHistory';
import contractsRouter from './routes/contracts';
import imageEnhancementRouter from './routes/image-enhancement';
import marketplaceRouter from './routes/marketplace';
import linksRouter from './routes/links';
import staticsRouter from './routes/statics';
import authRoutes from './routes/auth-routes';

// Basic upload directory setup
const uploadDir = path.resolve(process.cwd(), 'uploads');
const propertyImagesDir = path.resolve(uploadDir, 'properties');
const documentsDir = path.resolve(uploadDir, 'documents');

// Create directories if they don't exist
[uploadDir, propertyImagesDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Setup default property type images
setupDefaultImages();

export function setupRoutes(app: Express) {
  // Setup authentication first
  setupAuth(app);

  // Logging middleware for all requests
  app.use((req, res, next) => {
    logger.info(`[${req.method}] ${req.url}`, {
      query: req.query,
      body: req.body,
      headers: req.headers,
      isAuthenticated: req.isAuthenticated?.(),
      user: req.user
    });
    next();
  });

  // Add RLS context middleware to all routes
  app.use(setupRLSContext);

  // Serve static files
  app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath).toLowerCase() === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      }
    }
  }));

  // Serve public profile files
  app.use('/u', express.static(path.resolve(process.cwd(), 'public', 'u'), {
    setHeaders: (res, filePath) => {
      // Cache control for public profile assets
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }));

  // API Router
  const apiRouter = express.Router();

  // Middleware to ensure authentication for API routes
  apiRouter.use((req, res, next) => {
    // Exclure les routes publiques de l'authentification
    if (
      req.path === '/login' ||
      req.path === '/logout' ||
      (req.path.startsWith('/links/profile/') && req.method === 'GET' && !req.path.includes('/view') && !req.path.includes('/click')) ||
      req.path.startsWith('/u/') ||
      req.path.startsWith('/links/click/') ||
      req.path.startsWith('/links/form-submit/') ||
      req.path.startsWith('/links/submit/')
    ) {
      return next();
    }
    
    // En mode développement, permettre l'accès aux réponses de formulaire avec 
    // un paramètre spécial ou un en-tête
    if (process.env.NODE_ENV === 'development' && 
        (req.path.startsWith('/links/form-submissions/') || 
         req.path.includes('form-submissions')) && 
        (req.query.dev === 'true' || req.headers['x-dev-mode'] === 'true')) {
      
      logger.info('Accès développeur aux soumissions de formulaire autorisé pour:', req.path);
      // Utiliser l'utilisateur déjà authentifié ou passer à la vérification standard
      if (req.user) {
        return next();
      }
    }
    
    if (!req.isAuthenticated()) {
      logger.warn('Unauthorized access attempt:', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ error: "Non authentifié" });
    }
    next();
  });

  // Register routes with debug logging
  logger.info('Mounting API routes...');

  // Routes d'authentification (pas besoin de middleware d'authentification)
  apiRouter.use('/', authRoutes);
  
  apiRouter.use('/documents', documentsRouter);
  apiRouter.use('/folders', foldersRouter);
  apiRouter.use('/maintenance', maintenanceRoutes);
  apiRouter.use('/properties', propertiesRouter);
  apiRouter.use('/visits', visitsRouter);
  apiRouter.use('/tenants', tenantsRouter);
  apiRouter.use('/transactions', transactionsRouter);
  apiRouter.use('/notifications', notificationsRouter);
  apiRouter.use('/user/notification-settings', userNotificationSettingsRouter);
  apiRouter.use('/export', dataExportRouter);
  apiRouter.use('/property-features', propertyFeaturesRouter);
  apiRouter.use('/ai-assistant', aiAssistantRouter);
  apiRouter.use('/ai-settings', aiSettingsRouter);
  apiRouter.use('/financial-analysis', financialAnalysisRouter);
  apiRouter.use('/feedbacks', feedbacksRouter);
  apiRouter.use('/tenant-history', tenantHistoryRouter);
  apiRouter.use('/contracts', contractsRouter);
  apiRouter.use('/image-enhancement', imageEnhancementRouter);
  apiRouter.use('/marketplace', marketplaceRouter);
  apiRouter.use('/links', linksRouter);
  apiRouter.use('/statics', staticsRouter);

  // Get all users - limité à l'administrateur
  apiRouter.get("/users", async (req, res) => {
    try {
      // Vérifier le rôle de l'utilisateur - uniquement les admins peuvent voir tous les utilisateurs
      if ((req.user as any)?.role !== 'admin') {
        return res.status(403).json({ error: "Accès non autorisé" });
      }
      
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({ error: "Error fetching users" });
    }
  });

  // Get all transactions - maintenant via RLS
  apiRouter.get("/transactions", async (req, res) => {
    try {
      // La sécurité Row-Level Security filtre automatiquement les transactions
      const userTransactions = await db.select().from(transactions);
      res.json(userTransactions);
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      res.status(500).json({ 
        error: "Erreur lors de la récupération des transactions",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      });
    }
  });

  // Mount API router with prefix
  app.use('/api', apiRouter);

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Error handling request:', err);
    res.status(500).json({ 
      error: "Erreur lors du traitement de la demande",
      message: err.message || "Erreur inconnue"
    });
  });
}

export function registerRoutes(app: Express) {
  setupRoutes(app);
  return app;
}