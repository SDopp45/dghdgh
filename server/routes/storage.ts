import { Router } from 'express';
import { ensureAuth, getUserId } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users, storageTransactions } from '@shared/schema';
import logger from '../utils/logger';
import * as storageService from '../services/storage-service';
import { getClientStorageDetails, formatSize } from '../utils/storage-utils';

const router = Router();

// Route pour obtenir les informations de stockage de l'utilisateur actuel
router.get('/info', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const storageInfo = await storageService.getUserStorageInfo(userId);
    return res.json(storageInfo);
  } catch (error) {
    logger.error('Error getting storage info:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des informations de stockage' 
    });
  }
});

// Route pour obtenir l'historique des transactions de stockage
router.get('/transactions', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const transactions = await db.select()
      .from(storageTransactions)
      .where(eq(storageTransactions.userId, userId))
      .orderBy(storageTransactions.transactionDate);

    return res.json(transactions);
  } catch (error) {
    logger.error('Error getting storage transactions:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération des transactions de stockage' 
    });
  }
});

// Route pour mettre à niveau le stockage
router.post('/upgrade', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { tier, paymentMethod, paymentReference } = req.body;

    // Vérifier que le niveau demandé est valide
    if (!tier || !Object.keys(storageService.STORAGE_TIERS).includes(tier)) {
      return res.status(400).json({ error: 'Niveau de stockage invalide' });
    }

    // Vérifier que le prix existe pour ce niveau
    const price = storageService.STORAGE_PRICES[tier];
    if (price === undefined) {
      return res.status(400).json({ error: 'Prix non défini pour ce niveau' });
    }

    // Simuler le traitement du paiement
    // Dans une implémentation réelle, intégrer avec un système de paiement (Stripe, PayPal, etc.)
    const paymentSuccessful = true;
    
    if (!paymentSuccessful) {
      return res.status(400).json({ error: 'Le paiement a échoué' });
    }

    // Mettre à jour le niveau de stockage
    await storageService.upgradeStorageTier(
      userId, 
      tier, 
      price,
      paymentMethod || 'credit_card',
      paymentReference || `manual-${Date.now()}`
    );

    // Récupérer les informations mises à jour
    const updatedStorageInfo = await storageService.getUserStorageInfo(userId);

    return res.json({
      success: true,
      message: 'Niveau de stockage mis à jour avec succès',
      storageInfo: updatedStorageInfo
    });
  } catch (error) {
    logger.error('Error upgrading storage tier:', error);
    return res.status(500).json({ 
      error: typeof error === 'object' && error !== null && 'message' in error 
        ? error.message 
        : 'Erreur lors de la mise à niveau du stockage' 
    });
  }
});

// Route pour recalculer l'utilisation du stockage
router.post('/recalculate', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    await storageService.recalculateUserStorage(userId);
    
    // Récupérer les informations mises à jour
    const updatedStorageInfo = await storageService.getUserStorageInfo(userId);

    return res.json({
      success: true,
      message: 'Utilisation du stockage recalculée avec succès',
      storageInfo: updatedStorageInfo
    });
  } catch (error) {
    logger.error('Error recalculating storage usage:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du recalcul de l\'utilisation du stockage' 
    });
  }
});

router.get('/storage-statistics', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    // Récupérer les informations de stockage à partir de la fonction utilitaire
    const storageDetails = await getClientStorageDetails(userId);

    // Répondre avec les détails
    res.json({
      success: true,
      storageDetails
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques de stockage:', error);
    // Fournir des valeurs par défaut en cas d'erreur pour éviter les erreurs côté client
    res.json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques de stockage',
      storageDetails: {
        userId: getUserId(req) || 0,
        storageUsed: 0,
        documentsSize: 0,
        storageLimit: 5368709120, // 5GB par défaut
        storageTier: 'basic',
        usedPercentage: 0,
        formattedUsed: '0 B',
        formattedLimit: '5 GB'
      }
    });
  }
});

router.get('/storage-tiers', ensureAuth, async (req, res) => {
  try {
    // Définition des limites de stockage en octets
    const storageTiers = {
      basic: 5 * 1024 * 1024 * 1024, // 5GB
      tier1: 10 * 1024 * 1024 * 1024, // 10GB
      tier2: 20 * 1024 * 1024 * 1024, // 20GB
      tier3: 50 * 1024 * 1024 * 1024, // 50GB
      tier4: 100 * 1024 * 1024 * 1024, // 100GB
    };

    // Prix des forfaits de stockage (en €)
    const storagePrices = {
      tier1: 4.99,  // 10GB: 4.99€
      tier2: 9.99,  // 20GB: 9.99€
      tier3: 19.99, // 50GB: 19.99€
      tier4: 39.99, // 100GB: 39.99€
    };
    
    // Formater les informations pour chaque tier
    const formattedTiers = Object.entries(storageTiers).map(([tier, size]) => ({
      tier,
      size,
      formattedSize: formatSize(size),
      price: tier === 'basic' ? 0 : storagePrices[tier]
    }));
    
    res.json({
      success: true,
      storageTiers: formattedTiers
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des niveaux de stockage:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des niveaux de stockage'
    });
  }
});

export default router; 