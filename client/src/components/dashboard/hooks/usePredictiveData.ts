import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMotionValue } from "framer-motion";
import { useProperties } from "@/api/properties";

interface PropertyPrediction {
  id: string;
  name: string;
  currentValue: number;
  predictions: {
    date: string;
    value: number;
    confidence: number;
    factors: {
      marketTrend: number;
      localDemand: number;
      seasonality: number;
      economicIndicators: number;
    };
  }[];
}

type PredictionTimeframe = '3m' | '6m' | '1y' | '3y' | '5y';
type PredictionType = 'values' | 'roi' | 'demand' | 'risk';

interface UsePredictiveDataOptions {
  timeframe?: PredictionTimeframe;
  predictionType?: PredictionType;
  selectedPropertyId?: string | null;
}

export function usePredictiveData(options: UsePredictiveDataOptions = {}) {
  const { 
    timeframe = '1y', 
    predictionType = 'values', 
    selectedPropertyId: initialPropertyId = null 
  } = options;
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(initialPropertyId);
  
  // Animation pour l'indicateur principal
  const predictedGrowth = useMotionValue(0);
  const confidenceLevel = useMotionValue(0);
  
  // Récupération des propriétés réelles
  const { data: propertiesData, isLoading: propertiesLoading } = useProperties();
  
  // Simuler une requête API pour obtenir des prédictions
  const { data, isLoading, error } = useQuery<PropertyPrediction[]>({
    queryKey: ['/api/predictions', timeframe, predictionType, propertiesData],
    queryFn: async () => {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!propertiesData || propertiesData.length === 0) {
        // Fallback sur des noms par défaut si aucune propriété n'est disponible
        const defaultProperties = ['Résidence Athéna', 'Domaine Jupiter', 'Complexe Hermès', 'Tour Apollon', 'Résidence Déméter'];
        return defaultProperties.map((name, idx) => generatePrediction(name, `property-${idx}`, idx));
      }
      
      // Utiliser les propriétés réelles de l'application
      return propertiesData.slice(0, 5).map((property, idx) => 
        generatePrediction(property.name, property.id.toString(), idx)
      );
    },
    // Ne pas effectuer la requête si les propriétés sont en cours de chargement
    enabled: !propertiesLoading,
    staleTime: 60000 // 1 minute
  });
  
  // Fonction pour générer les prédictions d'une propriété
  function generatePrediction(name: string, id: string, idx: number) {
    // Valeurs de base qui varient selon le type de prédiction
    const baseValue = predictionType === 'values' ? 350000 + (idx * 50000) : 
                       predictionType === 'roi' ? 5 + (idx * 0.7) :
                       predictionType === 'demand' ? 65 + (idx * 3) :
                       20 - (idx * 2); // risk
    
    // Facteur de croissance qui dépend du timeframe
    const growthFactor = timeframe === '3m' ? 0.01 :
                         timeframe === '6m' ? 0.025 :
                         timeframe === '1y' ? 0.055 :
                         timeframe === '3y' ? 0.175 :
                         0.32; // 5y
    
    // Générer les points de prédiction
    const numPoints = timeframe === '3m' ? 3 :
                      timeframe === '6m' ? 6 :
                      timeframe === '1y' ? 12 :
                      timeframe === '3y' ? 12 :
                      15; // 5y
    
    const predictions = Array.from({ length: numPoints }, (_, i) => {
      // Ajouter de la variation aléatoire
      const noise = (Math.random() - 0.5) * 0.1;
      const progress = i / (numPoints - 1);
      const growthAtPoint = growthFactor * progress;
      
      // Baisser la confiance avec le temps
      const confidence = Math.max(30, 95 - (progress * 30));
      
      let date;
      if (timeframe === '3m') {
        date = `M+${i+1}`;
      } else if (timeframe === '6m') {
        date = `M+${i+1}`;
      } else if (timeframe === '1y') {
        date = `M+${i+1}`;
      } else if (timeframe === '3y') {
        date = `A+${Math.floor(i/4)+1} T${(i%4)+1}`;
      } else {
        date = `A+${Math.floor(i/3)+1}`;
      }
      
      return {
        date,
        value: baseValue * (1 + growthAtPoint + noise),
        confidence,
        factors: {
          marketTrend: 0.4 + (Math.random() * 0.2),
          localDemand: 0.3 + (Math.random() * 0.2),
          seasonality: 0.1 + (Math.random() * 0.1),
          economicIndicators: 0.2 + (Math.random() * 0.1)
        }
      };
    });
    
    return {
      id,
      name,
      currentValue: baseValue,
      predictions
    };
  }
  
  // Calculer la valeur de croissance globale
  useEffect(() => {
    if (!data) return;
    
    const aggregateData = data.map(property => {
      const firstValue = property.currentValue;
      const lastValue = property.predictions[property.predictions.length - 1].value;
      const growthPercent = ((lastValue - firstValue) / firstValue) * 100;
      return growthPercent;
    });
    
    const averageGrowth = aggregateData.reduce((sum, val) => sum + val, 0) / aggregateData.length;
    const avgConfidence = data[0]?.predictions.reduce((sum, p) => sum + p.confidence, 0) / data[0]?.predictions.length || 0;
    
    predictedGrowth.set(averageGrowth);
    confidenceLevel.set(avgConfidence);
    
    if (!selectedPropertyId && data.length > 0) {
      setSelectedPropertyId(data[0].id);
    }
  }, [data, selectedPropertyId]);
  
  // Mettre en forme les données pour les graphiques
  const prepareChartData = () => {
    if (!data || !selectedPropertyId) return [];
    
    const selectedProperty = data.find(p => p.id === selectedPropertyId);
    if (!selectedProperty) return [];
    
    return [
      { x: "Aujourd'hui", y: selectedProperty.currentValue },
      ...selectedProperty.predictions.map(p => ({
        x: p.date,
        y: p.value,
        confidence: p.confidence,
        factors: p.factors
      }))
    ];
  };
  
  // Formater les valeurs selon le type de prédiction
  const formatValue = (value: number) => {
    switch(predictionType) {
      case 'values': 
        return new Intl.NumberFormat('fr-FR', { 
          style: 'currency', 
          currency: 'EUR',
          maximumFractionDigits: 0 
        }).format(value);
      case 'roi': 
        return new Intl.NumberFormat('fr-FR', { 
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(value / 100);
      case 'demand': 
        return new Intl.NumberFormat('fr-FR', { 
          maximumFractionDigits: 0 
        }).format(value);
      case 'risk': 
        const riskLevel = value <= 10 ? 'Très faible' :
                         value <= 25 ? 'Faible' :
                         value <= 50 ? 'Modéré' :
                         value <= 75 ? 'Élevé' :
                         'Très élevé';
        return `${value} - ${riskLevel}`;
      default: 
        return value.toString();
    }
  };
  
  const isPositiveTrend = () => {
    if (!data || !selectedPropertyId) return true;
    
    const selectedProperty = data.find(p => p.id === selectedPropertyId);
    if (!selectedProperty) return true;
    
    const firstValue = selectedProperty.currentValue;
    const lastValue = selectedProperty.predictions[selectedProperty.predictions.length - 1].value;
    
    // Pour le risque, une baisse est positive
    if (predictionType === 'risk') {
      return lastValue <= firstValue;
    }
    
    return lastValue >= firstValue;
  };
  
  return {
    data,
    isLoading: isLoading || propertiesLoading,
    error,
    selectedPropertyId,
    setSelectedPropertyId,
    predictedGrowth,
    confidenceLevel,
    chartData: prepareChartData(),
    formatValue,
    isPositiveTrend,
    selectedProperty: data?.find(p => p.id === selectedPropertyId)
  };
} 