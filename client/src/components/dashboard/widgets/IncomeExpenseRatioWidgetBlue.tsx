import { motion } from "framer-motion";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  BarChart,
  CreditCard,
  RefreshCw,
  XCircle,
  FolderX,
  Info,
  Code
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { 
  useTransactions, 
  formatEuro
} from "@/hooks/useTransactions";

type TimeRangePeriod = 'month' | 'quarter' | 'year' | 'all';
type TransactionStatus = 'all' | 'pending' | 'completed';

// Widget Ratio Revenus/Dépenses - Version Bleue
export function IncomeExpenseRatioWidgetBlue() {
  const { data: transactions, isLoading, error, refetch, isRefetching } = useTransactions();
  const [period, setPeriod] = useState<TimeRangePeriod>('month');
  const [status, setStatus] = useState<TransactionStatus>('all');
  const [debugMode, setDebugMode] = useState(false);
  
  // Toggle le mode débogage
  const toggleDebugMode = () => setDebugMode(!debugMode);
  
  // Gestion du rafraîchissement des données
  const handleRefresh = () => {
    refetch();
  };
  
  // Déterminer la période pour le filtre
  const getTimeRange = () => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        // Aucune limite de date pour "toutes périodes"
        start.setFullYear(1900); // Une date très ancienne pour inclure pratiquement tout
        break;
    }
    
    return { start, end: now };
  };
  
  if (isLoading) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <Skeleton className="h-8 w-48 bg-blue-100 dark:bg-blue-900/20" />
          <Skeleton className="h-4 w-24 mt-2 bg-blue-100 dark:bg-blue-900/20" />
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 items-center justify-center h-[380px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-blue-600 dark:text-blue-400 text-sm">Chargement des données...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <BarChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Ratio Revenus/Dépenses
          </CardTitle>
          <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
            Visibilité sur l'équilibre financier
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 items-center justify-center h-[380px]">
            <XCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className="text-lg font-semibold text-red-600">Erreur de chargement</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Impossible de récupérer les données. Veuillez réessayer plus tard.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Si pas de transactions
  if (!transactions || transactions.length === 0) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <BarChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Ratio Revenus/Dépenses
          </CardTitle>
          <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
            Visibilité sur l'équilibre financier
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 items-center justify-center h-[380px]">
            <FolderX className="h-12 w-12 text-blue-400 opacity-50" />
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Aucune transaction</p>
              <p className="text-sm text-blue-500/70 dark:text-blue-400/70 max-w-xs mx-auto">
                Ajoutez des transactions pour visualiser le ratio entre vos revenus et vos dépenses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Filtrer les transactions pour la période et le statut sélectionnés
  const { start, end } = getTimeRange();
  const filteredTransactions = transactions.filter(t => {
    // Vérifier le statut d'abord
    const matchesStatus = status === 'all' || t.status === status;
    
    // Si on a choisi toutes les périodes, on ne filtre pas par date
    if (period === 'all') {
      return matchesStatus;
    }
    
    // Sinon, on vérifie si la date est dans la période
    try {
    const date = new Date(t.date);
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.warn("Date invalide trouvée:", t.date, "pour la transaction:", t);
        return false;
      }
      return date >= start && date <= end && matchesStatus;
    } catch (e) {
      console.warn("Erreur lors de l'analyse de la date:", t.date, "pour la transaction:", t, e);
      return false;
    }
  });
  
  // Calculer les montants pour la période sélectionnée
  const periodIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const periodExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const periodCredits = filteredTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  // Éviter la division par zéro
  const ratio = periodExpenses > 0 ? (periodIncome / periodExpenses) : periodIncome > 0 ? Infinity : 0;
  const ratioDisplay = ratio === Infinity ? "∞" : ratio.toFixed(2);
  const isGoodRatio = ratio >= 1;
  
  // Fonction pour obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch (period) {
      case 'month': return 'dernier mois';
      case 'quarter': return 'dernier trimestre';
      case 'year': return 'dernière année';
      case 'all': return 'toutes périodes';
      default: return '';
    }
  };
  
  // Gérer le changement de période
  const handlePeriodChange = (value: TimeRangePeriod) => {
    setPeriod(value);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-shrink-1 min-w-0 max-w-full">
              <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  <BarChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="truncate">Ratio Revenus/Dépenses</span>
                {period !== 'month' && (
                  <Badge variant="outline" className="ml-2 whitespace-nowrap border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    {getPeriodLabel()}
                  </Badge>
                )}
                {status !== 'all' && (
                  <Badge variant="outline" className="ml-2 whitespace-nowrap border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    {status === 'pending' ? 'En attente' : 'Terminées'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                <span className="block">
                  {isGoodRatio 
                    ? 'Vous dépensez moins que vos revenus' 
                    : 'Vos dépenses dépassent vos revenus'}
                </span>
                <span className="text-blue-600/60 dark:text-blue-400/60 block">
                  {filteredTransactions.length} transactions pour {getPeriodLabel()}
                </span>
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-shrink-0 gap-2">
              <div className="w-full sm:w-36">
                <Select
                  value={period}
                  onValueChange={(value) => setPeriod(value as TimeRangePeriod)}
                >
                  <SelectTrigger className="h-8 border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent className="border-blue-200 dark:border-blue-800">
                    <SelectItem value="month">Dernier mois</SelectItem>
                    <SelectItem value="quarter">Dernier trimestre</SelectItem>
                    <SelectItem value="year">Dernière année</SelectItem>
                    <SelectItem value="all">Toutes périodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-36">
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as TransactionStatus)}
                >
                  <SelectTrigger className="h-8 border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="border-blue-200 dark:border-blue-800">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="completed">Terminées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {debugMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Actualiser
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center">
            <div className="mb-6 flex flex-col items-center">
              <div className={`text-4xl font-bold px-6 py-3 rounded-xl ${
                isGoodRatio 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
              }`}>
                {ratioDisplay}
              </div>
              <div className="mt-2 text-sm font-medium">
                <span className={`px-3 py-1 rounded-full ${
                  isGoodRatio 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                {isGoodRatio ? 'Bon ratio' : 'À améliorer'}
                </span>
              </div>
            </div>
            
            <div className="w-full max-w-md">
              {ratio === Infinity ? (
                <div className="flex flex-col items-center justify-center gap-2 mb-4">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Pas de dépenses {period !== 'all' ? `pour ${getPeriodLabel()}` : ''}
                  </p>
                </div>
              ) : periodIncome === 0 && periodExpenses === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                    <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-center text-blue-600/80 dark:text-blue-400/70">
                    Aucune transaction {period !== 'all' ? `pour ${getPeriodLabel()}` : ''}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className={`flex flex-col items-center p-3 rounded-lg ${
                      isGoodRatio ? 'bg-green-50 dark:bg-green-900/20' : ''
                    }`}>
                      <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5 mb-1">
                        <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-medium mb-1">Revenus</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatEuro(periodIncome)}</span>
                    </div>
                    
                    <div className={`flex flex-col items-center p-3 rounded-lg ${
                      !isGoodRatio ? 'bg-red-50 dark:bg-red-900/20' : ''
                    }`}>
                      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-1.5 mb-1">
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      </div>
                      <span className="text-xs font-medium mb-1">Dépenses</span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatEuro(periodExpenses)}</span>
                    </div>
                    
                    <div className="flex flex-col items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5 mb-1">
                        <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-medium mb-1">Crédits</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatEuro(periodCredits)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-blue-100 dark:border-blue-900/30 pt-3">
                    <div className="text-center">
                      <p className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70">
                        {isGoodRatio 
                          ? `Pour chaque €1 dépensé, vous gagnez ${ratioDisplay}€`
                          : `Pour chaque €1 gagné, vous dépensez ${(1/ratio).toFixed(2)}€`}
                      </p>
                      
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                          <span className="text-xs text-blue-600/70 dark:text-blue-400/70 block mb-0.5">Total revenus</span>
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                            {formatEuro(periodIncome)}
                          </span>
                        </div>
                        
                        <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                          <span className="text-xs text-blue-600/70 dark:text-blue-400/70 block mb-0.5">Total dépenses</span>
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                            {formatEuro(periodExpenses)}
                          </span>
                        </div>
                      </div>
                      
                      {period !== 'month' && (
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
                          Période: {getPeriodLabel()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Bouton debug caché */}
          <div className="absolute bottom-2 right-2 opacity-30 hover:opacity-100">
            <button
              className="text-xs text-blue-600/60 dark:text-blue-400/60 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={toggleDebugMode}
            >
              <Code className="h-3 w-3" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 