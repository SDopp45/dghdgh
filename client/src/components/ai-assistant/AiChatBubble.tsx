import React, { useEffect, useState, useRef } from 'react';
import { X, SendHorizontal, Loader2, MessageSquare, HelpCircle, Bot, Settings, Info, Sparkles, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useAiProvider } from '@/hooks/use-ai-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AiSettingsDialog from './AiSettingsDialog';

// Types pour les messages et conversations
type Message = {
  id: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
};

type Conversation = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'closed';
  category: string;
};

type PredefinedQuery = {
  text: string;
  category: 'general' | 'maintenance' | 'legal' | 'financial';
};

// Modèles d'IA disponibles
const aiModels = [
  { id: 'openai-gpt-3.5', name: 'GPT-3.5', quotaCost: 1 },
  { id: 'openai-gpt-4o', name: 'GPT-4', quotaCost: 2 },
];

// Questions prédéfinies
const PREDEFINED_QUERIES: PredefinedQuery[] = [
  { text: "Comment calculer la rentabilité d'un investissement locatif ?", category: 'financial' },
  { text: "Quelles sont les obligations légales d'un propriétaire ?", category: 'legal' },
  { text: "Comment gérer un locataire qui ne paie pas son loyer ?", category: 'legal' },
  { text: "Quels diagnostics sont obligatoires pour une location ?", category: 'maintenance' },
  { text: "Comment optimiser la fiscalité de mon investissement immobilier ?", category: 'financial' },
  { text: "Quels sont les avantages du statut LMNP ?", category: 'financial' },
  { text: "Comment rédiger un état des lieux conforme ?", category: 'legal' },
  { text: "Quelles sont les étapes pour vendre un bien immobilier ?", category: 'general' },
];

// Réponses prédéfinies
const PREDEFINED_ANSWERS: Record<string, string> = {
  "Quels sont mes droits en cas de loyers impayés ?": 
    "En tant que propriétaire, vous disposez de plusieurs recours face aux loyers impayés :\n\n" +
    "1. **Mise en demeure** : Premier pas formel pour réclamer le paiement\n" +
    "2. **Procédure de recouvrement** : Via un huissier pour les dettes\n" +
    "3. **Saisine de la Commission de coordination des actions de prévention des expulsions (CCAPEX)**\n" +
    "4. **Procédure d'expulsion** : En dernier recours, nécessite une décision de justice\n\n" +
    "Il est recommandé de privilégier d'abord le dialogue et les solutions amiables avant d'entamer des procédures judiciaires.",
  
  "Comment calculer la rentabilité d'un investissement locatif ?":
    "Le calcul de la rentabilité d'un investissement locatif se fait principalement de deux façons :\n\n" +
    "**1. Rentabilité brute** = (Loyer annuel × 12) ÷ Prix d'acquisition × 100\n" +
    "**2. Rentabilité nette** = (Loyer annuel × 12 - Charges annuelles) ÷ Prix d'acquisition × 100\n\n" +
    "Les charges à considérer incluent : taxe foncière, charges de copropriété non récupérables, assurance PNO, gestion locative, provision pour travaux et vacance locative, impôts sur les revenus fonciers.\n\n" +
    "Une bonne rentabilité nette se situe généralement au-dessus de 4% dans les grandes villes et 7% en zones rurales ou périurbaines.",
};

const AiChatBubble = () => {
  // États
  const [isOpen, setIsOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { hasActiveSubscription } = useUser();
  const { provider } = useAiProvider();

  // Fonction pour ouvrir/fermer le chat
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchAiSettings();
    }
  };

  // Gérer l'envoi du message avec Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        handleSendMessage();
      }
    }
  };

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Vérifier si c'est une question prédéfinie avec réponse statique
    const predefinedAnswer = PREDEFINED_ANSWERS[message.trim()];
    
    if (predefinedAnswer) {
      setIsLoading(true);
      
      const userMsg: Message = {
        id: messages.length + 1,
        content: message,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      
      const assistantMsg: Message = {
        id: messages.length + 2,
        content: predefinedAnswer,
        role: 'assistant',
        createdAt: new Date(Date.now() + 1000).toISOString(),
      };
      
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setMessage('');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Ajouter le message de l'utilisateur localement
      const userMessage: Message = {
        id: messages.length + 1,
        content: message,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Envoyer le message à l'API
      const payload = {
        content: message,
        conversationId: currentConversation?.id
      };

      const response = await apiRequest('/api/ai-assistant/message', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Si c'est une nouvelle conversation, mettre à jour l'ID de conversation
      if (response.conversation && !currentConversation) {
        setCurrentConversation(response.conversation);
      }
      
      // Ajouter la réponse de l'assistant
      if (response.message && response.message.assistantMessage) {
        const assistantMessage: Message = {
          id: response.message.assistantMessage.id,
          content: response.message.assistantMessage.content,
          role: 'assistant',
          createdAt: response.message.assistantMessage.created_at,
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Rafraîchir les paramètres AI pour avoir le quota à jour
      fetchAiSettings();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await apiRequest('/api/user/ai-settings', { method: 'GET' });
      setAiSettings(response);
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres IA:', error);
      // Définir des valeurs par défaut en cas d'échec de l'API
      setAiSettings({
        preferredModel: 'openai-gpt-3.5',
        quotaInfo: {
          currentUsage: 0,
          limit: 100
        }
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  // Mettre à jour le modèle préféré
  const updatePreferredModel = async (modelId: string) => {
    try {
      setLoadingSettings(true);
      const response = await apiRequest('/api/user/ai-settings', {
        method: 'POST',
        body: JSON.stringify({ preferredModel: modelId }),
      });
      
      setAiSettings(response);
      
      toast({
        title: 'Modèle mis à jour',
        description: `Votre modèle d'IA a été changé avec succès.`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du modèle:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le modèle.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  // Trouver le coût du modèle sélectionné
  const getSelectedModelCost = () => {
    if (!aiSettings?.preferredModel) return 1;
    const model = aiModels.find(m => m.id === aiSettings.preferredModel);
    return model?.quotaCost || 1;
  };

  // Défilement automatique vers le bas lors de nouveaux messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Message d'accueil initial
  useEffect(() => {
    if (isOpen && messages.length === 0 && !currentConversation) {
      setMessages([
        {
          id: 0,
          content: 'Bonjour, je suis votre assistant immobilier virtuel. Comment puis-je vous aider aujourd\'hui ?',
          role: 'assistant',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen, messages.length, currentConversation]);

  // Utiliser une question prédéfinie
  const usePresetQuery = (query: string) => {
    setMessage(query);
    setCurrentTab('chat');
  };

  // Zone en bas avec sélecteur de modèles et compteur de quota
  const renderModelSelector = () => {
    const quotaCost = getSelectedModelCost();
    
    return (
      <div className="mt-2 flex items-center justify-between">
        <div className="flex-1 max-w-[180px]">
          <Select
            value={aiSettings?.preferredModel || ''}
            onValueChange={updatePreferredModel}
            disabled={loadingSettings}
          >
            <SelectTrigger className="h-7 text-xs border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5" />
                <SelectValue placeholder="Sélectionner modèle" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {aiModels.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  {model.name} ({model.quotaCost} {model.quotaCost > 1 ? 'unités' : 'unité'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 bg-primary dark:bg-blue-400 rounded-full animate-pulse"></span>
              Coût: {quotaCost} {quotaCost > 1 ? 'unités' : 'unité'}/requête
            </span>
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Info className="h-3 w-3" />
                <span>
                  {loadingSettings 
                    ? "Chargement..." 
                    : `${aiSettings?.quotaInfo?.currentUsage || 0}/${aiSettings?.quotaInfo?.limit || 100} requêtes`}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Nombre de requêtes utilisées sur votre quota</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Settings Dialog */}
      <AiSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      
      {/* Interface de chat ouverte */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[450px] h-[650px] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 backdrop-filter backdrop-blur-sm">
          {/* En-tête avec effet de verre futuriste */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 p-4 text-white">
            {/* Animation de particules */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-[10%] left-[20%] w-2 h-2 bg-white/30 rounded-full animate-pulse" style={{ animationDuration: '3s' }}></div>
              <div className="absolute top-[50%] left-[80%] w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" style={{ animationDuration: '2.3s' }}></div>
              <div className="absolute top-[70%] left-[30%] w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDuration: '1.7s' }}></div>
            </div>
            
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-white/10 backdrop-filter backdrop-blur-sm p-2 rounded-xl border border-white/20 shadow-lg">
                  <Bot className="h-5 w-5 text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]" />
                </div>
                <div>
                  <h3 className="font-medium text-sm flex items-center gap-1.5">
                    <span>ImmoBot</span>
                    <span className="bg-blue-400/20 dark:bg-blue-300/20 text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-white/20">
                      IA
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs opacity-90 mt-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-blue-50">Expert immobilier virtuel</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowSettings(true)} 
                  className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 backdrop-blur-sm transition-all duration-200"
                  title="Paramètres avancés"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleChat} 
                  className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 backdrop-blur-sm transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Effet de planète/cercle lumineux */}
            <div className="absolute -right-10 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/30 to-indigo-500/30 blur-xl"></div>
            <div className="absolute -left-10 -top-12 w-24 h-24 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-600/20 blur-xl"></div>
          </div>
          
          {/* Navigation avec effet de verre */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <Tabs defaultValue="chat" value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="w-full h-9 bg-gray-100/80 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-0.5 rounded-lg">
                <TabsTrigger 
                  value="chat" 
                  className={cn(
                    "flex-1 h-full rounded-md text-xs flex items-center justify-center gap-1.5 transition-all duration-300",
                    currentTab === 'chat' 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-300 font-medium" 
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="help" 
                  className={cn(
                    "flex-1 h-full rounded-md text-xs flex items-center justify-center gap-1.5 transition-all duration-300",
                    currentTab === 'help' 
                      ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-300 font-medium" 
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Suggestions</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Onglet Chat */}
            {currentTab === 'chat' && (
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 p-4 bg-gray-50/60 dark:bg-gray-900/60 backdrop-filter backdrop-blur-sm">
                  <div className="space-y-4 pb-2">
                    {messages.map((msg, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "flex flex-col max-w-[80%] rounded-2xl p-4",
                          msg.role === 'user' 
                            ? 'ml-auto bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white shadow-md' 
                            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm'
                        )}
                      >
                        <div className={cn(
                          "text-xs mb-1.5",
                          msg.role === 'user' ? 'text-blue-100 self-end' : 'text-gray-500 dark:text-gray-400 self-start'
                        )}>
                          {msg.role === 'user' ? (
                            <span className="flex items-center gap-1">
                              <span>Vous</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></span>
                              <span>ImmoBot</span>
                              <span className="bg-blue-100 dark:bg-blue-900/40 text-[9px] px-1 py-0.25 rounded text-blue-700 dark:text-blue-300">IA</span>
                            </span>
                          )}
                        </div>
                        
                        <div className={cn(
                          "text-sm leading-relaxed",
                          msg.role === 'user' ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                        )}>
                          {msg.content}
                        </div>
                        
                        <div className={cn(
                          "text-[10px] mt-1.5 opacity-70", 
                          msg.role === 'user' ? 'self-start' : 'self-end'
                        )}>
                          {msg.createdAt && !isNaN(new Date(msg.createdAt).getTime()) 
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                    
                    {/* Indicateur de chargement pendant que l'IA répond */}
                    {isLoading && (
                      <div className="flex items-center space-x-2 rounded-2xl max-w-[70%] p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">ImmoBot réfléchit...</span>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef}></div>
                  </div>
                </ScrollArea>
                
                <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2 items-end">
                    <div className="relative flex-1">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Posez votre question immobilière..."
                        className="min-h-[60px] p-3 pr-12 text-sm border border-gray-200 dark:border-gray-700 rounded-xl resize-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-gray-200"
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 bottom-3">
                        <button
                          onClick={handleSendMessage}
                          disabled={!message.trim() || isLoading}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                            message.trim() && !isLoading 
                              ? "bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-700/20" 
                              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SendHorizontal className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {renderModelSelector()}
                </div>
              </div>
            )}
            
            {/* Onglet Questions */}
            {currentTab === 'help' && (
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 p-4 bg-gray-50/60 dark:bg-gray-900/60">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                      <span>Questions suggérées</span>
                    </h3>
                    
                    <div className="grid gap-2">
                      {PREDEFINED_QUERIES.map((query, i) => (
                        <div
                          key={i}
                          onClick={() => usePresetQuery(query.text)}
                          className="cursor-pointer overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 shadow-sm hover:shadow transition-all duration-200"
                        >
                          <div className="flex p-3">
                            <div 
                              className={cn(
                                "min-w-1 self-stretch mr-3 rounded-full",
                                query.category === 'legal' ? "bg-gradient-to-b from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700" :
                                query.category === 'financial' ? "bg-gradient-to-b from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700" :
                                query.category === 'maintenance' ? "bg-gradient-to-b from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700" : 
                                "bg-gradient-to-b from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700"
                              )}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">{query.text}</h4>
                                <Badge 
                                  className={cn(
                                    "ml-3 text-xs border",
                                    query.category === 'legal' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/60" :
                                    query.category === 'financial' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/60" :
                                    query.category === 'maintenance' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/60" : 
                                    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/60"
                                  )}
                                >
                                  {query.category === 'legal' ? 'Juridique' :
                                  query.category === 'financial' ? 'Financier' :
                                  query.category === 'maintenance' ? 'Entretien' : 'Général'}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Cliquez pour obtenir une réponse
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bouton de chat fermé */}
      {!isOpen && (
        <div className="relative">
          <Button
            onClick={toggleChat}
            className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 hover:shadow-blue-500/40 dark:hover:shadow-blue-700/40 transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
            <MessageSquare className="h-6 w-6 text-white" />
          </Button>
          
          <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-xs border-none font-medium py-1 px-1.5">
            <Sparkles className="h-3 w-3 mr-0.5" />
            IA
          </Badge>
        </div>
      )}
    </div>
  );
};

export default AiChatBubble;