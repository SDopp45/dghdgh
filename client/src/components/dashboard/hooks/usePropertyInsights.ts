import { useState, useEffect } from 'react';

// Données de démonstration pour les insights de propriété
const demoProperty = {
  name: 'La Pariferne',
  value: '300 000 €',
  rent: '4 554 €',
  occupancyRate: '89%',
  previousOccupancyRate: '88%',
  cashflow: '3 597 €',
  roi: '18.2%',
  insight: 'Rendement locatif de 18.2%, supérieur à la moyenne du marché'
};

export function usePropertyInsights() {
  const [data, setData] = useState<{ property: typeof demoProperty | null }>({ 
    property: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simuler un chargement des données
    const timer = setTimeout(() => {
      try {
        setData({ property: demoProperty });
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading, error };
} 
 
 
 
 