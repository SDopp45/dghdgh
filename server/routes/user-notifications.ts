import express from "express";
import { db } from "../db";
import { userNotificationSettings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import logger from "../utils/logger";
import { ensureAuth } from "../middleware/auth";

const router = express.Router();

// Récupérer les paramètres de notification de l'utilisateur
router.get('/', ensureAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userId = req.user.id;

    // Récupérer les paramètres de l'utilisateur
    const userSettings = await db.select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));

    if (userSettings.length === 0) {
      // Si l'utilisateur n'a pas encore de paramètres, créer les valeurs par défaut
      const defaultSettings = [
        { type: 'payment', channel: 'both', enabled: true, frequency: 'immediate', importance: 'all' },
        { type: 'maintenance', channel: 'both', enabled: true, frequency: 'immediate', importance: 'all' },
        { type: 'lease', channel: 'both', enabled: true, frequency: 'daily', importance: 'all' },
        { type: 'visit', channel: 'both', enabled: true, frequency: 'immediate', importance: 'all' },
      ];

      const newSettings = [];
      for (const setting of defaultSettings) {
        const [newSetting] = await db.insert(userNotificationSettings)
          .values({
            userId,
            type: setting.type,
            channel: setting.channel,
            enabled: setting.enabled,
            frequency: setting.frequency,
            importance: setting.importance,
          })
          .returning();
        
        newSettings.push(newSetting);
      }

      return res.json(newSettings);
    }

    res.json(userSettings);
  } catch (error) {
    logger.error('Erreur lors de la récupération des paramètres de notification:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

// Mettre à jour les paramètres de notification de l'utilisateur
router.put('/', ensureAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userId = req.user.id;
    const settings = req.body;
    
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Format invalide' });
    }

    const updatedSettings = [];
    for (const setting of settings) {
      if (!setting.id) continue;

      // Vérifier que le paramètre appartient à cet utilisateur
      const existingSetting = await db.select()
        .from(userNotificationSettings)
        .where(and(
          eq(userNotificationSettings.id, setting.id),
          eq(userNotificationSettings.userId, userId)
        ))
        .limit(1);

      if (existingSetting.length === 0) {
        continue; // Ignorer les paramètres qui n'appartiennent pas à l'utilisateur
      }

      // Mettre à jour le paramètre
      const [updatedSetting] = await db.update(userNotificationSettings)
        .set({
          enabled: setting.enabled,
          channel: setting.channel,
          frequency: setting.frequency,
          importance: setting.importance,
        })
        .where(eq(userNotificationSettings.id, setting.id))
        .returning();

      updatedSettings.push(updatedSetting);
    }

    res.json(updatedSettings);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des paramètres de notification:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

export default router; 