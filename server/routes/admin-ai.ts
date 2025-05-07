import express from 'express';
import { requireAuth } from '../auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { UserQuotaService } from '../services/user-quota';
import { LanguageModelService } from '../services/language-model';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * Récupérer les données d'utilisation de l'IA pour l'utilisateur actuel
 */
router.get('/api/user/ai-data', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    // Récupérer uniquement les données de l'utilisateur connecté
    const userData = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        requestCount: true,
        requestLimit: true,
        preferredAiModel: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const formattedUser = {
      id: userData.id,
      username: userData.username,
      fullName: userData.fullName || userData.username,
      email: userData.email || 'N/A',
      requestCount: userData.requestCount || 0,
      requestLimit: userData.requestLimit || 100,
      preferredModel: userData.preferredAiModel,
    };

    res.json({ user: formattedUser });
  } catch (error) {
    console.error('Error fetching user AI data:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des données' });
  }
});

/**
 * Récupérer des statistiques sur l'utilisation de l'IA pour l'utilisateur actuel
 */
router.get('/api/user/ai-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    // Récupérer les données de l'utilisateur
    const userData = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        requestCount: true,
        requestLimit: true,
        preferredAiModel: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Statistiques d'utilisation
    const userStats = {
      requestCount: userData.requestCount || 0,
      requestLimit: userData.requestLimit || 100,
      usagePercentage: userData.requestLimit ? 
        Math.round(((userData.requestCount || 0) / userData.requestLimit) * 100) : 0,
      preferredModel: userData.preferredAiModel || 'default'
    };

    res.json(userStats);
  } catch (error) {
    console.error('Error fetching user AI stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router; 