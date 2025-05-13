import { Router } from "express";
import { db } from "../db";
import { users, userNotificationSettings } from "../db/schema";
import { sql, eq, and, ne } from "drizzle-orm";
import logger from "../utils/logger";
import { ensureAuth } from "../middleware/auth";
import bcrypt from "bcryptjs";

const router = Router();

// Existant...

// Récupérer les paramètres de notification de l'utilisateur
router.get('/notification-settings', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

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
router.put('/notification-settings', ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

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

/**
 * Route pour mettre à jour les paramètres IA de l'utilisateur
 */
router.post('/ai-settings', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { preferredAiModel } = req.body;
    
    if (!preferredAiModel || !['openai-gpt-3.5', 'openai-gpt-4o'].includes(preferredAiModel)) {
      return res.status(400).json({ error: 'Modèle IA invalide' });
    }
    
    // Mettre à jour les préférences utilisateur
    await db.execute(sql`
      UPDATE users 
      SET preferred_ai_model = ${preferredAiModel} 
      WHERE id = ${userId}
    `);
    
    res.json({ 
      success: true, 
      message: 'Préférences IA mises à jour',
      preferredAiModel
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des paramètres IA:', error);
    res.status(500).json({ error: 'Échec de la mise à jour des paramètres IA' });
  }
});

/**
 * Route pour récupérer le profil utilisateur
 */
router.get('/profile', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Récupérer les informations du profil utilisateur depuis la base de données
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Erreur lors de la récupération du profil utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

/**
 * Route pour mettre à jour le profil utilisateur
 */
router.put('/profile', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { fullName, email, phoneNumber } = req.body;
    
    // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
    if (email) {
      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(users.email, email),
          ne(users.id, userId)
        )
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre utilisateur' });
      }
    }
    
    // Mettre à jour le profil utilisateur
    const [updatedUser] = await db.update(users)
      .set({
        fullName,
        email,
        phoneNumber,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        profileImage: users.profileImage,
        role: users.role,
        updatedAt: users.updatedAt
      });
    
    res.json(updatedUser);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du profil utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

/**
 * Route pour changer le mot de passe utilisateur
 */
router.post('/change-password', ensureAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    
    // Vérifier que les champs requis sont présents
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Les champs mot de passe actuel et nouveau mot de passe sont requis' });
    }
    
    // Récupérer l'utilisateur avec son mot de passe pour vérification
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        password: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Vérifier le mot de passe actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }
    
    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mettre à jour le mot de passe
    await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    logger.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors du changement de mot de passe' });
  }
});

// ...reste du fichier 