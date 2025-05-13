const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { db } = require('../db');
const { sql } = require('drizzle-orm');

/**
 * Calcule la taille totale d'un répertoire de manière récursive
 * @param {string} directoryPath - Chemin vers le répertoire
 * @returns {Promise<number>} - Taille en octets
 */
async function calculateDirectorySize(directoryPath) {
  try {
    let totalSize = 0;
    
    // Vérifier si le répertoire existe
    try {
      await fs.access(directoryPath);
    } catch (error) {
      logger.info(`Le répertoire ${directoryPath} n'existe pas.`);
      return 0;
    }
    
    // Lire le contenu du répertoire
    const items = await fs.readdir(directoryPath, { withFileTypes: true });
    
    // Parcourir tous les éléments du répertoire
    for (const item of items) {
      const itemPath = path.join(directoryPath, item.name);
      
      if (item.isDirectory()) {
        // Si c'est un répertoire, calcul récursif
        const subdirSize = await calculateDirectorySize(itemPath);
        totalSize += subdirSize;
      } else if (item.isFile()) {
        // Si c'est un fichier, ajouter sa taille
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    logger.error(`Erreur lors du calcul de la taille du répertoire ${directoryPath}:`, error);
    return 0;
  }
}

/**
 * Calcule la taille de tous les répertoires uploads/client_X
 */
async function calculateAllUploadsDirectories() {
  try {
    // Chemin du répertoire uploads
    const uploadsPath = path.join(process.cwd(), 'uploads');
    
    // Vérifier si le répertoire uploads existe
    try {
      await fs.access(uploadsPath);
    } catch (error) {
      logger.error(`Le répertoire uploads n'existe pas.`);
      return;
    }
    
    // Lire tous les sous-répertoires du répertoire uploads
    const items = await fs.readdir(uploadsPath, { withFileTypes: true });
    
    // Traiter chaque sous-répertoire client_X
    for (const item of items) {
      if (item.isDirectory() && item.name.startsWith('client_')) {
        const clientDir = item.name;
        const clientId = parseInt(clientDir.replace('client_', ''), 10);
        
        if (!isNaN(clientId)) {
          // Calculer la taille du répertoire client_X
          const dirPath = path.join(uploadsPath, clientDir);
          const dirSize = await calculateDirectorySize(dirPath);
          
          logger.info(`Taille du répertoire ${clientDir}: ${dirSize} octets`);
          
          // Mettre à jour la table storage_management avec la taille du répertoire
          try {
            // Vérifier si la table storage_management existe
            await db.execute(sql`
              SELECT 1 
              FROM information_schema.tables 
              WHERE table_schema = ${'client_' + clientId} 
              AND table_name = 'storage_management'
            `);
            
            // Mettre à jour la table storage_management
            await db.execute(sql`
              UPDATE ${'client_' + clientId}.storage_management 
              SET storage_categories = 
                jsonb_set(
                  COALESCE(storage_categories, '{}'::jsonb), 
                  '{uploads_directory}', 
                  to_jsonb(${dirSize}::bigint)
                ),
                updated_at = NOW()
              WHERE user_id = ${clientId}
            `);
            
            logger.info(`Taille du répertoire uploads mise à jour pour le client ${clientId}`);
            
            // Recalculer l'utilisation totale du stockage
            await db.execute(sql`
              SELECT public.calculate_storage_usage_details(${'client_' + clientId})
            `);
          } catch (error) {
            logger.error(`Erreur lors de la mise à jour de la taille des uploads pour le client ${clientId}:`, error);
          }
        }
      }
    }
    
    logger.info('Calcul terminé pour tous les répertoires client.');
  } catch (error) {
    logger.error('Erreur lors du calcul de la taille des répertoires uploads:', error);
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  calculateAllUploadsDirectories()
    .then(() => {
      logger.info('Script terminé avec succès.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erreur lors de l\'exécution du script:', error);
      process.exit(1);
    });
}

// Pour configurer une tâche cron qui exécute ce script quotidiennement:
// Sur Linux/Unix: ajoutez la ligne suivante dans crontab (crontab -e)
// 0 2 * * * node /chemin/vers/votre/app/server/utils/calculate-uploads-size.cjs
//
// Sur Windows avec Task Scheduler:
// 1. Ouvrez Task Scheduler (Planificateur de tâches)
// 2. Créez une nouvelle tâche de base
// 3. Configurez-la pour qu'elle s'exécute quotidiennement à 2h du matin
// 4. Action: Démarrer un programme
// 5. Programme/script: node.exe
// 6. Arguments: C:\chemin\vers\votre\app\server\utils\calculate-uploads-size.cjs

module.exports = {
  calculateDirectorySize,
  calculateAllUploadsDirectories
}; 