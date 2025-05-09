import { Router } from 'express';
import { db } from '../db';
import { transactions } from '../../shared/schema';
import asyncHandler from '../utils/async-handler';
import logger from '../logger';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const router = Router();

// Route pour obtenir les statistiques financières
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis la requête
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Récupération des données de transactions depuis le schéma client
    const clientTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, userId)
    });
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    // Renvoyer les résultats
    res.json({ 
      message: "Financial stats endpoint", 
      data: {
        transactionsCount: clientTransactions.length,
        transactions: clientTransactions
      }
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération des statistiques financières:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
}));

export default router;