import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';

// Configuration des clients d'API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Client HuggingFace
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Liste des modèles disponibles pour chaque service
const MODELS = {
  openai: {
    chat: 'gpt-4o', // ou 'gpt-3.5-turbo' pour un modèle moins cher
  },
  huggingface: {
    // Modèles de text-generation pour chat
    chat: 'HuggingFaceH4/zephyr-7b-beta', // Modèle totalement gratuit
    // Alternatives gratuites : 'google/flan-t5-xxl', 'gpt2', 'distilgpt2'
    // Alternatives payantes : 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'meta-llama/Llama-2-70b-chat-hf'
  }
};

export enum AIProvider {
  OPENAI = 'openai',
  HUGGINGFACE = 'huggingface',
}

// Configuration par défaut
const DEFAULT_PROVIDER = AIProvider.HUGGINGFACE; // Utilisez HuggingFace par défaut 

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Service pour interagir avec différents modèles de langage (LLM)
 */
export class LanguageModelService {
  
  /**
   * Génère une réponse locale sans utiliser d'API externe
   * Cette fonction contient des réponses prédéfinies pour les questions fréquentes
   */
  private static generateLocalResponse(messages: Message[]): string {
    // Obtenir le dernier message de l'utilisateur
    let userMessage = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessage = messages[i].content.toLowerCase();
        break;
      }
    }
    
    // Réponses prédéfinies basées sur des mots-clés
    if (userMessage.includes('bonjour') || userMessage.includes('salut') || userMessage.includes('hello')) {
      return "Bonjour ! Je suis votre assistant immobilier. Comment puis-je vous aider aujourd'hui ?";
    } 
    else if (userMessage.includes('loyer') || userMessage.includes('paiement') || userMessage.includes('facture')) {
      return "La gestion des paiements est essentielle dans l'immobilier. Vous pouvez suivre les paiements de loyer, configurer des rappels automatiques et générer des reçus dans la section 'Finances' de notre plateforme.";
    }
    else if (userMessage.includes('problème') || userMessage.includes('maintenance') || userMessage.includes('réparation')) {
      return "Pour signaler un problème de maintenance, vous pouvez utiliser la section 'Tickets de maintenance'. Vous pourrez y décrire le problème, ajouter des photos et suivre l'état d'avancement des réparations.";
    }
    else if (userMessage.includes('locataire') || userMessage.includes('tenant')) {
      return "La gestion des locataires est facilitée par notre plateforme. Vous pouvez consulter les profils des locataires, accéder à leurs informations de contact et à l'historique des communications dans l'onglet 'Locataires'.";
    }
    else if (userMessage.includes('contrat') || userMessage.includes('bail') || userMessage.includes('lease')) {
      return "Les contrats de location sont disponibles dans la section 'Documents'. Vous pouvez y consulter, télécharger et partager tous les documents importants liés à vos propriétés.";
    }
    else if (userMessage.includes('visite') || userMessage.includes('rendez-vous') || userMessage.includes('appointment')) {
      return "Pour planifier une visite, utilisez notre calendrier intégré dans la section 'Visites'. Vous pourrez y programmer des rendez-vous, envoyer des invitations et recevoir des confirmations.";
    }
    else if (userMessage.includes('propriété') || userMessage.includes('property') || userMessage.includes('bien')) {
      return "Toutes vos propriétés sont listées dans la section 'Propriétés'. Vous pouvez y ajouter de nouvelles propriétés, mettre à jour les informations existantes et accéder à toutes les données pertinentes pour chaque bien.";
    }
    else if (userMessage.includes('aide') || userMessage.includes('help')) {
      return "Je suis là pour vous aider à naviguer dans notre plateforme de gestion immobilière. N'hésitez pas à me poser des questions spécifiques sur les fonctionnalités ou sur la gestion de vos propriétés.";
    }
    else if (userMessage.includes('merci') || userMessage.includes('thank')) {
      return "Je vous en prie ! N'hésitez pas à me solliciter si vous avez d'autres questions.";
    }
    else {
      // Réponse générique pour les questions non reconnues
      return "En tant qu'assistant immobilier, je peux vous aider avec la gestion de vos propriétés, locataires, baux, paiements et maintenance. Comment puis-je vous être utile aujourd'hui ?";
    }
  }
  
  /**
   * Obtient le fournisseur actif en fonction de la configuration ou des clés disponibles
   */
  static getActiveProvider(): AIProvider {
    // Si une préférence explicite est définie dans les variables d'environnement, l'utiliser
    if (process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
      return AIProvider.OPENAI;
    } 
    if (process.env.AI_PROVIDER === 'huggingface' && process.env.HUGGINGFACE_API_KEY) {
      return AIProvider.HUGGINGFACE;
    }
    
    // Sinon, vérifier quelle clé API est disponible
    if (process.env.OPENAI_API_KEY) {
      return AIProvider.OPENAI;
    }
    if (process.env.HUGGINGFACE_API_KEY) {
      return AIProvider.HUGGINGFACE; 
    }
    
    // Retourner le fournisseur par défaut si aucune préférence n'est spécifiée
    return DEFAULT_PROVIDER;
  }
  
  /**
   * Génère une réponse en utilisant le LLM approprié
   */
  static async generateChatResponse(messages: Message[]): Promise<string> {
    const provider = this.getActiveProvider();
    
    try {
      switch (provider) {
        case AIProvider.OPENAI:
          try {
            return await this.generateOpenAIResponse(messages);
          } catch (error: any) {
            // Si l'erreur est liée au dépassement de quota, basculer vers la solution locale
            if (error?.status === 429 || (error?.error?.code === 'insufficient_quota')) {
              console.log('OpenAI quota exceeded, falling back to local response');
              return LanguageModelService.generateLocalResponse(messages);
            }
            console.log('Error with OpenAI, falling back to local response');
            return LanguageModelService.generateLocalResponse(messages);
          }
        case AIProvider.HUGGINGFACE:
          try {
            return await this.generateHuggingFaceResponse(messages);
          } catch (error) {
            console.log('Error with HuggingFace, falling back to local response');
            return LanguageModelService.generateLocalResponse(messages);
          }
        default:
          return LanguageModelService.generateLocalResponse(messages);
      }
    } catch (error) {
      console.error(`Erreur avec le fournisseur ${provider}:`, error);
      return LanguageModelService.generateLocalResponse(messages);
    }
  }
  
  /**
   * Génère une réponse en utilisant l'API OpenAI
   */
  private static async generateOpenAIResponse(messages: Message[]): Promise<string> {
    const response = await openai.chat.completions.create({
      model: MODELS.openai.chat,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    return response.choices[0]?.message?.content || 
      "Désolé, je n'ai pas pu générer une réponse avec OpenAI.";
  }
  
  /**
   * Génère une réponse en utilisant l'API HuggingFace
   */
  private static async generateHuggingFaceResponse(messages: Message[]): Promise<string> {
    // Conversion du format de messages pour HuggingFace
    // Pour les modèles de chat HuggingFace, nous devons formater le texte d'une manière spécifique
    let prompt = '';
    
    // Format pour Zephyr - utilise un format différent de Mixtral
    let systemMessage = "Tu es un assistant IA spécialisé dans la gestion immobilière. Tu aides les utilisateurs avec leurs questions concernant la gestion de leurs propriétés, les contrats de location, les relations avec les locataires, et les problèmes de maintenance. Réponds de manière concise, précise et pratique.";
    
    // Ajouter le message système au début
    prompt += `<|system|>\n${systemMessage}\n`;
    
    // Ajouter les autres messages
    for (const message of messages) {
      if (message.role === 'system') {
        // On ignore les messages système supplémentaires, car on a déjà ajouté le système au début
        continue;
      } else if (message.role === 'user') {
        prompt += `<|user|>\n${message.content}\n`;
      } else if (message.role === 'assistant') {
        prompt += `<|assistant|>\n${message.content}\n`;
      }
    }
    
    // Ajouter l'amorce pour que l'assistant réponde
    prompt += `<|assistant|>\n`;
    
    // S'assurer que le dernier message est de l'utilisateur pour obtenir une réponse
    if (messages.length > 0 && messages[messages.length - 1].role !== 'user') {
      prompt += `<|user|>\nQue peux-tu me dire à ce sujet?\n<|assistant|>\n`;
    }
    
    try {
      const response = await hf.textGeneration({
        model: MODELS.huggingface.chat,
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
        }
      });
      
      // Extraire uniquement la partie réponse générée par le modèle
      const generatedText = response.generated_text || '';
      
      // Plusieurs approches pour extraire la réponse correctement
      let assistantResponse = '';
      
      // Méthode 1: Si le texte généré contient le prompt complet
      if (generatedText.startsWith(prompt)) {
        assistantResponse = generatedText.substring(prompt.length);
      } 
      // Méthode 2: Extraire le texte après le dernier tag [/INST]
      else if (generatedText.includes('[/INST]')) {
        const lastInstIndex = generatedText.lastIndexOf('[/INST]');
        if (lastInstIndex !== -1) {
          assistantResponse = generatedText.substring(lastInstIndex + 7);
        }
      }
      // Méthode 3: Pour certains modèles HF qui ne renvoient que la réponse
      else {
        assistantResponse = generatedText;
      }
      
      // Log pour le débogage
      console.log("Texte généré HF:", generatedText.substring(0, 50) + "...");
      console.log("Réponse extraite:", assistantResponse.substring(0, 50) + "...");
      
      return assistantResponse.trim() || 
        "Désolé, je n'ai pas pu générer une réponse avec HuggingFace.";
    } catch (error) {
      console.error("Erreur lors de l'appel à HuggingFace:", error);
      throw error;
    }
  }
}