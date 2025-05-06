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
const visitReportsDir = path.resolve(uploadDir, 'visit-reports');
const contractsDir = path.resolve(uploadDir, 'contracts');
const profileImagesDir = path.resolve(uploadDir, 'profile');
const tempDir = path.resolve(uploadDir, 'temp');

// Ensure directories exist
[uploadDir, propertyImagesDir, documentsDir, visitReportsDir, 
 contractsDir, profileImagesDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }
});

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

  // Auth routes (no auth required)
  apiRouter.use("/auth", authRoutes);
  
  // Statics routes (no auth required)
  apiRouter.use("/statics", staticsRouter);

  // Links routes (no auth required)
  apiRouter.use("/links", linksRouter);

  // Add CORS to API routes
  apiRouter.use(cors());

  // Configure file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'propertyImages') {
        cb(null, propertyImagesDir);
      } else if (file.fieldname === 'document') {
        cb(null, documentsDir);
      } else if (file.fieldname === 'contract') {
        cb(null, contractsDir);
      } else if (file.fieldname === 'visitReport') {
        cb(null, visitReportsDir);
      } else if (file.fieldname === 'profileImage') {
        cb(null, profileImagesDir);
      } else {
        cb(null, tempDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB
    } 
  });

  // Register all routes
  apiRouter.use('/properties', propertiesRouter);
  apiRouter.use('/tenants', tenantsRouter);
  apiRouter.use('/documents', documentsRouter);
  apiRouter.use('/folders', foldersRouter);
  apiRouter.use('/maintenance', maintenanceRoutes);
  apiRouter.use('/visits', visitsRouter);
  apiRouter.use('/transactions', transactionsRouter);
  apiRouter.use('/notifications', notificationsRouter);
  apiRouter.use('/user-notifications', userNotificationSettingsRouter);
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

  // Configurer les images par défaut
  setupDefaultImages();

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