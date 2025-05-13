import { db } from '../db';
import { aiTokens, aiUsage, aiMessages, aiConversations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../utils/logger';
import { sql } from 'drizzle-orm';

export class AITokenService {
  /**
   * Récupère le solde de tokens d'un utilisateur
   */
  static async getUserTokenBalance(userId: number, clientSchema?: string): Promise<any> {
    try {
      // Utiliser la requête SQL directe avec le schéma client si spécifié
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      // Récupérer les tokens
      const tokenResult = await db.execute(sql`
        SELECT tokens, plan, monthly_reset_date FROM ${sql.raw(`${schemaPrefix}ai_tokens`)} 
        WHERE user_id = ${userId}
        LIMIT 1
      `);

      // Récupérer les informations de quota de l'utilisateur
      const userQuotaResult = await db.execute(sql`
        SELECT request_count, request_limit FROM public.users 
        WHERE id = ${userId}
        LIMIT 1
      `);
      
      // Récupérer la date de la prochaine réinitialisation
      const resetDate = tokenResult.rows && tokenResult.rows.length > 0 && tokenResult.rows[0].monthly_reset_date
        ? tokenResult.rows[0].monthly_reset_date
        : null;
      
      // Calculer la date de la prochaine réinitialisation si elle n'existe pas
      const nextResetDate = resetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      return {
        balance: tokenResult.rows && tokenResult.rows.length > 0 ? Number(tokenResult.rows[0].tokens || 0) : 0,
        plan: tokenResult.rows && tokenResult.rows.length > 0 ? tokenResult.rows[0].plan || 'free' : 'free',
        requestCount: userQuotaResult.rows && userQuotaResult.rows.length > 0 ? Number(userQuotaResult.rows[0].request_count || 0) : 0,
        requestLimit: userQuotaResult.rows && userQuotaResult.rows.length > 0 ? Number(userQuotaResult.rows[0].request_limit || 100) : 100,
        monthlyResetDate: resetDate,
        nextResetDate: nextResetDate
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération du solde de tokens: ${error}`);
      return {
        balance: 0,
        plan: 'free',
        requestCount: 0,
        requestLimit: 100,
        monthlyResetDate: null,
        nextResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
    }
  }

  /**
   * Récupère le quota d'utilisation d'un utilisateur
   * Version simplifiée utilisant uniquement public.users
   */
  static async getUserQuota(userId: number): Promise<{requestCount: number, requestLimit: number}> {
    try {
      const userResult = await db.execute(sql`
        SELECT request_count, request_limit FROM public.users 
        WHERE id = ${userId}
        LIMIT 1
      `);
      
      return {
        requestCount: Number(userResult.rows[0]?.request_count || 0),
        requestLimit: Number(userResult.rows[0]?.request_limit || 100)
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération du quota: ${error}`);
      return { requestCount: 0, requestLimit: 100 };
    }
  }

  /**
   * Vérifie si l'utilisateur a dépassé sa limite de requêtes
   */
  static async hasReachedRequestLimit(userId: number): Promise<boolean> {
    try {
      const { requestCount, requestLimit } = await this.getUserQuota(userId);
      return requestCount >= requestLimit;
    } catch (error) {
      logger.error(`Erreur lors de la vérification de la limite de requêtes: ${error}`);
      return false;
    }
  }

  /**
   * Incrémente le compteur de requêtes en fonction du modèle utilisé
   * Version simplifiée utilisant uniquement public.users
   */
  static async incrementRequestCount(userId: number, modelId: string, clientSchema?: string): Promise<boolean> {
    try {
      // Déterminer l'incrément selon le modèle
      const increment = (
        modelId.includes('gpt-4') || 
        modelId.includes('gpt4') || 
        modelId === 'openai-gpt-4o'
      ) ? 2 : 1;
      
      logger.info(`Modèle utilisé: ${modelId}, incrément appliqué: ${increment}`);
      
      // Mettre à jour le compteur de requêtes dans public.users
      await db.execute(sql`
        UPDATE public.users
        SET request_count = request_count + ${increment}
        WHERE id = ${userId}
      `);
      
      logger.info(`Compteur de requêtes incrémenté pour l'utilisateur ${userId}: +${increment}`);
      
      // Vérifier la cohérence avec ai_usage si un schéma client est spécifié
      if (clientSchema) {
        try {
          const schemaPrefix = `${clientSchema}.`;
          
          // Compter les entrées dans ai_usage
          const countResult = await db.execute(sql`
            SELECT COUNT(*) as usage_count 
            FROM ${sql.raw(`${schemaPrefix}ai_usage`)}
            WHERE user_id = ${userId}
          `);
          
          const usageCount = parseInt(countResult.rows[0].usage_count || '0', 10);
          
          // Récupérer le request_count actuel
          const userResult = await db.execute(sql`
            SELECT request_count FROM public.users 
            WHERE id = ${userId}
            LIMIT 1
          `);
          
          const requestCount = parseInt(userResult.rows[0].request_count || '0', 10);
          
          // Si la différence est trop grande, synchroniser
          if (Math.abs(requestCount - usageCount) > 2) {
            logger.warn(`Incohérence détectée: request_count=${requestCount}, ai_usage count=${usageCount}`);
            await this.syncRequestCount(userId, clientSchema);
          }
        } catch (error) {
          logger.error(`Erreur lors de la vérification de cohérence: ${error}`);
          // Ne pas bloquer l'exécution en cas d'erreur
        }
      }
      
      // Vérifier si la réinitialisation mensuelle est nécessaire
      await this.checkMonthlyReset(userId);
      
      return true;
    } catch (error) {
      logger.error(`Erreur lors de l'incrémentation du compteur de requêtes: ${error}`);
      return false;
    }
  }

  /**
   * Vérifie si la réinitialisation mensuelle est nécessaire
   * Version simplifiée utilisant uniquement public.users
   */
  static async checkMonthlyReset(userId: number): Promise<void> {
    try {
      // Récupérer la date de dernière réinitialisation
      const result = await db.execute(sql`
        SELECT last_reset_date FROM public.users 
        WHERE id = ${userId} AND last_reset_date <= NOW() - INTERVAL '1 month'
        LIMIT 1
      `);
      
      // Si la date est passée ou nulle, réinitialiser
      if (result.rows && result.rows.length > 0) {
        await db.execute(sql`
          UPDATE public.users
          SET request_count = 0, 
              last_reset_date = NOW()
          WHERE id = ${userId}
        `);
        
        logger.info(`Réinitialisation mensuelle effectuée pour l'utilisateur ${userId}`);
      }
    } catch (error) {
      logger.error(`Erreur lors de la vérification de la réinitialisation mensuelle: ${error}`);
    }
  }

  /**
   * Ajoute des tokens au compte d'un utilisateur
   */
  static async addTokens(userId: number, amount: number, clientSchema?: string): Promise<boolean> {
    try {
      // Utiliser la requête SQL directe avec le schéma client si spécifié
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      // Vérifier si l'utilisateur a déjà un enregistrement de tokens
      const result = await db.execute(sql`
        SELECT id, tokens FROM ${sql.raw(schemaPrefix)}ai_tokens 
        WHERE user_id = ${userId}
        LIMIT 1
      `);
      
      if (result.rows && result.rows.length > 0) {
        // Mettre à jour le solde existant
        const currentTokens = Number(result.rows[0].tokens || 0);
        await db.execute(sql`
          UPDATE ${sql.raw(schemaPrefix)}ai_tokens
          SET tokens = ${currentTokens + amount}, updated_at = NOW()
          WHERE user_id = ${userId}
        `);
      } else {
        // Créer un nouvel enregistrement
        await db.execute(sql`
          INSERT INTO ${sql.raw(schemaPrefix)}ai_tokens
          (user_id, tokens, plan, request_count, monthly_reset_date, created_at, updated_at)
          VALUES (${userId}, ${amount}, 'free', 0, NOW() + INTERVAL '1 month', NOW(), NOW())
        `);
      }
      
      return true;
    } catch (error) {
      logger.error(`Erreur lors de l'ajout de tokens: ${error}`);
      return false;
    }
  }

  /**
   * Consomme des tokens du compte d'un utilisateur
   */
  static async useTokens(
    userId: number, 
    tokensUsed: number, 
    modelId: string,
    promptTokens: number, 
    completionTokens: number,
    messageId?: number,
    conversationId?: number,
    clientSchema?: string
  ): Promise<boolean> {
    try {
      // Utiliser la requête SQL directe avec le schéma client si spécifié
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';

      // Vérifier le solde de tokens de l'utilisateur
      const result = await db.execute(sql`
        SELECT id, tokens FROM ${sql.raw(schemaPrefix)}ai_tokens 
        WHERE user_id = ${userId}
        LIMIT 1
      `);
      
      const userTokens = result.rows && result.rows.length > 0 ? 
        Number(result.rows[0].tokens || 0) : 0;
        
      if (!result.rows || result.rows.length === 0 || userTokens < tokensUsed) {
        logger.warn(`L'utilisateur ${userId} n'a pas assez de tokens: ${userTokens} < ${tokensUsed}`);
        return false;
      }

      // Vérifier si l'utilisateur a atteint sa limite de requêtes
      if (await this.hasReachedRequestLimit(userId)) {
        logger.warn(`L'utilisateur ${userId} a atteint sa limite de requêtes`);
        return false;
      }

      // Mettre à jour le solde de tokens
      await db.execute(sql`
        UPDATE ${sql.raw(schemaPrefix)}ai_tokens
        SET tokens = tokens - ${tokensUsed}, updated_at = NOW()
        WHERE user_id = ${userId}
      `);

      // Incrémenter le compteur de requêtes
      await this.incrementRequestCount(userId, modelId, clientSchema);

      // Enregistrer l'utilisation
      await db.execute(sql`
        INSERT INTO ${sql.raw(schemaPrefix)}ai_usage
        (user_id, message_id, conversation_id, tokens_used, model, prompt_tokens, 
         completion_tokens, cost, created_at)
        VALUES (
          ${userId}, 
          ${messageId || null}, 
          ${conversationId || null}, 
          ${tokensUsed}, 
          ${modelId},
          ${promptTokens}, 
          ${completionTokens}, 
          ${modelId.includes('gpt-4') 
            ? (promptTokens * 0.00001 + completionTokens * 0.00003) 
            : (promptTokens * 0.000001 + completionTokens * 0.000002)},
          NOW()
        )
      `);

      return true;
    } catch (error) {
      logger.error(`Erreur lors de la consommation de tokens: ${error}`);
      return false;
    }
  }

  /**
   * Vérifie si un utilisateur peut effectuer une requête AI
   */
  static async canUseAI(userId: number, estimatedTokens: number, clientSchema?: string): Promise<boolean> {
    // Vérifier le solde de tokens
    const balance = await this.getUserTokenBalance(userId, clientSchema);
    if (balance < estimatedTokens) {
      return false;
    }

    // Vérifier la limite de requêtes
    const hasReachedLimit = await this.hasReachedRequestLimit(userId);
    if (hasReachedLimit) {
      return false;
    }

    return true;
  }

  /**
   * Récupère l'historique d'utilisation des tokens d'un utilisateur
   */
  static async getUserUsageHistory(userId: number, clientSchema?: string) {
    try {
      // Utiliser la requête SQL directe avec le schéma client si spécifié
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      const result = await db.execute(sql`
        SELECT * FROM ${sql.raw(`${schemaPrefix}ai_usage`)}
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      return result.rows || [];
    } catch (error) {
      logger.error(`Erreur lors de la récupération de l'historique d'utilisation: ${error}`);
      return [];
    }
  }

  /**
   * Synchronise le compteur request_count dans public.users avec les données de ai_usage
   */
  static async syncRequestCount(userId: number, clientSchema?: string): Promise<boolean> {
    try {
      if (!clientSchema) {
        logger.error('Impossible de synchroniser: schéma client non spécifié');
        return false;
      }
      
      const schemaPrefix = `${clientSchema}.`;
      
      // Compter les entrées dans la table ai_usage
      const usageResult = await db.execute(sql`
        SELECT COUNT(*) as usage_count 
        FROM ${sql.raw(`${schemaPrefix}ai_usage`)}
        WHERE user_id = ${userId}
      `);
      
      const usageCount = parseInt(usageResult.rows[0].usage_count || '0', 10);
      
      // Mettre à jour le request_count dans public.users
      await db.execute(sql`
        UPDATE public.users
        SET request_count = ${usageCount}
        WHERE id = ${userId}
      `);
      
      logger.info(`Compteur de requêtes synchronisé pour l'utilisateur ${userId}: ${usageCount}`);
      
      return true;
    } catch (error) {
      logger.error(`Erreur lors de la synchronisation du compteur: ${error}`);
      return false;
    }
  }
} 