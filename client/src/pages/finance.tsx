import { useState, useEffect } from "react";
import { TransactionsList } from "@/components/finance/TransactionsList";
import { TransactionStatusTabs } from "@/components/finance/TransactionStatusTabs";
import { FinanceStats } from "@/components/finance/FinanceStats";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, BadgeDollarSign } from "lucide-react";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Transaction, Property } from "@/types";
import { FormattedTransaction, PropertyInfo, TenantInfo } from "@/types";
import { DateRange } from "react-day-picker";

// Interface pour les filtres de transactions
export interface TransactionFilters {
  search: string;
  type: string;
  category: string;
  property: string;
  dateRange: DateRange | undefined;
  paymentMethod: string;
}

export default function Finance() {
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "cancelled">("pending");
  const [filters, setFilters] = useState<TransactionFilters>({
    search: "",
    type: "all",
    category: "all",
    property: "all",
    dateRange: undefined,
    paymentMethod: "all",
  });
  const [isPageReady, setIsPageReady] = useState(false);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: transactions = [], isLoading: isTransactionsLoading, isError } = useQuery<{ data: Transaction[], meta: any }, Error, FormattedTransaction[]>({
    queryKey: ["/api/transactions"],
    select: (response) => {
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Invalid transactions data:', response);
        return [];
      }

      return response.data.map(transaction => {
        if (!transaction || typeof transaction !== 'object') {
          console.error('Invalid transaction data:', transaction);
          return null;
        }

        try {
          const date = new Date(transaction.date);
          if (!date || isNaN(date.getTime())) {
            console.error('Invalid date for transaction:', transaction);
            return null;
          }

          const formattedDisplayDate = format(date, 'dd/MM/yyyy');

          const property: PropertyInfo = transaction.propertyId ? 
            { 
              id: transaction.propertyId, 
              name: properties.find((p: Property) => p.id === transaction.propertyId)?.name || 'Propriété non trouvée' 
            } : 
            null;
          
          const tenant: TenantInfo = transaction.tenantId ? 
            { 
              id: transaction.tenantId, 
              user: { fullName: 'Sans locataire' } 
            } : 
            null;
            
          const propertyName = property?.name || 'Aucune propriété';
          const tenantName = tenant?.user?.fullName || 'Sans locataire';

          const amount = Number(transaction.amount);
          if (isNaN(amount)) {
            console.error('Invalid amount for transaction:', transaction);
            return null;
          }

          // Convertir les dates en chaînes de caractères pour se conformer au type FormattedTransaction
          const createdAt = transaction.createdAt 
            ? (typeof transaction.createdAt === 'string' 
                ? transaction.createdAt 
                : format(new Date(transaction.createdAt), 'yyyy-MM-dd'))
            : undefined;

          const updatedAt = transaction.updatedAt 
            ? (typeof transaction.updatedAt === 'string' 
                ? transaction.updatedAt 
                : format(new Date(transaction.updatedAt), 'yyyy-MM-dd'))
            : undefined;

          return {
            ...transaction,
            date: format(date, 'yyyy-MM-dd'),
            formattedDate: formattedDisplayDate,
            displayDate: formattedDisplayDate,
            formattedAmount: new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR'
            }).format(amount),
            propertyName,
            tenantName,
            documentId: transaction.documentId || null,
            property,
            tenant,
            amount: amount,
            createdAt,
            updatedAt
          } as FormattedTransaction;
        } catch (error) {
          console.error('Error formatting transaction:', error, transaction);
          return null;
        }
      }).filter((t): t is FormattedTransaction => t !== null);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (remplace cacheTime qui est déprécié)
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Configurer l'effet qui marque la page comme prête après le chargement des données
  useEffect(() => {
    if (!isTransactionsLoading && transactions.length > 0) {
      // Attendre un peu pour permettre au rendu initial de se terminer
      const timer = setTimeout(() => setIsPageReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isTransactionsLoading, transactions]);

  // Importation des objets labels pour la recherche
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
  
  // Méthodes de paiement pour la recherche
  const paymentMethodLabels: Record<string, string> = {
    "cash": "Espèces",
    "card": "Carte bancaire",
    "transfer": "Virement",
    "check": "Chèque",
    "direct_debit": "Prélèvement",
    "other": "Autre",
  };

  // Mise à jour de la fonction de filtre pour n'utiliser que les statuts disponibles
  const getFilteredTransactions = () => {
    // Appliquer les filtres de base
    let filtered = transactions.filter(transaction => {
      // Filtrer par statut (onglet actif)
      if (activeTab !== transaction.status) {
        return false;
      }
    
      // Filtre par recherche amélioré
      const searchTerms = filters.search.toLowerCase().split(" ");
      const searchMatch = filters.search === "" || searchTerms.every(term => {
        // Vérifier tous les champs possibles pour la recherche
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
      
      // Autres filtres
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
      
      return searchMatch && typeMatch && categoryMatch && propertyMatch && paymentMethodMatch && dateMatch;
    });

    return filtered;
  };

  // Si les données sont en cours de chargement, on affiche un squelette
  if (isTransactionsLoading && !isPageReady) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Squelette de l'en-tête */}
        <div className="p-6 rounded-xl border border-gray-200">
          <div className="flex justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
              <div className="h-5 w-80 bg-gray-200 animate-pulse rounded-lg ml-[52px]"></div>
            </div>
            <div className="w-40 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
        
        {/* Squelette des stats */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
        
        {/* Squelette des transactions */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="h-10 bg-gray-200 animate-pulse rounded-lg w-full mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <div key={index} className="h-16 bg-gray-200 animate-pulse rounded-lg w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Si une erreur s'est produite
  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Une erreur est survenue</h2>
          <p className="text-red-500">Impossible de charger les données financières. Veuillez réessayer plus tard.</p>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          >
            Recharger la page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl border border-gray-200"
      >
        <div>
          <motion.div
            className="flex items-center gap-3 mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <BadgeDollarSign className="h-10 w-10 text-blue-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent animate-gradient">
              Gestion Financière
            </h1>
          </motion.div>
          <motion.p
            className="text-muted-foreground text-lg ml-[52px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Suivez vos revenus, dépenses et transactions
          </motion.p>
        </div>
        <Button 
          onClick={() => setShowNewTransactionDialog(true)}
          className="gap-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nouvelle transaction
        </Button>
      </motion.div>

      {/* Le reste des composants s'affichent uniquement quand les données sont prêtes */}
      {isPageReady && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <FinanceStats transactions={transactions} activeTab={activeTab} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-lg p-4 border border-gray-200"
          >
            <TransactionStatusTabs 
              transactions={transactions}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              filters={filters}
            />
            
            <TransactionsList 
              transactions={getFilteredTransactions()}
              showNewTransactionDialog={showNewTransactionDialog}
              setShowNewTransactionDialog={setShowNewTransactionDialog}
              activeTab={activeTab}
              filters={filters}
              setFilters={setFilters}
            />
          </motion.div>
        </>
      )}

      <NewTransactionDialog 
        open={showNewTransactionDialog} 
        onOpenChange={setShowNewTransactionDialog}
      />
    </div>
  );
}