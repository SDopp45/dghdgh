import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantHistoryEntry } from '@/types/tenant-history';

/**
 * Hook pour récupérer l'historique d'un locataire
 * @param tenantId ID du locataire (optionnel)
 * @param options Options de la requête
 * @returns L'historique du locataire
 */
export function useTenantHistory(tenantId?: number | string, options?: { enabled?: boolean }) {
  return useQuery<TenantHistoryEntry[]>({
    queryKey: ['tenantHistory', tenantId],
    queryFn: async () => {
      let url = '/api/tenant-history';
      if (tenantId) {
        url += `?tenantId=${tenantId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Impossible de récupérer l\'historique du locataire');
      }
      
      return await response.json();
    },
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook pour récupérer une entrée spécifique de l'historique
 * @param entryId ID de l'entrée
 * @param options Options de la requête
 * @returns L'entrée d'historique
 */
export function useTenantHistoryEntry(entryId: number | string | null, options?: { enabled?: boolean }) {
  return useQuery<TenantHistoryEntry>({
    queryKey: ['tenantHistoryEntry', entryId],
    queryFn: async () => {
      if (!entryId) throw new Error('ID de l\'entrée d\'historique requis');
      
      const response = await fetch(`/api/tenant-history/${entryId}`);
      if (!response.ok) {
        throw new Error(`Impossible de récupérer l'entrée d'historique #${entryId}`);
      }
      
      return await response.json();
    },
    enabled: !!entryId && options?.enabled !== false,
  });
}

/**
 * Hook pour créer une nouvelle entrée d'historique
 * @returns Une mutation pour créer une entrée
 */
export function useCreateTenantHistory() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/tenant-history', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de l\'entrée d\'historique');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
    },
  });
  
  return mutation.mutateAsync;
}

/**
 * Hook pour mettre à jour une entrée d'historique
 * @returns Une mutation pour mettre à jour une entrée
 */
export function useUpdateTenantHistory() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number | string, formData: FormData }) => {
      const response = await fetch(`/api/tenant-history/${id}`, {
        method: 'PUT',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur lors de la mise à jour de l'entrée d'historique #${id}`);
      }
      
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
      queryClient.invalidateQueries({ queryKey: ['tenantHistoryEntry', variables.id] });
    },
  });
  
  return (id: number | string, formData: FormData) => mutation.mutateAsync({ id, formData });
}

/**
 * Hook pour supprimer une entrée d'historique
 * @returns Une mutation pour supprimer une entrée
 */
export function useDeleteTenantHistory() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (id: number | string) => {
      const response = await fetch(`/api/tenant-history/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      // Cas 1: réponse réussie de type 204 No Content
      if (response.status === 204) {
        return { success: true };
      }
      
      // Cas 2: toute réponse d'erreur
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur lors de la suppression de l'entrée d'historique #${id}`);
        } catch (e) {
          // Si l'erreur ne contient pas de JSON valide
          throw new Error(`Erreur lors de la suppression de l'entrée d'historique #${id} (Status: ${response.status})`);
        }
      }
      
      // Cas 3: réponse réussie avec contenu JSON
      try {
        return await response.json();
      } catch (e) {
        // Si la réponse ne contient pas de JSON valide mais que la requête a réussi
        return { success: true };
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
      queryClient.invalidateQueries({ queryKey: ['tenantHistoryEntry', id] });
    },
  });
  
  return mutation.mutateAsync;
}

interface Tenant {
  id: number;
  fullName: string;
  propertyId: number | null;
  propertyName: string | null;
  isHistoryOnly: boolean;
}

interface Property {
  id: number;
  name: string;
}

export const useTenantsForHistory = () => {
  return useQuery<Tenant[]>({
    queryKey: ['tenantsForHistory'],
    queryFn: async () => {
      const response = await fetch('/api/tenant-history/tenants');
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }
      return response.json();
    },
  });
};

export const usePropertiesForHistory = () => {
  return useQuery<Property[]>({
    queryKey: ['propertiesForHistory'],
    queryFn: async () => {
      const response = await fetch('/api/tenant-history/properties');
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      return response.json();
    },
  });
}; 