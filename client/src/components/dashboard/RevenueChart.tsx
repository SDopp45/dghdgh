import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { format, parseISO, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowUp, ArrowDown, TrendingUp, DollarSign, LineChart as LineChartIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface RevenueChartProps {
  widget: any;
}

// Type personnalisé pour le BadgeDelta
interface BadgeDeltaProps {
  children: React.ReactNode;
  deltaType: 'increase' | 'decrease' | 'unchanged';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

// Composant BadgeDelta personnalisé (pour remplacer celui de Tremor)
const BadgeDelta = ({ children, deltaType, size = 'sm' }: BadgeDeltaProps) => {
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-sm px-2 py-1',
    md: 'text-md px-2.5 py-1.5',
    lg: 'text-lg px-3 py-2'
  };
  
  const colorClasses = {
    increase: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-500/20',
    decrease: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-500/20',
    unchanged: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-500/20'
  };
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      sizeClasses[size],
      colorClasses[deltaType]
    )}>
      {deltaType === 'increase' && <ArrowUp className="mr-1 h-3 w-3" />}
      {deltaType === 'decrease' && <ArrowDown className="mr-1 h-3 w-3" />}
      {children}
    </span>
  );
};

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
  const { theme } = useTheme();
  
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "p-3 rounded-lg shadow-lg border border-cyan-500/20",
        theme === "dark" 
          ? "bg-gray-900/90 backdrop-blur-sm" 
          : "bg-white/90 backdrop-blur-sm"
      )}>
        <p className="text-xs font-semibold mb-2 text-cyan-500">
          {format(parseISO(label), 'PPP', { locale: fr })}
        </p>
        <div className="flex flex-col gap-1">
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ background: entry.color }}
              />
              <p className="text-xs font-medium">
                {entry.name === "revenue" ? "Revenus" : 
                 entry.name === "expenses" ? "Dépenses" : "Bénéfice"}
                : <span className="font-bold">
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(entry.value)}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

// Composant principal du graphique de revenus
export function RevenueChart({ widget }: RevenueChartProps) {
  const { theme } = useTheme();
  const [hoveredDataPoint, setHoveredDataPoint] = useState<DataPoint | null>(null);
  const [timeFrame, setTimeFrame] = useState<string>("6M");
  const [metrics, setMetrics] = useState<'all' | 'revenue' | 'expenses' | 'profit'>('all');
  
  // Simuler la récupération des données de l'API
  const { data: apiData = [], isLoading } = useQuery<DataPoint[]>({
    queryKey: ["/api/finance/revenue"],
    queryFn: async () => {
      // Simuler un délai API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Générer des données de test
      const today = new Date();
      const data: DataPoint[] = [];
      
      // Générer 12 mois de données
      for (let i = 12; i >= 0; i--) {
        const date = subMonths(today, i);
        const baseRevenue = 15000 + Math.random() * 10000;
        const baseExpenses = 8000 + Math.random() * 5000;
        
        // Ajouter une saisonnalité
        const seasonalFactor = 1 + Math.sin(date.getMonth() * Math.PI / 6) * 0.2;
        
        // Ajouter une tendance croissante
        const trendFactor = 1 + (12 - i) * 0.01;
        
        const revenue = Math.round(baseRevenue * seasonalFactor * trendFactor);
        const expenses = Math.round(baseExpenses * seasonalFactor * (trendFactor * 0.8));
        const profit = revenue - expenses;
        
        data.push({
          date: date.toISOString(),
          revenue,
          expenses,
          profit
        });
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filtrer les données selon le timeFrame sélectionné
  const filteredData = useMemo(() => {
    if (!apiData) return [];
    
    const monthsMap: Record<string, number> = {
      "3M": 3,
      "6M": 6,
      "YTD": new Date().getMonth() + 1,
      "1Y": 12,
      "ALL": apiData.length
    };
    
    const months = monthsMap[timeFrame] || 6;
    return apiData.slice(-months);
  }, [apiData, timeFrame]);

  // Calculer les métriques globales
  const totals = useMemo(() => {
    if (filteredData.length === 0) return { revenue: 0, expenses: 0, profit: 0, change: 0 };
    
    const currentPeriod = {
      revenue: filteredData.reduce((sum, d) => sum + d.revenue, 0),
      expenses: filteredData.reduce((sum, d) => sum + d.expenses, 0)
    };
    
    const profit = currentPeriod.revenue - currentPeriod.expenses;
    
    // Calculer le changement en pourcentage par rapport à la période précédente
    const midPoint = Math.floor(filteredData.length / 2);
    const recentHalf = filteredData.slice(midPoint);
    const olderHalf = filteredData.slice(0, midPoint);
    
    const recentProfit = recentHalf.reduce((sum, d) => sum + d.profit, 0);
    const olderProfit = olderHalf.reduce((sum, d) => sum + d.profit, 0);
    
    let change = 0;
    if (olderProfit !== 0) {
      change = ((recentProfit - olderProfit) / Math.abs(olderProfit)) * 100;
    }
    
    return { 
      revenue: currentPeriod.revenue, 
      expenses: currentPeriod.expenses, 
      profit,
      change: Math.round(change)
    };
  }, [filteredData]);
  
  // Effet de focus lors du survol d'un point de données
  const handleMouseMove = (data: any) => {
    if (data && data.activePayload && data.activePayload.length) {
      const payload = data.activePayload[0].payload;
      setHoveredDataPoint(payload);
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredDataPoint(null);
  };

  // État de chargement
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border border-cyan-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-background animate-pulse" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Chargement...</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </CardContent>
      </Card>
    );
  }
  
  // Style conditionnel pour les couleurs selon le thème
  const chartColors = {
    revenue: theme === "dark" ? "#38BDF8" : "#0EA5E9", // cyan 
    expenses: theme === "dark" ? "#FB7185" : "#F43F5E", // rose
    profit: theme === "dark" ? "#4ADE80" : "#22C55E",  // green
    grid: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    text: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)"
  };

  // Déterminer la performance actuelle
  const performanceStatus: 'increase' | 'decrease' | 'unchanged' = 
    totals.change > 0 ? "increase" : totals.change < 0 ? "decrease" : "unchanged";

  return (
    <motion.div 
      className="h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full relative overflow-hidden border border-cyan-500/20 bg-white/5 dark:bg-gray-900/5 backdrop-blur-sm">
        {/* Effets décoratifs futuristes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 dark:bg-cyan-400/5 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-400/5 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>

        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-cyan-500" />
              <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                Performance Financière
              </span>
              <motion.div 
                className="ml-2"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <BadgeDelta 
                  deltaType={performanceStatus}
                  size="xs"
                >
                  {totals.change > 0 ? '+' : ''}{totals.change}%
                </BadgeDelta>
              </motion.div>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Performance comparative {timeFrame === "1Y" ? "annuelle" : 
                                      timeFrame === "6M" ? "semestrielle" : 
                                      timeFrame === "3M" ? "trimestrielle" : 
                                      timeFrame === "YTD" ? "année en cours" : 
                                      "complète"}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Select 
              value={timeFrame} 
              onValueChange={(value: string) => setTimeFrame(value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3M">3 mois</SelectItem>
                <SelectItem value="6M">6 mois</SelectItem>
                <SelectItem value="YTD">YTD</SelectItem>
                <SelectItem value="1Y">1 an</SelectItem>
                <SelectItem value="ALL">Tout</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={metrics} 
              onValueChange={(value: string) => setMetrics(value as 'all' | 'revenue' | 'expenses' | 'profit')}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Métriques" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="revenue">Revenus</SelectItem>
                <SelectItem value="expenses">Dépenses</SelectItem>
                <SelectItem value="profit">Profits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="px-2">
          {/* Métriques totales */}
          <div className="grid grid-cols-3 gap-4 mb-4 mt-2 px-2">
            <motion.div 
              className="bg-gradient-to-br from-cyan-500/10 to-transparent p-3 rounded-lg border border-cyan-500/20 dark:from-slate-700/30 dark:to-slate-900/10 dark:border-slate-800/40"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-cyan-500 dark:text-slate-400" />
                <p className="text-xs font-medium text-muted-foreground">Revenus</p>
              </div>
              <p className="text-lg font-bold bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent dark:from-slate-400 dark:to-slate-300">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  maximumFractionDigits: 0 
                }).format(totals.revenue)}
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-rose-500/10 to-transparent p-3 rounded-lg border border-rose-500/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <ArrowDown className="h-4 w-4 text-rose-500" />
                <p className="text-xs font-medium text-muted-foreground">Dépenses</p>
              </div>
              <p className="text-lg font-bold bg-gradient-to-r from-rose-500 to-red-500 bg-clip-text text-transparent">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  maximumFractionDigits: 0 
                }).format(totals.expenses)}
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-green-500/10 to-transparent p-3 rounded-lg border border-green-500/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="text-xs font-medium text-muted-foreground">Bénéfice</p>
              </div>
              <p className="text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  maximumFractionDigits: 0 
                }).format(totals.profit)}
              </p>
            </motion.div>
          </div>

          {/* Graphique principal */}
          <div className="relative h-[210px] mt-4 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredData}
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.revenue} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColors.revenue} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.expenses} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColors.expenses} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.profit} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColors.profit} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke={chartColors.grid} 
                />
                
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(parseISO(date), 'MMM', { locale: fr })}
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  axisLine={{ stroke: chartColors.grid }}
                  tickLine={{ stroke: chartColors.grid }}
                />
                
                <YAxis 
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  axisLine={{ stroke: chartColors.grid }}
                  tickLine={{ stroke: chartColors.grid }}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                {(metrics === 'all' || metrics === 'revenue') && (
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={chartColors.revenue} 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)" 
                    activeDot={{ r: 6, stroke: chartColors.revenue, strokeWidth: 2, fill: "white" }}
                  />
                )}
                
                {(metrics === 'all' || metrics === 'expenses') && (
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke={chartColors.expenses} 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpenses)" 
                    activeDot={{ r: 6, stroke: chartColors.expenses, strokeWidth: 2, fill: "white" }}
                  />
                )}
                
                {(metrics === 'all' || metrics === 'profit') && (
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke={chartColors.profit} 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: chartColors.profit, strokeWidth: 2, fill: "white" }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ligne de connexion futuriste (effet décoratif) */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1
              }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 