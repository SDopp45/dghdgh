import { motion } from "framer-motion";
import { 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTransactions, filterTransactionsByDate, groupByCategory } from "@/hooks/useTransactions";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip
} from 'recharts';
import { Badge } from "@/components/ui/badge";

const COLORS_INCOMES = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
const COLORS_EXPENSES = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

export function CategoryDistributionWidgetBlue() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [period, setPeriod] = useState<'thisMonth' | 'thisQuarter' | 'thisYear' | 'all'>('thisYear');
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');

  // Filtrer les transactions par période
  const filterTransactionsByPeriod = (transactions: any[], period: 'thisMonth' | 'thisQuarter' | 'thisYear' | 'all') => {
    if (period === 'thisMonth') {
      return filterTransactionsByDate(transactions, 'thisMonth');
    } else if (period === 'thisQuarter') {
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStartMonth = currentQuarter * 3;
      const quarterEndMonth = quarterStartMonth + 2;
      
      return transactions.filter(t => {
        const txDate = new Date(t.date);
        const txMonth = txDate.getMonth();
        return txDate.getFullYear() === now.getFullYear() && 
               txMonth >= quarterStartMonth && 
               txMonth <= quarterEndMonth;
      });
    } else if (period === 'thisYear') {
      return filterTransactionsByDate(transactions, 'thisYear');
    } else {
      return transactions; // 'all'
    }
  };

  // Obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch (period) {
      case 'thisMonth':
        return 'ce mois';
      case 'thisQuarter':
        return 'ce trimestre';
      case 'thisYear':
        return 'cette année';
      case 'all':
        return 'toutes les périodes';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Répartition par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !transactions) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Répartition par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-blue-600/80 dark:text-blue-400/70">
            <p>Erreur lors du chargement des données</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrer par période
  const filteredTransactions = filterTransactionsByPeriod(transactions, period);
  
  // Obtenir les données pour le type sélectionné
  const getActiveData = () => {
    const filteredByType = filteredTransactions.filter(t => 
      t.type === selectedType && t.status === 'completed' && t.category
    );
    
    // Grouper par catégorie
    const groupedData = groupByCategory(filteredByType, selectedType, 'all');
    
    // Convertir en format pour le graphique
    return Object.entries(groupedData).map(([category, amount]) => ({
      name: translateCategory(category),
      value: amount,
      original: category
    })).sort((a, b) => b.value - a.value);
  };

  // Obtenir les données pour l'affichage
  const categoryData = getActiveData();
  
  // Traduction des catégories
  const translateCategory = (category: string) => {
    const translations: Record<string, string> = {
      rent: 'Loyer',
      utilities: 'Charges',
      food: 'Alimentation',
      transport: 'Transport',
      health: 'Santé',
      leisure: 'Loisirs',
      shopping: 'Shopping',
      travel: 'Voyages',
      gift: 'Cadeaux',
      other: 'Autres',
      salary: 'Salaire',
      investment: 'Investissement',
      refund: 'Remboursement',
      sale: 'Vente',
      bonus: 'Bonus',
      tax: 'Impôts',
      insurance: 'Assurance',
      maintenance: 'Entretien',
      mortgage: 'Emprunt',
      subscription: 'Abonnements',
      education: 'Éducation'
    };
    
    return translations[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Répartition par Catégorie
              </CardTitle>
              <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                Analyse des {selectedType === 'income' ? 'revenus' : 'dépenses'} {getPeriodLabel()}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={period}
                onValueChange={(value: any) => setPeriod(value)}
              >
                <SelectTrigger className="h-8 w-32 border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent className="border-blue-200 dark:border-blue-800">
                  <SelectItem value="thisMonth">Ce mois</SelectItem>
                  <SelectItem value="thisQuarter">Trimestre</SelectItem>
                  <SelectItem value="thisYear">Cette année</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Tabs 
            defaultValue="expense" 
            value={selectedType}
            onValueChange={(value: any) => setSelectedType(value)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-6 bg-blue-50/50 dark:bg-blue-950/10">
              <TabsTrigger 
                value="expense" 
                className={`flex items-center gap-1 ${selectedType === 'expense' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
              >
                <ArrowDownRight className="h-4 w-4" />
                <span>Dépenses</span>
              </TabsTrigger>
              <TabsTrigger 
                value="income" 
                className={`flex items-center gap-1 ${selectedType === 'income' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Revenus</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Vue synthétique des catégories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Graphique */}
              <div className="h-[250px]">
                {categoryData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-blue-600/80 dark:text-blue-400/70">
                    <p>Aucune donnée disponible pour cette période</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={selectedType === 'income' ? COLORS_INCOMES[index % COLORS_INCOMES.length] : COLORS_EXPENSES[index % COLORS_EXPENSES.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(value),
                          'Montant'
                        ]}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Liste synthétique des catégories - Exactement comme dans PendingCreditsWidgetBlue */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {categoryData.map((category, index) => (
                  <motion.div
                    key={category.original}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 border border-blue-100 dark:border-blue-900/50 rounded-lg bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/10"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: selectedType === 'income' ? COLORS_INCOMES[index % COLORS_INCOMES.length] : COLORS_EXPENSES[index % COLORS_EXPENSES.length] }} 
                        />
                        <span className="font-medium text-blue-700 dark:text-blue-400">
                          {category.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                        {((category.value / categoryData.reduce((sum, cat) => sum + cat.value, 0)) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="ml-5">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(category.value)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Résumé du total - Exactement comme dans PendingCreditsWidgetBlue */}
            <div className="mt-4 pt-3 border-t border-blue-100 dark:border-blue-900/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600/70 dark:text-blue-400/70">
                  Total des {selectedType === 'income' ? 'revenus' : 'dépenses'} {getPeriodLabel()}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-blue-200 text-blue-600">
                    {categoryData.length} catégorie{categoryData.length > 1 ? 's' : ''}
                  </Badge>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(categoryData.reduce((sum, category) => sum + category.value, 0))}
                  </span>
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
} 
 
 