import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface FinancialFlowData {
  month: string;
  income: number;
  expenses: number;
  netFlow: number;
  trend: 'up' | 'down';
  categories: {
    name: string;
    amount: number;
    type: 'income' | 'expense';
  }[];
}

export function FinancialFlowWidget() {
  const { data: financialData, isLoading } = useQuery<FinancialFlowData[]>({
    queryKey: ['financial-flow'],
    queryFn: async () => {
      const response = await api.get('/api/finance/flow');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Flux Financier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMonth = financialData?.[0] || {
    month: 'Aucune donnée',
    income: 0,
    expenses: 0,
    netFlow: 0,
    trend: 'up',
    categories: []
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Flux Financier
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Résumé du mois */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-4"
          >
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Revenus</span>
              </div>
              <div className="text-2xl font-bold text-green-500">
                {currentMonth.income.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Dépenses</span>
              </div>
              <div className="text-2xl font-bold text-red-500">
                {currentMonth.expenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
            
            <div className={`rounded-lg p-4 ${
              currentMonth.netFlow >= 0 
                ? 'bg-green-50 dark:bg-green-900/20' 
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {currentMonth.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">Solde</span>
              </div>
              <div className={`text-2xl font-bold ${
                currentMonth.netFlow >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {currentMonth.netFlow.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
          </motion.div>

          {/* Détails par catégorie */}
          <div className="space-y-4">
            <h4 className="font-semibold">Détails par catégorie</h4>
            {currentMonth.categories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {category.type === 'income' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span>{category.name}</span>
                </div>
                <span className={`font-medium ${
                  category.type === 'income' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {category.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 