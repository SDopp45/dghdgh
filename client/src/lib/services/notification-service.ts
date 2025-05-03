import { apiRequest } from '@/lib/queryClient';
import { useNotificationStore, Notification } from '@/lib/stores/useNotificationStore';

// Type pour les notifications venant de l'API
export interface ApiNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  relatedTo: 'property' | 'tenant' | 'maintenance' | 'marketplace';
  relatedId: number;
  isRead: boolean;
  createdAt: string;
}

// Service de notification
class NotificationService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // Délai initial de 3 secondes
  
  // Récupérer toutes les notifications de l'utilisateur
  async fetchNotifications(): Promise<ApiNotification[]> {
    try {
      const response = await apiRequest('/api/notifications');
      return response as ApiNotification[];
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return [];
    }
  }
  
  // Marquer une notification comme lue
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      await apiRequest(`/api/notifications/${notificationId}/read`, { 
        method: 'PUT' 
      });
      return true;
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
      return false;
    }
  }
  
  // Marquer toutes les notifications comme lues
  async markAllAsRead(): Promise<boolean> {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PUT' });
      return true;
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
      return false;
    }
  }
  
  // Convertir une notification API en notification du store
  convertApiNotification(apiNotification: ApiNotification) {
    const store = useNotificationStore.getState();
    
    // Déterminer le type de notification dans notre format interne
    let type: 'visit' | 'payment' | 'lease' | 'marketplace' = 'visit';
    
    // Les notifications liées aux locataires et paiements
    if (apiNotification.relatedTo === 'tenant') {
      type = 'payment';
    }
    // Les notifications de paiements programmés
    else if (apiNotification.title.includes('Paiement programmé') || apiNotification.message.includes('paiement')) {
      type = 'payment';
    }
    // Les notifications liées aux baux
    else if (apiNotification.relatedTo === 'property' && apiNotification.message.includes('bail')) {
      type = 'lease';
    }
    // Les notifications de marketplace
    else if (apiNotification.relatedTo === 'marketplace') {
      type = 'marketplace';
    }
    
    // Créer la notification dans le format attendu par le store
    const notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'hasBeenSeen' | 'isArchived'> = {
      type,
      title: apiNotification.title,
      message: apiNotification.message,
      data: {
        id: apiNotification.relatedId,
        type: apiNotification.type,
        relatedTo: apiNotification.relatedTo
      },
      priority: apiNotification.type === 'alert' ? 'high' : 
               apiNotification.type === 'warning' ? 'medium' : 'low'
    };
    
    // Ajouter la notification
    store.addNotification(notification);
    
    // Si la notification était déjà lue, la marquer comme lue
    if (apiNotification.isRead) {
      // Trouver l'ID interne attribué à cette notification
      const addedNotification = store.notifications.find(
        n => n.title === apiNotification.title && 
            n.message === apiNotification.message &&
            n.data.id === apiNotification.relatedId
      );
      
      if (addedNotification) {
        store.markAsRead(addedNotification.id);
      }
    }
  }
  
  // Initialiser la connexion WebSocket
  initWebSocket() {
    if (this.socket) {
      this.socket.close();
    }
    
    // Déterminer l'URL du WebSocket (ws:// en développement, wss:// en production)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/notifications`;
    
    this.socket = new WebSocket(wsUrl);
    
    // Gestionnaire d'ouverture de connexion
    this.socket.onopen = () => {
      console.log('WebSocket connecté pour les notifications');
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
    };
    
    // Gestionnaire de messages
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Si c'est une notification, la traiter
        if (data.type === 'notification') {
          this.convertApiNotification(data.notification);
        }
        
        // Si c'est une commande de rafraîchissement
        if (data.type === 'refresh') {
          this.fetchNotifications().then(notifications => {
            // Mettre à jour le store avec toutes les notifications
            notifications.forEach(notification => {
              this.convertApiNotification(notification);
            });
          });
        }
      } catch (error) {
        console.error('Erreur lors du traitement d\'un message WebSocket:', error);
      }
    };
    
    // Gestionnaire d'erreur
    this.socket.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };
    
    // Gestionnaire de fermeture
    this.socket.onclose = (event) => {
      console.log(`WebSocket fermé avec le code: ${event.code}`);
      
      // Tenter de se reconnecter si ce n'était pas une fermeture volontaire
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }
  
  // Planifier une reconnexion
  private scheduleReconnect() {
    this.clearReconnectTimeout();
    
    // Délai exponentiel avec jitter
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts) 
                 + Math.floor(Math.random() * 1000);
                 
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Tentative de reconnexion WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.initWebSocket();
    }, delay);
  }
  
  // Nettoyer le timeout de reconnexion
  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  // Fermer proprement la connexion WebSocket
  closeWebSocket() {
    this.clearReconnectTimeout();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// Exporter une instance unique du service
export const notificationService = new NotificationService(); 