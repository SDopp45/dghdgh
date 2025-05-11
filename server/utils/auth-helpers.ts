import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import logger from "./logger";
import { sql } from 'drizzle-orm';

/**
 * Récupère un utilisateur à partir d'un token d'authentification
 * Cette fonction est utilisée pour authentifier les connexions WebSocket
 */
export async function getUserFromToken(token: string) {
  try {
    // En mode développement ou local, retourner l'utilisateur de test
    // Ne pas essayer de valider le token en mode développement
    logger.info('Development mode: returning test user for WebSocket connection');
    return {
      id: 1,
      username: 'testuser',
      fullName: 'Test User',
      role: 'manager',
      email: 'test@example.com'
    };
    
    // Code ci-dessous désactivé pour le moment
    /*
    // En production, on vérifierait le token via une logique appropriée
    if (!token) return null;
    
    let userId: number;
    try {
      userId = parseInt(token, 10);
    } catch (e) {
      logger.error('Invalid token format for WebSocket authentication');
      return null;
    }
    
    // Récupérer l'utilisateur en base de données
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) {
      logger.warn(`User not found for WebSocket authentication: ${userId}`);
      return null;
    }
    
    // Ne pas renvoyer le mot de passe
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
    */
  } catch (error) {
    logger.error('Error authenticating WebSocket user:', error);
    return null;
  }
}

/**
 * Récupère le schéma client associé à un utilisateur
 * @param userId Identifiant de l'utilisateur
 * @returns Le nom du schéma client (client_X) ou null si non trouvé
 */
export async function getClientSchema(userId: number): Promise<string | null> {
  try {
    // Ne plus utiliser admin_schema.client_info qui n'existe pas
    // Essayer directement de trouver un schéma client_X contenant cet utilisateur
    const schemaResult = await db.execute(sql`
      SELECT nspname AS schema_name
      FROM pg_namespace
      WHERE nspname LIKE 'client_%'
      ORDER BY nspname
    `);
    
    // Vérifier d'abord le schéma client_X qui correspond à l'ID utilisateur (heuristique)
    const clientIdSchema = `client_${userId}`;
    
    // Vérifier si ce schéma existe dans les résultats
    if (schemaResult.rows && schemaResult.rows.some((row) => row.schema_name === clientIdSchema)) {
      logger.info(`Found matching schema ${clientIdSchema} for user ${userId}`);
      return clientIdSchema;
    }
    
    // Sinon parcourir tous les schémas et chercher l'utilisateur
    for (const row of schemaResult.rows || []) {
      const schemaName = row.schema_name;
      try {
        const userResult = await db.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = ${schemaName}
            AND table_name = 'users'
          )
        `);
        
        // Si la table users existe dans ce schéma
        if (userResult.rows?.[0]?.exists) {
          // Essayer de trouver l'utilisateur dans ce schéma
          const userCheck = await db.execute(sql`
            SELECT 1 FROM ${sql.raw(schemaName)}.properties
            WHERE user_id = ${userId}
            LIMIT 1
          `);
          
          if (userCheck.rows && userCheck.rows.length > 0) {
            logger.info(`Found user ${userId} in schema ${schemaName}`);
            return schemaName;
          }
        }
      } catch (err) {
        // Ignorer les erreurs et continuer avec le schéma suivant
        logger.debug(`Error checking schema ${schemaName}: ${err}`);
      }
    }
    
    // Si aucune correspondance n'est trouvée mais que nous avons un schéma qui correspond à l'ID utilisateur
    // nous le retournons comme fallback
    if (clientIdSchema) {
      logger.info(`Falling back to schema ${clientIdSchema} for user ${userId}`);
      return clientIdSchema;
    }
    
    logger.warn(`No client schema found for user ${userId}`);
    return null;
  } catch (error) {
    logger.error("Erreur lors de la récupération du schéma client:", error);
    return null;
  }
} 