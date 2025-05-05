import express from 'express';
import { authenticateToken } from '../auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { UserQuotaService } from '../services/user-quota';
import { LanguageModelService } from '../services/language-model';
import { z } from 'zod';

const router = express.Router();

// Vérification que l'utilisateur est admin
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Accès non autorisé. Rôle d\'administrateur requis.' });
  }
  next();
};

/**
 * Récupérer les données d'utilisation de l'IA pour tous les utilisateurs
 */
router.get('/api/admin/users-ai-data', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Récupérer tous les utilisateurs avec leurs données
    const allUsers = await db.query.users.findMany({
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

    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
      email: user.email || 'N/A',
      requestCount: user.requestCount || 0,
      requestLimit: user.requestLimit || 100,
      preferredModel: user.preferredAiModel,
    }));

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error fetching users AI data:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des données' });
  }
});

/**
 * Récupérer des statistiques globales sur l'utilisation de l'IA
 */
router.get('/api/admin/ai-stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Récupérer toutes les données nécessaires
    const allUsers = await db.query.users.findMany({
      columns: {
        requestCount: true,
        requestLimit: true,
        preferredAiModel: true,
      },
    });

    // Statistiques d'utilisation
    const totalRequests = allUsers.reduce((sum, user) => sum + (user.requestCount || 0), 0);
    const activeUsers = allUsers.filter(user => (user.requestCount || 0) > 0).length;
    const limitExceeded = allUsers.filter(user => (user.requestCount || 0) >= (user.requestLimit || 100)).length;

    // Répartition des modèles
    const modelUsage = allUsers.reduce((acc, user) => {
      const model = user.preferredAiModel || 'default';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalRequests,
      activeUsers,
      limitExceeded,
      totalUsers: allUsers.length,
      modelUsage
    });
  } catch (error) {
    console.error('Error fetching AI stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

/**
 * Mettre à jour en masse les limites de requêtes
 */
router.post('/api/admin/update-all-limits', authenticateToken, isAdmin, async (req, res) => {
  try {
    const schema = z.object({
      newLimit: z.number().min(0),
      applyTo: z.enum(['all', 'active', 'exceeded'])
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ message: 'Données invalides', errors: validationResult.error.errors });
    }

    const { newLimit, applyTo } = validationResult.data;

    // Définir les utilisateurs à mettre à jour selon le filtre
    let userFilter = {};
    if (applyTo === 'active') {
      userFilter = { requestCount: { gt: 0 } };
    } else if (applyTo === 'exceeded') {
      // Cette logique est plus complexe et nécessiterait une requête personnalisée
      // Pour simplifier, on pourrait utiliser un traitement post-requête
    }

    // Mise à jour des limites
    const updateResult = await db.update(users)
      .set({ requestLimit: newLimit })
      .where(userFilter);

    res.json({ message: 'Limites mises à jour avec succès' });
  } catch (error) {
    console.error('Error updating all limits:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour des limites' });
  }
});

export default router; 