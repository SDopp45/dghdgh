import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, parseISO, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Archive, Calendar, MapPin, Mail, Phone, Trash2, ChevronDown, Search, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Visit } from "@/types/visits";
import { DateRange } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";
import { ExportMenu } from "@/components/data-export/ExportMenu";
import { cn } from "@/lib/utils";
import { EditVisitDialog } from "./edit-visit-dialog";
import { AdvancedFilters } from "./advanced-filters"; // Changed to named import
import { CalendarSyncMenu } from "./calendar-sync-menu";


interface Props {
  visits: Visit[];
  filters: {
    search: string;
    dateRange: DateRange | undefined;
    status?: string[];
  };
  onFilterChange: (filters: {
    search: string;
    dateRange: DateRange | undefined;
    status?: string[];
  }) => void;
  setFilters?: (value: React.SetStateAction<{
    search: string;
    dateRange: DateRange | undefined;
    status?: string[];
  }>) => void;
}

const ITEMS_PER_PAGE = 10;

export function VisitsList({ visits = [], filters, onFilterChange, setFilters }: Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const queryClient = useQueryClient();
  const [visitToDelete, setVisitToDelete] = useState<number | null>(null);
  const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);
  const [page, setPage] = useState(1);
  const [advancedFilters, setAdvancedFilters] = useState({
    status: "",
    visitType: "",
    startDate: "",
    endDate: "",
  });
  const [isArchiving, setIsArchiving] = useState(false); // Added state for archiving

  const now = new Date();

  const filteredVisits = visits.filter(visit => {
    const visitDate = parseISO(visit.datetime);

    // Filtre de recherche globale
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchMatch =
        visit.firstName.toLowerCase().includes(searchTerm) ||
        visit.lastName.toLowerCase().includes(searchTerm) ||
        visit.email.toLowerCase().includes(searchTerm) ||
        visit.phone.includes(searchTerm) ||
        (visit.property?.name || "").toLowerCase().includes(searchTerm) ||
        (visit.manualAddress || "").toLowerCase().includes(searchTerm) ||
        (visit.message || "").toLowerCase().includes(searchTerm);

      if (!searchMatch) return false;
    }

    // Filtres avancés
    if (advancedFilters.status && advancedFilters.status !== "all" && visit.status !== advancedFilters.status) {
      return false;
    }

    if (advancedFilters.visitType && advancedFilters.visitType !== "all" && visit.visitType !== advancedFilters.visitType) {
      return false;
    }

    if (advancedFilters.startDate) {
      const startDate = new Date(advancedFilters.startDate);
      if (visitDate < startDate) return false;
    }

    if (advancedFilters.endDate) {
      const endDate = new Date(advancedFilters.endDate);
      endDate.setHours(23, 59, 59);
      if (visitDate > endDate) return false;
    }

    // Filtre de date global
    if (filters.dateRange?.from) {
      if (visitDate < filters.dateRange.from) return false;
    }
    if (filters.dateRange?.to) {
      if (visitDate > filters.dateRange.to) return false;
    }

    return true;
  });

  // Séparer les visites à venir et archivées
  // Note: On garde les visites passées en attente dans la liste des visites à venir
  const upcomingVisits = filteredVisits
    .filter(visit => !visit.archived)
    .sort((a, b) => parseISO(a.datetime).getTime() - parseISO(b.datetime).getTime());

  const archivedVisits = filteredVisits
    .filter(visit => visit.archived === true)
    .sort((a, b) => parseISO(b.datetime).getTime() - parseISO(a.datetime).getTime());

  const paginatedVisits = (visits: Visit[]) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return visits.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const currentVisits = activeTab === "upcoming" ? upcomingVisits : archivedVisits;
  const totalPages = Math.ceil(currentVisits.length / ITEMS_PER_PAGE);


  const groupVisitsByMonth = (visits: Visit[]) => {
    return visits.reduce((groups: Record<string, Visit[]>, visit) => {
      const monthKey = format(parseISO(visit.datetime), "yyyy-MM");
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(visit);
      return groups;
    }, {});
  };

  // Fonction pour grouper les visites par jour
  const groupVisitsByDay = (visits: Visit[]) => {
    return visits.reduce((groups: Record<string, Visit[]>, visit) => {
      const dayKey = format(parseISO(visit.datetime), "yyyy-MM-dd");
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(visit);
      return groups;
    }, {});
  };

  const upcomingByMonth = groupVisitsByMonth(upcomingVisits);
  const archivedByMonth = groupVisitsByMonth(archivedVisits);

  // Trouver les visites en attente pour le dialogue des visites passées
  const pendingPastVisits = useMemo(() => {
    return visits.filter(visit => {
      const visitDate = parseISO(visit.datetime);
      return visitDate < now && visit.status === "pending" && !visit.archived;
    });
  }, [visits, now]);

  // Grouper les visites en attente passées par jour
  const pendingPastByDay = groupVisitsByDay(pendingPastVisits);

  const archiveMutation = useMutation({
    mutationFn: async (visitId: number) => {
      const response = await fetch(`/api/visits/${visitId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de l'archivage de la visite");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({
        title: "Succès",
        description: "La visite a été archivée",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (visitId: number) => {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de la visite");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({
        title: "Succès",
        description: "La visite a été supprimée définitivement",
        variant: "default",
      });
      setVisitToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
      setVisitToDelete(null);
    }
  });

  const renderVisitCard = (visit: Visit) => {
    const visitDate = parseISO(visit.datetime);
    const isPast = isBefore(visitDate, now);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        key={visit.id}
      >
        <Card className={cn(
          "mb-4 overflow-hidden border-primary/10 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]",
          isPast && !visit.archived ? "bg-purple-500/5" : "bg-gradient-to-br from-background to-muted/30",
          visit.status === "completed" && "border-l-4 border-l-purple-500",
          visit.status === "cancelled" && "border-l-4 border-l-indigo-500",
          visit.status === "pending" && "border-l-4 border-l-violet-500",
          visit.status === "no_show" && "border-l-4 border-l-slate-500"
        )}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 bg-clip-text text-transparent">
                  {visit.firstName} {visit.lastName}
                </h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary/60" />
                    {visit.email}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary/60" />
                    {visit.phone}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={cn(
                  "px-3 py-1 rounded-full font-medium transform hover:scale-105 transition-transform duration-200 shadow-sm",
                  visit.visitType === "physical" ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white" :
                    visit.visitType === "virtual" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" :
                      "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                )}>
                  {visit.visitType === "physical" ? "Visite physique" :
                    visit.visitType === "virtual" ? "Visite virtuelle" : "Visite vidéo"}
                </Badge>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary/60" />
                    {format(visitDate, "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                  <p className="text-sm text-muted-foreground pl-6">
                    {format(visitDate, "HH:mm", { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary/60" />
                    {visit.property ? (
                      <span className="flex flex-col">
                        <strong className="text-lg text-primary bg-gradient-to-r from-primary/80 to-primary bg-clip-text">
                          {visit.property.name}
                        </strong>
                        <span className="text-sm opacity-90 mt-1">{visit.property.address}</span>
                      </span>
                    ) : (
                      <span className="text-primary">{visit.manualAddress}</span>
                    )}
                  </p>
                </div>
              </div>

              {visit.message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/10 shadow-sm"
                >
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary">Message :</span>
                    <span className="italic ml-2">{visit.message}</span>
                  </p>
                </motion.div>
              )}
            </div>

            <motion.div
              className="mt-4 flex justify-end gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisitToEdit(visit)}
                className="bg-primary/5 hover:bg-primary/10 border-primary/10 hover:border-primary/20"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              {!visit.archived && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archiveMutation.mutate(visit.id)}
                  disabled={archiveMutation.isPending}
                  className="bg-primary/5 hover:bg-primary/10 border-primary/10 hover:border-primary/20"
                >
                  {archiveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  Archiver
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisitToDelete(visit.id)}
                className="bg-destructive/5 hover:bg-destructive/10 border-destructive/10 hover:border-destructive/20 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const archiveOldVisits = async () => {
    setIsArchiving(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filtrer les visites qui doivent être archivées
      const visitsToArchive = visits.filter(visit => {
        const visitDate = parseISO(visit.datetime);
        visitDate.setHours(0, 0, 0, 0); // Normaliser l'heure pour comparer uniquement les dates
        return !visit.archived && visitDate < today;
      });

      console.log(`Archivage de ${visitsToArchive.length} visites`);

      // Archiver chaque visite
      const archivePromises = visitsToArchive.map(visit =>
        fetch(`/api/visits/${visit.id}/archive`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true })
        })
      );

      await Promise.all(archivePromises);

      // Rafraîchir les données
      await queryClient.invalidateQueries({ queryKey: ["/api/visits"] });

      toast({
        title: "✨ Archivage terminé",
        description: `${visitsToArchive.length} visite(s) ont été archivées avec succès`,
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur lors de l'archivage:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'archivage automatique",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search bar and Export Menu */}
      <div className="flex gap-2 items-center mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, téléphone, propriété..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={archiveOldVisits}
          disabled={isArchiving}
          className="h-10 w-10 relative"
        >
          {isArchiving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
        <AdvancedFilters onFilterChange={(filters) => {
          // S'assurer que tous les champs nécessaires sont présents
          setAdvancedFilters(prev => ({
            ...prev,
            status: filters.status || prev.status,
            visitType: filters.visitType || prev.visitType,
            startDate: filters.startDate || prev.startDate,
            endDate: filters.endDate || prev.endDate
          }));
        }} />
        <CalendarSyncMenu 
          activeStatuses={filters.status || []}
          onSyncStatus={(statuses) => {
            // Si setFilters est défini, l'utiliser, sinon fallback sur onFilterChange
            if (setFilters) {
              setFilters((prev: any) => ({
                ...prev,
                status: statuses
              }));
            } else {
              onFilterChange({
                ...filters,
                status: statuses
              });
            }
          }}
        />
        <ExportMenu
          type="visits"
          allowImport={true}
          currentFilters={{
            date_start: filters.dateRange?.from?.toISOString(),
            date_end: filters.dateRange?.to?.toISOString(),
            search: filters.search,
            ...advancedFilters
          }}
        />
      </div>

      <Card className="border-primary/10">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle>Visites</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger
                value="upcoming"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                À venir ({upcomingVisits.length})
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Archivées ({archivedVisits.length})
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="upcoming" className="mt-4">
                {upcomingVisits.length === 0 ? (
                  <motion.p
                    className="text-center text-muted-foreground py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    Aucune visite à venir
                  </motion.p>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {Object.entries(groupVisitsByDay(paginatedVisits(upcomingVisits))).map(([dayKey, dayVisits]) => (
                        <div key={dayKey} className="mb-6">
                          {/* Séparateur de date */}
                          <div className="relative py-2 mb-4">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-muted"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-background px-4 text-sm font-medium text-primary">
                                {format(new Date(dayKey), "EEEE d MMMM yyyy", { locale: fr })}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            {dayVisits.map(renderVisitCard)}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="archived" className="mt-4">
                {archivedVisits.length === 0 ? (
                  <motion.p
                    className="text-center text-muted-foreground py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    Aucune visite archivée
                  </motion.p>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {Object.entries(groupVisitsByMonth(paginatedVisits(archivedVisits))).map(([monthKey, monthVisits]) => (
                        <div key={monthKey} className="mb-8">
                          <h3 className="font-semibold mb-4 text-primary">
                            {format(new Date(monthKey), "MMMM yyyy", { locale: fr })}
                          </h3>
                          <div className="space-y-4">
                            {monthVisits.map(renderVisitCard)}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </>
                )}
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!visitToDelete} onOpenChange={() => setVisitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette visite ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La visite sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => visitToDelete && deleteMutation.mutate(visitToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {visitToEdit && (
        <EditVisitDialog
          visit={visitToEdit}
          open={!!visitToEdit}
          onOpenChange={(open) => !open && setVisitToEdit(null)}
          onSuccess={(message) => {
            toast({
              title: "✨ Succès",
              description: message,
              className: "bg-green-500/10 border-green-500/20",
            });
          }}
        />
      )}
      {/* Ajouter la pagination en bas de la liste */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i + 1}
                variant={page === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(i + 1)}
                className={cn(
                  "w-8 h-8 p-0",
                  page === i + 1 && "bg-primary text-primary-foreground"
                )}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}