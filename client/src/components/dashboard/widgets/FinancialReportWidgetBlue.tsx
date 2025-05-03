import { motion } from "framer-motion";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Scale,
  CreditCard,
  FileText,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { useState } from "react";
import { 
  useTransactions, 
  formatEuro, 
  calculateIncome, 
  calculateExpenses,
  calculateBalance,
  getTotalCreditAmount,
  getTotalRemainingCreditAmount,
  getTotalMonthlyPayments,
  getCredits
} from "@/hooks/useTransactions";

// Widget Rapport Financier avec style bleu
export function FinancialReportWidgetBlue() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  if (isLoading) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Rapport Financier
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
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Rapport Financier
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
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Rapport Financier
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
  const filteredTransactions = transactions.filter(tx => {
    if (statusFilter === 'all') return true;
    return tx.status === statusFilter;
  });

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
    setStatusFilter(value as 'all' | 'pending' | 'completed');
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
                {statusFilter !== 'all' && (
                  <Badge variant="outline" className="ml-2 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                    {statusFilter === 'pending' ? 'En attente' : 'Terminées'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                Vue d'ensemble de vos finances
                {statusFilter === 'all' 
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
                  <SelectItem value="all">Tous les statuts</SelectItem>
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
                {statusFilter !== 'all' && (
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
 
 