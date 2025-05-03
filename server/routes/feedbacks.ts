import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { feedbackHistory } from '@shared/schema';
import logger from '../utils/logger';

const router = Router();

// GET orphaned feedbacks
router.get('/orphaned', async (req, res, next) => {
  try {
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
    
    logger.info(`Found ${orphanedFeedbacks.length} orphaned feedbacks`);
    res.json(orphanedFeedbacks);
  } catch (error) {
    logger.error('Error fetching orphaned feedbacks:', error);
    next(error);
  }
});

export default router;