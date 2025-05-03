import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, Filter } from "lucide-react";
import { TransactionFilters } from "@/pages/finance";
import type { FormattedTransaction } from "@/types";

interface TransactionStatusTabsProps {
  transactions: FormattedTransaction[];
  activeTab: "pending" | "completed" | "cancelled";
  onTabChange: (tab: "pending" | "completed" | "cancelled") => void;
  filters?: TransactionFilters;
}

// Fonction pour appliquer les filtres (similaire à celle du composant parent)
function applyFilters(transactions: FormattedTransaction[], filters?: TransactionFilters): FormattedTransaction[] {
  if (!filters) return transactions;
  
  // Labels pour la recherche
  const categoryLabels: Record<string, string> = {
    "rent": "Loyer",
    "utilities": "Charges",
    "maintenance": "Maintenance",
    "taxes": "Taxes",
    "insurance": "Assurance",
    "management": "Gestion",
    "mortgage": "Crédit",
    "other_income": "Autres revenus",
    "other_expense": "Autres dépenses",
  };
  
  const paymentMethodLabels: Record<string, string> = {
    "cash": "Espèces",
    "card": "Carte bancaire",
    "transfer": "Virement",
    "check": "Chèque",
    "direct_debit": "Prélèvement",
    "other": "Autre",
  };
  
  return transactions.filter(transaction => {
    // Filtres avancés (hors statut qui est géré par les onglets)
    const typeMatch = filters.type === "all" || transaction.type === filters.type;
    const categoryMatch = filters.category === "all" || transaction.category === filters.category;
    const propertyMatch = filters.property === "all" || transaction.propertyName === filters.property;
    const paymentMethodMatch = filters.paymentMethod === "all" || transaction.paymentMethod === filters.paymentMethod;
    
    // Filtre par date
    let dateMatch = true;
    if (filters.dateRange && filters.dateRange.from) {
      const transactionDate = new Date(transaction.date);
      dateMatch = transactionDate >= filters.dateRange.from;
      
      if (dateMatch && filters.dateRange.to) {
        dateMatch = transactionDate <= filters.dateRange.to;
      }
    }
    
    // Filtre de recherche globale
    let searchMatch = true;
    if (filters.search && filters.search.trim() !== "") {
      const searchTerms = filters.search.toLowerCase().split(" ");
      searchMatch = searchTerms.every(term => {
        return (
          // Champs textuels
          transaction.description?.toLowerCase().includes(term) ||
          // Montant formaté
          transaction.formattedAmount.toLowerCase().includes(term) ||
          // Propriété
          transaction.propertyName?.toLowerCase().includes(term) ||
          // Locataire
          transaction.tenantName?.toLowerCase().includes(term) ||
          // Catégorie (nom et valeur)
          categoryLabels[transaction.category]?.toLowerCase().includes(term) || 
          transaction.category?.toLowerCase().includes(term) ||
          // Type de transaction (nom et valeur)
          (transaction.type === 'income' && 'revenu'.includes(term)) ||
          (transaction.type === 'expense' && 'dépense'.includes(term)) || 
          (transaction.type === 'credit' && 'crédit'.includes(term)) ||
          transaction.type?.toLowerCase().includes(term) ||
          // Statut de transaction (nom et valeur)
          (transaction.status === 'pending' && 'attente'.includes(term)) ||
          (transaction.status === 'completed' && ('terminé'.includes(term) || 'complété'.includes(term))) ||
          (transaction.status === 'cancelled' && 'annulé'.includes(term)) ||
          transaction.status?.toLowerCase().includes(term) ||
          // Méthode de paiement (nom et valeur)
          (transaction.paymentMethod && 
           paymentMethodLabels[transaction.paymentMethod as keyof typeof paymentMethodLabels]?.toLowerCase().includes(term)) ||
          transaction.paymentMethod?.toLowerCase().includes(term) ||
          // Date formatée
          transaction.formattedDate?.toLowerCase().includes(term) ||
          transaction.date?.toLowerCase().includes(term)
        );
      });
    }
    
    return typeMatch && categoryMatch && propertyMatch && paymentMethodMatch && dateMatch && searchMatch;
  });
}

const statusLabels = {
  pending: "En attente",
  completed: "Complétées",
  cancelled: "Annulées"
};

export function TransactionStatusTabs({
  transactions,
  activeTab,
  onTabChange,
  filters,
}: TransactionStatusTabsProps) {
  // Appliquer les filtres avancés avant de compter
  const filteredTransactions = applyFilters(transactions, filters);
  
  const pendingCount = filteredTransactions.filter((t) => t.status === "pending").length;
  const completedCount = filteredTransactions.filter((t) => t.status === "completed").length;
  const cancelledCount = filteredTransactions.filter((t) => t.status === "cancelled").length;
  
  // Déterminer si des filtres sont appliqués (pour montrer un indicateur)
  const hasActiveFilters = filters && (
    filters.type !== "all" || 
    filters.category !== "all" || 
    filters.property !== "all" || 
    filters.paymentMethod !== "all" || 
    !!filters.dateRange ||
    (filters.search && filters.search.trim() !== "")
  );
  
  const tabs = [
    {
      id: "pending",
      label: "En attente",
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-100",
      count: pendingCount
    },
    {
      id: "completed",
      label: "Complétées",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-100",
      count: completedCount
    },
    {
      id: "cancelled",
      label: "Annulées",
      icon: XCircle,
      color: "text-gray-500",
      bgColor: "bg-gray-100",
      count: cancelledCount
    }
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-1 flex space-x-1 mb-8 border border-gray-200 shadow-sm dark:bg-gray-900/50 dark:border-gray-700 dark:border-opacity-50">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={cn(
              "relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 flex-1 justify-center",
              isActive
                ? "text-gray-800 data-[state=active]:ring-2 data-[state=active]:ring-blue-500 dark:text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-white/80 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/80"
            )}
            data-state={isActive ? "active" : "inactive"}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-white rounded-md shadow-sm dark:bg-gray-800 dark:border dark:border-gray-700"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <span className="relative flex items-center">
              {Icon && <Icon className={cn("h-4 w-4 mr-1", tab.color)} />}
              <span className="flex items-center">
                {tab.label}
                {hasActiveFilters && (
                  <Filter className="h-3 w-3 text-blue-500 ml-1 inline" />
                )}
              </span>
              <span
                className={cn(
                  "ml-1.5 px-2 py-0.5 rounded-full text-xs",
                  isActive ? tab.bgColor || "bg-gray-100" : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
                  hasActiveFilters ? "border border-blue-300" : ""
                )}
              >
                {tab.count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}