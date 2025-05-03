import { useQuery } from '@tanstack/react-query';
import { Property } from '@/types/tenant-history';

/**
 * Hook pour récupérer la liste des propriétés
 * @param options Options de la requête
 * @returns La liste des propriétés
 */
export function useProperties(options?: { enabled?: boolean }) {
  return useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/properties');
        if (!response.ok) {
          throw new Error('Impossible de récupérer la liste des propriétés');
        }
        return await response.json();
      } catch (error) {
        console.error("Erreur lors du chargement des propriétés:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes avant rafraîchissement
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook pour récupérer une propriété spécifique
 * @param id ID de la propriété
 * @param options Options de la requête
 * @returns La propriété demandée
 */
export function useProperty(id: number | string | null, options?: { enabled?: boolean }) {
  return useQuery<Property>({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) throw new Error('ID de la propriété requis');
      
      try {
        const response = await fetch(`/api/properties/${id}`);
        if (!response.ok) {
          throw new Error(`Impossible de récupérer la propriété #${id}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`Erreur lors du chargement de la propriété #${id}:`, error);
        throw error;
      }
    },
    enabled: !!id && options?.enabled !== false,
  });
} 