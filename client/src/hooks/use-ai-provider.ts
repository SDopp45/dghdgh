import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

type ProviderInfo = {
  provider: string;
  providerName: string;
  displayName: string;
};

/**
 * Hook personnalisé pour récupérer les informations sur le fournisseur d'IA actif
 */
export function useAiProvider() {
  const [providerInfo, setProviderInfo] = useState<ProviderInfo>({
    provider: 'huggingface',
    providerName: 'HuggingFace',
    displayName: 'HuggingFace & OpenAI'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProviderInfo = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('/api/ai-assistant/provider-info', {
          method: 'GET'
        });
        
        if (response) {
          setProviderInfo(response);
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des informations du fournisseur IA:', err);
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviderInfo();
  }, []);

  return { providerInfo, isLoading, error };
}