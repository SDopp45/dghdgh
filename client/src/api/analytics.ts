import { useQuery } from '@tanstack/react-query';
import { subMonths, format, parseISO, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Property } from '../../../shared/schema';
import { useProperties } from './properties';
import { useTenantsForHistory } from './tenant-history';
import { useMetricsStore } from '@/lib/stores/useMetricsStore';

/**
 * Types pour les données d'analyse immobilière
 */
export interface PropertyAnalytics {
  propertyId: number;
  propertyName: string;
  marketValue: number;           // Valeur marchande estimée
  purchasePrice: number;         // Prix d'achat
  appreciation: number;          // Appréciation en % depuis l'achat
  rentPrice: number;             // Prix de location actuel
  roi: number;                   // Retour sur investissement en %
  occupancyRate: number;         // Taux d'occupation en %
  previousOccupancyRate: number; // Taux d'occupation précédent
  maintenanceCosts: number;      // Coûts de maintenance sur la période
  cashflow: number;              // Flux de trésorerie sur la période
  areaRating: number;            // Note de la zone (1-5)
  insights: string[];            // Analyse et conseils
}

/**
 * Types pour les données d'analyse des performances locatives
 */
export interface RentalPerformance {
  month: string;                 // Mois au format "YYYY-MM"
  date?: string;                 // Mois au format "YYYY-MM" (compatibilité avec useMetricsStore)
  monthLabel: string;            // Nom du mois formaté
  occupancyRate: number;         // Taux d'occupation en %
  rentCollection: number;        // Taux de recouvrement des loyers en %
  rentalYield: number;           // Rendement locatif en %
  previous: {                    // Données du mois précédent pour comparaison
    occupancyRate: number;
    rentCollection: number;
    rentalYield: number;
  };
}

/**
 * Hook pour générer l'historique des métriques si nécessaire
 * @returns Fonction pour générer l'historique
 */
function useGenerateHistoricalMetrics() {
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenantsForHistory();
  const { 
    propertyMetrics, 
    rentalMetrics, 
    addPropertyMetric, 
    addRentalMetric,
    updateTimestamp
  } = useMetricsStore();
  
  // Fonction pour générer l'historique des métriques de propriété
  const generatePropertyMetrics = () => {
    // Vérifier si nous avons besoin de générer de nouvelles données
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    // Période d'historique à générer (12 mois)
    const historyMonths = 12;
    
    // Pour chaque propriété
    properties.forEach(property => {
      const propertyId = property.id;
      const existingMetrics = propertyMetrics[propertyId] || [];
      
      // Vérifier si les métriques existent déjà pour le mois en cours
      const hasCurrentMonth = existingMetrics.some(m => m.date === currentMonth);
      
      // Générer l'historique des derniers mois si nécessaire
      for (let i = historyMonths - 1; i >= 0; i--) {
        const date = format(subMonths(now, i), 'yyyy-MM');
        
        // Vérifier si cette métrique existe déjà
        const hasMetric = existingMetrics.some(m => m.date === date);
        
        if (!hasMetric) {
          // Générer des données pour ce mois
          const purchasePrice = Number(property.purchasePrice) || 300000;
          
          // Calculer la valeur avec une légère appréciation chaque mois
          const baseAppreciationRate = 0.003 + (Math.random() * 0.003); // Entre 0.3% et 0.6% par mois
          const monthsSincePurchase = i; // Simplification pour la simulation
          const appreciationFactor = Math.pow(1 + baseAppreciationRate, monthsSincePurchase);
          const value = purchasePrice * appreciationFactor;
          
          // Taux d'occupation (entre 80% et 100% pour les props louées, avec tendance à s'améliorer)
          const occupancyTrend = (historyMonths - i) / historyMonths * 10; // Tendance positive sur la période
          const baseOccupancy = property.status === 'rented' ? 75 : 0;
          const occupancyRate = Math.min(99, baseOccupancy + occupancyTrend + (Math.random() * 10));
          
          // Coûts de maintenance (entre 0.5% et 2% de la valeur par an, divisé par 12 pour mensuel)
          const maintenanceCosts = (value * (0.5 + Math.random() * 1.5) / 100) / 12;
          
          // Loyer mensuel (environ 0.4% de la valeur)
          const rentPrice = Number(property.monthlyRent) || value * 0.004;
          
          // Cashflow = loyer - maintenance - prêt
          const loanPayment = Number(property.monthlyLoanPayment) || 0;
          const cashflow = (rentPrice * (occupancyRate / 100)) - maintenanceCosts - loanPayment;
          
          // Ajouter la métrique
          addPropertyMetric({
            propertyId,
            date,
            occupancyRate,
            maintenanceCosts,
            cashflow,
            value
          });
        }
      }
    });
    
    updateTimestamp();
  };
  
  // Fonction pour générer l'historique des métriques de location
  const generateRentalMetrics = () => {
    // Vérifier si nous avons besoin de générer de nouvelles données
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    // Période d'historique à générer (12 mois)
    const historyMonths = 12;
    
    // Vérifier si les métriques existent déjà pour le mois en cours
    const hasCurrentMonth = rentalMetrics.some(m => m.date === currentMonth);
    
    // Générer l'historique des derniers mois si nécessaire
    for (let i = historyMonths - 1; i >= 0; i--) {
      const date = format(subMonths(now, i), 'yyyy-MM');
      
      // Vérifier si cette métrique existe déjà
      const hasMetric = rentalMetrics.some(m => m.date === date);
      
      if (!hasMetric) {
        // Calculer le taux d'occupation (tendance à la hausse)
        const baseOccupancy = 85 + (Math.random() * 5);
        const trendFactor = (historyMonths - i) / historyMonths * 5; // Tendance positive sur la période
        const occupancyRate = Math.min(99, baseOccupancy + trendFactor);
        
        // Simuler le taux de recouvrement des loyers (entre 90% et 99%)
        const rentCollection = 90 + Math.random() * 9;
        
        // Calculer le rendement locatif
        const totalValue = properties.reduce((sum: number, p) => sum + (Number(p.purchasePrice) || 0), 0);
        const totalRent = tenants.reduce((sum: number, t: any) => sum + (t.rentAmount || 0), 0);
        const baseYield = totalValue > 0 ? (totalRent * 12 / totalValue) * 100 : 5.5;
        
        // Ajouter une légère variation mensuelle au rendement
        const rentalYield = baseYield + (Math.random() * 0.4 - 0.2);
        
        // Calculer les données du mois précédent
        // Si nous sommes au premier mois de l'historique, créer des données légèrement inférieures
        const prevOccupancyRate = Math.max(75, occupancyRate - 2 + Math.random() * 4);
        const prevRentCollection = Math.max(85, rentCollection - 2 + Math.random() * 4);
        const prevRentalYield = Math.max(4, rentalYield - 0.3 + Math.random() * 0.6);
        
        // Ajouter la métrique
        addRentalMetric({
          date,
          occupancyRate: parseFloat(occupancyRate.toFixed(1)),
          rentCollection: parseFloat(rentCollection.toFixed(1)),
          rentalYield: parseFloat(rentalYield.toFixed(1)),
          previous: {
            occupancyRate: parseFloat(prevOccupancyRate.toFixed(1)),
            rentCollection: parseFloat(prevRentCollection.toFixed(1)),
            rentalYield: parseFloat(prevRentalYield.toFixed(1))
          }
        });
      }
    }
    
    updateTimestamp();
  };
  
  return {
    generatePropertyMetrics,
    generateRentalMetrics
  };
}

/**
 * Hook pour récupérer les analyses immobilières
 * @param propertyId ID de la propriété (optionnel)
 * @returns Analyses immobilières
 */
export function usePropertyAnalytics(propertyId?: number) {
  const { data: properties = [], isLoading: isPropertiesLoading } = useProperties();
  const { propertyMetrics } = useMetricsStore();
  const { generatePropertyMetrics } = useGenerateHistoricalMetrics();
  
  return useQuery<PropertyAnalytics[]>({
    queryKey: ['propertyAnalytics', propertyId],
    queryFn: async () => {
      // En production, ici on ferait un appel à l'API
      // return await fetch(`/api/analytics/properties${propertyId ? `/${propertyId}` : ''}`).then(res => res.json());
      
      // Générer/mettre à jour l'historique si nécessaire
      generatePropertyMetrics();
      
      // Version simulée en attendant l'implémentation backend
      await new Promise(resolve => setTimeout(resolve, 200)); // Simuler latence réseau
      
      const filteredProperties = propertyId 
        ? properties.filter(p => p.id === propertyId)
        : properties;
      
      return filteredProperties.map(property => {
        const propertyId = property.id;
        const metrics = propertyMetrics[propertyId] || [];
        
        // Obtenir les métriques les plus récentes
        const sortedMetrics = [...metrics].sort((a, b) => b.date.localeCompare(a.date));
        const latestMetric = sortedMetrics[0] || {
          value: Number(property.purchasePrice) || 300000,
          occupancyRate: 85,
          maintenanceCosts: 200,
          cashflow: 500
        };
        
        // Obtenir la métrique du mois précédent
        const previousMonthMetric = sortedMetrics[1] || {
          occupancyRate: latestMetric.occupancyRate - 2
        };
        
        // Calculer le prix d'achat et la date d'achat
        const purchasePrice = Number(property.purchasePrice) || 300000;
        const purchaseDate = property.purchaseDate ? new Date(property.purchaseDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        
        // Calculer l'appréciation depuis l'achat
        const timeSincePurchaseInYears = (Date.now() - purchaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
        const appreciation = ((latestMetric.value / purchasePrice) - 1) * 100;
        
        // Loyer mensuel 
        const rentPrice = Number(property.monthlyRent) || latestMetric.value * 0.004;
        
        // Calculer le ROI
        const roi = ((rentPrice * 12) / purchasePrice) * 100;
        
        // Générer des insights en fonction des données
        const insights = [];
        
        if (appreciation > 5) {
          insights.push(`Le bien a connu une appréciation de ${appreciation.toFixed(1)}% depuis l'acquisition`);
        }
        
        if (roi > 6) {
          insights.push(`Rendement locatif de ${roi.toFixed(1)}%, supérieur à la moyenne du marché`);
        } else if (roi < 4) {
          insights.push(`Rendement locatif faible (${roi.toFixed(1)}%), envisager une révision du loyer`);
        }
        
        if (latestMetric.occupancyRate < 85) {
          insights.push(`Taux d'occupation de ${latestMetric.occupancyRate.toFixed(0)}%, inférieur à la moyenne`);
        }
        
        if (latestMetric.cashflow < 0) {
          insights.push(`Cashflow négatif de ${formatCurrency(latestMetric.cashflow)}/mois, optimiser les charges`);
        }
        
        // Ajouter au moins un insight général si aucun n'a été généré
        if (insights.length === 0) {
          insights.push(`Performance stable avec un ROI de ${roi.toFixed(1)}% et une occupation de ${latestMetric.occupancyRate.toFixed(0)}%`);
        }
        
        return {
          propertyId: property.id,
          propertyName: property.name,
          marketValue: latestMetric.value,
          purchasePrice,
          appreciation,
          rentPrice,
          roi,
          occupancyRate: latestMetric.occupancyRate,
          previousOccupancyRate: previousMonthMetric.occupancyRate,
          maintenanceCosts: latestMetric.maintenanceCosts,
          cashflow: latestMetric.cashflow,
          areaRating: 3 + Math.random() * 2,
          insights
        };
      });
    },
    enabled: !isPropertiesLoading && properties.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Formatage d'une valeur monétaire
 * @param value Valeur à formater
 * @returns Valeur formatée en euros
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Hook pour récupérer l'historique des performances locatives
 * @param months Nombre de mois d'historique
 * @returns Historique des performances locatives
 */
export function useRentalPerformanceHistory(months: number = 6) {
  const { rentalMetrics } = useMetricsStore();
  const { generateRentalMetrics } = useGenerateHistoricalMetrics();
  const isLoading = false;
  
  return useQuery<RentalPerformance[]>({
    queryKey: ['rentalPerformance', months],
    queryFn: async () => {
      // En production, ici on ferait un appel à l'API
      // return await fetch(`/api/analytics/rental-performance?months=${months}`).then(res => res.json());
      
      // Générer/mettre à jour l'historique si nécessaire
      generateRentalMetrics();
      
      // Version simulée en attendant l'implémentation backend
      await new Promise(resolve => setTimeout(resolve, 200)); // Simuler latence réseau
      
      // Récupérer les métriques depuis le store
      const today = new Date();
      const performanceData: RentalPerformance[] = [];
      
      // Convertir les métriques en format attendu
      for (let i = months - 1; i >= 0; i--) {
        const date = format(subMonths(today, i), 'yyyy-MM');
        const monthLabel = format(subMonths(today, i), 'MMM', { locale: fr });
        
        // Chercher la métrique pour cette date
        const metric = rentalMetrics.find(m => m.date === date);
        
        if (metric) {
          performanceData.push({
            month: metric.date,
            ...metric,
            monthLabel
          });
        } else {
          // Créer une métrique par défaut si manquante
          const baseOccupancy = 85 + (Math.random() * 5);
          const trendFactor = (months - i) / months * 5;
          const occupancyRate = Math.min(99, baseOccupancy + trendFactor);
          const rentCollection = 90 + Math.random() * 9;
          const rentalYield = 5.5 + (Math.random() * 0.4 - 0.2);
          
          const prevOccupancyRate = Math.max(75, occupancyRate - 2 + Math.random() * 4);
          const prevRentCollection = Math.max(85, rentCollection - 2 + Math.random() * 4);
          const prevRentalYield = Math.max(4, rentalYield - 0.3 + Math.random() * 0.6);
          
          performanceData.push({
            month: date,
            date,
            monthLabel,
            occupancyRate: parseFloat(occupancyRate.toFixed(1)),
            rentCollection: parseFloat(rentCollection.toFixed(1)),
            rentalYield: parseFloat(rentalYield.toFixed(1)),
            previous: {
              occupancyRate: parseFloat(prevOccupancyRate.toFixed(1)),
              rentCollection: parseFloat(prevRentCollection.toFixed(1)),
              rentalYield: parseFloat(prevRentalYield.toFixed(1))
            }
          });
        }
      }
      
      return performanceData;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour récupérer les prévisions de valeur immobilière
 * @param propertyId ID de la propriété (optionnel)
 * @param months Nombre de mois de prévision
 * @returns Prévisions de valeur immobilière
 */
export function usePropertyValueForecast(propertyId?: number, months: number = 12) {
  const { data: analyticsData, isLoading } = usePropertyAnalytics(propertyId);
  
  return useQuery({
    queryKey: ['propertyValueForecast', propertyId, months],
    queryFn: async () => {
      // En production, ici on ferait un appel à l'API
      // return await fetch(`/api/analytics/forecast?propertyId=${propertyId}&months=${months}`).then(res => res.json());
      
      if (!analyticsData) return [];
      
      // Version simulée en attendant l'implémentation backend
      await new Promise(resolve => setTimeout(resolve, 200)); // Simuler latence réseau
      
      const today = new Date();
      const forecast = [];
      
      for (const property of analyticsData) {
        const monthlyData = [];
        let currentValue = property.marketValue;
        
        // Taux de croissance mensuel basé sur l'appréciation annuelle + variations
        const monthlyGrowthRate = (property.appreciation / 12) / 100;
        
        for (let i = 1; i <= months; i++) {
          const date = addMonths(today, i);
          
          // Ajouter une variation aléatoire au taux de croissance mensuel
          const variationFactor = 1 + (Math.random() * 0.006 - 0.003); // ±0.3%
          const adjustedGrowthRate = monthlyGrowthRate * variationFactor;
          
          // Calculer la nouvelle valeur
          currentValue = currentValue * (1 + adjustedGrowthRate);
          
          monthlyData.push({
            date: format(date, "yyyy-MM"),
            value: parseFloat(currentValue.toFixed(2)),
            confidence: Math.max(95 - (i * 2), 70) // La confiance diminue avec le temps
          });
        }
        
        forecast.push({
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          currentValue: property.marketValue,
          forecast: monthlyData
        });
      }
      
      return forecast;
    },
    enabled: !isLoading && !!analyticsData?.length,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook pour récupérer les prédictions de cashflow
 * @param propertyId ID de la propriété (optionnel)
 * @param months Nombre de mois de prévision
 * @returns Prévisions de cashflow
 */
export function useCashflowForecast(propertyId?: number, months: number = 12) {
  const { data: analyticsData, isLoading } = usePropertyAnalytics(propertyId);
  
  return useQuery({
    queryKey: ['cashflowForecast', propertyId, months],
    queryFn: async () => {
      // En production, ici on ferait un appel à l'API
      // return await fetch(`/api/analytics/cashflow?propertyId=${propertyId}&months=${months}`).then(res => res.json());
      
      if (!analyticsData) return [];
      
      // Version simulée en attendant l'implémentation backend
      await new Promise(resolve => setTimeout(resolve, 200)); // Simuler latence réseau
      
      const today = new Date();
      const forecast = [];
      
      for (const property of analyticsData) {
        const monthlyData = [];
        let currentRent = property.rentPrice;
        let currentExpenses = property.maintenanceCosts;
        
        // Taux d'inflation annualisé pour le loyer et les coûts
        const annualRentGrowth = 0.02; // 2% par an
        const annualExpenseGrowth = 0.025; // 2.5% par an
        
        // Converti en taux mensuel
        const monthlyRentGrowth = Math.pow(1 + annualRentGrowth, 1/12) - 1;
        const monthlyExpenseGrowth = Math.pow(1 + annualExpenseGrowth, 1/12) - 1;
        
        // Mensualité de prêt (fixe si elle existe)
        const fixedLoanPayment = property.cashflow + currentExpenses - (currentRent * (property.occupancyRate / 100));
        
        for (let i = 1; i <= months; i++) {
          const date = addMonths(today, i);
          
          // Ajouter des variations aléatoires
          const rentVariation = 1 + (Math.random() * 0.004 - 0.002); // ±0.2%
          const expenseVariation = 1 + (Math.random() * 0.02 - 0.005); // -0.5% à +1.5%
          
          // Simuler des variations d'occupation (selon les saisons)
          const monthIndex = date.getMonth();
          const seasonalOccupancyFactor = 
            monthIndex >= 5 && monthIndex <= 8 ? 1.02 : // Été: meilleure occupation
            monthIndex >= 11 || monthIndex <= 1 ? 0.98 : // Hiver: occupation plus basse
            1; // Autres saisons: normale
          
          const occupancyRate = Math.min(99, Math.max(80, property.occupancyRate * seasonalOccupancyFactor));
          
          // Calculer les nouvelles valeurs
          currentRent = currentRent * (1 + (monthlyRentGrowth * rentVariation));
          currentExpenses = currentExpenses * (1 + (monthlyExpenseGrowth * expenseVariation));
          
          // Calculer le cashflow
          const income = currentRent * (occupancyRate / 100);
          const cashflow = income - currentExpenses - fixedLoanPayment;
          
          monthlyData.push({
            date: format(date, "yyyy-MM"),
            income: parseFloat(income.toFixed(2)),
            expenses: parseFloat(currentExpenses.toFixed(2)),
            loanPayment: parseFloat(fixedLoanPayment.toFixed(2)),
            cashflow: parseFloat(cashflow.toFixed(2)),
            occupancyRate: parseFloat(occupancyRate.toFixed(1))
          });
        }
        
        forecast.push({
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          currentCashflow: property.cashflow,
          forecast: monthlyData
        });
      }
      
      return forecast;
    },
    enabled: !isLoading && !!analyticsData?.length,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
} 