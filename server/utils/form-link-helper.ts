import { db } from '@db/index';
import { sql } from 'drizzle-orm';
import logger from './logger';
import { getClientDb } from './db-client';
import { ensureTablesExist } from './schema-helpers';

/**
 * Crée automatiquement l'association entre un lien et un formulaire
 * @param linkId ID du lien
 * @param formId ID du formulaire
 * @param schemaName Nom du schéma client
 */
export async function createFormLinkAssociation(
  linkId: number | string, 
  formId: number | string, 
  schemaName: string
): Promise<boolean> {
  if (!schemaName.startsWith('client_')) {
    schemaName = `client_${schemaName}`;
  }

  try {
    logger.info(`Création d'une association entre le lien ${linkId} et le formulaire ${formId} dans ${schemaName}`);
    
    // S'assurer que les tables existent
    await ensureTablesExist(schemaName, db);
    
    // Vérifier si l'association existe déjà
    await db.execute(sql`SET search_path TO ${sql.identifier(schemaName)}, public`);
    
    const existingCheck = await db.execute(
      sql`SELECT id FROM link_forms 
          WHERE link_id = ${linkId} AND form_id = ${formId}
          LIMIT 1`
    );
    
    if (existingCheck.rowCount && existingCheck.rowCount > 0) {
      logger.info(`L'association existe déjà avec l'ID ${existingCheck.rows[0].id}`);
      await db.execute(sql`SET search_path TO public`);
      return true;
    }
    
    // Créer l'association
    const result = await db.execute(
      sql`INSERT INTO link_forms (link_id, form_id, created_at)
          VALUES (${linkId}, ${formId}, NOW())
          RETURNING id`
    );
    
    if (!result.rowCount || result.rowCount === 0) {
      throw new Error("Échec de la création de l'association");
    }
    
    logger.info(`Association créée avec succès avec l'ID ${result.rows[0].id}`);
    
    // Réinitialiser le search_path
    await db.execute(sql`SET search_path TO public`);
    return true;
  } catch (error) {
    logger.error('Erreur lors de la création de l\'association:', error);
    // Essayer de réinitialiser le search_path même en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (e) {
      logger.error('Erreur lors de la réinitialisation du search_path:', e);
    }
    return false;
  }
}

/**
 * Vérifie et crée automatiquement l'association entre un lien et un formulaire si nécessaire
 * Utilisée lors de la création ou mise à jour d'un lien de type "form"
 */
export async function ensureFormLinkAssociation(
  linkId: number | string,
  formId: number | string,
  userId: number | string
): Promise<boolean> {
  try {
    const schemaName = `client_${userId}`;
    return await createFormLinkAssociation(linkId, formId, schemaName);
  } catch (error) {
    logger.error('Erreur lors de la vérification/création de l\'association:', error);
    return false;
  }
} 