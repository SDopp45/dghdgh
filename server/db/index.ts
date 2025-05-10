import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';
import logger from '../utils/logger';
import * as schema from '@shared/schema';
import fs from 'fs';
import path from 'path';

let dbPool: Pool;
let db: ReturnType<typeof drizzle>;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

logger.info(`Initializing database connection with URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

try {
  const poolInstance = new Pool({
    connectionString: process.env.DATABASE_URL,
    query_timeout: 30000,
    connectionTimeoutMillis: 10000,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false
  });

  poolInstance.on('connect', async (client) => {
    logger.info('New client connected to PostgreSQL database');
    // Par défaut, utiliser le schéma public au niveau de la connexion initiale du pool
    // Le search_path sera ajusté dynamiquement par setUserSchema ou resetToPublicSchema
    await client.query('SET search_path TO public');
  });

  poolInstance.on('error', (err, client) => {
    logger.error('PostgreSQL pool error:', err);
    if (err && typeof err === 'object' && 'fatal' in err && (err as any).fatal === true) {
      logger.error('Fatal database connection error - attempting recovery');
    }
  });

  poolInstance.query('SELECT NOW()').then(() => {
    logger.info('✅ PostgreSQL connection verified successfully');
  }).catch(err => {
    logger.error('❌ Failed to verify PostgreSQL connection:', err);
  });

  dbPool = poolInstance;
  db = drizzle(poolInstance, { schema }); // 'schema' ici fait référence aux définitions Drizzle, pas aux schémas PG en tant que tels pour les requêtes directes.
  
} catch (error) {
  logger.error('Failed to initialize database connection:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Database connection failed: ${errorMessage}`);
}

/**
 * Définit le search_path pour un utilisateur spécifique.
 * Les administrateurs utilisent 'public, admin_views'.
 * Les clients utilisent 'client_X, public'.
 * @param userId ID de l'utilisateur
 * @returns Le nom du schéma principal défini (ou 'public' pour admin)
 */
async function setUserSchema(userId: number): Promise<string> {
  try {
    // Vérifier si l'utilisateur existe et récupérer son rôle
    // Il est crucial que la table 'users' soit accessible, donc dans le schéma 'public' par défaut ou via un search_path qui l'inclut.
    const userResult = await dbPool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
    if (!userResult.rows.length) {
      throw new Error(`Utilisateur ${userId} non trouvé`);
    }

    const user = userResult.rows[0];
    let effectiveSearchPath: string;
    let primarySchema: string;

    if (user.role === 'admin') {
      // Les administrateurs ont accès à 'public' et 'admin_views'
      // 'admin_views' doit être créé dans votre DB pour que ceci fonctionne
      effectiveSearchPath = 'public, admin_views'; 
      primarySchema = 'public';
      // Pour les admins, on peut aussi simplement utiliser le search_path par défaut du rôle admin s'il est configuré en DB.
      // Ou explicitement le positionner :
      await dbPool.query(`SET search_path TO ${effectiveSearchPath}`);
    } else {
      // Les clients utilisent leur schéma dédié et public
      primarySchema = `client_${userId}`;
      // S'assurer que le schéma client existe avant de tenter de le définir.
      // createClientSchema devrait être appelé à l'inscription pour garantir son existence.
      effectiveSearchPath = `${primarySchema}, public`;
      await dbPool.query(`SET search_path TO ${effectiveSearchPath}`);
      
      // Vérifier si la table property_coordinates existe dans ce schéma
      await ensurePropertyCoordinatesTable(primarySchema);
    }

    logger.info(`Search_path défini à "${effectiveSearchPath}" pour l'utilisateur ${userId} (rôle: ${user.role})`);
    return primarySchema;
  } catch (error) {
    logger.error(`Erreur lors de la définition du search_path pour l'utilisateur ${userId}:`, error);
    // En cas d'erreur, réinitialiser au schéma public pour éviter des états inconsistants
    await resetToPublicSchema();
    throw error;
  }
}

/**
 * Vérifie si la table property_coordinates existe dans le schéma spécifié
 * et la crée si elle n'existe pas
 */
async function ensurePropertyCoordinatesTable(schemaName: string): Promise<void> {
  try {
    // Vérifier si la table existe
    const tableExists = await dbPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = 'property_coordinates'
      )
    `, [schemaName]);
    
    if (!tableExists.rows[0].exists) {
      logger.info(`Table property_coordinates manquante dans le schéma ${schemaName}. Création en cours...`);
      
      // Créer la table property_coordinates
      await dbPool.query(`
        CREATE TABLE ${schemaName}.property_coordinates (
          id serial PRIMARY KEY,
          property_id integer NOT NULL,
          latitude numeric,
          longitude numeric,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL
        )
      `);
      
      logger.info(`Table property_coordinates créée dans le schéma ${schemaName}`);
    }
  } catch (error) {
    logger.error(`Erreur lors de la vérification/création de la table property_coordinates dans le schéma ${schemaName}:`, error);
  }
}

/**
 * Réinitialise le search_path à 'public'.
 * Typiquement utilisé à la déconnexion ou pour les accès anonymes.
 */
async function resetToPublicSchema(): Promise<void> {
      try {
    await dbPool.query('SET search_path TO public');
    logger.info('Search_path réinitialisé à "public"');
  } catch (error) {
    logger.error('Erreur lors de la réinitialisation du search_path:', error);
    throw error;
      }
    }
    
/**
 * Appelle la fonction PostgreSQL pour créer un nouveau schéma client et ses tables.
 * @param userId ID de l'utilisateur pour qui créer le schéma (ex: client_X)
 */
async function createClientSchema(userId: number): Promise<void> {
  try {
    const schemaName = `client_${userId}`;
    
    // Vérifier si le schéma existe déjà avec une requête SQL directe
    const schemaExists = await dbPool.query(
      'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
      [schemaName]
    );
    
    if (schemaExists.rowCount && schemaExists.rowCount > 0) {
      logger.info(`Le schéma ${schemaName} existe déjà`);
      return;
    }
    
    // Créer le schéma manuellement au lieu d'utiliser la fonction PostgreSQL
    await dbPool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    logger.info(`Schéma ${schemaName} créé avec succès`);
    
    // Configurer les autorisations
    await dbPool.query(`GRANT USAGE ON SCHEMA "${schemaName}" TO current_user`);
    await dbPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}" GRANT ALL PRIVILEGES ON TABLES TO current_user`);
    await dbPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}" GRANT ALL PRIVILEGES ON SEQUENCES TO current_user`);
    
    // Cloner le schéma template dans le nouveau schéma client
    try {
      await dbPool.query(`SELECT public.clone_schema('template', $1)`, [schemaName]);
      logger.info(`Tables et séquences copiées depuis template vers ${schemaName}`);
    } catch (cloneError) {
      logger.error(`Erreur lors du clonage des tables depuis template vers ${schemaName}:`, cloneError);
      // Continuer malgré l'erreur de clonage
    }
    
    // Créer explicitement les tables essentielles si elles n'existent pas après le clonage
    try {
      // Vérifier si la table link_profiles existe
      const linkProfilesExist = await dbPool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'link_profiles'`,
        [schemaName]
      );
      
      if (!linkProfilesExist.rowCount || linkProfilesExist.rowCount === 0) {
        logger.info(`Table link_profiles manquante dans le schéma ${schemaName}. Création en cours...`);
        
        // Créer la séquence pour l'ID auto-incrémenté
        await dbPool.query(`
          CREATE SEQUENCE IF NOT EXISTS "${schemaName}"."link_profiles_id_seq"
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;
        `);
        
        // Créer la table link_profiles
        await dbPool.query(`
          CREATE TABLE "${schemaName}"."link_profiles" (
            id integer DEFAULT nextval('"${schemaName}"."link_profiles_id_seq"'::regclass) NOT NULL,
            user_id integer NOT NULL,
            slug character varying(100) NOT NULL,
            title character varying(100) NOT NULL,
            description text,
            background_color character varying(20) DEFAULT '#ffffff'::character varying,
            text_color character varying(20) DEFAULT '#000000'::character varying,
            accent_color character varying(20) DEFAULT '#70C7BA'::character varying,
            logo_url text,
            views integer DEFAULT 0,
            background_image text,
            background_pattern text,
            button_style character varying(20) DEFAULT 'rounded'::character varying,
            button_radius integer DEFAULT 8,
            font_family character varying(50) DEFAULT 'Inter'::character varying,
            animation character varying(30) DEFAULT 'fade'::character varying,
            custom_css text,
            custom_theme jsonb,
            background_saturation integer DEFAULT 100,
            background_hue_rotate integer DEFAULT 0,
            background_sepia integer DEFAULT 0,
            background_grayscale integer DEFAULT 0,
            background_invert integer DEFAULT 0,
            background_color_filter character varying(20),
            background_color_filter_opacity real DEFAULT 0.3,
            created_at timestamp without time zone DEFAULT now(),
            updated_at timestamp without time zone DEFAULT now(),
            is_paused boolean DEFAULT false,
            CONSTRAINT link_profiles_pkey PRIMARY KEY (id),
            CONSTRAINT link_profiles_slug_key UNIQUE (slug)
          );
        `);
        
        // Créer la séquence pour les liens
        await dbPool.query(`
          CREATE SEQUENCE IF NOT EXISTS "${schemaName}"."links_id_seq"
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;
        `);
        
        // Créer la table links
        await dbPool.query(`
          CREATE TABLE "${schemaName}"."links" (
            id integer DEFAULT nextval('"${schemaName}"."links_id_seq"'::regclass) NOT NULL,
            profile_id integer NOT NULL,
            title character varying(100) NOT NULL,
            url text NOT NULL,
            icon character varying(50),
            enabled boolean DEFAULT true,
            clicks integer DEFAULT 0,
            "position" integer DEFAULT 0,
            featured boolean DEFAULT false,
            custom_color character varying(20),
            custom_text_color character varying(20),
            animation character varying(30),
            type character varying(20) DEFAULT 'link'::character varying,
            form_definition jsonb,
            created_at timestamp without time zone DEFAULT now(),
            updated_at timestamp without time zone DEFAULT now(),
            button_style character varying(20),
            user_id integer,
            CONSTRAINT links_pkey PRIMARY KEY (id)
          );
        `);
        
        logger.info(`Tables link_profiles et links créées avec succès dans le schéma ${schemaName}`);
      }
      
      // Vérifier aussi la table form_submissions
      const formSubmissionsExist = await dbPool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'form_submissions'`,
        [schemaName]
      );
      
      if (!formSubmissionsExist.rowCount || formSubmissionsExist.rowCount === 0) {
        logger.info(`Table form_submissions manquante dans le schéma ${schemaName}. Création en cours...`);
        
        // Créer la séquence pour form_submissions
        await dbPool.query(`
          CREATE SEQUENCE IF NOT EXISTS "${schemaName}"."form_submissions_id_seq"
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;
        `);
        
        // Créer la table form_submissions
        await dbPool.query(`
          CREATE TABLE "${schemaName}"."form_submissions" (
            id integer DEFAULT nextval('"${schemaName}"."form_submissions_id_seq"'::regclass) NOT NULL,
            link_id integer NOT NULL,
            form_data jsonb NOT NULL,
            ip_address text,
            user_agent text,
            created_at timestamp without time zone DEFAULT now() NOT NULL,
            CONSTRAINT form_submissions_pkey PRIMARY KEY (id)
          );
        `);
        
        logger.info(`Table form_submissions créée avec succès dans le schéma ${schemaName}`);
      }
      
      // Vérifier la table form_responses
      const formResponsesExist = await dbPool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'form_responses'`,
        [schemaName]
      );
      
      if (!formResponsesExist.rowCount || formResponsesExist.rowCount === 0) {
        logger.info(`Table form_responses manquante dans le schéma ${schemaName}. Création en cours...`);
        
        // Créer la séquence pour form_responses
        await dbPool.query(`
          CREATE SEQUENCE IF NOT EXISTS "${schemaName}"."form_responses_id_seq"
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;
        `);
        
        // Créer la table form_responses
        await dbPool.query(`
          CREATE TABLE "${schemaName}"."form_responses" (
            id integer DEFAULT nextval('"${schemaName}"."form_responses_id_seq"'::regclass) NOT NULL,
            form_id integer,
            data jsonb NOT NULL,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            ip_address text,
            CONSTRAINT form_responses_pkey PRIMARY KEY (id)
          );
        `);
        
        logger.info(`Table form_responses créée avec succès dans le schéma ${schemaName}`);
      }
      
      // Vérifier la table form_fields
      const formFieldsExist = await dbPool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'form_fields'`,
        [schemaName]
      );
      
      if (!formFieldsExist.rowCount || formFieldsExist.rowCount === 0) {
        logger.info(`Table form_fields manquante dans le schéma ${schemaName}. Création en cours...`);
        
        // Créer la séquence pour form_fields
        await dbPool.query(`
          CREATE SEQUENCE IF NOT EXISTS "${schemaName}"."form_fields_id_seq"
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;
        `);
        
        // Créer la table form_fields
        await dbPool.query(`
          CREATE TABLE "${schemaName}"."form_fields" (
            id integer DEFAULT nextval('"${schemaName}"."form_fields_id_seq"'::regclass) NOT NULL,
            link_id integer NOT NULL,
            field_id character varying(50) NOT NULL,
            type character varying(20) NOT NULL,
            label character varying(255) NOT NULL,
            required boolean DEFAULT false,
            "position" integer DEFAULT 0,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            user_id integer,
            CONSTRAINT form_fields_pkey PRIMARY KEY (id),
            CONSTRAINT form_fields_type_check CHECK (((type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'email'::character varying, 'number'::character varying, 'checkbox'::character varying, 'select'::character varying])::text[])))
          );
        `);
        
        logger.info(`Table form_fields créée avec succès dans le schéma ${schemaName}`);
      }
      
      // Vérifier la table form_field_options
      const formFieldOptionsExist = await dbPool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'form_field_options'`,
        [schemaName]
      );
      
      if (!formFieldOptionsExist.rowCount || formFieldOptionsExist.rowCount === 0) {
        logger.info(`Table form_field_options manquante dans le schéma ${schemaName}. Création en cours...`);
        
        // Créer la séquence pour form_field_options
        await dbPool.query(`
          CREATE SEQUENCE IF NOT EXISTS "${schemaName}"."form_field_options_id_seq"
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;
        `);
        
        // Créer la table form_field_options
        await dbPool.query(`
          CREATE TABLE "${schemaName}"."form_field_options" (
            id integer DEFAULT nextval('"${schemaName}"."form_field_options_id_seq"'::regclass) NOT NULL,
            form_field_id integer NOT NULL,
            value character varying(255) NOT NULL,
            "position" integer DEFAULT 0,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT form_field_options_pkey PRIMARY KEY (id)
          );
        `);
        
        logger.info(`Table form_field_options créée avec succès dans le schéma ${schemaName}`);
      }
      
      // Créer les dossiers pour les uploads des clients
      try {
        await ensureClientDirectories(userId);
        logger.info(`Dossiers d'uploads créés pour l'utilisateur ${userId}`);
      } catch (dirError) {
        logger.error(`Erreur lors de la création des dossiers d'uploads pour l'utilisateur ${userId}:`, dirError);
      }
      
    } catch (tableError) {
      logger.error(`Erreur lors de la création des tables essentielles dans le schéma ${schemaName}:`, tableError);
    }
    
    logger.info(`Schéma client_${userId} créé avec succès`);
  } catch (error) {
    logger.error(`Erreur lors de la création du schéma pour l'utilisateur ${userId}:`, error);
    throw error;
  }
}

// Fonction pour créer les répertoires d'uploads pour un client
async function ensureClientDirectories(userId: number): Promise<void> {
  try {
    const clientSubPath = `uploads/client_${userId}`;
    const baseDir = path.join(process.cwd(), clientSubPath);
    
    // Créer le répertoire principal du client s'il n'existe pas
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      logger.info(`Répertoire principal créé pour client_${userId}: ${baseDir}`);
    }
    
    // Créer les sous-répertoires nécessaires
    const subDirs = ['logos', 'backgrounds', 'link-images', 'documents', 'photos'];
    
    for (const dir of subDirs) {
      const fullPath = path.join(baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        logger.info(`Sous-répertoire ${dir} créé pour client_${userId}: ${fullPath}`);
      }
    }
  } catch (error) {
    logger.error(`Erreur lors de la création des répertoires pour l'utilisateur ${userId}:`, error);
    throw error;
  }
}

// Fonction pour obtenir un client Drizzle pour un schéma spécifique
async function getClientDb(userId: number) {
  try {
    // Vérifier si l'utilisateur existe et son rôle
    const userResult = await dbPool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
    if (!userResult.rows.length) {
      throw new Error(`Utilisateur ${userId} non trouvé`);
    }

    const user = userResult.rows[0];
    const schemaName = user.role === 'admin' ? 'public' : `client_${userId}`;
    
    // Plutôt que de créer une nouvelle connexion pour chaque requête,
    // nous définissons simplement le search_path pour la connexion existante
    // Ce qui est plus efficace et évite les réinitialisations constantes
    await dbPool.query(`SET search_path TO ${schemaName}, public`);
    
    logger.info(`Search_path défini à "${schemaName}, public" pour l'utilisateur ${userId}`);
    
    // Retourner la même instance Drizzle avec le search_path mis à jour
    return {
      db: db,
      // La méthode release est maintenant un no-op pour éviter de réinitialiser le search_path
      release: () => {
        // Ne pas faire de reset ici
        logger.info(`Gardé search_path à "${schemaName}, public" pour l'utilisateur ${userId}`);
      }
    };
  } catch (error) {
    logger.error(`Erreur lors de la création d'un client DB pour l'utilisateur ${userId}:`, error);
    throw error;
  }
}

// Garder uniquement les exports à la fin
export {
  db,
  dbPool as pool,
  setUserSchema,
  resetToPublicSchema,
  createClientSchema,
  ensurePropertyCoordinatesTable,
  ensureClientDirectories,
  getClientDb
}; 