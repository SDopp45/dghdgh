import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Property, Transaction } from "@/types";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Building2, Home, TrendingUp, Users, Wallet, AlertCircle, CheckSquare, Clock, Wrench, Tag } from "lucide-react";
import { useState, useEffect } from "react";

export function PortfolioSummaryWidget() {
  // État pour stocker les valeurs calculées
  const [summaryData, setSummaryData] = useState({
    totalProperties: 0,
    totalValue: 0,
    annualRent: 0,
    annualExpenses: 0,
    annualCredits: 0,
    netIncome: 0,
    averageYield: 0,
    availableProperties: 0,
    rentedProperties: 0,
    maintenanceProperties: 0,
    soldProperties: 0,
    occupancyRate: 0
  });

  // Récupérer les propriétés
  const { data: propertiesData = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      try {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error("Failed to fetch properties");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des propriétés:", error);
        return [];
      }
    },
  });

  // Récupérer les transactions
  const { data: transactionsData = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      return data.data || [];
      } catch (error) {
        console.error("Erreur lors de la récupération des transactions:", error);
        return [];
      }
    },
  });

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
  
  // Effet pour calculer toutes les valeurs
  useEffect(() => {
    if (!isLoadingProperties && !isLoadingTransactions) {
      try {
        // Valider et filtrer les propriétés
        const properties = Array.isArray(propertiesData) ? propertiesData : [];
        
        // Valider et filtrer les transactions
        const transactions = Array.isArray(transactionsData) ? transactionsData : [];
        
        // Calculer la date d'il y a 12 mois
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        // Filtrer les transactions récentes et complétées
        const recentTransactions = transactions.filter(t => {
          try {
            if (!t.date) return false;
            const date = new Date(t.date);
            return !isNaN(date.getTime()) && date >= twelveMonthsAgo && t.status === "completed";
          } catch (e) {
            return false;
          }
        });

        // Calculer les totaux
        let annualRent = 0;
        let annualExpenses = 0;
        let annualCredits = 0;
        
        // Calculer les loyers
        recentTransactions.forEach(t => {
          if (t.type === "income" && t.category === "rent") {
            const amount = toNumber(t.amount);
            if (!isNaN(amount)) {
              annualRent += amount;
            }
          }
        });

        // Calculer les dépenses
        recentTransactions.forEach(t => {
          if (t.type === "expense") {
            const amount = toNumber(t.amount);
            if (!isNaN(amount)) {
              annualExpenses += amount;
            }
          }
        });

        // Calculer les crédits
        recentTransactions.forEach(t => {
          if (t.type === "credit") {
            const amount = toNumber(t.amount);
            if (!isNaN(amount)) {
              annualCredits += amount;
            }
          }
        });

        // Calculer la valeur totale du portefeuille
        let totalValue = 0;
        properties.forEach(p => {
          if (p) {
            const value = toNumber(p.purchasePrice);
            if (!isNaN(value)) {
              totalValue += value;
            }
          }
        });
        
        // Calculer le revenu net
        const netIncome = annualRent - annualExpenses - annualCredits;
        
        // Calculer le rendement
  const averageYield = totalValue > 0 ? (netIncome / totalValue) * 100 : 0;

        // Calculer les statistiques de statut
  const availableProperties = properties.filter(p => p.status === "available").length;
  const rentedProperties = properties.filter(p => p.status === "rented").length;
  const maintenanceProperties = properties.filter(p => p.status === "maintenance").length;
  const soldProperties = properties.filter(p => p.status === "sold").length;
  
        // Calculer le taux d'occupation
        const totalProperties = properties.length;
        const occupancyRate = totalProperties > 0 ? (rentedProperties / totalProperties) * 100 : 0;

        // Mettre à jour l'état
        setSummaryData({
          totalProperties,
          totalValue,
          annualRent,
          annualExpenses,
          annualCredits,
          netIncome,
          averageYield,
          availableProperties,
          rentedProperties,
          maintenanceProperties,
          soldProperties,
          occupancyRate
        });
      } catch (error) {
        console.error("Erreur lors du calcul des statistiques:", error);
      }
    }
  }, [isLoadingProperties, isLoadingTransactions, propertiesData, transactionsData]);

  if (isLoadingProperties || isLoadingTransactions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Résumé du portefeuille</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résumé du portefeuille</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Nombre total de propriétés */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Propriétés</span>
            </div>
            <span className="text-2xl font-bold">{summaryData.totalProperties}</span>
          </div>

          {/* Valeur totale */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Valeur totale</span>
            </div>
            <span className="text-2xl font-bold">{formatCurrency(summaryData.totalValue)}</span>
          </div>

          {/* Rendement net moyen */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Rendement annuel</span>
            </div>
            <span className="text-2xl font-bold">{formatPercentage(summaryData.averageYield)}</span>
          </div>

          {/* Taux d'occupation moyen */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Taux d'occupation</span>
            </div>
            <span className="text-2xl font-bold">{formatPercentage(summaryData.occupancyRate)}</span>
          </div>

          {/* Revenus annuels */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Revenus annuels</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryData.annualRent)}
            </span>
          </div>

          {/* Dépenses annuelles */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dépenses annuelles</span>
            </div>
            <span className="text-2xl font-bold text-red-600">
              {formatCurrency(summaryData.annualExpenses)}
            </span>
          </div>
        </div>

        {/* Statistiques des statuts de propriétés */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Propriétés disponibles */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Disponibles</span>
            </div>
            <span className="text-2xl font-bold">{summaryData.availableProperties}</span>
          </div>

          {/* Propriétés louées */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Louées</span>
            </div>
            <span className="text-2xl font-bold">{summaryData.rentedProperties}</span>
          </div>

          {/* Propriétés en maintenance */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">En maintenance</span>
            </div>
            <span className="text-2xl font-bold">{summaryData.maintenanceProperties}</span>
          </div>

          {/* Propriétés vendues */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Vendues</span>
            </div>
            <span className="text-2xl font-bold">{summaryData.soldProperties}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
 
 