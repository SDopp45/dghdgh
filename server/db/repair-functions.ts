import { dbPool } from './index';
import logger from '../utils/logger';

/**
 * Script de réparation des fonctions de base de données
 * Supprime et recrée les fonctions nécessaires pour la gestion des schémas
 */
export async function repairDatabaseFunctions() {
  try {
    logger.info('Début de la réparation des fonctions de base de données...');
    
    // 1. Supprimer toutes les fonctions existantes pour éviter les conflits
    logger.info('Suppression des fonctions existantes...');
    try {
      await dbPool.query(`DROP FUNCTION IF EXISTS public.setup_user_environment(integer)`);
      await dbPool.query(`DROP FUNCTION IF EXISTS public.create_client_schema(integer)`);
      logger.info('Fonctions supprimées avec succès');
    } catch (error) {
      logger.error('Erreur lors de la suppression des fonctions:', error);
    }
    
    // 2. Créer la fonction setup_user_environment
    logger.info('Création de la fonction setup_user_environment...');
    const setupEnvironmentSQL = `
    CREATE OR REPLACE FUNCTION public.setup_user_environment(p_user_id integer)
    RETURNS void AS
    $$
    DECLARE
        schema_name text := 'client_' || p_user_id;
    BEGIN
        -- Vérifier si le schéma existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
            -- Créer le schéma s'il n'existe pas
            EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
            RAISE NOTICE 'Schéma % créé', schema_name;
        END IF;
        
        -- Configurer le chemin de recherche des schémas pour la session actuelle
        EXECUTE format('SET search_path TO %I, public', schema_name);
        RAISE NOTICE 'Search path configuré à %', schema_name;

        -- Configurer les autorisations
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO current_user', schema_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO current_user', schema_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO current_user', schema_name);
        
        RETURN;
    END;
    $$
    LANGUAGE plpgsql;
    `;
    
    try {
      await dbPool.query(setupEnvironmentSQL);
      logger.info('Fonction setup_user_environment créée avec succès');
    } catch (error) {
      logger.error('Erreur lors de la création de setup_user_environment:', error);
    }
    
    // 3. Créer la fonction create_client_schema
    logger.info('Création de la fonction create_client_schema...');
    const createSchemaSQL = `
    CREATE OR REPLACE FUNCTION public.create_client_schema(p_user_id integer)
    RETURNS boolean AS
    $$
    DECLARE
        schema_name text := 'client_' || p_user_id;
    BEGIN
        -- Vérifier si le schéma existe déjà
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
            RAISE NOTICE 'Le schéma % existe déjà', schema_name;
            RETURN true;
        END IF;
        
        -- Créer le schéma
        BEGIN
            EXECUTE format('CREATE SCHEMA %I', schema_name);
            RAISE NOTICE 'Schéma % créé avec succès', schema_name;
            
            -- Configurer les autorisations
            EXECUTE format('GRANT USAGE ON SCHEMA %I TO current_user', schema_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO current_user', schema_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO current_user', schema_name);
            
            RETURN true;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erreur lors de la création du schéma %: %', schema_name, SQLERRM;
            RETURN false;
        END;
    END;
    $$
    LANGUAGE plpgsql;
    `;
    
    try {
      await dbPool.query(createSchemaSQL);
      logger.info('Fonction create_client_schema créée avec succès');
    } catch (error) {
      logger.error('Erreur lors de la création de create_client_schema:', error);
    }
    
    // 4. Vérifier que les fonctions ont été créées correctement
    const checkResult = await dbPool.query(`
      SELECT proname
      FROM pg_proc 
      WHERE proname IN ('setup_user_environment', 'create_client_schema')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);
    
    if (checkResult.rowCount === 2) {
      logger.info('Réparation réussie ! Les deux fonctions ont été correctement créées.');
      return true;
    } else {
      const functionsFound = checkResult.rows.map(row => row.proname).join(', ');
      logger.warn(`Réparation partielle. Fonctions trouvées: ${functionsFound}`);
      return false;
    }
    
  } catch (error) {
    logger.error('Erreur lors de la réparation des fonctions:', error);
    return false;
  }
} 