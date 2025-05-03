import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types pour les contrats
export interface Contract {
  id: number;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  propertyId?: number | null;
  documentId?: number | null;
  signatureRequired: boolean;
  automatedRenewal: boolean;
  renewalDate?: string | null;
  notificationDate?: string | null;
  createdAt: string;
  updatedAt: string;
  parties?: ContractParty[];
  propertyName?: string;
}

export interface ContractParty {
  id: number;
  type: string;
  name?: string;
}

export interface CreateContractData {
  name: string;
  type: string;
  status?: string;
  startDate: Date;
  endDate?: Date | null;
  propertyId?: number | null;
  documentId?: number | null;
  signatureRequired?: boolean;
  automatedRenewal?: boolean;
  renewalDate?: Date | null;
  notificationDate?: Date | null;
  parties: { id: number; type: string }[];
  description?: string;
}

/**
 * Hook pour récupérer la liste des contrats
 * @param options Options de la requête
 * @returns La liste des contrats
 */
export function useContracts(options?: { tenantId?: number; enabled?: boolean }) {
  return useQuery<{ data: Contract[]; meta: { total: number } }>({
    queryKey: ['contracts', options?.tenantId],
    queryFn: async () => {
      try {
        const url = options?.tenantId 
          ? `/api/contracts?tenantId=${options.tenantId}` 
          : '/api/contracts';
          
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Impossible de récupérer la liste des contrats');
        }
        return await response.json();
      } catch (error) {
        console.error("Erreur lors du chargement des contrats:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes avant rafraîchissement
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook pour récupérer un contrat spécifique
 * @param id ID du contrat
 * @param options Options de la requête
 * @returns Le contrat demandé
 */
export function useContract(id: number | string | null, options?: { enabled?: boolean }) {
  return useQuery<{ data: Contract }>({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!id) throw new Error('ID du contrat requis');
      
      try {
        const response = await fetch(`/api/contracts/${id}`);
        if (!response.ok) {
          throw new Error(`Impossible de récupérer le contrat #${id}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`Erreur lors du chargement du contrat #${id}:`, error);
        throw error;
      }
    },
    enabled: !!id && options?.enabled !== false,
  });
}

/**
 * Hook pour créer un nouveau contrat
 */
export function useCreateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateContractData) => {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de créer le contrat');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalider les requêtes de contrats pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

/**
 * Hook pour mettre à jour un contrat existant
 */
export function useUpdateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateContractData> }) => {
      const response = await fetch(`/api/contracts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Impossible de mettre à jour le contrat #${id}`);
      }
      
      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalider les requêtes de contrats pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', variables.id] });
    },
  });
}

/**
 * Hook pour supprimer un contrat
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Impossible de supprimer le contrat #${id}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalider les requêtes de contrats pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
} 