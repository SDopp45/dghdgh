import { useEffect, useState, useCallback } from 'react';
import { Bell, X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificationStore, NotificationType } from '@/lib/stores/useNotificationStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '@/lib/services/notification-service';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const getPriorityColor = (priority: 'high' | 'medium' | 'low', type: NotificationType) => {
  const baseColor = type === 'visit' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-red-500';
  return baseColor;
};

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeExpiredNotifications,
    removeNotification,
    trackInteraction,
  } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  const [activeFilter, setActiveFilter] = useState<'all' | 'visit' | 'payment'>('all');

  // Récupérer les notifications depuis l'API
  const { data: apiNotifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.fetchNotifications(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: false, // Ne pas charger automatiquement
  });

  // Fonction pour syncroniser les notifications avec celles de l'API
  const syncApiNotifications = useCallback(() => {
    if (apiNotifications) {
      apiNotifications.forEach(notification => {
        notificationService.convertApiNotification(notification);
      });
    }
  }, [apiNotifications]);

  // Charger les notifications au premier montage et quand isOpen devient true
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Synchroniser les notifications API quand elles sont reçues
  useEffect(() => {
    syncApiNotifications();
  }, [apiNotifications, syncApiNotifications]);

  // Nettoyer les notifications expirées à intervalles réguliers
  useEffect(() => {
    const checkInterval = setInterval(() => {
      removeExpiredNotifications();
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [removeExpiredNotifications]);

  // Initialiser la connexion WebSocket une fois
  useEffect(() => {
    notificationService.initWebSocket();
    
    return () => {
      notificationService.closeWebSocket();
    };
  }, []);

  // Gérer les actions sur les notifications
  const handleNotificationClick = async (notification: any) => {
    console.log('Clicking notification:', notification.id);
    if (notification.type === 'visit') {
      setLocation(`/visits?target=${notification.data.id}`);
    } else if (notification.type === 'payment') {
      setLocation(`/finance?target=${notification.data.id}`);
    } else if (notification.type === 'lease') {
      setLocation(`/properties/${notification.data.id}`);
    }
    
    // Marquer la notification comme lue dans l'API si elle a un ID numérique de l'API
    const apiId = Number(notification.id);
    if (!isNaN(apiId)) {
      await notificationService.markAsRead(apiId);
    }
    
    // Marquer la notification comme lue localement
    markAsRead(notification.id);
    trackInteraction(notification.id, 'click', notification.type);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    removeNotification(notification.id);
  };

  const handleMarkAllAsRead = async () => {
    // Marquer toutes les notifications comme lues sur l'API
    await notificationService.markAllAsRead();
    
    // Marquer toutes les notifications comme lues localement
    markAllAsRead();
    
    // Rafraîchir la liste des notifications
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const filteredNotifications = notifications
    .filter((n) => !n.isArchived)
    .filter((n) => activeTab === 'unread' ? !n.hasBeenSeen : n.hasBeenSeen)
    .filter((n) => activeFilter === 'all' ? true : n.type === activeFilter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calculer les compteurs par type
  const currentTabNotifications = notifications
    .filter((n) => !n.isArchived)
    .filter((n) => activeTab === 'unread' ? !n.hasBeenSeen : n.hasBeenSeen);

  const counts = {
    all: currentTabNotifications.length,
    visit: currentTabNotifications.filter(n => n.type === 'visit').length,
    payment: currentTabNotifications.filter(n => n.type === 'payment').length,
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
          {unreadCount > 0 && (
              <motion.span 
                key="badge"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center"
              >
              {unreadCount}
              </motion.span>
          )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px]">
        <div className="flex items-center justify-between p-2 border-b">
          <h2 className="text-lg font-semibold">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 text-sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
        {/* Onglets Vu/Non vu */}
        <div className="flex border-b">
          <Button
            variant={activeTab === 'unread' ? 'secondary' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveTab('unread')}
          >
            Non vues
          </Button>
          <Button
            variant={activeTab === 'read' ? 'secondary' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => setActiveTab('read')}
          >
            Vues
          </Button>
        </div>
        {/* Filtres avec compteurs */}
        <div className="flex p-2 gap-2 border-b">
          <Button
            variant={activeFilter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className="flex-1 relative"
          >
            Tout
            <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded-full text-xs">
              {counts.all}
            </span>
          </Button>
          <Button
            variant={activeFilter === 'visit' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('visit')}
            className="flex-1 relative"
          >
            Visites
            <span className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full text-xs">
              {counts.visit}
            </span>
          </Button>
          <Button
            variant={activeFilter === 'payment' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('payment')}
            className="flex-1 relative"
          >
            Paiements
            <span className="ml-2 bg-red-100 px-2 py-0.5 rounded-full text-xs">
              {counts.payment}
            </span>
          </Button>
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chargement des notifications...
            </p>
          ) : filteredNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune notification {activeFilter !== 'all' ? `de type ${activeFilter === 'visit' ? 'visite' : 'paiement'}` : ''} {activeTab === 'unread' ? 'non vue' : 'vue'}
            </p>
          ) : (
            <div className="space-y-1 p-2">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 1, height: "auto" }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      marginTop: 0,
                      marginBottom: 0,
                      padding: 0,
                    }}
                    layout
                  >
                    <div
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all duration-200 relative bg-white border",
                        notification.type === 'visit'
                          ? 'border-blue-200 hover:bg-blue-50'
                          : notification.type === 'payment'
                            ? 'border-red-200 hover:bg-red-50'
                            : 'border-amber-200 hover:bg-amber-50',
                        getPriorityColor(notification.priority || 'medium', notification.type)
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-red-200"
                          onClick={(e) => handleDelete(e, notification)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="pr-10">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.timestamp), 'PPp', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}