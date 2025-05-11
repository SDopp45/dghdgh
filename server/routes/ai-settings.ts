import express from 'express';
import { UserQuotaService, AIModelType } from '../services/user-quota';
import { LanguageModelService } from '../services/language-model';
import { requireAuth } from '../auth';
import { z } from 'zod';
import { db } from '@server/db';
import { sql } from 'drizzle-orm';
import logger from '@server/utils/logger';

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
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    // Récupérer le modèle préféré de l'utilisateur directement dans public.users
    const result = await db.execute(sql`
      SELECT preferred_ai_model FROM public.users WHERE id = ${userId}
    `);
    
    const preferredModel = result.rows && result.rows.length > 0 
      ? result.rows[0].preferred_ai_model || 'openai-gpt-3.5'
      : 'openai-gpt-3.5';
    
    // Récupérer le quota de l'utilisateur
    const quotaInfo = await UserQuotaService.checkUserQuota(userId);
    
    res.json({
      preferredModel,
      quotaInfo
    });
  } catch (error) {
    logger.error('Error fetching user AI settings:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des paramètres d\'IA' });
  }
});

/**
 * Mettre à jour le modèle d'IA préféré de l'utilisateur
 */
router.post('/', requireAuth, async (req, res) => {
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
    
    // Mettre à jour le modèle préféré directement dans public.users
    await db.execute(sql`
      UPDATE public.users 
      SET preferred_ai_model = ${preferredModel} 
      WHERE id = ${userId}
    `);
    
    // Récupérer les données mises à jour
    const quotaInfo = await UserQuotaService.checkUserQuota(userId);
    
    res.json({
      preferredModel,
      quotaInfo,
      success: true,
      message: 'Préférences IA mises à jour'
    });
  } catch (error) {
    logger.error('Error updating user AI model:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du modèle d\'IA' });
  }
});

export default router; 