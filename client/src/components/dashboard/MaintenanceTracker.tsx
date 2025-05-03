import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  property?: {
    name: string;
  };
}

export function MaintenanceTracker() {
  const { data: maintenance, isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Suivi des Maintenances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const maintenanceByPriority = {
    high: maintenance?.filter(m => m.priority === "high") || [],
    medium: maintenance?.filter(m => m.priority === "medium") || [],
    low: maintenance?.filter(m => m.priority === "low") || [],
  };

  const statusColors = {
    open: "text-yellow-500",
    in_progress: "text-blue-500",
    completed: "text-green-500",
  } as const;

  const priorityIcons: Record<'high' | 'medium' | 'low', ReactNode> = {
    high: <AlertTriangle className="h-4 w-4" />,
    medium: <Clock className="h-4 w-4" />,
    low: <Wrench className="h-4 w-4" />,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Suivi des Maintenances
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <AnimatePresence>
            {(Object.entries(maintenanceByPriority) as [keyof typeof maintenanceByPriority, MaintenanceRequest[]][]).map(([priority, requests], index) => (
              <motion.div
                key={priority}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {priority === "high" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                    {priorityIcons[priority]}
                    <span className="text-sm font-medium capitalize">
                      Priorité {priority}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {requests.length} demande(s)
                  </span>
                </div>

                <div className="space-y-2">
                  {requests.slice(0, 2).map((request) => (
                    <motion.div
                      key={request.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.property?.name}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${statusColors[request.status]} flex items-center gap-1`}
                      >
                        {request.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : request.status === "in_progress" ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {request.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>

                <Progress
                  value={
                    (requests.filter(r => r.status === "completed").length /
                      Math.max(requests.length, 1)) *
                    100
                  }
                  className="h-2"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}