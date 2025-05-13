import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowLeft, Zap, Loader2, CreditCard, Check, 
  Plus, AlertTriangle, BarChart3, ChevronRight, 
  Brain, Sparkles, BadgeCheck, TrendingUp, Star,
  Shield, LucideIcon, PieChart, Info, Gauge, History,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AreaChart } from "@/components/ui/area-chart";
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TokenPlan {
  id: number;
  name: string;
  tokens: number;
  price: number;
  description: string;
  features: string[];
  icon: LucideIcon;
  color: string;
  backgroundColor: string;
  recommended?: boolean;
}

interface TokenBalance {
  balance: number;
  plan: string;
  requestCount: number;
  requestLimit: number;
  monthlyResetDate?: string;
  nextResetDate?: string;
}

interface TokenUsage {
  id: number;
  userId: number;
  messageId?: number;
  conversationId?: number;
  tokensUsed: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  createdAt: string;
}

interface UsageChartData {
  date: string;
  tokens: number;
}

// Plans de crédits IA disponibles
const tokenPlans: TokenPlan[] = [
  {
    id: 1,
    name: "Basique",
    tokens: 100,
    price: 9.99,
    description: "Plan basique pour une utilisation occasionnelle",
    features: [
      "100 tokens inclus",
      "Accès au modèle GPT-3.5",
      "Validité de 30 jours",
      "Support par email"
    ],
    icon: Check,
    color: "text-slate-600",
    backgroundColor: "bg-slate-100"
  },
  {
    id: 2,
    name: "Standard",
    tokens: 150,
    price: 14.99,
    description: "Pour une utilisation régulière de l'assistant IA",
    features: [
      "150 tokens inclus",
      "Accès au modèle GPT-3.5",
      "Validité de 30 jours",
      "Support prioritaire par email"
    ],
    icon: Zap,
    color: "text-blue-600",
    backgroundColor: "bg-blue-100"
  },
  {
    id: 3,
    name: "Pro",
    tokens: 300,
    price: 24.99,
    description: "Pour les professionnels avec une utilisation intensive",
    features: [
      "300 tokens inclus",
      "Accès aux modèles GPT-3.5 et GPT-4",
      "Validité de 60 jours",
      "Support prioritaire"
    ],
    icon: BadgeCheck,
    color: "text-amber-600",
    backgroundColor: "bg-amber-100",
    recommended: true
  },
  {
    id: 4,
    name: "Entreprise",
    tokens: 0,
    price: 0,
    description: "Solution illimitée idéale pour les équipes et entreprises",
    features: [
      "Tokens illimités (sur devis)",
      "Accès à tous les modèles, incluant GPT-4",
      "API dédiée et intégrations personnalisées",
      "Support client dédié",
      "Facturation mensuelle ou annuelle"
    ],
    icon: Brain,
    color: "text-indigo-600",
    backgroundColor: "bg-indigo-100"
  }
];

export default function AITokensPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("apercu");
  
  // États pour gérer les données
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TokenPlan | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  
  // Requête pour récupérer le solde de tokens
  const { data: tokenBalance, isLoading: isLoadingBalance } = useQuery<TokenBalance>({
    queryKey: ['token-balance'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ai-assistant/tokens/balance');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du solde de tokens');
        }
        const data = await response.json();
        return data.balance ? {
          balance: data.balance.balance,
          plan: data.balance.plan || 'free',
          requestCount: data.balance.requestCount || 0,
          requestLimit: data.balance.requestLimit || 100,
          monthlyResetDate: data.balance.monthlyResetDate,
          nextResetDate: data.balance.nextResetDate
        } : { 
          balance: 0, 
          plan: 'free', 
          requestCount: 0, 
          requestLimit: 100 
        };
      } catch (error) {
        console.error('Erreur:', error);
        // En développement, retourner des valeurs fictives
        return { 
          balance: 1000, 
          plan: 'free', 
          requestCount: 25, 
          requestLimit: 100,
          nextResetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        };
      }
    },
  });

  // Requête pour récupérer l'historique d'utilisation
  const { data: tokenUsage, isLoading: isLoadingTokenUsage } = useQuery<TokenUsage[]>({
    queryKey: ['token-usage'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/ai-assistant/tokens/usage');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'historique d\'utilisation');
        }
        const data = await response.json();
        return data.usage && Array.isArray(data.usage) ? data.usage : [];
      } catch (error) {
        console.error('Erreur:', error);
        // En développement, retourner des valeurs fictives
        return Array(10).fill(null).map((_, i) => ({
          id: i + 1,
          userId: 1,
          messageId: i + 100,
          conversationId: Math.floor(i / 3) + 1,
          tokensUsed: Math.floor(Math.random() * 300) + 50,
          model: i % 3 === 0 ? 'openai-gpt-4o' : 'openai-gpt-3.5',
          promptTokens: Math.floor(Math.random() * 200) + 20,
          completionTokens: Math.floor(Math.random() * 100) + 30,
          cost: (Math.random() * 0.02).toFixed(4),
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        }));
      }
    },
  });

  // Animation du compteur de tokens
  const counterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (counterRef.current && tokenBalance && !isLoadingBalance) {
      let count = 0;
      const target = tokenBalance.balance;
      const duration = 1500;
      const frameDuration = 1000 / 60;
      const totalFrames = Math.round(duration / frameDuration);
      const increment = target / totalFrames;

      const timer = setInterval(() => {
        count += increment;
        if (count >= target) {
          count = target;
          clearInterval(timer);
        }
        
        if (counterRef.current) {
          counterRef.current.textContent = Math.floor(count).toLocaleString();
        }
      }, frameDuration);

      return () => clearInterval(timer);
    }
  }, [tokenBalance, isLoadingBalance]);

  // Mutation pour acheter des tokens
  const buyTokensMutation = useMutation({
    mutationFn: async (planId: number) => {
      // Simuler un appel API pour l'achat de tokens
      return new Promise<{ success: boolean, message: string }>((resolve) => {
        setTimeout(() => {
          resolve({ 
            success: true, 
            message: 'Achat de tokens réussi' 
          });
        }, 1500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-balance'] });
      toast({
        title: "Achat réussi",
        description: `Votre compte a été crédité de ${selectedPlan?.tokens} tokens.`
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'achat de tokens."
      });
    },
  });

  // Gérer le processus d'achat de tokens
  const handleBuyTokens = async (plan: TokenPlan) => {
    setSelectedPlan(plan);
    setIsProcessingPayment(true);
    
    try {
      await buyTokensMutation.mutateAsync(plan.id);
    } finally {
      setIsProcessingPayment(false);
      setSelectedPlan(null);
    }
  };
  
  // Gérer la demande de devis pour le plan Entreprise
  const handleRequestQuote = (plan: TokenPlan) => {
    toast({
      title: "Demande de devis envoyée",
      description: "Notre équipe commerciale vous contactera sous 24 heures pour discuter de vos besoins spécifiques.",
    });
  };
  
  // Préparer les données pour le graphique d'utilisation
  const usageChartData = tokenUsage ? tokenUsage
    .slice(0, 30) // Limiter à 30 jours
    .reverse() // Du plus ancien au plus récent
    .map(entry => ({
      date: new Date(entry.createdAt).toLocaleDateString('fr-FR'),
      tokens: entry.tokensUsed
    })) : [];

  // Formater la date de réinitialisation
  const formatResetDate = (dateString?: string) => {
    if (!dateString) return 'Non disponible';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  };

  // Calculer le pourcentage d'utilisation des requêtes
  const requestPercentage = tokenBalance ? (tokenBalance.requestCount / tokenBalance.requestLimit) * 100 : 0;
  
  // Fonction pour obtenir la classe de couleur en fonction du pourcentage
  const getProgressColor = (percentage: number): string => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-amber-500";
    return "bg-red-500";
  };

  // Calculer des statistiques d'utilisation pour le tableau de bord
  const getTotalTokensUsed = () => {
    if (!tokenUsage || tokenUsage.length === 0) return 0;
    const total = tokenUsage.reduce((acc, entry) => acc + (Number(entry.tokensUsed) || 0), 0);
    return isNaN(total) ? 0 : total;
  };

  const getAverageTokensPerDay = () => {
    if (!tokenUsage || tokenUsage.length === 0) return 0;
    const total = getTotalTokensUsed();
    // Identifier les jours uniques
    const uniqueDates = new Set(tokenUsage.map(entry => {
      const date = new Date(entry.createdAt);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }));
    const days = uniqueDates.size || 1; // Au moins 1 jour pour éviter division par zéro
    const average = Math.round(total / days);
    return isNaN(average) ? 0 : average;
  };

  const getModelDistribution = () => {
    if (!tokenUsage || tokenUsage.length === 0) return { gpt4: 0, gpt3: 0 };
    
    const gpt4Count = tokenUsage.filter(entry => 
      entry.model && (entry.model.includes('gpt-4') || entry.model.includes('gpt4'))
    ).length;
    
    return {
      gpt4: gpt4Count || 0,
      gpt3: (tokenUsage.length - gpt4Count) || 0
    };
  };

  const getTotalCost = () => {
    if (!tokenUsage || tokenUsage.length === 0) return 0;
    const total = tokenUsage.reduce((acc, entry) => acc + (Number(entry.cost) || 0), 0);
    return isNaN(total) ? 0 : total;
  };

  // Déterminer le niveau actuel du plan
  const getCurrentPlanLevel = () => {
    if (!tokenBalance) return 'free';
    return tokenBalance.plan;
  };

  // Synchroniser manuellement les données d'utilisation
  const handleSyncUsage = async () => {
    try {
      setIsLoadingUsage(true);
      await fetch('/api/ai-assistant/sync-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      toast({
        title: "Données synchronisées",
        description: "Les statistiques d'utilisation ont été mises à jour avec succès.",
      });
      
      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['token-usage'] });
      queryClient.invalidateQueries({ queryKey: ['token-balance'] });
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les données d'utilisation.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const modelDistribution = getModelDistribution();

  return (
    <div className="container max-w-6xl py-8">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setLocation('/settings')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestion des Tokens IA</h1>
            <p className="text-muted-foreground">
              Gérez vos crédits d'intelligence artificielle
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="forfaits">Forfaits</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* ONGLET APERÇU */}
        <TabsContent value="apercu" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Solde de tokens */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Solde actuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingBalance ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center">
                      <div ref={counterRef} className="text-4xl font-bold mb-1">
                        {tokenBalance?.balance.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">tokens disponibles</div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Requêtes mensuelles</span>
                        <span>{tokenBalance?.requestCount}/{tokenBalance?.requestLimit}</span>
                      </div>
                      <Progress 
                        value={requestPercentage} 
                        className="h-2"
                        indicatorClassName={getProgressColor(requestPercentage)}
                      />
                      {tokenBalance?.nextResetDate && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Réinitialisation le {formatResetDate(tokenBalance.nextResetDate)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-center pt-0">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("forfaits")}
                  className="w-full"
                >
                  Acheter des tokens
                </Button>
              </CardFooter>
            </Card>

            {/* Statistiques d'utilisation */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-blue-500" />
                  Statistiques d'utilisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTokenUsage ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Total utilisé</div>
                      <div className="text-2xl font-semibold">{getTotalTokensUsed().toLocaleString()}</div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Moy. par jour</div>
                      <div className="text-2xl font-semibold">{getAverageTokensPerDay().toLocaleString()}</div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">GPT-4</div>
                      <div className="text-2xl font-semibold">{modelDistribution.gpt4}</div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">GPT-3.5</div>
                      <div className="text-2xl font-semibold">{modelDistribution.gpt3}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Graphique d'utilisation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Consommation (30 derniers jours)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {isLoadingTokenUsage ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : usageChartData.length > 0 ? (
                <AreaChart 
                  data={usageChartData}
                  index="date"
                  categories={["tokens"]}
                  colors={["blue"]}
                  className="h-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">Aucune donnée disponible</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Utilisez l'assistant IA pour générer des données d'utilisation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET FORFAITS */}
        <TabsContent value="forfaits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-500" />
                Acheter des tokens
              </CardTitle>
              <CardDescription>
                Sélectionnez un forfait adapté à vos besoins d'IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tokenPlans.map((plan) => (
                  <div 
                    key={plan.id}
                    className={cn(
                      "relative border rounded-xl p-5",
                      plan.recommended && "border-amber-500 shadow-lg"
                    )}
                  >
                    {plan.recommended && (
                      <Badge 
                        className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-amber-500 hover:bg-amber-500/90"
                      >
                        Recommandé
                      </Badge>
                    )}
                    
                    <div className="flex items-start gap-3 mb-4">
                      <div className={cn(
                        "rounded-lg p-2 w-8 h-8 flex items-center justify-center",
                        plan.backgroundColor,
                        plan.color
                      )}>
                        <plan.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{plan.description}</p>
                      </div>
                    </div>
                    
                    {plan.name !== 'Entreprise' ? (
                      <div className="mb-4">
                        <div className="text-2xl font-bold">{plan.price.toFixed(2)} €</div>
                        <div className="text-sm text-muted-foreground">
                          {plan.tokens.toLocaleString()} tokens
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="text-2xl font-bold">Sur devis</div>
                        <div className="text-sm text-muted-foreground">Tokens illimités</div>
                      </div>
                    )}
                    
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={cn(
                        "w-full",
                        plan.recommended ? "bg-amber-500 hover:bg-amber-600" : ""
                      )}
                      variant={plan.recommended ? "default" : "outline"}
                      disabled={isProcessingPayment && selectedPlan?.id === plan.id}
                      onClick={() => plan.name === "Entreprise" ? handleRequestQuote(plan) : handleBuyTokens(plan)}
                    >
                      {isProcessingPayment && selectedPlan?.id === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span>Traitement...</span>
                        </>
                      ) : (
                        <span>{plan.name === "Entreprise" ? "Demander un devis" : "Acheter"}</span>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Informations sur les forfaits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <p>
                  Les tokens sont essentiels pour interagir avec notre IA. Ils représentent les unités de 
                  calcul utilisées pour traiter vos demandes et générer des réponses.
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Quand les tokens sont-ils utilisés ?</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Lorsque vous posez une question à l'assistant IA</li>
                    <li>Pour générer des rapports automatisés</li>
                    <li>Pour l'analyse de documents et contrats</li>
                    <li>Pour les suggestions d'optimisation immobilière</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Comment économiser des tokens ?</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Posez des questions précises et concises</li>
                    <li>Utilisez GPT-3.5 pour les tâches simples (moins coûteux)</li>
                    <li>Réservez GPT-4 pour les analyses complexes</li>
                    <li>Archivez les conversations terminées</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET HISTORIQUE */}
        <TabsContent value="historique" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <History className="h-5 w-5 text-cyan-500" />
                Historique d'utilisation
              </CardTitle>
              <CardDescription>
                Détail de vos utilisations récentes des services IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTokenUsage ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : tokenUsage && tokenUsage.length > 0 ? (
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
                  {tokenUsage.map((entry, index) => (
                    <div 
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          entry.model.includes('gpt-4') || entry.model.includes('gpt4') 
                            ? 'bg-purple-100 text-purple-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          <Brain className="h-4 w-4" />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="px-1 h-5 text-xs">
                              {entry.model.includes('gpt-4') || entry.model.includes('gpt4') ? 'GPT-4' : 'GPT-3.5'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString('fr-FR')} à {new Date(entry.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-sm mt-0.5">
                            <span className="font-medium">{entry.tokensUsed}</span>
                            <span className="text-muted-foreground"> tokens utilisés</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">{Number(entry.cost).toFixed(4)} €</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.promptTokens} + {entry.completionTokens} tokens
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-medium text-lg">Aucun historique disponible</h3>
                  <p className="text-muted-foreground mt-1 max-w-md">
                    Votre historique d'utilisation apparaîtra ici dès que vous commencerez 
                    à utiliser l'assistant IA dans l'application.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t py-3 flex justify-between">
              <div className="text-sm text-muted-foreground">
                {tokenUsage && tokenUsage.length > 0 && (
                  <>Total: {tokenUsage.length} entrées</>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncUsage}
                  disabled={isLoadingTokenUsage}
                >
                  {isLoadingTokenUsage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Synchronisation...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Synchroniser
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['token-usage'] })}
                >
                  Rafraîchir
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <PieChart className="h-5 w-5 text-indigo-500" />
                Résumé de consommation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="text-3xl font-bold">{getTotalTokensUsed().toLocaleString()}</div>
                  <div className="text-sm">
                    <div className="font-medium">Tokens totaux utilisés</div>
                    <div className="text-muted-foreground">depuis le début</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-3xl font-bold">{getTotalCost().toFixed(2)} €</div>
                  <div className="text-sm">
                    <div className="font-medium">Coût total</div>
                    <div className="text-muted-foreground">estimé</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-3xl font-bold">{tokenUsage?.length || 0}</div>
                  <div className="text-sm">
                    <div className="font-medium">Requêtes IA</div>
                    <div className="text-muted-foreground">effectuées</div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Répartition par modèle</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>GPT-3.5</span>
                        <span>{modelDistribution.gpt3} requêtes</span>
                      </div>
                      <Progress 
                        value={tokenUsage && tokenUsage.length > 0 ? (modelDistribution.gpt3 / tokenUsage.length * 100) : 0} 
                        className="h-2"
                        indicatorClassName="bg-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>GPT-4</span>
                        <span>{modelDistribution.gpt4} requêtes</span>
                      </div>
                      <Progress 
                        value={tokenUsage && tokenUsage.length > 0 ? (modelDistribution.gpt4 / tokenUsage.length * 100) : 0} 
                        className="h-2"
                        indicatorClassName="bg-purple-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Plan actuel</h4>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          getCurrentPlanLevel() === 'premium' || getCurrentPlanLevel() === 'enterprise'
                            ? 'bg-amber-100 text-amber-600' 
                            : getCurrentPlanLevel() === 'basic'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {getCurrentPlanLevel() === 'premium' || getCurrentPlanLevel() === 'enterprise' ? (
                            <Star className="h-4 w-4" />
                          ) : getCurrentPlanLevel() === 'basic' ? (
                            <Zap className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </div>
                        <div className="font-medium">
                          {getCurrentPlanLevel() === 'premium' ? 'Pro' : 
                           getCurrentPlanLevel() === 'enterprise' ? 'Entreprise' :
                           getCurrentPlanLevel() === 'basic' ? 'Standard' : 'Basique'}
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("forfaits")}>
                        Mettre à niveau
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 