import { sql } from 'drizzle-orm';
import logger from './logger';

/**
 * Vérifie et crée les tables nécessaires dans un schéma client
 * 
 * @param clientSchema Nom du schéma client (ex: 'client_109')
 * @param db Instance de base de données
 * @returns true si réussi, false sinon
 */
export async function ensureTablesExist(clientSchema: string, db: any) {
  try {
    logger.info(`Vérification des tables dans le schéma ${clientSchema}`);
    
    // Vérifier si le schéma existe, sinon le créer
    await db.execute(
      sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(clientSchema)}`
    );
    
    // Vérifier si les tables existent
    const checkTablesQuery = await db.execute(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = ${clientSchema}`
    );
    
    const existingTables = checkTablesQuery.rows.map((row: any) => row.tablename as string);
    logger.info(`Tables existantes dans ${clientSchema}: ${existingTables.join(', ') || 'aucune'}`);
    
    // Créer les tables si elles n'existent pas
    if (!existingTables.includes('link_profiles')) {
      logger.info(`Création de la table link_profiles dans ${clientSchema}`);
      await db.execute(
        sql`CREATE TABLE ${sql.identifier(clientSchema)}."link_profiles" (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          slug VARCHAR(100) NOT NULL,
          title VARCHAR(100) NOT NULL,
          description TEXT,
          background_color VARCHAR(20) DEFAULT '#ffffff',
          text_color VARCHAR(20) DEFAULT '#000000',
          accent_color VARCHAR(20) DEFAULT '#70C7BA',
          logo_url TEXT,
          views INTEGER DEFAULT 0,
          background_image TEXT,
          background_pattern TEXT,
          button_style VARCHAR(20) DEFAULT 'rounded',
          button_radius INTEGER DEFAULT 8,
          font_family VARCHAR(50) DEFAULT 'Inter',
          animation VARCHAR(30) DEFAULT 'fade',
          custom_css TEXT,
          custom_theme JSONB,
          background_saturation INTEGER DEFAULT 100,
          background_hue_rotate INTEGER DEFAULT 0,
          background_sepia INTEGER DEFAULT 0,
          background_grayscale INTEGER DEFAULT 0,
          background_invert INTEGER DEFAULT 0,
          background_color_filter VARCHAR(20),
          background_color_filter_opacity REAL DEFAULT 0.3,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          is_paused BOOLEAN DEFAULT false
        )`
      );
    }
    
    if (!existingTables.includes('links')) {
      logger.info(`Création de la table links dans ${clientSchema}`);
      await db.execute(
        sql`CREATE TABLE ${sql.identifier(clientSchema)}."links" (
          id SERIAL PRIMARY KEY,
          profile_id INTEGER NOT NULL,
          title VARCHAR(100) NOT NULL,
          url TEXT NOT NULL,
          icon VARCHAR(255),
          enabled BOOLEAN DEFAULT true,
          clicks INTEGER DEFAULT 0,
          position INTEGER DEFAULT 0,
          featured BOOLEAN DEFAULT false,
          custom_color VARCHAR(20),
          custom_text_color VARCHAR(20),
          animation VARCHAR(30),
          type VARCHAR(20) DEFAULT 'link',
          form_definition JSONB,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          button_style VARCHAR(20),
          user_id INTEGER
        )`
      );
    }
    
    if (!existingTables.includes('forms')) {
      logger.info(`Création de la table forms dans ${clientSchema}`);
      await db.execute(
        sql`CREATE TABLE ${sql.identifier(clientSchema)}."forms" (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          title VARCHAR(100) NOT NULL,
          description TEXT,
          fields JSONB NOT NULL,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )`
      );
    }
    
    // Vérifier si form_responses existe, sinon le créer
    if (!existingTables.includes('form_responses')) {
      logger.info(`Création de la table form_responses dans ${clientSchema}`);
      
      await db.execute(
        sql`CREATE TABLE ${sql.identifier(clientSchema)}."form_responses" (
          id SERIAL PRIMARY KEY,
          link_id INTEGER,
          form_id INTEGER REFERENCES ${sql.identifier(clientSchema)}."forms"(id) ON DELETE CASCADE,
          response_data JSONB NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )`
      );
    } else {
      // Vérifier si la table form_responses a les bonnes colonnes
      const columnsQuery = await db.execute(
        sql`SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = ${clientSchema} 
            AND table_name = 'form_responses'`
      );
      
      const columns = columnsQuery.rows.map((row: any) => row.column_name as string);
      
      // Si link_id n'existe pas, l'ajouter
      if (!columns.includes('link_id')) {
        logger.info(`Ajout de la colonne link_id à la table form_responses dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_responses" 
              ADD COLUMN link_id INTEGER`
        );
      }
      
      // Si form_id n'existe pas, l'ajouter
      if (!columns.includes('form_id')) {
        logger.info(`Ajout de la colonne form_id à la table form_responses dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_responses" 
              ADD COLUMN form_id INTEGER`
        );
      }
      
      // Si response_data n'existe pas mais data existe, renommer data en response_data
      if (!columns.includes('response_data') && columns.includes('data')) {
        logger.info(`Renommage de la colonne data en response_data dans la table form_responses dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_responses" 
              RENAME COLUMN data TO response_data`
        );
      }
      
      // Si ni response_data ni data n'existent mais form_data existe, renommer form_data en response_data
      if (!columns.includes('response_data') && !columns.includes('data') && columns.includes('form_data')) {
        logger.info(`Renommage de la colonne form_data en response_data dans la table form_responses dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_responses" 
              RENAME COLUMN form_data TO response_data`
        );
      }
      
      // Si ni response_data, ni data, ni form_data n'existent, créer response_data
      if (!columns.includes('response_data') && !columns.includes('data') && !columns.includes('form_data')) {
        logger.info(`Ajout de la colonne response_data à la table form_responses dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_responses" 
              ADD COLUMN response_data JSONB DEFAULT '{}'::jsonb NOT NULL`
        );
      }
    }
    
    // Vérifier si link_forms existe, sinon le créer
    if (!existingTables.includes('link_forms')) {
      logger.info(`Création de la table link_forms dans ${clientSchema}`);
      await db.execute(
        sql`CREATE TABLE ${sql.identifier(clientSchema)}."link_forms" (
          id SERIAL PRIMARY KEY,
          link_id INTEGER NOT NULL,
          form_id INTEGER NOT NULL REFERENCES ${sql.identifier(clientSchema)}."forms"(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )`
      );
    }
    
    // Vérifier si form_submissions existe, sinon le créer
    if (!existingTables.includes('form_submissions')) {
      logger.info(`Création de la table form_submissions dans ${clientSchema}`);
      await db.execute(
        sql`CREATE TABLE ${sql.identifier(clientSchema)}."form_submissions" (
          id SERIAL PRIMARY KEY,
          link_id INTEGER,
          form_id INTEGER,
          form_data JSONB NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )`
      );
    } else {
      // Vérifier si la table form_submissions a les bonnes colonnes
      const submissionsColumnsQuery = await db.execute(
        sql`SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = ${clientSchema} 
            AND table_name = 'form_submissions'`
      );
      
      const submissionsColumns = submissionsColumnsQuery.rows.map((row: any) => row.column_name as string);
      
      // Si form_id n'existe pas, l'ajouter
      if (!submissionsColumns.includes('form_id')) {
        logger.info(`Ajout de la colonne form_id à la table form_submissions dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_submissions" 
              ADD COLUMN form_id INTEGER`
        );
      }
    }
    
    // Ajouter ou vérifier les contraintes de clé étrangère
    logger.info(`Vérification et ajout des contraintes de clé étrangère dans ${clientSchema}`);
    
    try {
      // Vérifier si les contraintes existent déjà
      const constraintsQuery = await db.execute(
        sql`SELECT constraint_name FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY' 
            AND table_schema = ${clientSchema}`
      );
      
      const existingConstraints = constraintsQuery.rows.map((row: any) => row.constraint_name as string);
      
      // Ajouter les contraintes manquantes
      if (!existingConstraints.includes('fk_form_responses_form')) {
        logger.info(`Ajout de la contrainte fk_form_responses_form dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_responses"
              ADD CONSTRAINT fk_form_responses_form
              FOREIGN KEY (form_id) REFERENCES ${sql.identifier(clientSchema)}."forms"(id) ON DELETE CASCADE`
        );
      }
      
      if (!existingConstraints.includes('fk_form_responses_link')) {
        logger.info(`Ajout de la contrainte fk_form_responses_link dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_responses"
              ADD CONSTRAINT fk_form_responses_link
              FOREIGN KEY (link_id) REFERENCES ${sql.identifier(clientSchema)}."links"(id) ON DELETE SET NULL`
        );
      }
      
      if (!existingConstraints.includes('fk_form_submissions_link')) {
        logger.info(`Ajout de la contrainte fk_form_submissions_link dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_submissions"
              ADD CONSTRAINT fk_form_submissions_link
              FOREIGN KEY (link_id) REFERENCES ${sql.identifier(clientSchema)}."links"(id) ON DELETE CASCADE`
        );
      }
      
      if (!existingConstraints.includes('fk_form_submissions_form')) {
        logger.info(`Ajout de la contrainte fk_form_submissions_form dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."form_submissions"
              ADD CONSTRAINT fk_form_submissions_form
              FOREIGN KEY (form_id) REFERENCES ${sql.identifier(clientSchema)}."forms"(id) ON DELETE SET NULL`
        );
      }
      
      if (!existingConstraints.includes('fk_link_forms_link')) {
        logger.info(`Ajout de la contrainte fk_link_forms_link dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."link_forms"
              ADD CONSTRAINT fk_link_forms_link
              FOREIGN KEY (link_id) REFERENCES ${sql.identifier(clientSchema)}."links"(id) ON DELETE CASCADE`
        );
      }
      
      if (!existingConstraints.includes('fk_link_forms_form')) {
        logger.info(`Ajout de la contrainte fk_link_forms_form dans ${clientSchema}`);
        await db.execute(
          sql`ALTER TABLE ${sql.identifier(clientSchema)}."link_forms"
              ADD CONSTRAINT fk_link_forms_form
              FOREIGN KEY (form_id) REFERENCES ${sql.identifier(clientSchema)}."forms"(id) ON DELETE CASCADE`
        );
      }
      
      logger.info(`Contraintes de clé étrangère vérifiées et ajoutées dans ${clientSchema}`);
    } catch (error) {
      logger.warn(`Erreur lors de l'ajout des contraintes dans ${clientSchema}:`, error);
      // Ne pas interrompre en cas d'erreur dans les contraintes
    }
    
    logger.info(`Vérification et création des tables terminées pour le schéma ${clientSchema}`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la vérification/création des tables dans ${clientSchema}:`, error);
    return false;
  }
}

/**
 * Vérifie si un slug de profil existe dans les schémas clients
 * 
 * @param slug Slug du profil à vérifier
 * @param db Instance de base de données
 * @returns Un objet contenant le schéma client, l'ID utilisateur et l'ID de profil si trouvé
 */
export async function findProfileBySlug(slug: string, db: any) {
  try {
    // Récupérer tous les schémas clients
    const schemas = await db.execute(
      sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'client_%'`
    );
    
    // Parcourir les schémas pour trouver le profil
    for (const row of schemas.rows) {
      const schema = row.schema_name as string;
      const profileCheck = await db.execute(
        sql`SELECT lp.id, lp.user_id FROM ${sql.identifier(schema)}.link_profiles lp WHERE lp.slug = ${slug} LIMIT 1`
      );
      
      if (profileCheck.rowCount && profileCheck.rowCount > 0) {
        return {
          schema,
          userId: profileCheck.rows[0].user_id,
          profileId: profileCheck.rows[0].id,
          found: true
        };
      }
    }
    
    return { found: false };
  } catch (error) {
    logger.error('Error finding profile by slug:', error);
    return { found: false, error };
  }
}

/**
 * Vérifie si un formulaire existe dans un schéma client
 * 
 * @param formId ID du formulaire à vérifier
 * @param clientSchema Schéma client
 * @param db Instance de base de données
 * @returns Un objet avec les infos du formulaire si trouvé
 */
export async function findFormById(formId: number | string, clientSchema: string, db: any) {
  try {
    const formCheck = await db.execute(
      sql`SELECT * FROM ${sql.identifier(clientSchema)}.forms WHERE id = ${parseInt(String(formId))} LIMIT 1`
    );
    
    if (formCheck.rowCount && formCheck.rowCount > 0) {
      return {
        found: true,
        form: formCheck.rows[0]
      };
    }
    
    return { found: false };
  } catch (error) {
    logger.error(`Error finding form by ID ${formId} in schema ${clientSchema}:`, error);
    return { found: false, error };
  }
} 