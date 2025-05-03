import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, TrendingUp, TrendingDown, DollarSign, Receipt, CircleDollarSign, AlertCircle, Coins, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { useProperties } from "@/api/properties";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Couleurs pour les graphiques
const COLORS = [
  "#10b981", "#059669", "#047857", "#065f46", "#064e3b",
  "#0d9488", "#0f766e", "#115e59", "#134e4a", "#042f2e"
];

// Fonction utilitaire pour convertir en nombre valide
const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value === 'string') {
    const parsedValue = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(parsedValue) ? 0 : parsedValue;
  }
  
  return 0;
};

export function PropertyFinanceWidget() {
  const { data: properties = [], isLoading: isLoadingProperties, error: propertiesError } = useProperties();
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '1y' | 'all'>('1y');
  const [selectedTab, setSelectedTab] = useState<'rentals' | 'expenses'>('rentals');
  
  // Récupérer les transactions de loyer
  const { data: rentTransactions = [], isLoading: isLoadingRentTransactions } = useQuery({
    queryKey: ['propertyRentals', timeframe],
    queryFn: async () => {
      try {
        const response = await fetch('/api/transactions?type=income&category=rent&status=completed');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des loyers');
        }
        const data = await response.json();
        if (data && typeof data === 'object' && 'data' in data) {
          return Array.isArray(data.data) ? data.data : [];
        }
        if (!Array.isArray(data)) {
          console.error('La réponse de l\'API n\'est pas un tableau:', data);
          return [];
        }
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des loyers:", error);
        return [];
      }
    }
  });
  
  // Récupérer les transactions de dépenses
  const { data: expenseTransactions = [], isLoading: isLoadingExpenseTransactions } = useQuery({
    queryKey: ['propertyExpenses', timeframe],
    queryFn: async () => {
      try {
        const response = await fetch('/api/transactions?type=expense&status=completed');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des dépenses');
        }
        const data = await response.json();
        if (data && typeof data === 'object' && 'data' in data) {
          return Array.isArray(data.data) ? data.data : [];
        }
        if (!Array.isArray(data)) {
          console.error('La réponse de l\'API n\'est pas un tableau:', data);
          return [];
        }
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des dépenses:", error);
      return [];
    }
    }
  });

  const isLoading = isLoadingProperties || isLoadingRentTransactions || isLoadingExpenseTransactions;
  const error = propertiesError;

  // Calculer les métriques
  const metrics = useMemo(() => {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    let totalRent = 0;
    let totalExpenses = 0;
    let totalProperties = properties.length;

    // Calculer les revenus et dépenses
    const revenuesMap = new Map<number | string, number>();
    const expensesMap = new Map<number | string, number>();

    // Calculer les revenus
    rentTransactions.forEach((transaction: { propertyId: number | string; status: string; date: string; amount: any }) => {
      if (transaction.propertyId && transaction.status === 'completed') {
        try {
      const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const amount = toNumber(transaction.amount);
            if (!isNaN(amount)) {
              const currentTotal = revenuesMap.get(transaction.propertyId) || 0;
              revenuesMap.set(transaction.propertyId, currentTotal + amount);
              totalRent += amount;
            }
          }
        } catch (e) {
          console.error("Erreur lors du traitement d'une transaction de loyer:", e);
        }
      }
    });

    // Calculer les dépenses
    expenseTransactions.forEach((transaction: { propertyId: number | string; status: string; date: string; amount: any }) => {
      if (transaction.propertyId && transaction.status === 'completed') {
        try {
          const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const amount = toNumber(transaction.amount);
            if (!isNaN(amount)) {
              const currentTotal = expensesMap.get(transaction.propertyId) || 0;
              expensesMap.set(transaction.propertyId, currentTotal + amount);
              totalExpenses += amount;
            }
          }
        } catch (e) {
          console.error("Erreur lors du traitement d'une transaction de dépense:", e);
        }
      }
    });
  
    const totalBalance = totalRent - totalExpenses;
    const profitMargin = totalRent > 0 ? (totalBalance / totalRent) * 100 : 0;

    return {
      totalProperties,
      totalRent,
      totalExpenses,
      totalBalance,
      profitMargin,
      revenuesMap,
      expensesMap
    };
  }, [properties, rentTransactions, expenseTransactions]);
  
  // Formattage
  const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(value);
    };
  
  // Données pour les graphiques
  const rentalsByProperty = useMemo(() => {
    return Array.from(metrics.revenuesMap.entries()).map(([propertyId, amount]) => {
      const property = properties.find(p => p.id === propertyId);
      return {
        propertyId,
        propertyName: property?.name || `Propriété #${propertyId}`,
        amount
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [metrics.revenuesMap, properties]);
  
  const expensesByProperty = useMemo(() => {
    return Array.from(metrics.expensesMap.entries()).map(([propertyId, amount]) => {
      const property = properties.find(p => p.id === propertyId);
      return {
        propertyId,
        propertyName: property?.name || `Propriété #${propertyId}`,
        amount
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [metrics.expensesMap, properties]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-green-500" />
            Finances des propriétés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-green-500" />
            Finances des propriétés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            Erreur de chargement des données
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-green-200 dark:border-green-900">
      <CardHeader className="bg-green-50 dark:bg-green-950/20 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CircleDollarSign className="h-5 w-5" />
            Finances des propriétés
          </CardTitle>
          <div className="flex items-center space-x-1 text-xs">
            <Button 
              variant={timeframe === '3m' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setTimeframe('3m')}
              className="h-6 px-2 text-xs"
            >
              3m
            </Button>
            <Button 
              variant={timeframe === '6m' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setTimeframe('6m')}
              className="h-6 px-2 text-xs"
            >
              6m
            </Button>
            <Button 
              variant={timeframe === '1y' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setTimeframe('1y')}
              className="h-6 px-2 text-xs"
            >
              1a
            </Button>
            <Button 
              variant={timeframe === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setTimeframe('all')}
              className="h-6 px-2 text-xs"
            >
              Tout
            </Button>
          </div>
        </div>
        <CardDescription className="text-green-600/80 dark:text-green-400/70 text-xs">
          Vue d'ensemble des revenus et dépenses de votre portefeuille
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-xl border border-green-100 dark:border-green-900/50 p-3 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-16 h-16 -mt-3 -mr-3 rounded-full bg-green-400/10 flex items-center justify-center">
              <Coins className="h-8 w-8 text-green-500/40" />
            </div>
            <div className="flex flex-col z-10 relative">
              <h3 className="font-medium text-xs text-green-700 dark:text-green-400">Revenus totaux</h3>
              <p className="text-2xl font-bold mt-1 text-green-800 dark:text-green-300">{formatCurrency(metrics.totalRent)}</p>
              <div className="mt-2 text-xs text-green-600/80 dark:text-green-400/70">
                <span>{rentTransactions.length} transactions</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-xl border border-green-100 dark:border-green-900/50 p-3 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-16 h-16 -mt-3 -mr-3 rounded-full bg-green-400/10 flex items-center justify-center">
              <Receipt className="h-8 w-8 text-green-500/40" />
            </div>
            <div className="flex flex-col z-10 relative">
              <h3 className="font-medium text-xs text-green-700 dark:text-green-400">Dépenses totales</h3>
              <p className="text-2xl font-bold mt-1 text-green-800 dark:text-green-300">{formatCurrency(metrics.totalExpenses)}</p>
              <div className="mt-2 text-xs text-green-600/80 dark:text-green-400/70">
                <span>{expenseTransactions.length} transactions</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-xl border border-green-100 dark:border-green-900/50 p-3 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-16 h-16 -mt-3 -mr-3 rounded-full bg-green-400/10 flex items-center justify-center">
              <BarChart2 className="h-8 w-8 text-green-500/40" />
            </div>
            <div className="flex flex-col z-10 relative">
              <h3 className="font-medium text-xs text-green-700 dark:text-green-400">Bénéfice net</h3>
              <p className={cn(
                "text-2xl font-bold mt-1",
                metrics.totalBalance >= 0 ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
            )}>
                {formatCurrency(metrics.totalBalance)}
              </p>
              <div className="mt-2 text-xs text-green-600/80 dark:text-green-400/70">
                <span>Marge: {metrics.profitMargin.toFixed(1)}%</span>
            </div>
            </div>
          </motion.div>
        </div>
        
        <Tabs 
          defaultValue="rentals" 
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as 'rentals' | 'expenses')}
          className="w-full"
        >
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="rentals" className="flex gap-1 text-xs">
              <Coins className="h-3 w-3" />
              Revenus
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex gap-1 text-xs">
              <Receipt className="h-3 w-3" />
              Dépenses
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rentals" className="space-y-4">
            {rentalsByProperty.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-xs">
                Aucun revenu enregistré sur cette période
              </div>
            ) : (
              <div className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-4">
                <h3 className="text-xs font-medium mb-3 text-green-700 dark:text-green-400">Revenus par propriété</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={rentalsByProperty.slice(0, 5)}
                      margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#555" opacity={0.2} />
                        <XAxis 
                          dataKey="propertyName" 
                          angle={-45} 
                          textAnchor="end" 
                        height={50} 
                        tick={{ fontSize: 10 }}
                          tickMargin={5}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value.toLocaleString()} €`} 
                        tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${Number(value).toLocaleString()} €`, 'Montant']}
                          labelFormatter={(label) => `Propriété: ${label}`}
                        />
                        <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]}>
                          {rentalsByProperty.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
            )}
          </TabsContent>
          
          <TabsContent value="expenses" className="space-y-4">
            {expensesByProperty.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-xs">
                Aucune dépense enregistrée sur cette période
              </div>
            ) : (
              <div className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-4">
                <h3 className="text-xs font-medium mb-3 text-green-700 dark:text-green-400">Dépenses par propriété</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={expensesByProperty.slice(0, 5)}
                      margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#555" opacity={0.2} />
                        <XAxis 
                          dataKey="propertyName" 
                          angle={-45} 
                          textAnchor="end" 
                        height={50} 
                        tick={{ fontSize: 10 }}
                          tickMargin={5}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value.toLocaleString()} €`} 
                        tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${Number(value).toLocaleString()} €`, 'Montant']}
                          labelFormatter={(label) => `Propriété: ${label}`}
                        />
                      <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]}>
                          {expensesByProperty.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 
 
 