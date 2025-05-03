import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, CircleSlash, Wrench, ChartBar, ArrowUpRight } from "lucide-react";

interface MaintenanceStats {
  urgentRequests: number;
  mediumRequests: number;
  lowRequests: number;
  openRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  totalRequests: number;
  openCost: number;
  completedCost: number;
  efficiency: number;
  avgResolutionTime: number;
}

const defaultStats: MaintenanceStats = {
  urgentRequests: 0,
  mediumRequests: 0,
  lowRequests: 0,
  openRequests: 0,
  inProgressRequests: 0,
  completedRequests: 0,
  totalRequests: 0,
  openCost: 0,
  completedCost: 0,
  efficiency: 0,
  avgResolutionTime: 0
};

export function MaintenanceStats({ stats = defaultStats }: { stats: MaintenanceStats }) {
  const statCards = [
    {
      title: "Priorités des demandes",
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500",
      gradient: "bg-gradient-to-br from-red-50 via-rose-50/80 to-red-100/50",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-red-500">
              {stats.urgentRequests + stats.mediumRequests + stats.lowRequests}
            </span>
            <div className="flex gap-2 text-sm font-medium">
              <span className="flex items-center gap-1 text-red-500">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                {stats.urgentRequests}
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                {stats.mediumRequests}
              </span>
              <span className="flex items-center gap-1 text-sky-500">
                <div className="w-3 h-3 rounded-full bg-sky-500" />
                {stats.lowRequests}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-red-100 dark:bg-red-950/20">
              <motion.div 
                className="bg-red-500 transition-all" 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.urgentRequests / Math.max(stats.urgentRequests + stats.mediumRequests + stats.lowRequests, 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
              <motion.div 
                className="bg-amber-500 transition-all" 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.mediumRequests / Math.max(stats.urgentRequests + stats.mediumRequests + stats.lowRequests, 1)) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
              <motion.div 
                className="bg-sky-500 transition-all" 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.lowRequests / Math.max(stats.urgentRequests + stats.mediumRequests + stats.lowRequests, 1)) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-red-600 dark:text-red-400">Haute</span>
              <span className="text-amber-600 dark:text-amber-400">Moyenne</span>
              <span className="text-sky-600 dark:text-sky-400">Basse</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "État des demandes",
      icon: Clock,
      color: "text-red-400",
      bgColor: "bg-red-400",
      gradient: "bg-gradient-to-tr from-red-100/70 via-red-50/60 to-rose-50/40",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-red-400">
              {stats.totalRequests}
            </span>
            <div className="flex gap-2 text-sm font-medium">
              <span className="flex items-center gap-1 text-yellow-500">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                {stats.openRequests}
              </span>
              <span className="flex items-center gap-1 text-blue-500">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                {stats.inProgressRequests}
              </span>
              <span className="flex items-center gap-1 text-green-500">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                {stats.completedRequests}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-red-100 dark:bg-red-950/20">
              <motion.div 
                className="bg-yellow-500 transition-all" 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.openRequests / Math.max(stats.totalRequests, 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
              <motion.div 
                className="bg-blue-500 transition-all" 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.inProgressRequests / Math.max(stats.totalRequests, 1)) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
              <motion.div 
                className="bg-green-500 transition-all" 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.completedRequests / Math.max(stats.totalRequests, 1)) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-yellow-600 dark:text-yellow-400">Ouvertes</span>
              <span className="text-blue-600 dark:text-blue-400">En cours</span>
              <span className="text-green-600 dark:text-green-400">Terminées</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Performance",
      icon: ChartBar,
      color: "text-red-600",
      bgColor: "bg-red-600",
      gradient: "bg-gradient-to-bl from-rose-100/80 via-red-50/50 to-red-100/30",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-red-600 dark:text-red-300">
                {stats.efficiency}%
              </span>
              <span className="flex items-center text-xs text-green-500 dark:text-green-400">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                5%
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.avgResolutionTime}j
            </span>
          </div>
          <div className="space-y-2">
            <Progress value={stats.efficiency} className="h-2" />
            <div className="flex justify-between text-xs font-medium">
              <span className="text-red-600 dark:text-red-400">Efficacité</span>
              <span className="text-muted-foreground">Temps moyen de résolution</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Coûts",
      icon: CircleSlash,
      color: "text-red-500",
      bgColor: "bg-red-500",
      gradient: "bg-gradient-to-tl from-red-50/90 via-red-100/50 to-rose-50/40",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-red-500">
              {stats.openCost.toLocaleString('fr-FR')} €
            </span>
            <span className="text-3xl font-bold text-emerald-500">
              {stats.completedCost.toLocaleString('fr-FR')} €
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-red-100 dark:bg-red-950/20">
              {stats.openCost > 0 && (
                <motion.div 
                  className="bg-orange-500 transition-all"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.openCost / Math.max(stats.openCost + stats.completedCost, 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              )}
              {stats.completedCost > 0 && (
                <motion.div 
                  className="bg-emerald-500 transition-all"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.completedCost / Math.max(stats.openCost + stats.completedCost, 1)) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-orange-600 dark:text-orange-400">En cours</span>
              <span className="text-emerald-600 dark:text-emerald-400">Terminés</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <motion.div 
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
    >
      {statCards.map((stat, index) => {
        // Progression du rouge selon les nuances exactes demandées
        let cardBgClass = "";
        if (index === 0) {
          // Premier widget - rouge 50
          cardBgClass = "bg-red-50 dark:bg-red-950/10";
        } else if (index === 1) {
          // Deuxième widget - rouge 100
          cardBgClass = "bg-red-100 dark:bg-red-900/20";
        } else if (index === 2) {
          // Troisième widget - rouge 150 (entre 100 et 200)
          cardBgClass = "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-950/30 dark:border-red-800/30";
        } else {
          // Quatrième widget - rouge 200
          cardBgClass = "bg-red-200 dark:bg-red-800/40";
        }
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group relative min-w-[200px] w-full hover:shadow-lg transition-all duration-300"
          >
            <Card className={`overflow-hidden shadow-sm border-none ${cardBgClass} w-full`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className="p-2 rounded-full bg-background/80 dark:bg-card shadow-sm">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {stat.content}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}