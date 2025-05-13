import { db } from '@server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Limite maximale de requêtes par utilisateur
const DEFAULT_REQUEST_LIMIT = 100;

// Type pour les modèles d'IA disponibles
export type AIModelType = 'openai-gpt-3.5' | 'openai-gpt-4o';

// Coût en quota pour chaque modèle
export const MODEL_QUOTA_COST: Record<AIModelType, number> = {
  'openai-gpt-3.5': 1,
  'openai-gpt-4o': 2
};

// Interface pour les paramètres d'utilisation du modèle
export interface ModelUsageParams {
  userId: number;
  modelType: AIModelType;
}

/**
 * Service pour gérer les quotas d'utilisation des modèles d'IA par utilisateur
 */
export class UserQuotaService {
  /**
   * Vérifie si un utilisateur a atteint sa limite de requêtes
   */
  static async checkUserQuota(userId: number): Promise<{ hasQuotaLeft: boolean; currentUsage: number; limit: number }> {
    try {
      // Récupérer les informations de l'utilisateur
      const userResult = await db.execute(sql`
        SELECT request_count, request_limit 
        FROM public.users 
        WHERE id = ${userId}
        LIMIT 1
      `);

      if (!userResult.rows || userResult.rows.length === 0) {
        throw new Error(`Utilisateur avec ID ${userId} introuvable`);
      }

      // Utiliser des valeurs par défaut si les valeurs sont nulles
      const requestCount = Number(userResult.rows[0].request_count) || 0;
      const requestLimit = Number(userResult.rows[0].request_limit) || DEFAULT_REQUEST_LIMIT;
      const hasQuotaLeft = requestCount < requestLimit;

      return {
        hasQuotaLeft,
        currentUsage: requestCount,
        limit: requestLimit
      };
    } catch (error) {
      console.error('Error checking user quota:', error);
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur a suffisamment de quota pour utiliser un modèle spécifique
   */
  static async hasQuotaForModel(userId: number, modelType: AIModelType): Promise<boolean> {
    try {
      const quotaInfo = await this.checkUserQuota(userId);
      const cost = MODEL_QUOTA_COST[modelType] || 1;
      
      return quotaInfo.currentUsage + cost <= quotaInfo.limit;
    } catch (error) {
      console.error('Error checking quota for model:', error);
      return false;
    }
  }

  /**
   * Incrémente le compteur de requêtes pour un utilisateur
   * @param userId ID de l'utilisateur
   * @param quotaToConsume Nombre d'unités de quota à consommer (dépend du modèle utilisé)
   */
  static async incrementRequestCount(userId: number, quotaToConsume: number = 1): Promise<number> {
    try {
      // Récupérer le compteur actuel
      const userResult = await db.execute(sql`
        SELECT request_count 
        FROM public.users 
        WHERE id = ${userId}
        LIMIT 1
      `);

      if (!userResult.rows || userResult.rows.length === 0) {
        throw new Error(`Utilisateur avec ID ${userId} introuvable`);
      }

      const currentCount = Number(userResult.rows[0].request_count) || 0;
      const newCount = currentCount + quotaToConsume;

      // Mettre à jour le compteur
      await db.execute(sql`
        UPDATE public.users
        SET request_count = ${newCount}
        WHERE id = ${userId}
      `);

      return newCount;
    } catch (error) {
      console.error('Error incrementing request count:', error);
      throw error;
    }
  }

  /**
   * Réinitialise le compteur de requêtes d'un utilisateur
   */
  static async resetRequestCount(userId: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE public.users
        SET request_count = 0
        WHERE id = ${userId}
      `);
    } catch (error) {
      console.error('Error resetting request count:', error);
      throw error;
    }
  }

  /**
   * Met à jour la limite de requêtes d'un utilisateur
   */
  static async updateRequestLimit(userId: number, newLimit: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE public.users
        SET request_limit = ${newLimit}
        WHERE id = ${userId}
      `);
    } catch (error) {
      console.error('Error updating request limit:', error);
      throw error;
    }
  }
} 