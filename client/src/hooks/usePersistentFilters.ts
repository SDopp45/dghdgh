import { useState, useEffect } from 'react';

/**
 * Hook pour gérer les filtres persistants entre les sessions
 * 
 * @param key - Clé unique pour identifier ces filtres dans le localStorage
 * @param defaultValue - Valeur par défaut des filtres
 * @returns [filters, setFilters, resetFilters] - État des filtres et fonctions pour les manipuler
 */
export function usePersistentFilters<T>(key: string, defaultValue: T): [T, (newFilters: T) => void, () => void] {
  // Initialiser l'état avec les filtres sauvegardés ou la valeur par défaut
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      const savedFilters = localStorage.getItem(`filters:${key}`);
      return savedFilters ? JSON.parse(savedFilters) : defaultValue;
    } catch (error) {
      console.error('Erreur lors de la récupération des filtres sauvegardés:', error);
      return defaultValue;
    }
  });

  // Mettre à jour le localStorage quand les filtres changent
  useEffect(() => {
    try {
      localStorage.setItem(`filters:${key}`, JSON.stringify(filters));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des filtres:', error);
    }
  }, [filters, key]);

  // Fonction pour mettre à jour les filtres
  const setFilters = (newFilters: T) => {
    setFiltersState(newFilters);
  };

  // Fonction pour réinitialiser les filtres à leur valeur par défaut
  const resetFilters = () => {
    setFiltersState(defaultValue);
    try {
      localStorage.removeItem(`filters:${key}`);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des filtres:', error);
    }
  };

  return [filters, setFilters, resetFilters];
}

export default usePersistentFilters; 