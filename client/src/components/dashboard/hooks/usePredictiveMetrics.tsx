import { useState, useEffect } from 'react';
import { getDefaultPredictions } from '../utils/getDefaultPredictions';

export function usePredictiveMetrics() {
  const [data, setData] = useState(getDefaultPredictions());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simuler un chargement des données
    // Dans une implémentation réelle, vous feriez un appel API ici
    setIsLoading(true);
    
    // Délai simulé pour l'effet de chargement
    const timer = setTimeout(() => {
      try {
        // Utiliser les données par défaut pour l'instant
        setData(getDefaultPredictions());
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  return { data, isLoading, error };
} 
 
 
 
 