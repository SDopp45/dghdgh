import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../db';
import logger from './logger';

/**
 * Répare les schémas clients en vérifiant et créant les tables manquantes
 * Particulièrement utile pour la table property_coordinates
 */
export async function repairClientSchemas(): Promise<boolean> {
  try {
    logger.info('Début de la réparation des schémas clients...');

    // Charger le script SQL de réparation
    const repairScriptPath = path.join(process.cwd(), 'scripts', 'repair-client-schemas.sql');
    let repairScript: string;
    
    try {
      repairScript = await fs.readFile(repairScriptPath, 'utf8');
    } catch (error) {
      logger.error('Erreur lors de la lecture du script de réparation:', error);
      
      // Script alternatif en ligne si le fichier n'est pas trouvé
      repairScript = `
      -- Script inline pour réparer les schémas clients
      DO $$
      DECLARE
          schema_record RECORD;
      BEGIN
          FOR schema_record IN (
              SELECT schema_name 
              FROM information_schema.schemata 
              WHERE schema_name LIKE 'client_%'
          ) LOOP
              -- Vérifier si la table property_coordinates existe dans ce schéma
              IF NOT EXISTS (
                  SELECT 1 
                  FROM information_schema.tables 
                  WHERE table_schema = schema_record.schema_name 
                  AND table_name = 'property_coordinates'
              ) THEN
                  -- Créer la table property_coordinates
                  EXECUTE format('
                      CREATE TABLE %I.property_coordinates (
                          id serial PRIMARY KEY,
                          property_id integer NOT NULL,
                          latitude numeric,
                          longitude numeric,
                          created_at timestamp without time zone DEFAULT now() NOT NULL,
                          updated_at timestamp without time zone DEFAULT now() NOT NULL
                      )', schema_record.schema_name);
                      
                  RAISE NOTICE 'Table property_coordinates créée dans le schéma %', schema_record.schema_name;
              END IF;
          END LOOP;
      END
      $$;`;
    }

    // Exécuter le script SQL
    logger.info('Exécution du script de réparation des schémas...');
    await pool.query(repairScript);
    
    logger.info('Réparation des schémas terminée avec succès');
    return true;
  } catch (error) {
    logger.error('Erreur lors de la réparation des schémas:', error);
    return false;
  }
}

// Fonction pour initialiser les nouveaux schémas client avec les tables nécessaires
export async function initializeClientSchema(userId: number): Promise<boolean> {
  try {
    logger.info(`Initialisation du schéma client_${userId}...`);
    
    // Charger le script SQL de clonage du template
    const cloneScriptPath = path.join(process.cwd(), 'scripts', 'clone-template-tables.sql');
    let cloneScript: string;
    
    try {
      cloneScript = await fs.readFile(cloneScriptPath, 'utf8');
      // Exécuter le script pour installer les fonctions
      await pool.query(cloneScript);
    } catch (error) {
      logger.error('Erreur lors de la lecture ou exécution du script de clonage:', error);
      return false;
    }
    
    // Exécuter la fonction create_client_schema avec l'ID utilisateur
    logger.info(`Création du schéma client_${userId} et clonage des tables...`);
    await pool.query('SELECT public.create_client_schema($1)', [userId]);
    
    logger.info(`Schéma client_${userId} initialisé avec succès`);
    return true;
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation du schéma client_${userId}:`, error);
    return false;
  }
} 