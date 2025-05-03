import { motion } from "framer-motion";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  CreditCard,
  Clock,
  Info,
  Calendar,
  PieChart,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { 
  useTransactions, 
  formatEuro,
  filterTransactionsByDate,
  TransactionData
} from "@/hooks/useTransactions";
import { 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip
} from 'recharts';

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'];

// Widget Crédits en attente avec style bleu
export function PendingCreditsWidgetBlue() {
  const { data: transactions, isLoading, error } = useTransactions();
  const [activeTab, setActiveTab] = useState<'credit' | 'income' | 'expense'>('credit');
  const [periodFilter, setPeriodFilter] = useState<'thisMonth' | 'thisQuarter' | 'thisYear' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fonction utilitaire pour filtrer par période
  const filterTransactionsByPeriod = (transactions: TransactionData[], period: 'thisMonth' | 'thisQuarter' | 'thisYear' | 'all') => {
    if (period === 'thisQuarter') {
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
    } else if (period === 'thisMonth' || period === 'thisYear') {
      return filterTransactionsByDate(transactions, period);
    } else {
      return transactions; // 'all'
    }
  };
  
  // Fonction pour obtenir le libellé de la période
  const getPeriodLabel = () => {
    switch(periodFilter) {
      case 'thisMonth': 
        return `${new Date().toLocaleString('fr-FR', { month: 'long' })}`;
      case 'thisQuarter': 
        const quarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `T${quarter} ${new Date().getFullYear()}`;
      case 'thisYear': 
        return `${new Date().getFullYear()}`;
      case 'all': 
        return 'Toutes périodes';
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
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Transactions en attente
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

  if (error) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Transactions en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-red-500">
            <div>Erreur de chargement des données</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Transactions en attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-blue-600/80 dark:text-blue-400/70">
            <p>Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrer par période
  const filteredByPeriod = filterTransactionsByPeriod(transactions, periodFilter);
  
  // Filtrer par type et status "pending"
  const pendingCredits = filteredByPeriod.filter(transaction => 
    transaction.type === 'credit' && 
    transaction.status === 'pending'
  );
  
  const pendingIncomes = filteredByPeriod.filter(transaction => 
    transaction.type === 'income' && 
    transaction.status === 'pending'
  );
  
  const pendingExpenses = filteredByPeriod.filter(transaction => 
    transaction.type === 'expense' && 
    transaction.status === 'pending'
  );
  
  // Sélectionner les données en fonction de l'onglet actif
  const getActiveData = () => {
    switch(activeTab) {
      case 'credit': return { 
        transactions: pendingCredits,
        title: 'Crédits en attente',
        icon: <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        badgeColor: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        cardGradient: 'from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/10',
        label: 'crédit',
        emptyMessage: 'Aucun crédit en attente',
        emptySubMessage: 'Les nouveaux crédits apparaîtront ici'
      };
      case 'income': return { 
        transactions: pendingIncomes,
        title: 'Revenus en attente',
        icon: <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        badgeColor: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        cardGradient: 'from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/10',
        label: 'revenu',
        emptyMessage: 'Aucun revenu en attente',
        emptySubMessage: 'Les nouveaux revenus apparaîtront ici'
      };
      case 'expense': return { 
        transactions: pendingExpenses,
        title: 'Dépenses en attente',
        icon: <ArrowDownRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        badgeColor: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        cardGradient: 'from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/10',
        label: 'dépense',
        emptyMessage: 'Aucune dépense en attente',
        emptySubMessage: 'Les nouvelles dépenses apparaîtront ici'
      };
    }
  };
  
  const activeData = getActiveData();
  
  // Calculer le montant total des transactions en attente
  const totalAmount = activeData.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Traduire les noms de catégories si nécessaire
  const translateCategory = (category: string) => {
    const categoryTranslations: Record<string, string> = {
      // Revenus
      'rent': 'Loyer',
      'short_term_rental': 'Location courte durée',
      'security_deposit': 'Dépôt de garantie',
      'application_fees': 'Frais de dossier',
      'service_fees': 'Frais de service',
      'late_fees': 'Pénalités de retard',
      'parking_income': 'Revenus parking',
      'common_area_income': 'Espaces communs',
      'rental_equipment': 'Location équipements',
      'additional_services': 'Services additionnels',
      'advertising_income': 'Publicité',
      'dividend_income': 'Dividendes',
      'interest_income': 'Intérêts',
      'property_sale': 'Vente immobilière',
      'insurance_claims': 'Indemnités assurance',
      'subsidies': 'Subventions',
      'refund': 'Remboursements',
      'commission': 'Commissions',
      
      // Dépenses
      'maintenance': 'Maintenance',
      'renovation': 'Rénovation',
      'cleaning': 'Nettoyage',
      'landscaping': 'Espaces verts',
      'insurance': 'Assurance',
      'tax': 'Impôts',
      'utility': 'Charges générales',
      'utilities_water': 'Eau',
      'utilities_electricity': 'Électricité',
      'utilities_gas': 'Gaz',
      'utilities_internet': 'Internet',
      'condominium_fee': 'Charges copropriété',
      'management_fee': 'Frais de gestion',
      'legal_fee': 'Frais juridiques',
      'accounting': 'Comptabilité',
      'consulting': 'Conseil',
      'inspection': 'Inspection',
      'furnishing': 'Ameublement',
      'equipment': 'Équipement',
      'marketing': 'Marketing',
      'travel': 'Déplacement',
      'security': 'Sécurité',
      
      // Crédits
      'mortgage': 'Emprunt',
      'investment': 'Investissement',
      'crypto': 'Crypto',
      
      // Par défaut
      'other': 'Divers',
      'uncategorized': 'Non catégorisé',
    };
    
    return categoryTranslations[category] || category;
  };
  
  // Générer les données pour le camembert (regrouper par catégorie)
  const getPieChartData = () => {
    const categoryCounts: Record<string, number> = {};
    const categoryAmounts: Record<string, number> = {};
    
    activeData.transactions.forEach(transaction => {
      const category = transaction.category || 'Non catégorisé';
      
      // Compter les transactions par catégorie
      if (!categoryCounts[category]) {
        categoryCounts[category] = 0;
        categoryAmounts[category] = 0;
      }
      
      categoryCounts[category]++;
      categoryAmounts[category] += transaction.amount;
    });
    
    // Convertir en format pour le graphique
    return Object.entries(categoryAmounts).map(([category, amount]) => ({
      name: translateCategory(category),
      value: amount,
      count: categoryCounts[category],
      original: category
    })).sort((a, b) => b.value - a.value);
  };
  
  const pieChartData = getPieChartData();

  // Pagination des transactions
  const paginateTransactions = (transactions: TransactionData[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil((activeData?.transactions?.length || 0) / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (activeData.transactions.length === 0) {
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
                    {activeData.icon}
                  </div>
                  {activeData.title}
                </CardTitle>
                <CardDescription className="text-blue-600/80 dark:text-blue-400/70">
                  Période: {getPeriodLabel()}
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-40">
                  <Select
                    value={periodFilter}
                    onValueChange={(value) => setPeriodFilter(value as any)}
                  >
                    <SelectTrigger className="h-8 border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent className="border-blue-200 dark:border-blue-800">
                      <SelectItem value="thisMonth">Ce mois</SelectItem>
                      <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
                      <SelectItem value="thisYear">Cette année</SelectItem>
                      <SelectItem value="all">Toutes périodes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <Tabs defaultValue="credit" value={activeTab} className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3 bg-blue-50/50 dark:bg-blue-950/10">
                  <TabsTrigger 
                    value="credit" 
                    className={`flex items-center gap-1 ${activeTab === 'credit' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>Crédits</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="income"
                    className={`flex items-center gap-1 ${activeTab === 'income' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Revenus</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="expense"
                    className={`flex items-center gap-1 ${activeTab === 'expense' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                  >
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    <span>Dépenses</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-40 p-6">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mb-3">
                <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-blue-700 dark:text-blue-400 text-center font-medium">
                {activeData.emptyMessage}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 text-center mt-1">
                {activeData.emptySubMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                  {activeData.icon}
                </div>
                {activeData.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-blue-600/80 dark:text-blue-400/70">
                <span>{activeData.transactions.length} {activeData.label}{activeData.transactions.length > 1 ? 's' : ''} en attente</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{formatEuro(totalAmount)}</span>
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-40">
                <Select
                  value={periodFilter}
                  onValueChange={(value) => setPeriodFilter(value as any)}
                >
                  <SelectTrigger className="h-8 border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent className="border-blue-200 dark:border-blue-800">
                    <SelectItem value="thisMonth">Ce mois</SelectItem>
                    <SelectItem value="thisQuarter">Ce trimestre</SelectItem>
                    <SelectItem value="thisYear">Cette année</SelectItem>
                    <SelectItem value="all">Toutes périodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="mt-2">
            <Tabs defaultValue="credit" value={activeTab} className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3 bg-blue-50/50 dark:bg-blue-950/10">
                <TabsTrigger 
                  value="credit" 
                  className={`flex items-center gap-1 ${activeTab === 'credit' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Crédits</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="income"
                  className={`flex items-center gap-1 ${activeTab === 'income' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Revenus</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="expense"
                  className={`flex items-center gap-1 ${activeTab === 'expense' ? 'bg-blue-600 text-white data-[state=active]:bg-blue-600' : 'text-blue-700 dark:text-blue-400 data-[state=active]:text-blue-900'}`}
                >
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  <span>Dépenses</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Vue synthétique des transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Graphique */}
            <div className="h-[250px]">
              {pieChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-blue-600/80 dark:text-blue-400/70">
                  <p>Aucune donnée disponible</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        formatEuro(value),
                        'Montant'
                      ]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Liste synthétique */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {pieChartData.map((category, index) => (
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
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="font-medium text-blue-700 dark:text-blue-400">
                        {category.name}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                      {category.count} {category.count > 1 ? 'transactions' : 'transaction'}
                    </Badge>
                  </div>
                  <div className="ml-5">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {formatEuro(category.value)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Résumé en bas */}
          <div className="mt-4 pt-3 border-t border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600/70 dark:text-blue-400/70">
                Total {activeData.label}s en attente
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-blue-200 text-blue-600">
                  {activeData.transactions.length} transaction{activeData.transactions.length > 1 ? 's' : ''}
                </Badge>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatEuro(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 
 
 