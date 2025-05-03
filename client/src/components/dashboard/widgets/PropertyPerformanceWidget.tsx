import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, TrendingUp, TrendingDown, DollarSign, Percent, AlertCircle, Home, BarChart as BarChartIcon, Coins, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import { useProperties } from "@/api/properties";
import { 
  Bar, 
  BarChart as RechartsBarChart, 
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

export function PropertyPerformanceWidget() {
  const { data: properties = [], isLoading: isLoadingProperties, error: propertiesError } = useProperties();
  const [selectedView, setSelectedView] = useState<'yield' | 'value' | 'occupancy'>('yield');

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

  // Calculer les métriques de performance
  const performanceMetrics = useMemo(() => {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const metrics = new Map<number | string, {
      propertyId: number | string;
      name: string;
      purchasePrice: number;
      currentValue: number;
      annualRent: number;
      annualExpenses: number;
      occupancy: number;
      grossYield: number;
      netYield: number;
      valueGrowth: number;
    }>();

    // Initialiser les métriques pour chaque propriété
    properties.forEach(property => {
      const purchasePrice = toNumber(property.purchasePrice);
      const currentValue = toNumber(property.currentValue) || purchasePrice;
      
      metrics.set(property.id, {
        propertyId: property.id,
        name: property.name || `Propriété #${property.id}`,
        purchasePrice,
        currentValue,
        annualRent: 0,
        annualExpenses: 0,
        occupancy: property.status === 'rented' ? 1 : 0,
        grossYield: 0,
        netYield: 0,
        valueGrowth: purchasePrice > 0 ? ((currentValue - purchasePrice) / purchasePrice) * 100 : 0
      });
    });

    // Calculer les revenus annuels
    rentTransactions.forEach((transaction: { propertyId: number | string; status: string; date: string; amount: any }) => {
      if (transaction.propertyId && transaction.status === 'completed') {
        try {
          const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const amount = toNumber(transaction.amount);
            if (!isNaN(amount)) {
              const propertyMetrics = metrics.get(transaction.propertyId);
              if (propertyMetrics) {
                propertyMetrics.annualRent += amount;
              }
            }
          }
        } catch (e) {
          console.error("Erreur lors du traitement d'une transaction de loyer:", e);
        }
      }
    });

    // Calculer les dépenses annuelles
    expenseTransactions.forEach((transaction: { propertyId: number | string; status: string; date: string; amount: any }) => {
      if (transaction.propertyId && transaction.status === 'completed') {
        try {
          const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const amount = toNumber(transaction.amount);
            if (!isNaN(amount)) {
              const propertyMetrics = metrics.get(transaction.propertyId);
              if (propertyMetrics) {
                propertyMetrics.annualExpenses += amount;
              }
            }
          }
        } catch (e) {
          console.error("Erreur lors du traitement d'une transaction de dépense:", e);
        }
      }
    });

    // Calculer les rendements
    metrics.forEach(propertyMetrics => {
      if (propertyMetrics.purchasePrice > 0) {
        propertyMetrics.grossYield = (propertyMetrics.annualRent / propertyMetrics.purchasePrice) * 100;
        propertyMetrics.netYield = ((propertyMetrics.annualRent - propertyMetrics.annualExpenses) / propertyMetrics.purchasePrice) * 100;
      }
    });

    return Array.from(metrics.values());
  }, [properties, rentTransactions, expenseTransactions]);

  // Trier les propriétés selon la vue sélectionnée
  const sortedProperties = useMemo(() => {
    return [...performanceMetrics].sort((a, b) => {
      if (selectedView === 'yield') {
        return b.netYield - a.netYield;
      } else if (selectedView === 'value') {
        return b.valueGrowth - a.valueGrowth;
      } else {
        return b.occupancy - a.occupancy;
      }
    });
  }, [performanceMetrics, selectedView]);

  // Formattage
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="w-1/2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartIcon className="h-5 w-5 text-green-500" />
            Performance des propriétés
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
      <Card className="w-1/2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartIcon className="h-5 w-5 text-green-500" />
            Performance des propriétés
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
            <BarChartIcon className="h-5 w-5" />
            Performance des propriétés
          </CardTitle>
          <div className="flex items-center space-x-1 text-xs">
            <Button 
              variant="default"
              size="sm" 
              className="h-6 px-2 text-xs"
            >
              Rendement
            </Button>
          </div>
        </div>
        <CardDescription className="text-green-600/80 dark:text-green-400/70 text-xs">
          Analyse des performances de votre portefeuille immobilier
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant="default"
              size="sm" 
              className="h-6 px-2 text-xs"
            >
              Rendement
            </Button>
          </div>
          <div className="text-xs text-green-600/80 dark:text-green-400/70">
            {sortedProperties.length} propriétés
          </div>
        </div>

        <div className="overflow-y-auto max-h-[500px] pr-2">
          <div className="space-y-4">
            {sortedProperties.map((property, index) => (
              <motion.div
                key={property.propertyId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-green-50/50 dark:bg-green-950/20 rounded-lg p-4 border border-green-100 dark:border-green-900/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-bold">
                      #{index + 1}
                    </div>
                    <Home className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm text-green-700 dark:text-green-400">{property.name}</span>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    property.netYield >= 0 ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400"
                  )}>
                    {property.netYield.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600/80 dark:text-green-400/70">Valeur actuelle</span>
                      <span className="font-medium">{formatCurrency(property.currentValue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600/80 dark:text-green-400/70">Loyers annuels</span>
                      <span className="font-medium">{formatCurrency(property.annualRent)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600/80 dark:text-green-400/70">Dépenses annuelles</span>
                      <span className="font-medium">{formatCurrency(property.annualExpenses)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600/80 dark:text-green-400/70">Rendement brut</span>
                      <span className="font-medium">{property.grossYield.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 