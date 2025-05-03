import { useState, useMemo } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/types/visits";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock3, 
  XCircle, 
  AlertCircle,
  CalendarRange,
  Search,
  History,
  ArrowDownUp,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { InputGroup } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { VisitsPastDialog } from "./visits-past-dialog";
import { EditVisitDialog } from "./edit-visit-dialog";
import { CalendarSyncMenu } from "./calendar-sync-menu";
import { VisitCard } from "./visit-card";

// Configuration des onglets par statut
const statusTabs = [
  { 
    id: "pending", 
    label: "En attente", 
    icon: <Clock3 className="h-4 w-4 mr-1.5 text-amber-500" />,
    color: "bg-amber-100 text-amber-800 hover:bg-amber-200"
  },
  { 
    id: "completed", 
    label: "Terminées", 
    icon: <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-500" />,
    color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
  },
  { 
    id: "cancelled", 
    label: "Annulées", 
    icon: <XCircle className="h-4 w-4 mr-1.5 text-rose-500" />,
    color: "bg-rose-100 text-rose-800 hover:bg-rose-200"
  },
  { 
    id: "no_show", 
    label: "Absents", 
    icon: <AlertCircle className="h-4 w-4 mr-1.5 text-neutral-500" />,
    color: "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
  },
];

const ITEMS_PER_PAGE = 10;

export function VisitsTabs() {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showVisitsPastDialog, setShowVisitsPastDialog] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [editVisitDialogOpen, setEditVisitDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

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

    // Pour l'onglet "En attente", on inclut toutes les visites
    // Pour les autres onglets, on filtre selon des règles spécifiques
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const filteredByStatus = statusFiltered.filter(visit => {
      if (!visit || visit.archived) return false;

      // Pour les visites en attente, on montre toutes (passées et à venir)
      if (activeTab === "pending") {
        return true;
      }

      // Pour les autres onglets (terminées, annulées, absents), on montre seulement:
      // - Les visites des 30 derniers jours 
      // - Les visites futures
      const visitDate = new Date(visit.datetime);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return visitDate >= thirtyDaysAgo;
    });

    // Trier par date
    return filteredByStatus.sort((a, b) => {
      const dateA = new Date(a.datetime).getTime();
      const dateB = new Date(b.datetime).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [visits, activeTab, searchTerm, sortOrder]);

  // Compter les visites par statut
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    };

    // On compte différemment selon le statut
    visits.forEach(visit => {
      if (visit.archived) return;

      // Pour les visites en attente, on compte toutes (passées et futures)
      if (visit.status === "pending") {
        counts.pending++;
        return;
      }

      // Pour les autres statuts, on applique la même règle de filtrage
      const visitDate = new Date(visit.datetime);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (visitDate >= thirtyDaysAgo) {
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

  // Grouper les visites par jour
  const visitsByDay = useMemo(() => {
    if (!filteredVisits.length) return {};

    const groups: Record<string, Visit[]> = {};

    filteredVisits.forEach(visit => {
      const date = new Date(visit.datetime);
      const dateKey = format(date, "yyyy-MM-dd");

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(visit);
    });

    return groups;
  }, [filteredVisits]);

  // Pagination des données
  const totalItems = Object.values(filteredVisits).length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Pour l'onglet "En attente" avec groupement par jour
  const paginatedVisitsByDay = useMemo(() => {
    if (activeTab === "pending") {
      const allDates = Object.keys(visitsByDay).sort();
      const visibleDates = sortOrder === "asc" 
        ? allDates
        : [...allDates].reverse();
        
      let itemCount = 0;
      let dateIndex = 0;
      const startItem = (currentPage - 1) * itemsPerPage;
      const paginatedDates: Record<string, Visit[]> = {};
      
      // Avancer jusqu'au début de la page courante
      while (dateIndex < visibleDates.length) {
        const dateKey = visibleDates[dateIndex];
        const dateVisitsCount = visitsByDay[dateKey].length;
        
        if (itemCount + dateVisitsCount <= startItem) {
          itemCount += dateVisitsCount;
          dateIndex++;
        } else {
          break;
        }
      }
      
      // Collecter les entrées pour la page courante
      let currentItemCount = 0;
      while (dateIndex < visibleDates.length && currentItemCount < itemsPerPage) {
        const dateKey = visibleDates[dateIndex];
        
        // Si on a déjà commencé à collecter une journée partielle
        if (itemCount > startItem) {
          const startIndex = 0;
          const availableItems = itemsPerPage - currentItemCount;
          const visitsToInclude = visitsByDay[dateKey].slice(0, availableItems);
          
          if (visitsToInclude.length > 0) {
            paginatedDates[dateKey] = visitsToInclude;
            currentItemCount += visitsToInclude.length;
          }
        } else {
          // Si on commence à collecter à partir du milieu d'une journée
          const startIndex = startItem - itemCount;
          const availableItems = itemsPerPage - currentItemCount;
          const visitsToInclude = visitsByDay[dateKey].slice(startIndex, startIndex + availableItems);
          
          if (visitsToInclude.length > 0) {
            paginatedDates[dateKey] = visitsToInclude;
            currentItemCount += visitsToInclude.length;
          }
        }
        
        itemCount += visitsByDay[dateKey].length;
        dateIndex++;
      }
      
      return paginatedDates;
    }
    
    return {};
  }, [visitsByDay, currentPage, itemsPerPage, activeTab, sortOrder]);
  
  // Pour les autres onglets sans groupement
  const paginatedVisits = useMemo(() => {
    if (activeTab !== "pending") {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredVisits.slice(startIndex, startIndex + itemsPerPage);
    }
    
    return [];
  }, [filteredVisits, currentPage, itemsPerPage, activeTab]);
  
  // Fonction pour changer de page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll vers le haut de la liste
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Modifier rapidement le statut d'une visite
  const handleStatusChange = async (visitId: number, newStatus: string) => {
    try {
      // Sauvegarder l'état actuel pour pouvoir y revenir en cas d'erreur
      const currentTab = activeTab;

      // Basculer automatiquement vers l'onglet du nouveau statut
      setActiveTab(newStatus);

      const response = await fetch(`/api/visits/${visitId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Mettre à jour localement les visites
      const updatedVisits = visits.map(visit => 
        visit.id === visitId ? { ...visit, status: newStatus } : visit
      );

      // Mettre à jour le cache directement sans déclencher une invalidation et un refetch
      queryClient.setQueryData(["/api/visits"], updatedVisits);

      // Le statut en français pour l'affichage
      const statusLabel = statusTabs.find(tab => tab.id === newStatus)?.label || newStatus;

      // Afficher une notification de succès
      toast?.({
        title: "Statut mis à jour",
        description: `La visite a été marquée comme "${statusLabel}"`,
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);

      // Revenir à l'onglet précédent en cas d'erreur
      setActiveTab(activeTab);

      toast?.({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la visite",
        variant: "destructive",
      });
    }
  };

  // Supprimer définitivement une visite
  const handleDeleteVisit = async (visitId: number) => {
    try {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Mettre à jour localement le cache
      const updatedVisits = visits.filter(visit => visit.id !== visitId);
      queryClient.setQueryData(["/api/visits"], updatedVisits);

      toast?.({
        title: "Visite supprimée",
        description: "La visite a été supprimée définitivement",
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de la visite:", error);

      toast?.({
        title: "Erreur",
        description: "Impossible de supprimer la visite",
        variant: "destructive",
      });
    }
  };

  // Rendu de l'interface
  return (
    <>
      <Card className="border border-violet-200 shadow-md overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Barre d'outils */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1">
              <InputGroup className="max-w-md">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  placeholder="Rechercher une visite..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="relative bg-white"
                onClick={() => setShowVisitsPastDialog(true)}
                title="Visites passées en attente"
              >
                <History className="h-4 w-4" />
                {pastVisitsCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 py-0 h-4 min-w-4 flex items-center justify-center text-xs bg-indigo-100 border-indigo-200"
                  >
                    {pastVisitsCount}
                  </Badge>
                )}
              </Button>

              {/* Bouton pour basculer vers la vue calendrier */}
              <Button
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={() => {
                  // Utiliser l'historique pour ajouter le paramètre view=calendar
                  window.history.pushState({}, '', '/visits?view=calendar');
                  // Déclencher un événement popstate pour mettre à jour la vue
                  window.dispatchEvent(new Event('popstate'));
                }}
                title="Passer à la vue calendrier"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={sortOrder === "asc" ? "Trier par date (plus récentes d'abord)" : "Trier par date (plus anciennes d'abord)"}
              >
                <ArrowDownUp className="h-4 w-4" />
              </Button>

              {/* Menu de synchronisation du calendrier */}
              <CalendarSyncMenu 
                activeStatuses={[activeTab]}
                onSyncStatus={(statuses) => console.log('Sync statuses:', statuses)} 
              />
            </div>
          </div>

          {/* Onglets par statut */}
          <Tabs 
            defaultValue="pending" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="flex h-10 w-full overflow-x-auto bg-background p-0.5 space-x-1 scrollbar-hide">
              {statusTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-4 py-1.5",
                    activeTab === tab.id ? tab.color : "hover:bg-muted",
                    activeTab === tab.id && "ring-2 ring-violet-500"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {statusCounts[tab.id as keyof typeof statusCounts] > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-1 py-0 h-5 min-w-5 flex items-center justify-center bg-white/20",
                        activeTab === tab.id && "bg-violet-100/30"
                      )}
                    >
                      {statusCounts[tab.id as keyof typeof statusCounts]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Contenu des onglets */}
            <div className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
                    </div>
                  ) : filteredVisits.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                        <CalendarRange className="h-8 w-8 text-violet-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Aucune visite trouvée</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {searchTerm 
                          ? "Essayez de modifier vos critères de recherche."
                          : `Vous n'avez pas de visites avec le statut "${statusTabs.find(t => t.id === activeTab)?.label}". Ajoutez votre première visite en cliquant sur le bouton 'Nouvelle visite'.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activeTab === "pending" ? (
                        // Pour l'onglet "En attente", on groupe par jour avec un séparateur de date
                        Object.entries(paginatedVisitsByDay).map(([dateKey, dayVisits]) => (
                          <div key={dateKey} className="space-y-3">
                            {/* Séparateur avec la date */}
                            <div className="relative py-2">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-muted"></div>
                              </div>
                              <div className="relative flex justify-center">
                                <span className="bg-background px-4 text-sm font-medium text-primary">
                                  {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: fr })}
                                </span>
                              </div>
                            </div>

                            {/* Visites du jour */}
                            {dayVisits.map((visit) => (
                              <VisitCard
                                key={visit.id} 
                                visit={visit}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDeleteVisit}
                                onEdit={() => {
                                  setSelectedVisit(visit);
                                  setEditVisitDialogOpen(true);
                                }}
                                showFullDate={false}
                              />
                            ))}
                          </div>
                        ))
                      ) : (
                        // Pour les autres onglets, on affiche simplement la liste
                        paginatedVisits.map((visit) => (
                          <VisitCard
                            key={visit.id} 
                            visit={visit}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteVisit}
                            onEdit={() => {
                              setSelectedVisit(visit);
                              setEditVisitDialogOpen(true);
                            }}
                            showFullDate={true}
                          />
                        ))
                      )}
                      
                      {/* Nouvelle pagination améliorée */}
                      {filteredVisits.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Afficher</span>
                            <select 
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1); // Revenir à la première page
                              }}
                              className="h-8 w-16 rounded-md border border-input bg-background px-2"
                            >
                              {[5, 10, 20, 50].map(size => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                            <span>par page | Total: {totalItems} visite{totalItems > 1 ? 's' : ''}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => goToPage(1)}
                              disabled={currentPage === 1}
                              className="h-8 w-8 p-0"
                              aria-label="Première page"
                            >
                              <span className="sr-only">Première page</span>
                              <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => goToPage(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="h-8 w-8 p-0"
                              aria-label="Page précédente"
                            >
                              <span className="sr-only">Page précédente</span>
                              <ChevronDown className="h-4 w-4 rotate-90" />
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber;
                                // Afficher 5 pages maximum avec la page actuelle au milieu si possible
                                if (totalPages <= 5) {
                                  pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNumber = totalPages - 4 + i;
                                } else {
                                  pageNumber = currentPage - 2 + i;
                                }
                                
                                return (
                                  <Button 
                                    key={pageNumber}
                                    variant={currentPage === pageNumber ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => goToPage(pageNumber)}
                                    className={`h-8 w-8 p-0 ${
                                      currentPage === pageNumber 
                                        ? "bg-[#70C7BA] hover:bg-[#49EACB] text-white" 
                                        : ""
                                    }`}
                                  >
                                    {pageNumber}
                                  </Button>
                                );
                              })}
                              
                              {totalPages > 5 && currentPage < totalPages - 2 && (
                                <>
                                  <span className="px-1">...</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(totalPages)}
                                    className="h-8 w-8 p-0"
                                  >
                                    {totalPages}
                                  </Button>
                                </>
                              )}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => goToPage(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="h-8 w-8 p-0"
                              aria-label="Page suivante"
                            >
                              <span className="sr-only">Page suivante</span>
                              <ChevronDown className="h-4 w-4 -rotate-90" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => goToPage(totalPages)}
                              disabled={currentPage === totalPages}
                              className="h-8 w-8 p-0"
                              aria-label="Dernière page"
                            >
                              <span className="sr-only">Dernière page</span>
                              <ChevronsRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>
      </Card>

      {/* Dialogue des visites passées */}
      <VisitsPastDialog
        open={showVisitsPastDialog}
        onOpenChange={setShowVisitsPastDialog}
      />

      {/* Dialogue d'édition des visites */}
      <EditVisitDialog
        visit={selectedVisit}
        open={editVisitDialogOpen}
        onOpenChange={setEditVisitDialogOpen}
      />
    </>
  );
}