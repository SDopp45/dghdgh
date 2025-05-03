import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, TrendingUp, DollarSign, Percent, AlertCircle, Home, BarChart, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { useProperties } from "@/api/properties";
import { subMonths, isAfter, parseISO } from "date-fns";
import { useMemo } from "react";

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

export function PropertySummaryWidget() {
  const { data: properties = [], isLoading: isLoadingProperties, error: propertiesError } = useProperties();

  // Récupérer les transactions de loyer
  const { data: rentTransactions = [], isLoading: isLoadingRentTransactions } = useQuery({
    queryKey: ['propertyRentals'],
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
    queryKey: ['propertyExpenses'],
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
    let totalValue = 0;
    let totalRent = 0;
    let totalExpenses = 0;
    let occupiedCount = 0;
    let vacantCount = 0;
    let maintenanceCount = 0;

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
            }
          }
        } catch (e) {
          console.error("Erreur lors du traitement d'une transaction de dépense:", e);
        }
      }
    });

    // Calculer les métriques des propriétés
    properties.forEach(property => {
      try {
        const propertyValue = toNumber(property.currentValue) || toNumber(property.purchasePrice);
        if (!isNaN(propertyValue)) {
          totalValue += propertyValue;
        }

        const propertyRent = revenuesMap.get(property.id) || 0;
        const propertyExpenses = expensesMap.get(property.id) || 0;

        if (!isNaN(propertyRent)) {
          totalRent += propertyRent;
        }
        if (!isNaN(propertyExpenses)) {
          totalExpenses += propertyExpenses;
        }

      if (property.status === 'rented') {
        occupiedCount++;
      } else if (property.status === 'available') {
        vacantCount++;
      } else if (property.status === 'maintenance') {
        maintenanceCount++;
        }
      } catch (e) {
        console.error("Erreur lors du traitement d'une propriété:", e);
      }
    });

    const totalProperties = properties.length;
    const averageYield = totalValue > 0 ? ((totalRent - totalExpenses) / totalValue) * 100 : 0;

    return {
      totalProperties,
      totalValue,
      totalRent,
      totalExpenses,
      averageYield,
      statusDistribution: {
        occupied: occupiedCount,
        vacant: vacantCount,
        maintenance: maintenanceCount
      }
    };
  }, [properties, rentTransactions, expenseTransactions]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-500" />
            Résumé du portefeuille
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
            <Building2 className="h-5 w-5 text-green-500" />
            Résumé du portefeuille
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

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <Card className="w-full border-green-200 dark:border-green-900">
      <CardHeader className="bg-green-50 dark:bg-green-950/20 rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Building2 className="h-5 w-5" />
          Résumé du portefeuille
        </CardTitle>
        <CardDescription className="text-green-600/80 dark:text-green-400/70">
          Vue d'ensemble de votre patrimoine immobilier
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl border border-green-100 dark:border-green-900/50 p-5 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-green-400/10 flex items-center justify-center">
              <Home className="h-10 w-10 text-green-500/40" />
            </div>
            <div className="flex flex-col z-10 relative">
              <h3 className="font-medium text-sm text-green-700 dark:text-green-400">Total des propriétés</h3>
              <p className="text-3xl font-bold mt-2 text-green-800 dark:text-green-300">{metrics.totalProperties}</p>
              <div className="mt-3 grid grid-cols-3 gap-1 text-xs">
                <div className="flex flex-col">
                  <span className="text-green-500 font-medium">Louées</span>
                  <span className="font-bold text-green-700 dark:text-green-300">{metrics.statusDistribution.occupied}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-yellow-500 font-medium">Disponibles</span>
                  <span className="font-bold text-green-700 dark:text-green-300">{metrics.statusDistribution.vacant}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-amber-500 font-medium">En maintenance</span>
                  <span className="font-bold text-green-700 dark:text-green-300">{metrics.statusDistribution.maintenance}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-xl border border-green-100 dark:border-green-900/50 p-5 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-green-400/10 flex items-center justify-center">
              <Coins className="h-10 w-10 text-green-500/40" />
            </div>
            <div className="flex flex-col z-10 relative">
              <h3 className="font-medium text-sm text-green-700 dark:text-green-400">Valeur totale</h3>
              <p className="text-3xl font-bold mt-2 text-green-800 dark:text-green-300">{formatCurrency(metrics.totalValue)}</p>
              <div className="mt-3 text-xs text-green-600/80 dark:text-green-400/70">
                <span>Prix d'achat moyen: {formatCurrency(metrics.totalValue / (metrics.totalProperties || 1))}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-xl border border-green-100 dark:border-green-900/50 p-5 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-green-400/10 flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-green-500/40" />
            </div>
            <div className="flex flex-col z-10 relative">
              <h3 className="font-medium text-sm text-green-700 dark:text-green-400">Revenus annuels</h3>
              <p className="text-3xl font-bold mt-2 text-green-800 dark:text-green-300">{formatCurrency(metrics.totalRent)}</p>
              <div className="mt-3 text-xs text-green-600/80 dark:text-green-400/70">
                <span>Dépenses: {formatCurrency(metrics.totalExpenses)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-xl border border-green-100 dark:border-green-900/50 p-5 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 -mt-5 -mr-5 rounded-full bg-green-400/10 flex items-center justify-center">
              <BarChart className="h-10 w-10 text-green-500/40" />
            </div>
            <div className="flex flex-col z-10 relative">
              <h3 className="font-medium text-sm text-green-700 dark:text-green-400">Rendement moyen</h3>
              <p className="text-3xl font-bold mt-2 text-green-800 dark:text-green-300">{metrics.averageYield.toFixed(1)}%</p>
              <div className="mt-3 text-xs text-green-600/80 dark:text-green-400/70">
                <span>Net après dépenses</span>
              </div>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
} 
 
 