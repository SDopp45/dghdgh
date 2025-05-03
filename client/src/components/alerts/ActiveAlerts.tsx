import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Calendar, Building2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Alert {
  id: string;
  type: 'lease' | 'payment';
  property: {
    id: number;
    name: string;
  };
  tenant: {
    id: number;
    name: string;
  };
  dueDate: string;
  daysRemaining?: number;
  daysLate?: number;
}

export function ActiveAlerts() {
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts/active"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertes actives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedAlerts = alerts?.sort((a, b) => {
    // Prioritize payment alerts over lease alerts
    if (a.type !== b.type) {
      return a.type === 'payment' ? -1 : 1;
    }
    // Then sort by days (remaining or late)
    return (a.daysLate || a.daysRemaining || 0) - (b.daysLate || b.daysRemaining || 0);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertes actives
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          <motion.div className="space-y-4">
            {sortedAlerts?.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {alert.type === 'payment' ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Retard de paiement
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Fin de bail proche
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {alert.property.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {alert.tenant.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.type === 'payment' ? (
                        <>
                          Retard de {alert.daysLate} jours - 
                          Dû le {format(new Date(alert.dueDate), 'PPP', { locale: fr })}
                        </>
                      ) : (
                        <>
                          {alert.daysRemaining} jours restants - 
                          Expire le {format(new Date(alert.dueDate), 'PPP', { locale: fr })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            {(!sortedAlerts || sortedAlerts.length === 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-6 text-muted-foreground"
              >
                Aucune alerte active
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}