import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Transaction {
  id: number;
  date: string;
  amount: string;
  type: "income" | "expense" | "credit";
  status: string;
}

export function FinanceChart() {
  const [timeRange, setTimeRange] = useState("30");
  const [displayType, setDisplayType] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      return response.json();
    },
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/transactions?userId=${currentUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  if (!currentUser) return null;

  const activeTransactions = transactions?.filter(t => t.status === "completed") ?? [];

  const getStartDate = () => {
    const today = new Date();
    switch (timeRange) {
      case "7": return subDays(today, 7);
      case "14": return subDays(today, 14);
      case "30": return subDays(today, 30);
      case "90": return subDays(today, 90);
      case "180": return subDays(today, 180);
      case "365": return subDays(today, 365);
      default: return subDays(today, 30);
    }
  };

  const getDaysArray = () => {
    const startDate = getStartDate();
    const days = [];
    let currentDate = startDate;
    while (currentDate <= new Date()) {
      days.push(format(currentDate, "yyyy-MM-dd"));
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
    return days;
  };

  const chartData = getDaysArray().map(day => {
    const dayTransactions = activeTransactions?.filter(t => {
      const transactionDate = startOfDay(new Date(t.date));
      const currentDay = startOfDay(new Date(day));
      return format(transactionDate, "yyyy-MM-dd") === format(currentDay, "yyyy-MM-dd");
    }) || [];

    const income = dayTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = dayTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      date: format(new Date(day), "dd/MM", { locale: fr }),
      revenus: income,
      dépenses: expenses,
      balance: income - expenses,
    };
  });

  const totals = chartData.reduce((acc, day) => ({
    revenus: acc.revenus + day.revenus,
    dépenses: acc.dépenses + day.dépenses,
    balance: acc.balance + day.balance,
  }), { revenus: 0, dépenses: 0, balance: 0 });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-background/80 backdrop-blur-xl border border-border/30 p-4 rounded-lg shadow-2xl"
        >
          <p className="text-sm font-semibold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value.toLocaleString()}€
            </motion.p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-background/50 via-background/30 to-background/20 border border-border/30 shadow-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Aperçu Financier
              </CardTitle>
            </motion.div>
            <div className="flex space-x-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key="selects"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-xl border-border/30 hover:bg-background/70 transition-colors">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="14">14 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="90">3 mois</SelectItem>
                      <SelectItem value="180">6 mois</SelectItem>
                      <SelectItem value="365">1 an</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
                <motion.div
                  key="display-type"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                >
                  <Select value={displayType} onValueChange={setDisplayType}>
                    <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-xl border-border/30 hover:bg-background/70 transition-colors">
                      <SelectValue placeholder="Type d'affichage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tout afficher</SelectItem>
                      <SelectItem value="income">Revenus uniquement</SelectItem>
                      <SelectItem value="expenses">Dépenses uniquement</SelectItem>
                      <SelectItem value="balance">Balance uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-between text-sm"
          >
            <span className="text-emerald-500 font-medium">
              Revenus: {totals.revenus.toLocaleString()}€
            </span>
            <span className="text-rose-500 font-medium">
              Dépenses: {totals.dépenses.toLocaleString()}€
            </span>
            <span className={`font-medium ${totals.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              Balance: {totals.balance.toLocaleString()}€
            </span>
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="h-[400px] mt-4"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}€`}
                  dx={-10}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: "currentColor",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                    opacity: 0.3
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: "20px"
                  }}
                />
                {(displayType === "all" || displayType === "income") && (
                  <Area
                    type="monotone"
                    dataKey="revenus"
                    name="Revenus"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    animationDuration={1000}
                  />
                )}
                {(displayType === "all" || displayType === "expenses") && (
                  <Area
                    type="monotone"
                    dataKey="dépenses"
                    name="Dépenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                    animationDuration={1000}
                  />
                )}
                {(displayType === "all" || displayType === "balance") && (
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                    animationDuration={1000}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}