import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Euro, Home, Calendar, Wrench, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Visit {
  id: number;
  firstName: string;
  lastName: string;
  property?: {
    name: string;
  };
  datetime: string;
  status: string;
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  property?: {
    name: string;
  };
  createdAt: string;
}

interface Transaction {
  id: number;
  description: string;
  type: 'income' | 'expense';
  status: string;
  amount: number;
  property?: {
    name: string;
  };
  date: string;
}

export function RecentActivity() {
  const { toast } = useToast();

  const { 
    data: maintenance,
    isLoading: isLoadingMaintenance,
    error: maintenanceError
  } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
    retry: 3,
    enabled: true,
    staleTime: 300000, // 5 minutes
    queryFn: async () => {
      try {
        const response = await fetch("/api/maintenance");
        if (!response.ok) throw new Error("Failed to fetch maintenance data");
        return response.json();
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les demandes de maintenance",
          variant: "destructive",
        });
        throw error;
      }
    }
  });

  const { 
    data: visits,
    isLoading: isLoadingVisits,
    error: visitsError
  } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    retry: 3,
    enabled: true,
    staleTime: 300000,
    queryFn: async () => {
      try {
        const response = await fetch("/api/visits");
        if (!response.ok) throw new Error("Failed to fetch visits data");
        return response.json();
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les visites",
          variant: "destructive",
        });
        throw error;
      }
    }
  });

  const { 
    data: transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError
  } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    retry: 3,
    enabled: true,
    staleTime: 300000,
    queryFn: async () => {
      try {
        const response = await fetch("/api/transactions");
        if (!response.ok) throw new Error("Failed to fetch transactions data");
        return response.json();
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les transactions",
          variant: "destructive",
        });
        throw error;
      }
    }
  });

  const isLoading = isLoadingMaintenance || isLoadingVisits || isLoadingTransactions;
  const hasError = maintenanceError || visitsError || transactionsError;

  // Initialize activities with safe defaults
  const activities = [
    ...(maintenance?.map((m) => ({
      type: 'maintenance' as const,
      date: new Date(m.createdAt),
      title: m.title,
      description: m.description,
      status: m.status,
      priority: m.priority,
      property: m.property?.name ?? 'N/A',
      icon: Wrench,
      color: m.priority === 'high' ? 'text-red-500' : m.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500',
      statusIcon: m.status === 'completed' ? CheckCircle2 : m.status === 'in_progress' ? Clock : AlertCircle
    })) || []),
    ...(visits?.map((v) => ({
      type: 'visit' as const,
      date: new Date(v.datetime),
      title: `Visite - ${v.property?.name ?? 'N/A'}`,
      description: `Par ${v.firstName} ${v.lastName}`,
      status: v.status,
      property: v.property?.name ?? 'N/A',
      icon: Calendar,
      color: 'text-purple-500',
      statusIcon: v.status === 'completed' ? CheckCircle2 : v.status === 'in_progress' ? Clock : AlertCircle
    })) || []),
    ...(transactions?.map((t) => ({
      type: 'transaction' as const,
      date: new Date(t.date),
      title: t.description,
      description: `${t.type === 'income' ? 'Revenu' : 'Dépense'} - ${t.property?.name ?? 'N/A'}`,
      status: t.status,
      amount: t.amount,
      transactionType: t.type,
      property: t.property?.name ?? 'N/A',
      icon: Euro,
      color: t.type === 'income' ? 'text-green-500' : 'text-red-500',
      statusIcon: t.status === 'completed' ? CheckCircle2 : Clock
    })) || [])
  ].sort((a, b) => b.date.getTime() - a.date.getTime())
   .slice(0, 5);

  const getStatusColor = (status: string) => {
    const colors = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
      open: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
    } as const;
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activités récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activités récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            Une erreur est survenue lors du chargement des activités
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activités récentes</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {activities.map((activity, index) => (
            <motion.div 
              key={index} 
              className="flex items-start space-x-4 group hover:bg-muted/50 rounded-lg p-3 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`mt-1 p-2 rounded-full bg-gray-100 ${activity.color} transition-transform group-hover:scale-110`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">
                      {activity.title}
                    </p>
                    {'priority' in activity && activity.priority === 'high' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(activity.status)} flex items-center gap-1`}
                  >
                    <activity.statusIcon className="h-3 w-3" />
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Home className="mr-1 h-3 w-3" />
                  <span className="mr-2">{activity.property}</span>
                  <span>{format(activity.date, 'PPp', { locale: fr })}</span>
                  {'amount' in activity && (
                    <span className={`ml-2 font-medium ${activity.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.transactionType === 'income' ? '+' : '-'}{activity.amount}€
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {activities.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-muted-foreground"
            >
              Aucune activité récente
            </motion.div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}