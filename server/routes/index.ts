import express, { Express, Router } from "express";
import path from "path";
import fs from "fs";
import logger from "../utils/logger";
import { authenticateMiddleware } from "../middleware/auth";

// Middleware pour les uploads
import multer from "multer";

// Importer les routes
import authRoutes from "./auth-routes";
import propertiesRoutes from "./properties";
import tenantsRoutes from "./tenants";
import foldersRoutes from "./folders";
import documentsRoutes from "./documents";
import maintenanceRoutes from "./maintenance";
import visitsRoutes from "./visits";
import transactionsRoutes from "./transactions";
import alertsRoutes from "./alerts";
import reportsRoutes from "./reports";
import analyticsRoutes from "./analytics";
import aiAssistantRoutes from "./ai-assistant";
import aiSettingsRoutes from "./ai-settings";
import adminAiRoutes from "./admin-ai";
import feedbacksRoutes from "./feedbacks";
import contractsRoutes from "./contracts";
import linksRoutes from "./links";
import staticsRoutes from "./statics";
import storageRoutes from "./storage";

// Fonction pour configurer les routes API
export function setupRoutes(app: Express) {
  logger.info("Configuration des routes API...");
  
  // Configuration de multer pour la gestion des fichiers uploadés
  const uploadsDir = path.join(process.cwd(), "uploads");
  
  // S'assurer que le répertoire uploads existe
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info(`Created uploads directory: ${uploadsDir}`);
  }
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });
  
  // Middleware pour servir les fichiers uploadés
  app.use("/uploads", express.static(uploadsDir));
  
  // Création du routeur principal pour /api
  const apiRouter = Router();
  
  // Route de statut pour vérifier la connexion (non protégée)
  apiRouter.get("/status", (req, res) => {
    res.json({
      status: "ok",
      time: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0"
    });
  });

  // Monter les routes d'authentification (non protégées)
  apiRouter.use("/auth", authRoutes);
  
  // Middleware d'authentification global pour toutes les autres routes API
  // Toutes les routes montées après cette ligne nécessiteront une authentification
  apiRouter.use(authenticateMiddleware);
  
  // Monter toutes les routes protégées
  apiRouter.use("/properties", propertiesRoutes);
  apiRouter.use("/tenants", tenantsRoutes);
  apiRouter.use("/folders", foldersRoutes);
  apiRouter.use("/documents", documentsRoutes);
  apiRouter.use("/maintenance", maintenanceRoutes);
  apiRouter.use("/visits", visitsRoutes);
  apiRouter.use("/transactions", transactionsRoutes);
  apiRouter.use("/alerts", alertsRoutes);
  apiRouter.use("/reports", reportsRoutes);
  apiRouter.use("/analytics", analyticsRoutes);
  apiRouter.use("/ai-assistant", aiAssistantRoutes);
  apiRouter.use("", aiSettingsRoutes);
  apiRouter.use("/", adminAiRoutes);
  apiRouter.use("/feedbacks", feedbacksRoutes);
  apiRouter.use("/contracts", contractsRoutes);
  apiRouter.use("/links", linksRoutes);
  apiRouter.use("/statics", staticsRoutes);
  apiRouter.use("/storage", storageRoutes);
  
  // Montage du routeur sur /api
  app.use("/api", apiRouter);
  
  logger.info("Configuration des routes API terminée");
} 