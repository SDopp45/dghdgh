import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  CircleDashed,
  CircleX,
  Download,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import NewTransactionDialog from './NewTransactionDialog';
import EditTransactionDialog from './EditTransactionDialog';
import DeleteTransactionDialog from './DeleteTransactionDialog';
import TransactionStatusChip from './TransactionStatusChip';
import { DocumentPdfPreview } from '../documents/DocumentPdfPreview';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SimplePagination } from '@/components/ui/pagination';
import { TransactionExportDialog } from './TransactionExportDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { typeOptions, categoryOptions, propertyOptions, statusOptions } from '@/lib/transactionOptions';

// Type for representing a transaction
interface Transaction {
  id: number;
  date: string;
  amount: number;
  formattedAmount: string;
  type: 'income' | 'expense' | 'credit';
  category: string;
  description: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  propertyId: number;
  tenantId?: number;
  property?: {
    id: number;
    name: string;
  };
  tenant?: {
    id: number;
    name: string;
  };
  documentIds?: number[];
  formattedDate?: string;
}

// Type for the pagination metadata
interface PaginationMeta {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
}

export default function TransactionsList() {
  // État local pour les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{
    from?: Date;
    to?: Date;
  }>();
  
  // État local pour la pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("all");
  const [isPageChanging, setIsPageChanging] = useState(false);
  
  // État pour les dialogs
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [isDeleteTransactionOpen, setIsDeleteTransactionOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [documentPreviewId, setDocumentPreviewId] = useState<number | null>(null);
  
  // État pour le tri
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // État pour la sélection de transactions
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // État pour l'affichage du filtre
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Effet pour suivre les changements de page
  useEffect(() => {
    console.log("[DEBUG] Page state changed to:", page);
  }, [page]);
  
  // Requête pour récupérer les transactions avec filtres, tri et pagination
  const {
    data: transactionsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: [
      'transactions',
      page,
      pageSize,
      typeFilter !== 'all' ? typeFilter : undefined,
      categoryFilter !== 'all' ? categoryFilter : undefined,
      propertyFilter !== 'all' ? propertyFilter : undefined,
      statusFilter !== 'all' ? statusFilter : undefined,
      dateRangeFilter?.from,
      dateRangeFilter?.to,
      searchQuery,
      sortColumn,
      sortDirection
    ],
    queryFn: async () => {
      // Construire les paramètres de requête depuis les filtres
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy: sortColumn,
        sortOrder: sortDirection
      });
      
      // Ajouter les filtres si définis
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (propertyFilter !== 'all') params.append('propertyId', propertyFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      // Ajouter la plage de dates si définie
      if (dateRangeFilter?.from) {
        params.append('startDate', format(dateRangeFilter.from, 'yyyy-MM-dd'));
      }
      if (dateRangeFilter?.to) {
        params.append('endDate', format(dateRangeFilter.to, 'yyyy-MM-dd'));
      }
      
      console.log('[DEBUG] API call with params:', Object.fromEntries(params));
      console.log('[DEBUG] API call with pageSize:', pageSize);

      setIsPageChanging(true);
      try {
        const response = await fetch(`/api/transactions?${params}`);
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des transactions');
        }
        
        const data = await response.json();
        console.log(`[DEBUG] Received ${data.data?.length || 0} transactions (total: ${data.meta?.total || 0}, pages: ${data.meta?.totalPages || 0})`);
        return data;
      } catch (error) {
        console.error('[DEBUG] Error fetching transactions:', error);
        throw error;
      } finally {
        setIsPageChanging(false);
      }
    },
    placeholderData: (previousData) => previousData, // Utiliser les données précédentes comme placeholder
    staleTime: 30000, // 30 secondes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Gestionnaire de changement de page
  const handlePageChange = (newPage: number) => {
    console.log("[DEBUG] Page change requested:", newPage);
    
    // Empêcher le changement de page pendant une requête en cours
    if (isFetching || isPageChanging) {
      console.log("[DEBUG] Page change ignored - request in progress");
      return;
    }
    
    if (newPage < 1 || newPage > (transactionsData?.meta?.totalPages || 1)) {
      console.log("[DEBUG] Page change ignored - invalid page number:", newPage);
      return;
    }
    
    // Défiler vers le haut de la liste lors d'un changement de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setPage(newPage);
  };
  
  // Afficher le nombre d'éléments par page
  const handlePageSizeChange = (value: string) => {
    console.log("[DEBUG] Page size change:", value);
    // Nous gardons "all" comme valeur de pageSize
    if (value !== "all") {
      console.log("[DEBUG] Ignoring page size change - using 'all'");
    }
    setPage(1); // Réinitialiser à la première page
  };
  
  // Réinitialiser la sélection quand la page change
  useEffect(() => {
    setSelectedTransactions([]);
    setSelectAll(false);
  }, [page]);
  
  // Extraire les transactions et les métadonnées de pagination
  const transactions = transactionsData?.data || [];
  const paginationMeta = transactionsData?.meta || {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  };
  
  // Format de l'affichage de la plage de dates
  const dateRangeDisplay = useMemo(() => {
    if (!dateRangeFilter) return 'Toutes les dates';
    const { from, to } = dateRangeFilter;
    if (from && to) {
      return `${format(from, 'dd/MM/yyyy')} - ${format(to, 'dd/MM/yyyy')}`;
    } else if (from) {
      return `Depuis le ${format(from, 'dd/MM/yyyy')}`;
    } else if (to) {
      return `Jusqu'au ${format(to, 'dd/MM/yyyy')}`;
    }
    return 'Toutes les dates';
  }, [dateRangeFilter]);
  
  // Afficher ou masquer une colonne de tri
  const renderSortableColumnHeader = (
    column: string,
    label: string,
    className: string = ''
  ) => {
    const isActive = sortColumn === column;
    
    return (
      <TableHead className={className} onClick={() => handleSort(column)}>
        <div className="flex items-center cursor-pointer">
          <span>{label}</span>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="ml-1 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-1 h-4 w-4" />
            )
          ) : (
            <ChevronDown className="ml-1 h-4 w-4 opacity-20" />
          )}
        </div>
      </TableHead>
    );
  };
  
  // Gérer le changement de colonne de tri
  const handleSort = (column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortColumn(column);
    setSortDirection(newDirection);
  };
  
  // Gérer la sélection ou désélection de toutes les transactions
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(t => t.id));
    }
    setSelectAll(!selectAll);
  };
  
  // Gérer la sélection d'une transaction
  const handleSelectTransaction = (id: number) => {
    if (selectedTransactions.includes(id)) {
      setSelectedTransactions(selectedTransactions.filter(transactionId => transactionId !== id));
      setSelectAll(false);
    } else {
      setSelectedTransactions([...selectedTransactions, id]);
      if (selectedTransactions.length + 1 === transactions.length) {
        setSelectAll(true);
      }
    }
  };
  
  // Gérer l'édition d'une transaction
  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditTransactionOpen(true);
  };
  
  // Gérer la suppression d'une transaction
  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteTransactionOpen(true);
  };
  
  // Gérer la prévisualisation d'un document
  const handleShowDocument = (documentId: number) => {
    setDocumentPreviewId(documentId);
  };
  
  // Gérer la fermeture de la prévisualisation d'un document
  const handleCloseDocumentPreview = () => {
    setDocumentPreviewId(null);
  };
  
  // Réinitialiser tous les filtres
  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setPropertyFilter('all');
    setStatusFilter('all');
    setDateRangeFilter(undefined);
    // Réinitialiser également la pagination
    setPage(1);
  };
  
  // S'assurer que la page courante est valide
  useEffect(() => {
    if (transactionsData?.meta && page > transactionsData.meta.totalPages && transactionsData.meta.totalPages > 0) {
      console.log("[DEBUG] Current page exceeds total pages, resetting to page 1");
      setPage(1);
    }
  }, [transactionsData?.meta, page]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Transactions</h2>
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="border rounded-md">
          <div className="p-4 flex items-center justify-between">
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-5 w-[200px]" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"><Skeleton className="h-4 w-4" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[150px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Transactions</h2>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Erreur lors du chargement des transactions</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Une erreur inconnue est survenue'}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
            onClick={() => refetch()}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec bouton pour ajouter une transaction */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <div className="flex gap-2">
          {selectedTransactions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Exporter ({selectedTransactions.length})
            </Button>
          )}
          <Button onClick={() => setIsNewTransactionOpen(true)}>
            Nouvelle transaction
          </Button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
        <div className="flex flex-col gap-2 md:flex-row md:items-center w-full md:w-auto">
          <div className="relative w-full md:w-[300px]">
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery('')}
              >
                <CircleX className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={isFilterOpen ? "bg-primary/10" : ""}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {isFilterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2 md:mt-0">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {typeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Propriété" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les propriétés</SelectItem>
                {propertyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <span>{dateRangeDisplay}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRangeFilter}
                  onSelect={setDateRangeFilter}
                  initialFocus
                />
                <div className="p-2 border-t border-border flex justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDateRangeFilter(undefined)}
                  >
                    Réinitialiser
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => document.body.click()} // Ferme le popover
                  >
                    Appliquer
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <div className="flex justify-end col-span-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Informations sur les filtres appliqués */}
      {(typeFilter !== 'all' || categoryFilter !== 'all' || propertyFilter !== 'all' || statusFilter !== 'all' || dateRangeFilter || searchQuery) && (
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <span>Filtres appliqués:</span>
          {typeFilter !== 'all' && (
            <Badge variant="outline" className="flex items-center gap-1">
              Type: {typeOptions.find(o => o.value === typeFilter)?.label || typeFilter}
              <button onClick={() => setTypeFilter('all')}>
                <CircleX className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge variant="outline" className="flex items-center gap-1">
              Catégorie: {categoryOptions.find(o => o.value === categoryFilter)?.label || categoryFilter}
              <button onClick={() => setCategoryFilter('all')}>
                <CircleX className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {propertyFilter !== 'all' && (
            <Badge variant="outline" className="flex items-center gap-1">
              Propriété: {propertyOptions.find(o => o.value === propertyFilter)?.label || propertyFilter}
              <button onClick={() => setPropertyFilter('all')}>
                <CircleX className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="outline" className="flex items-center gap-1">
              Statut: {statusOptions.find(o => o.value === statusFilter)?.label || statusFilter}
              <button onClick={() => setStatusFilter('all')}>
                <CircleX className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dateRangeFilter && (
            <Badge variant="outline" className="flex items-center gap-1">
              Date: {dateRangeDisplay}
              <button onClick={() => setDateRangeFilter(undefined)}>
                <CircleX className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="outline" className="flex items-center gap-1">
              Recherche: {searchQuery}
              <button onClick={() => setSearchQuery('')}>
                <CircleX className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
      
      {/* Table des transactions */}
      {transactions.length === 0 ? (
        <div className="bg-gray-50 border rounded-md p-8 text-center">
          <p className="text-gray-500 mb-2">Aucune transaction ne correspond à vos critères de recherche.</p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center">
              <Checkbox 
                id="selectAll" 
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                aria-label="Sélectionner toutes les transactions"
              />
              <label 
                htmlFor="selectAll" 
                className="ml-2 text-sm font-medium cursor-pointer"
              >
                {selectedTransactions.length 
                  ? `${selectedTransactions.length} sélectionné${selectedTransactions.length > 1 ? 's' : ''}`
                  : 'Sélectionner tout'}
              </label>
            </div>
            <div className="text-sm text-gray-500">
              {paginationMeta.total} transaction{paginationMeta.total !== 1 ? 's' : ''}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                {renderSortableColumnHeader('date', 'Date', 'min-w-[180px]')}
                {renderSortableColumnHeader('property', 'Propriété')}
                {renderSortableColumnHeader('amount', 'Montant', 'min-w-[120px]')}
                {renderSortableColumnHeader('type', 'Type')}
                {renderSortableColumnHeader('category', 'Catégorie')}
                {renderSortableColumnHeader('status', 'Statut')}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(transaction => (
                <TableRow key={transaction.id} className="group">
                  <TableCell className="w-[40px]">
                    <Checkbox 
                      checked={selectedTransactions.includes(transaction.id)}
                      onCheckedChange={() => handleSelectTransaction(transaction.id)}
                      aria-label={`Sélectionner la transaction ${transaction.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.formattedDate || format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">{transaction.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.property?.name || '-'}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "font-medium",
                      transaction.type === 'income' ? "text-green-600" : 
                      transaction.type === 'expense' ? "text-red-600" : 
                      "text-blue-600"
                    )}>
                      {transaction.formattedAmount || new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      transaction.type === 'income' ? "bg-green-50 text-green-700 border-green-200" : 
                      transaction.type === 'expense' ? "bg-red-50 text-red-700 border-red-200" : 
                      "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {typeOptions.find(o => o.value === transaction.type)?.label || transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {categoryOptions.find(o => o.value === transaction.category)?.label || transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TransactionStatusChip status={transaction.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {transaction.documentIds && transaction.documentIds.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleShowDocument(transaction.documentIds![0])}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Voir le document
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-horizontal">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTransaction(transaction)}
                            className="text-red-600 focus:text-red-600"
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="flex justify-between items-center p-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Chargement:</span>
              <Select
                value={pageSize}
                onValueChange={handlePageSizeChange}
                disabled={true}
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes (illimité)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Message d'information */}
            <div className="text-sm text-gray-500">
              {paginationMeta.total} transaction{paginationMeta.total !== 1 ? 's' : ''} chargée{paginationMeta.total !== 1 ? 's' : ''}
              {(isFetching || isPageChanging) && " • Chargement..."}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs pour les actions sur les transactions */}
      <NewTransactionDialog
        isOpen={isNewTransactionOpen}
        onClose={() => setIsNewTransactionOpen(false)}
        onTransactionCreated={() => refetch()}
      />
      
      {selectedTransaction && (
        <>
          <EditTransactionDialog
            isOpen={isEditTransactionOpen}
            onClose={() => setIsEditTransactionOpen(false)}
            transaction={selectedTransaction}
            onTransactionUpdated={() => {
              refetch();
              setIsEditTransactionOpen(false);
            }}
          />
          
          <DeleteTransactionDialog
            isOpen={isDeleteTransactionOpen}
            onClose={() => setIsDeleteTransactionOpen(false)}
            transactionId={selectedTransaction.id}
            onTransactionDeleted={() => {
              refetch();
              setIsDeleteTransactionOpen(false);
            }}
          />
        </>
      )}
      
      <TransactionExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        transactionIds={selectedTransactions}
      />
      
      {documentPreviewId && (
        <Dialog open={!!documentPreviewId} onOpenChange={handleCloseDocumentPreview}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Aperçu du document</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <DocumentPdfPreview documentId={documentPreviewId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 