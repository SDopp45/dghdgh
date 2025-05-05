import { Router } from 'express';
import { ensureAuth, getUserId } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users, storageTransactions } from '@shared/schema';
import logger from '../utils/logger';
import * as storageService from '../services/storage-service';

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

export default router; 