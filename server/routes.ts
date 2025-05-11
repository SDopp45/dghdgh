import type { Express } from "express";
import express from "express";
import { configureAuth } from "./auth";
import { db } from "@db";
import { properties, transactions, users } from '@db/schema';
import { eq, inArray } from 'drizzle-orm';
import multer from "multer";
import path from "path";
import fs from "fs";
import logger from "./utils/logger";
import cors from 'cors';
import { setupDefaultImages } from './utils/default-images';
import { 
  getClientSchemaName, 
  getClientSubdirectory, 
  ensureClientDirectories,
  initializeUploadDirectories,
  UPLOAD_DIR
} from './utils/storage-helpers';

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
import usersRouter from './routes/users';
import formsRouter from './routes/forms';

// Initialiser la structure de dossiers uploads
initializeUploadDirectories();

// Définir les répertoires pour la rétrocompatibilité
const uploadDir = UPLOAD_DIR;
const propertyImagesDir = path.resolve(uploadDir, 'properties');
const documentsDir = path.resolve(uploadDir, 'documents');
const visitReportsDir = path.resolve(uploadDir, 'visit-reports');
const contractsDir = path.resolve(uploadDir, 'contracts');
const profileImagesDir = path.resolve(uploadDir, 'profile');
const tempDir = path.resolve(uploadDir, 'temp');

// Setup default property images
setupDefaultImages();

// Configure CORS options
const corsOptions = {
  origin: ['http://localhost:5173', 'https://immobilier.app', process.env.CLIENT_URL].filter(Boolean) as string[],
  credentials: true
};

export function setupRoutes(app: Express) {
  // Setup authentication first
  configureAuth(app);

  // Logger for all requests
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Enable CORS for all routes
  app.use(cors(corsOptions));

  // Parse JSON body
  app.use(express.json());
  
  // Serve uploads directory
  app.use('/uploads', express.static(uploadDir));

  // API Router
  const apiRouter = express.Router();
  app.use('/api', apiRouter);

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error('Global error handler caught:', err);
    res.status(500).json({
      error: 'Server Error',
      message: err.message || 'An unexpected error occurred'
    });
  });

  // Configure file uploads avec support des dossiers clients
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      let destinationDir;
      
      // Vérifier si l'utilisateur est authentifié
      const userId = req.user?.id;
      
      if (userId) {
        // Utiliser le même format que pour les schémas PostgreSQL
        const clientSchema = getClientSchemaName(userId);
        logger.info(`Upload: utilisation du schéma/dossier client ${clientSchema} pour l'utilisateur ID ${userId}`);
        
        // Créer la structure de dossiers du client si elle n'existe pas
        ensureClientDirectories(userId);
        
        // Sélectionner le sous-répertoire en fonction du type de fichier
        if (file.fieldname === 'propertyImages') {
          destinationDir = getClientSubdirectory(userId, 'properties');
        } else if (file.fieldname === 'document') {
          destinationDir = getClientSubdirectory(userId, 'documents');
        } else if (file.fieldname === 'contract') {
          destinationDir = getClientSubdirectory(userId, 'contracts');
        } else if (file.fieldname === 'visitReport') {
          destinationDir = getClientSubdirectory(userId, 'visit-reports');
        } else if (file.fieldname === 'profileImage') {
          destinationDir = getClientSubdirectory(userId, 'profiles');
        } else {
          destinationDir = getClientSubdirectory(userId, 'temp');
        }
      } else {
        // Fallback vers les répertoires legacy pour la compatibilité
        if (file.fieldname === 'propertyImages') {
          destinationDir = propertyImagesDir;
        } else if (file.fieldname === 'document') {
          destinationDir = documentsDir;
        } else if (file.fieldname === 'contract') {
          destinationDir = contractsDir;
        } else if (file.fieldname === 'visitReport') {
          destinationDir = visitReportsDir;
        } else if (file.fieldname === 'profileImage') {
          destinationDir = profileImagesDir;
        } else {
          destinationDir = tempDir;
        }
      }
      
      cb(null, destinationDir);
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
  apiRouter.use('/user/ai-settings', aiSettingsRouter);
  apiRouter.use('/financial-analysis', financialAnalysisRouter);
  apiRouter.use('/feedbacks', feedbacksRouter);
  apiRouter.use('/tenant-history', tenantHistoryRouter);
  apiRouter.use('/contracts', contractsRouter);
  apiRouter.use('/image-enhancement', imageEnhancementRouter);
  apiRouter.use('/marketplace', marketplaceRouter);
  apiRouter.use('/links', linksRouter);
  
  // Static files and templates
  apiRouter.use('/statics', staticsRouter);
  
  // Auth routes (already mounted in configureAuth)
  apiRouter.use('/auth', authRoutes);

  // Additional routes
  apiRouter.use('/users', usersRouter);
  apiRouter.use('/forms', formsRouter);

  if (process.env.NODE_ENV === 'development') {
    // apiRouter.use('/debug', debugRouter);
  }
}

export function registerRoutes(app: Express) {
  setupRoutes(app);
  return app;
}