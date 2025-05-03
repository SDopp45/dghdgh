
import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '../../lib/utils';

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  relatedTo?: string;
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Récupérer les notifications
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axios.get('/api/notifications');
      return response.data as Notification[];
    },
    refetchInterval: 60000, // Rafraîchir toutes les 60 secondes
  });

  // Compter les notifications non lues
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mutation pour marquer une notification comme lue
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => {
      return axios.put(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mutation pour marquer toutes les notifications comme lues
  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      return axios.put('/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Formater la date relative
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'à l\'instant';
    if (diffMins < 60) return `il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR');
  };

  // Obtenir la couleur en fonction du type
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'alert':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-1 -right-1"
            >
              <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center rounded-full p-0">
                {unreadCount}
              </Badge>
            </motion.div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs" 
              onClick={() => markAllAsReadMutation.mutate()}
            >
              <Check className="h-3 w-3 mr-1" /> Tout marquer comme lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Aucune notification</div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-accent/50 transition-colors cursor-pointer flex gap-3",
                    !notification.isRead ? "bg-accent/20" : ""
                  )}
                  onClick={() => markAsReadMutation.mutate(notification.id)}
                >
                  <div className={cn("w-2 self-stretch rounded-full", getTypeColor(notification.type))} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
