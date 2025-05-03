import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';

export type NotificationType = 'visit' | 'payment' | 'lease' | 'marketplace';
export type InteractionType = 'click' | 'dismiss' | 'archive';
export type PriorityType = 'high' | 'medium' | 'low';

export interface NotificationInteraction {
  notificationId: string;
  type: InteractionType;
  timestamp: string;
  category: NotificationType;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  timestamp: string;
  isRead: boolean;
  hasBeenSeen: boolean;
  isArchived: boolean;
  priority: PriorityType;
  targetId?: number;
}

interface NotificationStore {
  notifications: Notification[];
  interactions: NotificationInteraction[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'hasBeenSeen' | 'isArchived'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  removeExpiredNotifications: () => void;
  removePaymentNotification: (paymentId: number) => void;
  removeVisitNotification: (visitId: number) => void;
  trackInteraction: (notificationId: string, type: InteractionType, category: NotificationType) => void;
  getPriorityForType: (type: NotificationType) => PriorityType;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      interactions: [],
      unreadCount: 0,
      addNotification: (notification) => {
        // Check if similar notification exists
        const existingSimilar = get().notifications.find(n => {
          if (n.type === notification.type) {
            if (n.type === 'visit') {
              return n.data.id === notification.data.id;
            } else if (n.type === 'payment' || n.type === 'lease') {
              return n.data.id === notification.data.id;
            } else if (n.type === 'marketplace') {
              return n.data.id === notification.data.id;
            }
          }
          return false;
        });

        // Only add if no similar notification exists and conditions are met
        if (!existingSimilar && !notification.data.archived && 
            ((notification.type === 'visit' && notification.data.status === 'pending') ||
             (notification.type === 'payment' && notification.data.status === 'pending') ||
             (notification.type === 'lease') ||
             (notification.type === 'marketplace'))) {

          const newNotification: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            isRead: false,
            hasBeenSeen: false,
            isArchived: false,
            priority: notification.priority || get().getPriorityForType(notification.type),
            targetId: notification.data.id
          };

          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));
        }
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true, hasBeenSeen: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true, hasBeenSeen: true })),
          unreadCount: 0,
        }));
      },
      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },
      removeNotification: (id) => {
        const notification = get().notifications.find(n => n.id === id);
        if (notification) {
          get().trackInteraction(id, 'dismiss', notification.type);
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: state.unreadCount - (notification.isRead ? 0 : 1)
          }));
        }
      },
      removeExpiredNotifications: () => {
        const now = new Date();
        set((state) => ({
          notifications: state.notifications.filter((n) => {
            if (n.type === 'visit') {
              const visitDate = new Date(n.data.datetime);
              return visitDate > now && n.data.status === 'pending';
            }
            // Keep lease notifications if they're still within the alert period
            if (n.type === 'lease') {
              const leaseEndDate = new Date(n.data.dueDate);
              return leaseEndDate > now;
            }
            return true;
          }),
        }));
      },
      removePaymentNotification: (paymentId: number) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => 
            !(n.type === 'payment' && n.data.id === paymentId)
          ),
        }));
      },
      removeVisitNotification: (visitId: number) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => 
            !(n.type === 'visit' && n.data.id === visitId)
          ),
        }));
      },
      trackInteraction: (notificationId: string, type: InteractionType, category: NotificationType) => {
        const interaction: NotificationInteraction = {
          notificationId,
          type,
          timestamp: new Date().toISOString(),
          category,
        };

        set((state) => ({
          interactions: [...state.interactions, interaction],
        }));
      },
      getPriorityForType: (type: NotificationType) => {
        const state = get();
        const recentInteractions = state.interactions
          .filter(i => i.category === type)
          .slice(-10);

        if (recentInteractions.length === 0) {
          // Default priorities for different notification types
          switch (type) {
            case 'payment':
              return 'high';
            case 'lease':
              return 'medium';
            case 'marketplace':
              return 'medium';
            default:
              return 'low';
          }
        }

        const clickRatio = recentInteractions.filter(i => i.type === 'click').length / recentInteractions.length;
        const dismissRatio = recentInteractions.filter(i => i.type === 'dismiss').length / recentInteractions.length;

        if (clickRatio > 0.6) return 'high';
        if (dismissRatio > 0.6) return 'low';
        return 'medium';
      },
    }),
    {
      name: 'notification-store',
    }
  )
);