import { useState, useRef, useMemo, Fragment, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { DateRange, SelectMultipleEventHandler, DayClickEventHandler } from "react-day-picker";
import type { Transaction as TransactionType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, Home, ChevronDown, ArrowRight, Plus, Search, CreditCard, CalendarDays, 
  Tag, Euro, FileText, Circle, Check, Filter, CheckCircle, XCircle, BadgeInfo, 
  Archive as ArchiveIcon, ArrowUpCircle, ArrowDownCircle, ChevronsUp, ChevronsDown, 
  MoreHorizontal, Trash2, Printer, Calendar as CalendarIcon, ArrowRightLeft, FilePlus, 
  StepBack, CircleEllipsis, Upload, ExternalLink, Eye, Edit, Trash, Archive, 
  Ban, RefreshCcw as Reload, Loader2, X, Folder, PlusCircle, Receipt, Wallet, PiggyBank, 
  ArrowUpDown, DollarSign, ChevronUp, Download, FileSpreadsheet, Layers, FilePenLine, 
  FileSignature, Clipboard, FileSearch, FileCheck, FileIcon, Mail, FileImage, Pencil, 
  AlertTriangle, Wrench, Paintbrush, Sofa, Lock, Palmtree, Droplet, Zap, Flame, Wifi, 
  Calculator, Headphones, Car, Landmark, RefreshCcw, BarChart, BarChart2, BarChart3, 
  BarChart4, BadgePercent, Building, CalendarClock, Cog, Droplets, FileStack, HeartHandshake, 
  HelpCircle, Home as HomeIcon, LandPlot, LayoutGrid, Megaphone, Package, PanelTop, 
  Percent as Percentage, Scale, ShieldAlert, ShieldCheck, Sparkles, Truck, CircuitBoard, 
  Clock, AlertCircle, Briefcase, Hammer, BadgeDollarSign, ArrowDownToLine, SlidersHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PdfUpload } from "@/components/ui/pdf-upload";
import { DocumentViewerButton } from "@/components/ui/document-viewer-button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TransactionFilters } from "@/pages/finance";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ExportMenu } from "@/components/data-export/ExportMenu";
import { Combobox } from "@/components/ui/combobox";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useVirtualizer } from '@tanstack/react-virtual';
import { LucideIcon } from 'lucide-react';
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { saveAs } from 'file-saver';
import { Checkbox } from "@/components/ui/checkbox";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const typeColors = {
  income: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  expense: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  credit: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'failed' | 'archived' | 'deleted';
type TransactionCategory = keyof typeof categoryLabels;

const statusLabels = {
  pending: "En attente",
  completed: "Complété",
  cancelled: "Annulé",
  failed: "Échoué",
  archived: "Archivé",
  deleted: "Supprimé"
} as const;

const statusColors: Record<TransactionStatus, string> = {
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
  credit_card: "Carte de crédit",
  debit_card: "Carte de débit",
  check: "Chèque",
  direct_debit: "Prélèvement automatique",
  wire_transfer: "Virement international",
  mobile_payment: "Paiement mobile",
  cryptocurrency: "Cryptomonnaie",
  interac: "Interac",
  venmo: "Venmo",
  installment: "Paiement échelonné",
  prepaid_card: "Carte prépayée",
  voucher: "Bon/Voucher",
  other: "Autre méthode"
} as const;

const categoryLabels = {
  rent: "Loyer",
  maintenance: "Maintenance",
  insurance: "Assurance",
  tax: "Taxe",
  utility: "Charges générales",
  management_fee: "Frais de gestion",
  legal_fee: "Frais juridiques",
  renovation: "Rénovation",
  mortgage: "Emprunt/Crédit",
  condominium_fee: "Charges copropriété",
  security_deposit: "Dépôt de garantie",
  commission: "Commission",
  marketing: "Marketing",
  inspection: "Inspection",
  cleaning: "Nettoyage",
  furnishing: "Ameublement",
  security: "Sécurité",
  landscaping: "Espaces verts",
  utilities_water: "Eau",
  utilities_electricity: "Électricité",
  utilities_gas: "Gaz",
  utilities_internet: "Internet/Télécom",
  accounting: "Comptabilité",
  consulting: "Conseil",
  travel: "Déplacement",
  equipment: "Équipement",
  refund: "Remboursement",
  late_fees: "Pénalités de retard",
  service_fees: "Frais de service",
  short_term_rental: "Location courte durée",
  parking_income: "Revenus parking/garage",
  common_area_income: "Revenus espaces communs",
  additional_services: "Services additionnels",
  advertising_income: "Revenus publicitaires",
  subsidies: "Subventions ou aides",
  insurance_claims: "Indemnités d'assurance",
  property_sale: "Vente de bien",
  application_fees: "Frais de dossier",
  penalty_fees: "Frais de pénalité",
  dividend_income: "Revenus de dividendes",
  interest_income: "Revenus d'intérêts",
  rental_equipment: "Location d'équipements",
  other: "Autre"
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

const transactionIcons: { [key: string]: ReactNode } = {
  rent: <HomeIcon className="h-4 w-4 text-blue-500" />,
  maintenance: <Wrench className="h-4 w-4 text-orange-500" />,
  insurance: <ShieldCheck className="h-4 w-4 text-purple-500" />,
  tax: <Building2 className="h-4 w-4 text-red-500" />,
  utility: <Zap className="h-4 w-4 text-green-500" />,
  management_fee: <Briefcase className="h-4 w-4 text-indigo-500" />,
  legal_fee: <Scale className="h-4 w-4 text-cyan-500" />,
  renovation: <Hammer className="h-4 w-4 text-amber-500" />,
  mortgage: <LandPlot className="h-4 w-4 text-pink-500" />,
  condominium_fee: <Building className="h-4 w-4 text-teal-500" />,
  security_deposit: <ShieldAlert className="h-4 w-4 text-sky-500" />,
  commission: <PiggyBank className="h-4 w-4 text-lime-500" />,
  marketing: <PanelTop className="h-4 w-4 text-fuchsia-500" />,
  inspection: <Search className="h-4 w-4 text-emerald-500" />,
  cleaning: <Sparkles className="h-4 w-4 text-violet-500" />,
  furnishing: <Sofa className="h-4 w-4 text-rose-500" />,
  security: <Lock className="h-4 w-4 text-stone-500" />,
  landscaping: <Palmtree className="h-4 w-4 text-olive-500" />,
  utilities_water: <Droplets className="h-4 w-4 text-blue-400" />,
  utilities_electricity: <CircuitBoard className="h-4 w-4 text-yellow-500" />,
  utilities_gas: <Flame className="h-4 w-4 text-orange-400" />,
  utilities_internet: <Wifi className="h-4 w-4 text-violet-400" />,
  accounting: <Calculator className="h-4 w-4 text-slate-500" />,
  consulting: <HeartHandshake className="h-4 w-4 text-zinc-500" />,
  travel: <Car className="h-4 w-4 text-neutral-500" />,
  equipment: <Cog className="h-4 w-4 text-stone-400" />,
  refund: <ArrowDownToLine className="h-4 w-4 text-emerald-400" />,
  late_fees: <Clock className="h-4 w-4 text-red-500" />,
  service_fees: <BadgePercent className="h-4 w-4 text-blue-500" />,
  short_term_rental: <CalendarClock className="h-4 w-4 text-indigo-500" />,
  parking_income: <Car className="h-4 w-4 text-sky-500" />,
  common_area_income: <LayoutGrid className="h-4 w-4 text-teal-500" />,
  additional_services: <Package className="h-4 w-4 text-green-500" />,
  advertising_income: <Megaphone className="h-4 w-4 text-amber-500" />,
  subsidies: <BadgeDollarSign className="h-4 w-4 text-lime-500" />,
  insurance_claims: <FileText className="h-4 w-4 text-purple-500" />,
  property_sale: <Building2 className="h-4 w-4 text-pink-500" />,
  application_fees: <FileStack className="h-4 w-4 text-blue-500" />,
  penalty_fees: <AlertCircle className="h-4 w-4 text-red-500" />,
  dividend_income: <BarChart className="h-4 w-4 text-green-500" />,
  interest_income: <Percentage className="h-4 w-4 text-cyan-500" />,
  rental_equipment: <Truck className="h-4 w-4 text-orange-500" />,
  equipment_loan: <Truck className="h-4 w-4 text-amber-500" />,
  investment_loan: <BarChart className="h-4 w-4 text-emerald-500" />,
  bridge_loan: <ArrowRightLeft className="h-4 w-4 text-indigo-500" />,
  commercial_loan: <Building className="h-4 w-4 text-violet-500" />,
  construction_loan: <Hammer className="h-4 w-4 text-fuchsia-500" />,
  refinancing: <RefreshCcw className="h-4 w-4 text-sky-500" />,
  business_loan: <Briefcase className="h-4 w-4 text-teal-500" />,
  other: <HelpCircle className="h-4 w-4 text-gray-500" />
};

interface SortConfig {
  key: 'date' | 'amount' | 'description';
  direction: 'asc' | 'desc';
}

interface AdvancedFilters {
  dateRange: { start: Date | null; end: Date | null };
  amountRange: { min: number | null; max: number | null };
  categories: string[];
  paymentMethods: string[];
  status: string[];
  type: string | null;
  grouping: 'property-type-category' | 'property-category' | 'type-category' | 
            'category' | 'property-type' | 'property' | 'type' | 'month' | 
            'month-category' | 'month-type' | 'month-property' | 
            'credit-type' | 'payment-method' | 'credit-category' | 'none';
  sortByDate: 'asc' | 'desc' | null;
  sortByPeriod: 'day' | 'week' | 'month' | 'year' | null;
  selectedDates: Date[];
}

// Créer un type d'utilitaire pour gérer les valeurs undefined
type SafeAdvancedFilters = Omit<AdvancedFilters, 'selectedDates'> & {
  selectedDates: (Date | undefined)[];
};

const filterTransactions = (transactions: FormattedTransaction[], filters: TransactionFilters): FormattedTransaction[] => {
  console.log("Filtrage de", transactions.length, "transactions avec les filtres:", filters);
  
  return transactions.filter(transaction => {
    // Log pour débogage: afficher chaque transaction avec sa date
    console.log(`Vérification transaction ID ${transaction.id}, date: ${transaction.date}, status: ${transaction.status}`);
    
    // Filtre par date - seulement si les deux valeurs sont définies
    if (filters.dateRange?.from && filters.dateRange?.to) {
      const transactionDate = new Date(transaction.date);
      const startDate = new Date(filters.dateRange.from);
      const endDate = new Date(filters.dateRange.to);
      
      // Convertir les dates au début et à la fin de la journée pour une comparaison plus précise
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`Comparaison de dates - Transaction: ${transactionDate.toISOString()}, Début: ${startDate.toISOString()}, Fin: ${endDate.toISOString()}`);
      
      // Vérifier si la date de la transaction est dans la plage
      if (transactionDate < startDate || transactionDate > endDate) {
        console.log(`Transaction ${transaction.id} exclue par filtre de date`);
        return false;
      }
    }

    if (filters.type !== 'all' && transaction.type !== filters.type) {
      console.log(`Transaction ${transaction.id} exclue par filtre de type`);
      return false;
    }

    if (filters.category !== 'all' && transaction.category !== filters.category) {
      console.log(`Transaction ${transaction.id} exclue par filtre de catégorie`);
      return false;
    }

    if (filters.property !== 'all' && transaction.propertyName !== filters.property) {
      console.log(`Transaction ${transaction.id} exclue par filtre de propriété`);
      return false;
    }

    if (filters.paymentMethod !== 'all' && transaction.paymentMethod !== filters.paymentMethod) {
      console.log(`Transaction ${transaction.id} exclue par filtre de méthode de paiement`);
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matches = (
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.propertyName?.toLowerCase().includes(searchLower) ||
        transaction.tenantName?.toLowerCase().includes(searchLower) ||
        transaction.formattedAmount.toLowerCase().includes(searchLower)
      );
      
      if (!matches) {
        console.log(`Transaction ${transaction.id} exclue par filtre de recherche`);
        return false;
      }
      return matches;
    }

    console.log(`Transaction ${transaction.id} incluse dans les résultats filtrés`);
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

const groupTransactions = (transactions: FormattedTransaction[], filters: TransactionFilters, advancedFilters: AdvancedFilters): GroupedTransaction[] => {
  // Utilisons un cache pour garder les résultats précédents des opérations coûteuses
  const memoizedDateMap = new Map<number, { 
    date: Date, 
    monthKey: string, 
    yearKey: string, 
    dayKey: string, 
    weekKey: string 
  }>();
  
  // Filtrons les transactions une seule fois
  let filteredTransactions = filterTransactions(transactions, filters);
  
  // Prétraitement des dates pour toutes les transactions en une seule passe
  filteredTransactions.forEach(transaction => {
    if (!memoizedDateMap.has(transaction.id)) {
      const date = new Date(transaction.date);
      // Utilisons des valeurs précalculées pour les opérations fréquentes
      memoizedDateMap.set(transaction.id, {
        date,
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        yearKey: `${date.getFullYear()}`,
        dayKey: date.toISOString().split('T')[0],
        weekKey: `${date.getFullYear()}-${String(Math.floor(date.getDate() / 7))}`
      });
    }
  });
  
  // Optimisations pour les tris et filtres en utilisant le cache
  if (advancedFilters.sortByDate) {
    // Tri optimisé par date
    filteredTransactions.sort((a, b) => {
      const dateA = memoizedDateMap.get(a.id)?.date.getTime() || 0;
      const dateB = memoizedDateMap.get(b.id)?.date.getTime() || 0;
      return advancedFilters.sortByDate === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }
  
  if (advancedFilters.sortByPeriod) {
    // Tri optimisé par période
    filteredTransactions.sort((a, b) => {
      let periodA = '';
      let periodB = '';
      
      const aInfo = memoizedDateMap.get(a.id);
      const bInfo = memoizedDateMap.get(b.id);
      
      if (!aInfo || !bInfo) return 0;
      
      switch (advancedFilters.sortByPeriod) {
        case 'day': 
          periodA = aInfo.dayKey;
          periodB = bInfo.dayKey;
          break;
        case 'week':
          periodA = aInfo.weekKey;
          periodB = bInfo.weekKey;
          break;
        case 'month':
          periodA = aInfo.monthKey;
          periodB = bInfo.monthKey;
          break;
        case 'year':
          periodA = aInfo.yearKey;
          periodB = bInfo.yearKey;
          break;
      }
      
      return periodA.localeCompare(periodB);
    });
  }
  
  // Optimisation: précalculer les dates sélectionnées pour le filtrage
  if (advancedFilters.selectedDates.length > 0) {
    const selectedDateStrings = new Set(
      advancedFilters.selectedDates
        .map(date => date.toISOString().split('T')[0])
    );
    
    filteredTransactions = filteredTransactions.filter(transaction => {
      const dayKey = memoizedDateMap.get(transaction.id)?.dayKey;
      return dayKey && selectedDateStrings.has(dayKey);
    });
  }
  
  // Cas simple - pas de regroupement
  // Utiliser une assertion de type pour éviter l'erreur de linter
  const groupingType = advancedFilters.grouping as string;
  if (groupingType === 'none') {
    return filteredTransactions.map(transaction => ({
      propertyId: transaction.propertyId,
      propertyName: transaction.propertyName,
      type: transaction.type,
      category: transaction.category as keyof typeof categoryLabels,
      totalAmount: Number(transaction.amount),
      transactionCount: 1,
      transactions: [transaction],
      isExpanded: false
    }));
  }
  
  // Groupement optimisé
  const grouped: Record<string, GroupedTransaction> = {};
  
  // Boucle optimisée - une seule passe par transaction
  for (const transaction of filteredTransactions) {
    // Calculer la clé de regroupement une seule fois par transaction
    let key = '';
    const dateInfo = memoizedDateMap.get(transaction.id);
    const monthKey = dateInfo?.monthKey || '';
    
    // Utiliser une assertion de type pour éviter les erreurs de linter
    const groupingType = advancedFilters.grouping as string;
    
    // Créer des clés différentes selon le type de regroupement
    if (groupingType === 'property-type-category') {
      key = `${transaction.propertyId}-${transaction.type}-${transaction.category}`;
    } else if (groupingType === 'property-category') {
      key = `${transaction.propertyId}-${transaction.category}`;
    } else if (groupingType === 'type-category') {
      key = `${transaction.type}-${transaction.category}`;
    } else if (groupingType === 'category') {
      key = transaction.category;
    } else if (groupingType === 'property-type') {
      key = `${transaction.propertyId}-${transaction.type}`;
    } else if (groupingType === 'property') {
      key = `${transaction.propertyId}`;
    } else if (groupingType === 'type') {
      key = transaction.type;
    } else if (groupingType === 'month') {
      key = monthKey;
    } else if (groupingType === 'month-category') {
      key = `${monthKey}-${transaction.category}`;
    } else if (groupingType === 'month-type') {
      key = `${monthKey}-${transaction.type}`;
    } else if (groupingType === 'month-property') {
      key = `${monthKey}-${transaction.propertyId}`;
    } else if (groupingType === 'credit-type') {
      key = transaction.type === 'credit' ? transaction.category : transaction.type;
    } else if (groupingType === 'credit-category') {
      key = transaction.type === 'credit' ? `credit-${transaction.category}` : transaction.category;
    } else if (groupingType === 'payment-method') {
      key = transaction.paymentMethod || 'unknown';
    } else if (groupingType === 'none') {
      // Pour "aucun regroupement", on utilise l'ID de transaction comme clé
      key = `transaction-${transaction.id}`;
    } else {
      // Cas par défaut, ne devrait jamais arriver
      key = `${transaction.id}`;
    }
    
    // Créer ou mettre à jour le groupe
    if (!grouped[key]) {
      grouped[key] = {
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
    
    // Mise à jour des agrégations
    grouped[key].totalAmount += Number(transaction.amount);
    grouped[key].transactionCount++;
    grouped[key].transactions.push(transaction);
  }
  
  // Finalisation
  const groups = Object.values(grouped);
  
  // Optimisation: trier toutes les transactions une seule fois
  for (const group of groups) {
    group.transactions.sort((a, b) => {
      const dateA = memoizedDateMap.get(a.id)?.date.getTime() || 0;
      const dateB = memoizedDateMap.get(b.id)?.date.getTime() || 0;
      return dateB - dateA; // tri par date décroissante
    });
  }

  // Assurons-nous de toujours retourner un tableau de GroupedTransaction
  return groups;
};

const exportToCSV = (transactions: FormattedTransaction[]) => {
  // Préparer les données pour l'export CSV (Date, Propriété, Description, Catégorie, Type, Méthode, Montant)
  const csvData = transactions.map(t => [
    format(new Date(t.date), 'dd/MM/yyyy'),
    t.propertyName || '-',
    t.description || '-',
    categoryLabels[t.category as TransactionCategory] || '-',
    t.type === 'income' ? 'Revenu' : t.type === 'expense' ? 'Dépense' : 'Crédit',
    paymentMethodLabels[t.paymentMethod as keyof typeof paymentMethodLabels] || '-',
    t.formattedAmount
  ]);
  
  // Ajouter l'en-tête
  csvData.unshift(['Date', 'Propriété', 'Description', 'Catégorie', 'Type', 'Méthode', 'Montant']);
  
  // Convertir les données en format CSV
  let csvContent = csvData.map(row => row.map(cell => {
    // Échapper les guillemets et entourer de guillemets si contient des virgules
    let cellValue = String(cell || '');
    if (cellValue.includes('"')) {
      cellValue = cellValue.replace(/"/g, '""');
    }
    if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
      cellValue = `"${cellValue}"`;
    }
    return cellValue;
  }).join(',')).join('\n');
  
  // Créer un blob avec l'encodage UTF-8 pour supporter les caractères français
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
  
  // Télécharger le fichier
  saveAs(blob, `transactions_${format(new Date(), 'dd-MM-yyyy')}.csv`);
};

const exportToPdf = (transactions: FormattedTransaction[]) => {
  try {
    // Récupération de la configuration PDF depuis localStorage
    let pdfConfig = {
      companyName: "ImmoVault",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      useLogo: true,
      logoPosition: "left" as "left" | "center" | "right",
      headerColor: "#4B70E2",
      footerText: "Document généré par ImmoVault",
      includeDateInHeader: true,
    };

    // Récupérer les paramètres personnalisés si disponibles
    const savedConfig = localStorage.getItem('pdfConfig');
    if (savedConfig) {
      pdfConfig = { ...pdfConfig, ...JSON.parse(savedConfig) };
    }
    
    // Récupérer le logo s'il existe
    const savedLogo = localStorage.getItem('pdfLogo');
    
    // Création du PDF avec jsPDF
    const doc = new jsPDF();
    
    // Fonction pour convertir couleur hex en RGB
    const hexToRgb = (hex: string) => {
      hex = hex.replace(/^#/, '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return {r, g, b, array: [r, g, b] as [number, number, number]};
    };
    
    // Configuration de la page PDF
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Ajouter l'en-tête avec la couleur personnalisée
    const headerColor = hexToRgb(pdfConfig.headerColor);
    doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    // Ajouter le logo si activé
    if (pdfConfig.useLogo && savedLogo) {
      let xPosition = 15; // default left
      
      if (pdfConfig.logoPosition === "center") {
        xPosition = pageWidth / 2 - 10;
      } else if (pdfConfig.logoPosition === "right") {
        xPosition = pageWidth - 40;
      }
      
      doc.addImage(savedLogo, 'PNG', xPosition, 5, 20, 20);
    }
    
    // Ajouter le nom de l'entreprise
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    
    // Positionner le texte en fonction du logo
    let textX = 15;
    
    if (pdfConfig.useLogo && savedLogo) {
      if (pdfConfig.logoPosition === "left") {
        textX = 40;
      } else if (pdfConfig.logoPosition === "center") {
        textX = 15;
      }
    }
    
    doc.text(pdfConfig.companyName, textX, 16);
    
    // Ajouter la date si activé
    if (pdfConfig.includeDateInHeader) {
      doc.setFontSize(10);
      const today = new Date();
      const dateStr = format(today, 'dd MMMM yyyy', { locale: fr });
      doc.text(`Généré le ${dateStr}`, pageWidth - 60, 10);
    }
    
    // Titre du document
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("Liste des transactions", 15, 40);
    
    // Information de la société sous le titre
    let yPos = 48;
    if (pdfConfig.companyAddress || pdfConfig.companyPhone || pdfConfig.companyEmail) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      if (pdfConfig.companyAddress) {
        yPos += 5;
        doc.text(pdfConfig.companyAddress, 15, yPos);
      }
      
      if (pdfConfig.companyPhone) {
        yPos += 4;
        doc.text(`Tél: ${pdfConfig.companyPhone}`, 15, yPos);
      }
      
      if (pdfConfig.companyEmail) {
        yPos += 4;
        doc.text(`Email: ${pdfConfig.companyEmail}`, 15, yPos);
      }
      
      yPos += 8;
    } else {
      yPos += 10;
    }
    
    // Préparation des données pour le tableau
    const tableData = transactions.map(transaction => [
      format(new Date(transaction.date), 'dd/MM/yyyy'),
      transaction.propertyName || '-',
      transaction.description || '-',
      categoryLabels[transaction.category as TransactionCategory] || '-',
      transaction.type === 'income' ? 'Revenu' : transaction.type === 'expense' ? 'Dépense' : 'Crédit',
      paymentMethodLabels[transaction.paymentMethod as keyof typeof paymentMethodLabels] || '-',
      transaction.formattedAmount
    ]);
    
    // Définir les colonnes
    const tableColumns = [
      'Date', 
      'Propriété', 
      'Description', 
      'Catégorie', 
      'Type', 
      'Méthode', 
      'Montant'
    ];
    
    // Créer le tableau
    autoTable(doc, {
      head: [tableColumns],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: headerColor.array,
        textColor: [255, 255, 255] 
      },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      columnStyles: {
        0: { fontStyle: 'bold' }, // Date en gras
        6: { fontStyle: 'bold' }  // Montant en gras
      },
      margin: { top: 35 }
    });
    
    // Ajouter un pied de page avec numéros de page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      
      // Pied de page personnalisé
      if (pdfConfig.footerText) {
        doc.text(pdfConfig.footerText, pageWidth / 2, pageHeight - 10, { align: 'center' } as any);
      }
      
      // Numéro de page
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 10);
    }
    
    // Télécharger le fichier PDF
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    doc.save(`transactions_${dateStr}.pdf`);
    
    toast({
      title: "Export PDF réussi",
      description: "Le document a été généré avec succès",
      variant: "default"
    });
  } catch (error) {
    console.error('Erreur export PDF:', error);
    toast({
      title: "Erreur d'exportation",
      description: "Impossible de générer le PDF. Veuillez réessayer.",
      variant: "destructive"
    });
  }
};

const exportGroupToCSV = (group: GroupedTransaction) => {
  const csvContent = [
    ['Date', 'Propriété', 'Description', 'Catégorie', 'Type', 'Méthode', 'Montant'],
    ...group.transactions.map(t => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.propertyName || '',
      t.description || '',
      categoryLabels[t.category as TransactionCategory],
      t.type === 'income' ? 'Revenu' : t.type === 'expense' ? 'Dépense' : 'Crédit',
      paymentMethodLabels[t.paymentMethod as keyof typeof paymentMethodLabels] || '',
      t.formattedAmount
    ])
  ];

  const csvString = csvContent.map(row => row.join(',')).join('\n');
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
  
  // Télécharger le fichier
  saveAs(blob, `transactions_${group.propertyName}_${format(new Date(), 'dd-MM-yyyy')}.csv`);
};

// Ajouter l'interface DocumentTypeConfig
interface DocumentTypeConfig {
  [key: string]: {
    label: string;
    icon: JSX.Element;
  };
}

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
    status: [],
    type: null,
    grouping: 'property-type-category',
    sortByDate: 'desc',
    sortByPeriod: null,
    selectedDates: []
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAdvancedFiltersDialog, setShowAdvancedFiltersDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [animatingAction, setAnimatingAction] = useState<'cancel' | 'archive' | 'delete' | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [transactionsToEdit, setTransactionsToEdit] = useState<FormattedTransaction[]>([]);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(new Set());
  const [newCategory, setNewCategory] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
  const [key, setKey] = useState(0);
  const hasCleanedUp = useRef(false);
  const [displayedTransactionsCount, setDisplayedTransactionsCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [documentTypes, setDocumentTypes] = useState<Map<File, string>>(new Map());
  const [newlyUploadedDocIds, setNewlyUploadedDocIds] = useState<number[]>([]);
  const [documentNames, setDocumentNames] = useState(new Map());
  const [editingPendingDocName, setEditingPendingDocName] = useState<File | null>(null);
  const [pendingDocumentNames, setPendingDocumentNames] = useState<Map<File, string>>(new Map());
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [showTransactionDeleteConfirm, setShowTransactionDeleteConfirm] = useState(false);
  const [confirmTransactionDeleteChecked, setConfirmTransactionDeleteChecked] = useState(false);
  const [isTransactionDeleting, setIsTransactionDeleting] = useState(false);
  const [deleteLinkedDocuments, setDeleteLinkedDocuments] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: folders = [] } = useQuery<any[]>({
    queryKey: ["/api/folders"],
  });
  
  // Récupérer les informations détaillées des documents
  const { data: documentsInfo = [] } = useQuery<any[]>({
    queryKey: ["/api/documents"],
    enabled: !!selectedTransaction?.documentIds?.length,
  });
  
  // Fonction pour trouver le dossier associé à un document
  const getDocumentFolder = (docId: number) => {
    const doc = documentsInfo.find(d => d.id === docId);
    if (doc?.folderId) {
      const folder = folders.find(f => f.id === doc.folderId);
      return folder?.name || null;
    }
    return null;
  };
  
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
    setTransactionToDelete(transactionId);
    setShowTransactionDeleteConfirm(true);
    setConfirmTransactionDeleteChecked(false);
  };
  
  const executeTransactionDeletion = async () => {
    if (!transactionToDelete) return;
    
    try {
      setIsTransactionDeleting(true);
      
      // Récupérer les informations de la transaction avant suppression
      let documentIds: number[] = [];
      const transactionToDeleteInfo = transactions.find(t => t.id === transactionToDelete);
      
      if (transactionToDeleteInfo) {
        if (transactionToDeleteInfo.documentId) {
          documentIds.push(transactionToDeleteInfo.documentId);
        }
        if (transactionToDeleteInfo.documentIds && Array.isArray(transactionToDeleteInfo.documentIds)) {
          documentIds = [...documentIds, ...transactionToDeleteInfo.documentIds];
        }
      }
      
      // Supprimer la transaction
      const response = await fetch(`/api/transactions/${transactionToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression de la transaction');

      // Si l'option est cochée et qu'il y a des documents liés, les supprimer
      if (deleteLinkedDocuments && documentIds.length > 0) {
        // Supprimer chaque document
        const deletePromises = documentIds.map(docId => 
          fetch(`/api/documents/${docId}`, {
            method: 'DELETE',
          })
        );
        
        await Promise.all(deletePromises);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      toast({
        title: 'Succès',
        description: `La transaction a été supprimée${deleteLinkedDocuments && documentIds.length > 0 ? ' avec ses documents' : ''}`,
      });
      
      setIsTransactionDeleting(false);
      setShowTransactionDeleteConfirm(false);
      setTransactionToDelete(null);
      setDeleteLinkedDocuments(false);
    } catch (error) {
      setIsTransactionDeleting(false);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la transaction',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditTransaction = (transaction: FormattedTransaction) => {
    setSelectedTransaction(transaction);
    // Réinitialiser les états liés aux documents
    setPendingFiles([]);
    setDocumentTypes(new Map());
    setNewlyUploadedDocIds([]);
    setShowEditDialog(true);
  };

  // Mémoiser les transactions filtrées par statut
  const completedTransactions = useMemo(() => 
    transactions.filter(t => t.status === 'completed'),
    [transactions]
  );
  
  const pendingTransactions = useMemo(() => 
    transactions.filter(t => t.status === 'pending'),
    [transactions]
  );
  
  const cancelledTransactions = useMemo(() => 
    transactions.filter(t => t.status === 'cancelled'),
    [transactions]
  );

  // Mémoiser les résultats des groupements
  const groupedCompletedTransactions = useMemo(() => 
    groupTransactions(completedTransactions, filters, advancedFilters),
    [completedTransactions, filters, advancedFilters]
  );
  
  const groupedPendingTransactions = useMemo(() => 
    groupTransactions(pendingTransactions, filters, advancedFilters),
    [pendingTransactions, filters, advancedFilters]
  );
  
  const groupedCancelledTransactions = useMemo(() => 
    groupTransactions(cancelledTransactions, filters, advancedFilters),
    [cancelledTransactions, filters, advancedFilters]
  );
  
  const allGroupedTransactions = useMemo(() => 
    [...groupedCompletedTransactions, ...groupedPendingTransactions, ...groupedCancelledTransactions],
    [groupedCompletedTransactions, groupedPendingTransactions, groupedCancelledTransactions]
  );

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
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const transactionDate = new Date(transaction.date);
        const startDate = new Date(filters.dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filters.dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        
        if (transactionDate < startDate || transactionDate > endDate) {
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
    
    const groupedTransactions = groupTransactions(filteredTransactions, filters, advancedFilters);

    // Fonction pour générer une clé unique pour chaque groupe en fonction du mode de regroupement
    const generateGroupKey = (group: GroupedTransaction): string => {
      // Si le groupe n'a pas de transactions, utiliser une clé générique
      if (group.transactions.length === 0) {
        return `empty-group-${Math.random().toString(36).substring(2, 9)}`;
      }

      // Extraire les informations de la première transaction pour les regroupements basés sur le mois
      const firstTransaction = group.transactions[0];
      const date = new Date(firstTransaction.date);
      const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Assertion de type pour éviter les erreurs avec "none"
      const groupingType = advancedFilters.grouping as string;

      // Créer des clés spécifiques en fonction du mode de regroupement
      switch (groupingType) {
        case 'month':
          return `month-${monthString}`;
        case 'month-category':
          return `month-${monthString}-category-${group.category}`;
        case 'month-type':
          return `month-${monthString}-type-${group.type}`;
        case 'month-property':
          return `month-${monthString}-property-${group.propertyId || 'none'}`;
        case 'property-type-category':
          return `property-${group.propertyId || 'none'}-type-${group.type}-category-${group.category}`;
        case 'property-category':
          return `property-${group.propertyId || 'none'}-category-${group.category}`;
        case 'type-category':
          return `type-${group.type}-category-${group.category}`;
        case 'category':
          return `category-${group.category}`;
        case 'property-type':
          return `property-${group.propertyId || 'none'}-type-${group.type}`;
        case 'property':
          return `property-${group.propertyId || 'none'}`;
        case 'type':
          return `type-${group.type}`;
        case 'none':
          // Pour "aucun regroupement", utiliser l'ID de la transaction directement
          return `single-transaction-${firstTransaction.id}`;
        default:
          // Clé générique au cas où
          return `group-${group.propertyId || 'none'}-${group.type}-${group.category}`;
      }
    };

    // Modifier toggleGroup pour qu'elle n'ouvre que le groupe spécifique
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

    // Ajouter l'observateur d'intersection
    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (first.isIntersecting && !isLoadingMore && groupedTransactions.length > displayedTransactionsCount) {
            setIsLoadingMore(true);
            // Simuler un délai pour une meilleure expérience utilisateur
            setTimeout(() => {
              setDisplayedTransactionsCount(prev => prev + 20);
              setIsLoadingMore(false);
            }, 500);
          }
        },
        { threshold: 0.1 }
      );

      if (loadMoreRef.current) {
        observer.observe(loadMoreRef.current);
      }

      return () => {
        if (loadMoreRef.current) {
          observer.unobserve(loadMoreRef.current);
        }
      };
    }, [displayedTransactionsCount, isLoadingMore, groupedTransactions.length]);

    // Ajouter l'observateur de défilement pour le bouton "Retour en haut"
    useEffect(() => {
      const handleScroll = () => {
        setShowScrollTop(window.scrollY > 300);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white dark:bg-card">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-card dark:to-card/80 border-b border-gray-200 dark:border-border">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-gray-600 dark:text-muted-foreground">
            {description} • {displayedTransactionsCount} sur {groupedTransactions.length} transactions affichées
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50 dark:bg-muted/20 dark:border-b dark:border-gray-700">
              <TableRow className="hover:bg-gray-50/80 dark:hover:bg-muted/30">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[200px] dark:text-white">Propriété</TableHead>
                <TableHead className="dark:text-white">Description</TableHead>
                <TableHead className="dark:text-white">Catégorie</TableHead>
                <TableHead className="dark:text-white">Type</TableHead>
                <TableHead className="dark:text-white">Montant</TableHead>
                <TableHead className="dark:text-white">Méthode</TableHead>
                <TableHead className="dark:text-white">Statut</TableHead>
                <TableHead className="w-[100px] dark:text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {groupedTransactions.slice(0, displayedTransactionsCount).map((group) => {
                  // Utiliser la nouvelle fonction pour générer une clé unique
                  const groupKey = generateGroupKey(group);
                  const isExpanded = expandedGroups.has(groupKey);
                  
                  return (
                    <Fragment key={groupKey}>
                  <motion.tr
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
                          <Badge variant="outline" className={cn("capitalize", typeColors[group.type], "dark:text-white")}>
                            {categoryLabels[group.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                          <Badge variant="outline" className={cn("capitalize", typeColors[group.type], "dark:text-white")}>
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
                          <Badge className={cn("capitalize", statusColors[group.transactions[0].status as TransactionStatus])}>
                            {statusLabels[group.transactions[0].status as keyof typeof statusLabels]}
                            </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                            {(() => {
                              // Code existant pour la gestion des documents
                              const hasDocumentId = group.transactions[0].documentId !== null && group.transactions[0].documentId !== undefined;
                              const hasDocumentIds = group.transactions[0].documentIds && 
                                                   Array.isArray(group.transactions[0].documentIds) && 
                                                   group.transactions[0].documentIds.length > 0;
                              
                              // Vérifier la sécurité de l'accès à documentIds (TS non-null assertion)
                              const docIds = group.transactions[0].documentIds || [];
                              
                              // Si on a une documentId mais pas de documentIds array, l'ajouter à documentIds
                              const computedDocIds = hasDocumentId && !hasDocumentIds && group.transactions[0].documentId 
                                ? [group.transactions[0].documentId] 
                                : docIds;
                              
                              const shouldShowPreviewButton = hasDocumentId || hasDocumentIds || computedDocIds.length > 0;
                              
                              return shouldShowPreviewButton ? (
                            <Button
                              variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Gestion à la fois du documentId unique et des documentIds multiples
                                    if (computedDocIds.length > 0) {
                                        // Passer tous les documentIds pour prévisualiser tous les documents
                                      handlePreviewDocument(computedDocIds[0], computedDocIds);
                                    } else if (hasDocumentId && group.transactions[0].documentId) {
                                        // Si on a juste un documentId, on le passe
                                      handlePreviewDocument(group.transactions[0].documentId);
                                      }
                                    }}
                                    className="hover:bg-blue-50 relative"
                                  title={computedDocIds.length > 1 
                                    ? `Voir les documents (${computedDocIds.length})` 
                                      : "Voir le document"}
                                  >
                                  <FileText className="h-4 w-4" />
                                  {computedDocIds.length > 1 && (
                                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                      {computedDocIds.length}
                                      </span>
                                    )}
                            </Button>
                              ) : null;
                            })()}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {group.transactionCount === 1 ? (
                              <DropdownMenuItem onClick={() => handleEditTransaction(group.transactions[0])}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier la transaction
                              </DropdownMenuItem>
                              ) : (
                                    <DropdownMenuItem onClick={() => handleEditGroupTransactions(group)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Modifier les transactions
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => exportToPdf(group.transactions)}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Exporter en PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => exportToCSV(group.transactions)}
                                  >
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Exporter en CSV
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                onClick={() => {
                                  if (group.transactionCount === 1) {
                                    handleDelete(group.transactions[0].id);
                                  } else {
                                    handleDeleteGroup(group);
                                  }
                                }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                {group.transactionCount === 1 ? "Supprimer la transaction" : "Supprimer les transactions"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        </TableCell>
                      </motion.tr>
                      
                      {isExpanded && (
                        <motion.tr
                          key={`${groupKey}-expanded`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-gray-50/50 dark:bg-background/50"
                        >
                          <TableCell colSpan={9} className="p-0">
                            <div className="p-4 space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
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
                                    className="h-8 w-8 p-0 relative"
                                    title="Trier par date"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    {sortConfig.key === 'date' && (
                                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                        {sortConfig.direction === 'asc' 
                                          ? <ChevronUp className="h-2.5 w-2.5 text-white" /> 
                                          : <ChevronDown className="h-2.5 w-2.5 text-white" />
                                        }
                                      </div>
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
                                    className="h-8 w-8 p-0 relative"
                                    title="Trier par montant"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                    {sortConfig.key === 'amount' && (
                                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                        {sortConfig.direction === 'asc' 
                                          ? <ChevronUp className="h-2.5 w-2.5 text-white" /> 
                                          : <ChevronDown className="h-2.5 w-2.5 text-white" />
                                        }
                                      </div>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {sortTransactions(group.transactions, sortConfig).map((transaction, index) => (
                                  <div
                                    key={transaction.id}
                                    className="grid grid-cols-9 items-center p-3 bg-white rounded-md border border-gray-100 hover:bg-gray-50/50 transition-colors gap-x-2 dark:bg-card dark:border-gray-800 dark:hover:bg-gray-900/30"
                                    style={{ gridTemplateColumns: "90px 150px 1fr 90px 90px 90px 90px 90px 80px" }}
                                  >
                                    {/* Colonne 1: Date */}
                                    <div className="text-sm font-medium whitespace-nowrap pl-2">
                                        {format(new Date(transaction.date), 'dd/MM/yyyy')}
                                      </div>
                                    
                                    {/* Colonne 2: Propriété */}
                                    <div className="truncate text-sm pl-1">
                                      {transaction.propertyName || "—"}
                                    </div>
                                    
                                    {/* Colonne 3: Description */}
                                    <div className="text-sm text-gray-600 truncate pr-2">
                                        {transaction.description}
                                      </div>
                                    
                                    {/* Colonne 4: Catégorie */}
                                    <div className="flex justify-center">
                                      <Badge variant="outline" className="text-xs truncate max-w-full">
                                        {categoryLabels[transaction.category as TransactionCategory]}
                                      </Badge>
                                    </div>
                                    
                                    {/* Colonne 5: Type */}
                                    <div className="flex justify-center">
                                      <Badge variant="outline" className={cn(
                                        "text-xs truncate max-w-full",
                                        transaction.type === "income" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                        transaction.type === "expense" ? "bg-rose-50 text-rose-600 border-rose-200" : 
                                        "bg-amber-50 text-amber-600 border-amber-200"
                                      )}>
                                        {transaction.type === "income" ? "Revenu" : 
                                        transaction.type === "expense" ? "Dépense" : "Crédit"}
                                      </Badge>
                                    </div>
                                    
                                    {/* Colonne 6: Montant */}
                                      <div className={cn(
                                      "text-sm font-medium text-center whitespace-nowrap",
                                        transaction.type === "income" ? "text-emerald-600" :
                                          transaction.type === "expense" ? "text-rose-600" : "text-amber-600"
                                      )}>
                                        {transaction.type === "income" ? "+" : "-"}{transaction.formattedAmount}
                                      </div>
                                    
                                    {/* Colonne 7: Méthode */}
                                    <div className="text-sm text-center truncate">
                                      {paymentMethodLabels[transaction.paymentMethod as keyof typeof paymentMethodLabels]}
                                    </div>
                                    
                                    {/* Colonne 8: Statut */}
                                    <div className="flex justify-center">
                                      <Badge className={cn("text-xs truncate max-w-full", statusColors[transaction.status as TransactionStatus])}>
                                        {statusLabels[transaction.status as keyof typeof statusLabels]}
                                      </Badge>
                                    </div>
                                    
                                    {/* Colonne 9: Actions */}
                                    <div className="flex items-center justify-end gap-1 pr-1">
                                      {(() => {
                          const hasDocumentId = transaction.documentId !== null && transaction.documentId !== undefined;
                          const hasDocumentIds = transaction.documentIds && 
                                                Array.isArray(transaction.documentIds) && 
                                                transaction.documentIds.length > 0;
                          
                          const docIds = transaction.documentIds || [];
                          
                          const computedDocIds = hasDocumentId && !hasDocumentIds && transaction.documentId 
                            ? [transaction.documentId] 
                            : docIds;
                          
                          const shouldShowPreviewButton = hasDocumentId || hasDocumentIds || computedDocIds.length > 0;
                          
                          return shouldShowPreviewButton ? (
                          <Button
                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                              if (computedDocIds.length > 0) {
                                handlePreviewDocument(computedDocIds[0], computedDocIds);
                              } else if (hasDocumentId && transaction.documentId) {
                                                handlePreviewDocument(transaction.documentId);
                                              }
                                            }}
                                            className="h-7 w-7 p-0"
                            title={computedDocIds.length > 1 
                              ? `Voir les documents (${computedDocIds.length})` 
                                              : "Voir le document"}
                                          >
                                            <FileText className="h-3.5 w-3.5" />
                                          </Button>
) : null;
                        })()}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                            className="h-7 w-7 p-0"
                                            >
                                            <ChevronDown className="h-3.5 w-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Modifier
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() => exportToPdf([transaction])}
                                            >
                                              <FileText className="h-4 w-4 mr-2" />
                                              Exporter en PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => exportToCSV([transaction])}
                                            >
                                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                                              Exporter en CSV
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() => handleDelete(transaction.id)}
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Supprimer
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                  </div>
                                ))}
                              </div>
                      </div>
                    </TableCell>
                  </motion.tr>
                      )}
                    </Fragment>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
          {groupedTransactions.length > displayedTransactionsCount && (
            <div 
              ref={loadMoreRef} 
              className="p-4 text-center border-t bg-gray-50/50"
            >
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des transactions...
                </div>
              ) : (
                <div className="h-4" /> // Espace vide pour le trigger
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const handlePreviewDocument = async (documentId: number | null, documentIds?: number[]) => {
    if (!documentId && (!documentIds || documentIds.length === 0)) {
      toast({
        title: "Information",
        description: "Aucun document disponible pour cette transaction",
        variant: "default",
      });
      return;
    }
    
    // Utiliser directement les IDs fournis sans vérification préalable
    let validDocumentIds: number[] = [];
    
    if (documentIds && documentIds.length > 0) {
      validDocumentIds = documentIds;
    } 
    else if (documentId) {
      validDocumentIds = [documentId];
    }
    
    // Procéder avec les documents
    setSelectedDocumentIds(validDocumentIds);
    setCurrentDocumentIndex(0);
    setSelectedDocumentId(validDocumentIds[0]);
    setShowPreview(true);

    // Invalider le cache des transactions pour forcer un rafraîchissement
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      console.log(`Suppression du document ${documentId}`);
      
      // Vérifier si c'est un document nouvellement uploadé
      if (newlyUploadedDocIds.includes(documentId)) {
        // Si oui, il suffit de le retirer de la liste sans appel API
        setNewlyUploadedDocIds(prev => prev.filter(id => id !== documentId));
        toast({
          title: 'Succès',
          description: 'Document supprimé avec succès',
        });
        setShowDeleteConfirm(false);
        setDocumentToDelete(null);
        return;
      }
      
      // Sinon, procéder à la suppression via l'API
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

        if (response.ok) {
      toast({
        title: 'Succès',
        description: 'Document supprimé avec succès',
      });
        } else {
          console.warn(`Le document ${documentId} n'a pas pu être supprimé via l'API, mais la référence sera supprimée`);
        }
      } catch (error) {
        console.warn(`Erreur lors de la suppression du document ${documentId}, mais la référence sera supprimée:`, error);
      }

      // Dans tous les cas, supprimer la référence au document dans la transaction
      if (selectedTransaction && selectedTransaction.documentIds) {
        // S'assurer qu'on a bien l'ID du document à supprimer
        const docIdToRemove = documentId;
        
        // Créer un nouveau tableau sans le document à supprimer
        const updatedDocumentIds = selectedTransaction.documentIds.filter(id => id !== docIdToRemove);
        
        console.log(`Document à supprimer: ${docIdToRemove}`);
        console.log(`Documents avant suppression: ${JSON.stringify(selectedTransaction.documentIds)}`);
        console.log(`Documents après suppression: ${JSON.stringify(updatedDocumentIds)}`);
        
        // Mettre à jour l'objet selectedTransaction localement
        setSelectedTransaction(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            documentIds: updatedDocumentIds
          };
        });
        
        // Mettre à jour également la transaction côté serveur
        try {
          const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              documentIds: updatedDocumentIds
            })
          });

          if (!response.ok) {
            console.error('Erreur lors de la mise à jour des documentIds de la transaction');
          }
        } catch (error) {
          console.error('Erreur lors de la mise à jour des documentIds:', error);
        }
      }

      // Supprimer également l'entrée du Map des noms de documents
      setDocumentNames(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentId.toString());
        return newMap;
      });

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

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

    // Au lieu d'uploader immédiatement, on stocke les fichiers pour affichage
    setPendingFiles(prev => [...prev, ...files]);
  };

  // Ajouter la définition de la fonction updateDocumentType
  const updateDocumentType = (file: File, type: string) => {
    setDocumentTypes(prev => {
      const newMap = new Map(prev);
      newMap.set(file, type);
      return newMap;
    });
  };

  const updatePendingDocumentName = (file: File, newName: string) => {
    setPendingDocumentNames(prev => {
      const newMap = new Map(prev);
      newMap.set(file, newName);
      return newMap;
    });
    setEditingPendingDocName(null);
  };

  const handleViewTransaction = (transaction: FormattedTransaction) => {
    console.log('View transaction:', transaction);
  };

  const renderCategoryIcon = (category: keyof typeof categoryLabels) => {
    const IconComponent = transactionIcons[category];
    return IconComponent || <Home className="h-4 w-4 text-blue-500" />;
  };

  const AdvancedFiltersComponent = () => (
    <div className="p-4 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Label>Type de transaction</Label>
          <Select 
            value={advancedFilters.type || 'all'} 
            onValueChange={val => updateAdvancedFilters(prev => ({...prev, type: val === 'all' ? null : val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="income">Revenus</SelectItem>
              <SelectItem value="expense">Dépenses</SelectItem>
              <SelectItem value="credit">Crédits</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Catégories</Label>
          <Select 
            value={advancedFilters.categories?.length === 1 ? advancedFilters.categories[0] : 'all'} 
            onValueChange={val => updateAdvancedFilters(prev => ({...prev, categories: val === 'all' ? [] : [val] }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              
              <SelectGroup>
                <SelectLabel>Revenus</SelectLabel>
                <SelectItem value="rent">Loyer</SelectItem>
                <SelectItem value="security_deposit">Dépôt de garantie</SelectItem>
                <SelectItem value="refund">Remboursement</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="late_fees">Pénalités de retard</SelectItem>
                <SelectItem value="service_fees">Frais de service</SelectItem>
                <SelectItem value="short_term_rental">Location courte durée</SelectItem>
                <SelectItem value="parking_income">Revenus parking/garage</SelectItem>
                <SelectItem value="common_area_income">Revenus espaces communs</SelectItem>
                <SelectItem value="additional_services">Services additionnels</SelectItem>
                <SelectItem value="advertising_income">Revenus publicitaires</SelectItem>
                <SelectItem value="subsidies">Subventions ou aides</SelectItem>
                <SelectItem value="insurance_claims">Indemnités d'assurance</SelectItem>
                <SelectItem value="property_sale">Vente de bien</SelectItem>
                <SelectItem value="application_fees">Frais de dossier</SelectItem>
                <SelectItem value="dividend_income">Revenus de dividendes</SelectItem>
                <SelectItem value="interest_income">Revenus d'intérêts</SelectItem>
                <SelectItem value="rental_equipment">Location d'équipements</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Dépenses principales</SelectLabel>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="insurance">Assurance</SelectItem>
                <SelectItem value="tax">Taxe</SelectItem>
                <SelectItem value="utility">Charges générales</SelectItem>
                <SelectItem value="management_fee">Frais de gestion</SelectItem>
                <SelectItem value="legal_fee">Frais juridiques</SelectItem>
                <SelectItem value="renovation">Rénovation</SelectItem>
                <SelectItem value="condominium_fee">Charges copropriété</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Factures & Charges</SelectLabel>
                <SelectItem value="utilities_water">Eau</SelectItem>
                <SelectItem value="utilities_electricity">Électricité</SelectItem>
                <SelectItem value="utilities_gas">Gaz</SelectItem>
                <SelectItem value="utilities_internet">Internet/Télécom</SelectItem>
                <SelectItem value="cleaning">Nettoyage</SelectItem>
                <SelectItem value="landscaping">Espaces verts</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Autres dépenses</SelectLabel>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="furnishing">Ameublement</SelectItem>
                <SelectItem value="security">Sécurité</SelectItem>
                <SelectItem value="accounting">Comptabilité</SelectItem>
                <SelectItem value="consulting">Conseil</SelectItem>
                <SelectItem value="travel">Déplacement</SelectItem>
                <SelectItem value="equipment">Équipement</SelectItem>
                <SelectItem value="penalty_fees">Frais de pénalité</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Crédit</SelectLabel>
                <SelectItem value="mortgage">Crédit immobilier</SelectItem>
                <SelectItem value="equipment_loan">Prêt équipement</SelectItem>
                <SelectItem value="investment_loan">Prêt investissement</SelectItem>
                <SelectItem value="bridge_loan">Prêt relais</SelectItem>
                <SelectItem value="commercial_loan">Prêt commercial</SelectItem>
                <SelectItem value="construction_loan">Prêt construction</SelectItem>
                <SelectItem value="refinancing">Refinancement</SelectItem>
                <SelectItem value="business_loan">Prêt professionnel</SelectItem>
              </SelectGroup>
              
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Méthodes de paiement</Label>
          <Select 
            value={advancedFilters.paymentMethods?.length === 1 ? advancedFilters.paymentMethods[0] : 'all'} 
            onValueChange={val => updateAdvancedFilters(prev => ({...prev, paymentMethods: val === 'all' ? [] : [val] }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les méthodes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les méthodes</SelectItem>
              
              <SelectGroup>
                <SelectLabel>Paiements Courants</SelectLabel>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="direct_debit">Prélèvement automatique</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Cartes</SelectLabel>
                <SelectItem value="credit_card">Carte de crédit</SelectItem>
                <SelectItem value="debit_card">Carte de débit</SelectItem>
                <SelectItem value="prepaid_card">Carte prépayée</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Paiements Électroniques</SelectLabel>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="sepa">SEPA</SelectItem>
                <SelectItem value="mobile_payment">Paiement mobile</SelectItem>
              </SelectGroup>
              
              <SelectGroup>
                <SelectLabel>Autres</SelectLabel>
                <SelectItem value="wire_transfer">Virement international</SelectItem>
                <SelectItem value="other">Autre méthode</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Regroupement</Label>
          <Select 
            value={advancedFilters.grouping || 'none'} 
            onValueChange={val => updateAdvancedFilters(prev => ({...prev, grouping: val as AdvancedFilters['grouping'] }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Aucun regroupement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun regroupement</SelectItem>
              <SelectItem value="property">Par propriété</SelectItem>
              <SelectItem value="type">Par type</SelectItem>
              <SelectItem value="category">Par catégorie</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
              <SelectItem value="payment-method">Par méthode de paiement</SelectItem>
              <SelectGroup>
                <SelectLabel>Regroupements composés</SelectLabel>
                <SelectItem value="property-type">Propriété puis Type</SelectItem>
                <SelectItem value="type-category">Type puis Catégorie</SelectItem>
                <SelectItem value="property-category">Propriété puis Catégorie</SelectItem>
                <SelectItem value="month-category">Mois puis Catégorie</SelectItem>
                <SelectItem value="credit-type">Crédit puis Type</SelectItem>
                <SelectItem value="credit-category">Crédit puis Catégorie</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Statut</Label>
          <Select 
            value={advancedFilters.status?.length === 1 ? advancedFilters.status[0] : 'all'} 
            onValueChange={val => updateAdvancedFilters(prev => ({...prev, status: val === 'all' ? [] : [val] }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="completed">Complété</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
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

  const handleEditGroupTransactions = (group: GroupedTransaction) => {
    setSelectedTransaction(group.transactions[0]);
    setTransactionsToEdit(group.transactions);
    setShowBulkEditDialog(true);
  };

  const toggleTransactionSelection = (transactionId: number) => {
    setSelectedTransactionIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(transactionId)) {
        newSelection.delete(transactionId);
      } else {
        newSelection.add(transactionId);
      }
      return newSelection;
    });
  };

  const handleBulkCategoryChange = () => {
    // Cette fonction n'est plus nécessaire avec la nouvelle interface
    console.log("Sélection de catégorie dans la nouvelle interface");
  };

  const handleBulkStatusChange = () => {
    // Cette fonction n'est plus nécessaire avec la nouvelle interface
    console.log("Sélection de statut dans la nouvelle interface");
  };

  const handleBulkPaymentMethodChange = () => {
    // Cette fonction n'est plus nécessaire avec la nouvelle interface
    console.log("Sélection de méthode de paiement dans la nouvelle interface");
  };

  const toggleAllTransactions = () => {
    if (selectedTransactionIds.size === transactionsToEdit.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(transactionsToEdit.map(t => t.id)));
    }
  };

  const applyBulkChanges = async () => {
    if (selectedTransactionIds.size === 0) {
      toast({
        title: "Attention",
        description: "Aucune transaction sélectionnée",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const updateData: any = {};
      
      if (newCategory) {
        console.log("Mise à jour de la catégorie:", newCategory);
        updateData.category = newCategory;
      }
      
      if (newStatus) {
        console.log("Mise à jour du statut:", newStatus);
        updateData.status = newStatus;
      }
      
      if (newPaymentMethod) {
        console.log("Mise à jour de la méthode de paiement:", newPaymentMethod);
        updateData.paymentMethod = newPaymentMethod;
      }
      
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Information",
          description: "Veuillez sélectionner au moins une modification à appliquer (catégorie, statut ou méthode de paiement)",
          variant: "default"
        });
        setIsLoading(false);
        return;
      }
      
      console.log('Mise à jour groupée pour', selectedTransactionIds.size, 'transactions avec:', updateData);
      
      const promises = Array.from(selectedTransactionIds).map(id => 
        fetch(`/api/transactions/${id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(updateData)
        })
      );
      
      const results = await Promise.all(promises);
      console.log("Résultats des mises à jour:", results.map(r => r.status));
      
      // Forcer un rafraîchissement complet des données pour garantir un regroupement correct
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/transactions'],
        refetchType: 'all'
      });
      
      // Invalider également le cache des documents pour qu'ils apparaissent dans la section Documents
      await queryClient.invalidateQueries({
        queryKey: ['/api/documents'],
        refetchType: 'all'
      });
      
      toast({
        title: 'Succès',
        description: `${selectedTransactionIds.size} transactions mises à jour avec succès`,
      });
      
      setNewCategory("");
      setNewStatus("");
      setNewPaymentMethod("");
      setShowBulkEditDialog(false);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour groupée:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les transactions. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!showPreview && !hasCleanedUp.current) {
      // Nettoyer tous les états liés aux documents
      setSelectedDocumentId(null);
      setSelectedDocumentIds([]);
      setCurrentDocumentIndex(0);
      setShowEditDialog(false);
      setSelectedTransaction(null);
      setIsUploading(false);
      setDocumentToDelete(null);
      setShowDeleteConfirm(false);
      setSelectedFolderId(null);
      setIsCreatingFolder(false);
      setNewFolderName("");
      setExpandedGroups(new Set());
      setSortConfig({ key: 'date', direction: 'desc' });
      setAdvancedFilters({
        dateRange: { start: null, end: null },
        amountRange: { min: null, max: null },
        categories: [],
        paymentMethods: [],
        status: [],
        type: null,
        grouping: 'property-type-category',
        sortByDate: 'desc',
        sortByPeriod: null,
        selectedDates: []
      });
      setShowAdvancedFilters(false);
      setSearchQuery("");
      setAnimatingAction(null);
      setAnimationComplete(false);
      setTransactionsToEdit([]);
      setShowBulkEditDialog(false);
      setSelectedTransactionIds(new Set());
      setNewCategory("");
      setNewStatus("");
      setNewPaymentMethod("");
      hasCleanedUp.current = true;
    } else if (showPreview) {
      hasCleanedUp.current = false;
    }
  }, [showPreview]);

  // Nous devons fixer le problème dans la mise à jour des filtres avancés à la ligne qui cause l'erreur
  // Remplacer setAdvancedFilters par une version qui s'assure que selectedDates est toujours un tableau de Date sans undefined
  const updateAdvancedFilters = (newFilters: SafeAdvancedFilters | ((prev: AdvancedFilters) => SafeAdvancedFilters)) => {
    if (typeof newFilters === 'function') {
      setAdvancedFilters(prev => {
        const result = newFilters(prev);
        // Assurons-nous que selectedDates ne contient pas de undefined
        return {
          ...result,
          selectedDates: result.selectedDates.filter((date): date is Date => date !== undefined)
        };
      });
    } else {
      setAdvancedFilters({
        ...newFilters,
        selectedDates: newFilters.selectedDates.filter((date): date is Date => date !== undefined)
      });
    }
  };

  // ... et pour les endroits où nous avons besoin de travailler avec les dates potentiellement undefined
  const safeGetSelectedDates = (dates: (Date | undefined)[]): Date[] => {
    return dates.filter((date): date is Date => date !== undefined);
  };

  // Fonction pour gérer les changements de dates sélectionnées de manière optimisée
  const handleSelectedDatesChange = (index: number, date?: Date) => {
    updateAdvancedFilters(prev => {
      const newDates = [...prev.selectedDates];
      if (date) {
        newDates[index] = date;
      } else {
        if (index < newDates.length) {
          newDates.splice(index, 1);
        }
      }
      return {
        ...prev,
        selectedDates: newDates
      };
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // États liés à la suppression de groupe
  const [groupToDelete, setGroupToDelete] = useState<GroupedTransaction | null>(null);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [totalItemsToDelete, setTotalItemsToDelete] = useState(0);
  const [deletedItems, setDeletedItems] = useState(0);
  const [totalDocsToDelete, setTotalDocsToDelete] = useState(0);
  const [deletedDocs, setDeletedDocs] = useState(0);
  const [confirmDeleteChecked, setConfirmDeleteChecked] = useState(false);

  // Fonction pour supprimer un groupe entier de transactions
  const handleDeleteGroup = async (group: GroupedTransaction) => {
    if (!group || group.transactions.length === 0) return;
    
    // Compter les documents associés
    let docCount = 0;
    group.transactions.forEach(transaction => {
      if (transaction.documentId) {
        docCount++;
      }
      if (transaction.documentIds && transaction.documentIds.length > 0) {
        docCount += transaction.documentIds.length;
      }
    });
    
    setTotalDocsToDelete(docCount);
    setGroupToDelete(group);
    setShowDeleteGroupConfirm(true);
    setConfirmDeleteChecked(false); // Réinitialiser la case à cocher
    setDeleteLinkedDocuments(false); // Réinitialiser l'option pour les documents
  };

  // Fonction pour exécuter la suppression du groupe avec barre de progression
  const executeGroupDeletion = async () => {
    if (!groupToDelete || !confirmDeleteChecked) return;
    
    try {
      // Fermer le dialogue de confirmation et ouvrir le dialogue de progression
      setShowDeleteGroupConfirm(false);
      setShowProgressDialog(true);
      setIsDeleting(true);
      setDeleteProgress(0);
      setTotalItemsToDelete(groupToDelete.transactions.length);
      setDeletedItems(0);
      setDeletedDocs(0);
      
      // Liste de tous les IDs de documents à supprimer
      const allDocumentIds: number[] = [];
      
      // Collecter tous les IDs de documents des transactions
      groupToDelete.transactions.forEach(transaction => {
        if (transaction.documentId) {
          allDocumentIds.push(transaction.documentId);
        }
        if (transaction.documentIds && transaction.documentIds.length > 0) {
          allDocumentIds.push(...transaction.documentIds);
        }
      });
      
      // Supprimer les transactions une par une avec progression
      for (let i = 0; i < groupToDelete.transactions.length; i++) {
        const transaction = groupToDelete.transactions[i];
        
        // Compter les documents de cette transaction
        let transactionDocCount = 0;
        if (transaction.documentId) transactionDocCount++;
        if (transaction.documentIds) transactionDocCount += transaction.documentIds.length;
        
        // Supprimer la transaction
        await fetch(`/api/transactions/${transaction.id}`, {
          method: 'DELETE',
        });
        
        // Si l'option est cochée, supprimer les documents associés
        if (deleteLinkedDocuments && transactionDocCount > 0) {
          const docs = [];
          if (transaction.documentId) docs.push(transaction.documentId);
          if (transaction.documentIds) docs.push(...transaction.documentIds);
          
          // Supprimer chaque document
          const deletePromises = docs.map(docId => 
            fetch(`/api/documents/${docId}`, {
              method: 'DELETE',
            })
          );
          
          await Promise.all(deletePromises);
        }
        
        // Mettre à jour la progression des documents
        setDeletedDocs(prev => prev + transactionDocCount);
        
        // Mettre à jour la progression
        setDeletedItems(i + 1);
        setDeleteProgress(Math.round(((i + 1) / groupToDelete.transactions.length) * 100));
        
        // Petite pause pour l'effet visuel
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Une fois toutes les transactions supprimées, mise à jour de l'interface
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      toast({
        title: 'Suppression terminée',
        description: `${groupToDelete.transactions.length} transactions ${deleteLinkedDocuments && totalDocsToDelete > 0 ? `et ${totalDocsToDelete} documents` : ''} ont été supprimés avec succès.`
      });
      
      // Réinitialiser les états
      setShowProgressDialog(false);
      setGroupToDelete(null);
      setIsDeleting(false);
      setDeleteLinkedDocuments(false);
      
    } catch (err) {
      console.error('Erreur lors de la suppression du groupe:', err);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression du groupe.',
        variant: 'destructive'
      });
      setShowProgressDialog(false);
      setIsDeleting(false);
    }
  };

  // Configuration des types de documents (identique à celle de NewTransactionDialog)
  const documentTypeConfig: DocumentTypeConfig = {
    "invoice": { 
      label: "Factures", 
      icon: <CreditCard className="h-3 w-3 text-blue-500" />
    },
    "contract": { 
      label: "Contrat", 
      icon: <FilePenLine className="h-3 w-3 text-emerald-500" /> 
    },
    "lease": { 
      label: "Bail", 
      icon: <FileSignature className="h-3 w-3 text-amber-500" /> 
    },
    "form": { 
      label: "Formulaire", 
      icon: <Clipboard className="h-3 w-3 text-violet-500" /> 
    },
    "maintenance": { 
      label: "Entretien", 
      icon: <FileSearch className="h-3 w-3 text-red-500" /> 
    },
    "insurance": { 
      label: "Assurance", 
      icon: <FileCheck className="h-3 w-3 text-cyan-500" /> 
    },
    "tax": { 
      label: "Impôts", 
      icon: <FileIcon className="h-3 w-3 text-orange-500" /> 
    },
    "legal": { 
      label: "Juridique", 
      icon: <FileSpreadsheet className="h-3 w-3 text-gray-500" /> 
    },
    "certificate": { 
      label: "Certificat", 
      icon: <FileCheck className="h-3 w-3 text-green-500" /> 
    },
    "payment": { 
      label: "Paiement", 
      icon: <CreditCard className="h-3 w-3 text-indigo-500" /> 
    },
    "deposit": { 
      label: "Dépôt", 
      icon: <Euro className="h-3 w-3 text-amber-500" /> 
    },
    "budget": { 
      label: "Budget", 
      icon: <FileSpreadsheet className="h-3 w-3 text-blue-500" /> 
    },
    "expense": { 
      label: "Dépense", 
      icon: <CreditCard className="h-3 w-3 text-red-500" /> 
    },
    "tenant": { 
      label: "Locataire", 
      icon: <FileIcon className="h-3 w-3 text-purple-500" /> 
    },
    "guarantor": { 
      label: "Garant", 
      icon: <FileIcon className="h-3 w-3 text-teal-500" /> 
    },
    "inventory": { 
      label: "Inventaire", 
      icon: <FileSpreadsheet className="h-3 w-3 text-emerald-500" /> 
    },
    "complaint": { 
      label: "Réclamation", 
      icon: <Mail className="h-3 w-3 text-red-500" /> 
    },
    "inspection": { 
      label: "Inspection", 
      icon: <FileSearch className="h-3 w-3 text-amber-500" /> 
    },
    "repair": { 
      label: "Réparation", 
      icon: <FileIcon className="h-3 w-3 text-red-500" /> 
    },
    "renovation": { 
      label: "Rénovation", 
      icon: <FileIcon className="h-3 w-3 text-cyan-500" /> 
    },
    "plan": { 
      label: "Plan", 
      icon: <FileImage className="h-3 w-3 text-blue-500" /> 
    },
    "notice": { 
      label: "Avis", 
      icon: <FileIcon className="h-3 w-3 text-orange-500" /> 
    },
    "correspondence": { 
      label: "Correspondance", 
      icon: <Mail className="h-3 w-3 text-blue-500" /> 
    },
    "report": { 
      label: "Rapport", 
      icon: <FileSpreadsheet className="h-3 w-3 text-violet-500" /> 
    },
    "meeting": { 
      label: "Réunion", 
      icon: <FileIcon className="h-3 w-3 text-emerald-500" /> 
    },
    "other": { 
      label: "Autre", 
      icon: <FileIcon className="h-3 w-3 text-gray-500" /> 
    }
  };
  
  // Hook pour charger les noms de documents
  useEffect(() => {
    // Ne charger les noms que si nous avons une transaction sélectionnée avec des documents
    if (selectedTransaction?.documentIds && selectedTransaction.documentIds.length > 0) {
      // Créer un Set pour garder une trace des documents que nous devons charger
      const documentsToLoad = new Set([
        ...(selectedTransaction.documentIds || []), 
        ...newlyUploadedDocIds
      ].map(id => id.toString()));
      
      // Supprimer les documents dont nous connaissons déjà les noms
      documentNames.forEach((_, docId) => {
        documentsToLoad.delete(docId);
      });
      
      // Charger les noms de tous les documents restants
      documentsToLoad.forEach(async (docId) => {
        try {
          const response = await fetch(`/api/documents/${docId}`);
          if (response.ok) {
            const docData = await response.json();
            setDocumentNames(prev => {
              const newMap = new Map(prev);
              newMap.set(docId, docData.title || docData.originalName || `Document`);
              return newMap;
            });
          }
        } catch (error) {
          console.error(`Erreur lors du chargement du document ${docId}:`, error);
        }
      });
    }
  }, [selectedTransaction, newlyUploadedDocIds, documentNames]);

  return (
    <div className="space-y-6">
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent 
          className="sm:max-w-md border-0 shadow-lg bg-gradient-to-br from-white to-red-50 p-0 overflow-hidden"
          aria-describedby="delete-dialog-description"
        >
          <DialogDescription id="delete-dialog-description" className="sr-only">
            Confirmation de suppression de transaction
          </DialogDescription>
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
            className="pl-9 bg-white dark:bg-background focus:ring-2 focus:ring-blue-500 border-gray-200 dark:border-gray-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showAdvancedFiltersDialog} onOpenChange={setShowAdvancedFiltersDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres avancés
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[600px] sm:max-w-[600px] bg-gradient-to-br from-white via-white to-blue-50/30 border-blue-200/50 dark:from-background dark:via-background dark:to-blue-950/10 dark:border-blue-900/30">
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-500" />
                    Filtres avancés
                  </DialogTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 hover:bg-blue-100 text-blue-600 border-blue-200 flex items-center gap-1 transition-all duration-200 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50"
                    onClick={() => {
                      setFilters({
                        search: '',
                        type: 'all',
                        category: 'all',
                        property: 'all',
                        paymentMethod: 'all',
                        dateRange: undefined
                      });
                      updateAdvancedFilters({
                        dateRange: { start: null, end: null },
                        amountRange: { min: null, max: null },
                        categories: [],
                        paymentMethods: [],
                        status: [],
                        type: null,
                        grouping: 'property-type-category',
                        sortByDate: 'desc',
                        sortByPeriod: null,
                        selectedDates: []
                      });
                    }}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" /> 
                    <span className="text-xs">Réinitialiser</span>
                  </Button>
                </div>
              </DialogHeader>
              
              <Separator className="bg-blue-100 my-4 dark:bg-blue-950/50" />
              
              <div className="space-y-6 my-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-6">
                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h4 className="font-medium leading-none flex items-center gap-2 dark:text-gray-200">
                      {filters.type === 'income' && <ArrowUpCircle className="h-4 w-4 text-emerald-500" />}
                      {filters.type === 'expense' && <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                      {filters.type === 'credit' && <CreditCard className="h-4 w-4 text-amber-500" />}
                      {filters.type === 'all' && <Filter className="h-4 w-4 text-blue-500" />}
                      <span>Type de transaction</span>
                      {filters.type !== 'all' && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium",
                            filters.type === 'income' && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
                            filters.type === 'expense' && "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50",
                            filters.type === 'credit' && "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50"
                          )}
                        >
                          {filters.type === "income" ? "Revenus" : 
                           filters.type === "expense" ? "Dépenses" : "Crédits"}
                        </Badge>
                      )}
                    </h4>
                    <Combobox
                      value={filters.type}
                      onValueChange={(value: string) => setFilters(prev => ({ ...prev, type: value }))}
                      options={[
                        { value: 'all', label: 'Tous les types' },
                        { value: 'income', label: 'Revenus' },
                        { value: 'expense', label: 'Dépenses' },
                        { value: 'credit', label: 'Crédits' }
                      ]}
                      placeholder="Sélectionner un type"
                      className={cn(
                        "w-full",
                        filters.type === 'all' ? "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : 
                        filters.type === 'income' ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" :
                        filters.type === 'expense' ? "text-rose-700 border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300" :
                        "text-amber-700 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                      )}
                    />
                  </motion.div>

                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                  >
                    <h4 className="font-medium leading-none flex items-center gap-2 dark:text-gray-200">
                      <Tag className="h-4 w-4 text-purple-500" />
                      <span>Catégorie</span>
                      {filters.category !== 'all' && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50"
                          )}
                        >
                          {categoryLabels[filters.category as keyof typeof categoryLabels]}
                        </Badge>
                      )}
                    </h4>
                    <Combobox
                      value={filters.category}
                      onValueChange={(value: string) => setFilters(prev => ({ ...prev, category: value }))}
                      options={[
                        { value: 'all', label: 'Toutes les catégories' },
                        ...Object.entries(categoryLabels).map(([value, label]) => ({
                          value,
                          label
                        }))
                      ]}
                      placeholder="Sélectionner une catégorie"
                      className={cn(
                        "w-full",
                        filters.category === 'all' ? "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : "text-purple-700 border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300"
                      )}
                    />
                  </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                  >
                    <h4 className="font-medium leading-none flex items-center gap-2 dark:text-gray-200">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                      <span>Propriété</span>
                      {filters.property !== 'all' && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/50"
                          )}
                        >
                          {filters.property}
                        </Badge>
                      )}
                    </h4>
                    <Combobox
                      value={filters.property}
                      onValueChange={(value: string) => {
                        // Si l'utilisateur sélectionne la même propriété ou "all", revenir à "all"
                        const newValue = value === filters.property || value === "" ? "all" : value;
                        setFilters(prev => ({ ...prev, property: newValue }));
                      }}
                      options={[
                        { value: 'all', label: 'Toutes les propriétés' },
                        ...Array.from(new Set(transactions.map(t => t.propertyName))).map(property => ({
                          value: property,
                          label: property
                        }))
                      ]}
                      placeholder="Sélectionner une propriété"
                      className={cn(
                        "w-full",
                        filters.property === 'all' ? "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : "text-indigo-700 border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
                      )}
                    />
                  </motion.div>

                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.15 }}
                  >
                    <h4 className="font-medium leading-none flex items-center gap-2 dark:text-gray-200">
                      <CreditCard className="h-4 w-4 text-teal-500" />
                      <span>Méthode de paiement</span>
                      {filters.paymentMethod !== 'all' && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/50"
                          )}
                        >
                          {paymentMethodLabels[filters.paymentMethod as keyof typeof paymentMethodLabels]}
                        </Badge>
                      )}
                    </h4>
                    <Combobox
                      value={filters.paymentMethod}
                      onValueChange={(value: string) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
                      options={[
                        { value: 'all', label: 'Toutes les méthodes' },
                        ...Object.entries(paymentMethodLabels).map(([value, label]) => ({
                          value,
                          label
                        }))
                      ]}
                      placeholder="Sélectionner une méthode"
                      className={cn(
                        "w-full",
                        filters.paymentMethod === 'all' ? "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : "text-teal-700 border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300"
                      )}
                    />
                  </motion.div>
                </div>

                <Separator className="bg-blue-100" />

                <div className="grid grid-cols-2 gap-6">
                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.2 }}
                  >
                    <h4 className="font-medium leading-none flex items-center gap-2 dark:text-gray-200">
                      <Layers className="h-4 w-4 text-blue-500" />
                      <span>Regroupement</span>
                      {advancedFilters.grouping !== 'property-type-category' && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50"
                          )}
                        >
                          {advancedFilters.grouping === 'property-category' ? 'Propriété + Catégorie' :
                           advancedFilters.grouping === 'type-category' ? 'Type + Catégorie' :
                           advancedFilters.grouping === 'category' ? 'Catégorie uniquement' : 'Aucun'}
                        </Badge>
                      )}
                    </h4>
                    <Combobox
                      value={advancedFilters.grouping}
                      onValueChange={(value: string) => setAdvancedFilters(prev => ({ ...prev, grouping: value as AdvancedFilters['grouping'] }))}
                      options={[
                        { value: 'property-type-category', label: 'Propriété + Type + Catégorie' },
                        { value: 'property-category', label: 'Propriété + Catégorie' },
                        { value: 'type-category', label: 'Type + Catégorie' },
                        { value: 'category', label: 'Catégorie uniquement' },
                        { value: 'property-type', label: 'Propriété + Type' },
                        { value: 'property', label: 'Propriété uniquement' },
                        { value: 'type', label: 'Type uniquement' },
                        { value: 'month', label: 'Par mois' },
                        { value: 'month-category', label: 'Mois + Catégorie' },
                        { value: 'month-type', label: 'Mois + Type' },
                        { value: 'month-property', label: 'Mois + Propriété' },
                        { value: 'none', label: 'Aucun regroupement' }
                      ]}
                      placeholder="Sélectionner un regroupement"
                      className={cn(
                        "w-full",
                        advancedFilters.grouping === 'property-type-category' ? 
                          "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : 
                          "text-blue-700 border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                      )}
                    />
                  </motion.div>

                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.25 }}
                  >
                    <h4 className="font-medium leading-none flex items-center gap-2 dark:text-gray-200">
                      <CalendarIcon className="h-4 w-4 text-blue-500" />
                      <span>Trier par date</span>
                      {advancedFilters.sortByDate && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-medium bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50"
                          )}
                        >
                          {advancedFilters.sortByDate === 'asc' ? 'Plus ancien' : 'Plus récent'}
                        </Badge>
                      )}
                    </h4>
                    <Combobox
                      value={advancedFilters.sortByDate || ''}
                      onValueChange={(value: string) => setAdvancedFilters(prev => ({ 
                        ...prev, 
                        sortByDate: value as 'asc' | 'desc' | null 
                      }))}
                      options={[
                        { value: '', label: 'Sans tri' },
                        { value: 'desc', label: 'Plus récent' },
                        { value: 'asc', label: 'Plus ancien' }
                      ]}
                      placeholder="Sélectionner un tri"
                      className={cn(
                        "w-full",
                        advancedFilters.sortByDate === null ? 
                          "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : 
                          "text-blue-700 border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                      )}
                    />
                  </motion.div>
                </div>

                <Separator className="bg-blue-100" />

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.35 }}
                >
                  <h4 className="font-medium leading-none flex items-center gap-2 dark:text-gray-200">
                    <CalendarIcon className="h-4 w-4 text-blue-500" />
                    <span>Sélectionner des dates</span>
                    {filters.dateRange?.from && filters.dateRange?.to && (
                      <Badge 
                        variant="secondary"
                        className={cn(
                          "h-5 px-1.5 text-[10px] font-medium bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50"
                        )}
                      >
                        {format(filters.dateRange.from, 'dd/MM/yyyy')} - {format(filters.dateRange.to, 'dd/MM/yyyy')}
                      </Badge>
                    )}
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Date de début</Label>
                        <Input
                          type="date"
                          className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 dark:bg-background dark:border-gray-800"
                          value={filters.dateRange?.from?.toISOString().split('T')[0] || ''}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            setFilters(prev => ({
                              ...prev,
                              dateRange: {
                                from: date,
                                to: prev.dateRange?.to
                              }
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Date de fin</Label>
                        <Input
                          type="date"
                          className="w-full bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 dark:bg-background dark:border-gray-800"
                          value={filters.dateRange?.to?.toISOString().split('T')[0] || ''}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            setFilters(prev => ({
                              ...prev,
                              dateRange: {
                                from: prev.dateRange?.from,
                                to: date
                              }
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              <Separator className="bg-blue-100 my-4 dark:bg-blue-950/50" />
              
              <DialogFooter>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => {setShowAdvancedFiltersDialog(false)}}
                >
                  Appliquer les filtres
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        <DialogContent className="max-w-4xl h-[90vh]" aria-describedby="preview-dialog-description">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>
                {selectedDocumentIds.length > 1 
                  ? `Document ${currentDocumentIndex + 1}/${selectedDocumentIds.length}` 
                  : "Document de la transaction"}
              </DialogTitle>
              <DialogDescription id="preview-dialog-description" className="sr-only">
                Prévisualisation du document de la transaction
              </DialogDescription>
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
            {selectedDocumentId ? (
              <iframe
                src={`/api/documents/${selectedDocumentId}/preview`}
                className="w-full h-full border-0 rounded-md"
                title={`Document Preview ${currentDocumentIndex + 1}`}
                key={selectedDocumentId}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Aucun document à afficher</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-background via-background/80 to-blue-500/10 border-blue-500/20 overflow-y-auto"
          aria-describedby="edit-dialog-description"
        >
          <DialogDescription id="edit-dialog-description" className="sr-only">
            Formulaire de modification de transaction
          </DialogDescription>
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
                      <CalendarIcon className="h-4 w-4 text-blue-500" />
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
                      {selectedTransaction.type === 'credit' && <CreditCard className="h-4 w-4 text-amber-500" />}
                      Type
                    </label>
                    <Select 
                      defaultValue={selectedTransaction.type}
                      onValueChange={(value) => {
                        const typeInput = document.getElementById('edit-transaction-type') as HTMLInputElement;
                        if (typeInput) typeInput.value = value;
                      }}
                    >
                      <SelectTrigger 
                      className={cn(
                          "w-full bg-background/50 border-border/50 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors",
                        selectedTransaction.type === 'income' && "text-emerald-600",
                        selectedTransaction.type === 'expense' && "text-rose-600",
                        selectedTransaction.type === 'credit' && "text-amber-600"
                      )}
                      >
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-blue-200">
                        <SelectItem value="income" className="hover:bg-blue-500/5">
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="h-4 w-4 text-green-500" />
                            Revenu
                          </div>
                        </SelectItem>
                        <SelectItem value="expense" className="hover:bg-blue-500/5">
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            Dépense
                          </div>
                        </SelectItem>
                        <SelectItem value="credit" className="hover:bg-blue-500/5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-amber-500" />
                            Crédit
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" id="edit-transaction-type" defaultValue={selectedTransaction.type} />
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
                  
                  {/* Tous les documents associés à la transaction */}
                  {(selectedTransaction?.documentIds && selectedTransaction.documentIds.length > 0) || newlyUploadedDocIds.length > 0 ? (
                    <div className="border rounded-md p-1 mt-2 space-y-1 max-h-60 overflow-y-auto">
                      <div className="px-3 py-2 bg-muted/50 text-sm font-medium dark:bg-muted/20">
                        Documents associés à la transaction
                      </div>
                      {/* Afficher tous les documents : existants + nouveaux */}
                      {[...(selectedTransaction?.documentIds || []), ...newlyUploadedDocIds].map((docId, index) => {
                        // Récupérer les détails du document à partir des données disponibles
                        const documentDetail = documentsInfo.find(d => d.id === docId);
                        const documentTitle = documentDetail?.title || documentNames.get(docId.toString()) || `Document ${index + 1}`;
                        
                        return (
                        <div 
                          key={docId} 
                            className={`flex items-center justify-between p-3 ${newlyUploadedDocIds.includes(docId) ? 'bg-green-50 dark:bg-green-950/30' : 'bg-white dark:bg-background'}`}
                        >
                          <div className="flex items-center gap-2">
                              <FileText className={`h-4 w-4 ${newlyUploadedDocIds.includes(docId) ? 'text-green-600' : 'text-gray-600'}`} />
                              <span className="text-sm truncate max-w-[200px]">
                                {documentTitle}
                              </span>
                            {index === 0 && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md dark:bg-blue-950/30 dark:text-blue-300">
                                Principal
                              </span>
                            )}
                              {newlyUploadedDocIds.includes(docId) && (
                                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-md dark:bg-green-950/30 dark:text-green-300">
                                  Nouveau
                              </span>
                            )}
                            {documentDetail?.type && (
                              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md dark:bg-purple-950/30 dark:text-purple-300">
                                {documentTypeConfig[documentDetail.type]?.label || documentDetail.type}
                              </span>
                            )}
                            {documentDetail?.uploadContext === 'transaction' && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md dark:bg-blue-950/30 dark:text-blue-300">
                                {/* Simplifier la condition pour toujours afficher le message approprié */}
                                {documentDetail?.description?.includes("modification") 
                                  ? "Document financier - Document uploadé via le formulaire modification Finances"
                                  : "Document financier - Document uploadé via le formulaire Finances"
                                }
                              </span>
                            )}
                            {getDocumentFolder(docId) && (
                              <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1 dark:bg-gray-800/50 dark:text-gray-300">
                                <Folder className="h-3 w-3" />
                                {getDocumentFolder(docId)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            {docId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 text-gray-500 hover:text-gray-700"
                                onClick={() => {
                                    const allDocIds = [...(selectedTransaction?.documentIds || []), ...newlyUploadedDocIds];
                                    if (allDocIds.length > 0) {
                                      handlePreviewDocument(docId, allDocIds);
                                  } else {
                                    handlePreviewDocument(docId);
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                  // Si c'est un nouveau document, on peut simplement le retirer de la liste
                                  if (newlyUploadedDocIds.includes(docId)) {
                                    setNewlyUploadedDocIds(prev => prev.filter(id => id !== docId));
                                  } else {
                                setDocumentToDelete(docId);
                                setShowDeleteConfirm(true);
                                  }
                              }}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Sélection de dossier */}
                  <div className="border rounded-md p-3 mt-4 mb-4 bg-gray-50/50 dark:bg-background/50 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Dossier pour les documents</label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                        className="h-8 text-xs hover:bg-blue-500/10"
                      >
                        {isCreatingFolder ? "Annuler" : "Nouveau dossier"}
                      </Button>
                    </div>
                    
                    {isCreatingFolder ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Nom du nouveau dossier"
                          className="flex-1"
                        />
                        <Button 
                          onClick={() => {
                            if (newFolderName.trim()) {
                              createFolderMutation.mutate(newFolderName);
                              setIsCreatingFolder(false);
                            }
                          }}
                          disabled={!newFolderName.trim()}
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Créer
                        </Button>
                      </div>
                    ) : (
                      <Combobox
                        options={[
                          { value: "none", label: "Aucun dossier" },
                          ...folders.map(folder => ({
                            value: folder.id.toString(),
                            label: folder.name
                          }))
                        ]}
                        value={selectedFolderId?.toString() || "none"}
                        onValueChange={(value) => setSelectedFolderId(value === "none" ? null : parseInt(value))}
                        placeholder="Sélectionner un dossier"
                        emptyText="Aucun dossier trouvé"
                        searchPlaceholder="Rechercher un dossier..."
                        className="w-full bg-background/50 border-border/50 hover:bg-blue-500/5 hover:border-blue-500/50 transition-colors"
                      />
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Les documents seront associés à ce dossier lors de l'upload
                    </p>
                  </div>

                  {/* Section des documents en attente d'upload */}
                  {pendingFiles.length > 0 && (
                    <div className="border rounded-md p-1 mt-2 space-y-1 max-h-60 overflow-y-auto">
                      <div className="px-3 py-2 bg-amber-50 text-sm font-medium text-amber-700 flex justify-between items-center">
                        <span>Documents en attente ({pendingFiles.length})</span>
                        <span className="text-xs text-amber-600">Seront uploadés lors de la mise à jour</span>
                      </div>
                      {pendingFiles.map((file, index) => (
                        <div 
                          key={file.name + index} 
                          className="flex items-center justify-between p-3 bg-white"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                            {editingPendingDocName === file ? (
                              <div className="relative flex-1 max-w-[200px]">
                                <Input
                                  className="h-7 text-xs py-1 px-2 w-full pr-8"
                                  defaultValue={pendingDocumentNames.get(file) || file.name.replace(/\.[^/.]+$/, "")}
                                  placeholder="Nom du document"
                                  autoFocus
                                  onBlur={(e) => {
                                    if (e.target.value.trim()) {
                                      updatePendingDocumentName(file, e.target.value);
                                    }
                                    setEditingPendingDocName(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (e.currentTarget.value.trim()) {
                                        updatePendingDocumentName(file, e.currentTarget.value);
                                      }
                                      setEditingPendingDocName(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingPendingDocName(null);
                                    }
                                  }}
                                />
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">.pdf</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm truncate max-w-[150px]">
                                  {pendingDocumentNames.get(file) || file.name}
                                </span>
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setEditingPendingDocName(file)}
                                  className="h-6 w-6 p-0 hover:bg-blue-500/10 hover:text-blue-500"
                                  title="Renommer le fichier"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={documentTypes.get(file) || "invoice"} 
                              onValueChange={(value) => updateDocumentType(file, value)}
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue placeholder="Type de document" />
                              </SelectTrigger>
                              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] bg-white border border-primary/20 shadow-md rounded-md">
                                <div 
                                  className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent py-1 px-1"
                                  onWheel={(e) => e.stopPropagation()}
                                >
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents principaux</SelectLabel>
                                    {["contract", "lease", "form", "maintenance"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type].icon}
                                          <span>{documentTypeConfig[type].label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                  
                                  <SelectSeparator className="my-1" />
                                  
                                  {/* Documents légaux et administratifs */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents légaux</SelectLabel>
                                    {["insurance", "tax", "legal", "certificate"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type].icon}
                                          <span>{documentTypeConfig[type].label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                  
                                  <SelectSeparator className="my-1" />
                                  
                                  {/* Documents financiers */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents financiers</SelectLabel>
                                    {["payment", "deposit", "budget", "expense", "invoice"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type].icon}
                                          <span>{documentTypeConfig[type].label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                  
                                  <SelectSeparator className="my-1" />
                                  
                                  {/* Documents liés aux locataires */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents locataires</SelectLabel>
                                    {["tenant", "guarantor", "inventory", "complaint"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type].icon}
                                          <span>{documentTypeConfig[type].label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                  
                                  <SelectSeparator className="my-1" />
                                  
                                  {/* Autres types */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Autres types</SelectLabel>
                                    {["inspection", "repair", "renovation", "plan", "notice", "correspondence", "report", "meeting", "other"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type].icon}
                                          <span>{documentTypeConfig[type].label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </div>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPendingFiles(prev => prev.filter(f => f !== file));
                                setDocumentTypes(prev => {
                                  const newMap = new Map(prev);
                                  newMap.delete(file);
                                  return newMap;
                                });
                              }}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
                    onClick={() => {
                      setShowEditDialog(false);
                      setPendingFiles([]);
                      setDocumentTypes(new Map());
                      setNewlyUploadedDocIds([]);
                      setPendingDocumentNames(new Map());
                      setEditingPendingDocName(null);
                    }}
                    className="border-blue-500/20 hover:bg-blue-500/10 text-blue-700"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={() => {
                      const dateInput = document.getElementById('edit-transaction-date') as HTMLInputElement;
                      const typeInput = document.getElementById('edit-transaction-type') as HTMLSelectElement;
                      const descriptionInput = document.getElementById('edit-transaction-description') as HTMLInputElement;
                      const categoryInput = document.getElementById('edit-transaction-category') as HTMLSelectElement;
                      const amountInput = document.getElementById('edit-transaction-amount') as HTMLInputElement;
                      const paymentMethodInput = document.getElementById('edit-transaction-payment-method') as HTMLSelectElement;
                      const statusInput = document.getElementById('edit-transaction-status') as HTMLSelectElement;

                      const updateData = {
                        date: dateInput.value,
                        type: typeInput.value,
                        description: descriptionInput.value,
                        category: categoryInput.value,
                        amount: Number(amountInput.value),
                        paymentMethod: paymentMethodInput.value,
                        status: statusInput.value
                      };

                      // Validation des données avant l'envoi
                      if (!updateData.date || updateData.amount === undefined || updateData.amount === null) {
                        toast({
                          title: 'Erreur',
                          description: 'Veuillez remplir au moins la date et le montant',
                          variant: 'destructive',
                        });
                        return;
                      }

                      // Validation du montant
                      if (isNaN(updateData.amount) || updateData.amount < 0) {
                        toast({
                          title: 'Erreur',
                          description: 'Le montant doit être un nombre égal ou supérieur à 0',
                          variant: 'destructive',
                        });
                        return;
                      }

                      // Préparation des données avec valeurs par défaut si non renseignées
                      const finalUpdateData = {
                        ...updateData,
                        type: updateData.type || selectedTransaction.type,
                        description: updateData.description || selectedTransaction.description || "",
                        category: updateData.category || selectedTransaction.category || "other",
                        paymentMethod: updateData.paymentMethod || selectedTransaction.paymentMethod || "bank_transfer",
                        status: updateData.status || selectedTransaction.status || "pending"
                      };

                      console.log('Données à envoyer:', finalUpdateData);
                      
                      // Première étape : upload des documents en attente si nécessaire
                      const uploadDocuments = async (): Promise<number[]> => {
                        if (!pendingFiles.length) return [];
                        
                        setIsUploading(true);
                        try {
                          const uploadPromises = pendingFiles.map(async (file) => {
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            // Récupérer le type du document s'il existe, sinon utiliser "invoice" par défaut
                            const docType = documentTypes.get(file) || "invoice";
                            console.log(`Document type for file ${file.name}:`, docType);
                            formData.append('type', docType);
                            
                            // Utiliser le titre personnalisé du fichier s'il existe, sinon utiliser le nom original
                            const customName = pendingDocumentNames.get(file) || file.name;
                            formData.append('title', customName);
                            
                            // Ajouter l'ID du dossier si sélectionné
                            if (selectedFolderId !== null) {
                              formData.append('folderId', selectedFolderId.toString());
                              console.log(`Adding folder ID ${selectedFolderId} to document ${file.name}`);
                            }
                            
                            // Déterminer la catégorie du document et sa description
                            const isMaintenance = finalUpdateData.category === 'maintenance';
                            const documentCategory = isMaintenance ? 'maintenance' : 'finance';
                            const documentDescription = isMaintenance 
                              ? `Document de maintenance associé à une transaction de ${finalUpdateData.amount}€`
                              : `Document financier associé à une transaction de ${finalUpdateData.amount}€`;
                            
                            // Récupérer le libellé du type de document pour l'affichage
                            const docTypeLabel = documentTypeConfig[docType]?.label || "Factures";
                            
                            // Ajouter des métadonnées spécifiques pour la section finance
                            const formDataObj = {
                              section: 'finance',
                              description: `Document financier\nDocument uploadé via le formulaire modification Finances`,
                              source: 'finance',
                              transactionType: finalUpdateData.type,
                              documentTypeLabel: docTypeLabel,
                              uploadSource: 'finance_form',
                              uploadMethod: 'form',
                              uploadContext: 'transaction',
                              transactionId: selectedTransaction.id,
                              documentCategory: documentCategory
                            };
                            
                            formData.append('formData', JSON.stringify(formDataObj));
                            
                            // Utiliser l'endpoint standard /api/documents pour l'upload
                            const response = await fetch('/api/documents', {
                              method: 'POST',
                              body: formData
                            });
                            
                            if (!response.ok) {
                              const errorText = await response.text();
                              throw new Error(`Erreur lors du téléchargement: ${response.status} ${errorText}`);
                            }
                            
                            const data = await response.json();
                            return data.id;
                          });
                          
                          // Attendre que tous les documents soient uploadés
                          const docIds = await Promise.all(uploadPromises);
                          
                          // Mettre à jour les nouveaux documents
                          setNewlyUploadedDocIds(prev => [...prev, ...docIds]);
                          // Réinitialiser les états liés aux documents en attente
                          setPendingFiles([]);
                          setDocumentTypes(new Map());
                          setPendingDocumentNames(new Map());
                          setEditingPendingDocName(null);
                          return docIds;
                        } catch (error) {
                          console.error('Erreur upload documents:', error);
                          throw error;
                        } finally {
                          setIsUploading(false);
                        }
                      };
                      
                      // Deuxième étape : mise à jour des données de la transaction
                      const updateTransaction = async () => {
                        try {
                          // Upload des documents d'abord
                          const uploadedDocIds = await uploadDocuments();
                          console.log("Documents uploadés:", uploadedDocIds);
                          
                          // Préparer les documentIds (existants + nouveaux)
                          let allDocumentIds = [...(selectedTransaction.documentIds || [])];
                          
                          // Si on a de nouveaux documents uploadés, les ajouter
                          if (uploadedDocIds.length > 0) {
                            // Ajouter les nouveaux IDs de documents
                            allDocumentIds = [...allDocumentIds, ...uploadedDocIds];
                          }
                          
                          // Ensuite mise à jour de la transaction
                          const fullUpdateData = {
                            ...finalUpdateData,
                            documentIds: allDocumentIds.length > 0 ? allDocumentIds : undefined
                          };
                          
                          const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                            body: JSON.stringify(fullUpdateData)
                          });
                          
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
                        }
                          
                          const updatedData = await response.json();
                        console.log('Transaction mise à jour:', updatedData);
                        
                          // Réinitialiser les états
                          setPendingFiles([]);
                          setDocumentTypes(new Map());
                          
                          // Forcer immédiatement un rafraîchissement complet
                          await queryClient.invalidateQueries({ 
                          queryKey: ['/api/transactions'],
                          refetchType: 'all'
                        });
                          
                          // Invalider également le cache des documents pour qu'ils apparaissent dans la section Documents
                          await queryClient.invalidateQueries({
                            queryKey: ['/api/documents'],
                            refetchType: 'all'
                          });
                          
                        toast({
                          title: 'Succès',
                            description: pendingFiles.length ? 
                              'La transaction et les documents ont été mis à jour' : 
                              'La transaction a été mise à jour',
                          });
                          
                          setShowEditDialog(false);
                        } catch (error: any) {
                        console.error('Erreur complète:', error);
                        toast({
                          title: 'Erreur',
                          description: error.message || 'Impossible de mettre à jour la transaction',
                          variant: 'destructive',
                        });
                        }
                      };
                      
                      // Lancer le processus
                      updateTransaction();
                    }}
                    className="gap-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                    <Edit className="h-4 w-4" />
                    Mettre à jour
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-white dark:bg-background"
          aria-describedby="bulk-edit-dialog-description"
        >
          <DialogDescription id="bulk-edit-dialog-description" className="sr-only">
            Modification groupée de transactions
          </DialogDescription>
          <DialogHeader className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-background dark:border-gray-800 border-b">
            <DialogTitle className="text-xl dark:text-gray-100">Modification groupée ({transactionsToEdit.length} transactions)</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Sélectionnez les transactions à modifier et appliquez les changements en masse
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3 p-4 border rounded-md bg-gray-50/50 hover:bg-blue-50/30 transition-colors dark:bg-gray-900/30 dark:hover:bg-blue-900/20 dark:border-gray-800">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-500" />
                      Modifier la catégorie
                </h4>
                      <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="bg-white dark:bg-background dark:border-gray-800">
                          <SelectValue placeholder="Choisir une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>

              <div className="space-y-3 p-4 border rounded-md bg-gray-50/50 hover:bg-blue-50/30 transition-colors dark:bg-gray-900/30 dark:hover:bg-blue-900/20 dark:border-gray-800">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                      Modifier le statut
                </h4>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-white dark:bg-background dark:border-gray-800">
                          <SelectValue placeholder="Choisir un statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="completed">Complété</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>

              <div className="space-y-3 p-4 border rounded-md bg-gray-50/50 hover:bg-blue-50/30 transition-colors dark:bg-gray-900/30 dark:hover:bg-blue-900/20 dark:border-gray-800">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                      Modifier la méthode
                </h4>
                      <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                  <SelectTrigger className="bg-white dark:bg-background dark:border-gray-800">
                          <SelectValue placeholder="Choisir une méthode" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(paymentMethodLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                    </div>
              </div>
              
          <div className="flex-1 overflow-hidden">
            <div className="h-[40vh] overflow-y-auto border-b">
                <Table>
                <TableHeader className="bg-gray-50 dark:bg-muted/20 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[40px] dark:text-white">
                        <input 
                          type="checkbox" 
                          className="rounded-sm" 
                          checked={selectedTransactionIds.size === transactionsToEdit.length && transactionsToEdit.length > 0}
                          onChange={toggleAllTransactions}
                        />
                      </TableHead>
                      <TableHead className="dark:text-white">Date</TableHead>
                      <TableHead className="dark:text-white">Description</TableHead>
                      <TableHead className="dark:text-white">Montant</TableHead>
                      <TableHead className="dark:text-white">Méthode</TableHead>
                      <TableHead className="dark:text-white">Catégorie</TableHead>
                      <TableHead className="dark:text-white">Statut</TableHead>
                      <TableHead className="dark:text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsToEdit.map(transaction => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <TableCell>
                          <input 
                            type="checkbox" 
                            className="rounded-sm" 
                            checked={selectedTransactionIds.has(transaction.id)}
                            onChange={() => toggleTransactionSelection(transaction.id)}
                          />
                        </TableCell>
                        <TableCell className="dark:text-gray-300">{transaction.formattedDate}</TableCell>
                        <TableCell className="dark:text-gray-300">{transaction.description}</TableCell>
                        <TableCell className={cn(
                          "font-medium",
                          transaction.type === "income" ? "text-emerald-600" :
                            transaction.type === "expense" ? "text-rose-600" : "text-amber-600"
                        )}>
                          {transaction.type === "income" ? "+" : "-"}{transaction.formattedAmount}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="dark:border-gray-700">
                            {paymentMethodLabels[transaction.paymentMethod as keyof typeof paymentMethodLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="dark:border-gray-700 dark:text-white">
                          {categoryLabels[transaction.category as TransactionCategory]}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[100px]">
                          <Badge className={cn("capitalize", statusColors[transaction.status as TransactionStatus])}>
                            {statusLabels[transaction.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditTransaction(transaction)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          
          <div className="p-6 border-t flex items-center justify-between gap-2">
            <div>
              <Badge variant="outline" className="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50">
                {selectedTransactionIds.size} sélectionnées sur {transactionsToEdit.length}
              </Badge>
          </div>
            
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={applyBulkChanges}
                disabled={selectedTransactionIds.size === 0 || (!newCategory && !newStatus && !newPaymentMethod)}
                className={cn(
                  "gap-2 transition-all", 
                  selectedTransactionIds.size === 0 || (!newCategory && !newStatus && !newPaymentMethod) 
                    ? "opacity-50" 
                    : "bg-gradient-to-r from-blue-500 via-cyan-500 to-sky-500 hover:from-blue-600 hover:via-cyan-600 hover:to-sky-600 shadow-md hover:shadow-lg"
                )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Traitement...
                </span>
              ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    Appliquer les modifications ({selectedTransactionIds.size})
                  </>
              )}
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div ref={parentRef} className="w-full">
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

      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white p-2"
          size="icon"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}

      {/* Dialogue de confirmation pour supprimer un groupe de transactions */}
      <AlertDialog open={showDeleteGroupConfirm} onOpenChange={(open) => !isDeleting && setShowDeleteGroupConfirm(open)}>
        <AlertDialogContent className="max-w-md bg-gradient-to-br from-background via-background to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-red-950/30 border border-red-100 dark:border-red-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Supprimer le groupe de transactions
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              {groupToDelete ? (
                <>
                  <p className="mb-2">
                    Vous êtes sur le point de supprimer <strong className="font-semibold">{groupToDelete.transactionCount} transactions</strong> de type <Badge variant="outline" className={cn("capitalize", typeColors[groupToDelete.type])}>{groupToDelete.type === "income" ? "Revenu" : groupToDelete.type === "expense" ? "Dépense" : "Crédit"}</Badge>.
                  </p>
                  <p className="mb-2">
                    Montant total: <span className={cn(
                      "font-medium",
                      groupToDelete.type === "income" ? "text-emerald-600 dark:text-emerald-400" :
                        groupToDelete.type === "expense" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                    )}>
                      {groupToDelete.type === "income" ? "+" : "-"}{new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(groupToDelete.totalAmount)}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-md">
                    <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {totalDocsToDelete > 0 
                        ? `${totalDocsToDelete} document${totalDocsToDelete > 1 ? 's' : ''} associé${totalDocsToDelete > 1 ? 's' : ''} sera${totalDocsToDelete > 1 ? 'ont' : ''} également supprimé${totalDocsToDelete > 1 ? 's' : ''}.`
                        : "Aucun document associé à ces transactions."}
                    </p>
                  </div>
                  
                  <div className="p-3 border border-red-200 dark:border-red-900/50 rounded-md bg-red-50 dark:bg-red-900/30 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox 
                        id="delete-group-documents" 
                        checked={deleteLinkedDocuments} 
                        onCheckedChange={(checked) => setDeleteLinkedDocuments(!!checked)}
                        className="border-red-400 dark:border-red-600 text-red-600 dark:text-red-400"
                      />
                      <label 
                        htmlFor="delete-group-documents" 
                        className="text-sm font-medium leading-none text-red-800 dark:text-red-300 cursor-pointer select-none"
                      >
                        Je souhaite également supprimer définitivement les documents liés
                      </label>
                    </div>
                    {deleteLinkedDocuments && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400 pl-6">
                        <p>⚠️ Attention : Les documents seront supprimés définitivement de la médiathèque et ne pourront pas être récupérés.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border border-red-200 dark:border-red-900/50 rounded-md bg-red-50 dark:bg-red-900/30 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox 
                        id="confirm-delete" 
                        checked={confirmDeleteChecked} 
                        onCheckedChange={(checked) => setConfirmDeleteChecked(!!checked)}
                        className="border-red-400 dark:border-red-600 text-red-600 dark:text-red-400"
                      />
                      <label 
                        htmlFor="confirm-delete" 
                        className="text-sm font-medium leading-none text-red-800 dark:text-red-300 cursor-pointer select-none"
                      >
                        Je confirme vouloir supprimer définitivement ces transactions
                      </label>
                    </div>
                  </div>
                  
                  <p className="text-red-600 dark:text-red-400 font-semibold mb-4">
                    Cette action est irréversible et ne peut pas être annulée !
                  </p>
                </>
              ) : (
                <p>Chargement des détails...</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isDeleting}
              className="hover:bg-red-50 dark:hover:bg-red-950/20 border-red-100 dark:border-red-900/30"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || !confirmDeleteChecked}
              onClick={executeGroupDeletion}
              className={cn(
                "text-white",
                confirmDeleteChecked 
                  ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600" 
                  : "bg-red-300 dark:bg-red-800/50 cursor-not-allowed hover:bg-red-300 dark:hover:bg-red-800/50"
              )}
            >
              {isDeleting ? (
                <div className="flex items-center">
                  <span className="mr-2">Suppression en cours</span>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                "Supprimer définitivement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialogue de progression pour la suppression */}
      <Dialog open={showProgressDialog} onOpenChange={() => false}>
        <DialogContent className="sm:max-w-md border-0 shadow-lg bg-gradient-to-br from-background to-red-50 dark:from-gray-900 dark:to-red-950/30 p-0 overflow-hidden">
          <div className="p-6">
            <div className="mb-6 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500 dark:text-red-400 animate-pulse" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
              Suppression en cours
            </h3>
            
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              Veuillez patienter pendant que nous supprimons les transactions et leurs documents.
            </p>
            
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5" /> 
                    Transactions
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {deletedItems}/{totalItemsToDelete}
                  </span>
                </div>
                <div className="w-full h-2 bg-red-100 dark:bg-red-900/50 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-red-500 dark:bg-red-600" 
                    initial={{ width: 0 }}
                    animate={{ width: `${deleteProgress}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>
              </div>
              
              {totalDocsToDelete > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> 
                      Documents
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {deletedDocs}/{totalDocsToDelete}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500 dark:bg-blue-600" 
                      initial={{ width: 0 }}
                      animate={{ width: totalDocsToDelete ? `${(deletedDocs / totalDocsToDelete) * 100}%` : "0%" }}
                      transition={{ ease: "easeInOut" }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{deleteProgress}% terminé</span>
                <span>{Math.round((deletedItems + deletedDocs) / (totalItemsToDelete + totalDocsToDelete) * 100)}% total</span>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {deletedItems === 0 
                  ? "Initialisation..." 
                  : `Suppression des données...`}
              </span>
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/30 p-4 border-t border-red-100 dark:border-red-900/50">
            <p className="text-xs text-center text-red-500 dark:text-red-400">
              Ne fermez pas cette fenêtre pendant le processus de suppression.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialogue de confirmation pour supprimer une transaction individuelle */}
      <AlertDialog open={showTransactionDeleteConfirm} onOpenChange={(open) => !isTransactionDeleting && setShowTransactionDeleteConfirm(open)}>
        <AlertDialogContent className="max-w-md bg-gradient-to-br from-background via-background to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-red-950/30 border border-red-100 dark:border-red-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Supprimer la transaction
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              <p className="mb-2">
                Vous êtes sur le point de supprimer définitivement cette transaction.
              </p>
              <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-md">
                <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Par défaut, les documents liés à cette transaction resteront accessibles dans la médiathèque mais ne seront plus associés à cette transaction.
                </p>
              </div>
              
              <div className="p-3 border border-red-200 dark:border-red-900/50 rounded-md bg-red-50 dark:bg-red-900/30 mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="delete-documents" 
                    checked={deleteLinkedDocuments} 
                    onCheckedChange={(checked) => setDeleteLinkedDocuments(!!checked)}
                    className="border-red-400 dark:border-red-600 text-red-600 dark:text-red-400"
                  />
                  <label 
                    htmlFor="delete-documents" 
                    className="text-sm font-medium leading-none text-red-800 dark:text-red-300 cursor-pointer select-none"
                  >
                    Je souhaite également supprimer définitivement les documents liés
                  </label>
                </div>
                {deleteLinkedDocuments && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 pl-6">
                    <p>⚠️ Attention : Les documents seront supprimés définitivement de la médiathèque et ne pourront pas être récupérés.</p>
                  </div>
                )}
              </div>
              
              <div className="p-3 border border-red-200 dark:border-red-900/50 rounded-md bg-red-50 dark:bg-red-900/30 mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="confirm-transaction-delete" 
                    checked={confirmTransactionDeleteChecked} 
                    onCheckedChange={(checked) => setConfirmTransactionDeleteChecked(!!checked)}
                    className="border-red-400 dark:border-red-600 text-red-600 dark:text-red-400"
                  />
                  <label 
                    htmlFor="confirm-transaction-delete" 
                    className="text-sm font-medium leading-none text-red-800 dark:text-red-300 cursor-pointer select-none"
                  >
                    Je confirme vouloir supprimer définitivement cette transaction
                  </label>
                </div>
              </div>
              
              <p className="text-red-600 dark:text-red-400 font-semibold mb-4">
                Cette action est irréversible et ne peut pas être annulée !
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isTransactionDeleting}
              className="hover:bg-red-50 dark:hover:bg-red-950/20 border-red-100 dark:border-red-900/30"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isTransactionDeleting || !confirmTransactionDeleteChecked}
              onClick={executeTransactionDeletion}
              className={cn(
                "text-white",
                confirmTransactionDeleteChecked 
                  ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600" 
                  : "bg-red-300 dark:bg-red-800/50 cursor-not-allowed hover:bg-red-300 dark:hover:bg-red-800/50"
              )}
            >
              {isTransactionDeleting ? (
                <div className="flex items-center">
                  <span className="mr-2">Suppression en cours</span>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                "Supprimer définitivement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}