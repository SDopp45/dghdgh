import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, FileDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import type { FormattedTransaction } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";

interface FinancialReportProps {
  transactions?: FormattedTransaction[];
}

const labels = {
  category: {
    rent: "Loyer",
    maintenance: "Maintenance",
    insurance: "Assurance",
    tax: "Taxe",
    utility: "Charges",
    other: "Autre"
  },
  paymentMethod: {
    cash: "Espèces",
    bank_transfer: "Virement bancaire",
    card: "Carte bancaire",
    other: "Autre",
    stripe: "Stripe",
    paypal: "PayPal",
    sepa: "SEPA"
  },
  status: {
    completed: "Complété",
    pending: "En attente",
    cancelled: "Annulé",
    failed: "Échoué",
    trash: "Dans la corbeille"
  }
};

interface CalendarHeaderProps {
  date: Date;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const CustomCalendarHeader = ({
  date,
  decreaseMonth,
  increaseMonth,
  onMonthChange,
  onYearChange,
}: CalendarHeaderProps) => {
  const [yearInput, setYearInput] = useState(date.getFullYear().toString());

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setYearInput(value);
    if (value.length === 4) {
      const year = parseInt(value);
      if (!isNaN(year) && year >= 1900 && year <= 2100) {
        onYearChange(year);
      }
    }
  };

  return (
    <div className="flex justify-between items-center px-2 py-1">
      <select
        className="bg-transparent text-sm outline-none cursor-pointer hover:text-primary"
        value={date.getMonth()}
        onChange={(e) => onMonthChange(parseInt(e.target.value))}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>
            {format(new Date(2024, i, 1), "MMMM", { locale: fr })}
          </option>
        ))}
      </select>
      <Input
        type="number"
        min="1900"
        max="2100"
        value={yearInput}
        onChange={handleYearChange}
        className="w-20 h-7 text-sm"
      />
    </div>
  );
};

const formatLargeNumber = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const formatTooltipValue = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const COLORS = [
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#eab308", // yellow-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
];

// Catégories de dépenses regroupées
const EXPENSE_CATEGORIES = {
  "Charges locatives": ["utility", "utilities_water", "utilities_electricity", "utilities_gas", "utilities_internet", "condominium_fee"],
  "Entretien & réparations": ["maintenance", "renovation", "cleaning", "landscaping", "equipment"],
  "Services professionnels": ["management_fee", "legal_fee", "accounting", "consulting", "inspection", "security"],
  "Assurances & taxes": ["insurance", "tax"],
  "Frais financiers": ["mortgage", "penalty_fees"],
  "Marketing & ventes": ["marketing", "commission", "travel"],
  "Autres dépenses": ["furnishing", "other"]
};

// Catégories de revenus regroupées
const INCOME_CATEGORIES = {
  "Loyers": ["rent", "short_term_rental"],
  "Frais & dépôts": ["security_deposit", "application_fees", "service_fees", "late_fees"],
  "Revenus locatifs": ["parking_income", "common_area_income", "rental_equipment"],
  "Services": ["additional_services", "advertising_income"],
  "Revenus financiers": ["dividend_income", "interest_income"],
  "Ventes & recouvrements": ["property_sale", "insurance_claims"],
  "Aides & subventions": ["subsidies"],
  "Remboursements": ["refund"],
  "Commissions": ["commission"],
  "Autres revenus": ["other"]
};

// Type de métrique pour le graphique
type MetricType = "income" | "expense" | "balance";

export function FinancialReport({ transactions = [] }: FinancialReportProps) {
  const { toast } = useToast();
  const [period, setPeriod] = useState("3");
  const [groupBy, setGroupBy] = useState("month");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(subMonths(new Date(), 3)),
    to: endOfMonth(new Date())
  });
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(dateRange.from);
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year">("month");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("income");

  const filteredTransactions = transactions?.filter((t: FormattedTransaction) => {
    // Filter by date
    if (!dateRange.from || !dateRange.to) return true;
    const transactionDate = new Date(t.date);
    const isInDateRange = isWithinInterval(transactionDate, {
      start: startOfMonth(dateRange.from),
      end: endOfMonth(dateRange.to)
    });

    // Only include completed transactions
    return isInDateRange && t.status === "completed";
  }) || [];

  const prepareMonthlyData = () => {
    const monthlyData: any = {};

    filteredTransactions.forEach((transaction: FormattedTransaction) => {
      const month = format(new Date(transaction.date), "MMM yyyy", { locale: fr });
      const amount = Number(transaction.amount);

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          revenus: 0,
          dépenses: 0,
          crédits: 0,
          balance: 0
        };
      }

      switch (transaction.type) {
        case "income":
          monthlyData[month].revenus += amount;
          monthlyData[month].balance += amount;
          break;
        case "expense":
          monthlyData[month].dépenses += amount;
          monthlyData[month].balance -= amount;
          break;
        case "credit":
          monthlyData[month].crédits += amount;
          break;
      }
    });

    return Object.values(monthlyData);
  };

  const prepareCategoryData = () => {
    const categoryData: any = {};

    filteredTransactions.forEach((transaction: FormattedTransaction) => {
      const categoryLabel = labels.category[transaction.category as keyof typeof labels.category] || transaction.category;
      const amount = Number(transaction.amount);

      if (!categoryData[categoryLabel]) {
        categoryData[categoryLabel] = {
          category: categoryLabel,
          revenus: 0,
          dépenses: 0,
          crédits: 0,
          balance: 0
        };
      }

      switch (transaction.type) {
        case "income":
          categoryData[categoryLabel].revenus += amount;
          categoryData[categoryLabel].balance += amount;
          break;
        case "expense":
          categoryData[categoryLabel].dépenses += amount;
          categoryData[categoryLabel].balance -= amount;
          break;
        case "credit":
          categoryData[categoryLabel].crédits += amount;
          break;
      }
    });

    return Object.values(categoryData);
  };

  const chartData = groupBy === "month" ? prepareMonthlyData() : prepareCategoryData();

  const generatePDFReport = async () => {
    try {
      const response = await fetch("/api/reports/finance/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactions: filteredTransactions,
          groupBy,
          period,
          labels,
          dateRange
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération du PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-financier-${format(dateRange.from || new Date(), "MM-yyyy")}-${format(dateRange.to || new Date(), "MM-yyyy")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Succès",
        description: "Le rapport PDF a été généré avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du PDF",
        variant: "destructive",
      });
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const today = new Date();
    const newFrom = startOfMonth(subMonths(today, Number(newPeriod)));
    const newTo = endOfMonth(today);

    setDateRange({
      from: newFrom,
      to: newTo
    });
    setCalendarMonth(newFrom);
  };

  // Calculer la date il y a 12 mois
  const oneYearAgo = subMonths(new Date(), 12);
  
  // Filtrer les transactions des 12 derniers mois
  const filteredTransactionsOneYear = useMemo(() => {
    return transactions.filter(transaction => {
      try {
        const date = parseISO(transaction.date);
        return isValid(date) && date >= oneYearAgo;
      } catch (error) {
        return false;
      }
    });
  }, [transactions, oneYearAgo]);

  // Formatter les transactions par mois
  const transactionsByMonth = useMemo(() => {
    const monthlyData: Record<string, { 
      income: number; 
      expense: number; 
      incomeByCategory: Record<string, number>;
      expenseByCategory: Record<string, number>;
      detailedIncomeByCategory: Record<string, number>;
      detailedExpenseByCategory: Record<string, number>;
    }> = {};

    // Initialiser les 12 derniers mois
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, "yyyy-MM");
      monthlyData[monthKey] = { 
        income: 0, 
        expense: 0, 
        incomeByCategory: {}, 
        expenseByCategory: {},
        detailedIncomeByCategory: {},
        detailedExpenseByCategory: {}
      };
      
      // Initialiser les catégories
      Object.keys(EXPENSE_CATEGORIES).forEach(category => {
        monthlyData[monthKey].expenseByCategory[category] = 0;
      });
      
      Object.keys(INCOME_CATEGORIES).forEach(category => {
        monthlyData[monthKey].incomeByCategory[category] = 0;
      });
    }
    
    // Remplir avec les données de transactions
    filteredTransactionsOneYear.forEach(transaction => {
      try {
        const date = parseISO(transaction.date);
        if (!isValid(date)) return;
        
        const monthKey = format(date, "yyyy-MM");
        const amount = Number(transaction.amount);
        
        if (!monthlyData[monthKey]) return;
        
        if (transaction.type === "income") {
          monthlyData[monthKey].income += amount;
          
          // Catégories détaillées
          monthlyData[monthKey].detailedIncomeByCategory[transaction.category] = 
            (monthlyData[monthKey].detailedIncomeByCategory[transaction.category] || 0) + amount;
          
          // Catégories regroupées
          let foundCategory = false;
          for (const [groupName, categories] of Object.entries(INCOME_CATEGORIES)) {
            if (categories.includes(transaction.category)) {
              monthlyData[monthKey].incomeByCategory[groupName] = 
                (monthlyData[monthKey].incomeByCategory[groupName] || 0) + amount;
              foundCategory = true;
          break;
            }
          }
          if (!foundCategory) {
            monthlyData[monthKey].incomeByCategory["Autres revenus"] = 
              (monthlyData[monthKey].incomeByCategory["Autres revenus"] || 0) + amount;
          }
        } else if (transaction.type === "expense") {
          monthlyData[monthKey].expense += amount;
          
          // Catégories détaillées
          monthlyData[monthKey].detailedExpenseByCategory[transaction.category] = 
            (monthlyData[monthKey].detailedExpenseByCategory[transaction.category] || 0) + amount;
          
          // Catégories regroupées
          let foundCategory = false;
          for (const [groupName, categories] of Object.entries(EXPENSE_CATEGORIES)) {
            if (categories.includes(transaction.category)) {
              monthlyData[monthKey].expenseByCategory[groupName] = 
                (monthlyData[monthKey].expenseByCategory[groupName] || 0) + amount;
              foundCategory = true;
          break;
      }
          }
          if (!foundCategory) {
            monthlyData[monthKey].expenseByCategory["Autres dépenses"] = 
              (monthlyData[monthKey].expenseByCategory["Autres dépenses"] || 0) + amount;
          }
        }
      } catch (error) {
        console.error("Error processing transaction for financial report:", error);
      }
    });

    return monthlyData;
  }, [filteredTransactionsOneYear]);

  // Préparer les données pour le graphique en barres
  const barChartData = useMemo(() => {
    // Trier les clés par ordre chronologique
    const sortedMonths = Object.keys(transactionsByMonth).sort();
    
    return sortedMonths.map(month => {
      const monthData = transactionsByMonth[month];
      const balance = monthData.income - monthData.expense;
      
      return {
        month: format(parseISO(`${month}-01`), "MMM yyyy", { locale: fr }),
        income: monthData.income,
        expense: monthData.expense,
        balance,
        ...monthData.incomeByCategory,
        ...monthData.expenseByCategory
      };
    });
  }, [transactionsByMonth]);
  
  // Préparer les données pour le graphique en lignes
  const lineChartData = useMemo(() => {
    // Trier les clés par ordre chronologique
    const sortedMonths = Object.keys(transactionsByMonth).sort();
    
    return [
      {
        id: "Revenus",
        color: "hsl(204, 100%, 59%)", // sky-500
        data: sortedMonths.map(month => ({
          x: format(parseISO(`${month}-01`), "MMM yyyy", { locale: fr }),
          y: transactionsByMonth[month].income
        }))
      },
      {
        id: "Dépenses",
        color: "hsl(349, 100%, 59%)", // rose-500
        data: sortedMonths.map(month => ({
          x: format(parseISO(`${month}-01`), "MMM yyyy", { locale: fr }),
          y: transactionsByMonth[month].expense
        }))
      },
      {
        id: "Balance",
        color: "hsl(236, 100%, 67%)", // indigo-600
        data: sortedMonths.map(month => ({
          x: format(parseISO(`${month}-01`), "MMM yyyy", { locale: fr }),
          y: transactionsByMonth[month].income - transactionsByMonth[month].expense
        }))
      }
    ];
  }, [transactionsByMonth]);
  
  // Préparer les données pour le graphique circulaire des catégories
  const pieChartData = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const monthData = transactionsByMonth[currentMonth];
    
    if (!monthData) return [];
    
    if (selectedMetric === "income") {
      // Catégories regroupées de revenus
      return Object.entries(monthData.incomeByCategory)
        .filter(([_, value]) => value > 0)
        .map(([category, value], index) => ({
          id: category,
          label: category,
          value,
          color: COLORS[index % COLORS.length]
        }));
    } else if (selectedMetric === "expense") {
      // Catégories regroupées de dépenses
      return Object.entries(monthData.expenseByCategory)
        .filter(([_, value]) => value > 0)
        .map(([category, value], index) => ({
          id: category,
          label: category,
          value,
          color: COLORS[index % COLORS.length]
        }));
    }
    
    return [];
  }, [transactionsByMonth, selectedMetric]);
  
  // Calculer les totaux pour le mois en cours
  const currentMonthStats = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const monthData = transactionsByMonth[currentMonth];
    
    if (!monthData) {
      return { income: 0, expense: 0, balance: 0 };
    }
    
    return {
      income: monthData.income,
      expense: monthData.expense,
      balance: monthData.income - monthData.expense
    };
  }, [transactionsByMonth]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Rapport Financier</CardTitle>
              <Button variant="outline" onClick={generatePDFReport}>
                <FileDown className="h-4 w-4 mr-2" />
                Exporter en PDF
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "P", { locale: fr })} -{" "}
                          {format(dateRange.to, "P", { locale: fr })}
                        </>
                      ) : (
                        format(dateRange.from, "P", { locale: fr })
                      )
                    ) : (
                      <span>Sélectionner une période</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex items-center justify-between p-2 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFrom = subMonths(dateRange.from || new Date(), 12);
                        const newTo = subMonths(dateRange.to || new Date(), 12);
                        setDateRange({ from: newFrom, to: newTo });
                        setCalendarMonth(newFrom);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      -1 an
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newFrom = startOfMonth(dateRange.from || new Date());
                        const newTo = dateRange.to || new Date();
                        setDateRange({ from: newFrom, to: newTo });
                        setCalendarMonth(newFrom);
                      }}
                    >
                      Début du mois
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const newFrom = startOfMonth(now);
                        setDateRange({ from: newFrom, to: now });
                        setCalendarMonth(newFrom);
                      }}
                    >
                      Aujourd'hui
                    </Button>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={calendarMonth}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange({
                          from: range.from || undefined,
                          to: range.to || undefined
                        });
                        if (range.from) {
                          setCalendarMonth(range.from);
                        }
                      }
                    }}
                    numberOfMonths={2}
                    locale={fr}
                    disabled={{
                      after: new Date(),
                    }}
                  />
                  <div className="p-2 border-t">
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          setDateRange(prev => ({ ...prev, from: date }));
                          if (date) {
                            setCalendarMonth(date);
                          }
                        }}
                        className="w-full"
                      />
                      <Input
                        type="date"
                        value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          setDateRange(prev => ({ ...prev, to: date }));
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2 flex-1">
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Période prédéfinie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 derniers mois</SelectItem>
                    <SelectItem value="6">6 derniers mois</SelectItem>
                    <SelectItem value="12">12 derniers mois</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grouper par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Par mois</SelectItem>
                    <SelectItem value="category">Par catégorie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total revenus: {formatTooltipValue(currentMonthStats.income)}</span>
              <span>Total dépenses: {formatTooltipValue(currentMonthStats.expense)}</span>
              <span>Balance: {formatTooltipValue(currentMonthStats.balance)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] mt-4">
            {filteredTransactions.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p>Aucune transaction trouvée pour la période sélectionnée.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={groupBy === "month" ? "month" : "category"}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={formatLargeNumber}
                    width={80}
                    scale="linear"
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    formatter={(value: number) => formatTooltipValue(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      padding: "10px",
                      borderRadius: "6px"
                    }}
                    itemStyle={{
                      padding: "4px 0"
                    }}
                    labelStyle={{
                      fontWeight: "bold",
                      marginBottom: "8px"
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "20px"
                    }}
                  />
                  <Bar
                    dataKey="revenus"
                    fill="#22c55e"
                    name="Revenus"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: 'top',
                      formatter: formatLargeNumber,
                      fontSize: 11
                    }}
                    minPointSize={20}
                  />
                  <Bar
                    dataKey="dépenses"
                    fill="#ef4444"
                    name="Dépenses"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: 'top',
                      formatter: formatLargeNumber,
                      fontSize: 11
                    }}
                    minPointSize={20}
                  />
                  <Bar
                    dataKey="crédits"
                    fill="#eab308"
                    name="Crédits"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: 'top',
                      formatter: formatLargeNumber,
                      fontSize: 11
                    }}
                    minPointSize={20}
                  />
                  <Bar
                    dataKey="balance"
                    fill="#3b82f6"
                    name="Balance"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: 'top',
                      formatter: formatLargeNumber,
                      fontSize: 11
                    }}
                    minPointSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
            <CardDescription>Montant total des revenus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {currentMonthStats.income.toLocaleString()}€
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dépenses du mois</CardTitle>
            <CardDescription>Montant total des dépenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {currentMonthStats.expense.toLocaleString()}€
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Balance du mois</CardTitle>
            <CardDescription>Différence revenus - dépenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentMonthStats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {currentMonthStats.balance.toLocaleString()}€
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ratio revenus/dépenses</CardTitle>
            <CardDescription>Pour le mois en cours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {currentMonthStats.expense > 0 
                ? (currentMonthStats.income / currentMonthStats.expense).toFixed(2) 
                : "∞"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden shadow-sm h-[400px]">
            <CardHeader>
              <CardTitle className="text-lg">Évolution mensuelle</CardTitle>
              <CardDescription>
                Comparaison des revenus et dépenses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] w-full">
                <ResponsiveBar
                  data={barChartData}
                  keys={[selectedMetric === "balance" ? "balance" : selectedMetric]}
                  indexBy="month"
                  margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: "linear" }}
                  indexScale={{ type: "band", round: true }}
                  colors={({ id, data }) => {
                    if (id === "income") return "#10b981";
                    if (id === "expense") return "#f43f5e";
                    if (id === "balance") {
                      return data.balance >= 0 ? "#3b82f6" : "#ef4444";
                    }
                    return "#93c5fd";
                  }}
                  borderColor={{
                    from: "color",
                    modifiers: [["darker", 1.6]],
                  }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: "Mois",
                    legendPosition: "middle",
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: "Montant (€)",
                    legendPosition: "middle",
                    legendOffset: -45,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{
                    from: "color",
                    modifiers: [["darker", 1.6]],
                  }}
                  animate={true}
                  theme={{
                    tooltip: {
                      container: {
                        background: "#ffffff",
                        color: "#333333",
                        fontSize: 12,
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                      },
                    },
                  }}
                  tooltip={({ id, value, color }) => (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, marginRight: 8 }} />
                      <span style={{ fontWeight: 600 }}>{id}: </span>
                      <span style={{ marginLeft: 4 }}>{value.toLocaleString()} €</span>
                    </div>
                  )}
                />
          </div>
        </CardContent>
      </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="overflow-hidden shadow-sm h-[400px]">
            <CardHeader>
              <CardTitle className="text-lg">
                Répartition par catégorie {selectedMetric === "income" ? "des revenus" : "des dépenses"}
              </CardTitle>
              <CardDescription>
                Mois en cours - {format(new Date(), "MMMM yyyy", { locale: fr })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] w-full">
                <ResponsivePie
                  data={pieChartData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  borderWidth={1}
                  borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: "color" }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
                  colors={{ datum: "data.color" }}
                  theme={{
                    tooltip: {
                      container: {
                        background: "#ffffff",
                        color: "#333333",
                        fontSize: 12,
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                      },
                    },
                  }}
                  tooltip={({ datum }) => (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: datum.color, marginRight: 8 }} />
                      <span style={{ fontWeight: 600 }}>{datum.label}: </span>
                      <span style={{ marginLeft: 4 }}>{datum.value.toLocaleString()} € ({(datum.value / (selectedMetric === "income" ? currentMonthStats.income : currentMonthStats.expense) * 100).toFixed(1)}%)</span>
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="overflow-hidden shadow-sm h-[450px]">
          <CardHeader>
            <CardTitle className="text-lg">Tendance annuelle</CardTitle>
            <CardDescription>
              Évolution sur les 12 derniers mois
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[350px] w-full">
              <ResponsiveLine
                data={lineChartData}
                margin={{ top: 30, right: 50, bottom: 50, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{
                  type: "linear",
                  min: "auto",
                  max: "auto",
                  stacked: false,
                  reverse: false,
                }}
                yFormat=" >-.2f"
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: "Mois",
                  legendOffset: 40,
                  legendPosition: "middle",
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Montant (€)",
                  legendOffset: -45,
                  legendPosition: "middle",
                }}
                colors={{ datum: "color" }}
                pointSize={10}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                pointLabelYOffset={-12}
                useMesh={true}
                gridYValues={5}
                legends={[
                  {
                    anchor: "top-right",
                    direction: "column",
                    justify: false,
                    translateX: 0,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: "left-to-right",
                    itemWidth: 80,
                    itemHeight: 20,
                    itemOpacity: 0.75,
                    symbolSize: 12,
                    symbolShape: "circle",
                    symbolBorderColor: "rgba(0, 0, 0, .5)",
                    effects: [
                      {
                        on: "hover",
                        style: {
                          itemBackground: "rgba(0, 0, 0, .03)",
                          itemOpacity: 1,
                        },
                      },
                    ],
                  },
                ]}
                theme={{
                  tooltip: {
                    container: {
                      background: "#ffffff",
                      color: "#333333",
                      fontSize: 12,
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                    },
                  },
                }}
                tooltip={({ point }) => (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: point.serieColor, marginRight: 8 }} />
                    <span style={{ fontWeight: 600 }}>{point.serieId}: </span>
                    <span style={{ marginLeft: 4 }}>{Number(point.data.y).toLocaleString()} €</span>
                  </div>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}