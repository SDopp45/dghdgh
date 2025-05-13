/**
 * Script de diagnostic et de réparation des données de stockage
 * Ce script va vérifier et corriger les problèmes dans les données de stockage
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { calculateDirectorySize } from '../utils/calculate-uploads-size.js';

// Pour utiliser __dirname dans un module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getUserIds() {
  try {
    const result = await db.execute(sql`
      SELECT id FROM public.users WHERE role = 'client'
    `);
    return result.rows.map(row => Number(row.id));
  } catch (error) {
    logger.error('Erreur lors de la récupération des IDs utilisateurs:', error);
    return [];
  }
}

async function getClientSchemas() {
  try {
    const result = await db.execute(sql`
      SELECT nspname FROM pg_namespace WHERE nspname LIKE 'client_%'
    `);
    return result.rows.map(row => row.nspname);
  } catch (error) {
    logger.error('Erreur lors de la récupération des schémas client:', error);
    return [];
  }
}

async function checkAndCreateStorageManagementTable(schemaName) {
  try {
    // Vérifier si la table existe
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = ${schemaName} 
        AND table_name = 'storage_management'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      logger.info(`Table storage_management manquante dans le schéma ${schemaName}. Création en cours...`);
      
      // Créer la table storage_management
      await db.execute(sql`
        CREATE TABLE ${sql.identifier(schemaName)}.storage_management (
          id serial PRIMARY KEY,
          user_id integer NOT NULL UNIQUE,
          total_used bigint DEFAULT 0,
          storage_categories jsonb DEFAULT '{}'::jsonb,
          last_calculation timestamp DEFAULT NOW(),
          cleanup_history jsonb DEFAULT '[]'::jsonb,
          created_at timestamp DEFAULT NOW(),
          updated_at timestamp DEFAULT NOW()
        )
      `);
      
      // Extraire l'ID utilisateur du nom du schéma
      const userId = schemaName.replace('client_', '');
      
      // Insérer l'entrée initiale
      await db.execute(sql`
        INSERT INTO ${sql.identifier(schemaName)}.storage_management 
        (user_id, created_at, updated_at)
        VALUES (${userId}, NOW(), NOW())
      `);
      
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`Erreur lors de la vérification/création de la table storage_management dans ${schemaName}:`, error);
    return false;
  }
}

async function updateStorageCategories(schemaName, userId) {
  try {
    // Vérifier si le répertoire uploads existe pour ce client
    const clientDir = `client_${userId}`;
    const uploadsPath = path.join(process.cwd(), 'uploads', clientDir);
    
    let uploadsSize = 0;
    try {
      uploadsSize = await calculateDirectorySize(uploadsPath);
      logger.info(`Taille du répertoire ${clientDir}: ${uploadsSize} octets`);
    } catch (error) {
      logger.error(`Erreur lors du calcul de la taille du répertoire ${clientDir}:`, error);
    }
    
    // Mise à jour avec les catégories manquantes
    await db.execute(sql`
      UPDATE ${sql.identifier(schemaName)}.storage_management
      SET storage_categories = jsonb_build_object(
        'uploads_directory', ${uploadsSize},
        'documents', 0,  -- Valeur par défaut
        'database', 0    -- Sera mise à jour par calculate_storage_usage_details
      ),
      updated_at = NOW()
      WHERE user_id = ${userId}
    `);
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour des catégories de stockage pour ${schemaName}:`, error);
    return false;
  }
}

async function recalculateStorageDetails(schemaName) {
  try {
    // Appeler la fonction SQL pour recalculer les détails du stockage
    await db.execute(sql`
      SELECT public.calculate_storage_usage_details(${schemaName})
    `);
    
    // Vérifier le résultat
    const result = await db.execute(sql`
      SELECT storage_categories
      FROM ${sql.identifier(schemaName)}.storage_management
    `);
    
    if (!result.rows || result.rows.length === 0 || !result.rows[0].storage_categories) {
      logger.error(`Échec du recalcul pour ${schemaName}: données manquantes`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors du recalcul des détails de stockage pour ${schemaName}:`, error);
    return false;
  }
}

async function fixUserStorageInPublic(userId) {
  try {
    // S'assurer que les colonnes existent dans la table users
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'users' 
                     AND column_name = 'storage_details') THEN
          ALTER TABLE public.users ADD COLUMN storage_details JSONB DEFAULT '{}'::jsonb;
        END IF;
        
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'users' 
                     AND column_name = 'storage_last_calculated') THEN
          ALTER TABLE public.users ADD COLUMN storage_last_calculated TIMESTAMP DEFAULT NULL;
        END IF;
      END
      $$;
    `);
    
    // Mettre à jour storage_details
    await db.execute(sql`
      UPDATE public.users
      SET 
        storage_details = (
          SELECT result.details FROM (
            SELECT public.calculate_storage_usage_details(${'client_' + userId}) as details
          ) as result
        ),
        storage_last_calculated = NOW()
      WHERE id = ${userId}
    `);
    
    return true;
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour des détails de stockage dans public.users pour l'utilisateur ${userId}:`, error);
    return false;
  }
}

async function main() {
  try {
    logger.info('Démarrage du script de réparation des données de stockage');
    
    // 1. Récupérer tous les IDs utilisateurs
    const userIds = await getUserIds();
    logger.info(`${userIds.length} utilisateurs trouvés`);
    
    // 2. Récupérer tous les schémas client
    const clientSchemas = await getClientSchemas();
    logger.info(`${clientSchemas.length} schémas client trouvés`);
    
    // 3. Pour chaque schéma client
    for (const schemaName of clientSchemas) {
      const userId = Number(schemaName.replace('client_', ''));
      logger.info(`Traitement du schéma ${schemaName} pour l'utilisateur ${userId}`);
      
      // 3.1. Vérifier et créer la table storage_management si nécessaire
      const tableCreated = await checkAndCreateStorageManagementTable(schemaName);
      if (tableCreated) {
        logger.info(`Table storage_management créée pour ${schemaName}`);
      }
      
      // 3.2. Mettre à jour les catégories de stockage
      await updateStorageCategories(schemaName, userId);
      
      // 3.3. Recalculer les détails du stockage
      const success = await recalculateStorageDetails(schemaName);
      if (success) {
        logger.info(`Recalcul des détails de stockage réussi pour ${schemaName}`);
      }
      
      // 3.4. Mettre à jour les détails dans public.users
      await fixUserStorageInPublic(userId);
    }
    
    logger.info('Script de réparation terminé avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'exécution du script de réparation:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter le script
main(); 