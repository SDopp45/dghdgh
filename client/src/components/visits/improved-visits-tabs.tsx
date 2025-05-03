import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/types/visits";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
  History
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

const ITEMS_PER_PAGE = 15;

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

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Récupération des visites depuis l'API
  const { data: visits = [], isLoading } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
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

    // Trier selon le champ et l'ordre sélectionnés
    return dateFiltered.sort((a, b) => {
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
  }, [visits, activeTab, searchTerm, sortOrder, sortField, activeFilter]);

  // Compter les visites par statut
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    };

    visits.forEach(visit => {
      if (!visit.archived && counts[visit.status as keyof typeof counts] !== undefined) {
        counts[visit.status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [visits]);

  // Compter les visites passées en attente
  const pastVisitsCount = useMemo(() => {
    const currentDate = new Date();

    return visits.filter(visit => {
      const visitDate = new Date(visit.datetime);
      return !visit.archived && visitDate < currentDate && visit.status === "pending";
    }).length;
  }, [visits]);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                <Filter className="h-4 w-4 mr-1" />
                {activeFilter ? (
                  <span>
                    {activeFilter === "today" && "Aujourd'hui"}
                    {activeFilter === "tomorrow" && "Demain"}
                    {activeFilter === "thisWeek" && "Cette semaine"}
                  </span>
                ) : (
                  "Filtres"
                )}
                {activeFilter && <Badge variant="secondary" className="ml-1.5 py-0 h-5">1</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => setActiveFilter("today")}
                className={cn(activeFilter === "today" && "bg-primary/10 font-medium")}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Aujourd'hui
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveFilter("tomorrow")}
                className={cn(activeFilter === "tomorrow" && "bg-primary/10 font-medium")}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Demain
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveFilter("thisWeek")}
                className={cn(activeFilter === "thisWeek" && "bg-primary/10 font-medium")}
              >
                <CalendarRange className="h-4 w-4 mr-2" />
                Cette semaine
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveFilter(null)}
                disabled={!activeFilter}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Effacer les filtres
              </DropdownMenuItem>
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
                  {filteredVisits.length} visite{filteredVisits.length > 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              <CardDescription>
                Gérez et suivez toutes vos visites organisées par statut
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
                        <TableHead onClick={() => handleSort("name")} className="cursor-pointer hover:bg-muted/50 whitespace-nowrap">
                          <div className="flex items-center">
                            <span>Visiteur</span>
                            {sortField === "name" && (
                              <ArrowDownUp className={`h-3.5 w-3.5 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("datetime")} className="cursor-pointer hover:bg-muted/50 whitespace-nowrap">
                          <div className="flex items-center">
                            <span>Date & Heure</span>
                            {sortField === "datetime" && (
                              <ArrowDownUp className={`h-3.5 w-3.5 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("property")} className="cursor-pointer hover:bg-muted/50 whitespace-nowrap">
                          <div className="flex items-center">
                            <span>Bien</span>
                            {sortField === "property" && (
                              <ArrowDownUp className={`h-3.5 w-3.5 ml-1 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="whitespace-nowrap">Contact</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                            <TableCell className="font-medium py-4">
                              <div className="flex items-center gap-1.5">
                                <Badge 
                                  variant="outline" 
                                  className={`h-6 w-2 p-0 mr-2 ${statusConfig[visit.status as keyof typeof statusConfig].dot}`}
                                />
                                {visit.firstName} {visit.lastName}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center">
                                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {formatVisitDate(visit.datetime)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center overflow-hidden">
                                <MapPin className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                  {visit.property?.name || visit.manualAddress || "Non spécifié"}
                                </span>
                              </div>
                            </TableCell>
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
                      Affichage de {Math.min(1 + (currentPage - 1) * ITEMS_PER_PAGE, filteredVisits.length)} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredVisits.length)} sur {filteredVisits.length} visites
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