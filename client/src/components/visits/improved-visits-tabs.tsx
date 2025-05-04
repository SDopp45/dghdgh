import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/types/visits";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import jsPDF from "jspdf";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Icons
import {
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ArrowDownUp,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  CalendarRange,
  Users,
  History,
  Video,
  Home,
  Sliders,
  X,
  Building,
  Download,
  FileText,
  FileSpreadsheet
} from "lucide-react";

// Dialogs
import { VisitsPastDialog } from "./visits-past-dialog";
import { EditVisitDialog } from "./edit-visit-dialog";
import { CalendarSyncMenu } from "./calendar-sync-menu";

// Configuration des onglets par statut
const statusTabs = [
  { 
    id: "pending", 
    label: "En attente", 
    icon: <Clock3 className="h-4 w-4 mr-1.5" />,
    color: "text-amber-500"
  },
  { 
    id: "completed", 
    label: "Terminées", 
    icon: <CheckCircle2 className="h-4 w-4 mr-1.5" />,
    color: "text-emerald-500"
  },
  { 
    id: "cancelled", 
    label: "Annulées", 
    icon: <XCircle className="h-4 w-4 mr-1.5" />,
    color: "text-rose-500"
  },
  { 
    id: "no_show", 
    label: "Absents", 
    icon: <AlertCircle className="h-4 w-4 mr-1.5" />,
    color: "text-neutral-500"
  },
];

// Configuration des badges de statut
const statusConfig = {
  pending: {
    label: "En attente",
    icon: <Clock3 className="h-3.5 w-3.5" />,
    color: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200",
    dot: "bg-amber-500"
  },
  completed: {
    label: "Terminée",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200",
    dot: "bg-emerald-500"
  },
  cancelled: {
    label: "Annulée",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200",
    dot: "bg-rose-500"
  },
  no_show: {
    label: "Absent",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border-neutral-200",
    dot: "bg-neutral-500"
  }
};

// Types de visites
const visitTypeConfig = {
  physical: {
    label: "En personne",
    icon: "🏠"
  },
  virtual: {
    label: "Virtuelle",
    icon: "💻"
  },
  video: {
    label: "Vidéo",
    icon: "📹"
  }
};

// Configuration des colonnes par type de vue
const columnsByViewType = {
  default: ["visitor", "datetime", "property", "contact", "type", "actions"],
  locataires: ["visitor", "datetime", "property", "type", "actions"],
  maintenance: ["visitor", "datetime", "property", "contact", "actions"],
  transactions: ["visitor", "property", "contact", "type", "actions"]
};

const ITEMS_PER_PAGE = 15;

// Définition du type Property
interface Property {
  id: number;
  name: string;
  address: string;
  // Ajoutez d'autres champs si nécessaire
}

export function ImprovedVisitsTabs() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortField, setSortField] = useState<string>("datetime");
  const [showVisitsPastDialog, setShowVisitsPastDialog] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [editVisitDialogOpen, setEditVisitDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Nouveaux états pour les filtres supplémentaires
  const [visitTypeFilter, setVisitTypeFilter] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<number | null>(null);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  
  // Type de vue sélectionné (par défaut, vue standard)
  const [activeViewType, setActiveViewType] = useState<keyof typeof columnsByViewType>(() => {
    // Récupérer la préférence utilisateur du localStorage
    const savedViewType = localStorage.getItem('visitsViewType');
    return (savedViewType as keyof typeof columnsByViewType) || "default";
  });
  
  // Compter le nombre total de filtres actifs
  const activeFiltersCount = [
    activeFilter !== null,
    visitTypeFilter !== null,
    propertyFilter !== null,
    dateRangeFilter?.from !== undefined
  ].filter(Boolean).length;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Récupération des visites depuis l'API
  const { data: visits = [], isLoading } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Récupération des propriétés pour le filtre de biens
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filtrage et tri des visites
  const filteredVisits = useMemo(() => {
    // Filtrer par terme de recherche
    const searchFiltered = searchTerm 
      ? visits.filter(visit => 
          visit.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visit.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (visit.property?.name && visit.property.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.manualAddress && visit.manualAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.email && visit.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : visits;

    // Filtrer par statut sélectionné
    const statusFiltered = searchFiltered.filter(visit => visit.status === activeTab);
 
    // Appliquer les filtres par date
    const dateFiltered = statusFiltered.filter(visit => {
      if (!activeFilter) return true;

      const visitDate = new Date(visit.datetime);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      if (activeFilter === "today") {
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        return visitDate >= today && visitDate <= endOfDay;
      }
      
      if (activeFilter === "tomorrow") {
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        return visitDate >= tomorrow && visitDate <= endOfTomorrow;
      }
      
      if (activeFilter === "thisWeek") {
        return visitDate >= today && visitDate < nextWeek;
      }
      
      return true;
    });
    
    // Appliquer les filtres supplémentaires
    return dateFiltered.filter(visit => {
      // Filtre par type de visite (par défaut, afficher tous les types si aucun filtre n'est sélectionné)
      if (visitTypeFilter && visit.visitType !== visitTypeFilter) {
        return false;
      }
      
      // Filtre par propriété (par défaut, afficher toutes les propriétés si aucun filtre n'est sélectionné)
      if (propertyFilter && visit.propertyId !== propertyFilter) {
        return false;
      }
      
      // Filtre par plage de dates
      if (dateRangeFilter?.from) {
        const visitDate = new Date(visit.datetime);
        
        const fromDate = startOfDay(dateRangeFilter.from);
        const toDate = dateRangeFilter.to ? endOfDay(dateRangeFilter.to) : endOfDay(dateRangeFilter.from);
        
        if (!isWithinInterval(visitDate, { start: fromDate, end: toDate })) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      let valueA, valueB;
      
      if (sortField === "datetime") {
        valueA = new Date(a.datetime).getTime();
        valueB = new Date(b.datetime).getTime();
      } else if (sortField === "name") {
        valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (sortField === "property") {
        valueA = (a.property?.name || a.manualAddress || "").toLowerCase();
        valueB = (b.property?.name || b.manualAddress || "").toLowerCase();
      } else {
        valueA = a[sortField as keyof Visit] || "";
        valueB = b[sortField as keyof Visit] || "";
      }
      
      return sortOrder === "asc" 
        ? valueA > valueB ? 1 : -1
        : valueA < valueB ? 1 : -1;
    });
  }, [visits, activeTab, searchTerm, sortOrder, sortField, activeFilter, visitTypeFilter, propertyFilter, dateRangeFilter]);

  // Compter les visites par statut
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    };

    // Appliquer les filtres avant de compter
    visits.forEach(visit => {
      if (visit.archived) return;

      // Filtres de recherche
      if (searchTerm) {
        const matchesSearch = 
          visit.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visit.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (visit.property?.name && visit.property.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.manualAddress && visit.manualAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.email && visit.email.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchesSearch) return;
      }

      // Filtre de type de visite
      if (visitTypeFilter && visit.visitType !== visitTypeFilter) return;
      
      // Filtre de propriété
      if (propertyFilter && visit.propertyId !== propertyFilter) return;
      
      // Filtre de date prédéfini
      if (activeFilter) {
        const visitDate = new Date(visit.datetime);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        if (activeFilter === "today") {
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);
          if (!(visitDate >= today && visitDate <= endOfDay)) return;
        }
        
        if (activeFilter === "tomorrow") {
          const endOfTomorrow = new Date(tomorrow);
          endOfTomorrow.setHours(23, 59, 59, 999);
          if (!(visitDate >= tomorrow && visitDate <= endOfTomorrow)) return;
        }
        
        if (activeFilter === "thisWeek") {
          if (!(visitDate >= today && visitDate < nextWeek)) return;
        }
      }
      
      // Filtre de plage de dates spécifique
      if (dateRangeFilter?.from) {
        const visitDate = new Date(visit.datetime);
        
        const fromDate = startOfDay(dateRangeFilter.from);
        const toDate = dateRangeFilter.to ? endOfDay(dateRangeFilter.to) : endOfDay(dateRangeFilter.from);
        
        if (!isWithinInterval(visitDate, { start: fromDate, end: toDate })) return;
      }

      // Si la visite passe tous les filtres, on l'ajoute au compteur correspondant
      if (counts[visit.status as keyof typeof counts] !== undefined) {
        counts[visit.status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [visits, searchTerm, visitTypeFilter, propertyFilter, activeFilter, dateRangeFilter]);

  // Compter le nombre total de visites filtrées (pour l'affichage "X visites trouvées")
  const totalFilteredVisits = useMemo(() => {
    return statusCounts.pending + statusCounts.completed + statusCounts.cancelled + statusCounts.no_show;
  }, [statusCounts]);

  // Compter les visites passées en attente qui correspondent aussi aux filtres
  const pastVisitsCount = useMemo(() => {
    const currentDate = new Date();

    return visits.filter(visit => {
      const visitDate = new Date(visit.datetime);
      
      // Condition de base: passée, en attente, non archivée
      const isPassedPending = !visit.archived && visitDate < currentDate && visit.status === "pending";
      if (!isPassedPending) return false;
      
      // Appliquer les filtres
      if (searchTerm) {
        const matchesSearch = 
          visit.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visit.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (visit.property?.name && visit.property.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.manualAddress && visit.manualAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.email && visit.email.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchesSearch) return false;
      }

      if (visitTypeFilter && visit.visitType !== visitTypeFilter) return false;
      if (propertyFilter && visit.propertyId !== propertyFilter) return false;
      
      // Note: on n'applique pas les filtres de date aux visites passées
      // car l'utilisateur veut généralement voir toutes les visites passées en attente
      
      return true;
    }).length;
  }, [visits, searchTerm, visitTypeFilter, propertyFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredVisits.length / ITEMS_PER_PAGE);
  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Navigation entre les pages
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  // Changement de statut d'une visite
  const handleStatusChange = async (visitId: number, newStatus: string) => {
    try {
      await fetch(`/api/visits/${visitId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      
      // Mettre à jour les données localement
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la visite a été modifié avec succès.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la visite.",
        variant: "destructive",
      });
    }
  };

  // Suppression d'une visite
  const handleDeleteVisit = async (visitId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette visite ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      await fetch(`/api/visits/${visitId}`, {
        method: "DELETE"
      });
      
      // Mettre à jour les données localement
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      
      toast({
        title: "Visite supprimée",
        description: "La visite a été supprimée avec succès.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la visite.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour formater la date
  const formatVisitDate = (datetime: string) => {
    const date = parseISO(datetime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const visitDate = new Date(date);
    visitDate.setHours(0, 0, 0, 0);
    
    if (visitDate.getTime() === today.getTime()) {
      return `Aujourd'hui à ${format(date, "HH'h'mm", { locale: fr })}`;
    } else if (visitDate.getTime() === tomorrow.getTime()) {
      return `Demain à ${format(date, "HH'h'mm", { locale: fr })}`;
    } else {
      return format(date, "dd MMM yyyy 'à' HH'h'mm", { locale: fr });
    }
  };

  // Gestion des actions de tri
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Réinitialiser tous les filtres
  const resetAllFilters = () => {
    setActiveFilter(null);
    setVisitTypeFilter(null);
    setPropertyFilter(null);
    setDateRangeFilter(undefined);
    setFilterMenuOpen(false);
  };
  
  // Mise à jour des dates lorsqu'un filtre prédéfini est sélectionné
  useEffect(() => {
    if (activeFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (activeFilter === "today") {
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        setDateRangeFilter({
          from: today,
          to: endOfDay
        });
      } 
      else if (activeFilter === "tomorrow") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        
        setDateRangeFilter({
          from: tomorrow,
          to: endOfTomorrow
        });
      } 
      else if (activeFilter === "thisWeek") {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 6); // 7 jours au total (aujourd'hui + 6)
        nextWeek.setHours(23, 59, 59, 999);
        
        setDateRangeFilter({
          from: today,
          to: nextWeek
        });
      }
    }
  }, [activeFilter]);

  // Sauvegarder le type de vue dans localStorage
  useEffect(() => {
    localStorage.setItem('visitsViewType', activeViewType);
  }, [activeViewType]);

  // Fonction pour exporter les données filtrées
  const exportVisitsData = (exportFormat: 'csv' | 'pdf', visits: Visit[]) => {
    console.log("Exporting visits:", exportFormat, visits.length);
    // Fonction pour formater la date
    const formatDateStr = (dateStr: string) => {
      const date = new Date(dateStr);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
    };

    if (exportFormat === 'csv') {
      // Préparation de l'en-tête CSV
      const headers = [
        'Prénom',
        'Nom',
        'Email',
        'Téléphone',
        'Date et heure',
        'Type de visite',
        'Propriété',
        'Statut',
        'Message'
      ].join(',');
      
      // Préparation des données
      const rows = visits.map(visit => {
        // Protection contre les virgules dans les données (CSV)
        const escapeCSV = (str: string) => str ? `"${str.replace(/"/g, '""')}"` : '';
        
        return [
          escapeCSV(visit.firstName),
          escapeCSV(visit.lastName),
          escapeCSV(visit.email),
          escapeCSV(visit.phone),
          escapeCSV(formatDateStr(visit.datetime)),
          escapeCSV(visitTypeConfig[visit.visitType as keyof typeof visitTypeConfig]?.label || visit.visitType),
          escapeCSV(visit.property?.name || visit.manualAddress || ''),
          escapeCSV(statusConfig[visit.status as keyof typeof statusConfig]?.label || visit.status),
          escapeCSV(visit.message || '')
        ].join(',');
      });
      
      // Création du contenu CSV
      const csvContent = [headers, ...rows].join('\n');
      
      // Création d'un blob et du lien de téléchargement
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      // Nom du fichier avec date et statut
      const statusName = statusConfig[activeTab as keyof typeof statusConfig]?.label.toLowerCase() || activeTab;
      const today = new Date();
      const dateStr = format(today, 'yyyy-MM-dd');
      link.setAttribute('download', `visites_${statusName}_${dateStr}.csv`);
      
      // Déclenchement du téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (exportFormat === 'pdf') {
      try {
        // On récupère la configuration PDF stockée dans localStorage
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
          // Enlever le # si présent
          hex = hex.replace(/^#/, '');
          
          // Convertir les formats abrégés (par exemple, #03F en #0033FF)
          if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
          }
          
          const bigint = parseInt(hex, 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          
          return {r, g, b, array: [r, g, b] as [number, number, number]};
        };
        
        // Appliquer la configuration
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
        
        // Titre et filtres
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        
        // Déterminer le titre en fonction de l'onglet actif
        const statusName = statusConfig[activeTab as keyof typeof statusConfig]?.label || "Visites";
        const documentTitle = `Liste des visites - ${statusName}`;
        doc.text(documentTitle, 15, 40);
        
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
        
        // Ajouter des infos sur les filtres appliqués
        const filters: string[] = [];
        
        if (searchTerm) filters.push(`Recherche: ${searchTerm}`);
        if (activeFilter === "today") filters.push("Période: Aujourd'hui");
        if (activeFilter === "tomorrow") filters.push("Période: Demain");
        if (activeFilter === "thisWeek") filters.push("Période: Cette semaine");
        
        if (visitTypeFilter) {
          const typeName = visitTypeConfig[visitTypeFilter as keyof typeof visitTypeConfig]?.label || visitTypeFilter;
          filters.push(`Type: ${typeName}`);
        }
        
        if (propertyFilter) {
          const property = properties.find(p => p.id === propertyFilter);
          if (property) filters.push(`Bien: ${property.name}`);
        }
        
        if (dateRangeFilter?.from) {
          const fromDate = format(dateRangeFilter.from, 'dd/MM/yyyy', { locale: fr });
          const toDate = dateRangeFilter.to 
            ? format(dateRangeFilter.to, 'dd/MM/yyyy', { locale: fr })
            : fromDate;
          filters.push(`Dates: ${fromDate} à ${toDate}`);
        }
        
        if (filters.length > 0) {
          let filterText = 'Filtres appliqués : ' + filters.join(', ');
          const textLines = doc.splitTextToSize(filterText, 180);
          doc.text(textLines, 15, yPos);
          yPos += textLines.length * 5 + 5;
        }
        
        // Préparation des données pour le tableau
        const tableData = visits.map(visit => [
          `${visit.firstName || ''} ${visit.lastName || ''}`,
          formatDateStr(visit.datetime),
          visitTypeConfig[visit.visitType as keyof typeof visitTypeConfig]?.label || visit.visitType,
          visit.property?.name || visit.manualAddress || '-',
          statusConfig[visit.status as keyof typeof statusConfig]?.label || visit.status,
          visit.email || '-',
          visit.phone || '-'
        ]);
        
        // Définir les colonnes
        const tableColumns = [
          'Visiteur',
          'Date & Heure',
          'Type',
          'Bien',
          'Statut',
          'Email',
          'Téléphone'
        ];
        
        // Créer le tableau
        import('jspdf-autotable').then((autoTable) => {
          autoTable.default(doc, {
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
              0: { fontStyle: 'bold' }, // Nom du visiteur en gras
              4: { fontStyle: 'bold' }  // Statut en gras
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
              doc.text(pdfConfig.footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
            
            // Numéro de page
            doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 10);
          }
          
          // Télécharger le fichier PDF
          const statusSlug = activeTab || 'toutes';
          const today = new Date();
          const dateStr = format(today, 'yyyy-MM-dd');
          doc.save(`visites_${statusSlug}_${dateStr}.pdf`);
          
          toast({
            title: "Export PDF réussi",
            description: "Le document a été généré avec succès",
            variant: "default"
          });
        });
      } catch (error) {
        console.error('Erreur export PDF:', error);
        toast({
          title: "Erreur d'exportation",
          description: "Impossible de générer le PDF. Veuillez réessayer.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Notification pour les visites passées */}
      {pastVisitsCount > 0 && (
        <Button 
          variant="outline" 
          className="w-full justify-between px-4 py-3 text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
          onClick={() => setShowVisitsPastDialog(true)}
        >
          <div className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            <span><strong>{pastVisitsCount}</strong> visite{pastVisitsCount > 1 ? 's' : ''} passée{pastVisitsCount > 1 ? 's' : ''} en attente</span>
          </div>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">Traiter</span>
        </Button>
      )}

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une visite..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2">
          <Popover open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="relative group gap-1 hover:bg-primary/5 transition-colors"
              >
                <Filter className="h-4 w-4 mr-1 group-hover:text-primary" />
                <span className="group-hover:text-primary">Filtres</span>
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 py-0 h-5 min-w-[20px] flex items-center justify-center bg-primary text-primary-foreground"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[340px] p-0 sm:w-[420px] md:w-[480px] shadow-lg border-primary/10" 
              align="end"
              sideOffset={5}
            >
              <div className="p-5 space-y-5">
                <div className="flex justify-between items-center border-b pb-3">
                  <h4 className="font-medium text-lg flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtres avancés
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetAllFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Réinitialiser
                  </Button>
                </div>
                
                {/* Filtres prédéfinis */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Période
                  </h5>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={!activeFilter || activeFilter === "today" ? "default" : "outline"}
                      size="sm" 
                      className="justify-start h-9 transition-all"
                      onClick={() => {
                        setActiveFilter(activeFilter === "today" ? null : "today");
                        setDateRangeFilter(undefined);
                      }}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      Aujourd'hui
                    </Button>
                    <Button 
                      variant={!activeFilter || activeFilter === "tomorrow" ? "default" : "outline"}
                      size="sm" 
                      className="justify-start h-9 transition-all"
                      onClick={() => {
                        setActiveFilter(activeFilter === "tomorrow" ? null : "tomorrow");
                        setDateRangeFilter(undefined);
                      }}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      Demain
                    </Button>
                    <Button 
                      variant={!activeFilter || activeFilter === "thisWeek" ? "default" : "outline"}
                      size="sm" 
                      className="justify-start h-9 transition-all"
                      onClick={() => {
                        setActiveFilter(activeFilter === "thisWeek" ? null : "thisWeek");
                        setDateRangeFilter(undefined);
                      }}
                    >
                      <CalendarRange className="h-3.5 w-3.5 mr-1.5" />
                      Cette semaine
                    </Button>
                  </div>
                </div>
                
                {/* Calendrier pour sélection de dates spécifiques */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium flex items-center gap-1.5">
                      <CalendarRange className="h-4 w-4 text-primary" />
                      Dates spécifiques
                    </h5>
                    {(dateRangeFilter?.from || dateRangeFilter?.to) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setDateRangeFilter(undefined);
                          if (activeFilter) {
                            setActiveFilter(null);
                          }
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Effacer
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="text-xs text-muted-foreground">Date de début</div>
                      <Input 
                        type="date" 
                        className="h-9"
                        value={dateRangeFilter?.from ? format(dateRangeFilter.from, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          const to = dateRangeFilter?.to;
                          
                          if (newDate) {
                            setDateRangeFilter({ 
                              from: newDate,
                              to: to || newDate // Utilisez la même date si pas de date de fin
                            });
                            setActiveFilter(null); // Désactiver les filtres prédéfinis
                          } else if (to) {
                            // On ne peut pas avoir seulement "to" sans "from" dans DateRange
                            setDateRangeFilter({ 
                              from: to, // Utilisez la date de fin comme début aussi
                              to: to 
                            });
                          } else {
                            setDateRangeFilter(undefined);
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs text-muted-foreground">Date de fin</div>
                      <Input 
                        type="date" 
                        className="h-9"
                        value={dateRangeFilter?.to ? format(dateRangeFilter.to, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          const newDate = e.target.value ? new Date(e.target.value) : undefined;
                          const from = dateRangeFilter?.from;
                          
                          if (newDate && from) {
                            setDateRangeFilter({ 
                              from,
                              to: newDate
                            });
                          } else if (newDate) {
                            // Si on a une date de fin mais pas de début, utiliser la même date pour les deux
                            setDateRangeFilter({ 
                              from: newDate,
                              to: newDate
                            });
                            setActiveFilter(null);
                          } else if (from) {
                            // On ne peut pas avoir seulement "from" sans "to" dans l'UI
                            // alors on utilise la même date pour le début et la fin
                            setDateRangeFilter({ 
                              from: from,
                              to: from
                            });
                          } else {
                            setDateRangeFilter(undefined);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator className="my-1" />
                
                {/* Type de visite */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-primary" />
                      Type de visite
                    </h5>
                    {visitTypeFilter && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setVisitTypeFilter(null)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Effacer
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={!visitTypeFilter || visitTypeFilter === "physical" ? "default" : "outline"}
                      size="sm" 
                      className="justify-start h-9 transition-all"
                      onClick={() => {
                        if (visitTypeFilter === "physical") {
                          setVisitTypeFilter(null);
                        } else {
                          setVisitTypeFilter("physical");
                        }
                      }}
                    >
                      <Home className="h-3.5 w-3.5 mr-1.5" />
                      En personne
                    </Button>
                    <Button 
                      variant={!visitTypeFilter || visitTypeFilter === "virtual" ? "default" : "outline"}
                      size="sm" 
                      className="justify-start h-9 transition-all"
                      onClick={() => {
                        if (visitTypeFilter === "virtual") {
                          setVisitTypeFilter(null);
                        } else {
                          setVisitTypeFilter("virtual");
                        }
                      }}
                    >
                      <span className="mr-1.5">💻</span>
                      Virtuelle
                    </Button>
                    <Button 
                      variant={!visitTypeFilter || visitTypeFilter === "video" ? "default" : "outline"}
                      size="sm" 
                      className="justify-start h-9 transition-all"
                      onClick={() => {
                        if (visitTypeFilter === "video") {
                          setVisitTypeFilter(null);
                        } else {
                          setVisitTypeFilter("video");
                        }
                      }}
                    >
                      <Video className="h-3.5 w-3.5 mr-1.5" />
                      Vidéo
                    </Button>
                  </div>
                </div>
                
                <Separator className="my-1" />
                
                {/* Biens */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      Biens immobiliers
                    </h5>
                    {propertyFilter && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setPropertyFilter(null)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Effacer
                      </Button>
                    )}
                  </div>
                  <ScrollArea 
                    className="h-[120px] rounded-md p-1 border border-primary/10 bg-card"
                    type="always"
                  >
                    <div className="space-y-1 pr-3">
                      {properties.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-6 flex flex-col items-center gap-2">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          Aucun bien disponible
                        </div>
                      ) : (
                        properties.map((property: Property) => (
                          <Button
                            key={property.id}
                            variant={!propertyFilter || propertyFilter === property.id ? "default" : "ghost"}
                            size="sm"
                            className={cn(
                              "w-full justify-start h-8 transition-all",
                              propertyFilter === property.id ? "" : "hover:bg-muted"
                            )}
                            onClick={() => setPropertyFilter(propertyFilter === property.id ? null : property.id)}
                          >
                            <MapPin className="h-3.5 w-3.5 mr-1.5" />
                            {property.name || property.address}
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              
              <div className="flex border-t p-4 gap-3 bg-muted/50">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setFilterMenuOpen(false)}
                >
                  Fermer
                </Button>
                <Button 
                  className="flex-1" 
                  disabled={activeFiltersCount === 0}
                  onClick={resetAllFilters}
                >
                  Effacer les filtres
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-1 hover:bg-primary/5 transition-colors"
              >
                {activeFilter ? (
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1.5" />
                    {activeFilter === "today" && "Aujourd'hui"}
                    {activeFilter === "tomorrow" && "Demain"}
                    {activeFilter === "thisWeek" && "Cette semaine"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Période</span>
                  </span>
                )}
                {activeFilter && (
                  <Badge variant="secondary" className="ml-1.5 py-0 h-5 bg-primary/20">1</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Filtrer par période
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveFilter("today")}
                className={cn(
                  "flex items-center cursor-pointer",
                  !activeFilter || activeFilter === "today" ? "bg-primary/10 text-primary font-medium" : ""
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Aujourd'hui
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveFilter("tomorrow")}
                className={cn(
                  "flex items-center cursor-pointer",
                  !activeFilter || activeFilter === "tomorrow" ? "bg-primary/10 text-primary font-medium" : ""
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Demain
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveFilter("thisWeek")}
                className={cn(
                  "flex items-center cursor-pointer",
                  !activeFilter || activeFilter === "thisWeek" ? "bg-primary/10 text-primary font-medium" : ""
                )}
              >
                <CalendarRange className="h-4 w-4 mr-2" />
                Cette semaine
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveFilter(null)}
                disabled={!activeFilter}
                className="text-muted-foreground"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Effacer le filtre
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menu d'export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-1 hover:bg-primary/5 transition-colors"
                title="Exporter les données"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Exporter les visites {statusConfig[activeTab as keyof typeof statusConfig]?.label.toLowerCase()}
                {activeFiltersCount > 0 && " (filtrées)"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => exportVisitsData('csv', filteredVisits)}
                className="flex items-center cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => exportVisitsData('pdf', filteredVisits)}
                className="flex items-center cursor-pointer"
              >
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                Exporter en PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {filteredVisits.length} visite{filteredVisits.length > 1 ? "s" : ""} à exporter
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <CalendarSyncMenu />
        </div>
      </div>
      
      {/* Onglets par statut */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-2">
          {statusTabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center justify-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              <span className={`flex items-center ${tab.color}`}>
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {statusCounts[tab.id as keyof typeof statusCounts] > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {statusCounts[tab.id as keyof typeof statusCounts]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {isLoading ? (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center justify-between">
                <span>Visites {statusConfig[activeTab as keyof typeof statusConfig].label}</span>
                <Badge variant="outline" className="font-normal">
                  {totalFilteredVisits} visite{totalFilteredVisits > 1 ? "s" : ""}
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">(filtré)</span>
                  )}
                </Badge>
              </CardTitle>
              <CardDescription>
                {activeFiltersCount > 0 ? (
                  <>
                    Résultats filtrés selon les critères sélectionnés
                  </>
                ) : (
                  <>
                    Affichage de toutes les visites {statusConfig[activeTab as keyof typeof statusConfig].label.toLowerCase()}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paginatedVisits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune visite {statusConfig[activeTab as keyof typeof statusConfig].label.toLowerCase()}</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {columnsByViewType[activeViewType].includes("visitor") && (
                          <TableHead onClick={() => handleSort("name")} className="cursor-pointer hover:bg-muted/50 whitespace-nowrap">
                            <div className="flex items-center">
                              <span>Visiteur</span>
                              {sortField === "name" && (
                                <ArrowDownUp className={`h-3.5 w-3.5 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                        )}
                        
                        {columnsByViewType[activeViewType].includes("datetime") && (
                          <TableHead onClick={() => handleSort("datetime")} className="cursor-pointer hover:bg-muted/50 whitespace-nowrap">
                            <div className="flex items-center">
                              <span>Date & Heure</span>
                              {sortField === "datetime" && (
                                <ArrowDownUp className={`h-3.5 w-3.5 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                        )}
                        
                        {columnsByViewType[activeViewType].includes("property") && (
                          <TableHead onClick={() => handleSort("property")} className="cursor-pointer hover:bg-muted/50 whitespace-nowrap">
                            <div className="flex items-center">
                              <span>Bien</span>
                              {sortField === "property" && (
                                <ArrowDownUp className={`h-3.5 w-3.5 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                        )}
                        
                        {columnsByViewType[activeViewType].includes("contact") && (
                          <TableHead className="whitespace-nowrap">Contact</TableHead>
                        )}
                        
                        {columnsByViewType[activeViewType].includes("type") && (
                          <TableHead className="whitespace-nowrap">Type</TableHead>
                        )}
                        
                        {columnsByViewType[activeViewType].includes("actions") && (
                          <TableHead className="text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence initial={false} mode="popLayout">
                        {paginatedVisits.map((visit) => (
                          <motion.tr
                            key={visit.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-muted/50 cursor-pointer border-b"
                            onClick={() => {
                              setSelectedVisit(visit);
                              setEditVisitDialogOpen(true);
                            }}
                          >
                            {columnsByViewType[activeViewType].includes("visitor") && (
                              <TableCell className="font-medium py-4">
                                <div className="flex items-center gap-1.5">
                                  <Badge 
                                    variant="outline" 
                                    className={`h-6 w-2 p-0 mr-2 ${statusConfig[visit.status as keyof typeof statusConfig].dot}`}
                                  />
                                  {visit.firstName} {visit.lastName}
                                </div>
                              </TableCell>
                            )}
                            
                            {columnsByViewType[activeViewType].includes("datetime") && (
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center">
                                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                  {formatVisitDate(visit.datetime)}
                                </div>
                              </TableCell>
                            )}
                            
                            {columnsByViewType[activeViewType].includes("property") && (
                              <TableCell>
                                <div className="flex items-center overflow-hidden">
                                  <MapPin className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
                                  <span className="truncate">
                                    {visit.property?.name || visit.manualAddress || "Non spécifié"}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            
                            {columnsByViewType[activeViewType].includes("contact") && (
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center">
                                    <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                    <span className="truncate">{visit.email}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                    <span>{visit.phone}</span>
                                  </div>
                                </div>
                              </TableCell>
                            )}
                            
                            {columnsByViewType[activeViewType].includes("type") && (
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="whitespace-nowrap">
                                        <span className="mr-1">{visitTypeConfig[visit.visitType as keyof typeof visitTypeConfig].icon}</span>
                                        <span className="hidden sm:inline">
                                          {visitTypeConfig[visit.visitType as keyof typeof visitTypeConfig].label}
                                        </span>
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {visitTypeConfig[visit.visitType as keyof typeof visitTypeConfig].label}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            )}
                            
                            {columnsByViewType[activeViewType].includes("actions") && (
                              <TableCell className="text-right">
                                <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setSelectedVisit(visit);
                                      setEditVisitDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={() => handleDeleteVisit(visit.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {Object.entries(statusConfig).map(([status, config]) => (
                                        status !== visit.status && (
                                          <DropdownMenuItem
                                            key={status}
                                            onClick={() => handleStatusChange(visit.id, status)}
                                            className="flex items-center gap-2"
                                          >
                                            {config.icon}
                                            <span>Marquer comme {config.label}</span>
                                          </DropdownMenuItem>
                                        )
                                      ))}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        <span>Voir les détails</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            )}
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Affichage de {Math.min(1 + (currentPage - 1) * ITEMS_PER_PAGE, totalFilteredVisits)} à {Math.min(currentPage * ITEMS_PER_PAGE, totalFilteredVisits)} sur {totalFilteredVisits} visites
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" 
                      size="icon"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline" 
                      size="icon"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                    
                    <div className="flex items-center mx-2">
                      <span>{currentPage} / {totalPages}</span>
                    </div>
                    
                    <Button
                      variant="outline" 
                      size="icon"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                    <Button
                      variant="outline" 
                      size="icon"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Tabs>

      {/* Dialogs */}
      {showVisitsPastDialog && (
        <VisitsPastDialog
          open={showVisitsPastDialog}
          onOpenChange={(open) => setShowVisitsPastDialog(open)}
          visits={visits.filter(v => 
            !v.archived && 
            v.status === "pending" && 
            new Date(v.datetime) < new Date()
          )}
        />
      )}

      {selectedVisit && (
        <EditVisitDialog
          open={editVisitDialogOpen}
          onOpenChange={(open) => {
            setEditVisitDialogOpen(open);
            if (!open) setSelectedVisit(null);
          }}
          visit={selectedVisit}
        />
      )}
    </div>
  );
} 