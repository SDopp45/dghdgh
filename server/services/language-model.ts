import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';
import { AIModelType, UserQuotaService, MODEL_QUOTA_COST } from './user-quota';
import { db } from '@server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Anthropic } from '@anthropic-ai/sdk';
import axios from 'axios';
import logger from '../utils/logger';

// Configuration des clients d'API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Client HuggingFace
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Client Anthropic (Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Liste des modèles supportés
export type SupportedModelType = 'openai-gpt-3.5' | 'openai-gpt-4o';

// Mapping des modèles de langage disponibles
const modelMap: Record<SupportedModelType, { provider: string; modelName: string; maxTokens: number }> = {
  'openai-gpt-3.5': {
    provider: 'openai',
    modelName: 'gpt-3.5-turbo',
    maxTokens: 4000,
  },
  'openai-gpt-4o': {
    provider: 'openai',
    modelName: 'gpt-4o',
    maxTokens: 8000,
  }
};

export enum AIProvider {
  OPENAI = 'openai',
  HUGGINGFACE = 'huggingface',
  ANTHROPIC = 'anthropic',
  MISTRAL = 'mistral',
  LOCAL = 'local',
}

// Vérifier si un modèle est supporté par notre système
function isSupportedModel(model: AIModelType): model is SupportedModelType {
  return model === 'openai-gpt-3.5' || model === 'openai-gpt-4o';
}

// Obtenir le fournisseur à partir du type de modèle
function getProviderFromModelType(modelType: AIModelType): AIProvider {
  if (modelType.startsWith('openai-')) {
    return AIProvider.OPENAI;
  } else if (modelType.startsWith('huggingface-')) {
    return AIProvider.HUGGINGFACE;
  } else if (modelType.startsWith('anthropic-')) {
    return AIProvider.ANTHROPIC;
  } else if (modelType.startsWith('mistral-')) {
    return AIProvider.MISTRAL;
  } else {
    return AIProvider.LOCAL;
  }
}

// Configuration par défaut
const DEFAULT_MODEL: SupportedModelType = 'openai-gpt-3.5';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Service pour gérer les interactions avec les différents modèles de langage
 */
export class LanguageModelService {
  /**
   * Récupère le modèle préféré d'un utilisateur
   */
  static async getUserPreferredModel(userId: number): Promise<AIModelType> {
    try {
      const [userResult] = await db
        .select({ preferredAiModel: users.preferredAiModel })
        .from(users)
        .where(eq(users.id, userId));

      if (!userResult) {
        return DEFAULT_MODEL;
      }

      return (userResult.preferredAiModel || DEFAULT_MODEL) as AIModelType;
    } catch (error) {
      console.error('Error getting user preferred model:', error);
      return DEFAULT_MODEL;
    }
  }
  
  /**
   * Définit le modèle préféré d'un utilisateur
   */
  static async setUserPreferredModel(userId: number, modelType: AIModelType): Promise<void> {
    try {
      // Vérifier que le modèle est valide
      if (!isSupportedModel(modelType)) {
        throw new Error(`Modèle non valide ou non supporté: ${modelType}`);
      }

      await db
        .update(users)
        .set({ preferredAiModel: modelType })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error setting user preferred model:', error);
      throw error;
    }
  }

  /**
   * Génère une réponse à partir d'une requête utilisateur
   */
  static async generateResponse(
    prompt: string,
    userId: number,
    overrideModel?: AIModelType
  ): Promise<string> {
    try {
      // Déterminer le modèle à utiliser
      let modelType: AIModelType;
      if (overrideModel) {
        modelType = overrideModel;
      } else {
        modelType = await this.getUserPreferredModel(userId);
      }

      // S'assurer que le modèle est supporté
      if (!isSupportedModel(modelType)) {
        modelType = DEFAULT_MODEL;
      }

      // Obtenir le coût en quota du modèle
      const quotaCost = MODEL_QUOTA_COST[modelType] || 1;

      // Vérifier si l'utilisateur a suffisamment de quota pour ce modèle
      const hasEnoughQuota = await UserQuotaService.hasQuotaForModel(userId, modelType);

      if (!hasEnoughQuota) {
        return `Vous n'avez pas assez de quota pour utiliser le modèle ${modelType}. Ce modèle coûte ${quotaCost} unités de quota par requête. Veuillez utiliser un modèle moins coûteux ou contacter un administrateur.`;
      }

      // Obtenir la configuration du modèle
      const modelConfig = modelMap[modelType];

      // Générer la réponse selon le fournisseur
      let response = '';
      
      switch (modelConfig.provider) {
        case 'openai':
          response = await this.callOpenAI(prompt, modelConfig.modelName, modelConfig.maxTokens);
          break;
        default:
          throw new Error(`Fournisseur non supporté: ${modelConfig.provider}`);
      }

      // Incrémenter le compteur de requêtes avec le coût approprié
      await UserQuotaService.incrementRequestCount(userId, quotaCost);

      return response;
    } catch (error) {
      console.error('Error generating response:', error);
      return "Une erreur s'est produite lors de la génération de la réponse. Veuillez réessayer plus tard.";
    }
  }
  
  /**
   * Génère une réponse à partir d'une conversation (plusieurs messages)
   * @param messages Tableau de messages avec roles (system, user, assistant)
   * @param userId ID de l'utilisateur
   * @param overrideModel Modèle à utiliser (optionnel, utilisera le modèle préféré de l'utilisateur par défaut)
   */
  static async generateChatResponse(
    messages: Message[],
    userId: number,
    overrideModel?: AIModelType
  ): Promise<string> {
    try {
      // Déterminer le modèle à utiliser
      let modelType: AIModelType;
      if (overrideModel) {
        modelType = overrideModel;
      } else {
        modelType = await this.getUserPreferredModel(userId);
      }

      // S'assurer que le modèle est supporté
      if (!isSupportedModel(modelType)) {
        modelType = DEFAULT_MODEL;
      }

      // Obtenir le coût en quota du modèle
      const quotaCost = MODEL_QUOTA_COST[modelType] || 1;

      // Vérifier si l'utilisateur a suffisamment de quota pour ce modèle
      const hasEnoughQuota = await UserQuotaService.hasQuotaForModel(userId, modelType);

      if (!hasEnoughQuota) {
        return `Vous n'avez pas assez de quota pour utiliser le modèle ${modelType}. Ce modèle coûte ${quotaCost} unités de quota par requête. Veuillez utiliser un modèle moins coûteux ou contacter un administrateur.`;
      }

      // Obtenir la configuration du modèle
      const modelConfig = modelMap[modelType];

      // Générer la réponse selon le fournisseur
      let response = '';
      
      switch (modelConfig.provider) {
        case 'openai':
          response = await this.callOpenAIChatCompletion(messages, modelConfig.modelName, modelConfig.maxTokens);
          break;
        default:
          throw new Error(`Fournisseur non supporté: ${modelConfig.provider}`);
      }

      // Incrémenter le compteur de requêtes avec le coût approprié
      await UserQuotaService.incrementRequestCount(userId, quotaCost);

      return response;
    } catch (error) {
      console.error('Error generating chat response:', error);
      return "Une erreur s'est produite lors de la génération de la réponse. Veuillez réessayer plus tard.";
    }
  }

  /**
   * Appelle l'API OpenAI pour générer une réponse
   */
  private static async callOpenAI(prompt: string, model: string, maxTokens: number): Promise<string> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Clé API OpenAI non configurée');
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'Vous êtes un assistant immobilier expert. Répondez de manière précise, professionnelle et utile aux questions relatives à l\'immobilier.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  /**
   * Appelle l'API OpenAI pour générer une réponse dans une conversation
   */
  private static async callOpenAIChatCompletion(messages: Message[], model: string, maxTokens: number): Promise<string> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Clé API OpenAI non configurée');
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling OpenAI API (chat completion):', error);
      throw error;
    }
  }
}