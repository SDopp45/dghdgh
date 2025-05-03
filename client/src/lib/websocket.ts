import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from './stores/useNotificationStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from './utils';

class WebSocketService {
  private socket: Socket | null = null;
  private initialized = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private midnightCheckInterval: NodeJS.Timeout | null = null;

  init() {
    if (this.initialized) return;

    this.socket = io(window.location.origin, {
      path: '/ws',
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.startPolling();
      this.startMidnightCheck();
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.stopPolling();
      this.stopMidnightCheck();
    });

    this.socket.on('visit', (data) => {
      useNotificationStore.getState().addNotification({
        type: 'visit',
        title: 'Visite prévue aujourd\'hui',
        message: `${data.tenant} - ${data.property} à ${format(new Date(data.datetime), 'HH:mm', { locale: fr })}`,
        data,
        priority: 'medium'
      });
    });

    this.socket.on('payment', (data) => {
      if (data.status === 'pending') {
        useNotificationStore.getState().addNotification({
          type: 'payment',
          title: 'Loyer en attente',
          message: `${data.tenant} - ${data.property} - ${formatCurrency(data.amount)}`,
          data,
          priority: 'high'
        });
      }
    });

    this.socket.on('payment_completed', (data) => {
      useNotificationStore.getState().removePaymentNotification(data.id);
    });

    this.socket.on('visit_archived', (data) => {
      console.log('Visit archived, removing notification:', data);
      useNotificationStore.getState().removeVisitNotification(data.id);
    });

    this.initialized = true;
  }

  private startPolling() {
    this.pollingInterval = setInterval(() => {
      if (this.socket) {
        this.socket.emit('checkTodayVisits');
        this.socket.emit('checkPendingPayments');
      }
    }, 60000);

    if (this.socket) {
      this.socket.emit('checkTodayVisits');
      this.socket.emit('checkPendingPayments');
    }
  }

  private startMidnightCheck() {
    const checkForMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        useNotificationStore.getState().removeExpiredNotifications();
        if (this.socket) {
          this.socket.emit('checkTodayVisits');
          this.socket.emit('checkPendingPayments');
        }
      }
    };

    this.midnightCheckInterval = setInterval(checkForMidnight, 60000);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private stopMidnightCheck() {
    if (this.midnightCheckInterval) {
      clearInterval(this.midnightCheckInterval);
      this.midnightCheckInterval = null;
    }
  }

  disconnect() {
    this.stopPolling();
    this.stopMidnightCheck();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.initialized = false;
    }
  }

  emitPaymentStatusChange(id: number, status: string) {
    if (this.socket) {
      this.socket.emit('paymentStatusChanged', { id, status });
    }
  }

  emitVisitStatusChange(id: number, archived: boolean) {
    if (this.socket) {
      this.socket.emit('visitStatusChanged', { id, archived });
    }
  }
}

export const webSocketService = new WebSocketService();