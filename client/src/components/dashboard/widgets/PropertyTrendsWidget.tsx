import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, TrendingUp, BarChart3, CalendarDays, LineChart, RefreshCcw, AlertCircle, ChevronLeft, ChevronRight, FileText, Scale, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProperties } from "@/api/properties";
import { useTransactions, TransactionData } from "@/hooks/useTransactions";
import { 
  Area,
  AreaChart,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  BarChart,
  Bar
} from "recharts";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format, parseISO, subMonths, getMonth, differenceInMonths, addMonths, startOfMonth, endOfMonth, isBefore, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Property, Transaction } from "@/types";

// Animations constants
const ANIMATION_DURATION = 0.8;
const ANIMATION_STAGGER = 0.1;
const CHART_ANIMATION_DURATION = 1;

interface MonthlyData {
  rent: number;
  expenses: number;
  value: number;
  occupancy: number;
  properties: number;
  netIncome: number;
  occupancyRate: number;
  month: string;
  confirmedExpenses: number;
  confirmedCredits: number;
}

export function PropertyTrendsWidget() {
  const [selectedView, setSelectedView] = useState<'value' | 'yield' | 'occupancy' | 'comparison'>('value');
  const [timeframe, setTimeframe] = useState<'6m' | '1y' | '2y' | 'all'>('1y');
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [animationPlayed, setAnimationPlayed] = useState(false);
  const [includeExpectedRent, setIncludeExpectedRent] = useState(true);
  
  const { data: properties = [], isLoading: isLoadingProperties, error: propertiesError } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    },
  });

  const { data: transactions = [], isLoading: isLoadingTransactions, error: transactionsError } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      return data.data || [];
    },
  });

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

  const { data: confirmedExpenseTransactions = [], isLoading: isLoadingConfirmedExpenses } = useQuery({
    queryKey: ['confirmedExpenses'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/transactions?type=expense&status=completed');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des dépenses confirmées');
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
        console.error("Erreur lors de la récupération des dépenses confirmées:", error);
        return [];
      }
    }
  });

  const { data: confirmedCreditTransactions = [], isLoading: isLoadingConfirmedCredits } = useQuery({
    queryKey: ['confirmedCredits'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/transactions?type=credit&status=completed');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des crédits confirmés');
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
        console.error("Erreur lors de la récupération des crédits confirmés:", error);
        return [];
      }
    }
  });

  const { data: pendingRentTransactions = [], isLoading: isLoadingPendingRents } = useQuery({
    queryKey: ['pendingRentals'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/transactions?type=income&category=rent&status=pending');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des loyers en attente');
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
        console.error("Erreur lors de la récupération des loyers en attente:", error);
        return [];
      }
    }
  });
  
  const isLoading = isLoadingProperties || isLoadingTransactions || isLoadingRentTransactions || 
    isLoadingExpenseTransactions || isLoadingConfirmedExpenses || isLoadingConfirmedCredits || isLoadingPendingRents;
  const hasError = propertiesError || transactionsError;
  
  useEffect(() => {
    if (!isLoading && !animationPlayed) {
      // Définir un délai avant de jouer l'animation pour s'assurer que tout est rendu
      const timer = setTimeout(() => {
        setAnimationPlayed(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, animationPlayed]);
  
  // Déterminer la date de début en fonction du timeframe
  const getStartDate = useCallback(() => {
    const now = new Date();
    if (timeframe === '6m') return subMonths(now, 6);
    if (timeframe === '1y') return subMonths(now, 12);
    if (timeframe === '2y') return subMonths(now, 24);
    return new Date(2020, 0, 1); // Date raisonnable pour 'all'
  }, [timeframe]);
  
  // Calculer les périodes (mois) à afficher
  const periods = useMemo(() => {
    const result = [];
    const startDate = getStartDate();
    const today = new Date();
    let current = startOfMonth(startDate);
    
    while (isBefore(current, today)) {
      result.push({
        date: current,
        month: format(current, 'MMM yy', { locale: fr }),
        fullDate: format(current, 'MMMM yyyy', { locale: fr }),
      });
      current = addMonths(current, 1);
    }
    
    return result;
  }, [getStartDate]);
  
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
  
  // Calculer les tendances
  const trends = useMemo(() => {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const monthlyData = new Map<string, MonthlyData>();

    // Initialiser les données mensuelles
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM', { locale: fr });
      monthlyData.set(monthKey, { 
        rent: 0, 
        expenses: 0, 
        value: 0, 
        occupancy: 0, 
        properties: 0, 
        netIncome: 0, 
        occupancyRate: 0,
        month: monthKey,
        confirmedExpenses: 0,
        confirmedCredits: 0
      });
    }

    // Si une propriété est sélectionnée, ne calculer que ses données
    if (selectedProperty) {
      const property = properties.find(p => p.id.toString() === selectedProperty);
      if (property) {
        // Calculer les revenus mensuels (loyers confirmés)
        const propertyRentTransactions = rentTransactions.filter(
          (transaction: Transaction) => 
            transaction.propertyId === property.id && 
            transaction.status === 'completed'
        );

        propertyRentTransactions.forEach((transaction: Transaction) => {
          const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const monthKey = format(transactionDate, 'yyyy-MM', { locale: fr });
            const currentData = monthlyData.get(monthKey) || { 
              rent: 0, 
              expenses: 0, 
              value: 0, 
              occupancy: 0, 
              properties: 0, 
              netIncome: 0, 
              occupancyRate: 0,
              month: monthKey,
              confirmedExpenses: 0,
              confirmedCredits: 0
            };
            const amount = Number(transaction.amount) || 0;
            monthlyData.set(monthKey, { ...currentData, rent: currentData.rent + (isNaN(amount) ? 0 : amount) });
          }
        });

        // Calculer les dépenses mensuelles confirmées
        confirmedExpenseTransactions.forEach((transaction: Transaction) => {
          if (transaction.propertyId === property.id && 
              transaction.status === 'completed' && 
              transaction.type === 'expense') {
            const transactionDate = parseISO(transaction.date);
            if (isAfter(transactionDate, twelveMonthsAgo)) {
              const monthKey = format(transactionDate, 'yyyy-MM', { locale: fr });
              const currentData = monthlyData.get(monthKey) || { 
                rent: 0, 
                expenses: 0, 
                value: 0, 
                occupancy: 0, 
                properties: 0, 
                netIncome: 0, 
                occupancyRate: 0,
                month: monthKey,
                confirmedExpenses: 0,
                confirmedCredits: 0
              };
              const amount = Number(transaction.amount) || 0;
              monthlyData.set(monthKey, { 
                ...currentData, 
                confirmedExpenses: currentData.confirmedExpenses + (isNaN(amount) ? 0 : amount)
              });
            }
          }
        });

        // Calculer les crédits mensuels confirmés
        confirmedCreditTransactions.forEach((transaction: Transaction) => {
          if (transaction.propertyId === property.id && 
              transaction.status === 'completed' && 
              transaction.type === 'credit') {
            const transactionDate = parseISO(transaction.date);
            if (isAfter(transactionDate, twelveMonthsAgo)) {
              const monthKey = format(transactionDate, 'yyyy-MM', { locale: fr });
              const currentData = monthlyData.get(monthKey) || { 
                rent: 0, 
                expenses: 0, 
                value: 0, 
                occupancy: 0, 
                properties: 0, 
                netIncome: 0, 
                occupancyRate: 0,
                month: monthKey,
                confirmedExpenses: 0,
                confirmedCredits: 0
              };
              const amount = Number(transaction.amount) || 0;
              monthlyData.set(monthKey, { 
                ...currentData, 
                confirmedCredits: currentData.confirmedCredits + (isNaN(amount) ? 0 : amount)
              });
            }
          }
        });

        // Calculer les valeurs mensuelles pour cette propriété
        const purchasePrice = toNumber(property.purchasePrice);
        const currentValue = toNumber(property.currentValue) || purchasePrice;
        const monthlyValue = isNaN(purchasePrice) ? 0 : purchasePrice;

        for (let i = 0; i < 12; i++) {
          const date = subMonths(new Date(), i);
          const monthKey = format(date, 'yyyy-MM', { locale: fr });
          const currentData = monthlyData.get(monthKey) || { 
            rent: 0, 
            expenses: 0, 
            value: 0, 
            occupancy: 0, 
            properties: 0, 
            netIncome: 0, 
            occupancyRate: 0,
            month: monthKey,
            confirmedExpenses: 0,
            confirmedCredits: 0
          };
          monthlyData.set(monthKey, { 
            ...currentData, 
            value: monthlyValue,
            properties: 1,
            occupancy: property.status === 'rented' ? 1 : 0
          });
        }
      }
    } else {
      // Si aucune propriété n'est sélectionnée, calculer les moyennes de toutes les propriétés
      // Calculer les revenus mensuels (loyers confirmés) par propriété
      properties.forEach(property => {
        const propertyRentTransactions = rentTransactions.filter(
          (transaction: Transaction) => 
            transaction.propertyId === property.id && 
            transaction.status === 'completed'
        );

        propertyRentTransactions.forEach((transaction: Transaction) => {
          const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const monthKey = format(transactionDate, 'yyyy-MM', { locale: fr });
            const currentData = monthlyData.get(monthKey) || { 
              rent: 0, 
              expenses: 0, 
              value: 0, 
              occupancy: 0, 
              properties: 0, 
              netIncome: 0, 
              occupancyRate: 0,
              month: monthKey,
              confirmedExpenses: 0,
              confirmedCredits: 0
            };
            const amount = Number(transaction.amount) || 0;
            monthlyData.set(monthKey, { ...currentData, rent: currentData.rent + (isNaN(amount) ? 0 : amount) });
          }
        });

        // Calculer les dépenses mensuelles confirmées par propriété
        const propertyExpenseTransactions = confirmedExpenseTransactions.filter(
          (transaction: Transaction) => 
            transaction.propertyId === property.id && 
            transaction.status === 'completed' && 
            transaction.type === 'expense'
        );

        propertyExpenseTransactions.forEach((transaction: Transaction) => {
          const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const monthKey = format(transactionDate, 'yyyy-MM', { locale: fr });
            const currentData = monthlyData.get(monthKey) || { 
              rent: 0, 
              expenses: 0, 
              value: 0, 
              occupancy: 0, 
              properties: 0, 
              netIncome: 0, 
              occupancyRate: 0,
              month: monthKey,
              confirmedExpenses: 0,
              confirmedCredits: 0
            };
            const amount = Number(transaction.amount) || 0;
            monthlyData.set(monthKey, { 
              ...currentData, 
              confirmedExpenses: currentData.confirmedExpenses + (isNaN(amount) ? 0 : amount)
            });
          }
        });

        // Calculer les crédits mensuels confirmés par propriété
        const propertyCreditTransactions = confirmedCreditTransactions.filter(
          (transaction: Transaction) => 
            transaction.propertyId === property.id && 
            transaction.status === 'completed' && 
            transaction.type === 'credit'
        );

        propertyCreditTransactions.forEach((transaction: Transaction) => {
          const transactionDate = parseISO(transaction.date);
          if (isAfter(transactionDate, twelveMonthsAgo)) {
            const monthKey = format(transactionDate, 'yyyy-MM', { locale: fr });
            const currentData = monthlyData.get(monthKey) || { 
              rent: 0, 
              expenses: 0, 
              value: 0, 
              occupancy: 0, 
              properties: 0, 
              netIncome: 0, 
              occupancyRate: 0,
              month: monthKey,
              confirmedExpenses: 0,
              confirmedCredits: 0
            };
            const amount = Number(transaction.amount) || 0;
            monthlyData.set(monthKey, { 
              ...currentData, 
              confirmedCredits: currentData.confirmedCredits + (isNaN(amount) ? 0 : amount)
            });
          }
        });

        // Calculer les valeurs mensuelles pour cette propriété
        const purchasePrice = toNumber(property.purchasePrice);
        const currentValue = toNumber(property.currentValue) || purchasePrice;
        const monthlyValue = isNaN(purchasePrice) ? 0 : purchasePrice;

        for (let i = 0; i < 12; i++) {
          const date = subMonths(new Date(), i);
          const monthKey = format(date, 'yyyy-MM', { locale: fr });
          const currentData = monthlyData.get(monthKey) || { 
            rent: 0, 
            expenses: 0, 
            value: 0, 
            occupancy: 0, 
            properties: 0, 
            netIncome: 0, 
            occupancyRate: 0,
            month: monthKey,
            confirmedExpenses: 0,
            confirmedCredits: 0
          };
          monthlyData.set(monthKey, { 
            ...currentData, 
            value: currentData.value + monthlyValue,
            properties: currentData.properties + 1,
            occupancy: currentData.occupancy + (property.status === 'rented' ? 1 : 0)
          });
        }
      });
    }

    // Convertir en tableau et trier par date
    const sortedData = Array.from(monthlyData.entries())
      .map(([monthKey, data]) => ({
        ...data,
        netIncome: data.rent - data.confirmedExpenses - data.confirmedCredits,
        occupancyRate: data.properties > 0 ? (data.occupancy / data.properties) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month)) as MonthlyData[];

    return {
      data: sortedData,
      formatCurrency: (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value),
      formatPercentage: (value: number) => `${value.toFixed(1)}%`
    };
  }, [properties, rentTransactions, confirmedExpenseTransactions, confirmedCreditTransactions, selectedProperty]);
  
  // Préparer les données pour le graphique en fonction de la vue sélectionnée
  const chartData = useMemo(() => {
    if (properties.length === 0) {
      return [];
    }
    
    // Obtenir les propriétés à afficher
    // Pour les cartes, on limite à 3 propriétés
    const displayedProperties = properties
      .filter(p => !selectedProperty || p.id.toString() === selectedProperty)
      .slice(0, selectedProperty ? 1 : 3);
    
    // Pour le graphique, on prend toutes les propriétés si "Toutes les propriétés" est sélectionné
    const propertiesForChart = selectedProperty 
      ? properties.filter(p => p.id.toString() === selectedProperty)
      : properties;
    
    // Créer un objet pour stocker les données par mois
    const monthlyData = new Map<string, {
      month: string;
      fullDate: string;
      rent: number;
      confirmedExpenses: number;
      confirmedCredits: number;
      netIncome: number;
      yield: number;
      occupancyRate: number;
      performance: number;
    }>();
    
    // Initialiser les données pour chaque mois
    periods.forEach(period => {
      monthlyData.set(period.month, {
        month: period.month,
        fullDate: period.fullDate,
        rent: 0,
        confirmedExpenses: 0,
        confirmedCredits: 0,
        netIncome: 0,
        yield: 0,
        occupancyRate: 0,
        performance: 0
      });
    });
    
    // Pour chaque propriété du graphique
    propertiesForChart.forEach(property => {
      // Calculer les loyers par mois
      rentTransactions.forEach((transaction: Transaction) => {
        if (transaction.propertyId === property.id && transaction.status === 'completed') {
          const transactionDate = parseISO(transaction.date);
          const monthKey = format(transactionDate, 'MMM yy', { locale: fr });
          const data = monthlyData.get(monthKey);
          if (data) {
            const amount = Number(transaction.amount) || 0;
            data.rent += isNaN(amount) ? 0 : amount;
          }
        }
      });
      
      // Calculer les dépenses par mois
      confirmedExpenseTransactions.forEach((transaction: Transaction) => {
        if (transaction.propertyId === property.id && 
            transaction.status === 'completed' && 
            transaction.type === 'expense') {
          const transactionDate = parseISO(transaction.date);
          const monthKey = format(transactionDate, 'MMM yy', { locale: fr });
          const data = monthlyData.get(monthKey);
          if (data) {
            const amount = Number(transaction.amount) || 0;
            data.confirmedExpenses += isNaN(amount) ? 0 : amount;
          }
        }
      });
      
      // Calculer les crédits par mois
      confirmedCreditTransactions.forEach((transaction: Transaction) => {
        if (transaction.propertyId === property.id && 
            transaction.status === 'completed' && 
            transaction.type === 'credit') {
          const transactionDate = parseISO(transaction.date);
          const monthKey = format(transactionDate, 'MMM yy', { locale: fr });
          const data = monthlyData.get(monthKey);
          if (data) {
            const amount = Number(transaction.amount) || 0;
            data.confirmedCredits += isNaN(amount) ? 0 : amount;
          }
        }
      });
    });
    
    // Calculer les métriques finales pour chaque mois
    const totalValue = propertiesForChart.reduce((sum, property) => {
      return sum + toNumber(property.purchasePrice);
    }, 0);
    
    // Convertir en tableau et calculer les métriques finales
    const chartData = Array.from(monthlyData.values()).map(data => {
      data.netIncome = data.rent - data.confirmedExpenses - data.confirmedCredits;
      data.yield = totalValue > 0 ? (data.netIncome / totalValue) * 100 : 0;
      
      // Calculer le taux d'occupation en fonction des loyers perçus
      const totalExpectedRent = propertiesForChart.reduce((sum, property) => {
        const propertyExpectedRent = pendingRentTransactions
          .filter((t: Transaction) => t.propertyId === property.id)
          .reduce((sum: number, t: Transaction) => {
            const amount = Number(t.amount) || 0;
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
        return sum + (isNaN(propertyExpectedRent) ? 0 : propertyExpectedRent);
      }, 0);
      
      const totalRent = data.rent + totalExpectedRent;
      data.occupancyRate = totalRent > 0 ? (data.rent / totalRent) * 100 : 0;
      
      // La performance est identique au rendement net
      data.performance = data.yield;
      return data;
    });
    
    // Trier par date
    return chartData.sort((a, b) => {
      const dateA = parseISO(a.fullDate);
      const dateB = parseISO(b.fullDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [properties, periods, rentTransactions, confirmedExpenseTransactions, confirmedCreditTransactions, pendingRentTransactions, selectedProperty]);
  
  // Formatter l'axe Y pour les différentes vues
  const formatYAxis = (value: number) => {
    if (selectedView === 'value') {
      return `${(value / 1000).toFixed(0)}k€`;
    } else if (selectedView === 'yield') {
      return `${value}%`;
    } else {  // occupancy
      return `${value}%`;
    }
  };
  
  // Formatter les tooltips
  const formatTooltip = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
      .format(value);
  };
  
  // Effet de débogage pour vérifier les mises à jour
  useEffect(() => {
    console.log('Mise à jour des données du graphique:', {
      selectedProperty,
      timeframe,
      selectedView,
      dataPoints: chartData.length,
      firstDataPoint: chartData[0],
      lastDataPoint: chartData[chartData.length - 1]
    });
  }, [selectedProperty, timeframe, selectedView, chartData]);
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Tendances du portefeuille
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Tendances du portefeuille
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

  if (properties.length === 0 || chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Tendances du portefeuille
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <p>Aucune donnée disponible pour afficher les tendances</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden border-green-200 dark:border-green-900">
      <CardHeader className="bg-green-50 dark:bg-green-950/20 rounded-t-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <LineChart className="h-5 w-5" />
              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Évolution du portefeuille
              </motion.span>
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="ml-2"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
              </motion.span>
            </CardTitle>
            <CardDescription className="mt-1 text-green-600/80 dark:text-green-400/70">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Analyse des tendances et projections
              </motion.span>
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedProperty) {
                    const currentIndex = properties.findIndex(p => p.id.toString() === selectedProperty);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : properties.length - 1;
                    setSelectedProperty(properties[prevIndex].id.toString());
                  }
                }}
                className="h-8 w-8 p-0 border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select value={selectedProperty || "all"} onValueChange={(value) => setSelectedProperty(value === "all" ? null : value)}>
                <SelectTrigger className="w-[140px] h-8 text-xs border-green-200 text-green-700 bg-green-50/50">
                  <SelectValue placeholder="Toutes les propriétés" />
                </SelectTrigger>
                <SelectContent className="border-green-200">
                  <SelectItem value="all">Toutes les propriétés</SelectItem>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedProperty) {
                    const currentIndex = properties.findIndex(p => p.id.toString() === selectedProperty);
                    const nextIndex = currentIndex < properties.length - 1 ? currentIndex + 1 : 0;
                    setSelectedProperty(properties[nextIndex].id.toString());
                  }
                }}
                className="h-8 w-8 p-0 border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-1 text-xs">
              <Button 
                variant={timeframe === '6m' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setTimeframe('6m')}
                className={`h-7 px-2 ${timeframe === '6m' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50'}`}
              >
                6 mois
              </Button>
              <Button 
                variant={timeframe === '1y' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setTimeframe('1y')}
                className={`h-7 px-2 ${timeframe === '1y' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50'}`}
              >
                1 an
              </Button>
              <Button 
                variant={timeframe === '2y' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setTimeframe('2y')}
                className={`h-7 px-2 ${timeframe === '2y' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50'}`}
              >
                2 ans
              </Button>
              <Button 
                variant={timeframe === 'all' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setTimeframe('all')}
                className={`h-7 px-2 ${timeframe === 'all' ? 'bg-green-600 hover:bg-green-700' : 'border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50'}`}
              >
                Tout
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6 pt-5">
        <Tabs 
          defaultValue="value" 
          value={selectedView}
          onValueChange={(value) => setSelectedView(value as 'value' | 'yield' | 'occupancy' | 'comparison')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-green-50/50 dark:bg-green-950/10">
            <TabsTrigger 
              value="value" 
              className={`flex items-center gap-1 ${selectedView === 'value' ? 'bg-green-600 text-white data-[state=active]:bg-green-600' : 'text-green-700 dark:text-green-400 data-[state=active]:text-green-900'}`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Flux financiers</span>
              <span className="sm:hidden">Flux</span>
            </TabsTrigger>
            <TabsTrigger 
              value="yield" 
              className={`flex items-center gap-1 ${selectedView === 'yield' ? 'bg-green-600 text-white data-[state=active]:bg-green-600' : 'text-green-700 dark:text-green-400 data-[state=active]:text-green-900'}`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Résultats</span>
              <span className="sm:hidden">Rés.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="occupancy" 
              className={`flex items-center gap-1 ${selectedView === 'occupancy' ? 'bg-green-600 text-white data-[state=active]:bg-green-600' : 'text-green-700 dark:text-green-400 data-[state=active]:text-green-900'}`}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
              <span className="sm:hidden">Perf.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="comparison" 
              className={`flex items-center gap-1 ${selectedView === 'comparison' ? 'bg-green-600 text-white data-[state=active]:bg-green-600' : 'text-green-700 dark:text-green-400 data-[state=active]:text-green-900'}`}
            >
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Comparaison</span>
              <span className="sm:hidden">Comp.</span>
            </TabsTrigger>
          </TabsList>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-br from-green-50/30 to-green-50/10 dark:from-green-950/10 dark:to-green-900/5 rounded-xl p-1 sm:p-6 overflow-hidden"
          >
            {/* Effet de grille futuriste en arrière-plan */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSIjZmZmIi8+PC9nPjwvc3ZnPg==')]"></div>
            </div>

            {/* Effet de lueur pour les graphiques */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-transparent blur-3xl"></div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {selectedView === 'comparison' && (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="rgba(0,0,0,0.2)" 
                          className="dark:stroke-[rgba(255,255,255,0.2)]"
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="month"
                          tick={{ fill: 'rgba(0,0,0,0.9)', fontSize: 12 }}
                          stroke="rgba(0,0,0,0.7)"
                          className="dark:text-white dark:stroke-[rgba(255,255,255,0.5)]"
                        />
                        <YAxis 
                          tick={{ fill: 'rgba(0,0,0,0.9)', fontSize: 12 }}
                          stroke="rgba(0,0,0,0.7)"
                          className="dark:text-white dark:stroke-[rgba(255,255,255,0.5)]"
                        />
                        <Tooltip 
                          contentStyle={{
                            background: 'rgba(255,255,255,0.95)',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            color: '#000',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{
                            color: 'rgba(0,0,0,0.8)',
                            fontSize: '12px'
                          }}
                          className="dark:text-white"
                        />
                        <Bar dataKey="rent" name="Loyers perçus" fill="#82ca9d" />
                        <Bar dataKey="confirmedExpenses" name="Dépenses confirmées" fill="#ffc658" />
                        <Bar dataKey="confirmedCredits" name="Crédits confirmés" fill="#0088fe" />
                        <Bar dataKey="netIncome" name="Résultat net" fill="#ff8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {selectedView === 'value' && (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          {/* Gradients améliorés avec effets de lueur */}
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff8042" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ff8042" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0088fe" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0088fe" stopOpacity={0.1}/>
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
                            if (name === 'yield' || name === 'occupancy') {
                              return [`${value.toFixed(1)}%`, name];
                            }
                            return [new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value), name];
                          }}
                          labelFormatter={(label) => {
                            const dataPoint = chartData.find(d => d.month === label);
                            return dataPoint?.fullDate || label;
                          }}
                        />
                        <Legend 
                          wrapperStyle={{
                            paddingTop: '20px',
                            color: 'rgba(0,0,0,0.8)',
                            fontSize: '12px'
                          }}
                          className="dark:text-white"
                        />
                        
                        <Area 
                          type="monotone" 
                          dataKey="rent" 
                          name="Loyers perçus" 
                          stroke="#82ca9d" 
                          fillOpacity={1} 
                          fill="url(#colorRent)"
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="confirmedExpenses" 
                          name="Dépenses confirmées" 
                          stroke="#ffc658" 
                          fillOpacity={1} 
                          fill="url(#colorExpenses)"
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="confirmedCredits" 
                          name="Crédits confirmés" 
                          stroke="#0088fe" 
                          fillOpacity={1} 
                          fill="url(#colorOccupancy)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {selectedView === 'yield' && (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          {/* Gradients améliorés avec effets de lueur */}
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff8042" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ff8042" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0088fe" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0088fe" stopOpacity={0.1}/>
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
                            if (name === 'yield' || name === 'occupancy') {
                              return [`${value.toFixed(1)}%`, name];
                            }
                            return [new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value), name];
                          }}
                          labelFormatter={(label) => {
                            const dataPoint = chartData.find(d => d.month === label);
                            return dataPoint?.fullDate || label;
                          }}
                        />
                        <Legend 
                          wrapperStyle={{
                            paddingTop: '20px',
                            color: 'rgba(0,0,0,0.8)',
                            fontSize: '12px'
                          }}
                          className="dark:text-white"
                        />
                        
                        <Area 
                          type="monotone" 
                          dataKey="netIncome" 
                          name="Résultat net" 
                          stroke="#ff8042" 
                          fillOpacity={1} 
                          fill="url(#colorYield)"
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="yield" 
                          name="Rendement net" 
                          stroke="#8884d8" 
                          fillOpacity={1} 
                          fill="url(#colorValue)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {selectedView === 'occupancy' && (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          {/* Gradients améliorés avec effets de lueur */}
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff8042" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ff8042" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0088fe" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0088fe" stopOpacity={0.1}/>
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
                          tickFormatter={(value) => `${value}%`}
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
                            return [`${value.toFixed(1)}%`, name];
                          }}
                          labelFormatter={(label) => {
                            const dataPoint = chartData.find(d => d.month === label);
                            return dataPoint?.fullDate || label;
                          }}
                        />
                        <Legend 
                          wrapperStyle={{
                            paddingTop: '20px',
                            color: 'rgba(0,0,0,0.8)',
                            fontSize: '12px'
                          }}
                          className="dark:text-white"
                        />
                        
                        <Area 
                          type="monotone" 
                          dataKey="occupancyRate" 
                          name="Taux d'occupation" 
                          stroke="#0088fe" 
                          fillOpacity={1} 
                          fill="url(#colorOccupancy)"
                          strokeWidth={2}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="performance" 
                          name="Performance" 
                          stroke="#82ca9d" 
                          fillOpacity={1} 
                          fill="url(#colorRent)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
          
          {/* Afficher les statistiques des propriétés */}
          <div className="mt-6 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {properties
                .filter(p => !selectedProperty || p.id.toString() === selectedProperty)
                .slice(currentPage * 3, (currentPage + 1) * 3)
                .map((property, index) => {
                  // Calculer les loyers perçus pour cette propriété
                  const propertyRent = rentTransactions
                    .filter((t: Transaction) => 
                      t.propertyId === property.id && 
                      t.status === 'completed'
                    )
                    .reduce((sum: number, t: Transaction) => sum + (Number(t.amount) || 0), 0);

                  // Calculer les dépenses confirmées pour cette propriété
                  const propertyExpenses = confirmedExpenseTransactions
                    .filter((t: Transaction) => 
                      t.propertyId === property.id && 
                      t.status === 'completed' && 
                      t.type === 'expense'
                    )
                    .reduce((sum: number, t: Transaction) => sum + (Number(t.amount) || 0), 0);

                  // Calculer les crédits confirmés pour cette propriété
                  const propertyConfirmedCredits = confirmedCreditTransactions
                    .filter((t: Transaction) => 
                      t.propertyId === property.id && 
                      t.status === 'completed' && 
                      t.type === 'credit'
                    )
                    .reduce((sum: number, t: Transaction) => sum + (Number(t.amount) || 0), 0);

                  // Calculer les loyers attendus pour cette propriété
                  const expectedRent = pendingRentTransactions
                    .filter((t: Transaction) => t.propertyId === property.id)
                    .reduce((sum: number, t: Transaction) => sum + (Number(t.amount) || 0), 0);

                  // Calculer la valeur de la propriété
                  const purchasePrice = toNumber(property.purchasePrice);
                  const safePropertyValue = isNaN(purchasePrice) ? 0 : purchasePrice;

                  // Calculer le résultat net : Loyers perçus - Dépenses confirmées - Crédits confirmés
                  const propertyNetIncome = propertyRent - propertyExpenses - propertyConfirmedCredits;

                  // Calculer le taux d'occupation
                  const totalRent = propertyRent + expectedRent;
                  const occupancyRate = totalRent > 0 ? (propertyRent / totalRent) * 100 : 0;

                  // Calculer le rendement net : Résultat net / Valeur
                  const propertyYield = safePropertyValue > 0 
                    ? (propertyNetIncome / safePropertyValue) * 100 
                    : 0;

                  // Calculer la performance en fonction des données réelles du mois
                  const currentMonth = format(new Date(), 'MMM yy', { locale: fr });
                  const currentMonthData = chartData.find(data => data.month === currentMonth);
                  
                  // La performance est identique au rendement net
                  const performancePercentage = propertyYield;

                  return (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: ANIMATION_DURATION, delay: index * ANIMATION_STAGGER }}
                      className="bg-muted/30 rounded-lg p-4 border border-muted"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-medium">{property.name}</div>
                        <Badge 
                          className={propertyNetIncome > 0 ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"}
                        >
                          {propertyNetIncome > 0 ? '+' : ''}{trends.formatCurrency(propertyNetIncome)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Valeur</span>
                          <span className="font-medium">{trends.formatCurrency(safePropertyValue)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Occupation</span>
                          <span className="font-medium">{trends.formatPercentage(occupancyRate)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Loyers perçus</span>
                          <span className="font-medium text-green-600">{trends.formatCurrency(propertyRent)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Loyers attendus</span>
                          <span className="font-medium text-amber-600">{trends.formatCurrency(expectedRent)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Dépenses confirmées</span>
                          <span className="font-medium text-red-600">{trends.formatCurrency(propertyExpenses)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Crédits confirmés</span>
                          <span className="font-medium text-blue-600">{trends.formatCurrency(propertyConfirmedCredits)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Résultat net</span>
                          <span className={`font-medium ${propertyNetIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trends.formatCurrency(propertyNetIncome)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Performance</span>
                          <span className={`font-medium ${propertyNetIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trends.formatPercentage(performancePercentage)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
            
            {/* Flèches de navigation */}
            {properties.length > 3 && !selectedProperty && (
              <>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(properties.length / 3) - 1, prev + 1))}
                  disabled={currentPage >= Math.ceil(properties.length / 3) - 1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
} 