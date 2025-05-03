import { useState, useEffect } from 'react';

// Données simplifiées pour le widget d'occupation
const demoProperties = [
  { id: 1, name: 'La Pariferne', occupied: true },
  { id: 2, name: 'Résidence Saint-Michel', occupied: true },
  { id: 3, name: 'Appt. Centre-ville', occupied: false },
  { id: 4, name: 'Villa Bougainville', occupied: true },
];

export function useOccupancy() {
  const [data, setData] = useState<{ properties: typeof demoProperties }>({ 
    properties: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simuler un chargement des données
    const timer = setTimeout(() => {
      try {
        setData({ properties: demoProperties });
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
 
 
 
 