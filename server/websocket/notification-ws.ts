import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import url from 'url';
import { getUserFromToken } from '../utils/auth-helpers';
import logger from '../utils/logger';

// Stockage des connexions WebSocket par ID utilisateur
const connections = new Map<number, WebSocket[]>();

// Initialiser le serveur WebSocket
export function initNotificationWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Gérer les nouvelles connexions
  server.on('upgrade', async (request, socket, head) => {
    const pathname = url.parse(request.url || '').pathname;

    // Vérifier si c'est une demande pour le WebSocket de notifications
    if (pathname === '/api/ws/notifications') {
      try {
        // Récupérer le token d'authentification
        const authHeader = request.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.substring(7)
          : request.headers.cookie?.split(';')
              .find(c => c.trim().startsWith('token='))
              ?.split('=')[1];

        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Vérifier le token et obtenir l'utilisateur
        const user = await getUserFromToken(token);
        if (!user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Accepter la connexion WebSocket
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, user.id);
        });
      } catch (error) {
        logger.error('Erreur lors de l\'authentification WebSocket:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    }
  });

  // Gérer les connexions WebSocket
  wss.on('connection', (ws, request, userId: number) => {
    // Ajouter la connexion à la liste des connexions pour cet utilisateur
    if (!connections.has(userId)) {
      connections.set(userId, []);
    }
    connections.get(userId)?.push(ws);

    logger.info(`Nouvelle connexion WebSocket pour l'utilisateur ${userId}`);

    // Envoyer un message initial pour confirmer la connexion
    ws.send(JSON.stringify({
      type: 'connection_status',
      status: 'connected',
      message: 'Connexion établie'
    }));

    // Gérer la fermeture de la connexion
    ws.on('close', () => {
      // Supprimer la connexion fermée
      const userConnections = connections.get(userId) || [];
      connections.set(
        userId,
        userConnections.filter(conn => conn !== ws)
      );

      logger.info(`Connexion WebSocket fermée pour l'utilisateur ${userId}`);
    });

    // Gérer les erreurs de connexion
    ws.on('error', (error) => {
      logger.error(`Erreur WebSocket pour l'utilisateur ${userId}:`, error);
    });
  });

  return wss;
}

// Envoyer une notification en temps réel à un utilisateur spécifique
export function sendNotificationToUser(userId: number, notification: any) {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.length === 0) {
    return false;
  }

  // Format du message
  const message = JSON.stringify({
    type: 'notification',
    notification
  });

  // Envoyer à toutes les connexions de cet utilisateur
  let sentToAtLeastOne = false;
  userConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sentToAtLeastOne = true;
    }
  });

  return sentToAtLeastOne;
}

// Envoyer une commande pour rafraîchir toutes les notifications
export function sendRefreshCommand(userId: number) {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.length === 0) {
    return false;
  }

  // Format du message
  const message = JSON.stringify({
    type: 'refresh'
  });

  // Envoyer à toutes les connexions de cet utilisateur
  let sentToAtLeastOne = false;
  userConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sentToAtLeastOne = true;
    }
  });

  return sentToAtLeastOne;
}

// Envoyer une notification à tous les utilisateurs
export function broadcastNotification(notification: any) {
  // Pour chaque utilisateur avec des connexions actives
  connections.forEach((userConnections, userId) => {
    sendNotificationToUser(userId, notification);
  });
}

// Fermer toutes les connexions
export function closeAllConnections() {
  connections.forEach((userConnections) => {
    userConnections.forEach(ws => {
      ws.close();
    });
  });
  
  connections.clear();
} 