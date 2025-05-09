import { Router } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import logger from "../utils/logger";
import { ensureAuth, getUserId } from "../middleware/auth";

const router = Router();

// Route pour récupérer les paramètres utilisateur
router.get("/user", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Récupérer les paramètres utilisateur depuis la base de données
    const userSettings = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    if (!userSettings) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({
      id: userSettings.id,
      email: userSettings.email,
      name: userSettings.name,
      preferences: userSettings.preferences
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération des paramètres:", error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: "Erreur lors de la récupération des paramètres" });
  }
});

// Route pour mettre à jour les paramètres utilisateur
router.put("/user", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const { name, preferences } = req.body;
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Mettre à jour les paramètres utilisateur
    await db.update(users)
      .set({ 
        name: name,
        preferences: preferences,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json({ message: 'Paramètres mis à jour avec succès' });
  } catch (error) {
    logger.error("Erreur lors de la mise à jour des paramètres:", error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: "Erreur lors de la mise à jour des paramètres" });
  }
});

export default router;