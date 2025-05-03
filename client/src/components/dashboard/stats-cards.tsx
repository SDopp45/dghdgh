import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, AlertTriangle, Home, TrendingUp, Percent, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface PropertyData {
  id: number;
  status: string;
  archived?: boolean;
  purchasePrice: number;
  tenants: Array<{
    active: boolean;
    rentAmount: number;
  }>;
}

interface TenantData {
  active: boolean;
  leaseStatus: string;
  rentAmount: number;
}

interface Stat {
  title: string;
  value: number | string;
  previousValue?: number;
  percentageChange?: number;
  icon: any;
  formatter: (value: number | string) => string;
  description: string;
}

export function StatsCards() {
  const { data: properties } = useQuery<PropertyData[]>({ 
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    }
  });

  const { data: tenants } = useQuery<TenantData[]>({ 
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const response = await fetch("/api/tenants");
      if (!response.ok) throw new Error("Failed to fetch tenants");
      return response.json();
    }
  });

  // Calcul de la valeur totale et historique
  const totalValue = properties?.reduce((acc, p) => acc + Number(p.purchasePrice), 0) ?? 0;
  const previousTotalValue = totalValue * 0.95; // Simulation de l'historique
  const totalValueChange = ((totalValue - previousTotalValue) / previousTotalValue) * 100;

  // Calcul des loyers en attente
  const pendingRent = tenants
    ?.filter(t => t.active && t.leaseStatus === "actif")
    .reduce((acc, t) => acc + Number(t.rentAmount), 0) ?? 0;
  const previousPendingRent = pendingRent * 0.90; // Simulation de l'historique
  const pendingRentChange = ((pendingRent - previousPendingRent) / previousPendingRent) * 100;

  // Calcul du taux de vacance
  const totalProperties = properties?.length ?? 0;
  const occupiedProperties = properties?.filter(p => p.status === "rented").length ?? 0;
  const vacancyRate = totalProperties > 0 
    ? ((totalProperties - occupiedProperties) / totalProperties * 100)
    : 0;

  // Propriétés actives
  const activeProperties = properties?.filter(p => !p.archived).length ?? 0;

  const stats: Stat[] = [
    {
      title: "Valeur totale",
      value: totalValue,
      previousValue: previousTotalValue,
      percentageChange: totalValueChange,
      icon: DollarSign,
      formatter: (value) => `${Number(value).toLocaleString()}€`,
      description: "Valeur totale de votre portefeuille immobilier",
    },
    {
      title: "Loyers mensuels",
      value: pendingRent,
      previousValue: previousPendingRent,
      percentageChange: pendingRentChange,
      icon: TrendingUp,
      formatter: (value) => `${Number(value).toLocaleString()}€`,
      description: "Total des loyers mensuels à percevoir",
    },
    {
      title: "Taux d'occupation",
      value: 100 - vacancyRate,
      icon: Percent,
      formatter: (value) => `${Number(value).toFixed(1)}%`,
      description: "Pourcentage de biens occupés",
    },
    {
      title: "Propriétés gérées",
      value: activeProperties,
      icon: Building2,
      formatter: (value) => String(value),
      description: "Nombre de biens actifs en gestion",
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="min-h-[140px] flex flex-col justify-between bg-gradient-to-br from-background to-muted/20 border-border/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold truncate">
                  {stat.formatter(stat.value)}
                </div>
                {stat.percentageChange !== undefined && (
                  <div className="flex items-center gap-1 text-xs">
                    {stat.percentageChange >= 0 ? (
                      <div className="flex items-center text-green-600">
                        <ArrowUp className="h-3 w-3" />
                        <span>+{stat.percentageChange.toFixed(1)}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <ArrowDown className="h-3 w-3" />
                        <span>{stat.percentageChange.toFixed(1)}%</span>
                      </div>
                    )}
                    <span className="text-muted-foreground">
                      vs mois précédent ({stat.formatter(stat.previousValue || 0)})
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}