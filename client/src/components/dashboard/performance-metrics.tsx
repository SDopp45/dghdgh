import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Percent, Timer, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

export function PerformanceMetrics() {
  const { data: properties, isLoading: isLoadingProperties } = useQuery<any[]>({ queryKey: ["/api/properties"] });
  const { data: tenants, isLoading: isLoadingTenants } = useQuery<any[]>({ queryKey: ["/api/tenants"] });
  const { data: maintenance, isLoading: isLoadingMaintenance } = useQuery<any[]>({ queryKey: ["/api/maintenance"] });

  const isLoading = isLoadingProperties || isLoadingTenants || isLoadingMaintenance;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded-full animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calcul du taux d'occupation
  const currentDate = new Date();
  const lastMonth = subMonths(currentDate, 1);

  const occupancyRate = properties?.length
    ? (properties.filter(p => p.status === "rented").length / properties.length) * 100
    : 0;

  // Calcul du taux d'occupation du mois dernier pour comparaison
  const lastMonthOccupancyRate = properties?.length
    ? (properties.filter(p => {
        const startDate = new Date(p.rentedSince);
        return p.status === "rented" && startDate <= lastMonth;
      }).length / properties.length) * 100
    : 0;

  const occupancyTrend = occupancyRate >= lastMonthOccupancyRate;

  // Calcul du temps moyen de résolution des maintenances
  const completedMaintenance = maintenance?.filter(m => m.status === "completed") || [];
  const averageMaintenanceTime = completedMaintenance.length
    ? completedMaintenance.reduce((acc, m) => {
        const duration = new Date(m.completedAt).getTime() - new Date(m.createdAt).getTime();
        return acc + duration;
      }, 0) / completedMaintenance.length / (1000 * 60 * 60 * 24) // en jours
    : 0;

  // Calcul du temps moyen de résolution du mois dernier
  const lastMonthCompletedMaintenance = completedMaintenance.filter(m =>
    new Date(m.completedAt) <= lastMonth
  );
  const lastMonthAverageTime = lastMonthCompletedMaintenance.length
    ? lastMonthCompletedMaintenance.reduce((acc, m) => {
        const duration = new Date(m.completedAt).getTime() - new Date(m.createdAt).getTime();
        return acc + duration;
      }, 0) / lastMonthCompletedMaintenance.length / (1000 * 60 * 60 * 24)
    : 0;

  const maintenanceTrend = averageMaintenanceTime <= lastMonthAverageTime;

  // Calcul des retards de paiement et tendance
  const latePayments = tenants?.filter(t => t.active && t.paymentStatus === "late")?.length ?? 0;
  const lastMonthLatePayments = tenants?.filter(t => {
    const lastPaymentDate = new Date(t.lastPaymentDate);
    return t.active && t.paymentStatus === "late" && lastPaymentDate <= lastMonth;
  })?.length ?? 0;

  const paymentTrend = latePayments <= lastMonthLatePayments;

  const metrics = [
    {
      title: "Taux d'occupation",
      value: occupancyRate.toFixed(1) + "%",
      trend: occupancyTrend,
      trendValue: (occupancyRate - lastMonthOccupancyRate).toFixed(1) + "%",
      description: "vs mois dernier",
      icon: Percent,
      progress: occupancyRate,
      progressColor: "bg-violet-500",
      gradientClass: "bg-gradient-to-br from-violet-500/10 via-violet-400/5 to-transparent"
    },
    {
      title: "Délai de résolution",
      value: averageMaintenanceTime.toFixed(1) + "j",
      trend: maintenanceTrend,
      trendValue: (averageMaintenanceTime - lastMonthAverageTime).toFixed(1) + "j",
      description: "vs mois dernier",
      icon: Timer,
      progress: Math.max(0, 100 - (averageMaintenanceTime / 7) * 100),
      progressColor: "bg-amber-500",
      gradientClass: "bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent"
    },
    {
      title: "Retards de paiement",
      value: latePayments,
      trend: paymentTrend,
      trendValue: Math.abs(latePayments - lastMonthLatePayments).toString(),
      description: "vs mois dernier",
      icon: AlertTriangle,
      progress: Math.max(0, 100 - (latePayments / (tenants?.length || 1)) * 100),
      progressColor: "bg-emerald-500",
      gradientClass: "bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent"
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {metrics.map((metric, index) => (
        <motion.div key={metric.title} variants={item}>
          <Card className={metric.gradientClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.progressColor.replace('bg-', 'text-')}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{metric.value}</div>
              <Progress
                value={metric.progress}
                className={`h-2 ${metric.progressColor}`}
              />
              <div className="mt-2 flex items-center text-xs">
                {metric.trend ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={metric.trend ? "text-emerald-500" : "text-red-500"}>
                  {metric.trend ? "+" : "-"}{metric.trendValue}
                </span>
                <span className="ml-1 text-muted-foreground">
                  {metric.description}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}