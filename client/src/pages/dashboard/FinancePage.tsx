import React, { useEffect, useState, Suspense, lazy } from 'react';
import { ArrowUpRight, ArrowDownRight, Coins, Scale, CreditCard, RefreshCw } from 'lucide-react';
import { useTransactions, calculateIncome, calculateExpenses, calculateBalance, getCredits, getTotalRemainingCreditAmount, getTotalMonthlyPayments, formatEuro } from "@/hooks/useTransactions";
import { Card } from "@/components/ui/card";
import { Widget } from "@/lib/stores/useWidgetStore";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

// Chargement différé des widgets
const FinancialReportWidget = lazy(() => import("@/components/dashboard/widgets/FinancialWidgets").then(module => ({ default: module.FinancialReportWidget })));
const MonthlyEvolutionWidget = lazy(() => import("@/components/dashboard/widgets/FinancialWidgets").then(module => ({ default: module.MonthlyEvolutionWidget })));
const CompletedTransactionsTableWidget = lazy(() => import("@/components/dashboard/widgets/FinancialWidgets").then(module => ({ default: module.CompletedTransactionsTableWidget })));
const CashflowSankeyWidget = lazy(() => import("@/components/dashboard/widgets/CashflowSankeyWidget").then(module => ({ default: module.CashflowSankeyWidget })));

// Composant de chargement
function LoadingPlaceholder() {
  return (
    <Card className="p-4 h-40 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </Card>
  );
}

export default function FinancePage() {
  const { data: transactions, isLoading, refetch } = useTransactions();
  const queryClient = useQueryClient();
  const [showSankey, setShowSankey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Rafraîchissement automatique toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      // Invalider le cache pour forcer un rafraîchissement complet
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Debug - afficher les transactions dans la console pour analyse
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      console.log("FinancePage - Transactions chargées:", transactions.length);
      
      // Analyse des statuts
      const pendingCount = transactions.filter(t => t.status === 'pending').length;
      const completedCount = transactions.filter(t => t.status === 'completed').length;
      const unknownCount = transactions.length - pendingCount - completedCount;
      
      console.log(`Statuts: ${pendingCount} pending, ${completedCount} completed, ${unknownCount} non catégorisées`);
      
      // Analyse des types
      const incomeCount = transactions.filter(t => t.type === 'income').length;
      const expenseCount = transactions.filter(t => t.type === 'expense').length;
      const creditCount = transactions.filter(t => t.type === 'credit').length;
      const unknownTypeCount = transactions.length - incomeCount - expenseCount - creditCount;
      
      console.log(`Types: ${incomeCount} revenus, ${expenseCount} dépenses, ${creditCount} crédits, ${unknownTypeCount} non catégorisés`);
      
      // Analyse des montants
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        
      const totalCredit = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      console.log(`Montants: Revenus ${totalIncome}€, Dépenses ${totalExpense}€, Crédits ${totalCredit}€`);
      
      // Exemples de transactions
      console.log("Exemples de transactions:", transactions.slice(0, 3));
    }
  }, [transactions]);
  
  // Extraire les crédits/prêts pour les widgets dédiés
  const credits = transactions ? getCredits(transactions) : [];
  
  // Configuration du widget Sankey
  const sankeyWidget: Widget = {
    id: "cashflow-sankey-diagram",
    type: "cashflow-sankey-diagram",
    title: "Flux Financiers (Sankey)",
    category: "finance",
    context: "dashboard",
    position: { x: 0, y: 0 },
    size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
    displaySize: "large",
    importance: "normal",
    collapsed: false,
    pinned: false,
    visible: true,
    order: 1
  };
  
  // Charger le widget Sankey après un délai
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSankey(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="flex flex-col max-w-7xl mx-auto p-4 md:p-6 min-h-screen">
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6 text-blue-600 dark:text-blue-400" /> 
          Finances
        </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
        <p className="text-muted-foreground">Gérez et suivez vos transactions financières</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mt-6">
        <Card className="p-4">
          <h2 className="text-xl font-bold mb-2">Statut des transactions dans le tableau de bord</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-lg font-semibold">{transactions?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total transactions</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
              <p className="text-lg font-semibold">{transactions?.filter(t => t.status === 'pending').length || 0}</p>
              <p className="text-sm text-muted-foreground">Transactions en attente</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-lg font-semibold">{transactions?.filter(t => t.status === 'completed').length || 0}</p>
              <p className="text-sm text-muted-foreground">Transactions complétées</p>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Suspense fallback={<LoadingPlaceholder />}>
          <FinancialReportWidget />
        </Suspense>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mt-6">
        <Suspense fallback={<LoadingPlaceholder />}>
          <MonthlyEvolutionWidget />
        </Suspense>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mt-6">
        <Suspense fallback={<LoadingPlaceholder />}>
          <CompletedTransactionsTableWidget />
        </Suspense>
      </div>
      
      {showSankey && (
        <div className="grid grid-cols-1 gap-6 mt-6">
          <Suspense fallback={<LoadingPlaceholder />}>
            <div className="overflow-auto max-h-[600px] rounded-xl">
              <CashflowSankeyWidget 
                widget={sankeyWidget}
                transactions={transactions}
                period="month"
                transactionStatus="all"
              />
            </div>
          </Suspense>
        </div>
      )}
    </div>
  );
} 