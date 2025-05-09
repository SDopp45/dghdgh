import { Router } from "express";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logger from "../utils/logger";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { ensureAuth, getUserId } from "../middleware/auth";

const router = Router();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount)
    .replace(/\s/g, ' ');
};

// Fonction pour formater les grands nombres dans le corps du tableau
const formatLargeNumber = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M €`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K €`;
  }
  return `${value.toFixed(0)} €`;
};

// Route exemple pour les rapports
router.get("/summary", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Ici viendrait la logique pour récupérer les données du rapport
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json({ message: "Rapport généré avec succès" });
  } catch (error) {
    logger.error("Erreur lors de la génération du rapport:", error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: "Erreur lors de la génération du rapport" });
  }
});


export default router;