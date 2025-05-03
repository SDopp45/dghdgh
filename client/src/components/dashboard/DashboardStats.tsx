import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, Users, Wrench, Calendar, 
  BellRing, CheckCircle2, Clock, Euro,
  BarChart3, TrendingUp, AlertTriangle,
  Brain, ArrowUpRight, ArrowDown, ArrowUp
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useTheme } from "@/hooks/use-theme";

interface Transaction {
  amount: number;
  status: string;
  type: 'income' | 'expense';
  date: string;
}

interface Property {
  status: 'rented' | 'maintenance' | 'available';
}

interface Tenant {
  active: boolean;
  leaseEnd: string;
}

interface MaintenanceRequest {
  priority: string;
  status: string;
}

interface AIPredictions {
  tenantRetentionScore: number;
  tenantSatisfactionScore: number;
  upcomingMaintenanceCount: number;
  maintenanceEfficiencyScore: number;
  revenueGrowthPrediction: string;
  predictedGrowthPercentage: number;
}

// Composant qui affiche une animation de connexion de données
const DataConnectionLine = ({ delay = 0 }) => (
  <motion.div 
    className="absolute h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 dark:from-cyan-400/0 dark:via-cyan-400/40 dark:to-cyan-400/0"
    style={{ width: '100%', bottom: 0, left: 0 }}
    initial={{ scaleX: 0 }}
    animate={{ 
      scaleX: [0, 1, 0],
      opacity: [0, 0.5, 0],
    }}
    transition={{ 
      duration: 3,
      delay: delay,
      repeat: Infinity, 
      repeatDelay: 7
    }}
  />
);

// Effet de mise en évidence futuriste
const GlowEffect = ({ active = false, color = "cyan" }: { active?: boolean, color?: "cyan" | "teal" | "emerald" }) => {
  const colors = {
    cyan: {
      light: "bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0",
      dark: "dark:bg-gradient-to-r dark:from-cyan-400/0 dark:via-cyan-400/10 dark:to-cyan-400/0"
    },
    teal: {
      light: "bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0",
      dark: "dark:bg-gradient-to-r dark:from-teal-400/0 dark:via-teal-400/10 dark:to-teal-400/0"
    },
    emerald: {
      light: "bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0",
      dark: "dark:bg-gradient-to-r dark:from-emerald-400/0 dark:via-emerald-400/10 dark:to-emerald-400/0"
    }
  };

  return (
    <motion.div 
      className={cn(
        "absolute inset-0 pointer-events-none",
        colors[color].light,
        colors[color].dark
      )}
      animate={{ 
        opacity: active ? [0.3, 0.7, 0.3] : 0 
      }}
      transition={{ 
        duration: 2,
        repeat: active ? Infinity : 0,
        ease: "easeInOut" 
      }}
    />
  );
};

export function DashboardStats() {
  const { theme } = useTheme();
  
  // Requêtes pour les données
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: maintenanceRequests = [], isLoading: isLoadingMaintenance } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: aiPredictions = {
    tenantRetentionScore: 85,
    tenantSatisfactionScore: 90,
    upcomingMaintenanceCount: 2,
    maintenanceEfficiencyScore: 88,
    revenueGrowthPrediction: "Croissance stable prévue",
    predictedGrowthPercentage: 5,
  }, isLoading: isLoadingPredictions } = useQuery<AIPredictions>({
    queryKey: ["/api/ai/predictions"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // État de chargement global
  const isLoading = isLoadingProperties || isLoadingTenants || 
                    isLoadingMaintenance || isLoadingTransactions || 
                    isLoadingPredictions;

  // Affichage d'un état de chargement stylisé
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden border-cyan-500/10 dark:border-cyan-400/10">
              <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-background animate-pulse" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded" />
                </div>
              </CardContent>
              
              {/* Lignes de connexion animées pendant le chargement */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0 dark:from-cyan-400/0 dark:via-cyan-400 dark:to-cyan-400/0"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "linear",
                    delay: index * 0.2 
                  }}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  // Calcul des statistiques financières avec prédictions
  const financialStats = Array.isArray(transactions) 
    ? transactions.reduce((acc, t) => {
        const amount = Number(t.amount);
        if (t.status === "completed") {
          if (t.type === "income") {
            acc.totalRevenue += amount;
            if (new Date(t.date).getMonth() === new Date().getMonth()) {
              acc.monthlyRevenue += amount;
            }
          } else {
            acc.totalExpenses += amount;
            if (new Date(t.date).getMonth() === new Date().getMonth()) {
              acc.monthlyExpenses += amount;
            }
          }
        }
        return acc;
      }, { totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, monthlyExpenses: 0 })
    : { totalRevenue: 0, totalExpenses: 0, monthlyRevenue: 0, monthlyExpenses: 0 };

  // Calcul des statistiques des propriétés
  const propertyStats = {
    total: properties.length,
    rented: properties.filter(p => p.status === "rented").length,
    maintenance: properties.filter(p => p.status === "maintenance").length,
    available: properties.filter(p => p.status === "available").length,
  };

  // Statistiques des locataires avec analyse IA
  const tenantStats = {
    total: tenants.length,
    active: tenants.filter(t => t.active).length,
    endingSoon: tenants.filter(t => {
      if (!t.active) return false;
      const endDate = new Date(t.leaseEnd);
      const monthFromNow = addDays(new Date(), 30);
      return endDate <= monthFromNow;
    }).length,
    retentionScore: aiPredictions.tenantRetentionScore,
    satisfactionScore: aiPredictions.tenantSatisfactionScore,
  };

  // Statistiques de maintenance améliorées avec IA
  const maintenanceStats = {
    total: maintenanceRequests.length,
    urgent: maintenanceRequests.filter(r => 
      r.priority === "high" && r.status !== "completed"
    ).length,
    predictiveMaintenance: aiPredictions.upcomingMaintenanceCount,
    efficiency: aiPredictions.maintenanceEfficiencyScore,
  };

  // Configuration des widgets à afficher avec designs futuristes
  const stats = [
    {
      title: "Performance Prédictive",
      value: financialStats.monthlyRevenue,
      description: aiPredictions.revenueGrowthPrediction,
      icon: Brain,
      trend: aiPredictions.predictedGrowthPercentage > 0 ? "up" : "down",
      trendValue: Math.abs(aiPredictions.predictedGrowthPercentage),
      color: "cyan" as const,
      iconClassName: "text-cyan-500 dark:text-cyan-400",
      aiPowered: true,
      id: "performance",
    },
    {
      title: "Taux d'Occupation",
      value: propertyStats.total > 0 
        ? Math.round((propertyStats.rented / propertyStats.total) * 100) 
        : 0,
      description: `${propertyStats.rented}/${propertyStats.total} biens loués`,
      icon: BarChart3,
      suffix: "%",
      color: "teal" as const,
      iconClassName: "text-teal-500 dark:text-teal-400",
      progress: true,
      id: "occupation",
    },
    {
      title: "Maintenance Prédictive",
      value: maintenanceStats.predictiveMaintenance,
      description: `${maintenanceStats.efficiency}% d'efficacité`,
      icon: Wrench,
      alert: maintenanceStats.urgent > 0,
      color: "emerald" as const,
      iconClassName: "text-emerald-500 dark:text-emerald-400",
      aiPowered: true,
      id: "maintenance",
    },
    {
      title: "Satisfaction Locataires",
      value: tenantStats.satisfactionScore,
      description: `Score de rétention: ${tenantStats.retentionScore}%`,
      icon: Users,
      suffix: "%",
      color: "cyan" as const,
      iconClassName: "text-cyan-500 dark:text-cyan-400",
      progress: true,
      aiPowered: true,
      id: "satisfaction",
    },
  ];

  return (
    <motion.div 
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
    >
      <AnimatePresence>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1,
              type: "spring",
              stiffness: 260,
              damping: 20 
            }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <Card className={cn(
              "relative overflow-hidden group transition-all duration-300",
              "border-cyan-500/20 dark:border-cyan-400/20",
              "hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-400/5",
              "backdrop-blur-xl bg-white/10 dark:bg-black/10"
            )}>
              {/* Effet de lueur dynamique */}
              <GlowEffect active color={stat.color} />
              
              {/* Ligne de connexion de données simulée */}
              <DataConnectionLine delay={index * 0.5} />
              
              {/* Élément de design futuriste: coin décoratif */}
              <div className="absolute top-0 right-0 w-5 h-5 overflow-hidden">
                <div className={cn(
                  "absolute transform rotate-45 translate-x-[50%] translate-y-[-50%] w-5 h-5",
                  stat.aiPowered ? "bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500" : ""
                )} />
              </div>
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground/90">
                  {stat.title}
                  {stat.aiPowered && (
                    <motion.span 
                      className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.9, 1.05, 0.9] }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatType: "loop"
                      }}
                    >
                      IA
                    </motion.span>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {stat.alert && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                  <motion.div
                    whileHover={{ rotate: 15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <stat.icon className={cn("h-4 w-4", stat.iconClassName)} />
                  </motion.div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <motion.div 
                      className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                    >
                      {typeof stat.value === 'number' 
                        ? stat.value.toLocaleString()
                        : stat.value}
                      {stat.suffix}
                    </motion.div>
                    {stat.trend && (
                      <div className={cn(
                        "flex items-center text-xs px-2 py-1 rounded-full",
                        stat.trend === "up" 
                          ? "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10" 
                          : "text-red-500 dark:text-red-400 bg-red-500/10"
                      )}>
                        {stat.trend === "up" ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {stat.trendValue}%
                      </div>
                    )}
                  </div>
                  
                  {stat.progress && (
                    <div className="relative pt-1">
                      <motion.div 
                        className="overflow-hidden h-2 rounded-full bg-cyan-100/30 dark:bg-cyan-900/30"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                      >
                        <motion.div 
                          className={cn(
                            "h-full rounded-full",
                            stat.value > 70 
                              ? "bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400" 
                              : stat.value > 40 
                                ? "bg-gradient-to-r from-yellow-500 to-emerald-500 dark:from-yellow-400 dark:to-emerald-400"
                                : "bg-gradient-to-r from-red-500 to-yellow-500 dark:from-red-400 dark:to-yellow-400"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${stat.value}%` }}
                          transition={{ 
                            delay: 0.5,
                            duration: 0.8,
                            type: "spring"
                          }}
                        />
                      </motion.div>
                    </div>
                  )}
                  
                  <motion.p 
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                  >
                    {stat.description}
                  </motion.p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}