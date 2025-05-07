import express from "express";
import { createServer } from "http";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { configureAuth } from "./auth";
import { setupVite, serveStatic } from "./server-vite";
import { globalErrorHandler } from "./middleware/errorHandler";
import logger from "./utils/logger";
import { setupRoutes } from "./routes";
import config from "./config";
import { initCronJobs } from "./cron";
import { initializeWebSockets } from './websocket/init-websocket';
import { setClientSchema } from './middleware/schema';
import { debugMiddleware } from './debug-middleware';
import './schema/links';
import { initializeDatabase } from './db/index';
import { repairDatabaseFunctions } from './db/repair-functions';

// Configuration des répertoires
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const UPLOADS_LOGOS_DIR = path.join(UPLOADS_DIR, "logos");
const UPLOADS_BACKGROUNDS_DIR = path.join(UPLOADS_DIR, "backgrounds");
const UPLOADS_LINK_ICONS_DIR = path.join(UPLOADS_DIR, "link-icons");

// Création des répertoires s'ils n'existent pas
[UPLOADS_DIR, UPLOADS_LOGOS_DIR, UPLOADS_BACKGROUNDS_DIR, UPLOADS_LINK_ICONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Répertoire créé: ${dir}`);
}
});

// Configuration de multer pour les uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
export const upload = multer({ storage });

// Création de l'application Express et du serveur HTTP
const app = express();
const server = createServer(app);

// Gestionnaires d'erreurs au niveau du processus
process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejet de promesse non géré:', reason, promise);
});

logger.info('Démarrage de l\'initialisation de l\'application...');

// Middlewares de base
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Middleware de débogage (ajouter en mode développement uniquement)
if (config.environment === "development") {
  app.use(debugMiddleware);
  logger.info('Middleware de débogage activé');
}

// Configuration CORS
app.use(cors({
  origin: true, // En développement, accepter toutes les origines
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Accès aux fichiers uploadés
app.use('/uploads', express.static(UPLOADS_DIR));

// Journalisation des requêtes
app.use((req, res, next) => {
  if (req.url !== '/api/auth/check') { // Ne pas logger les vérifications fréquentes
    logger.info(`${req.method} ${req.url}`);
  }
  next();
});

// Fonction principale d'initialisation de l'application
async function startServer() {
  try {
    // Initialiser la base de données et ses fonctions
    await initializeDatabase();
    logger.info('Base de données initialisée avec succès');
    
    // Réparer les fonctions de gestion des schémas
    logger.info('Réparation des fonctions de gestion des schémas...');
    const repairResult = await repairDatabaseFunctions();
    if (repairResult) {
      logger.info('Fonctions de gestion des schémas réparées avec succès');
    } else {
      logger.warn('Problèmes lors de la réparation des fonctions de schéma - vérifiez les logs pour plus de détails');
    }
    
    // Configuration de l'authentification (doit être AVANT setClientSchema)
    configureAuth(app);
    
    // Middleware pour configurer le schéma PostgreSQL (doit être APRÈS auth)
    app.use(setClientSchema);
    
    // Configuration des routes API
    setupRoutes(app);
    
    // Configuration de Vite ou servir les fichiers statiques
    if (config.environment === "development") {
      logger.info('Configuration de Vite pour le développement...');
      await setupVite(app, server);
    } else {
      logger.info('Configuration du serveur pour la production...');
      serveStatic(app);
    }
    
    // Gestionnaire d'erreurs global
    app.use(globalErrorHandler);
    
    // Démarrer le serveur
    const PORT = process.env.PORT || 5005;
    server.listen(PORT, () => {
      logger.info(`Serveur démarré sur le port ${PORT}`);
      logger.info(`Mode: ${process.env.NODE_ENV}`);
      logger.info(`Base de données: ${process.env.DATABASE_HOST || 'locale'}`);
      
      // Initialize WebSockets with error handling
      initializeWebSockets(server);
      
      // Initialize cron jobs
      initCronJobs();
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Lancer l'application
startServer();

export default app;