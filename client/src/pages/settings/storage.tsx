import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Database, HardDrive, Save, Trash2, FileDown, Loader2, CreditCard, ArrowUpRight, RefreshCw, 
  Check, Medal, Shield, Zap, BarChart3, FileText, PieChart, Settings, Gauge, DollarSign, PlusCircle, 
  Clock, BadgeAlert, Clipboard, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StorageInfo {
  used: number;
  limit: number;
  usedFormatted: string;
  limitFormatted: string;
  percentUsed: number;
  tier: 'basic' | 'tier1' | 'tier2' | 'tier3' | 'tier4';
  lastUpdated: string;
  cleanupHistory: CleanupHistoryItem[];
}

interface CleanupHistoryItem {
  date: string;
  space_freed: number;
  files_removed: number;
}

interface StorageCategory {
  bytes: number;
  formatted: string;
}

interface FileStats {
  documentsSize: StorageCategory;
  databaseSize: StorageCategory;
  totalSize: StorageCategory;
  uploadsSize: StorageCategory;
}

interface TypeStat {
  type: string;
  count: number;
  totalSize: StorageCategory;
  percentage: number;
}

interface StorageStatistics {
  tables: any[];
  tablesByType: Record<string, any[]>;
  typeStats: TypeStat[];
  totals: any;
  fileStats: FileStats;
  lastUpdated: string;
}

interface SubscriptionInfo {
  id: number | null;
  planId: number;
  planName: string;
  startDate: string | null;
  billingCycle: 'monthly' | 'yearly' | null;
  nextBillingDate: string | null;
  paymentStatus: string | null;
  paymentHistory: PaymentRecord[];
  storageLimit: number;
  storageLimitFormatted: string;
  currentAmount: number;
  features: string[];
}

interface PaymentRecord {
  date: string;
  amount: number;
  status: string;
}

interface StoragePlanApiResponse {
  id: number;
  name: string;
  storageLimit: number;
  storageLimitFormatted: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

// Plans de stockage disponibles
const storagePlans: StoragePlanApiResponse[] = [
  {
    id: 1,
    name: 'basic',
    storageLimit: 5368709120,
    storageLimitFormatted: '5 GB',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Stockage de 5 GB',
      'Formats de fichiers standards',
      'Support par email'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'standard',
    storageLimit: 10737418240,
    storageLimitFormatted: '10 GB',
    priceMonthly: 9.99,
    priceYearly: 9.99 * 10,
    features: [
      'Stockage de 10 GB',
      'Formats de fichiers avancés',
      'Sauvegarde automatique',
      'Support prioritaire'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'pro',
    storageLimit: 21474836480,
    storageLimitFormatted: '20 GB',
    priceMonthly: 19.99,
    priceYearly: 19.99 * 10,
    features: [
      'Stockage de 20 GB',
      'Tous les formats de fichiers',
      'Analyse avancée des données',
      'Support prioritaire 24/7'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'premium',
    storageLimit: 53687091200,
    storageLimitFormatted: '50 GB',
    priceMonthly: 39.99,
    priceYearly: 39.99 * 10,
    features: [
      'Stockage de 50 GB',
      'Analyse de documents avancée',
      'Accès à toutes les fonctionnalités premium',
      'Support dédié'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 5,
    name: 'enterprise',
    storageLimit: 107374182400,
    storageLimitFormatted: '100 GB',
    priceMonthly: 79.99,
    priceYearly: 79.99 * 10,
    features: [
      'Stockage de 100 GB',
      'API dédiée',
      'Gestion multi-utilisateurs',
      'Conformité RGPD avancée',
      'Support prioritaire avec SLA'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function StorageSettingsPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Fonction pour formater une taille en octets en format lisible
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // États pour gérer les données de stockage
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);
  const [isExportRunning, setIsExportRunning] = useState(false);
  const [isRecalculatingStorage, setIsRecalculatingStorage] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // Récupérer le paramètre d'URL pour l'onglet à afficher
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam && ['overview', 'details', 'plans', 'history'].includes(tabParam) ? tabParam : "overview");
  
  // Mettre à jour l'URL quand l'onglet change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeTab]);

  // Requête pour récupérer les informations de stockage
  const { data: storageInfo, isLoading, refetch } = useQuery<StorageInfo>({
    queryKey: ['storage-info'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/storage-info');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des informations de stockage');
        }
        return await response.json();
      } catch (error) {
        console.error('Erreur:', error);
        // En développement, retourner des valeurs fictives
        if (process.env.NODE_ENV === 'development') {
          return {
            used: 1073741824, // 1 GB en octets
            limit: 5368709120, // 5 GB en octets
            usedFormatted: '1 GB',
            limitFormatted: '5 GB',
            percentUsed: 20,
            tier: 'basic' as const,
            lastUpdated: new Date().toISOString(),
            cleanupHistory: []
          };
        }
        throw error;
      }
    }
  });
  
  // Requête pour récupérer les statistiques détaillées
  const { data: storageStats, isLoading: isLoadingStats } = useQuery<StorageStatistics>({
    queryKey: ['storage-statistics'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/storage-statistics');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des statistiques de stockage');
        }
        return await response.json();
      } catch (error) {
        console.error('Erreur:', error);
        // En développement, retourner des valeurs fictives
        if (process.env.NODE_ENV === 'development') {
          return {
            tables: [],
            tablesByType: {},
            typeStats: [],
            totals: {},
            fileStats: {
              documentsSize: { bytes: 671088640, formatted: '640 MB' },
              databaseSize: { bytes: 209715200, formatted: '200 MB' },
              totalSize: { bytes: 880803840, formatted: '840 MB' },
              uploadsSize: { bytes: 0, formatted: '0 Bytes' }
            },
            lastUpdated: new Date().toISOString()
          };
        }
        throw error;
      }
    }
  });
  
  // Requête pour récupérer les plans de stockage disponibles
  const { data: availablePlans } = useQuery<StoragePlanApiResponse[]>({
    queryKey: ['storage-plans'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/storage-plans');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des plans de stockage');
        }
        return await response.json();
      } catch (error) {
        console.error('Erreur:', error);
        return [];
      }
    },
    initialData: storagePlans.map((plan, index) => ({
      id: index + 1,
      name: plan.name,
      storageLimit: plan.storageLimit,
      storageLimitFormatted: plan.storageLimitFormatted,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      features: plan.features,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  });
  
  // Requête pour récupérer l'abonnement actif de l'utilisateur
  const { data: subscription } = useQuery<SubscriptionInfo>({
    queryKey: ['storage-subscription'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/storage-subscription');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'abonnement');
        }
        return await response.json();
      } catch (error) {
        console.error('Erreur:', error);
        return null;
      }
    }
  });

  // Utiliser les vraies données des plans si disponibles
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  // Mutation pour exécuter le nettoyage du stockage
  const cleanupStorageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/storage-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du nettoyage du stockage');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['storage-statistics'] });
      toast({
        title: 'Nettoyage terminé',
        description: 'Les fichiers temporaires et en double ont été supprimés.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors du nettoyage',
      });
    }
  });
  
  // Mutation pour forcer le recalcul du stockage
  const recalculateStorageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/recalculate-storage', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du recalcul du stockage');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['storage-statistics'] });
      toast({
        title: 'Stockage recalculé',
        description: 'Les données de stockage ont été mises à jour.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors du recalcul',
      });
    }
  });
  
  // Mettre à jour la mutation pour la mise à niveau du plan
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planName, billingCycle }: { planName: string, billingCycle: 'monthly' | 'yearly' }) => {
      const response = await fetch('/api/user/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planName, billingCycle })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du plan');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['storage-info'] });
      toast({
        title: 'Plan mis à jour',
        description: 'Votre plan de stockage a été mis à jour avec succès.',
      });
      setActiveTab("overview");
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour du plan',
      });
    }
  });
  
  // Fonction pour lancer le nettoyage du stockage
  const handleCleanupStorage = async () => {
    setIsCleanupRunning(true);
    try {
      await cleanupStorageMutation.mutateAsync();
    } finally {
      setIsCleanupRunning(false);
    }
  };
  
  // Fonction pour forcer le recalcul du stockage
  const handleRecalculateStorage = async () => {
    setIsRecalculatingStorage(true);
    try {
      await recalculateStorageMutation.mutateAsync();
    } finally {
      setIsRecalculatingStorage(false);
    }
  };
  
  // Fonction pour lancer l'export des données
  const handleExportData = async () => {
    setIsExportRunning(true);
    try {
      const response = await fetch('/api/user/export-data', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'export des données');
      }
      
      // Si la requête est réussie, télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-donnees-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export terminé',
        description: 'Vos données ont été exportées avec succès.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'export',
      });
    } finally {
      setIsExportRunning(false);
    }
  };
  
  // Gérer la mise à niveau du forfait (mise à jour)
  const handleUpgradePlan = async () => {
    if (!selectedPlan) return;
    
    setIsUpgrading(true);
    try {
      await updatePlanMutation.mutateAsync({
        planName: selectedPlan,
        billingCycle
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'basic': return 'Basique (5 GB)';
      case 'tier1': return 'Standard (10 GB)';
      case 'tier2': return 'Pro (20 GB)';
      case 'tier3': return 'Premium (50 GB)';
      case 'tier4': return 'Entreprise (100 GB)';
      default: return 'Plan inconnu';
    }
  };
  
  // Calcul des pourcentages pour les catégories
  const calculateCategoryPercentages = () => {
    if (!storageStats || !storageStats.fileStats || !storageInfo) {
      return {
        documents: 0,
        database: 0,
        uploads: 0,
        other: 0
      };
    }
    
    const { documentsSize, databaseSize, uploadsSize, totalSize } = storageStats.fileStats;
    const total = totalSize.bytes || 1; // Éviter la division par zéro
    
    // Calculer les pourcentages
    const documentsPercent = Math.round((documentsSize.bytes / total) * 100);
    const databasePercent = Math.round((databaseSize.bytes / total) * 100);
    const uploadsPercent = Math.round((uploadsSize.bytes / total) * 100);
    
    // Le reste est classé comme "autre"
    const otherPercent = Math.max(0, 100 - documentsPercent - databasePercent - uploadsPercent);
    
    return {
      documents: documentsPercent,
      database: databasePercent,
      uploads: uploadsPercent,
      other: otherPercent
    };
  };
  
  const percentages = calculateCategoryPercentages();
  const lastUpdatedDate = storageInfo?.lastUpdated 
    ? new Date(storageInfo.lastUpdated).toLocaleString('fr-FR')
    : 'Non disponible';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/settings')}
            className="flex gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-7 w-7 text-cyan-500" />
            Stockage et données
          </h2>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRecalculateStorage}
          disabled={isRecalculatingStorage}
          className="flex gap-1"
        >
          {isRecalculatingStorage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>
      
      {/* Résumé de l'utilisation du stockage en haut */}
      {!isLoading && storageInfo && (
        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-6 shadow-sm border border-blue-100 dark:border-blue-900 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Gauge className="h-5 w-5 text-blue-500" />
                Utilisation du stockage
              </h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">
                    Utilisé: {storageInfo.usedFormatted}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Limite: {storageInfo.limitFormatted}
                  </span>
                </div>
                <Progress 
                  value={storageInfo.percentUsed} 
                  className="h-3 bg-blue-100" 
                  indicatorClassName={
                    storageInfo.percentUsed > 90 
                      ? "bg-red-500" 
                      : storageInfo.percentUsed > 75 
                        ? "bg-amber-500" 
                        : "bg-blue-500"
                  }
                />
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground mt-1">
                    {storageInfo.percentUsed}% de votre stockage utilisé
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernière mise à jour: {lastUpdatedDate}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => setActiveTab("plans")}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Augmenter mon stockage
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCleanupStorage}
                  disabled={isCleanupRunning}
                >
                  {isCleanupRunning ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Nettoyer
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportData}
                  disabled={isExportRunning}
                >
                  {isExportRunning ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-1" />
                  )}
                  Exporter
                </Button>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-800">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Forfait actuel</h4>
              <div className="text-2xl font-bold mb-2">{getTierName(storageInfo.tier)}</div>
              
              <div className="text-xs text-muted-foreground mb-3">
                {storageInfo.percentUsed > 80 ? (
                  <span className="text-amber-500 flex items-center gap-1">
                    <BadgeAlert className="h-3 w-3" />
                    Vous approchez de votre limite
                  </span>
                ) : (
                  <span>Stockage disponible</span>
                )}
              </div>
              
              <div className="flex gap-2 items-center mt-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setActiveTab("plans")}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Changer de forfait
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Accédez à plus de stockage</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Chargement des informations de stockage...</p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Détails</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Forfaits</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          </TabsList>
          
          <AnimatePresence mode="wait">
            {/* Onglet Aperçu */}
            <TabsContent value="overview">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Carte des statistiques par catégorie */}
                  {!isLoadingStats && storageStats && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="h-5 w-5 text-primary" />
                          Stockage par catégorie
                        </CardTitle>
                        <CardDescription>
                          Répartition de l'utilisation du stockage
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label>Documents et fichiers</Label>
                              <span className="text-sm text-muted-foreground">
                                {percentages.documents}% ({storageStats.fileStats.documentsSize.formatted})
                              </span>
                            </div>
                            <Progress value={percentages.documents} className="h-2" indicatorClassName="bg-blue-500" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label>Base de données</Label>
                              <span className="text-sm text-muted-foreground">
                                {percentages.database}% ({storageStats.fileStats.databaseSize.formatted})
                              </span>
                            </div>
                            <Progress value={percentages.database} className="h-2" indicatorClassName="bg-emerald-500" />
                          </div>
                          
                          {percentages.uploads > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label>Fichiers uploads</Label>
                                <span className="text-sm text-muted-foreground">{percentages.uploads}%</span>
                              </div>
                              <Progress value={percentages.uploads} className="h-2" indicatorClassName="bg-cyan-500" />
                            </div>
                          )}
                          
                          {percentages.other > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label>Autres</Label>
                                <span className="text-sm text-muted-foreground">{percentages.other}%</span>
                              </div>
                              <Progress value={percentages.other} className="h-2" indicatorClassName="bg-gray-400" />
                            </div>
                          )}
                          
                          <div ref={chartRef} className="py-2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Carte des actions et outils */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Outils de gestion
                      </CardTitle>
                      <CardDescription>
                        Options pour gérer votre stockage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                          <h4 className="font-medium text-sm">Nettoyage intelligent</h4>
                          <p className="text-sm text-muted-foreground">
                            Supprimez les fichiers temporaires et optimisez votre espace
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={handleCleanupStorage}
                            disabled={isCleanupRunning}
                            className="mt-1"
                          >
                            {isCleanupRunning ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Nettoyage en cours...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Nettoyer le stockage
                              </>
                            )}
                          </Button>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex flex-col space-y-2">
                          <h4 className="font-medium text-sm">Exportation des données</h4>
                          <p className="text-sm text-muted-foreground">
                            Téléchargez une copie de toutes vos données
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={handleExportData}
                            disabled={isExportRunning}
                            className="mt-1"
                          >
                            {isExportRunning ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Export en cours...
                              </>
                            ) : (
                              <>
                                <FileDown className="h-4 w-4 mr-2" />
                                Exporter mes données
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Résumé des statistiques en bas */}
                {!isLoadingStats && storageStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
                      <CardContent className="p-4">
                        <h3 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Taille totale</h3>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{storageStats.fileStats.totalSize.formatted}</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900">
                      <CardContent className="p-4">
                        <h3 className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Documents</h3>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{storageStats.fileStats.documentsSize.formatted}</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900">
                      <CardContent className="p-4">
                        <h3 className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Base de données</h3>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{storageStats.fileStats.databaseSize.formatted}</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900">
                      <CardContent className="p-4">
                        <h3 className="text-xs font-medium text-cyan-700 dark:text-cyan-300 mb-1">Uploads</h3>
                        <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{storageStats.fileStats.uploadsSize.formatted}</div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </motion.div>
            </TabsContent>
            
            {/* Onglet Détails */}
            <TabsContent value="details">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques détaillées</CardTitle>
                    <CardDescription>
                      Analyse approfondie de votre utilisation du stockage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStats ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : storageStats && storageStats.typeStats && storageStats.typeStats.length > 0 ? (
                      <div className="space-y-6">
                        <h3 className="text-md font-medium">Répartition par type de données</h3>
                        
                        <div className="space-y-4">
                          {storageStats.typeStats.map((stat, index) => (
                            <div key={stat.type} className="space-y-1">
                              <div className="flex justify-between">
                                <Label>{stat.type} ({stat.count} tables)</Label>
                                <span className="text-sm text-muted-foreground">
                                  {stat.percentage}% ({stat.totalSize.formatted})
                                </span>
                              </div>
                              <Progress 
                                value={stat.percentage} 
                                className="h-2" 
                                indicatorClassName={
                                  index === 0 ? "bg-indigo-500" : 
                                  index === 1 ? "bg-pink-500" : 
                                  index === 2 ? "bg-amber-500" : 
                                  index === 3 ? "bg-cyan-500" : 
                                  index === 4 ? "bg-emerald-500" : 
                                  "bg-slate-500"
                                } 
                              />
                            </div>
                          ))}
                        </div>
                        
                        <Separator className="my-6" />
                        
                        <div className="space-y-4">
                          <h3 className="text-md font-medium">Détails des tables</h3>
                          
                          <ScrollArea className="h-[300px] rounded-md border p-4">
                            <table className="w-full">
                              <thead>
                                <tr>
                                  <th className="text-left text-sm font-medium pb-2">Table</th>
                                  <th className="text-right text-sm font-medium pb-2">Type</th>
                                  <th className="text-right text-sm font-medium pb-2">Taille</th>
                                </tr>
                              </thead>
                              <tbody>
                                {storageStats.tables.map((table: any) => (
                                  <tr key={table.table_name} className="border-t">
                                    <td className="py-2 text-sm">{table.table_name}</td>
                                    <td className="py-2 text-sm text-right">{table.table_type}</td>
                                    <td className="py-2 text-sm text-right">{table.total_size?.formatted}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune statistique détaillée disponible</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
            
            {/* Onglet Forfaits */}
            <TabsContent value="plans">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Plans de stockage
                    </CardTitle>
                    <CardDescription>
                      Sélectionnez un plan correspondant à vos besoins
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-6">
                      {/* Sélecteur de cycle de facturation */}
                      <div className="flex items-center justify-center space-x-4 mb-6">
                        <Button
                          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                          onClick={() => setBillingCycle('monthly')}
                          className={billingCycle === 'monthly' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                        >
                          Mensuel
                        </Button>
                        <Button
                          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                          onClick={() => setBillingCycle('yearly')}
                          className={billingCycle === 'yearly' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                        >
                          Annuel <span className="ml-1 text-xs bg-blue-400 dark:bg-blue-700 px-2 py-0.5 rounded-full">-17%</span>
                        </Button>
                      </div>
                      
                      <RadioGroup 
                        defaultValue={storageInfo?.tier || 'basic'}
                        onValueChange={setSelectedPlan}
                        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                      >
                        {availablePlans.map((plan) => (
                          <div key={plan.id} className="col-span-1">
                            <RadioGroupItem
                              value={plan.name}
                              id={`plan-${plan.name}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`plan-${plan.name}`}
                              className={`flex flex-col p-4 border rounded-lg cursor-pointer hover:border-primary ${
                                plan.name === 'basic' ? 'bg-slate-100 border-slate-200' :
                                plan.name === 'standard' ? 'bg-blue-50 border-blue-200' :
                                plan.name === 'pro' ? 'bg-indigo-50 border-indigo-200' :
                                plan.name === 'premium' ? 'bg-purple-50 border-purple-200' :
                                'bg-amber-50 border-amber-200'
                              } ${
                                subscription?.planName === plan.name ? 'ring-2 ring-primary' : ''
                              } peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-lg">{
                                  plan.name === 'basic' ? 'Basique' :
                                  plan.name === 'standard' ? 'Standard' :
                                  plan.name === 'pro' ? 'Pro' :
                                  plan.name === 'premium' ? 'Premium' :
                                  'Entreprise'
                                }</span>
                                {plan.priceMonthly > 0 ? (
                                  <div className="text-right">
                                    <span className="font-bold text-xl">
                                      {billingCycle === 'monthly' ? plan.priceMonthly : (plan.priceYearly / 12).toFixed(2)} €
                                    </span>
                                    <span className="text-xs block text-muted-foreground">/mois</span>
                                    {billingCycle === 'yearly' && (
                                      <span className="text-xs block text-green-600 font-medium">
                                        {plan.priceYearly} €/an
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-semibold text-green-600 text-lg">Gratuit</span>
                                )}
                              </div>
                              
                              {plan.name === 'standard' && (
                                <div className="mt-1 flex items-center text-sm text-blue-600 font-medium">
                                  <Medal className="h-4 w-4 mr-1" />
                                  Recommandé
                                </div>
                              )}
                              
                              <div className="mt-2 text-lg font-medium text-primary">{plan.storageLimitFormatted}</div>
                              
                              <ul className="mt-4 space-y-2">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-center">
                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                    <span className="text-sm">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      
                      <div className="bg-muted p-4 rounded-md flex items-start gap-3 mt-4">
                        <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Paiement sécurisé</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Tous nos paiements sont sécurisés et traités par Stripe. Vos informations bancaires ne sont jamais stockées sur nos serveurs.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="border-t pt-6 flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("overview")}
                    >
                      Annuler
                    </Button>
                    
                    <Button 
                      onClick={handleUpgradePlan} 
                      disabled={!selectedPlan || isUpgrading || (subscription?.planName === selectedPlan && subscription?.billingCycle === billingCycle)}
                      className="gap-2"
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          {subscription?.planName === selectedPlan ? 'Changer de cycle' : 'Mettre à niveau'}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Besoin de plus?
                    </CardTitle>
                    <CardDescription>
                      Solutions personnalisées pour les grandes entreprises
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      Pour les entreprises ayant des besoins spécifiques ou nécessitant plus de 100 GB de stockage, 
                      nous proposons des solutions personnalisées avec des fonctionnalités avancées et un support dédié.
                    </p>
                    <Button variant="outline" className="mt-4">
                      Contactez notre équipe commerciale
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
            
            {/* Onglet Historique */}
            <TabsContent value="history">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Historique des actions
                    </CardTitle>
                    <CardDescription>
                      Suivi des actions de nettoyage et modifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {storageInfo && storageInfo.cleanupHistory && storageInfo.cleanupHistory.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-md font-medium">Historique des nettoyages</h3>
                        
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left text-sm font-medium py-2 px-4">Date</th>
                                <th className="text-right text-sm font-medium py-2 px-4">Espace libéré</th>
                                <th className="text-right text-sm font-medium py-2 px-4">Fichiers supprimés</th>
                              </tr>
                            </thead>
                            <tbody>
                              {storageInfo.cleanupHistory.map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}>
                                  <td className="py-3 px-4 text-sm">
                                    {new Date(item.date).toLocaleString('fr-FR')}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-right">
                                    {formatSize(item.space_freed)}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-right">
                                    {item.files_removed}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={() => {
                              // Fonction pour copier l'historique
                              const text = storageInfo.cleanupHistory
                                .map(item => `${new Date(item.date).toLocaleString('fr-FR')} - ${formatSize(item.space_freed)} - ${item.files_removed} fichiers`)
                                .join('\n');
                              navigator.clipboard.writeText(text);
                              toast({
                                title: 'Copié',
                                description: 'L\'historique a été copié dans le presse-papier',
                              });
                            }}
                          >
                            <Clipboard className="h-4 w-4 mr-1" />
                            Copier l'historique
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">Aucun historique disponible</h3>
                        <p className="text-sm text-muted-foreground">
                          L'historique des actions de nettoyage sera affiché ici après votre première opération.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      )}
    </motion.div>
  );
} 