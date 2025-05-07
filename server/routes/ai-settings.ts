import express from 'express';
import { UserQuotaService, AIModelType } from '../services/user-quota';
import { LanguageModelService } from '../services/language-model';
import { requireAuth } from '../auth';
import { z } from 'zod';

const router = express.Router();

// Schema de validation pour la mise à jour du modèle d'IA
const updateModelSchema = z.object({
  preferredModel: z.enum([
    'openai-gpt-3.5', 'openai-gpt-4o'
  ])
});

/**
 * Obtenir les paramètres d'IA de l'utilisateur courant
 */
router.get('/user/ai-settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    // Récupérer le quota de l'utilisateur
    const quotaInfo = await UserQuotaService.checkUserQuota(userId);
    
    // Récupérer le modèle préféré de l'utilisateur
    const preferredModel = await LanguageModelService.getUserPreferredModel(userId);
    
    res.json({
      preferredModel,
      quotaInfo
    });
  } catch (error) {
    console.error('Error fetching user AI settings:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des paramètres d\'IA' });
  }
});

/**
 * Mettre à jour le modèle d'IA préféré de l'utilisateur
 */
router.post('/user/ai-settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    // Valider les données reçues
    const validationResult = updateModelSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Données invalides', 
        errors: validationResult.error.errors 
      });
    }
    
    const { preferredModel } = validationResult.data;
    
    // Mettre à jour le modèle préféré
    await LanguageModelService.setUserPreferredModel(userId, preferredModel);
    
    // Récupérer les données mises à jour
    const quotaInfo = await UserQuotaService.checkUserQuota(userId);
    
    res.json({
      preferredModel,
      quotaInfo
    });
  } catch (error) {
    console.error('Error updating user AI model:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du modèle d\'IA' });
  }
});

export default router; 