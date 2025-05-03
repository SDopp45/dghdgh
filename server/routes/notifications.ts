import { Router } from 'express';
import { db } from '../db';
import { notifications } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import logger from '../utils/logger';
import { ensureAuth, getUserId } from '../middleware/auth';
import { createNotification, notificationFactory } from '../utils/notification-helper';

const router = Router();

// Get all notifications for a user
router.get('/', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const userNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    res.json(userNotifications);
  } catch (error) {
    logger.error(`Error fetching notifications: ${error}`);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const notificationId = parseInt(req.params.id);

    await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );

    res.json({ success: true });
  } catch (error) {
    logger.error(`Error marking notification as read: ${error}`);
    res.status(500).json({ error: 'Erreur lors du marquage de la notification comme lue' });
  }
});

// Mark all notifications as read
router.put('/read-all', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    res.json({ success: true });
  } catch (error) {
    logger.error(`Error marking all notifications as read: ${error}`);
    res.status(500).json({ error: 'Erreur lors du marquage de toutes les notifications comme lues' });
  }
});

// Routes de test pour générer des notifications
router.post('/test/generate', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Créer plusieurs types de notifications de test
    const notifications = await Promise.all([
      // Test notification de maintenance
      notificationFactory.maintenance.created(
        userId,
        1, // ID de maintenance fictif
        "Appartement Test"
      ),

      // Test notification de paiement
      notificationFactory.tenant.paymentReceived(
        userId,
        1, // ID de locataire fictif
        1000 // Montant fictif
      ),

      // Test notification d'inspection
      notificationFactory.property.inspection(
        userId,
        1, // ID de propriété fictif
        "Maison Test",
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Dans 7 jours
      ),

      // Test notification d'alerte
      notificationFactory.property.issue(
        userId,
        1, // ID de propriété fictif
        "Studio Test",
        "Fuite d'eau signalée"
      )
    ]);

    res.json({
      message: 'Notifications de test générées avec succès',
      notifications
    });
  } catch (error) {
    logger.error('Error generating test notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la génération des notifications de test' });
  }
});

export default router;