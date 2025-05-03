import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, FileText, CalendarRange, Wrench, AlertTriangle, Gauge, Euro, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Property } from "@shared/types";
import { format, parseISO, isAfter, isBefore, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PropertyInsight {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: 'success' | 'warning' | 'danger' | 'info';
}

interface PropertyInsightsRowProps {
  properties: Property[];
}

export function PropertyInsightsRow({ properties }: PropertyInsightsRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Récupérer les locataires pour les documents à renouveler
  const { data: tenants = [] } = useQuery({
    queryKey: ['/api/tenants'],
  });

  // Récupérer les visites pour la prochaine visite
  const { data: visits = [] } = useQuery({
    queryKey: ['/api/visits'],
  });

  // Récupérer l'historique des locataires pour la satisfaction
  const { data: tenantHistory = [] } = useQuery({
    queryKey: ['/api/tenant-history'],
  });

  // Calculer les documents à renouveler (baux arrivant à échéance dans les 3 mois)
  const documentsToRenew = tenants.filter(tenant => {
    if (!tenant.leaseEnd) return false;
    const leaseEnd = parseISO(tenant.leaseEnd);
    const now = new Date();
    const threeMonthsFromNow = addMonths(now, 3);
    return isAfter(leaseEnd, now) && isBefore(leaseEnd, threeMonthsFromNow);
  }).length;

  // Trouver la prochaine visite en attente
  const nextVisit = visits
    .filter(visit => visit.status === 'pending')
    .sort((a, b) => parseISO(a.datetime).getTime() - parseISO(b.datetime).getTime())[0];

  // Calculer la satisfaction moyenne des locataires
  const tenantSatisfaction = tenantHistory
    .filter(entry => entry.rating)
    .reduce((acc, entry) => acc + entry.rating, 0) / (tenantHistory.filter(entry => entry.rating).length || 1);

  // Insights générés à partir des données
  const insights: PropertyInsight[] = [
    {
      title: "Rentabilité moyenne",
      value: "5.8%",
      icon: TrendingUp,
      description: "ROI moyen du portefeuille",
      trend: {
        value: 0.5,
        isPositive: true
      },
      status: 'success'
    },
    {
      title: "Documents à renouveler",
      value: documentsToRenew,
      icon: FileText,
      description: "Contrats arrivant à échéance",
      status: documentsToRenew > 0 ? 'warning' : 'success'
    },
    {
      title: "Prochaine visite",
      value: nextVisit ? format(parseISO(nextVisit.datetime), "d MMM", { locale: fr }) : "Aucune",
      icon: CalendarRange,
      description: nextVisit ? `Visite technique programmée - ${nextVisit.property?.name}` : "Aucune visite planifiée",
      status: nextVisit ? 'info' : 'success'
    },
    {
      title: "Maintenance prévue",
      value: 2,
      icon: Wrench,
      description: "Interventions planifiées",
      status: 'info'
    },
    {
      title: "Incidents en cours",
      value: 1,
      icon: AlertTriangle,
      description: "Problèmes nécessitant attention",
      status: 'danger'
    },
    {
      title: "Performance énergétique",
      value: "B",
      icon: Gauge,
      description: "Note DPE moyenne",
      status: 'success'
    },
    {
      title: "Rendement locatif",
      value: "625€/m²",
      icon: Euro,
      description: "Revenu annuel moyen par m²",
      trend: {
        value: 2.3,
        isPositive: true
      },
      status: 'success'
    },
    {
      title: "Satisfaction locataires",
      value: `${tenantSatisfaction.toFixed(1)}/5`,
      icon: Users,
      description: "Note moyenne",
      status: tenantSatisfaction >= 4 ? 'success' : tenantSatisfaction >= 3 ? 'info' : 'warning'
    }
  ];

  const statusColors = {
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
    info: "text-blue-500"
  };

  return (
    <div 
      className="relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        className="flex gap-4 py-4"
        initial={{ x: 0 }}
        animate={{ x: isHovered ? undefined : "-100%" }}
        transition={{
          duration: 30,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
          repeatDelay: 0
        }}
      >
        {/* Triplicate the insights for smoother infinite scroll */}
        {[...insights, ...insights, ...insights].map((insight, index) => (
          <motion.div
            key={`${insight.title}-${index}`}
            className="flex-none w-[300px]"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="h-full bg-gradient-to-br from-background via-background/95 to-background/90 border-border/50 transition-all duration-300 hover:shadow-lg hover:border-primary/50 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {insight.title}
                </CardTitle>
                <insight.icon className={cn("h-4 w-4", statusColors[insight.status || 'info'])} />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold">
                      {insight.value}
                    </div>
                    {insight.trend && (
                      <Badge variant={insight.trend.isPositive ? "success" : "destructive"} className="h-6">
                        {insight.trend.isPositive ? "+" : "-"}{Math.abs(insight.trend.value)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground group-hover:text-primary/80 transition-colors">
                    {insight.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}