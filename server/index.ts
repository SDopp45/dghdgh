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
import { schemaMiddleware, resetSchemaAfterHandler } from './middleware/schema';
import './schema/links';
import { repairDatabaseFunctions } from './db/repair-functions';
import { debugMiddleware } from './debug-middleware';
import { pool } from './db';
import { syncClientDirectoriesWithSchemas } from './utils/storage-helpers';

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
    // La connexion à la base de données est initialisée lorsque db/index.ts est importé.
    // L'appel explicite à initializeDatabase() est supprimé.
    logger.info('Initialisation de la base de données gérée par l\'import de db/index.ts');
    
    // Réparer les fonctions de gestion des schémas
    logger.info('Réparation des fonctions de gestion des schémas...');
    const repairResult = await repairDatabaseFunctions();
    if (repairResult) {
      logger.info('Fonctions de gestion des schémas réparées avec succès');
    } else {
      logger.warn('Problèmes lors de la réparation des fonctions de schéma - vérifiez les logs pour plus de détails');
    }
    
    // Configuration de l'authentification (doit être AVANT les middlewares de schéma)
    configureAuth(app);
    
    // Middlewares pour la gestion des schémas PostgreSQL
    app.use(resetSchemaAfterHandler); 
    app.use(schemaMiddleware); 
    
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
    server.listen(PORT, async () => {
      logger.info(`Serveur démarré sur le port ${PORT}`);
      logger.info(`Mode: ${process.env.NODE_ENV}`);
      logger.info(`Base de données: ${process.env.DATABASE_HOST || 'locale'}`);
      
      // Initialize WebSockets with error handling
      initializeWebSockets(server);
      
      // Initialize cron jobs
      initCronJobs();
      
      await checkAndCreateMissingTables();
      
      // Synchroniser les dossiers clients avec les schémas existants
      try {
        await syncClientDirectoriesWithSchemas();
        logger.info('Synchronisation des dossiers clients terminée');
      } catch (error) {
        logger.error('Erreur lors de la synchronisation des dossiers clients:', error);
      }
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

async function checkAndCreateMissingTables() {
  try {
    // Récupérer tous les schémas clients
    const schemata = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'client_%'
    `);

    const clientSchemas = schemata.rows.map(row => row.schema_name);
    
    for (const schema of clientSchemas) {
      // Vérifier si la table properties existe
      const propertiesTable = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'properties'
      `, [schema]);

      if (propertiesTable.rows.length === 0) {
        logger.info(`Table properties manquante dans le schéma ${schema}, création en cours...`);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ${schema}.properties (
            id SERIAL PRIMARY KEY,
            name text NOT NULL,
            address text NOT NULL,
            description text,
            type text NOT NULL,
            units integer DEFAULT 0,
            bedrooms integer DEFAULT 0,
            floors integer DEFAULT 0,
            bathrooms integer DEFAULT 0,
            toilets integer DEFAULT 0,
            energy_class text,
            energy_emissions text,
            living_area integer DEFAULT 0,
            land_area integer DEFAULT 0,
            has_parking boolean DEFAULT false,
            has_terrace boolean DEFAULT false,
            has_garage boolean DEFAULT false,
            has_outbuilding boolean DEFAULT false,
            has_balcony boolean DEFAULT false,
            has_elevator boolean DEFAULT false,
            has_cellar boolean DEFAULT false,
            has_garden boolean DEFAULT false,
            is_new_construction boolean DEFAULT false,
            purchase_price numeric(10,2) DEFAULT '0',
            monthly_rent numeric(10,2) DEFAULT '0',
            monthly_expenses numeric(10,2),
            loan_amount numeric(10,2) DEFAULT '0',
            monthly_loan_payment numeric(10,2) DEFAULT '0',
            loan_duration integer,
            status text DEFAULT 'available',
            construction_year integer,
            purchase_date timestamp without time zone,
            area integer,
            rooms integer DEFAULT 0,
            images jsonb DEFAULT '[]'::jsonb,
            created_at timestamp without time zone DEFAULT now() NOT NULL,
            updated_at timestamp without time zone DEFAULT now() NOT NULL
          )
        `);
        logger.info(`Table properties créée dans le schéma ${schema}`);
      }

      // Vérifier si la table tenant_history existe
      const tenantHistoryTable = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'tenant_history'
      `, [schema]);

      if (tenantHistoryTable.rows.length === 0) {
        logger.info(`Table tenant_history manquante dans le schéma ${schema}, création en cours...`);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ${schema}.tenant_history (
            id SERIAL PRIMARY KEY,
            rating integer NOT NULL,
            feedback text,
            category text DEFAULT 'general'::text,
            tenant_full_name text,
            original_user_id integer,
            event_type text DEFAULT 'evaluation'::text,
            event_severity integer DEFAULT 0,
            event_details jsonb,
            documents text[],
            bail_status text,
            bail_id integer,
            property_name text,
            created_at timestamp without time zone DEFAULT now() NOT NULL,
            created_by integer,
            tenant_id integer,
            is_orphaned boolean DEFAULT false
          )
        `);
        logger.info(`Table tenant_history créée dans le schéma ${schema}`);
      }
    }

    logger.info(`Vérification des tables terminée pour ${clientSchemas.length} schémas clients`);
  } catch (error) {
    logger.error('Erreur lors de la vérification/création des tables:', error);
  }
}

// Lancer l'application
startServer();

export default app;