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
    logger.info(`Financial-analysis: initialisation de l'accès au schéma ${clientSchema} pour l'utilisateur ${userId}`);
    
    // Vérifier d'abord que l'utilisateur est dans la table users
    const userCheck = await db.execute(sql`SELECT id, role FROM public.users WHERE id = ${userId}`);
    if (userCheck.rows.length === 0) {
      logger.error(`Financial-analysis: utilisateur ${userId} non trouvé dans la table users`);
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    
    const userRole = userCheck.rows[0].role;
    logger.info(`Financial-analysis: utilisateur ${userId} trouvé avec le rôle ${userRole}`);
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Financial-analysis: Search_path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    // Vérifier que la table transactions existe dans ce schéma
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = ${clientSchema} 
        AND table_name = 'transactions'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      logger.error(`Financial-analysis: table transactions n'existe pas dans le schéma ${clientSchema}`);
      return res.status(404).json({ 
        error: "Structure de données non trouvée",
        details: `Table transactions non trouvée dans le schéma ${clientSchema}`
      });
    }
    
    // Vérifier la structure de la table transactions
    const columnsCheck = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = ${clientSchema} 
      AND table_name = 'transactions'
    `);
    
    logger.info(`Financial-analysis: structure de la table transactions dans ${clientSchema}:`, 
      columnsCheck.rows.map(row => `${row.column_name} (${row.data_type})`).join(', '));
    
    // Utiliser une requête SQL directe au lieu de l'ORM pour assurer la cohérence
    const result = await db.execute(sql`
      SELECT * FROM transactions
      WHERE user_id = ${userId}
      ORDER BY date DESC
    `);
    
    const clientTransactions = result.rows;
    logger.info(`Financial-analysis: ${clientTransactions.length} transactions récupérées du schéma ${clientSchema}`);
    
    if (clientTransactions.length > 0) {
      // Afficher un exemple de transaction pour le débogage
      logger.info(`Financial-analysis: exemple de transaction récupérée:`, JSON.stringify(clientTransactions[0]));
    }
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    logger.info(`Financial-analysis: search_path réinitialisé à "public"`);
    
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
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
      logger.info("Financial-analysis: search_path réinitialisé après erreur");
    } catch (resetError) {
      logger.error("Erreur lors de la réinitialisation du search_path:", resetError);
    }
    
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
}));

export default router;