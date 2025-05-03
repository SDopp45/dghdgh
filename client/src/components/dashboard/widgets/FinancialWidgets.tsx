import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  RefreshCw,
  CreditCard,
  Scale,
  Wallet,
  DollarSign,
  Info,
  Code,
  XCircle,
  FolderX,
  CheckCheck,
  Clock,
  BarChart,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Landmark,
  Calendar,
  Users,
  BugPlay,
  Table2,
  Receipt,
  CheckCircle2,
  PlusCircle,
} from "lucide-react";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsePieChart,
  Pie,
  Sector,
  LineChart as RechartsLineChart,
  Line,
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { 
  useTransactions, 
  formatEuro, 
  calculateIncome, 
  calculateExpenses,
  calculateBalance,
  filterTransactionsByDate,
  groupByCategory,
  TransactionData,
  getCredits,
  getTotalRemainingCreditAmount,
  getTotalMonthlyPayments,
  getPendingCredits,
  getCompletedCredits,
  getCancelledCredits,
  getTotalCreditAmount
} from "@/hooks/useTransactions";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6B66FF'];

// Widget Rapport Financier
export function FinancialReportWidget() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed'>('completed');

  if (isLoading) {
    return <LoadingCard title="Rapport Financier" icon={<FileText className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Rapport Financier" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Rapport Financier" icon={<FileText className="h-5 w-5 text-primary" />} />;
  }

  // Filtrer les transactions selon le statut
  const filteredTransactions = transactions.filter(tx => tx.status === statusFilter);

  const totalIncome = calculateIncome(filteredTransactions, 'all');
  const totalExpenses = calculateExpenses(filteredTransactions, 'all');
  const balance = calculateBalance(filteredTransactions, 'all');
  const percentChange = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
  
  // Récupérer les informations des crédits
  const credits = getCredits(filteredTransactions);
  const totalCreditAmount = getTotalCreditAmount(filteredTransactions);
  const totalRemainingAmount = getTotalRemainingCreditAmount(filteredTransactions);
  const totalMonthlyPayments = getTotalMonthlyPayments(filteredTransactions);
  
  // Statistiques pour le badge
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const completedCount = transactions.filter(t => t.status === 'completed').length;
  
  // Gérer le changement de statut
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as 'pending' | 'completed');
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
            <div>
              <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Rapport Financier
                {statusFilter !== 'completed' && (
                  <Badge variant="outline" className="ml-2 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    {statusFilter === 'pending' ? 'En attente' : 'Terminées'}
                  </Badge>
                )}
          </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                Vue d'ensemble de vos finances
                {statusFilter === 'completed' 
                  ? ` (${transactions.length} transactions)`
                  : statusFilter === 'pending'
                    ? ` (${pendingCount} en attente)`
                    : ` (${completedCount} terminées)`
                }
              </CardDescription>
            </div>
            
            <div className="w-full sm:w-40">
              <Select
                value={statusFilter}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-8 border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent className="border-blue-200 dark:border-blue-800">
                  <SelectItem value="pending">En attente ({pendingCount})</SelectItem>
                  <SelectItem value="completed">Terminées ({completedCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/50 p-5 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-blue-400/10 flex items-center justify-center">
                <DollarSign className="h-10 w-10 text-blue-500/40" />
              </div>
              <div className="flex flex-col z-10 relative">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Revenus</span>
                  </div>
                <div className="text-3xl font-bold mt-2 text-blue-800 dark:text-blue-300">
                    {formatEuro(totalIncome)}
              </div>
              {statusFilter !== 'completed' && (
                  <div className="mt-2 text-xs text-blue-600/80 dark:text-blue-400/70">
                  Filtre actif: {statusFilter === 'pending' ? 'en attente' : 'terminés'}
                </div>
              )}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.2 }}
              className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/50 p-5 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-blue-400/10 flex items-center justify-center">
                <ArrowDownRight className="h-10 w-10 text-blue-500/40" />
              </div>
              <div className="flex flex-col z-10 relative">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Dépenses</span>
                  </div>
                <div className="text-3xl font-bold mt-2 text-blue-800 dark:text-blue-300">
                    {formatEuro(totalExpenses)}
                  </div>
                {totalCreditAmount > 0 && (
                  <div className="mt-2 text-xs text-blue-600/80 dark:text-blue-400/70">
                    dont crédits: {formatEuro(totalCreditAmount)}
                </div>
              )}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.2 }}
              className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/50 p-5 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-blue-400/10 flex items-center justify-center">
                <Wallet className="h-10 w-10 text-blue-500/40" />
              </div>
              <div className="flex flex-col z-10 relative">
                  <div className="flex items-center gap-2 mb-1">
                  <Scale className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Balance</span>
                  </div>
                <div className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatEuro(balance)}
                  </div>
                <div className="mt-2 text-xs text-blue-600/80 dark:text-blue-400/70">
                  {percentChange.toFixed(1)}% des revenus
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.2 }}
              className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/50 p-5 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-blue-400/10 flex items-center justify-center">
                <CreditCard className="h-10 w-10 text-blue-500/40" />
              </div>
              <div className="flex flex-col z-10 relative">
                  <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Crédits</span>
                  </div>
                <div className="text-3xl font-bold mt-2 text-blue-800 dark:text-blue-300">
                  {formatEuro(totalRemainingAmount)}
                  </div>
                <div className="mt-2 text-xs text-blue-600/80 dark:text-blue-400/70">
                  Mensualité: {formatEuro(totalMonthlyPayments)}
                </div>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Revenus du mois
export function MonthlyIncomeWidget() {
  const { data: transactions, isLoading, error } = useTransactions();

  if (isLoading) {
    return <LoadingCard title="Revenus du mois" icon={<CreditCard className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Revenus du mois" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Revenus du mois" icon={<CreditCard className="h-5 w-5 text-primary" />} />;
  }

  const monthlyIncome = calculateIncome(transactions, 'thisMonth');
  const categoriesData = groupByCategory(transactions, 'income', 'thisMonth');
  
  const pieData = Object.keys(categoriesData).map(category => ({
    name: category,
    value: categoriesData[category]
  })).sort((a, b) => b.value - a.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
              <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            Revenus du mois
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Ce mois-ci:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{formatEuro(monthlyIncome)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="space-y-4">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke="transparent"
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatEuro(Number(value))} 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      }} 
                    />
                  </RechartsePieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {pieData.map((item, index) => (
                  <motion.div 
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm font-medium truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatEuro(item.value)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Aucune transaction de revenu ce mois-ci
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Dépenses du mois
export function MonthlyExpensesWidget() {
  const { data: transactions, isLoading, error } = useTransactions();

  if (isLoading) {
    return <LoadingCard title="Dépenses du mois" icon={<ArrowDownRight className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Dépenses du mois" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Dépenses du mois" icon={<ArrowDownRight className="h-5 w-5 text-primary" />} />;
  }

  const monthlyExpenses = calculateExpenses(transactions, 'thisMonth');
  const categoriesData = groupByCategory(transactions, 'expense', 'thisMonth');
  
  const pieData = Object.keys(categoriesData).map(category => ({
    name: category,
    value: categoriesData[category]
  })).sort((a, b) => b.value - a.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
              <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            Dépenses du mois
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Ce mois-ci:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">{formatEuro(monthlyExpenses)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="space-y-4">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke="transparent"
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatEuro(Number(value))} 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      }} 
                    />
                  </RechartsePieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {pieData.map((item, index) => (
                  <motion.div 
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm font-medium truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatEuro(item.value)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Aucune transaction de dépense ce mois-ci
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Balance du mois - Nouvelle version
export function MonthlyBalanceWidget() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [periodFilter, setPeriodFilter] = useState<TimeRangePeriod>('thisMonth');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed'>('completed');
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');

  // Fonction pour filtrer les transactions par période
  const filterTransactionsByPeriod = (transactions: TransactionData[], period: TimeRangePeriod) => {
    // Si on sélectionne toutes les périodes, retourner toutes les transactions
    if (period === 'all') {
      return transactions;
    }
    
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
      default:
        // Ne devrait pas arriver, car 'all' est déjà traité
        start.setFullYear(1900);
        break;
    }
    
    return transactions.filter((t: TransactionData) => {
      try {
        const date = new Date(t.date);
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
          console.warn("Date invalide trouvée:", t.date, "pour la transaction:", t);
          return false;
        }
        return date >= start && date <= now;
      } catch (e) {
        console.warn("Erreur lors de l'analyse de la date:", t.date, "pour la transaction:", t, e);
        return false;
      }
    });
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
              <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Analyse Financière
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-blue-600/80 dark:text-blue-400/70">
            <p>Erreur de chargement des données</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Analyse Financière
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-blue-600/80 dark:text-blue-400/70">
            <p>Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrer les transactions par période
  const periodFilteredTransactions = filterTransactionsByPeriod(transactions, periodFilter);
  
  // Filtrer par statut
  const filteredTransactions = statusFilter === 'completed' 
    ? periodFilteredTransactions 
    : periodFilteredTransactions.filter((t: TransactionData) => t.status === statusFilter);
  
  // Calculer les totaux
  const totalIncome = calculateIncome(filteredTransactions, 'all');
  const totalExpenses = calculateExpenses(filteredTransactions, 'all');
  
  // Crédits
  const credits = filteredTransactions.filter((t: TransactionData) => t.type === 'credit');
  const totalCredits = credits.reduce((sum: number, credit: TransactionData) => sum + (credit.amount || 0), 0);
  
  // Calculs des ratios
  const balance = totalIncome - totalExpenses;
  const percentBalance = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
  
  // Données pour les catégories
  const incomeByCategory = groupByCategory(filteredTransactions, 'income', 'all');
  const expensesByCategory = groupByCategory(filteredTransactions, 'expense', 'all');
  const creditsByCategory: Record<string, number> = credits.reduce((acc: Record<string, number>, credit) => {
    const category = credit.category || 'Non catégorisé';
    if (!acc[category]) acc[category] = 0;
    acc[category] += credit.amount || 0;
    return acc;
  }, {});
  
  // Conversion en tableaux triés pour l'affichage
  const incomeCategoriesArray = Object.entries(incomeByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  
  const expenseCategoriesArray = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  
  const creditCategoriesArray = Object.entries(creditsByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
    
  // Obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch(periodFilter) {
      case 'thisMonth': 
        return `${new Date().toLocaleString('fr-FR', { month: 'long' })}`;
      case 'thisQuarter': 
        const quarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `T${quarter} ${new Date().getFullYear()}`;
      case 'thisYear': 
        return `${new Date().getFullYear()}`;
      case 'all': 
        return 'Toutes périodes';
      default: 
        return '';
    }
  };
  
  // Compteurs pour l'affichage des badges
  const pendingCount = periodFilteredTransactions.filter(t => t.status === 'pending').length;
  const completedCount = periodFilteredTransactions.filter(t => t.status === 'completed').length;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="w-full h-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
                Analyse Financière
                {statusFilter !== 'completed' && (
                  <Badge variant="outline" className="ml-2 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    {statusFilter === 'pending' ? 'En attente' : 'Terminées'}
                  </Badge>
                )}
          </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                {balance >= 0 ? 'Excédent' : 'Déficit'} pour {getPeriodLabel()}
          </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-36">
                <Select
                  value={periodFilter}
                  onValueChange={(value) => setPeriodFilter(value as any)}
                >
                  <SelectTrigger className="h-8 text-xs border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent className="border-blue-200 dark:border-blue-800">
                    <SelectItem value="thisMonth">Ce mois</SelectItem>
                    <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
                    <SelectItem value="thisYear">Cette année</SelectItem>
                    <SelectItem value="all">Toutes périodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-36">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as any)}
                >
                  <SelectTrigger className="h-8 text-xs border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="border-blue-200 dark:border-blue-800">
                    <SelectItem value="pending">En attente ({pendingCount})</SelectItem>
                    <SelectItem value="completed">Terminées ({completedCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="mt-2">
            <Tabs defaultValue="summary" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 bg-blue-50/50 dark:bg-blue-950/10">
                <TabsTrigger 
                  value="summary" 
                  className={`flex items-center gap-1 ${activeTab === 'summary' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>Résumé</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="categories" 
                  className={`flex items-center gap-1 ${activeTab === 'categories' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                >
                  <PieChart className="h-3.5 w-3.5" />
                  <span>Catégories</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3 overflow-y-auto">
          {activeTab === 'summary' ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-center mb-6">
              <motion.div 
                className={`text-4xl font-bold ${balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                {formatEuro(balance)}
              </motion.div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Revenus</span>
                  </div>
                    <span className="text-sm font-semibold">{formatEuro(totalIncome)}</span>
                </div>
                <Progress 
                  value={100} 
                  className="h-2 bg-green-100 dark:bg-green-950"
                  indicatorClassName="bg-green-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">Dépenses</span>
                  </div>
                    <span className="text-sm font-semibold">{formatEuro(totalExpenses)}</span>
                </div>
                <Progress 
                    value={totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 100} 
                  className="h-2 bg-red-100 dark:bg-red-950"
                  indicatorClassName="bg-red-500"
                />
              </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium">Crédits</span>
                    </div>
                    <span className="text-sm font-semibold">{formatEuro(totalCredits)}</span>
                  </div>
                  <Progress 
                    value={totalIncome > 0 ? (totalCredits / totalIncome) * 100 : 100} 
                    className="h-2 bg-purple-100 dark:bg-purple-950"
                    indicatorClassName="bg-purple-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${balance >= 0 ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                    <span className="text-sm font-medium">Balance</span>
                  </div>
                  <span className={`text-sm font-semibold ${balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {percentBalance.toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.abs(percentBalance)} 
                  className={`h-2 ${balance >= 0 ? 'bg-indigo-100 dark:bg-indigo-950' : 'bg-amber-100 dark:bg-amber-950'}`}
                  indicatorClassName={balance >= 0 ? 'bg-indigo-500' : 'bg-amber-500'}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-center mt-4 gap-1 text-sm text-muted-foreground">
              {balance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span>
                {balance >= 0 
                  ? `${percentBalance.toFixed(0)}% de revenus épargnés` 
                  : `${Math.abs(percentBalance).toFixed(0)}% de déficit`}
              </span>
            </div>
              
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-2">
                  <div className="font-medium text-green-600 dark:text-green-400">{incomeCategoriesArray.length}</div>
                  <div className="text-muted-foreground">Sources de revenu</div>
          </div>
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-2">
                  <div className="font-medium text-red-600 dark:text-red-400">{expenseCategoriesArray.length}</div>
                  <div className="text-muted-foreground">Types de dépenses</div>
                </div>
                <div className="rounded-md bg-purple-50 dark:bg-purple-900/20 p-2">
                  <div className="font-medium text-purple-600 dark:text-purple-400">{credits.length}</div>
                  <div className="text-muted-foreground">Crédits actifs</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Tabs defaultValue="income" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-3">
                  <TabsTrigger value="income" className="flex items-center gap-1 text-xs">
                    <CreditCard className="h-3 w-3" />
                    <span>Revenus</span>
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="flex items-center gap-1 text-xs">
                    <ArrowDownRight className="h-3 w-3" />
                    <span>Dépenses</span>
                  </TabsTrigger>
                  <TabsTrigger value="credit" className="flex items-center gap-1 text-xs">
                    <Wallet className="h-3 w-3" />
                    <span>Crédits</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="income" className="overflow-y-auto max-h-64 space-y-2 pr-1">
                  {incomeCategoriesArray.length > 0 ? (
                    incomeCategoriesArray.map((category, index) => (
                      <div key={`income-${category.name}`} className="flex items-center justify-between p-2 rounded-md bg-green-50/50 dark:bg-green-950/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatEuro(category.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      Aucun revenu {statusFilter !== 'completed' ? (statusFilter === 'pending' ? 'en attente' : 'terminé') : ''} pour cette période
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="expense" className="overflow-y-auto max-h-64 space-y-2 pr-1">
                  {expenseCategoriesArray.length > 0 ? (
                    expenseCategoriesArray.map((category, index) => (
                      <div key={`expense-${category.name}`} className="flex items-center justify-between p-2 rounded-md bg-red-50/50 dark:bg-red-950/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatEuro(category.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      Aucune dépense {statusFilter !== 'completed' ? (statusFilter === 'pending' ? 'en attente' : 'terminée') : ''} pour cette période
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="credit" className="overflow-y-auto max-h-64 space-y-2 pr-1">
                  {creditCategoriesArray.length > 0 ? (
                    creditCategoriesArray.map((category, index) => (
                      <div key={`credit-${category.name}`} className="flex items-center justify-between p-2 rounded-md bg-purple-50/50 dark:bg-purple-950/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{formatEuro(category.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      Aucun crédit {statusFilter !== 'completed' ? (statusFilter === 'pending' ? 'en attente' : 'terminé') : ''} pour cette période
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              {/* Résumé par catégorie */}
              <div className="border-t pt-3 mt-3">
                <div className="text-xs font-medium mb-2 text-muted-foreground">Répartition des flux financiers</div>
                <div className="w-full h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={[
                        { name: 'Revenus', value: totalIncome, color: '#10b981' },
                        { name: 'Dépenses', value: totalExpenses, color: '#ef4444' },
                        { name: 'Crédits', value: totalCredits, color: '#9333ea' }
                      ]}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip 
                        formatter={(value) => [formatEuro(Number(value)), 'Montant']}
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {[
                          { name: 'Revenus', value: totalIncome, color: '#10b981' },
                          { name: 'Dépenses', value: totalExpenses, color: '#ef4444' },
                          { name: 'Crédits', value: totalCredits, color: '#9333ea' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Ratio Revenus/Dépenses
export function IncomeExpenseRatioWidget() {
  const { data: transactions, isLoading, error, refetch, isRefetching } = useTransactions();
  const [period, setPeriod] = useState<TimeRangePeriod>('month');
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
        start.setFullYear(2000); // Une date suffisamment ancienne
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
  
  // Filtrer les transactions pour la période sélectionnée
  const { start, end } = getTimeRange();
  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date >= start && date <= end;
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
                <Badge variant="secondary" className="ml-2 whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {getPeriodLabel()}
                  </Badge>
                )}
          </CardTitle>
            <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                <span className="block">
            {isGoodRatio 
              ? 'Vous dépensez moins que vos revenus' 
              : 'Vos dépenses dépassent vos revenus'}
                </span>
                <span className="text-muted-foreground block">
                {filteredTransactions.length} transactions pour {getPeriodLabel()}
                </span>
          </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-shrink-0 gap-2">
              <div className="w-full sm:w-36">
                <Select
                value={period}
                  onValueChange={handlePeriodChange}
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
                        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 block mb-0.5">Total dépenses</span>
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                          {formatEuro(periodExpenses)}
                          </span>
                  </div>
                        
                      <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 block mb-0.5">Total crédits</span>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {formatEuro(periodCredits)}
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
  );
}

// Widget Évolution Mensuelle des Transactions (refait à neuf)
export function MonthlyEvolutionWidget() {
  const { data: transactions, isLoading, error, refetch, isRefetching } = useTransactions();
  const [periodFilter, setPeriodFilter] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed'>('completed');
  const [visibleSeries, setVisibleSeries] = useState({
    revenus: true,
    dépenses: true,
    crédits: true,
    balance: true
  });

  // État pour les statistiques des transactions 
  const [transactionStats, setTransactionStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    unknown: 0,
    byMonth: {} as Record<string, { pending: TransactionData[]; completed: TransactionData[] }>
  });

  // Effet pour analyser et préparer les statistiques des transactions
  useEffect(() => {
    if (!transactions) return;
    
    const stats = {
      total: transactions.length,
      completed: 0,
      pending: 0,
      unknown: 0,
      byMonth: {} as Record<string, { pending: TransactionData[]; completed: TransactionData[] }>
    };
    
    // Compter par statut
    transactions.forEach(tx => {
      if (tx.status === 'completed') {
        stats.completed++;
      } else if (tx.status === 'pending') {
        stats.pending++;
      } else {
        stats.unknown++;
      }
      
      try {
        // Regrouper par mois
        const txDate = new Date(tx.date);
        const monthKey = `${txDate.getFullYear()}-${txDate.getMonth()+1}`;
        
        if (!stats.byMonth[monthKey]) {
          stats.byMonth[monthKey] = {
            pending: [],
            completed: []
          };
        }
        
        if (tx.status === 'pending') {
          stats.byMonth[monthKey].pending.push(tx);
        } else if (tx.status === 'completed') {
          stats.byMonth[monthKey].completed.push(tx);
        }
      } catch (e) {
        console.error("Erreur avec date de transaction:", tx.date, e);
      }
    });
    
    // Suppression des logs de débogage
    
    setTransactionStats(stats);
  }, [transactions]);
  
  // Fonction pour rafraîchir manuellement les données
  const handleRefresh = async () => {
    try {
      await refetch();
    } catch (err) {
      console.error("Erreur lors du rafraîchissement des données:", err);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Évolution Mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
              <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Évolution Mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-red-500">
            <div>Erreur de chargement des données</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Évolution Mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-blue-600/80 dark:text-blue-400/70">
            <p>Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrer les transactions selon le statut
  const getFilteredTransactions = () => {
    if (!transactions) return [];
    
    // Filtrer d'abord par statut
    const statusFiltered = statusFilter === 'completed' 
      ? transactions.filter(tx => tx.status === 'completed')
      : transactions.filter(tx => tx.status === 'pending');
    
    // Puis filtrer par période
    if (periodFilter === 'all') {
      return statusFiltered;
    }
    
    const now = new Date();
    const startDate = new Date();
    
    switch (periodFilter) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return statusFiltered.filter(tx => {
      try {
        const txDate = new Date(tx.date);
        if (isNaN(txDate.getTime())) {
          console.warn("Date invalide:", tx.date);
          return false;
        }
        return txDate >= startDate && txDate <= now;
      } catch (e) {
        console.error("Erreur lors de l'analyse de la date:", e);
        return false;
      }
    });
  };
  
  const filteredTransactions = getFilteredTransactions();
  const totalFilteredTransactions = filteredTransactions.length;
  
  // Obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch(periodFilter) {
      case 'month': return 'dernier mois';
      case 'quarter': return 'dernier trimestre';
      case 'year': return 'dernière année';
      case 'all': return 'toutes périodes';
      default: return '';
    }
  };
  
  // Préparer les données pour le graphique
  const prepareChartData = () => {
    const currentYear = new Date().getFullYear();
    const result = [];
    
    // Si on affiche toutes les périodes, on récupère les transactions par mois sur les 24 derniers mois
    const monthsToShow = periodFilter === 'all' ? 24 : 12;
    const startMonth = periodFilter === 'all' 
      ? new Date().getMonth() - monthsToShow + 1 
      : 0;
    const startYear = periodFilter === 'all' 
      ? currentYear - Math.floor(Math.abs(startMonth) / 12) 
      : currentYear;
    const adjustedStartMonth = periodFilter === 'all' 
      ? (startMonth < 0 ? 12 + (startMonth % 12) : startMonth) 
      : 0;
    
    // Créer un tableau pour les mois à afficher
    for (let i = 0; i < monthsToShow; i++) {
      const monthIndex = (adjustedStartMonth + i) % 12;
      const yearOffset = Math.floor((adjustedStartMonth + i) / 12);
      const year = startYear + yearOffset;
      
      const dateObj = new Date(year, monthIndex, 1);
      const monthName = dateObj.toLocaleString('fr-FR', { month: 'short' });
      const fullDate = dateObj.toLocaleString('fr-FR', { year: 'numeric', month: 'long' });
      
      // Filtrer les transactions pour ce mois
      const monthTransactions = filteredTransactions.filter(tx => {
        try {
          const txDate = new Date(tx.date);
          return txDate.getMonth() === monthIndex && txDate.getFullYear() === year;
        } catch (e) {
          return false;
        }
      });
      
      // Calculer les montants par type
      const incomeAmount = monthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const expenseAmount = monthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const creditAmount = monthTransactions
        .filter(tx => tx.type === 'credit')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      // Ajouter les données du mois
      result.push({
        name: `${monthName} ${year !== currentYear ? year : ''}`,
        month: monthName,
        fullDate: fullDate,
        revenus: incomeAmount,
        dépenses: expenseAmount,
        crédits: creditAmount,
        balance: incomeAmount - expenseAmount,
        netIncome: incomeAmount - expenseAmount,
        count: monthTransactions.length,
        isCurrentMonth: monthIndex === new Date().getMonth() && year === currentYear
      });
    }
    
    return result;
  };
  
  const chartData = prepareChartData();
  
  // Toggles et handlers
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as 'pending' | 'completed');
  };
  
  const handlePeriodFilterChange = (value: string) => {
    setPeriodFilter(value as 'month' | 'quarter' | 'year' | 'all');
  };
  
  // Fonction pour gérer le clic sur la légende
  const handleLegendClick = (dataKey: any) => {
    if (typeof dataKey === 'string') {
      setVisibleSeries(prev => ({
        ...prev,
        [dataKey]: !prev[dataKey as keyof typeof prev]
      }));
    }
  };
  
  // Composant personnalisé pour la légende
  const CustomLegend = ({ payload }: { payload: Array<{dataKey: string; color: string}> }) => {
    return (
      <div className="flex justify-center gap-6 mb-4 flex-wrap">
        {payload.map((entry, index) => {
          // Suppression de la vérification du mode debug
          
          const isVisible = visibleSeries[entry.dataKey as keyof typeof visibleSeries];
          
          let color;
          switch(entry.dataKey) {
            case 'revenus': color = '#10b981'; break;
            case 'dépenses': color = '#ef4444'; break;
            case 'crédits': color = '#9333ea'; break;
            case 'balance': color = '#3b82f6'; break;
            default: color = '#888888';
          }
          
          let label;
          switch(entry.dataKey) {
            case 'revenus': label = 'Revenus'; break;
            case 'dépenses': label = 'Dépenses'; break;
            case 'crédits': label = 'Crédits'; break;
            case 'balance': label = 'Balance'; break;
            // Suppression du cas pour 'count'
            default: label = entry.dataKey;
          }
          
          return (
            <button
              key={`item-${index}`}
              className="text-xs flex items-center gap-1.5"
              onClick={() => handleLegendClick(entry.dataKey)}
            >
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: isVisible ? color : '#d1d5db' }} />
              <span className={`text-xs font-medium ${isVisible ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    );
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
            <div>
              <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Évolution Mensuelle
                {statusFilter !== 'completed' && (
                  <Badge variant="outline" className="ml-2 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    En attente
                  </Badge>
                )}
                {periodFilter !== 'month' && (
                  <Badge variant="outline" className="ml-2 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    {getPeriodLabel()}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                Analyse de la répartition des flux financiers
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {totalFilteredTransactions} transactions
                </span>
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div>
                <Select
                  value={statusFilter}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger className="h-8 w-[140px] border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent className="border-blue-200 dark:border-blue-800">
                    <SelectItem value="completed">Terminées ({transactions?.filter(t => t.status === 'completed').length || 0})</SelectItem>
                    <SelectItem value="pending">En attente ({transactions?.filter(t => t.status === 'pending').length || 0})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select
                  value={periodFilter}
                  onValueChange={handlePeriodFilterChange}
                >
                  <SelectTrigger className="h-8 w-[140px] border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
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
              
              {/* Suppression du bouton d'actualisation conditionnel au mode debug */}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 pt-3">
          <div className="relative bg-gradient-to-br from-blue-50/30 to-blue-50/10 dark:from-blue-950/10 dark:to-blue-900/5 rounded-xl p-1 sm:p-6 overflow-hidden">
            {/* Effet de grille en arrière-plan */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSIjZmZmIi8+PC9nPjwvc3ZnPg==')]"></div>
            </div>

            {/* Effet de lueur pour les graphiques */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent blur-3xl"></div>

            <CustomLegend payload={[
              { dataKey: 'revenus', color: '#10b981' },
              { dataKey: 'dépenses', color: '#ef4444' },
              { dataKey: 'crédits', color: '#9333ea' },
              { dataKey: 'balance', color: '#3b82f6' }
              // Suppression de l'entrée conditionnelle pour 'count'
            ]} />
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    {/* Gradients avec effets de lueur */}
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgba(0,0,0,0.2)" 
                    className="dark:stroke-[rgba(255,255,255,0.2)]"
                    vertical={false}
                  />
                  
                  <XAxis 
                    dataKey="month" 
                    stroke="rgba(0,0,0,0.7)"
                    tick={{ fill: 'rgba(0,0,0,0.9)', fontSize: 12 }}
                    className="dark:stroke-[rgba(255,255,255,0.5)] dark:text-white"
                  />
                  
                  <YAxis 
                    stroke="rgba(0,0,0,0.7)"
                    tick={{ fill: 'rgba(0,0,0,0.9)', fontSize: 12 }}
                    className="dark:stroke-[rgba(255,255,255,0.5)] dark:text-white"
                  />
                  
                  <Tooltip 
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '8px',
                      color: '#000',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number, name: string) => {
                      return [formatEuro(value), name];
                    }}
                    labelFormatter={(label) => {
                      const dataPoint = chartData.find(d => d.month === label);
                      return dataPoint?.fullDate || label;
                    }}
                  />
                  
                  {visibleSeries.revenus && (
                    <Area 
                      type="monotone" 
                      dataKey="revenus" 
                      name="Revenus" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                  )}
                  
                  {visibleSeries.dépenses && (
                    <Area 
                      type="monotone" 
                      dataKey="dépenses" 
                      name="Dépenses" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorExpense)"
                      strokeWidth={2}
                    />
                  )}
                  
                  {visibleSeries.crédits && (
                    <Area 
                      type="monotone" 
                      dataKey="crédits" 
                      name="Crédits" 
                      stroke="#9333ea" 
                      fillOpacity={1} 
                      fill="url(#colorCredit)"
                      strokeWidth={2}
                    />
                  )}
                  
                  {visibleSeries.balance && (
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      name="Balance" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorBalance)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900">
              <div className="text-green-600 dark:text-green-400 text-xs font-medium mb-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Revenus
              </div>
              <div className="text-green-700 dark:text-green-300 font-bold">
                {formatEuro(chartData.find(d => d.isCurrentMonth)?.revenus || 0)}
              </div>
            </div>
            
            <div className="rounded-xl p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900">
              <div className="text-red-600 dark:text-red-400 text-xs font-medium mb-1 flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3" />
                Dépenses
              </div>
              <div className="text-red-700 dark:text-red-300 font-bold">
                {formatEuro(chartData.find(d => d.isCurrentMonth)?.dépenses || 0)}
              </div>
            </div>
            
            <div className="rounded-xl p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900">
              <div className="text-purple-600 dark:text-purple-400 text-xs font-medium mb-1 flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Crédits
              </div>
              <div className="text-purple-700 dark:text-purple-300 font-bold">
                {formatEuro(chartData.find(d => d.isCurrentMonth)?.crédits || 0)}
              </div>
            </div>
            
            <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900">
              <div className="text-blue-600 dark:text-blue-400 text-xs font-medium mb-1 flex items-center gap-1">
                <Scale className="h-3 w-3" />
                Balance
              </div>
              <div className="text-blue-700 dark:text-blue-300 font-bold">
                {formatEuro(chartData.find(d => d.isCurrentMonth)?.balance || 0)}
              </div>
            </div>
          </div>
          
          {/* Suppression du bouton debug caché */}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Répartition par Catégorie
export function CategoryDistributionWidget() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'credit'>('income');
  const [periodFilter, setPeriodFilter] = useState<'thisMonth' | 'thisQuarter' | 'thisYear' | 'all'>('thisMonth');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed'>('completed');

  // Fonction utilitaire pour filtrer par période
  const filterTransactionsByPeriod = (transactions: TransactionData[], period: 'thisMonth' | 'thisQuarter' | 'thisYear' | 'all') => {
    // Si on a choisi toutes les périodes, on ne filtre pas par date
    if (period === 'all') {
      return transactions;
    }
    
    if (period === 'thisQuarter') {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStartMonth = currentQuarter * 3;
      const quarterEndMonth = quarterStartMonth + 2;
      
      return transactions.filter(t => {
        try {
          const txDate = new Date(t.date);
          // Vérifier si la date est valide
          if (isNaN(txDate.getTime())) {
            console.warn("Date invalide trouvée:", t.date, "pour la transaction:", t);
            return false;
          }
          const txMonth = txDate.getMonth();
          return txDate.getFullYear() === now.getFullYear() && 
                 txMonth >= quarterStartMonth && 
                 txMonth <= quarterEndMonth;
        } catch (e) {
          console.warn("Erreur lors de l'analyse de la date:", t.date, "pour la transaction:", t, e);
          return false;
        }
      });
    } else if (period === 'thisMonth' || period === 'thisYear') {
      return filterTransactionsByDate(transactions, period);
    } else {
      return transactions; // 'all' (déjà traité, ce cas ne devrait pas arriver)
    }
  };
  
  // Fonction pour obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch(periodFilter) {
      case 'thisMonth': 
        return `${new Date().toLocaleString('fr-FR', { month: 'long' })}`;
      case 'thisQuarter': 
        const quarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `T${quarter} ${new Date().getFullYear()}`;
      case 'thisYear': 
        return `${new Date().getFullYear()}`;
      case 'all': 
        return 'Toutes périodes';
      default: 
        return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Répartition par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
              <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Répartition par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-red-500">
            <div>Erreur de chargement des données</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Répartition par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-blue-600/80 dark:text-blue-400/70">
            <p>Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrer les transactions par période et status
  const filteredByPeriod = filterTransactionsByPeriod(transactions, periodFilter);
  const filteredTransactions = statusFilter === 'completed' 
    ? filteredByPeriod 
    : filteredByPeriod.filter(t => t.status === statusFilter);
  
  // Obtenir les données en fonction de l'onglet actif
  const getActiveData = () => {
    switch(activeTab) {
      case 'income': return { 
        title: 'Répartition des Revenus',
        icon: <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-600 dark:text-green-400',
        accentColor: 'green',
        emptyMessage: 'Aucun revenu pour cette période',
        type: 'income' as const,
        chartColors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']
      };
      case 'expense': return { 
        title: 'Répartition des Dépenses',
        icon: <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-600 dark:text-red-400',
        accentColor: 'red',
        emptyMessage: 'Aucune dépense pour cette période',
        type: 'expense' as const,
        chartColors: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2']
      };
      case 'credit': return { 
        title: 'Répartition des Crédits',
        icon: <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        accentColor: 'amber',
        emptyMessage: 'Aucun crédit pour cette période',
        type: 'credit' as const,
        chartColors: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7']
      };
    }
  };
  
  const activeData = getActiveData();
  
  // Préparer les données pour le graphique
  const getCategoryData = () => {
    let categoriesData: Record<string, number> = {};
    
    if (activeTab === 'income') {
      categoriesData = groupByCategory(filteredTransactions, 'income', 'all');
    } else if (activeTab === 'expense') {
      categoriesData = groupByCategory(filteredTransactions, 'expense', 'all');
    } else if (activeTab === 'credit') {
      // Regrouper les crédits par catégorie
      categoriesData = filteredTransactions
        .filter(t => t.type === 'credit')
        .reduce((acc: Record<string, number>, credit) => {
          const category = credit.category || 'Non catégorisé';
          if (!acc[category]) acc[category] = 0;
          acc[category] += credit.amount || 0;
          return acc;
        }, {});
    }
    
    return Object.keys(categoriesData).map(category => ({
      name: translateCategory(category),
    value: categoriesData[category]
  })).sort((a, b) => b.value - a.value);
  };
  
  // Traduire les noms de catégories
  const translateCategory = (category: string) => {
    const categoryTranslations: Record<string, string> = {
      // Revenus
      'rent': 'Loyer',
      'short_term_rental': 'Location courte durée',
      'security_deposit': 'Dépôt de garantie',
      'application_fees': 'Frais de dossier',
      'service_fees': 'Frais de service',
      'late_fees': 'Pénalités de retard',
      'parking_income': 'Revenus parking',
      'common_area_income': 'Espaces communs',
      'rental_equipment': 'Location équipements',
      'additional_services': 'Services additionnels',
      'advertising_income': 'Publicité',
      'dividend_income': 'Dividendes',
      'interest_income': 'Intérêts',
      'property_sale': 'Vente immobilière',
      'insurance_claims': 'Indemnités assurance',
      'subsidies': 'Subventions',
      'refund': 'Remboursements',
      'commission': 'Commissions',
      
      // Dépenses
      'maintenance': 'Maintenance',
      'renovation': 'Rénovation',
      'cleaning': 'Nettoyage',
      'landscaping': 'Espaces verts',
      'insurance': 'Assurance',
      'tax': 'Impôts',
      'utility': 'Charges générales',
      'utilities_water': 'Eau',
      'utilities_electricity': 'Électricité',
      'utilities_gas': 'Gaz',
      'utilities_internet': 'Internet',
      'condominium_fee': 'Charges copropriété',
      'management_fee': 'Frais de gestion',
      'legal_fee': 'Frais juridiques',
      'accounting': 'Comptabilité',
      'consulting': 'Conseil',
      'inspection': 'Inspection',
      'furnishing': 'Ameublement',
      'equipment': 'Équipement',
      'marketing': 'Marketing',
      'travel': 'Déplacement',
      'security': 'Sécurité',
      
      // Crédits
      'mortgage': 'Emprunt',
      'investment': 'Investissement',
      'crypto': 'Crypto',
      
      // Par défaut
      'other': 'Divers',
      'uncategorized': 'Non catégorisé',
    };
    
    return categoryTranslations[category] || category;
  };
  
  const pieData = getCategoryData();
  
  // S'il n'y a pas de données, afficher un message
  if (pieData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className={`rounded-full ${activeData.bgColor} p-2`}>
                    {activeData.icon}
                  </div>
                  {activeData.title}
          </CardTitle>
                <CardDescription>
                  Période: {getPeriodLabel()}
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-40">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as any)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-40">
                  <Select
                    value={periodFilter}
                    onValueChange={(value) => setPeriodFilter(value as any)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">Ce mois</SelectItem>
                      <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
                      <SelectItem value="thisYear">Cette année</SelectItem>
                      <SelectItem value="all">Toutes périodes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <Tabs defaultValue="income" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="income" className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Revenus</span>
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="flex items-center gap-1">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    <span>Dépenses</span>
                  </TabsTrigger>
                  <TabsTrigger value="credit" className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Crédits</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
            <p className="text-muted-foreground text-center">
                {activeData.emptyMessage}
              </p>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">
                Essayez de changer le filtre ou ajoutez des transactions
            </p>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
                Répartition par Catégorie
          </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                {activeTab === 'income' ? 'Revenus' : activeTab === 'expense' ? 'Dépenses' : 'Crédits'} - {getPeriodLabel()}
          </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
                <Select
                  value={periodFilter}
                onValueChange={(value: any) => setPeriodFilter(value)}
                >
                <SelectTrigger className="h-8 w-32 border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                <SelectContent className="border-blue-200 dark:border-blue-800">
                    <SelectItem value="thisMonth">Ce mois</SelectItem>
                  <SelectItem value="thisQuarter">Trimestre</SelectItem>
                    <SelectItem value="thisYear">Cette année</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Tabs 
            defaultValue="income" 
            value={activeTab}
            onValueChange={(value: any) => setActiveTab(value)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-6 bg-blue-50/50 dark:bg-blue-950/10">
              <TabsTrigger 
                value="income" 
                className={`flex items-center gap-1 ${activeTab === 'income' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
              >
                <ArrowUpRight className="h-4 w-4" />
                  <span>Revenus</span>
                </TabsTrigger>
              <TabsTrigger 
                value="expense" 
                className={`flex items-center gap-1 ${activeTab === 'expense' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
              >
                <ArrowDownRight className="h-4 w-4" />
                  <span>Dépenses</span>
                </TabsTrigger>
              <TabsTrigger 
                value="credit" 
                className={`flex items-center gap-1 ${activeTab === 'credit' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
              >
                <CreditCard className="h-4 w-4" />
                  <span>Crédits</span>
                </TabsTrigger>
              </TabsList>
            
            <div className="space-y-4">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                <RechartsePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    cornerRadius={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={activeData.chartColors[index % activeData.chartColors.length]} 
                        className="hover:opacity-95 transition-opacity hover:scale-105"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatEuro(Number(value))} 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: 'none', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    }}
                  />
                </RechartsePieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {pieData.map((item, index) => (
                <motion.div 
                  key={item.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                  className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: activeData.chartColors[index % activeData.chartColors.length] }} 
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <Badge variant="outline" className={`font-mono ${activeData.textColor}`}>
                      {Math.round((item.value / pieData.reduce((sum, i) => sum + i.value, 0)) * 100)}%
                    </Badge>
                  </div>
                  <div className="ml-6">
                    <span className={`text-sm font-semibold ${activeData.textColor}`}>{formatEuro(item.value)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Tendance Annuelle
export function AnnualTrendWidget() {
  const { data: transactions, isLoading, error } = useTransactions();

  if (isLoading) {
    return <LoadingCard title="Tendance Annuelle" icon={<TrendingUp className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Tendance Annuelle" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Tendance Annuelle" icon={<TrendingUp className="h-5 w-5 text-primary" />} />;
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // Calculer les revenus et dépenses par mois pour l'année en cours
  const annualData = Array(12).fill(0).map((_, month) => {
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && date.getFullYear() === currentYear;
    });
    
    const income = calculateIncome(monthTransactions, 'all');
    const expenses = calculateExpenses(monthTransactions, 'all');
    
    return {
      name: new Date(currentYear, month).toLocaleString('fr-FR', { month: 'short' }),
      revenus: income,
      dépenses: expenses,
      isCurrent: month === currentMonth
    };
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Tendance Annuelle
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Revenus et dépenses pour</span>
            <Badge variant="outline" className="font-semibold">{currentYear}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart 
                data={annualData}
                margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `${value > 999 ? `${(value / 1000).toFixed(0)}k` : value}€`}
                />
                <Tooltip 
                  formatter={(value, name) => [formatEuro(Number(value)), name]}
                  labelFormatter={(label) => `${label} ${currentYear}`}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  }}
                  cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
                />
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(16, 185, 129, 0.8)" />
                    <stop offset="95%" stopColor="rgba(16, 185, 129, 0.2)" />
                  </linearGradient>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
                    <stop offset="95%" stopColor="rgba(239, 68, 68, 0.2)" />
                  </linearGradient>
                </defs>
                <Bar 
                  dataKey="revenus" 
                  name="Revenus"
                  fill="url(#greenGradient)" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                  className="hover:opacity-90 cursor-pointer"
                >
                  {annualData.map((entry, index) => (
                    <Cell 
                      key={`revenus-${index}`} 
                      fillOpacity={entry.isCurrent ? 1 : 0.8} 
                      strokeWidth={entry.isCurrent ? 2 : 0}
                      stroke={entry.isCurrent ? "#047857" : "none"}
                    />
                  ))}
                </Bar>
                <Bar 
                  dataKey="dépenses" 
                  name="Dépenses"
                  fill="url(#redGradient)" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                  className="hover:opacity-90 cursor-pointer"
                >
                  {annualData.map((entry, index) => (
                    <Cell 
                      key={`dépenses-${index}`} 
                      fillOpacity={entry.isCurrent ? 1 : 0.8} 
                      strokeWidth={entry.isCurrent ? 2 : 0}
                      stroke={entry.isCurrent ? "#b91c1c" : "none"}
                    />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Crédits en cours
export function CreditsWidget() {
  // Cette fonction est obsolète, utiliser PendingCreditsWidget à la place
  return <PendingCreditsWidget />;
}

// Widget Crédits en attente
export function PendingCreditsWidget() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [activeTab, setActiveTab] = useState<'credit' | 'income' | 'expense'>('credit');
  const [periodFilter, setPeriodFilter] = useState<'thisMonth' | 'thisQuarter' | 'thisYear' | 'all'>('all');

  // Fonction utilitaire pour filtrer par période
  const filterTransactionsByPeriod = (transactions: TransactionData[], period: 'thisMonth' | 'thisQuarter' | 'thisYear' | 'all') => {
    if (period === 'thisQuarter') {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStartMonth = currentQuarter * 3;
      const quarterEndMonth = quarterStartMonth + 2;
      
      return transactions.filter(t => {
        const txDate = new Date(t.date);
        const txMonth = txDate.getMonth();
        return txDate.getFullYear() === now.getFullYear() && 
               txMonth >= quarterStartMonth && 
               txMonth <= quarterEndMonth;
      });
    } else if (period === 'thisMonth' || period === 'thisYear') {
      return filterTransactionsByDate(transactions, period);
    } else {
      return transactions; // 'all'
    }
  };
  
  // Fonction pour obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch(periodFilter) {
      case 'thisMonth': 
        return `${new Date().toLocaleString('fr-FR', { month: 'long' })}`;
      case 'thisQuarter': 
        const quarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `T${quarter} ${new Date().getFullYear()}`;
      case 'thisYear': 
        return `${new Date().getFullYear()}`;
      case 'all': 
        return 'Toutes périodes';
      default: 
        return '';
    }
  };

  if (isLoading) {
    return <LoadingCard title="Transactions en attente" icon={<Clock className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Transactions en attente" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Transactions en attente" icon={<Clock className="h-5 w-5 text-primary" />} />;
  }

  // Filtrer par période
  const filteredByPeriod = filterTransactionsByPeriod(transactions, periodFilter);
  
  // Filtrer par type et status "pending"
  const pendingCredits = filteredByPeriod.filter(transaction => 
    transaction.type === 'credit' && 
    transaction.status === 'pending'
  );
  
  const pendingIncomes = filteredByPeriod.filter(transaction => 
    transaction.type === 'income' && 
    transaction.status === 'pending'
  );
  
  const pendingExpenses = filteredByPeriod.filter(transaction => 
    transaction.type === 'expense' && 
    transaction.status === 'pending'
  );
  
  // Sélectionner les données en fonction de l'onglet actif
  const getActiveData = () => {
    switch(activeTab) {
      case 'credit': return { 
        transactions: pendingCredits,
        title: 'Crédits en attente',
        icon: <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        badgeColor: 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        cardGradient: 'from-white to-amber-50 dark:from-gray-900 dark:to-amber-950/10',
        label: 'crédit',
        emptyMessage: 'Aucun crédit en attente',
        emptySubMessage: 'Les nouveaux crédits apparaîtront ici'
      };
      case 'income': return { 
        transactions: pendingIncomes,
        title: 'Revenus en attente',
        icon: <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-600 dark:text-green-400',
        badgeColor: 'bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        cardGradient: 'from-white to-green-50 dark:from-gray-900 dark:to-green-950/10',
        label: 'revenu',
        emptyMessage: 'Aucun revenu en attente',
        emptySubMessage: 'Les nouveaux revenus apparaîtront ici'
      };
      case 'expense': return { 
        transactions: pendingExpenses,
        title: 'Dépenses en attente',
        icon: <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-600 dark:text-red-400',
        badgeColor: 'bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        cardGradient: 'from-white to-red-50 dark:from-gray-900 dark:to-red-950/10',
        label: 'dépense',
        emptyMessage: 'Aucune dépense en attente',
        emptySubMessage: 'Les nouvelles dépenses apparaîtront ici'
      };
    }
  };
  
  const activeData = getActiveData();
  
  // Calculer le montant total des transactions en attente
  const totalAmount = activeData.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Traduire les noms de catégories si nécessaire
  const translateCategory = (category: string) => {
    const categoryTranslations: Record<string, string> = {
      // Revenus
      'rent': 'Loyer',
      'short_term_rental': 'Location courte durée',
      'security_deposit': 'Dépôt de garantie',
      'application_fees': 'Frais de dossier',
      'service_fees': 'Frais de service',
      'late_fees': 'Pénalités de retard',
      'parking_income': 'Revenus parking',
      'common_area_income': 'Espaces communs',
      'rental_equipment': 'Location équipements',
      'additional_services': 'Services additionnels',
      'advertising_income': 'Publicité',
      'dividend_income': 'Dividendes',
      'interest_income': 'Intérêts',
      'property_sale': 'Vente immobilière',
      'insurance_claims': 'Indemnités assurance',
      'subsidies': 'Subventions',
      'refund': 'Remboursements',
      'commission': 'Commissions',
      
      // Dépenses
      'maintenance': 'Maintenance',
      'renovation': 'Rénovation',
      'cleaning': 'Nettoyage',
      'landscaping': 'Espaces verts',
      'insurance': 'Assurance',
      'tax': 'Impôts',
      'utility': 'Charges générales',
      'utilities_water': 'Eau',
      'utilities_electricity': 'Électricité',
      'utilities_gas': 'Gaz',
      'utilities_internet': 'Internet',
      'condominium_fee': 'Charges copropriété',
      'management_fee': 'Frais de gestion',
      'legal_fee': 'Frais juridiques',
      'accounting': 'Comptabilité',
      'consulting': 'Conseil',
      'inspection': 'Inspection',
      'furnishing': 'Ameublement',
      'equipment': 'Équipement',
      'marketing': 'Marketing',
      'travel': 'Déplacement',
      'security': 'Sécurité',
      
      // Crédits
      'mortgage': 'Emprunt',
      'investment': 'Investissement',
      'crypto': 'Crypto',
      
      // Par défaut
      'other': 'Divers',
      'uncategorized': 'Non catégorisé',
    };
    
    return categoryTranslations[category] || category;
  };

  if (activeData.transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
            <CardTitle className="flex items-center gap-3 text-xl">
                  <div className={`rounded-full ${activeData.bgColor} p-2`}>
                    {activeData.icon}
              </div>
                  {activeData.title}
            </CardTitle>
                <CardDescription>
                  Période: {getPeriodLabel()}
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-40">
                  <Select
                    value={periodFilter}
                    onValueChange={(value) => setPeriodFilter(value as any)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">Ce mois</SelectItem>
                      <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
                      <SelectItem value="thisYear">Cette année</SelectItem>
                      <SelectItem value="all">Toutes périodes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <Tabs defaultValue="credit" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="credit" className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Crédits</span>
                  </TabsTrigger>
                  <TabsTrigger value="income" className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Revenus</span>
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="flex items-center gap-1">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    <span>Dépenses</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-40 p-6">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center font-medium">
                {activeData.emptyMessage}
              </p>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">
                {activeData.emptySubMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
          <CardTitle className="flex items-center gap-3 text-xl">
                <div className={`rounded-full ${activeData.bgColor} p-2`}>
                  {activeData.icon}
            </div>
                {activeData.title}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
                <span>{activeData.transactions.length} {activeData.label}{activeData.transactions.length > 1 ? 's' : ''} en attente</span>
                <span className={`font-medium ${activeData.textColor}`}>{formatEuro(totalAmount)}</span>
          </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-40">
                <Select
                  value={periodFilter}
                  onValueChange={(value) => setPeriodFilter(value as any)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thisMonth">Ce mois</SelectItem>
                    <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
                    <SelectItem value="thisYear">Cette année</SelectItem>
                    <SelectItem value="all">Toutes périodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="mt-2">
            <Tabs defaultValue="credit" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="credit" className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Crédits</span>
                </TabsTrigger>
                <TabsTrigger value="income" className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Revenus</span>
                </TabsTrigger>
                <TabsTrigger value="expense" className="flex items-center gap-1">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  <span>Dépenses</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {activeData.transactions.map((transaction, index) => (
              <motion.div 
                key={transaction.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 border rounded-lg bg-gradient-to-br ${activeData.cardGradient} shadow-sm hover:shadow transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg truncate max-w-[160px]">
                      {transaction.description || `${activeData.label} sans description`}
                    </span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {translateCategory(transaction.category) || 'Non catégorisé'}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className={activeData.badgeColor}>
                    En attente
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-white/60 dark:bg-gray-800/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Montant</div>
                    <div className={`font-semibold ${activeData.textColor}`}>
                      {transaction.formattedAmount || formatEuro(transaction.amount)}
                    </div>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Propriété</div>
                    <div className="font-semibold truncate">
                      {transaction.propertyName || 'Sans propriété'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className={`h-4 w-4 ${activeData.textColor}`} />
                    <span>{transaction.displayDate || transaction.formattedDate || new Date(transaction.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`border-${activeData.textColor.split('-')[1]}-200 dark:border-${activeData.textColor.split('-')[1]}-900/50 ${activeData.textColor}`}
                  >
                    {transaction.paymentMethod === 'bank_transfer' ? 'Virement bancaire' : 
                     transaction.paymentMethod === 'cash' ? 'Espèces' :
                     transaction.paymentMethod === 'check' ? 'Chèque' :
                     transaction.paymentMethod === 'credit_card' ? 'Carte de crédit' :
                     transaction.paymentMethod || 'Non défini'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Crédits terminés
export function CompletedCreditsWidget() {
  const { data: transactions, isLoading, error } = useTransactions();

  if (isLoading) {
    return <LoadingCard title="Crédits terminés" icon={<Landmark className="h-5 w-5 text-success" />} />;
  }

  if (error) {
    return <ErrorCard title="Crédits terminés" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Crédits terminés" icon={<Landmark className="h-5 w-5 text-success" />} />;
  }

  // Filtrer les crédits terminés
  const completedCredits = transactions.filter(transaction => 
    transaction.type === 'credit' && 
    transaction.status === 'completed'
  );
  
  if (completedCredits.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
                <Landmark className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Crédits terminés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-40 p-6">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center font-medium">
                Aucun crédit terminé
              </p>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">
                Les crédits finalisés apparaîtront ici
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Calculer la somme des montants des crédits terminés
  const totalCreditAmount = completedCredits.reduce((sum, credit) => sum + credit.amount, 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.45 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
              <Landmark className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            Crédits terminés
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>{completedCredits.length} crédit{completedCredits.length > 1 ? 's' : ''} terminé{completedCredits.length > 1 ? 's' : ''}</span>
            <span className="font-medium text-green-600 dark:text-green-400">{formatEuro(totalCreditAmount)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {completedCredits.map((credit, index) => (
              <motion.div 
                key={credit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border rounded-lg bg-gradient-to-br from-white to-green-50 dark:from-gray-900 dark:to-green-950/10 shadow-sm hover:shadow transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg truncate max-w-[160px]">
                      {credit.description || credit.category || 'Crédit'}
                    </span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {credit.category || 'Non catégorisé'}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    Terminé
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-white/60 dark:bg-gray-800/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Montant</div>
                    <div className="font-semibold text-green-700 dark:text-green-400">
                      {credit.formattedAmount || formatEuro(credit.amount)}
                    </div>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/30 p-2 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">Propriété</div>
                    <div className="font-semibold truncate">
                      {credit.propertyName || 'Sans propriété'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span>{credit.displayDate || credit.formattedDate || new Date(credit.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-400"
                  >
                    {credit.paymentMethod === 'bank_transfer' ? 'Virement bancaire' : 
                     credit.paymentMethod === 'cash' ? 'Espèces' :
                     credit.paymentMethod === 'check' ? 'Chèque' :
                     credit.paymentMethod === 'credit_card' ? 'Carte de crédit' :
                     credit.paymentMethod || 'Non défini'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widget Résumé des Crédits
export function CreditsSummaryWidget() {
  const { data: transactions, isLoading, error } = useTransactions();

  if (isLoading) {
    return <LoadingCard title="Résumé des Crédits" icon={<Landmark className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Résumé des Crédits" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Résumé des Crédits" icon={<Landmark className="h-5 w-5 text-primary" />} />;
  }

  // Filtrer tous les crédits
  const allCredits = transactions.filter(t => t.type === 'credit');
  
  // Calculer les statistiques des crédits
  const pendingCredits = allCredits.filter(c => c.status === 'pending');
  const activeCredits = allCredits.filter(c => c.status === 'active');
  const completedCredits = allCredits.filter(c => c.status === 'completed');
  
  const totalCreditsAmount = allCredits.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = pendingCredits.reduce((sum, c) => sum + c.amount, 0);
  const activeAmount = activeCredits.reduce((sum, c) => sum + c.amount, 0);
  const completedAmount = completedCredits.reduce((sum, c) => sum + c.amount, 0);
  
  // Données pour le graphique
  const chartData = [
    { name: 'En attente', value: pendingAmount, count: pendingCredits.length, color: '#F59E0B' },
    { name: 'Actifs', value: activeAmount, count: activeCredits.length, color: '#3B82F6' },
    { name: 'Terminés', value: completedAmount, count: completedCredits.length, color: '#10B981' }
  ].filter(item => item.value > 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Résumé des Crédits
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Total: {allCredits.length} crédit{allCredits.length > 1 ? 's' : ''}</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{formatEuro(totalCreditsAmount)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allCredits.length > 0 ? (
            <div className="space-y-4">
              {chartData.length > 0 && (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsePieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke="transparent"
                            className="hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatEuro(Number(value))} 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        }} 
                      />
                    </RechartsePieChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pendingCredits.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="font-medium text-amber-700 dark:text-amber-300">En attente</span>
                      </div>
                      <Badge variant="outline" className="bg-amber-100/70 dark:bg-amber-900/50">
                        {pendingCredits.length}
                      </Badge>
                    </div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {formatEuro(pendingAmount)}
                    </div>
                  </motion.div>
                )}
                
                {activeCredits.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="font-medium text-blue-700 dark:text-blue-300">Actifs</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-100/70 dark:bg-blue-900/50">
                        {activeCredits.length}
                      </Badge>
                    </div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatEuro(activeAmount)}
                    </div>
                  </motion.div>
                )}
                
                {completedCredits.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="font-medium text-green-700 dark:text-green-300">Terminés</span>
                      </div>
                      <Badge variant="outline" className="bg-green-100/70 dark:bg-green-900/50">
                        {completedCredits.length}
                      </Badge>
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatEuro(completedAmount)}
                    </div>
                  </motion.div>
                )}
              </div>
              
              {allCredits.length > 0 && (
                <div className="text-center mt-2">
                  <p className="text-sm text-muted-foreground">
                    Consultez les détails dans les onglets spécifiques pour chaque type de crédit
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                Aucun crédit disponible
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Les crédits apparaîtront ici une fois créés
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Composant pour afficher une carte de chargement
function LoadingCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="rounded-full bg-primary/10 p-2">
            {icon}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-40">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-background"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour afficher une carte vide
function EmptyCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="rounded-full bg-primary/10 p-2">
            {icon}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-40">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center font-medium">
            Aucune transaction disponible
          </p>
          <p className="text-xs text-muted-foreground/70 text-center mt-1">
            Les données apparaîtront ici une fois disponibles
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour afficher une carte d'erreur
function ErrorCard({ title, error }: { title: string; error: unknown }) {
  return (
    <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-xl text-red-500">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
            <Info className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-40 p-4">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3 mb-3">
            <Info className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="font-medium text-red-600 dark:text-red-400 mb-1 text-center">
            Erreur de chargement
          </p>
          <p className="text-muted-foreground text-center text-sm">
            {error instanceof Error ? error.message : "Une erreur est survenue lors du chargement des données"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 

// Nouveau widget pour afficher les transactions complétées dans un tableau
export function CompletedTransactionsTableWidget() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingCard title="Transactions Complétées" icon={<Table2 className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Transactions Complétées" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Transactions Complétées" icon={<Table2 className="h-5 w-5 text-primary" />} />;
  }

  // Filtrer uniquement les transactions complétées
  const completedTransactions = transactions.filter(t => t.status === 'completed');

  if (completedTransactions.length === 0) {
    return (
      <Card className="w-full overflow-hidden border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <Table2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Transactions Complétées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Info className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Aucune transaction complétée trouvée.</p>
            <p className="text-xs text-muted-foreground mt-1">Les transactions terminées apparaîtront ici.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrer par recherche
  const filteredTransactions = completedTransactions.filter(transaction => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.description?.toLowerCase().includes(searchLower) ||
      transaction.category?.toLowerCase().includes(searchLower) ||
      transaction.formattedAmount?.toLowerCase().includes(searchLower)
    );
  });

  // Trier les transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (sortBy === 'amount') {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    
    if (sortBy === 'category') {
      const catA = a.category?.toLowerCase() || '';
      const catB = b.category?.toLowerCase() || '';
      return sortOrder === 'asc' 
        ? catA.localeCompare(catB)
        : catB.localeCompare(catA);
    }
    
    return 0;
  });

  // Fonction pour le changement de tri
  const handleSort = (column: 'date' | 'amount' | 'category') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc'); // Par défaut, tri descendant
    }
  };

  // Obtenir un emoji pour chaque type de transaction
  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'income':
        return '💰';
      case 'expense':
        return '💸';
      case 'credit':
        return '💳';
      default:
        return '📊';
    }
  };

  // Obtenir une couleur pour chaque type de transaction
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600 dark:text-green-400';
      case 'expense':
        return 'text-red-600 dark:text-red-400';
      case 'credit':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  <Table2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Transactions Complétées
              </CardTitle>
              <CardDescription>
                {filteredTransactions.length} transactions terminées {searchTerm ? '(filtrées)' : ''}
              </CardDescription>
            </div>
            
            <div className="w-full sm:w-64">
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="relative overflow-x-auto rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 dark:bg-muted/20">
                <tr>
                  <th scope="col" className="px-4 py-3 rounded-tl-md">Type</th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 cursor-pointer hover:bg-muted/80"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date
                      {sortBy === 'date' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 cursor-pointer hover:bg-muted/80"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Catégorie
                      {sortBy === 'category' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3">Description</th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 cursor-pointer hover:bg-muted/80 rounded-tr-md text-right"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end">
                      Montant
                      {sortBy === 'amount' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((transaction, index) => (
                  <motion.tr 
                    key={transaction.id}
                    className={`border-b transition-colors 
                      ${hoveredRow === String(transaction.id) ? 'bg-muted/50' : (index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10')}
                      hover:bg-muted/50`}
                    onMouseEnter={() => setHoveredRow(String(transaction.id))}
                    onMouseLeave={() => setHoveredRow(null)}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <td className={`px-4 py-2.5 ${getTypeColor(transaction.type)}`}>
                      <div className="flex items-center gap-1.5">
                        <span>{getTypeEmoji(transaction.type)}</span>
                        <span className="capitalize text-xs font-medium">
                          {transaction.type === 'income' ? 'Revenu' : 
                           transaction.type === 'expense' ? 'Dépense' : 
                           transaction.type === 'credit' ? 'Crédit' : transaction.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                      {transaction.formattedDate || new Date(transaction.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="font-normal">
                        {transaction.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate" title={transaction.description}>
                      {transaction.description}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium ${
                      transaction.type === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : transaction.type === 'expense'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {transaction.formattedAmount || formatEuro(transaction.amount)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 

// Widget Combiné Transactions Mensuelles (fusion des widgets revenus, dépenses et crédits)
export function MonthlyTransactionsWidget() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'credit'>('income');
  const [periodFilter, setPeriodFilter] = useState<'thisMonth' | 'thisQuarter' | 'thisYear' | 'all'>('thisMonth');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed'>('completed');
  
  // Fonction utilitaire pour filtrer par trimestre
  const filterTransactionsByPeriod = (transactions: TransactionData[], period: 'thisMonth' | 'thisQuarter' | 'thisYear' | 'all') => {
    if (period === 'thisQuarter') {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStartMonth = currentQuarter * 3;
      const quarterEndMonth = quarterStartMonth + 2;
      
      return transactions.filter(t => {
        const txDate = new Date(t.date);
        const txMonth = txDate.getMonth();
        return txDate.getFullYear() === now.getFullYear() && 
               txMonth >= quarterStartMonth && 
               txMonth <= quarterEndMonth;
      });
    } else if (period === 'thisMonth' || period === 'thisYear') {
      return filterTransactionsByDate(transactions, period);
    } else {
      return transactions; // 'all'
    }
  };
  
  if (isLoading) {
    return <LoadingCard title="Transactions par Catégorie" icon={<PieChart className="h-5 w-5 text-primary" />} />;
  }

  if (error) {
    return <ErrorCard title="Transactions par Catégorie" error={error} />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyCard title="Transactions par Catégorie" icon={<PieChart className="h-5 w-5 text-primary" />} />;
  }
  
  // Filtrer les transactions par période
  const periodFilteredTransactions = filterTransactionsByPeriod(transactions, periodFilter);
  
  // Filtrer par statut
  const filteredTransactions = statusFilter === 'completed' 
    ? periodFilteredTransactions 
    : periodFilteredTransactions.filter(t => t.status === statusFilter);
  
  // Calculer les montants en fonction du type et de la période
  const totalIncome = calculateIncome(filteredTransactions, 'all');
  const totalExpenses = calculateExpenses(filteredTransactions, 'all');
  
  // Obtenir les crédits et leurs montants
  const credits = filteredTransactions.filter(t => t.type === 'credit');
  const totalCreditAmount = credits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
  
  // Données pour le graphique en fonction de l'onglet actif
  const getDataForActiveTab = () => {
    let categoriesData: Record<string, number> = {};
    
    if (activeTab === 'income') {
      categoriesData = groupByCategory(filteredTransactions, 'income', 'all');
    } else if (activeTab === 'expense') {
      categoriesData = groupByCategory(filteredTransactions, 'expense', 'all');
    } else if (activeTab === 'credit') {
      // Regrouper les crédits par catégorie
      categoriesData = credits.reduce((acc: Record<string, number>, credit) => {
        const category = credit.category || 'Non catégorisé';
        if (!acc[category]) acc[category] = 0;
        acc[category] += credit.amount || 0;
        return acc;
      }, {});
    }
    
    // Fonction de traduction des catégories de transactions anglaises vers le français
    const translateCategory = (category: string) => {
      const categoryTranslations: Record<string, string> = {
        // Revenus
        'rent': 'Loyer',
        'short_term_rental': 'Location courte durée',
        'security_deposit': 'Dépôt de garantie',
        'application_fees': 'Frais de dossier',
        'service_fees': 'Frais de service',
        'late_fees': 'Pénalités de retard',
        'parking_income': 'Revenus parking',
        'common_area_income': 'Espaces communs',
        'rental_equipment': 'Location équipements',
        'additional_services': 'Services additionnels',
        'advertising_income': 'Publicité',
        'dividend_income': 'Dividendes',
        'interest_income': 'Intérêts',
        'property_sale': 'Vente immobilière',
        'insurance_claims': 'Indemnités assurance',
        'subsidies': 'Subventions',
        'refund': 'Remboursements',
        'commission': 'Commissions',
        
        // Dépenses
        'maintenance': 'Maintenance',
        'renovation': 'Rénovation',
        'cleaning': 'Nettoyage',
        'landscaping': 'Espaces verts',
        'insurance': 'Assurance',
        'tax': 'Impôts',
        'utility': 'Charges générales',
        'utilities_water': 'Eau',
        'utilities_electricity': 'Électricité',
        'utilities_gas': 'Gaz',
        'utilities_internet': 'Internet',
        'condominium_fee': 'Charges copropriété',
        'management_fee': 'Frais de gestion',
        'legal_fee': 'Frais juridiques',
        'accounting': 'Comptabilité',
        'consulting': 'Conseil',
        'inspection': 'Inspection',
        'furnishing': 'Ameublement',
        'equipment': 'Équipement',
        'marketing': 'Marketing',
        'travel': 'Déplacement',
        'security': 'Sécurité',
        
        // Crédits
        'mortgage': 'Emprunt',
        'investment': 'Investissement',
        'crypto': 'Crypto',
        
        // Par défaut
        'other': 'Divers',
        'uncategorized': 'Non catégorisé',
      };
      
      return categoryTranslations[category] || category;
    };
    
    return Object.keys(categoriesData).map(category => ({
      name: translateCategory(category),
      value: categoriesData[category]
    })).sort((a, b) => b.value - a.value);
  };
  
  const pieData = getDataForActiveTab();
  
  // Obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch(periodFilter) {
      case 'thisMonth': 
        return `${new Date().toLocaleString('fr-FR', { month: 'long' })}`;
      case 'thisQuarter': 
        const quarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `T${quarter} ${new Date().getFullYear()}`;
      case 'thisYear': 
        return `${new Date().getFullYear()}`;
      case 'all': 
        return 'Toutes périodes';
      default: 
        return '';
    }
  };
  
  // Obtenir les couleurs et les icônes en fonction de l'onglet actif
  const getTabStyles = () => {
    switch(activeTab) {
      case 'income':
        return {
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-600 dark:text-green-400',
          icon: <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
        };
      case 'expense':
        return {
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-600 dark:text-red-400',
          icon: <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
        };
      case 'credit':
        return {
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-600 dark:text-purple-400',
          icon: <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        };
      default:
        return {
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        };
    }
  };
  
  const styles = getTabStyles();
  
  // Montant à afficher en fonction de l'onglet actif
  const getDisplayAmount = () => {
    switch(activeTab) {
      case 'income': return totalIncome;
      case 'expense': return totalExpenses;
      case 'credit': return totalCreditAmount;
      default: return 0;
    }
  };
  
  // Titre en fonction de l'onglet actif
  const getTabTitle = () => {
    switch(activeTab) {
      case 'income': return 'Revenus';
      case 'expense': return 'Dépenses';
      case 'credit': return 'Crédits';
      default: return 'Transactions';
    }
  };

  // Compteurs pour l'affichage des badges
  const pendingCount = periodFilteredTransactions.filter(t => t.status === 'pending').length;
  const completedCount = periodFilteredTransactions.filter(t => t.status === 'completed').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className={`rounded-full ${styles.bgColor} p-2`}>
                  {styles.icon}
                </div>
                {getTabTitle()} par Catégorie
                {statusFilter !== 'completed' && (
                  <Badge variant="outline" className="ml-2">
                    {statusFilter === 'pending' ? 'En attente' : 'Terminées'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span>{getPeriodLabel()}: </span>
                <span className={`font-semibold ${styles.textColor}`}>{formatEuro(getDisplayAmount())}</span>
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-40">
                <Select
                  value={periodFilter}
                  onValueChange={(value) => setPeriodFilter(value as any)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thisMonth">Ce mois</SelectItem>
                    <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
                    <SelectItem value="thisYear">Cette année</SelectItem>
                    <SelectItem value="all">Toutes périodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-40">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as any)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente ({pendingCount})</SelectItem>
                    <SelectItem value="completed">Terminées ({completedCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="mt-2">
            <Tabs defaultValue="income" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="income" className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Revenus</span>
                </TabsTrigger>
                <TabsTrigger value="expense" className="flex items-center gap-1">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  <span>Dépenses</span>
                </TabsTrigger>
                <TabsTrigger value="credit" className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Crédits</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          {pieData.length > 0 ? (
            <div className="space-y-4">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={500}
                      nameKey="name"
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke="transparent"
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatEuro(Number(value))}
                      labelFormatter={(name) => `${name}`}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      }} 
                    />
                  </RechartsePieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {pieData.map((item, index) => (
                  <motion.div 
                    key={`${activeTab}-${item.name}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm font-medium truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatEuro(item.value)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Aucune transaction de {activeTab === 'income' ? 'revenu' : activeTab === 'expense' ? 'dépense' : 'crédit'} 
                {statusFilter !== 'completed' ? (statusFilter === 'pending' ? ' en attente' : ' terminée') : ''} 
                pour cette période
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
} 