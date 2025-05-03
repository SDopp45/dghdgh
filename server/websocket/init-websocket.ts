import http from 'http';
import logger from '../utils/logger';
import { initNotificationWebSocket } from './notification-ws';

/**
 * Initialise les services WebSocket de manière sécurisée
 * avec une gestion des erreurs améliorée
 */
export function initializeWebSockets(server: http.Server) {
  try {
    // Initialiser le WebSocket pour les notifications
    const wss = initNotificationWebSocket(server);
    logger.info('WebSocket pour les notifications initialisé avec succès');
    
    return wss;
  } catch (error) {
    // Journaliser l'erreur mais ne pas faire échouer le démarrage du serveur
    logger.error('Erreur lors de l\'initialisation des WebSockets:', error);
    logger.info('Le serveur continue de démarrer sans support WebSocket');
    
    return null;
  }
} 