import express from 'express';
import { AIAssistantService } from '@server/services/ai-assistant';
import languageModelProviderService from '@server/services/language-model-provider';
import { z } from 'zod';
import { ensureAuth } from '@server/middleware/auth';

const router = express.Router();

// Tous les endpoints d'assistant IA nécessitent une authentification
router.use(ensureAuth);

/**
 * Obtenir les informations sur le fournisseur d'IA actif
 */
router.get('/provider-info', (req, res) => {
  try {
    const providerInfo = languageModelProviderService.getProviderInfo();
    res.json({
      success: true,
      ...providerInfo
    });
  } catch (error) {
    console.error('Error fetching provider info:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch provider information' 
    });
  }
});

/**
 * Envoyer un message à l'assistant IA
 */
router.post('/message', async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1, { message: 'Le contenu du message est requis' }),
      conversationId: z.number().optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.format() 
      });
    }

    const { content, conversationId } = result.data;
    const userId = req.user!.id;
    
    let conversation;
    let message;
    
    // Si pas de conversationId, créer une nouvelle conversation
    if (!conversationId) {
      conversation = await AIAssistantService.createConversation({
        userId,
        title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        category: 'general',
      });
      
      // Ajouter le message à la nouvelle conversation
      message = await AIAssistantService.addMessage({
        conversationId: conversation.id,
        userId,
        content,
      });
    } else {
      // Ajouter le message à une conversation existante
      message = await AIAssistantService.addMessage({
        conversationId,
        userId,
        content,
      });
    }
    
    res.status(201).json({
      message,
      conversation: conversation || undefined
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * Créer une nouvelle conversation
 */
router.post('/conversations', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1, { message: 'Le titre est requis' }),
      category: z.enum(['general', 'maintenance', 'lease', 'payment', 'other']).optional(),
      context: z.record(z.any()).optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.format() 
      });
    }

    const { title, category, context } = result.data;
    const userId = req.user!.id;

    const conversation = await AIAssistantService.createConversation({
      userId,
      title,
      category,
      context,
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Obtenir toutes les conversations d'un utilisateur
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user!.id;
    const conversations = await AIAssistantService.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * Obtenir une conversation spécifique avec tous ses messages
 */
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const conversationId = parseInt(req.params.conversationId, 10);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = await AIAssistantService.getConversationWithMessages(conversationId, userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * Ajouter un message à une conversation
 */
router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1, { message: 'Le contenu du message est requis' }),
      metadata: z.record(z.any()).optional(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.format() 
      });
    }

    const { content, metadata } = result.data;
    const userId = req.user!.id;
    const conversationId = parseInt(req.params.conversationId, 10);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const messageResponse = await AIAssistantService.addMessage({
      conversationId,
      userId,
      content,
      metadata,
    });

    res.status(201).json(messageResponse);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * Mettre à jour le statut d'une conversation
 */
router.patch('/conversations/:conversationId', async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(['active', 'closed']),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.format() 
      });
    }

    const { status } = result.data;
    const userId = req.user!.id;
    const conversationId = parseInt(req.params.conversationId, 10);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const updatedConversation = await AIAssistantService.updateConversationStatus(
      conversationId,
      userId,
      status
    );

    res.json(updatedConversation);
  } catch (error) {
    console.error('Error updating conversation status:', error);
    res.status(500).json({ error: 'Failed to update conversation status' });
  }
});

/**
 * Créer une suggestion
 */
router.post('/suggestions', async (req, res) => {
  try {
    const schema = z.object({
      propertyId: z.number().optional(),
      type: z.enum(['rent_price', 'maintenance', 'tenant_management', 'investment']),
      data: z.record(z.any()),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.format() 
      });
    }

    const { propertyId, type, data } = result.data;
    const userId = req.user!.id;

    const suggestion = await AIAssistantService.createSuggestion({
      userId,
      propertyId,
      type,
      data,
    });

    res.status(201).json(suggestion);
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
});

/**
 * Obtenir toutes les suggestions d'un utilisateur
 */
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const type = req.query.type as string | undefined;
    
    // Vérifier si le type est valide
    if (type && !['rent_price', 'maintenance', 'tenant_management', 'investment'].includes(type)) {
      return res.status(400).json({ error: 'Invalid suggestion type' });
    }

    const suggestions = await AIAssistantService.getUserSuggestions(
      userId, 
      type as any
    );
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

/**
 * Mettre à jour le statut d'une suggestion
 */
router.patch('/suggestions/:suggestionId', async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(['accepted', 'rejected']),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: result.error.format() 
      });
    }

    const { status } = result.data;
    const userId = req.user!.id;
    const suggestionId = parseInt(req.params.suggestionId, 10);

    if (isNaN(suggestionId)) {
      return res.status(400).json({ error: 'Invalid suggestion ID' });
    }

    const updatedSuggestion = await AIAssistantService.updateSuggestionStatus(
      suggestionId,
      userId,
      status
    );

    res.json(updatedSuggestion);
  } catch (error) {
    console.error('Error updating suggestion status:', error);
    res.status(500).json({ error: 'Failed to update suggestion status' });
  }
});

// Route pour générer une lettre
router.post("/generate-letter", async (req, res) => {
  try {
    const { type, fields } = req.body;
    
    if (!type || !fields) {
      return res.status(400).json({ error: "Type de lettre et champs requis" });
    }
    
    const letterTemplates: Record<string, string> = {
      mise_en_demeure_loyer: "Mise en demeure pour loyer impayé",
      resiliation_bail: "Résiliation de bail",
      demande_reparation: "Demande de réparation",
      restitution_depot_garantie: "Demande de restitution du dépôt de garantie",
      demande_quittance: "Demande de quittance de loyer",
      conge_locataire: "Congé donné par le locataire",
      augmentation_loyer: "Notification d'augmentation de loyer",
      contestation_charges: "Contestation de régularisation de charges",
      demande_diagnostic: "Demande de diagnostic immobilier"
    };
    
    const templateName = letterTemplates[type] || "Lettre type";
    
    // Construire le prompt pour le modèle de langage
    const current_year = new Date().getFullYear();
    const prompt = `
      Génère un modèle de lettre professionnelle pour: ${templateName}. 
      Cette lettre doit respecter la législation française actuelle (${current_year}) et suivre les meilleures pratiques en immobilier.
      
      Détails à inclure dans la lettre:
      ${Object.entries(fields)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')}
        
      Format requis: lettre professionnelle complète avec en-tête, corps structuré et formule de politesse.
      Inclure les références légales pertinentes et à jour (lois et articles du code civil/code de la construction applicables en ${current_year}).
    `;
    
    // Appeler le service pour générer la réponse
    const providerInfo = await languageModelProviderService.getProviderInfo();
    
    // Utiliser le service AI Assistant pour générer le contenu
    const content = await AIAssistantService.generateContent(prompt, providerInfo.openai);
    
    res.json({ content });
  } catch (error) {
    console.error("Error generating letter:", error);
    res.status(500).json({ error: "Erreur lors de la génération de la lettre" });
  }
});

export default router;