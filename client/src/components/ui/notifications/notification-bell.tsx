import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: 'visit' | 'payment';
  title: string;
  description: string;
  datetime: string;
  status: string;
  archived: boolean;
  data: any;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch visits
  const { data: visits } = useQuery({
    queryKey: ["/api/visits"],
    queryFn: async () => {
      const response = await fetch("/api/visits");
      if (!response.ok) throw new Error("Failed to fetch visits");
      return response.json();
    },
  });

  // Fetch transactions
  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
  });

  useEffect(() => {
    if (visits && transactions) {
      const todayVisits = visits
        .filter((visit: any) => !visit.archived && isToday(parseISO(visit.datetime)))
        .map((visit: any) => ({
          id: `visit-${visit.id}`,
          type: 'visit' as const,
          title: 'Visite prévue aujourd\'hui',
          description: `${visit.firstName} ${visit.lastName} - ${visit.property?.name || visit.manualAddress}`,
          datetime: visit.datetime,
          status: visit.status,
          archived: false,
          data: visit
        }));

      const pendingPayments = transactions
        .filter((transaction: any) => 
          transaction.type === 'income' && 
          transaction.status === 'pending' &&
          !transaction.archived
        )
        .map((transaction: any) => ({
          id: `payment-${transaction.id}`,
          type: 'payment' as const,
          title: 'Paiement en attente',
          description: `${transaction.description} - ${transaction.property?.name}`,
          datetime: transaction.date,
          status: transaction.status,
          archived: false,
          data: transaction
        }));

      setNotifications([...todayVisits, ...pendingPayments]);
    }
  }, [visits, transactions]);

  const activeNotifications = notifications.filter(n => !n.archived);
  const archivedNotifications = notifications.filter(n => n.archived);

  const handleNotificationClick = (notification: Notification) => {
    setIsOpen(false);
    if (notification.type === 'visit') {
      setLocation('/visits');
    } else {
      setLocation('/finance');
    }
  };

  const handleArchive = async (notification: Notification) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, archived: true } : n
      )
    );

    toast({
      title: "Notification archivée",
      description: "La notification a été déplacée dans les archives.",
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative w-10 h-10 rounded-full">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {activeNotifications.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge variant="destructive" className="rounded-full px-2">
                  {activeNotifications.length}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between px-4 py-2">
            <h4 className="font-semibold">Notifications</h4>
            <TabsList className="grid w-[160px] grid-cols-2">
              <TabsTrigger value="active">Actives</TabsTrigger>
              <TabsTrigger value="archived">Archives</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="max-h-[400px] overflow-y-auto">
            {activeNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune notification
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {activeNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      notification.type === 'visit' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-red-500'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium">{notification.title}</h5>
                        <p className="text-sm text-muted-foreground">
                          {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(notification.datetime), 'PPp', { locale: fr })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(notification);
                        }}
                      >
                        Archiver
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="max-h-[400px] overflow-y-auto">
            {archivedNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune notification archivée
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {archivedNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors opacity-70"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div>
                      <h5 className="font-medium">{notification.title}</h5>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(notification.datetime), 'PPp', { locale: fr })}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}