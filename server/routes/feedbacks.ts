import { Router } from 'express';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { feedbackHistory } from '@shared/schema';
import logger from '../utils/logger';
import { ensureAuth, getUserId } from '../middleware/auth';

const router = Router();

// GET orphaned feedbacks
router.get('/orphaned', ensureAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    logger.info('Fetching orphaned feedbacks');
    
    // Récupérer uniquement les feedbacks marqués comme orphelins (sans tenantId ET avec isOrphaned à true)
    const orphanedFeedbacks = await db.query.feedbackHistory.findMany({
      where: and(
        isNull(feedbackHistory.tenantId),
        eq(feedbackHistory.isOrphaned, true)
      ),
      with: {
        creator: true
      },
      orderBy: (feedback, { desc }) => [desc(feedback.createdAt)]
    });
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    logger.info(`Found ${orphanedFeedbacks.length} orphaned feedbacks`);
    res.json(orphanedFeedbacks);
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error fetching orphaned feedbacks:', error);
    next(error);
  }
});

export default router;