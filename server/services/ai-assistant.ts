import { db } from '@server/db';
import { Prisma } from '@prisma/client';
import { getClientSchema } from '@server/utils/auth-helpers';
import { AITokenService } from './ai-token-service';
import { LanguageModelService } from './language-model';
import { users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import logger from '@server/utils/logger';
import { sql } from 'drizzle-orm';
import { 
  aiConversations, 
  aiMessages, 
  aiSuggestions
} from '@shared/schema';
import type { 
  ConversationWithMessages, 
  CreateConversationParams, 
  CreateMessageParams, 
  CreateSuggestionParams,
  SuggestionType, 
  ConversationCategory, 
  ConversationStatus 
} from '@shared/types/ai-assistant';

export class AIAssistantService {
  /**
   * Crée une nouvelle conversation
   */
  static async createConversation(params: CreateConversationParams) {
    try {
      const clientSchema = await getClientSchema(params.userId);
      // Remplacer db.withSchema par SQL direct
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      const result = await db.execute(sql`
        INSERT INTO ${sql.raw(schemaPrefix)}ai_conversations
        (user_id, title, category, status, context, created_at, updated_at)
        VALUES (
          ${params.userId}, 
          ${params.title}, 
          ${params.category || 'general'}, 
          'active', 
          ${params.context ? JSON.stringify(params.context) : '{}'}, 
          NOW(), 
          NOW()
        )
        RETURNING *
      `);

      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Ajoute un message à une conversation existante
   */
  static async addMessage(params: CreateMessageParams) {
    try {
      const clientSchema = await getClientSchema(params.userId);
      // Remplacer db.withSchema par SQL direct
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      // Insérer le message de l'utilisateur
      const userMsgResult = await db.execute(sql`
        INSERT INTO ${sql.raw(schemaPrefix)}ai_messages
        (conversation_id, user_id, role, content, is_urgent, metadata, created_at)
        VALUES (
          ${params.conversationId},
          ${params.userId},
          'user',
          ${params.content},
          ${params.isUrgent || false},
          ${params.metadata ? JSON.stringify(params.metadata) : '{}'},
          NOW()
        )
        RETURNING *
      `);
      
      const userMessage = userMsgResult.rows && userMsgResult.rows.length > 0 ? userMsgResult.rows[0] : null;

      // Mettre à jour l'horodatage de la conversation
      await db.execute(sql`
        UPDATE ${sql.raw(schemaPrefix)}ai_conversations
        SET updated_at = NOW()
        WHERE id = ${params.conversationId}
      `);

      let assistantResponse = "";
      let isUrgent = false;

      try {
        // Récupérer l'historique des messages pour contexte
        const messagesResult = await db.execute(sql`
          SELECT * FROM ${sql.raw(schemaPrefix)}ai_messages
          WHERE conversation_id = ${params.conversationId}
          ORDER BY created_at
        `);
        
        const messages = messagesResult.rows || [];

        // Formater les messages pour les API de modèles de langage
        const formattedMessages = messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        }));

        // Ajouter un message système pour l'assistant
        formattedMessages.unshift({
          role: 'system' as 'system',
          content: `Tu es ImmoBot, un assistant virtuel expert en immobilier, spécialisé dans tous les aspects du secteur immobilier français et international.

EXPERTISE:
- Législation immobilière: lois sur les baux, copropriété, diagnostics, fiscalité immobilière, SCI
- Investissement: analyse de rentabilité, défiscalisation, LMNP, Pinel, location meublée/non-meublée
- Financement: prêts immobiliers, taux d'intérêt, assurance emprunteur, crédit in fine
- Gestion locative: relations propriétaires/locataires, impayés, états des lieux, charges récupérables
- Construction/Rénovation: normes de construction, rénovation énergétique, matériaux, estimation de coûts
- Marché immobilier: tendances, analyse de prix par secteur, prévisions d'évolution
- Transactions: processus d'achat/vente, compromis, promesse, frais de notaire, négociation
- Profession immobilière: métiers (agent, notaire, syndic), commissions, honoraires

COMPORTEMENT:
- Ton langage est professionnel mais accessible, adapté aussi bien aux professionnels qu'aux particuliers
- Tu réponds avec précision et concision, en citant les références légales pertinentes quand nécessaire
- Tu peux répondre en français et en anglais selon la langue de la question
- Face à une situation urgente (dégât des eaux, incendie, etc.), tu le signales clairement
- Si l'information demandée dépasse tes connaissances, tu l'indiques honnêtement
- Tu proposes des solutions concrètes et des conseils pratiques basés sur les meilleures pratiques du secteur

Utilise ton expertise immobilière complète pour fournir des réponses précises, pratiques et à jour sur tous les sujets immobiliers.`
        });

        // Estimer les tokens nécessaires pour la requête
        const totalMessageLength = formattedMessages.reduce((total, msg) => total + msg.content.length, 0);
        const estimatedPromptTokens = Math.ceil(totalMessageLength / 4) + 150; // ~4 caractères par token + overhead
        const estimatedCompletionTokens = 500; // Estimation pour la réponse
        const estimatedTotalTokens = estimatedPromptTokens + estimatedCompletionTokens;
        
        // Vérifier si l'utilisateur a suffisamment de tokens
        const canUseAI = await AITokenService.canUseAI(params.userId, estimatedTotalTokens, clientSchema);
        
        if (!canUseAI) {
          assistantResponse = "Je suis désolé, mais votre quota de tokens AI est épuisé. Veuillez contacter l'administrateur pour recharger votre compte ou attendre la prochaine période de recharge.";
        } else {
          // Utiliser le service de modèle de langage pour générer une réponse
          assistantResponse = await LanguageModelService.generateChatResponse(
            formattedMessages, 
            params.userId
          );
          
          // Détecter si le message contient une urgence
          isUrgent = this.detectUrgency(params.content, assistantResponse);
        }
      } catch (error) {
        logger.error('AI model error:', error);
        
        // Message d'erreur générique en cas d'échec de toutes les options AI
        assistantResponse = "Je suis désolé, mais le service d'intelligence artificielle est temporairement indisponible. Votre message a bien été enregistré et sera traité dès que possible. Vous pouvez également nous contacter directement pour une assistance immédiate.";
      }

      // Enregistrer la réponse de l'assistant
      const assistantMsgResult = await db.execute(sql`
        INSERT INTO ${sql.raw(schemaPrefix)}ai_messages
        (conversation_id, user_id, role, content, is_urgent, metadata, created_at)
        VALUES (
          ${params.conversationId},
          ${params.userId},
          'assistant',
          ${assistantResponse},
          ${isUrgent},
          '{}',
          NOW()
        )
        RETURNING *
      `);
      
      const assistantMessage = assistantMsgResult.rows && assistantMsgResult.rows.length > 0 ? assistantMsgResult.rows[0] : null;
      
      // Mise à jour de l'utilisation des tokens
      try {
        // Récupérer le modèle préféré de l'utilisateur
        const [userResult] = await db
          .select({ preferredAiModel: users.preferredAiModel })
          .from(users)
          .where(eq(users.id, params.userId));

        // Modèle par défaut si aucun modèle préféré n'est trouvé
        const userModelType = (userResult?.preferredAiModel || 'openai-gpt-3.5') as string;
        
        // Calculer approximativement les tokens utilisés
        const promptLength = params.content.length;
        const responseLength = assistantResponse.length;
        const promptTokens = Math.ceil(promptLength / 4); // ~4 caractères par token
        const completionTokens = Math.ceil(responseLength / 4);
        const totalTokens = promptTokens + completionTokens;
        
        // Enregistrer l'utilisation avec le modèle de l'utilisateur
        await AITokenService.useTokens(
          params.userId,
          totalTokens,
          userModelType, // Utiliser le modèle préféré de l'utilisateur
          promptTokens,
          completionTokens,
          assistantMessage.id,
          params.conversationId,
          clientSchema
        );
      } catch (tokenError) {
        logger.error('Error tracking token usage:', tokenError);
        // Ne pas interrompre le flux si le suivi des tokens échoue
      }

      return {
        userMessage,
        assistantMessage,
      };
    } catch (error) {
      logger.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Génère une suggestion basée sur le type et les données fournies
   */
  static async createSuggestion(params: CreateSuggestionParams) {
    try {
      let promptContent = '';
      
      switch (params.type) {
        case 'rent_price':
          promptContent = `En tant qu'expert immobilier, donne-moi une suggestion de prix de loyer pour un bien avec les caractéristiques suivantes:
          Superficie: ${params.data.area || 'non spécifiée'} m²
          Localisation: ${params.data.location || 'non spécifiée'}
          Nombre de chambres: ${params.data.bedrooms || 'non spécifié'}
          Nombre de salles de bain: ${params.data.bathrooms || 'non spécifié'}
          État général: ${params.data.condition || 'non spécifié'}
          Aménités: ${params.data.amenities || 'non spécifiées'}
          
          Fournir une fourchette de prix et expliquer ton raisonnement en te basant sur les tendances du marché immobilier actuel.`;
          break;
        
        case 'maintenance':
          promptContent = `En tant qu'expert en gestion immobilière, donne-moi des recommandations pour la maintenance suivante:
          Type de maintenance: ${params.data.maintenanceType || 'non spécifié'}
          Description du problème: ${params.data.description || 'non spécifiée'}
          Urgence: ${params.data.urgency || 'non spécifiée'}
          
          Suggère les actions à entreprendre, leur ordre de priorité, et une estimation du coût potentiel.`;
          break;
        
        case 'tenant_management':
          promptContent = `En tant qu'expert en gestion locative, donne-moi des conseils pour la situation suivante avec un locataire:
          Situation: ${params.data.situation || 'non spécifiée'}
          Historique: ${params.data.history || 'non spécifié'}
          
          Suggère une approche professionnelle pour résoudre ce problème et maintenir une bonne relation avec le locataire.`;
          break;
        
        case 'investment':
          promptContent = `En tant qu'expert en investissement immobilier, donne-moi une analyse pour l'investissement suivant:
          Type de bien: ${params.data.propertyType || 'non spécifié'}
          Prix d'achat: ${params.data.purchasePrice || 'non spécifié'}
          Localisation: ${params.data.location || 'non spécifiée'}
          Potentiel locatif: ${params.data.rentalPotential || 'non spécifié'}
          
          Fournir une analyse du retour sur investissement potentiel, des risques associés et des recommandations.`;
          break;
        
        default:
          promptContent = `En tant qu'expert immobilier, donne-moi une suggestion basée sur les informations suivantes: ${JSON.stringify(params.data)}`;
      }

      let suggestionContent;
      
      try {
        // Utiliser le service de modèle de langage pour générer une réponse
        const messages = [
          {
            role: 'system' as 'system',
            content: 'Tu es un expert immobilier spécialisé dans l\'analyse de marché, la gestion locative et l\'investissement. Fournis des conseils précis et professionnels basés sur les données disponibles.'
          },
          {
            role: 'user' as 'user',
            content: promptContent
          }
        ];

        suggestionContent = await LanguageModelService.generateChatResponse(messages, params.userId);
      } catch (error) {
        logger.error('AI model error in createSuggestion:', error);
        
        // Message d'erreur générique en cas d'échec de toutes les options AI
        suggestionContent = "Le service d'analyse automatique est temporairement indisponible. Votre demande a été enregistrée et sera traitée par notre équipe d'experts immobiliers dans les plus brefs délais.";
      }

      const clientSchema = await getClientSchema(params.userId);
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';

      // Enregistrer la suggestion dans la base de données
      const result = await db.execute(sql`
        INSERT INTO ${sql.raw(schemaPrefix)}ai_suggestions
        (user_id, property_id, type, suggestion, data, status, created_at)
        VALUES (
          ${params.userId},
          ${params.propertyId || null},
          ${params.type},
          ${suggestionContent},
          ${JSON.stringify(params.data)},
          'pending',
          NOW()
        )
        RETURNING *
      `);

      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error creating suggestion:', error);
      throw error;
    }
  }

  /**
   * Récupère une conversation par son ID avec tous les messages associés
   */
  static async getConversationWithMessages(conversationId: number, userId: number): Promise<ConversationWithMessages | null> {
    try {
      const clientSchema = await getClientSchema(userId);
      // Remplacer db.withSchema par SQL direct
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      const conversationResult = await db.execute(sql`
        SELECT * FROM ${sql.raw(schemaPrefix)}ai_conversations
        WHERE id = ${conversationId} AND user_id = ${userId}
        LIMIT 1
      `);
      
      const conversation = conversationResult.rows && conversationResult.rows.length > 0 ? conversationResult.rows[0] : null;

      if (!conversation) {
        return null;
      }

      const messagesResult = await db.execute(sql`
        SELECT * FROM ${sql.raw(schemaPrefix)}ai_messages
        WHERE conversation_id = ${conversationId}
        ORDER BY created_at
      `);
      
      const messages = messagesResult.rows || [];

      return {
        ...conversation,
        messages,
      };
    } catch (error) {
      logger.error('Error fetching conversation:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les conversations d'un utilisateur
   */
  static async getUserConversations(userId: number) {
    try {
      const clientSchema = await getClientSchema(userId);
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      const result = await db.execute(sql`
        SELECT * FROM ${sql.raw(schemaPrefix)}ai_conversations
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `);
      
      return result.rows || [];
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les suggestions d'un utilisateur
   */
  static async getUserSuggestions(userId: number, type?: SuggestionType) {
    try {
      const clientSchema = await getClientSchema(userId);
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      if (type) {
        // Utiliser une requête filtrée par type
        const result = await db.execute(sql`
          SELECT * FROM ${sql.raw(schemaPrefix)}ai_suggestions
          WHERE user_id = ${userId} AND type = ${type}
          ORDER BY created_at DESC
        `);
        
        return result.rows || [];
      }

      // Requête sans filtre de type
      const result = await db.execute(sql`
        SELECT * FROM ${sql.raw(schemaPrefix)}ai_suggestions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `);
      
      return result.rows || [];
    } catch (error) {
      logger.error('Error getting user suggestions:', error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une suggestion
   */
  static async updateSuggestionStatus(suggestionId: number, userId: number, status: 'accepted' | 'rejected') {
    try {
      const clientSchema = await getClientSchema(userId);
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      const result = await db.execute(sql`
        UPDATE ${sql.raw(schemaPrefix)}ai_suggestions
        SET status = ${status}
        WHERE id = ${suggestionId} AND user_id = ${userId}
        RETURNING *
      `);

      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error updating suggestion status:', error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une conversation
   */
  static async updateConversationStatus(conversationId: number, userId: number, status: ConversationStatus) {
    try {
      const clientSchema = await getClientSchema(userId);
      const schemaPrefix = clientSchema ? `${clientSchema}.` : '';
      
      const result = await db.execute(sql`
        UPDATE ${sql.raw(schemaPrefix)}ai_conversations
        SET status = ${status}
        WHERE id = ${conversationId} AND user_id = ${userId}
        RETURNING *
      `);

      return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Error updating conversation status:', error);
      throw error;
    }
  }

  /**
   * Détecte si un message contient une urgence
   */
  private static detectUrgency(userMessage: string, assistantResponse: string): boolean {
    const urgencyKeywords = [
      // Français
      'urgence', 'urgent', 'immédiatement', 'fuite', 'dégât des eaux', 
      'incendie', 'feu', 'électricité', 'court-circuit', 'panne', 'chauffage',
      'gaz', 'explosion', 'danger', 'sécurité', 'blessure', 'accident',
      // Anglais
      'emergency', 'urgent', 'immediately', 'leak', 'water damage',
      'fire', 'electrical', 'short circuit', 'outage', 'heating',
      'gas', 'explosion', 'danger', 'safety', 'injury', 'accident'
    ];

    const combinedText = (userMessage + ' ' + assistantResponse).toLowerCase();
    
    return urgencyKeywords.some(keyword => 
      combinedText.includes(keyword.toLowerCase())
    );
  }

  static async generateContent(
    prompt: string,
    provider: LLMProvider
  ): Promise<string> {
    try {
      if (provider.type === "openai") {
        const chatMessages = [
          {
            role: "system",
            content: `Tu es un assistant IA spécialisé dans l'immobilier français en 2025. 
            
            Tu possèdes une connaissance approfondie de la législation immobilière française actuelle, incluant:
            - Les dernières lois et réglementations sur les baux d'habitation
            - Le droit des propriétaires et locataires
            - Les procédures légales de résiliation et de recouvrement
            - Les normes de construction et d'habitabilité
            - La fiscalité immobilière
            - Les diagnostics techniques obligatoires
            - Les règles concernant les copropriétés
            
            Réponds de façon experte et factuelle, en citant les références légales pertinentes (numéros d'articles, lois, décrets) lorsque nécessaire.
            Pour les lettres et documents, utilise un style formel, professionnel et structuré selon les conventions françaises.
            
            Ta mission est de fournir des informations précises, actualisées et conformes à la réglementation en vigueur en 2025.`
          },
          {
            role: "user",
            content: prompt,
          },
        ];

        const apiKey = provider.apiKey;
        if (!apiKey) {
          throw new Error("Missing API key for content generation");
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model || "gpt-4o",
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Error from OpenAI:", error);
          throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
        }

        const data = await response.json();
        console.log("Data returned from OpenAI:", JSON.stringify(data));
        return data.choices[0].message.content.trim();
      } else {
        throw new Error("Unsupported LLM provider type");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  }
}