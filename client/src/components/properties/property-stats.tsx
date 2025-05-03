import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Coins, Home, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { Property } from "@shared/types";

interface PropertyStatsProps {
  properties: Property[];
}

export function PropertyStats({ properties }: PropertyStatsProps) {
  const totalValue = properties?.reduce(
    (sum, p) => sum + Number(p.purchasePrice),
    0
  );
  const averageRent = properties?.reduce(
    (sum, p) => sum + Number(p.monthlyRent),
    0
  ) / (properties?.length || 1);

  const rentedProperties = properties?.filter((p) => p.status === "rented").length;
  const occupancyRate = ((rentedProperties || 0) / (properties?.length || 1)) * 100;

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
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div 
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Widget 1: Valeur totale */}
      <motion.div variants={item} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="group relative">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100/40 dark:from-green-900/10 dark:to-emerald-800/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-green-600 dark:text-green-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-green-600/80 dark:text-green-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  Patrimoine
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalValue.toLocaleString()}€
                  </h3>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    2.5%
                  </span>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={75} 
                    className="h-2 bg-green-100 dark:bg-green-950/20" 
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600 dark:text-green-400">Valeur totale</span>
                    <span className="font-medium">{properties.length} biens</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Widget 2: Loyer moyen */}
      <motion.div variants={item} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="group relative">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-emerald-50 to-green-100/40 dark:from-emerald-900/10 dark:to-green-800/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-emerald-500 dark:text-emerald-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-emerald-500/80 dark:text-emerald-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  Mensuel
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">
                    {averageRent.toLocaleString()}€
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    Loyer moyen
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <div className="text-xs text-muted-foreground mb-1">
                    Répartition
                  </div>
                  <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-emerald-100 dark:bg-emerald-950/20">
                    <motion.div 
                      className="bg-emerald-500 dark:bg-emerald-600 transition-all" 
                      initial={{ width: 0 }}
                      animate={{ width: "70%" }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Widget 3: Taux d'occupation */}
      <motion.div variants={item} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="group relative">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-green-50/90 to-emerald-100/50 dark:from-green-800/10 dark:to-emerald-700/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-green-500 dark:text-green-300">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-green-500/80 dark:text-green-300/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  Occupation
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-green-500 dark:text-green-300">
                    {occupancyRate.toFixed(1)}%
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {rentedProperties} / {properties.length}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={occupancyRate} 
                    className="h-2 bg-green-100 dark:bg-green-950/20" 
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-green-500 dark:text-green-300">Taux d'occupation</span>
                    <span className="font-medium">{occupancyRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Widget 4: Propriétés */}
      <motion.div variants={item} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="group relative">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-emerald-50 to-green-100/30 dark:from-emerald-800/10 dark:to-green-700/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-emerald-600 dark:text-emerald-400">
                  <Home className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  Inventaire
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {properties.length}
                  </h3>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    +1 ce mois
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-emerald-100 dark:bg-emerald-950/20">
        <motion.div 
                      className="bg-emerald-600 dark:bg-emerald-500 transition-all" 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(properties.length * 5, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400">Total propriétés</span>
                    <span className="font-medium">{rentedProperties} louées</span>
                  </div>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </motion.div>
    </motion.div>
  );
}