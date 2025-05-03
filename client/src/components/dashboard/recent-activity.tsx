import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export function RecentActivity() {
  const { data: maintenance } = useQuery<any[]>({ queryKey: ["/api/maintenance"] });

  // Trier les demandes par date (plus récentes en premier)
  const sortedRequests = maintenance
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    ?.slice(0, 5);

  // Calculer les statistiques pour chaque type de demande
  const totalRequests = maintenance?.length || 0;
  const openRequests = maintenance?.filter(r => r.status === "open") || [];
  const inProgressRequests = maintenance?.filter(r => r.status === "in_progress") || [];
  const completedRequests = maintenance?.filter(r => r.status === "completed") || [];

  const getPercentage = (count: number) => totalRequests > 0 ? (count / totalRequests) * 100 : 0;

  const stats = [
    {
      label: "Demandes ouvertes",
      count: openRequests.length,
      percentage: getPercentage(openRequests.length),
      icon: AlertTriangle,
      color: "bg-yellow-500",
      textColor: "text-yellow-600",
    },
    {
      label: "Demandes en cours",
      count: inProgressRequests.length,
      percentage: getPercentage(inProgressRequests.length),
      icon: Clock,
      color: "bg-blue-500",
      textColor: "text-blue-600",
    },
    {
      label: "Demandes terminées",
      count: completedRequests.length,
      percentage: getPercentage(completedRequests.length),
      icon: CheckCircle2,
      color: "bg-green-500",
      textColor: "text-green-600",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vue d'ensemble des demandes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Statistiques et barres de progression */}
          <div className="space-y-4">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-4 w-4 ${stat.textColor}`} />
                    <span>{stat.label}</span>
                  </div>
                  <span className="font-medium">
                    {stat.count} ({Math.round(stat.percentage)}%)
                  </span>
                </div>
                <Progress
                  value={stat.percentage}
                  className={`h-2 ${stat.color}`}
                />
              </div>
            ))}
          </div>

          {/* Séparateur */}
          <div className="h-px bg-border" />

          {/* Liste des demandes récentes */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Activité récente</h4>
            {sortedRequests?.map((request) => (
              <div key={request.id} className="flex items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {request.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.property?.name} - {format(new Date(request.createdAt), "PPP", { locale: fr })}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                    ${request.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {request.status === 'open' ? 'Ouvert' :
                      request.status === 'in_progress' ? 'En cours' :
                      'Terminé'}
                  </span>
                </div>
              </div>
            ))}

            {(!sortedRequests || sortedRequests.length === 0) && (
              <p className="text-sm text-muted-foreground text-center">
                Aucune demande récente
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}