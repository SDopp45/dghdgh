import axios from 'axios';

// Configuration de base
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5005';
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'session';

/**
 * Fonction pour vérifier le mode d'authentification
 * Permet de savoir quel système est actif
 */
export const getAuthMode = () => {
  return {
    mode: AUTH_MODE,
    usesSession: AUTH_MODE === 'session' || AUTH_MODE === 'hybrid',
    usesJwt: AUTH_MODE === 'jwt' || AUTH_MODE === 'hybrid',
  };
};

/**
 * Instance principale API avec intercepteurs configurés
 */
export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Toujours activer les credentials pour que les cookies soient envoyés
  withCredentials: true,
});

/**
 * Récupérer le token d'authentification pour le mode JWT ou hybride
 */
const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Intercepteur pour ajouter les en-têtes d'authentification
 */
api.interceptors.request.use((config) => {
  // En mode JWT ou hybride, on ajoute le token si disponible
  if (AUTH_MODE !== 'session') {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  // Ajouter un en-tête pour suivre les demandes
  config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  return config;
});

/**
 * Intercepteur pour gérer les erreurs d'authentification
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Gérer les erreurs d'authentification
    if (error.response?.status === 401) {
      // Nettoyer les tokens en cas d'erreur 401
      if (AUTH_MODE !== 'session') {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
      
      console.warn('Authentification expirée, redirection vers la page de connexion');
      
      // En production, rediriger vers la page de connexion
      if (process.env.NODE_ENV === 'production') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Création d'une instance API sans les intercepteurs d'authentification
 * Utile pour les appels qui ne nécessitent pas d'authentification
 */
export const publicApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api; 