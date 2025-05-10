import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Ensure queryKey starts with /api/
        const path = queryKey[0] as string;
        const apiPath = path.startsWith('/api/') ? path : `/api${path}`;

        // Determine if this is a public route that doesn't need authentication
        const isPublicRoute = apiPath.includes('/api/links/profile/') && 
                             !apiPath.includes('/api/links/profile/view') && 
                             !apiPath.includes('/api/links/click/');

        try {
          const res = await fetch(apiPath, {
            credentials: isPublicRoute ? "omit" : "include",
          });

          if (!res.ok) {
            // Si l'erreur est 500, retourner un tableau vide pour éviter les erreurs dans l'UI
            if (res.status === 500) {
              console.warn(`API error on ${apiPath}: Server error 500. Returning empty data.`);
              return [];
            }
            
            const errorData = await res.text();
            let errorMessage;
            try {
              const jsonError = JSON.parse(errorData);
              errorMessage = jsonError.error || jsonError.message || res.statusText;
            } catch {
              errorMessage = errorData || res.statusText;
            }
            throw new Error(`${res.status}: ${errorMessage}`);
          }

          return res.json();
        } catch (err) {
          console.error(`API request failed for ${apiPath}:`, err);
          // Renvoyer un tableau vide ou un objet vide selon le contexte
          return Array.isArray(queryKey) && queryKey.length > 1 && queryKey[1]?.defaultValue 
            ? queryKey[1].defaultValue 
            : [];
        }
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute au lieu de Infinity
      retry: 1,         // Une tentative de retry
      retryDelay: 1000, // Délai de 1 seconde entre les retries
    },
    mutations: {
      retry: false,
    }
  },
});

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  // Si nous avons des headers personnalisés, les fusionner avec les headers par défaut
  if (options.headers) {
    mergedOptions.headers = {
      ...defaultOptions.headers,
      ...options.headers
    };
  }
  
  // Ajouter les paramètres dev pour les routes de formulaires en mode développement
  if (process.env.NODE_ENV === 'development' && url.includes('/api/forms/')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}dev=true`;
  }

  try {
    const response = await fetch(url, mergedOptions);
    
    // Tenter de récupérer le corps de la réponse
    let responseBody: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
    
    if (!response.ok) {
      // Log plus détaillé pour les erreurs HTTP
      console.error(`Réponse non-OK: `, {
        status: response.status,
        statusText: response.statusText,
        data: responseBody
      });
      
      // Pour les erreurs serveur 500, essayer d'extraire plus d'information
      if (response.status === 500) {
        console.error(`Erreur serveur 500 détaillée:`, {
          url,
          method: mergedOptions.method || 'GET',
          requestBody: mergedOptions.body ? JSON.parse(mergedOptions.body.toString()) : null,
          responseBody
        });
      }
      
      // Créer une erreur avec les détails
      const error = new Error(`HTTP error ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      (error as any).responseData = responseBody;
      throw error;
    }
    
    return responseBody;
  } catch (error) {
    console.error(`Erreur lors de la requête à ${url}:`, error);
    
    // Si nous sommes en mode développement et que c'est une route d'API de formulaire,
    // retourner un tableau vide au lieu de propager l'erreur pour faciliter le débogage
    if (process.env.NODE_ENV === 'development' && 
        url.includes('/api/forms/')) {
      console.warn('Retourne un résultat vide pour faciliter le développement');
      return { success: true, data: [] };
    }
    
    throw error;
  }
};