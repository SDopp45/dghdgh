import { Router } from "express";
import { db } from "../db";
// Ne pas importer users si ce n'est pas utilisé directement dans le code
import { sql, eq } from "drizzle-orm";
import logger from "../utils/logger";
import { ensureAuth } from "../middleware/auth";
import fs from "fs";
import path from "path";
import { z } from "zod";
import archiver from "archiver";
// Importer l'utilitaire de calcul de taille de répertoire
import { updateClientUploadsSize } from "../utils/storage-utils";

const router = Router();

// Interface pour les résultats JSON des calculs de stockage
interface StorageDetails {
  user_id: number;
  schema_name: string;
  database_size: {
    bytes: number;
    formatted: string;
  };
  uploads_size: {
    bytes: number;
    formatted: string;
  };
  total_size: {
    bytes: number;
    formatted: string;
  };
  tables: Array<{
    table_name: string;
    size_bytes: number;
    size_formatted: string;
  }>;
  calculated_at: string;
}

// Fonction pour formater une taille en octets en format lisible
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Interface pour les résultats des requêtes de stockage
interface StorageInfo {
  storage_used: string;
  storage_limit: string;
  storage_tier: string;
  last_calculation: string;
  [key: string]: any; // Pour les autres champs potentiels
}

// Interface pour l'historique de nettoyage
interface CleanupHistoryItem {
  date: string;
  space_freed: number;
  files_removed: number;
}

/**
 * Obtenir les informations de stockage de l'utilisateur
 */
router.get('/storage-info', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const schemaName = `client_${userId}`;
    
    // Récupérer les informations de stockage depuis la base de données
    const result = await db.execute(sql`
      SELECT 
        storage_used, 
        storage_limit, 
        storage_tier,
        coalesce(storage_last_calculated, NOW() - INTERVAL '1 day') as last_calculation
      FROM public.users 
      WHERE id = ${userId}
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const userStorage = result.rows[0] as StorageInfo;
    const lastCalculationTime = new Date(String(userStorage.last_calculation));
    const now = new Date();
    const timeDiff = now.getTime() - lastCalculationTime.getTime();
    const hoursSinceLastUpdate = timeDiff / (1000 * 60 * 60);
    
    // Si la dernière mise à jour date de plus de 12 heures, on recalcule
    if (hoursSinceLastUpdate > 12) {
      try {
        await db.execute(sql`
          SELECT public.calculate_storage_usage_details(${schemaName})
        `);
        
        // Récupérer les nouvelles valeurs
        const updatedResult = await db.execute(sql`
          SELECT 
            storage_used, 
            storage_limit, 
            storage_tier
          FROM public.users 
          WHERE id = ${userId}
        `);
        
        userStorage.storage_used = (updatedResult.rows[0] as StorageInfo).storage_used;
      } catch (calcError) {
        logger.error(`Erreur lors du calcul de l'utilisation du stockage pour l'utilisateur ${userId}:`, calcError);
        // Continuer avec les anciennes valeurs
      }
    }
    
    // Calculer le pourcentage d'utilisation
    const percentUsed = Math.min(
      100,
      Math.round((Number(userStorage.storage_used) / Number(userStorage.storage_limit)) * 100)
    );
    
    // Formater les tailles en format lisible
    const usedFormatted = formatSize(Number(userStorage.storage_used));
    const limitFormatted = formatSize(Number(userStorage.storage_limit));
    
    // Récupérer l'historique de nettoyage
    let cleanupHistory = [];
    try {
      const historyResult = await db.execute(sql`
        SELECT cleanup_history 
        FROM ${sql.identifier(schemaName)}.storage_management 
        WHERE user_id = ${userId} 
        LIMIT 1
      `);
      
      if (historyResult.rows && historyResult.rows.length > 0 && historyResult.rows[0].cleanup_history) {
        cleanupHistory = historyResult.rows[0].cleanup_history;
      }
    } catch (historyError) {
      logger.error(`Erreur lors de la récupération de l'historique de nettoyage pour l'utilisateur ${userId}:`, historyError);
    }
    
    // Date de la dernière mise à jour
    const lastUpdated = lastCalculationTime.toISOString();
    
    res.json({
      used: Number(userStorage.storage_used),
      limit: Number(userStorage.storage_limit),
      usedFormatted,
      limitFormatted,
      percentUsed,
      tier: userStorage.storage_tier,
      lastUpdated,
      cleanupHistory
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des infos de stockage:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des informations de stockage' });
  }
});

/**
 * Recalculer le stockage avec la nouvelle fonction détaillée
 */
router.post('/recalculate-storage', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const schemaName = `client_${userId}`;
    
    // Utiliser la nouvelle fonction pour calculer l'utilisation détaillée du stockage
    const result = await db.execute(sql`
      SELECT public.calculate_storage_usage_details(${schemaName}) as details
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(500).json({ error: 'Erreur lors du calcul des statistiques de stockage' });
    }
    
    // Récupérer les informations mises à jour
    const userResult = await db.execute(sql`
      SELECT 
        storage_used, 
        storage_limit, 
        storage_tier,
        storage_last_calculated as last_updated
      FROM public.users 
      WHERE id = ${userId}
    `);
    
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const userStorage = userResult.rows[0];
    
    // Formater les tailles en format lisible
    const used = Number(userStorage.storage_used);
    const limit = Number(userStorage.storage_limit);
    const percentUsed = Math.min(100, Math.round((used / limit) * 100));
    
    res.json({
      success: true,
      message: 'Calcul du stockage effectué avec succès',
      used: used,
      limit: limit,
      usedFormatted: formatSize(used),
      limitFormatted: formatSize(limit),
      percentUsed: percentUsed,
      tier: userStorage.storage_tier,
      lastUpdated: userStorage.last_updated,
      details: result.rows[0].details as StorageDetails
    });
  } catch (error) {
    logger.error('Erreur lors du recalcul du stockage:', error);
    res.status(500).json({ error: 'Erreur lors du recalcul du stockage' });
  }
});

/**
 * Nettoyer les fichiers inutilisés
 */
router.post('/storage-cleanup', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const schemaName = `client_${userId}`;
    
    // Obtenir l'utilisation du stockage avant le nettoyage
    const beforeResult = await db.execute(sql`
      SELECT storage_used 
      FROM public.users 
      WHERE id = ${userId}
    `);
    
    const storageBeforeCleanup = Number(beforeResult.rows?.[0]?.storage_used || 0);
    
    // Nombre de fichiers à nettoyer
    let filesRemoved = 0;
    
    // 1. Supprimer les fichiers temporaires (plus de 24h)
    try {
      const tempResult = await db.execute(sql`
        WITH deleted_files AS (
          DELETE FROM ${sql.identifier(schemaName)}.documents
          WHERE 
            status = 'temporary' 
            AND created_at < NOW() - INTERVAL '24 hours'
          RETURNING id, file_path, file_size
        )
        SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size
        FROM deleted_files
      `);
      
      filesRemoved += Number(tempResult.rows?.[0]?.count || 0);
    } catch (error) {
      logger.error(`Erreur lors du nettoyage des fichiers temporaires pour ${schemaName}:`, error);
    }
    
    // 2. Marquer les documents supprimés comme physiquement supprimables
    try {
      await db.execute(sql`
        UPDATE ${sql.identifier(schemaName)}.documents
        SET file_status = 'to_delete'
        WHERE 
          file_status <> 'to_delete'
          AND created_at < NOW() - INTERVAL '30 days'
      `);
    } catch (error) {
      logger.error(`Erreur lors du marquage des documents supprimés pour ${schemaName}:`, error);
    }
    
    // 3. Forcer un nouveau calcul du stockage
    await db.execute(sql`
      SELECT public.calculate_storage_usage_details(${schemaName})
    `);
    
    // Obtenir l'utilisation du stockage après le nettoyage
    const afterResult = await db.execute(sql`
      SELECT storage_used 
      FROM public.users 
      WHERE id = ${userId}
    `);
    
    const storageAfterCleanup = Number(afterResult.rows?.[0]?.storage_used || 0);
    const spaceFreed = Math.max(0, storageBeforeCleanup - storageAfterCleanup);
    
    // Ajouter à l'historique de nettoyage
    const cleanupEntry = {
      date: new Date().toISOString(),
      space_freed: spaceFreed,
      files_removed: filesRemoved
    };
    
    try {
      await db.execute(sql`
        UPDATE ${sql.identifier(schemaName)}.storage_management
        SET cleanup_history = 
          CASE 
            WHEN cleanup_history IS NULL THEN jsonb_build_array(${JSON.stringify(cleanupEntry)}::jsonb)
            ELSE cleanup_history || ${JSON.stringify(cleanupEntry)}::jsonb
          END
        WHERE user_id = ${userId}
      `);
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour de l'historique de nettoyage pour ${schemaName}:`, error);
    }
    
    res.json({
      success: true,
      message: 'Nettoyage du stockage effectué avec succès',
      filesRemoved,
      spaceFreed,
      spaceFreedFormatted: formatSize(spaceFreed),
      storageAfter: storageAfterCleanup,
      storageAfterFormatted: formatSize(storageAfterCleanup)
    });
  } catch (error) {
    logger.error('Erreur lors du nettoyage du stockage:', error);
    res.status(500).json({ error: 'Erreur lors du nettoyage du stockage' });
  }
});

/**
 * Exporter les données de l'utilisateur
 */
router.post('/export-data', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Cette fonction est simplifiée pour l'exemple
    // Dans une implémentation réelle, nous exporterions toutes les données de l'utilisateur
    
    // Créer un fichier ZIP
    const zipFileName = `export-data-${userId}-${Date.now()}.zip`;
    const zipFilePath = path.join(process.cwd(), 'temp', zipFileName);
    
    // Assurer que le dossier temp existe
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    // Créer l'archive
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Gestion des événements de l'archive
    output.on('close', () => {
      // Envoyer le fichier ZIP au client
      res.download(zipFilePath, `export-donnees-${new Date().toISOString().split('T')[0]}.zip`, (err) => {
        if (err) {
          logger.error('Erreur lors de l\'envoi du fichier d\'export:', err);
        }
        
        // Supprimer le fichier temporaire
        fs.unlinkSync(zipFilePath);
      });
    });
    
    archive.on('error', (err) => {
      logger.error('Erreur lors de la création de l\'archive:', err);
      res.status(500).json({ error: 'Erreur lors de la création de l\'archive' });
    });
    
    archive.pipe(output);
    
    // Exporter les données (simulé ici)
    // Dans une implémentation réelle, nous exporterions toutes les données de l'utilisateur
    archive.append(JSON.stringify({ message: 'Ceci est un export de démonstration' }, null, 2), { name: 'info.json' });
    
    // Finaliser l'archive
    await archive.finalize();
  } catch (error) {
    logger.error('Erreur lors de l\'export des données:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export des données' });
  }
});

/**
 * Obtenir les statistiques détaillées du stockage (mise à jour)
 */
router.get('/storage-statistics', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const schemaName = `client_${userId}`;
    
    // Calculer les statistiques détaillées avec la nouvelle fonction
    const result = await db.execute(sql`
      SELECT public.calculate_storage_usage_details(${schemaName}) as details
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(500).json({ error: 'Erreur lors du calcul des statistiques de stockage' });
    }
    
    // Typer correctement les données retournées
    const details = result.rows[0].details as StorageDetails;
    
    // Vérifier si les propriétés nécessaires existent et les créer si nécessaire
    const defaultSize = { bytes: 0, formatted: '0 Bytes' };
    
    // S'assurer que toutes les propriétés nécessaires existent
    const safeDetails = {
      totalSize: details.total_size || defaultSize,
      databaseSize: details.database_size || defaultSize,
      uploadsSize: details.uploads_size || defaultSize,
      tables: details.tables || [],
      lastUpdated: details.calculated_at || new Date().toISOString(),
      // Ajouter documentsSize explicitement pour corriger l'erreur
      fileStats: {
        documentsSize: { bytes: 0, formatted: '0 Bytes' },
        databaseSize: details.database_size || defaultSize,
        uploadsSize: details.uploads_size || defaultSize,
        totalSize: details.total_size || defaultSize
      }
    };
    
    res.json(safeDetails);
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques de stockage:', error);
    
    // En cas d'erreur, retourner des valeurs par défaut pour éviter le plantage du client
    const defaultResponse = {
      totalSize: { bytes: 0, formatted: '0 Bytes' },
      databaseSize: { bytes: 0, formatted: '0 Bytes' },
      uploadsSize: { bytes: 0, formatted: '0 Bytes' },
      tables: [],
      lastUpdated: new Date().toISOString(),
      fileStats: {
        documentsSize: { bytes: 0, formatted: '0 Bytes' },
        databaseSize: { bytes: 0, formatted: '0 Bytes' },
        uploadsSize: { bytes: 0, formatted: '0 Bytes' },
        totalSize: { bytes: 0, formatted: '0 Bytes' }
      }
    };
    
    res.json(defaultResponse);
  }
});

/**
 * Obtenir le plan de stockage actuel
 */
router.get('/storage-plan', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Récupérer le plan de stockage depuis la base de données
    const result = await db.execute(sql`
      SELECT storage_tier as tier
      FROM public.users 
      WHERE id = ${userId}
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erreur lors de la récupération du plan de stockage:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du plan de stockage' });
  }
});

/**
 * Obtenir les plans de stockage disponibles
 */
router.get('/storage-plans', ensureAuth, async (req, res) => {
  try {
    // Récupérer tous les plans de stockage actifs
    const result = await db.execute(sql`
      SELECT 
        id,
        name,
        storage_limit,
        price_monthly,
        price_yearly,
        features,
        created_at,
        updated_at
      FROM public.storage_plans
      WHERE is_active = TRUE
      ORDER BY storage_limit ASC
    `);
    
    const plans = result.rows.map(plan => ({
      id: Number(plan.id),
      name: plan.name,
      storageLimit: Number(plan.storage_limit),
      storageLimitFormatted: formatSize(Number(plan.storage_limit)),
      priceMonthly: Number(plan.price_monthly),
      priceYearly: Number(plan.price_yearly),
      features: plan.features || [],
      createdAt: plan.created_at,
      updatedAt: plan.updated_at
    }));
    
    res.json(plans);
  } catch (error) {
    logger.error('Erreur lors de la récupération des plans de stockage:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des plans de stockage' });
  }
});

/**
 * Obtenir l'abonnement actif de l'utilisateur
 */
router.get('/storage-subscription', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Récupérer l'abonnement actif
    const result = await db.execute(sql`
      SELECT 
        uss.id,
        uss.plan_id,
        uss.start_date,
        uss.billing_cycle,
        uss.next_billing_date,
        uss.payment_status,
        uss.payment_history,
        sp.name as plan_name,
        sp.storage_limit,
        sp.price_monthly,
        sp.price_yearly,
        sp.features
      FROM public.user_storage_subscriptions uss
      JOIN public.storage_plans sp ON uss.plan_id = sp.id
      WHERE uss.user_id = ${userId}
      AND uss.is_active = TRUE
      LIMIT 1
    `);
    
    if (result.rows && result.rows.length > 0) {
      const subscription = result.rows[0];
      
      // Calculer le montant actuel selon le cycle de facturation
      const currentAmount = subscription.billing_cycle === 'yearly' 
        ? Number(subscription.price_yearly) 
        : Number(subscription.price_monthly);
        
      res.json({
        id: Number(subscription.id),
        planId: Number(subscription.plan_id),
        planName: subscription.plan_name,
        startDate: subscription.start_date,
        billingCycle: subscription.billing_cycle,
        nextBillingDate: subscription.next_billing_date,
        paymentStatus: subscription.payment_status,
        paymentHistory: subscription.payment_history || [],
        storageLimit: Number(subscription.storage_limit),
        storageLimitFormatted: formatSize(Number(subscription.storage_limit)),
        currentAmount: currentAmount,
        features: subscription.features || []
      });
    } else {
      // Pas d'abonnement actif, renvoyer le plan basic par défaut
      const basicPlan = await db.execute(sql`
        SELECT * FROM public.storage_plans WHERE name = 'basic'
      `);
      
      if (basicPlan.rows && basicPlan.rows.length > 0) {
        const plan = basicPlan.rows[0];
        res.json({
          id: null,
          planId: Number(plan.id),
          planName: 'basic',
          startDate: null,
          billingCycle: null,
          nextBillingDate: null,
          paymentStatus: null,
          paymentHistory: [],
          storageLimit: Number(plan.storage_limit),
          storageLimitFormatted: formatSize(Number(plan.storage_limit)),
          currentAmount: 0,
          features: plan.features || []
        });
      } else {
        res.status(404).json({ error: 'Aucun plan de base trouvé' });
      }
    }
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'abonnement:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'abonnement' });
  }
});

/**
 * Mettre à jour le plan de stockage (API améliorée)
 */
router.post('/upgrade-plan', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validation du corps de la requête
    const planSchema = z.object({
      plan: z.string(),
      billingCycle: z.enum(['monthly', 'yearly']).default('monthly')
    });
    
    const validationResult = planSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Données invalides', details: validationResult.error });
    }
    
    const { plan, billingCycle } = validationResult.data;
    
    // Utiliser la fonction SQL pour mettre à niveau le plan
    const result = await db.execute(sql`
      SELECT * FROM public.upgrade_user_storage_plan(${userId}, ${plan}, ${billingCycle})
    `);
    
    const upgradeResult = result.rows[0];
    
    if (!upgradeResult || !upgradeResult.success) {
      return res.status(400).json({ 
        error: upgradeResult?.message || 'Erreur lors de la mise à niveau du plan de stockage' 
      });
    }
    
    res.json(upgradeResult);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du plan de stockage:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du plan de stockage' });
  }
});

export default router; 