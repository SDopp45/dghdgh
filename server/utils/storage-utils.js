const fs = require('fs').promises;
const path = require('path');
const { db } = require('../db');
const { sql } = require('drizzle-orm');
const logger = require('./logger');
const { calculateDirectorySize } = require('./calculate-uploads-size.cjs');

/**
 * Met à jour la taille utilisée des documents pour un client
 * @param {number} userId - ID de l'utilisateur
 * @param {number} size - Taille ajoutée (nombre positif) ou supprimée (nombre négatif)
 */
async function updateClientUploadsSize(userId, size) {
  try {
    const clientSchema = `client_${userId}`;
    
    // Vérifier si le schéma existe
    const schemaExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = ${clientSchema}
      )
    `);
    
    if (!schemaExists.rows[0].exists) {
      logger.error(`Schema ${clientSchema} does not exist for user ${userId}`);
      return false;
    }
    
    // Mise à jour directe de la colonne storage_used de l'utilisateur
    await db.execute(sql`
      UPDATE public.users 
      SET storage_used = COALESCE(storage_used::numeric, 0) + ${size}::numeric,
          updated_at = NOW()
      WHERE id = ${userId}
    `);
    
    logger.info(`Storage updated for user ${userId} by ${size} bytes`);
    return true;
  } catch (error) {
    logger.error(`Error updating client storage for user ${userId}:`, error);
    return false;
  }
}

/**
 * Récupère les détails de stockage pour un client
 * @param {number} userId - ID de l'utilisateur 
 * @returns {Promise<Object>} - Informations de stockage
 */
async function getClientStorageDetails(userId) {
  try {
    // Récupérer les informations de la table users
    const userResult = await db.execute(sql`
      SELECT 
        id, 
        COALESCE(storage_used::numeric, 0) as storage_used,
        COALESCE(storage_limit::numeric, 5368709120) as storage_limit, 
        COALESCE(storage_tier, 'basic') as storage_tier
      FROM public.users 
      WHERE id = ${userId}
    `);
    
    if (userResult.rows.length === 0) {
      return { error: "Utilisateur non trouvé" };
    }
    
    const user = userResult.rows[0];
    
    // Calculer la taille totale des documents du client
    // Ne pas filtrer sur deleted_at puisque la colonne n'existe pas
    const clientSchema = `client_${userId}`;
    let documentsSize = 0;
    
    try {
      // Vérifier que le schéma client existe
      const schemaExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.schemata WHERE schema_name = ${clientSchema}
        )
      `);
      
      if (schemaExists.rows[0].exists) {
        const documentsResult = await db.execute(sql`
          SELECT COALESCE(SUM(file_size), 0) as total_size
          FROM ${sql.identifier(clientSchema)}.documents
        `);
        
        documentsSize = parseFloat(documentsResult.rows[0].total_size);
      }
    } catch (err) {
      logger.warn(`Error getting documents size for user ${userId}:`, err);
      // Continuer avec valeur par défaut en cas d'erreur
    }
    
    // Calculer les informations dérivées
    const storageUsed = parseFloat(user.storage_used);
    const storageLimit = parseFloat(user.storage_limit);
    const percentage = (storageUsed / storageLimit) * 100;
    
    const response = {
      userId: userId,
      storageUsed,
      documentsSize,
      storageLimit,
      storageTier: user.storage_tier,
      usedPercentage: Math.min(Math.round(percentage * 100) / 100, 100),
      formattedUsed: formatSize(storageUsed),
      formattedLimit: formatSize(storageLimit)
    };
    
    return response;
  } catch (error) {
    logger.error(`Error getting storage details for user ${userId}:`, error);
    return { 
      error: "Erreur lors de la récupération des informations de stockage",
      storageUsed: 0,
      documentsSize: 0,
      storageLimit: 5368709120, // 5GB par défaut
      storageTier: 'basic',
      usedPercentage: 0,
      formattedUsed: '0 B',
      formattedLimit: '5 GB'
    };
  }
}

/**
 * Formate une taille en octets en une chaîne lisible
 * @param {number} bytes - Taille en octets
 * @returns {string} - Chaîne formatée
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  updateClientUploadsSize,
  getClientStorageDetails,
  formatSize
}; 