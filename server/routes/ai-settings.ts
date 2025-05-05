import express from 'express';
import { UserQuotaService, AIModelType } from '../services/user-quota';
import { LanguageModelService } from '../services/language-model';
import { authenticateToken } from '../auth';
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
router.get('/api/user/ai-settings', authenticateToken, async (req, res) => {
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
router.post('/api/user/ai-settings', authenticateToken, async (req, res) => {
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

/**
 * Réinitialiser le compteur de requêtes (admin uniquement)
 */
router.post('/api/admin/reset-user-quota/:userId', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est administrateur
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    const targetUserId = parseInt(req.params.userId);
    
    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }
    
    // Réinitialiser le compteur
    await UserQuotaService.resetRequestCount(targetUserId);
    
    res.json({ message: 'Compteur de requêtes réinitialisé avec succès' });
  } catch (error) {
    console.error('Error resetting user quota:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du compteur' });
  }
});

/**
 * Mettre à jour la limite de requêtes d'un utilisateur (admin uniquement)
 */
router.post('/api/admin/update-user-limit/:userId', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est administrateur
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    const targetUserId = parseInt(req.params.userId);
    
    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }
    
    // Valider le nouveau quota
    const newLimit = parseInt(req.body.limit);
    
    if (isNaN(newLimit) || newLimit < 0) {
      return res.status(400).json({ message: 'Limite invalide' });
    }
    
    // Mettre à jour la limite
    await UserQuotaService.updateRequestLimit(targetUserId, newLimit);
    
    res.json({ message: 'Limite de requêtes mise à jour avec succès' });
  } catch (error) {
    console.error('Error updating user limit:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la limite' });
  }
});

export default router; 