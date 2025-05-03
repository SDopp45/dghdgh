import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Check,
  Clock,
  Filter,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNotificationStore, NotificationType } from "@/lib/stores/useNotificationStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const typeIcons = {
  visit: Clock,
  payment: Bell,
  lease: Bell,
};

export function NotificationCenter() {
  const {
    notifications,
    markAsRead,
    removeNotification,
    markAllAsRead,
    trackInteraction,
  } = useNotificationStore();

  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filteredNotifications = notifications.filter((notification) => {
    if (filter !== "all" && notification.type !== filter) return false;
    if (priorityFilter !== "all" && notification.priority !== priorityFilter)
      return false;
    return true;
  });

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    trackInteraction(notification.id, "click", notification.type);
  };

  const handleRemove = (notification: any) => {
    removeNotification(notification.id);
    trackInteraction(notification.id, "dismiss", notification.type);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Centre de notifications</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="text-muted-foreground"
          >
            Tout marquer comme lu
          </Button>
        </div>
        <CardDescription>
          Gérez vos notifications et alertes importantes
        </CardDescription>
        <div className="flex gap-2 mt-4">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="visit">Visites</SelectItem>
              <SelectItem value="payment">Paiements</SelectItem>
              <SelectItem value="lease">Baux</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <Bell className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer par priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8 text-muted-foreground"
            >
              Aucune notification
            </motion.div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`relative p-4 rounded-lg border ${
                    notification.isRead
                      ? "bg-background"
                      : "bg-primary/5 dark:bg-primary/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        priorityColors[notification.priority]
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={priorityColors[notification.priority]}
                          >
                            {notification.priority}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleNotificationClick(notification)
                                }
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Marquer comme lu
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRemove(notification)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
