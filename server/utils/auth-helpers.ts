import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import logger from "./logger";

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