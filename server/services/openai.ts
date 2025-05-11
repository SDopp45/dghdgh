import { OpenAI } from 'openai';
import logger from '../utils/logger';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Récupère le modèle préféré d'un utilisateur
 */
async function getUserPreferredModel(userId: number): Promise<string> {
  try {
    const [userResult] = await db
      .select({ preferredAiModel: users.preferredAiModel })
      .from(users)
      .where(eq(users.id, userId));

    if (!userResult) {
      return 'gpt-3.5-turbo';
    }

    // Convertir le type de modèle en nom de modèle OpenAI
    const modelType = userResult.preferredAiModel as string || 'openai-gpt-3.5';
    if (modelType === 'openai-gpt-4o') {
      return 'gpt-4o';
    }
    
    return 'gpt-3.5-turbo';
  } catch (error) {
    logger.error('Error getting user preferred model:', error);
    return 'gpt-3.5-turbo';
  }
}

/**
 * Generate a response using OpenAI's API
 * @param prompt The user's message/prompt
 * @param context Optional context about the conversation or user
 * @returns The assistant's response
 */
export async function generateResponse(prompt: string, context?: Record<string, any>): Promise<string> {
  try {
    logger.info('Generating AI response to prompt');
    
    let systemMessage = `Tu es un assistant IA spécialisé dans la gestion immobilière.
Tu as des connaissances sur la législation immobilière française, les meilleures pratiques de gestion locative,
la maintenance des propriétés, et les relations propriétaires-locataires.
Réponds de manière concise, professionnelle et utile.
Si tu ne connais pas la réponse, dis-le clairement au lieu de spéculer.`;

    // Add additional context if provided
    if (context) {
      if (context.userRole === 'landlord') {
        systemMessage += '\nL\'utilisateur est un propriétaire qui gère des biens immobiliers.';
      } else if (context.userRole === 'tenant') {
        systemMessage += '\nL\'utilisateur est un locataire d\'un bien immobilier.';
      }
      
      if (context.propertyType) {
        systemMessage += `\nLe type de bien concerné est: ${context.propertyType}.`;
      }
      
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        systemMessage += '\nVoici le contexte de la conversation précédente:';
        for (const message of context.conversationHistory) {
          if (message.role === 'user') {
            systemMessage += `\nUtilisateur: ${message.content}`;
          } else if (message.role === 'assistant') {
            systemMessage += `\nAssistant: ${message.content}`;
          }
        }
      }
    }

    // Récupérer le modèle préféré de l'utilisateur si un userId est fourni
    const userId = context?.userId as number;
    const modelName = userId ? await getUserPreferredModel(userId) : 'gpt-3.5-turbo';
    
    logger.info(`Using model: ${modelName} for user ID: ${userId || 'N/A'}`);
    
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = response.choices[0]?.message?.content || "Je n'ai pas pu générer une réponse. Veuillez réessayer.";
    logger.info('AI response generated successfully');
    return responseText;
  } catch (error) {
    logger.error('Error generating AI response:', error);
    throw new Error('Une erreur est survenue lors de la génération de la réponse AI');
  }
}

/**
 * Analyze a message for urgency and priority
 * @param message The message to analyze
 * @returns An object with urgency level and reason
 */
export async function analyzeMessageUrgency(message: string): Promise<{ urgencyLevel: 'high' | 'medium' | 'low', reason: string }> {
  try {
    logger.info('Analyzing message urgency');
    
    const systemPrompt = `Tu es un assistant spécialisé dans l'analyse des messages pour la gestion immobilière.
Tu dois classifier le niveau d'urgence de ce message concernant un problème immobilier.
Évalue si le message décrit une situation urgente nécessitant une intervention rapide.
Réponds avec un niveau d'urgence (high, medium, low) et une explication brève.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyse ce message et détermine son niveau d'urgence (high, medium, low): "${message}"` }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const analysisText = response.choices[0]?.message?.content || "";
    
    // Extract urgency level from response
    let urgencyLevel: 'high' | 'medium' | 'low' = 'low';
    if (analysisText.toLowerCase().includes('high')) {
      urgencyLevel = 'high';
    } else if (analysisText.toLowerCase().includes('medium')) {
      urgencyLevel = 'medium';
    }
    
    // Extract reason, typically after "reason:" or similar text
    const reasonMatch = analysisText.match(/raison|reason|explication|pourquoi|car|parce que|:(.+)/i);
    const reason = reasonMatch ? reasonMatch[1].trim() : analysisText;
    
    logger.info(`Message urgency analyzed: ${urgencyLevel}`);
    return { urgencyLevel, reason };
  } catch (error) {
    logger.error('Error analyzing message urgency:', error);
    // Default to low urgency when error occurs
    return { urgencyLevel: 'low', reason: 'Analyse impossible, niveau par défaut assigné' };
  }
}

/**
 * Generate rent price suggestions based on property data
 * @param propertyData Information about the property
 * @returns Suggested rent price range and explanation
 */
export async function generateRentSuggestion(propertyData: {
  type: string,
  location: string,
  area: number,
  rooms: number,
  amenities?: string[]
}): Promise<{ minPrice: number, maxPrice: number, explanation: string }> {
  try {
    logger.info('Generating rent price suggestion');
    
    const propertyDescription = `
Type de bien: ${propertyData.type}
Localisation: ${propertyData.location}
Surface: ${propertyData.area} m²
Nombre de pièces: ${propertyData.rooms}
Équipements: ${propertyData.amenities?.join(', ') || 'Non spécifié'}
`;

    const systemPrompt = `Tu es un expert en immobilier et estimation de loyers en France.
Basé sur les données de propriété fournies, suggère une fourchette de loyer appropriée (minimum et maximum)
et explique ton raisonnement en te basant sur les tendances du marché actuel.
Réponds uniquement au format JSON avec les champs: { minPrice: nombre, maxPrice: nombre, explanation: string }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyse ces informations sur un bien immobilier et suggère un loyer approprié:\n${propertyDescription}` }
      ],
      temperature: 0.4,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    
    try {
      const suggestion = JSON.parse(responseText) as { 
        minPrice: number, 
        maxPrice: number, 
        explanation: string 
      };
      
      // Validate the response format
      if (!suggestion.minPrice || !suggestion.maxPrice || !suggestion.explanation) {
        throw new Error('Format de réponse invalide');
      }
      
      logger.info('Rent suggestion generated successfully');
      return suggestion;
    } catch (parseError) {
      logger.error('Error parsing rent suggestion:', parseError);
      return {
        minPrice: 0,
        maxPrice: 0,
        explanation: "Impossible de générer une suggestion de loyer. Veuillez consulter un agent immobilier pour une estimation précise."
      };
    }
  } catch (error) {
    logger.error('Error generating rent suggestion:', error);
    return {
      minPrice: 0,
      maxPrice: 0,
      explanation: "Une erreur est survenue lors de la génération de la suggestion de loyer."
    };
  }
}

/**
 * Génère une lettre immobilière basée sur un type et des détails spécifiques
 * @param letterType Le type de lettre à générer
 * @param details Les détails spécifiques au contexte de la lettre
 * @returns Le contenu formaté de la lettre
 */
export async function generateLetter(
  letterType: string,
  details: Record<string, string>
): Promise<string> {
  try {
    logger.info(`Generating letter of type: ${letterType}`);
    
    // Format details for the prompt
    const detailsText = Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    // Create a system prompt based on the letter type
    let systemPrompt = `Tu es un expert juridique spécialisé dans la rédaction de documents immobiliers en France.
Tu vas générer une lettre professionnelle de type "${letterType}" en utilisant les détails fournis.
La lettre doit être complète, respecter les normes juridiques françaises, et être prête à être utilisée.
Utilise un format formel et inclus tous les éléments nécessaires (date, en-tête, signatures, etc.).`;
    
    // Add type-specific instructions
    switch (letterType) {
      case 'mise_en_demeure_loyer':
        systemPrompt += `\nCette lettre est une mise en demeure pour loyers impayés. 
Elle doit mentionner les montants dus, les périodes concernées, les délais légaux, et les conséquences potentielles.`;
        break;
        
      case 'resiliation_bail':
        systemPrompt += `\nCette lettre est une résiliation de bail. 
Elle doit indiquer les dates importantes, le préavis légal, les modalités de départ, et toute obligation légale à respecter.`;
        break;
        
      case 'attestation_loyer':
        systemPrompt += `\nCette lettre est une attestation de paiement de loyer pour un locataire. 
Elle doit confirmer que le locataire est à jour de ses paiements, mentionner la période concernée, et inclure les informations nécessaires pour les démarches administratives.`;
        break;
        
      case 'quittance_loyer':
        systemPrompt += `\nCe document est une quittance de loyer. 
Il doit détailler le montant payé, la période concernée, les coordonnées du bien et inclure tous les éléments légalement requis pour une quittance valide.`;
        break;
        
      default:
        systemPrompt += `\nAssure-toi que la lettre soit complète, précise et conforme aux exigences légales.`;
    }
    
    // Generate the letter
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Génère une lettre de type "${letterType}" avec les détails suivants:\n${detailsText}` }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    const letterContent = response.choices[0]?.message?.content || 
      "Impossible de générer la lettre. Veuillez vérifier vos informations et réessayer.";
    
    logger.info('Letter generated successfully');
    return letterContent;
  } catch (error) {
    logger.error('Error generating letter:', error);
    return `Une erreur est survenue lors de la génération de la lettre de type "${letterType}". Veuillez réessayer ultérieurement.`;
  }
}