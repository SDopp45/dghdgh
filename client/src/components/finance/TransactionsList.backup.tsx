import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { DateRange } from "react-day-picker";
import { type Transaction as TransactionType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, Filter, SlidersHorizontal, ChevronDown, Home, Eye, Trash2, 
  FileText, Plus, Edit, RefreshCw, XCircle, Calendar, ArrowUpCircle, 
  ArrowDownCircle, CreditCard, Tag, Euro, Clock, Building2, CreditCardIcon,
  Loader2, X, Folder, PlusCircle, Receipt, Wallet, PiggyBank, ArrowUpDown,
  DollarSign, ChevronUp, Download, FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PdfUpload } from "@/components/ui/pdf-upload";
import { DocumentViewerButton } from "@/components/ui/document-viewer-button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TransactionFilters } from "@/pages/finance";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ExportMenu } from "@/components/data-export/ExportMenu";
import { Combobox } from "@/components/ui/combobox";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useVirtualizer } from '@tanstack/react-virtual';
import * as XLSX from 'xlsx';
import { LucideIcon } from 'lucide-react';

const typeColors = {
  income: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  expense: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  credit: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  deleted: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
} as const;

const paymentMethodLabels = {
  cash: "Espèces",
  bank_transfer: "Virement bancaire",
  stripe: "Stripe",
  paypal: "PayPal",
  sepa: "SEPA",
  card: "Carte bancaire",
  check: "Chèque",
} as const;

const categoryLabels = {
  rent: "Loyer",
  maintenance: "Maintenance",
  insurance: "Assurance",
  tax: "Taxe",
  utility: "Charges",
  other: "Autre",
} as const;

import { FormattedTransaction } from '@/types';

interface TransactionsListProps {
  showNewTransactionDialog: boolean;
  setShowNewTransactionDialog: (show: boolean) => void;
  transactions: FormattedTransaction[];
  activeTab: "pending" | "completed" | "cancelled" | "all";
  filters: TransactionFilters;
  setFilters: React.Dispatch<React.SetStateAction<TransactionFilters>>;
}

const ITEMS_PER_PAGE = 10;

interface GroupedTransaction {
  propertyId: number | null;
  propertyName: string;
  type: 'income' | 'expense' | 'credit';
  category: keyof typeof categoryLabels;
  totalAmount: number;
  transactionCount: number;
  transactions: FormattedTransaction[];
  isExpanded: boolean;
}

const transactionIcons: Record<keyof typeof categoryLabels, LucideIcon> = {
  rent: Building2,
  maintenance: Receipt,
  insurance: PiggyBank,
  tax: Wallet,
  utility: Receipt,
  other: DollarSign
};

interface SortConfig {
  key: 'date' | 'amount' | 'description';
  direction: 'asc' | 'desc';
}

interface AdvancedFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
  categories: string[];
  paymentMethods: string[];
  status: string[];
}

const filterTransactions = (transactions: FormattedTransaction[], filters: TransactionFilters): FormattedTransaction[] => {
  return transactions.filter(transaction => {
    if (filters.dateRange) {
      const transactionDate = new Date(transaction.date);
      const startDate = filters.dateRange.from;
      const endDate = filters.dateRange.to;
      
      if (startDate && endDate && (transactionDate < startDate || transactionDate > endDate)) {
        return false;
      }
    }

    if (filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }

    if (filters.category !== 'all' && transaction.category !== filters.category) {
      return false;
    }

    if (filters.property !== 'all' && transaction.propertyName !== filters.property) {
      return false;
    }

    if (filters.paymentMethod !== 'all' && transaction.paymentMethod !== filters.paymentMethod) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.propertyName?.toLowerCase().includes(searchLower) ||
        transaction.tenantName?.toLowerCase().includes(searchLower) ||
        transaction.formattedAmount.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });
};

const sortTransactions = (transactions: FormattedTransaction[], sortConfig: SortConfig): FormattedTransaction[] => {
  return [...transactions].sort((a, b) => {
    if (sortConfig.key === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === 'amount') {
      const amountA = Number(a.amount);
      const amountB = Number(b.amount);
      return sortConfig.direction === 'asc' ? amountA - amountB : amountB - amountA;
    }
    if (sortConfig.key === 'description') {
      const descA = a.description || '';
      const descB = b.description || '';
      return sortConfig.direction === 'asc' 
        ? descA.localeCompare(descB)
        : descB.localeCompare(descA);
    }
    return 0;
  });
};

const groupTransactions = (transactions: FormattedTransaction[], filters: TransactionFilters): GroupedTransaction[] => {
  const filteredTransactions = filterTransactions(transactions, filters);
  const grouped = filteredTransactions.reduce((acc: Record<string, GroupedTransaction>, transaction: FormattedTransaction) => {
    const key = `${transaction.propertyId}-${transaction.type}-${transaction.category}`;
    if (!acc[key]) {
      acc[key] = {
        propertyId: transaction.propertyId,
        propertyName: transaction.propertyName,
        type: transaction.type,
        category: transaction.category as keyof typeof categoryLabels,
        totalAmount: 0,
        transactionCount: 0,
        transactions: [],
        isExpanded: false
      };
    }
    acc[key].totalAmount += Number(transaction.amount);
    acc[key].transactionCount++;
    acc[key].transactions.push(transaction);
    return acc;
  }, {});

  const groups = Object.values(grouped) as GroupedTransaction[];
  groups.forEach(group => {
    group.transactions = sortTransactions(group.transactions, { key: 'date', direction: 'desc' });
  });

  return groups;
};

const exportToExcel = (transactions: FormattedTransaction[]) => {
  const worksheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
    Date: format(new Date(t.date), 'dd/MM/yyyy'),
    Description: t.description,
    Catégorie: categoryLabels[t.category],
    Type: t.type === 'income' ? 'Revenu' : t.type === 'expense' ? 'Dépense' : 'Crédit',
    Montant: t.formattedAmount,
    Propriété: t.propertyName,
    Locataire: t.tenantName,
    Statut: t.status,
    'Méthode de paiement': paymentMethodLabels[t.paymentMethod as keyof typeof paymentMethodLabels]
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  XLSX.writeFile(workbook, `transactions_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
};

export function TransactionsList({
  transactions = [],
  showNewTransactionDialog,
  setShowNewTransactionDialog,
  activeTab,
  filters,
  setFilters,
}: TransactionsListProps) {
  const [completedPage, setCompletedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  const pageSize = ITEMS_PER_PAGE;
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FormattedTransaction | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    categories: [],
    paymentMethods: [],
    status: []
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: folders = [] } = useQuery<any[]>({
    queryKey: ["/api/folders"],
  });
  
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      return apiRequest('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name: folderName, path: "", section: "finance" }),
      });
    },
    onSuccess: (data) => {
      setSelectedFolderId(data.id);
      setIsCreatingFolder(false);
      setNewFolderName("");
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({ title: "Succès", description: "Dossier créé avec succès" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de créer le dossier", 
        variant: "destructive" 
      });
    },
  });

  const handleStatusChange = async (transactionId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Erreur lors du changement de statut');

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: 'Succès',
        description: 'Le statut a été mis à jour',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (transactionId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette transaction ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: 'Succès',
        description: 'La transaction a été supprimée',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la transaction',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditTransaction = (transaction: FormattedTransaction) => {
    setSelectedTransaction(transaction);
    setShowEditDialog(true);
  };

  const completedTransactions = transactions.filter(t => t.status === 'completed');
  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const cancelledTransactions = transactions.filter(t => t.status === 'cancelled');

  const paginateTransactions = (transactions: FormattedTransaction[], type: 'completed' | 'pending' | 'cancelled') => {
    let currentPageToUse = 1;
    
    if (type === 'completed') {
      currentPageToUse = completedPage;
    } else if (type === 'pending') {
      currentPageToUse = pendingPage;
    } else if (type === 'cancelled') {
      currentPageToUse = cancelledPage;
    }
    
    const start = (currentPageToUse - 1) * pageSize;
    const end = start + pageSize;
    return transactions.slice(start, end);
  };

  const groupedCompletedTransactions = groupTransactions(completedTransactions, filters);
  const groupedPendingTransactions = groupTransactions(pendingTransactions, filters);
  const groupedCancelledTransactions = groupTransactions(cancelledTransactions, filters);
  const allGroupedTransactions = [...groupedCompletedTransactions, ...groupedPendingTransactions, ...groupedCancelledTransactions];

  const TransactionTable = ({
    title,
    description,
    transactions: tableTransactions,
    type,
  }: {
    title: string;
    description: string;
    transactions: FormattedTransaction[];
    type: "income" | "expense" | "credit";
  }) => {
    const filteredTransactions = tableTransactions.filter(transaction => {
      // Filtres avancés
      if (advancedFilters.dateRange.start && advancedFilters.dateRange.end) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate < advancedFilters.dateRange.start || 
            transactionDate > advancedFilters.dateRange.end) {
          return false;
        }
      }

      // Filtre par montant
      const amount = Number(transaction.amount);
      if (advancedFilters.amountRange.min !== null && amount < advancedFilters.amountRange.min) {
        return false;
      }
      if (advancedFilters.amountRange.max !== null && amount > advancedFilters.amountRange.max) {
        return false;
      }

      // Filtre par catégorie avancé
      if (advancedFilters.categories.length > 0 && 
          !advancedFilters.categories.includes(transaction.category)) {
        return false;
      }

      // Filtre par méthode de paiement avancé
      if (advancedFilters.paymentMethods.length > 0 && 
          transaction.paymentMethod &&
          !advancedFilters.paymentMethods.includes(transaction.paymentMethod)) {
        return false;
      }

      // Filtre par statut avancé
      if (advancedFilters.status.length > 0 && 
          !advancedFilters.status.includes(transaction.status)) {
        return false;
      }

      // Recherche texte avancée
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (!(
          transaction.description?.toLowerCase().includes(searchLower) ||
          transaction.propertyName?.toLowerCase().includes(searchLower) ||
          transaction.tenantName?.toLowerCase().includes(searchLower) ||
          transaction.formattedAmount.toLowerCase().includes(searchLower)
        )) {
          return false;
        }
      }

      return true;
    });
    
    const groupedTransactions = groupTransactions(filteredTransactions, filters);

    const toggleGroup = (key: string) => {
      setExpandedGroups(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    };

    return (
      <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-gray-600">{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-gray-50/80">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[200px]">Propriété</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {groupedTransactions.map((group) => {
                  const groupKey = `${group.propertyId}-${group.type}-${group.category}`;
                  const isExpanded = expandedGroups.has(groupKey);
                  
                  return (
                    <>
                  <motion.tr
                        key={groupKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="group hover:bg-gray-50/50 border-b border-gray-100 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleGroup(groupKey)}
                              className="p-0 h-6 w-6"
                            >
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded ? "transform rotate-180" : ""
                              )} />
                            </Button>
                            <Badge variant="secondary" className="ml-2">
                              {group.transactionCount}
                            </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                          <div className="flex items-center gap-2">
                            {renderCategoryIcon(group.category)}
                            {group.propertyName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {group.transactionCount > 1 ? (
                            <span className="text-sm text-gray-500">
                              {group.transactionCount} transactions
                            </span>
                          ) : (
                            group.transactions[0].description
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize", typeColors[group.type])}>
                            {categoryLabels[group.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                          <Badge variant="outline" className={cn("capitalize", typeColors[group.type])}>
                            {group.type === "income" ? "Revenu" : group.type === "expense" ? "Dépense" : "Crédit"}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "font-medium",
                          group.type === "income" ? "text-emerald-600" :
                            group.type === "expense" ? "text-rose-600" : "text-amber-600"
                    )}>
                          {group.type === "income" ? "+" : "-"}{new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(group.totalAmount)}
                    </TableCell>
                    <TableCell>
                          {group.transactionCount > 1 ? (
                            <span className="text-sm text-gray-500">Multiple</span>
                          ) : (
                            paymentMethodLabels[group.transactions[0].paymentMethod as keyof typeof paymentMethodLabels]
                          )}
                    </TableCell>
                    <TableCell>
                          {group.transactionCount > 1 ? (
                            <span className="text-sm text-gray-500">Multiple</span>
                          ) : (
                            <Badge variant="outline" className={statusColors[group.transactions[0].status]}>
                              {group.transactions[0].status}
                            </Badge>
                          )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                            {group.transactionCount === 1 && (
                              <>
                          <Button
                            variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewTransaction(group.transactions[0])}
                                >
                                  <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTransaction(group.transactions[0])}
                                >
                                  <Edit className="h-4 w-4" />
                          </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                      
                      {isExpanded && (
                        <motion.tr
                          key={`${groupKey}-expanded`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-gray-50/50"
                        >
                          <TableCell colSpan={9} className="p-0">
                            <div className="p-4 space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-medium text-gray-500">
                                  Détails des transactions
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSortConfig(prev => ({
                                      ...prev,
                                      key: 'date',
                                      direction: prev.direction === 'asc' ? 'desc' : 'asc'
                                    }))}
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Date
                                    {sortConfig.key === 'date' && (
                                      sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSortConfig(prev => ({
                                      ...prev,
                                      key: 'amount',
                                      direction: prev.direction === 'asc' ? 'desc' : 'asc'
                                    }))}
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Montant
                                    {sortConfig.key === 'amount' && (
                                      sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {sortTransactions(group.transactions, sortConfig).map((transaction, index) => (
                                  <div
                                    key={transaction.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-100 hover:bg-gray-50/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="text-sm font-medium">
                                        {format(new Date(transaction.date), 'dd/MM/yyyy')}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {transaction.description}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className={cn(
                                        "text-sm font-medium",
                                        transaction.type === "income" ? "text-emerald-600" :
                                          transaction.type === "expense" ? "text-rose-600" : "text-amber-600"
                                      )}>
                                        {transaction.type === "income" ? "+" : "-"}{transaction.formattedAmount}
                                      </div>
                                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleViewTransaction(transaction)}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                                          className="text-red-500 hover:text-red-600"
                        >
                                          <Trash2 className="h-4 w-4" />
                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                      </div>
                    </TableCell>
                  </motion.tr>
                      )}
                    </>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const handlePreviewDocument = (documentId: number | null, documentIds?: number[]) => {
    if (!documentId && (!documentIds || documentIds.length === 0)) {
      toast({
        title: "Information",
        description: "Aucun document disponible pour cette transaction",
        variant: "default",
      });
      return;
    }
    
    if (documentIds && documentIds.length > 0) {
      setSelectedDocumentIds(documentIds);
      setCurrentDocumentIndex(0);
      setSelectedDocumentId(documentIds[0]);
    } 
    else if (documentId) {
      setSelectedDocumentId(documentId);
      setSelectedDocumentIds([documentId]);
      setCurrentDocumentIndex(0);
    }
    
    setShowPreview(true);
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression du document');

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: 'Succès',
        description: 'Document supprimé avec succès',
      });

      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const handleDocumentUpload = async (files: File[]) => {
    if (!selectedTransaction) return;

    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));

    try {
      const response = await fetch(`/api/transactions/${selectedTransaction.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erreur lors du téléchargement');

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: 'Succès',
        description: 'Documents ajoutés avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger les documents',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewTransaction = (transaction: FormattedTransaction) => {
    console.log('View transaction:', transaction);
  };

  const renderCategoryIcon = (category: keyof typeof categoryLabels) => {
    const IconComponent = transactionIcons[category];
    return IconComponent ? <IconComponent className="h-4 w-4 text-blue-500" /> : <Home className="h-4 w-4 text-blue-500" />;
  };

  const AdvancedFiltersComponent = () => (
    <div className="p-4 border-t border-gray-200">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Période</Label>
          <div className="flex gap-2">
            <DatePicker
              date={advancedFilters.dateRange.start as Date | undefined}
              setDate={(date) => setAdvancedFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: date || null }
              }))}
            />
            <DatePicker
              date={advancedFilters.dateRange.end as Date | undefined}
              setDate={(date) => setAdvancedFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: date || null }
              }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Montant</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={advancedFilters.amountRange.min || ""}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev,
                amountRange: { ...prev.amountRange, min: e.target.value ? Number(e.target.value) : null }
              }))}
            />
            <Input
              type="number"
              placeholder="Max"
              value={advancedFilters.amountRange.max || ""}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev,
                amountRange: { ...prev.amountRange, max: e.target.value ? Number(e.target.value) : null }
              }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Catégories</Label>
          <select
            multiple
            className="w-full rounded-md border p-2"
            value={advancedFilters.categories}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              setAdvancedFilters(prev => ({
                ...prev,
                categories: selectedOptions
              }));
            }}
          >
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Méthodes de paiement</Label>
          <select
            multiple
            className="w-full rounded-md border p-2"
            value={advancedFilters.paymentMethods}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              setAdvancedFilters(prev => ({
                ...prev,
                paymentMethods: selectedOptions
              }));
            }}
          >
            {Object.entries(paymentMethodLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: allGroupedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5
  });

  const statistics = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalCredits = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      totalCredits,
      balance: totalIncome - totalExpenses - totalCredits
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDeleteDocument(documentToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Recherche globale..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9 bg-white focus:ring-2 focus:ring-blue-500 border-gray-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres avancés
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-6 bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-lg">
              <div className="grid gap-5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-500" />
                    Filtres avancés
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 hover:bg-blue-100 text-blue-600 border-blue-200 flex items-center gap-1 transition-all duration-200"
                    onClick={() => setFilters({
                      search: '',
                      type: 'all',
                      category: 'all',
                      property: 'all',
                      paymentMethod: 'all',
                      dateRange: undefined
                    })}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> 
                    <span className="text-xs">Réinitialiser</span>
                  </Button>
                </div>
                
                <Separator className="bg-blue-100" />
                
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h4 className="font-medium leading-none flex items-center gap-2">
                    {filters.type === 'income' && <ArrowUpCircle className="h-4 w-4 text-emerald-500" />}
                    {filters.type === 'expense' && <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                    {filters.type === 'credit' && <CreditCardIcon className="h-4 w-4 text-amber-500" />}
                    {filters.type === 'all' && <Filter className="h-4 w-4 text-blue-500" />}
                    <span>Type de transaction</span>
                    {filters.type !== 'all' && (
                      <Badge 
                        className={cn(
                          "ml-2 text-xs font-medium px-2 py-0.5 rounded-full",
                          filters.type === 'income' && "bg-emerald-100 text-emerald-700 border-emerald-200",
                          filters.type === 'expense' && "bg-rose-100 text-rose-700 border-rose-200",
                          filters.type === 'credit' && "bg-amber-100 text-amber-700 border-amber-200"
                        )}
                      >
                        {filters.type === "income" ? "Revenus" : 
                         filters.type === "expense" ? "Dépenses" : "Crédits"}
                      </Badge>
                    )}
                  </h4>
                  <select
                    className={cn(
                      "w-full rounded-md border p-2.5 font-medium transition-all duration-200 shadow-sm",
                      filters.type === 'all' && "border-blue-200 bg-blue-50/50 text-blue-700",
                      filters.type === 'income' && "text-emerald-700 border-emerald-300 bg-emerald-50",
                      filters.type === 'expense' && "text-rose-700 border-rose-300 bg-rose-50",
                      filters.type === 'credit' && "text-amber-700 border-amber-300 bg-amber-50"
                    )}
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="all">Tous les types</option>
                    <option value="income">Revenus</option>
                    <option value="expense">Dépenses</option>
                    <option value="credit">Crédits</option>
                  </select>
                </motion.div>

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <h4 className="font-medium leading-none flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-500" />
                    <span>Catégorie</span>
                    {filters.category !== 'all' && (
                      <Badge className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border-purple-200">
                        {categoryLabels[filters.category as keyof typeof categoryLabels]}
                      </Badge>
                    )}
                  </h4>
                  <select
                    className={cn(
                      "w-full rounded-md border p-2.5 font-medium transition-all duration-200 shadow-sm",
                      filters.category === 'all' ? "border-blue-200 bg-blue-50/50 text-blue-700" : "text-purple-700 border-purple-300 bg-purple-50"
                    )}
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="all">Toutes les catégories</option>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </motion.div>

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <h4 className="font-medium leading-none flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                    <span>Propriété</span>
                    {filters.property !== 'all' && (
                      <Badge className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border-indigo-200">
                        {filters.property}
                      </Badge>
                    )}
                  </h4>
                  <select
                    className={cn(
                      "w-full rounded-md border p-2.5 font-medium transition-all duration-200 shadow-sm",
                      filters.property === 'all' ? "border-blue-200 bg-blue-50/50 text-blue-700" : "text-indigo-700 border-indigo-300 bg-indigo-50"
                    )}
                    value={filters.property}
                    onChange={(e) => setFilters(prev => ({ ...prev, property: e.target.value }))}
                  >
                    <option value="all">Toutes les propriétés</option>
                    {Array.from(new Set(transactions.map(t => t.propertyName))).map(property => (
                      <option key={property} value={property}>{property}</option>
                    ))}
                  </select>
                </motion.div>

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                >
                  <h4 className="font-medium leading-none flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-teal-500" />
                    <span>Méthode de paiement</span>
                    {filters.paymentMethod !== 'all' && (
                      <Badge className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 border-teal-200">
                        {paymentMethodLabels[filters.paymentMethod as keyof typeof paymentMethodLabels]}
                      </Badge>
                    )}
                  </h4>
                  <select
                    className={cn(
                      "w-full rounded-md border p-2.5 font-medium transition-all duration-200 shadow-sm",
                      filters.paymentMethod === 'all' ? "border-blue-200 bg-blue-50/50 text-blue-700" : "text-teal-700 border-teal-300 bg-teal-50"
                    )}
                    value={filters.paymentMethod}
                    onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="all">Toutes les méthodes</option>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </motion.div>
              </div>
            </PopoverContent>
          </Popover>

          <ExportMenu
            type="transactions"
            allowImport={true}
            currentFilters={{
              search: filters.search,
              type: filters.type !== "all" ? filters.type : undefined,
              category: filters.category !== "all" ? filters.category : undefined,
              property: filters.property !== "all" ? filters.property : undefined,
              paymentMethod: filters.paymentMethod !== "all" ? filters.paymentMethod : undefined,
              status: activeTab !== "all" ? activeTab : undefined
            }}
          />
        </div>
      </div>

      {showAdvancedFilters && <AdvancedFiltersComponent />}

      {(activeTab === "all" || activeTab === "completed") && (
        <TransactionTable
          title="Transactions complétées"
          description={`${completedTransactions.length} transactions complétées`}
          transactions={completedTransactions}
          type="income"
        />
      )}

      {(activeTab === "all" || activeTab === "pending") && (
        <TransactionTable
          title="Transactions en attente"
          description={`${pendingTransactions.length} transactions en attente`}
          transactions={pendingTransactions}
          type="expense"
        />
      )}

      {(activeTab === "all" || activeTab === "cancelled") && (
        <TransactionTable
          title="Transactions annulées"
          description={`${cancelledTransactions.length} transactions annulées`}
          transactions={cancelledTransactions}
          type="credit"
        />
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>
                {selectedDocumentIds.length > 1 
                  ? `Document ${currentDocumentIndex + 1}/${selectedDocumentIds.length}` 
                  : "Document de la transaction"}
              </DialogTitle>
              {selectedDocumentIds.length > 1 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                  {selectedDocumentIds.length} documents
                </Badge>
              )}
            </div>
            
            {selectedDocumentIds.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentDocumentIndex === 0}
                  onClick={() => {
                    if (currentDocumentIndex > 0) {
                      setCurrentDocumentIndex(currentDocumentIndex - 1);
                      setSelectedDocumentId(selectedDocumentIds[currentDocumentIndex - 1]);
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>
                <span className="text-sm text-gray-500">
                  {currentDocumentIndex + 1} / {selectedDocumentIds.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentDocumentIndex === selectedDocumentIds.length - 1}
                  onClick={() => {
                    if (currentDocumentIndex < selectedDocumentIds.length - 1) {
                      setCurrentDocumentIndex(currentDocumentIndex + 1);
                      setSelectedDocumentId(selectedDocumentIds[currentDocumentIndex + 1]);
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-[600px] mt-4">
            {selectedDocumentId && (
              <iframe
                src={`/api/documents/${selectedDocumentId}/preview`}
                className="w-full h-full border-0 rounded-md"
                title={`Document Preview ${currentDocumentIndex + 1}`}
                key={selectedDocumentId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-background via-background/80 to-blue-500/10 border-blue-500/20 overflow-y-auto">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                <Edit className="h-6 w-6 text-blue-500" />
                Modifier la transaction
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground/80">
                Modifiez les informations de la transaction existante
              </DialogDescription>
            </DialogHeader>
            
            {selectedTransaction && (
              <div className="space-y-6">
                <motion.div 
                  className="grid gap-6 sm:grid-cols-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-2">
                    <label className="font-medium leading-none flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      Date
                    </label>
                    <Input 
                      type="date" 
                      defaultValue={selectedTransaction.date || ''} 
                      id="edit-transaction-date"
                      className="bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-medium leading-none flex items-center gap-2">
                      {selectedTransaction.type === 'income' && <ArrowUpCircle className="h-4 w-4 text-emerald-500" />}
                      {selectedTransaction.type === 'expense' && <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                      {selectedTransaction.type === 'credit' && <CreditCardIcon className="h-4 w-4 text-amber-500" />}
                      Type
                    </label>
                    <select 
                      className={cn(
                        "w-full rounded-md border p-2 bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors",
                        selectedTransaction.type === 'income' && "text-emerald-600",
                        selectedTransaction.type === 'expense' && "text-rose-600",
                        selectedTransaction.type === 'credit' && "text-amber-600"
                      )}
                      defaultValue={selectedTransaction.type}
                      id="edit-transaction-type"
                    >
                      <option value="income">Revenu</option>
                      <option value="expense">Dépense</option>
                      <option value="credit">Crédit</option>
                    </select>
                  </div>
                </motion.div>
                
                <Separator className="bg-border/50" />
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="space-y-2">
                    <label className="font-medium leading-none flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Description
                    </label>
                    <Input 
                      defaultValue={selectedTransaction.description || ''} 
                      id="edit-transaction-description"
                      className="bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </motion.div>
                
                <Separator className="bg-border/50" />
                
                <motion.div 
                  className="grid gap-6 sm:grid-cols-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <div className="space-y-2">
                    <label className="font-medium leading-none flex items-center gap-2">
                      <Tag className="h-4 w-4 text-blue-500" />
                      Catégorie
                    </label>
                    <select 
                      className="w-full rounded-md border p-2 bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                      defaultValue={selectedTransaction.category || 'rent'}
                      id="edit-transaction-category"
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-medium leading-none flex items-center gap-2">
                      <Euro className="h-4 w-4 text-blue-500" />
                      Montant (€)
                    </label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      defaultValue={selectedTransaction.amount} 
                      id="edit-transaction-amount"
                      className="font-mono bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </motion.div>
                
                <Separator className="bg-border/50" />
                
                <motion.div 
                  className="grid gap-6 sm:grid-cols-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <div className="space-y-2">
                    <label className="font-medium leading-none flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      Méthode de paiement
                    </label>
                    <select 
                      className="w-full rounded-md border p-2 bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                      defaultValue={(selectedTransaction.paymentMethod as string) || 'bank_transfer'} 
                      id="edit-transaction-payment-method"
                    >
                      {Object.entries(paymentMethodLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="font-medium leading-none flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Statut
                    </label>
                    <select 
                      className={cn(
                        "w-full rounded-md border p-2 bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors",
                        selectedTransaction.status === 'completed' && "text-emerald-600",
                        selectedTransaction.status === 'pending' && "text-yellow-600",
                        selectedTransaction.status === 'cancelled' && "text-gray-600"
                      )}
                      defaultValue={selectedTransaction.status}
                      id="edit-transaction-status"
                    >
                      <option value="pending">En attente</option>
                      <option value="completed">Complété</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                </motion.div>
                
                <Separator className="my-4" />
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Documents joints ({selectedTransaction.documentIds?.length || 0})
                  </label>
                  
                  {selectedTransaction.documentIds && selectedTransaction.documentIds.length > 0 ? (
                    <div className="border border-gray-200 rounded-md mb-4 overflow-hidden">
                      {selectedTransaction.documentIds.map((docId, index) => (
                        <div 
                          key={docId} 
                          className="flex items-center justify-between p-3 bg-white"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">Document {index === 0 ? "(principal)" : ""}</span>
                            {index === 0 && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <DocumentViewerButton
                              documentId={docId}
                              section="transactions"
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <Eye className="h-4 w-4" />
                            </DocumentViewerButton>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDocumentToDelete(docId);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="border border-dashed border-gray-300 rounded-md py-6 px-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3">
                        <FileText className="h-6 w-6 text-gray-400 mx-auto" />
                      </div>
                      <p className="text-sm font-medium mb-2">
                        Ajouter des documents (devis, factures, photos)
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        Glissez et déposez jusqu'à 5 fichiers PDF ou cliquez pour parcourir
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        Taille maximale: 10MB par fichier
                      </p>
                    </div>
                    
                    <div>
                      <PdfUpload
                        onFileSelected={(files) => {
                          if (Array.isArray(files)) {
                            handleDocumentUpload(files);
                          }
                        }}
                        multiple={true}
                        maxFiles={5}
                      />
                    </div>
                    
                    {isUploading && (
                      <div className="flex items-center justify-center gap-2 text-sm text-blue-600 mt-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Téléchargement en cours...
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                    className="border-blue-500/20 hover:bg-blue-500/10 text-blue-700"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={() => {
                      const updateData = {
                        date: (document.getElementById('edit-transaction-date') as HTMLInputElement)?.value,
                        type: (document.getElementById('edit-transaction-type') as HTMLSelectElement)?.value,
                        description: (document.getElementById('edit-transaction-description') as HTMLInputElement)?.value,
                        category: (document.getElementById('edit-transaction-category') as HTMLSelectElement)?.value,
                        amount: parseFloat((document.getElementById('edit-transaction-amount') as HTMLInputElement)?.value),
                        paymentMethod: (document.getElementById('edit-transaction-payment-method') as HTMLSelectElement)?.value,
                        status: (document.getElementById('edit-transaction-status') as HTMLSelectElement)?.value,
                      };
                      
                      fetch(`/api/transactions/${selectedTransaction.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                      })
                      .then(response => {
                        if (!response.ok) throw new Error('Erreur lors de la mise à jour');
                        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
                        toast({
                          title: 'Succès',
                          description: 'La transaction a été mise à jour',
                        });
                        setShowEditDialog(false);
                      })
                      .catch(error => {
                        toast({
                          title: 'Erreur',
                          description: 'Impossible de mettre à jour la transaction',
                          variant: 'destructive',
                        });
                      });
                    }}
                    className="gap-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Edit className="h-4 w-4" />
                    Mettre à jour
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div ref={parentRef} className="h-[600px] overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const group = allGroupedTransactions[virtualRow.index];
            return (
              <div
                key={`${group.propertyId}-${group.type}-${group.category}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* ... existing group rendering ... */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}