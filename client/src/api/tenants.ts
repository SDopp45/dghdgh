import { useQuery } from '@tanstack/react-query';
import { Tenant } from '@/types/tenant-history';

/**
 * Hook pour récupérer la liste des locataires
 * @param options Options de la requête
 * @returns La liste des locataires
 */
export function useTenants(options?: { enabled?: boolean }) {
  return useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/tenants');
        if (!response.ok) {
          throw new Error('Impossible de récupérer la liste des locataires');
        }
        return await response.json();
      } catch (error) {
        console.error("Erreur lors du chargement des locataires:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes avant rafraîchissement
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook pour récupérer un locataire spécifique
 * @param id ID du locataire
 * @param options Options de la requête
 * @returns Le locataire demandé
 */
export function useTenant(id: number | string | null, options?: { enabled?: boolean }) {
  return useQuery<Tenant>({
    queryKey: ['tenant', id],
    queryFn: async () => {
      if (!id) throw new Error('ID du locataire requis');
      
      try {
        const response = await fetch(`/api/tenants/${id}`);
        if (!response.ok) {
          throw new Error(`Impossible de récupérer le locataire #${id}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`Erreur lors du chargement du locataire #${id}:`, error);
        throw error;
      }
    },
    enabled: !!id && options?.enabled !== false,
  });
} 