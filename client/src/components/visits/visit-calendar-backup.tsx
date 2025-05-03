import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isBefore, isToday } from "date-fns";
import { fr } from "date-fns/locale";

// Fonction utilitaire pour formater les dates en français avec la première lettre en majuscule
const formatDateWithCapitalization = (date: Date): string => {
  const rawFormattedDate = format(date, 'EEEE d MMMM yyyy', { locale: fr });
  return rawFormattedDate.charAt(0).toUpperCase() + rawFormattedDate.slice(1);
};
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css"; // Importer les styles personnalisés
import { Visit } from "@/types/visits";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarFilters } from "./calendar-filters";
import { VisitEventDialog } from "./visit-event-dialog";
import { AutoArchiveDialog } from "./auto-archive-dialog";
import { CalendarSyncMenu } from "./calendar-sync-menu";
import { VisitsPastDialog } from "./visits-past-dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Archive,
  Sparkles,
  Zap,
  Layers,
  Home,
  UserCheck,
  Video,
  Laptop,
  Clock,
  Check,
  Eye,
  History,
  ListChecks
} from "lucide-react";

// Fonction pour obtenir l'icône correspondant au type de visite
function getVisitTypeIcon(visitType: string) {
  switch (visitType) {
    case 'physical':
      return Home;
    case 'guided':
      return UserCheck;
    case 'video':
      return Video;
    case 'virtual':
      return Laptop;
    default:
      return Home;
  }
}

const locales = {
  fr: fr,
};

// Nous allons utiliser directement date-fns dans les formateurs de date
// sans fonction dédiée pour éviter les problèmes de typage TypeScript

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Couleurs plus futuristes
const statusColors = {
  pending: "bg-gradient-to-r from-amber-400 to-amber-500 border-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.5)]", 
  completed: "bg-gradient-to-r from-emerald-400 to-emerald-500 border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
  cancelled: "bg-gradient-to-r from-rose-400 to-rose-500 border-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
  no_show: "bg-gradient-to-r from-neutral-400 to-neutral-500 border-neutral-600 shadow-[0_0_10px_rgba(163,163,163,0.5)]",
};

// Icônes modernes pour les types de visites
const visitTypeIcons = {
  physical: "🏠",
  virtual: "💻",
  video: "📹",
};

export function VisitCalendar() {
  const [view, setView] = useState("agenda");
  const [date, setDate] = useState(new Date());
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showPastPending, setShowPastPending] = useState(false);
  const [showVisitsPastDialog, setShowVisitsPastDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    visitType: [] as string[],
    dateRange: undefined as { from?: Date; to?: Date } | undefined,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: visits = [], isLoading } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculer le nombre de visites passées en attente (non archivées)
  const pastPendingVisitsCount = useMemo(() => {
    if (!visits) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastPendingVisits = visits.filter(visit => {
      const visitDate = new Date(visit.datetime);
      visitDate.setHours(0, 0, 0, 0);
      return !visit.archived && visit.status === "pending" && isBefore(visitDate, today);
    });

    // Logs pour debug
    console.log(`Nombre de visites passées en attente: ${pastPendingVisits.length}`);
    console.log('Visites passées en attente:', pastPendingVisits);

    return pastPendingVisits.length;
  }, [visits]);

  // Exécuter l'archivage automatique
  const executeAutoArchive = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filtrer les visites qui doivent être archivées
      const visitsToArchive = visits.filter(visit => {
        const visitDate = new Date(visit.datetime);
        visitDate.setHours(0, 0, 0, 0);
        return !visit.archived && visitDate < today;
      });

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
      throw error;
    }
  }, [visits, queryClient, toast]);

  const filteredEvents = useMemo(() => {
    if (!visits) return [];

    console.log("Applying filters:", {
      status: filters.status, 
      visitType: filters.visitType, 
      dateRange: filters.dateRange ? 
        { from: filters.dateRange.from?.toISOString(), to: filters.dateRange.to?.toISOString() } : 
        null
    });

    // Filtrer les visites en fonction des critères
    const filtered = visits
      .filter(visit => {
        // Filtre pour les visites non archivées
        if (visit.archived) return false;

        // Filtre par statut - important pour toutes les vues
        if (filters.status.length > 0 && !filters.status.includes(visit.status)) {
          return false;
        }

        // Pour les visites en attente :
        // - Si showPastPending est activé, afficher toutes les visites en attente (passées et à venir)
        // - Sinon, ne montrer que les visites en attente futures 
        if (visit.status === "pending") {
          if (!showPastPending) {
            const visitDate = new Date(visit.datetime);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (visitDate < today) return false;
          }
        } else {
          // Pour les visites complétées ou annulées, limiter aux 30 derniers jours
          // sauf si un filtre de date spécifique est appliqué
          if (!filters.dateRange?.from && !filters.dateRange?.to) {
            const visitDate = new Date(visit.datetime);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (visitDate < thirtyDaysAgo) return false;
          }
        }

        // Filtre par type de visite - important pour toutes les vues
        if (filters.visitType.length > 0 && !filters.visitType.includes(visit.visitType)) {
          return false;
        }

        // Filtre par plage de dates - important pour toutes les vues
        if (filters.dateRange?.from) {
          const visitDate = new Date(visit.datetime);
          visitDate.setHours(0, 0, 0, 0);
          const fromDate = new Date(filters.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);

          if (visitDate < fromDate) return false;
        }

        if (filters.dateRange?.to) {
          const visitDate = new Date(visit.datetime);
          visitDate.setHours(0, 0, 0, 0);
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);

          if (visitDate > toDate) return false;
        }

        return true;
      })
      .map((visit) => ({
        id: visit.id,
        title: `${visit.firstName} ${visit.lastName}`, // Le titre simple sera enrichi par le rendu personnalisé
        start: new Date(visit.datetime),
        end: new Date(new Date(visit.datetime).getTime() + 60 * 60 * 1000), // 1 hour duration
        status: visit.status,
        visit: visit,
      }));

    console.log(`Filtered: ${filtered.length} events out of ${visits.length} total visits`);
    return filtered;
  }, [visits, filters, showPastPending]);

  const handleEventClick = (event: any) => {
    setSelectedVisit(event.visit);
    setShowVisitDialog(true);
  };

  if (isLoading) {
    return (
      <Card className="p-4 overflow-hidden border border-violet-200 shadow-lg bg-gradient-to-br from-white to-violet-50/30">
        <div className="immo-calendar-loader">
          <div className="text-center space-y-3">
            <div className="immo-calendar-loader-spinner mx-auto"></div>
            <p className="text-muted-foreground animate-pulse">Chargement du calendrier...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border border-violet-200 shadow-lg bg-gradient-to-br from-white to-violet-50/30">
        <div className="p-4 space-y-4">
          {/* Barre d'outils améliorée avec design inspiré des propriétés */}
          <div className="mb-4">
            {/* En-tête principal avec dégradé violet */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 rounded-t-xl shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {view === "month" && `Calendrier - ${format(date, 'MMMM yyyy', { locale: fr }).charAt(0).toUpperCase() + format(date, 'MMMM yyyy', { locale: fr }).slice(1)}`}
                    {view === "week" && `Semaine du ${format(date, 'd MMMM', { locale: fr })}`}
                    {view === "day" && formatDateWithCapitalization(date)}
                    {view === "agenda" && formatDateWithCapitalization(date)}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={() => setDate(new Date())}
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Aujourd'hui
                  </Button>

                  <div className="flex items-center rounded-lg overflow-hidden bg-white/10 border border-white/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(date);
                        if (view === "month") {
                          newDate.setMonth(date.getMonth() - 1);
                        } else if (view === "week") {
                          newDate.setDate(date.getDate() - 7);
                        } else {
                          newDate.setDate(date.getDate() - 1);
                        }
                        setDate(newDate);
                      }}
                      className="h-8 px-2 rounded-none hover:bg-white/20 text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(date);
                        if (view === "month") {
                          newDate.setMonth(date.getMonth() + 1);
                        } else if (view === "week") {
                          newDate.setDate(date.getDate() + 7);
                        } else {
                          newDate.setDate(date.getDate() + 1);
                        }
                        setDate(newDate);
                      }}
                      className="h-8 px-2 rounded-none border-l border-white/30 hover:bg-white/20 text-white"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sous-barre avec les contrôles de vue */}
            <div className="bg-white p-3 rounded-b-xl border-x border-b border-violet-200 shadow-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex bg-violet-50 rounded-lg overflow-hidden border border-violet-200 shadow-sm">
                {["agenda", "jour", "semaine", "mois"].map((viewOption, index) => {
                  const viewValue = ["agenda", "day", "week", "month"][index];
                  return (
                    <Button
                      key={viewOption}
                      variant="ghost"
                      size="sm"
                      onClick={() => setView(viewValue)}
                      className={cn(
                        "h-8 px-3 rounded-none",
                        view === viewValue 
                          ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold shadow-inner" 
                          : "hover:bg-violet-100 text-violet-700"
                      )}
                    >
                      {viewOption}
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {/* Bouton pour les visites passées en attente */}
                <Button
                  variant="outline"
                  size="sm"
                  className="relative bg-white border-violet-200 hover:bg-violet-50 text-violet-700"
                  onClick={() => setShowVisitsPastDialog(true)}
                  title="Visites passées en attente"
                >
                  <History className="h-4 w-4 mr-1" />
                  Historique
                  {pastPendingVisitsCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 py-0 h-4 min-w-4 flex items-center justify-center text-xs bg-violet-200 border-violet-300 text-violet-900"
                    >
                      {pastPendingVisitsCount}
                    </Badge>
                  )}
                </Button>

                {/* Bouton pour basculer vers la vue liste */}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-violet-200 hover:bg-violet-50 text-violet-700"
                  onClick={() => {
                    // Utiliser l'historique pour retirer le paramètre view=calendar
                    window.history.pushState({}, '', '/visits');
                    // Déclencher un événement popstate pour mettre à jour la vue
                    window.dispatchEvent(new Event('popstate'));
                  }}
                  title="Passer à la vue liste"
                >
                  <ListChecks className="h-4 w-4 mr-1" />
                  Liste
                </Button>

                <CalendarFilters 
                  onFilterChange={(newFilters) => {
                    // Adapter les filtres reçus au format attendu par setFilters
                    setFilters(prev => ({
                      ...prev,
                      ...newFilters,
                      // S'assurer que dateRange est toujours défini avec la bonne structure
                      dateRange: newFilters.dateRange || undefined
                    }));
                  }}
                  activeFilters={filters}
                />

                <CalendarSyncMenu 
                  activeStatuses={filters.status}
                  onSyncStatus={(statuses) => {
                    setFilters(prev => ({
                      ...prev,
                      status: statuses
                    }));
                  }}
                  showPastPending={showPastPending}
                  onTogglePastPending={setShowPastPending}
                />
              </div>
            </div>
          </div>

          {/* Calendrier */}
          <div className="relative overflow-hidden">
            {filteredEvents.length === 0 && !isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="text-center space-y-3 p-8 rounded-xl bg-white border border-violet-200 shadow-lg max-w-md">
                  <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                    <Layers className="h-8 w-8 text-violet-500" />
                  </div>
                  <h3 className="text-xl font-semibold">Aucune visite trouvée</h3>
                  <p className="text-muted-foreground">
                    {filters.status.length > 0 || filters.visitType.length > 0 || filters.dateRange?.from
                      ? "Essayez d'ajuster vos filtres pour voir plus de résultats."
                      : "Ajoutez votre première visite en cliquant sur le bouton 'Nouvelle visite'."}
                  </p>
                  {(filters.status.length > 0 || filters.visitType.length > 0 || filters.dateRange?.from) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFilters({
                        status: [],
                        visitType: [],
                        dateRange: undefined
                      })}
                      className="mt-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                      Réinitialiser les filtres
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="immo-calendar">
              <Calendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 700 }}
                defaultView={Views.MONTH}
                view={view as any}
                onView={(newView) => setView(newView)}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleEventClick}
                step={30} // Intervalle de temps en minutes (plus petit pour plus de précision)
                timeslots={2} // Nombre de créneaux par "step"
                formats={{
                  timeGutterFormat: (date: Date) => format(date, 'HH\'h\'mm', { locale: fr }),
                  dayFormat: (date: Date) => format(date, 'dd', { locale: fr }),
                  dayHeaderFormat: (date: Date) => {
                    const raw = format(date, 'EEEE dd', { locale: fr });
                    return raw.charAt(0).toUpperCase() + raw.slice(1);
                  },
                  dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => {
                    const startFormat = format(start, 'dd MMMM', { locale: fr });
                    const endFormat = format(end, 'dd MMMM', { locale: fr });
                    return `${startFormat} - ${endFormat}`;
                  },
                  monthHeaderFormat: (date: Date) => {
                    const raw = format(date, 'MMMM yyyy', { locale: fr });
                    return raw.charAt(0).toUpperCase() + raw.slice(1);
                  },
                  weekdayFormat: (date: Date) => {
                    const raw = format(date, 'EEEE', { locale: fr });
                    return (raw.charAt(0).toUpperCase() + raw.slice(1));
                  },
                  eventTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) => 
                    `${format(start, 'HH\'h\'mm', { locale: fr })} - ${format(end, 'HH\'h\'mm', { locale: fr })}`,
                }}
                messages={{
                  next: "Suivant",
                  previous: "Précédent",
                  today: "Aujourd'hui",
                  month: "Mois",
                  week: "Semaine",
                  day: "Jour",
                  agenda: "Agenda",
                  date: "Date",
                  time: "Heure",
                  event: "Événement",
                  noEventsInRange: "Aucune visite sur cette période",
                  allDay: "Toute la journée",
                  showMore: (total) => `+ ${total} visite(s)`,
                }}
                eventPropGetter={(event) => {
                  // Personnaliser le style des événements selon leur statut
                  const styles = {
                    className: cn(
                      "rounded-md overflow-hidden border backdrop-blur-sm",
                      statusColors[event.status as keyof typeof statusColors]
                    ),
                    style: {
                      // Ajouter un padding pour éviter que le texte ne soit trop près du bord
                      padding: '2px',
                      // S'assurer que les événements coupés sont bien marqués avec ellipsis
                      textOverflow: 'ellipsis',
                      // Ajouter des bordures de status plus visibles
                      borderLeft: event.status === 'pending' 
                        ? '3px solid rgb(245, 158, 11)' 
                        : event.status === 'completed'
                        ? '3px solid rgb(34, 197, 94)'
                        : event.status === 'cancelled'
                        ? '3px solid rgb(244, 63, 94)'
                        : '3px solid rgb(156, 163, 175)'
                    }
                  };
                  return styles;
                }}
                dayPropGetter={date => {
                  if (isToday(date)) {
                    return {
                      className: 'rbc-today bg-gradient-to-br from-violet-50 to-indigo-50 shadow-inner',
                      style: {
                        borderTop: '2px solid hsl(var(--primary))',
                      }
                    };
                  }
                  return {};
                }}
                components={{
                  // Composant personnalisé pour les groupes de la vue agenda
                  agenda: {
                    // Personnaliser l'en-tête de date dans la vue Agenda
                    date: (props: any) => {
                      const label = props.label;
                      if (!label) {
                        console.error("Label de date manquant dans l'agenda");

                        // Retourner un composant vide mais valide au lieu d'un message d'erreur
                        return (
                          <div className="relative py-4 mt-4 first:mt-0 mb-3">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-muted"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-background px-4 text-sm font-medium text-primary capitalize">
                                {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      try {
                        // Récupérer la date depuis le label (qui est déjà un string formaté)
                        // Et le reformater en français
                        const dateParts = label.split(' ');
                        // S'assurer que nous avons bien un date dans le bon format
                        const dateObj = new Date(dateParts[0]);

                        if (isNaN(dateObj.getTime())) {
                          throw new Error("Format de date incorrect");
                        }

                        // Formater la date en français, en capitalisant le jour de la semaine
                        const rawFormattedDate = format(dateObj, 'EEEE d MMMM yyyy', { locale: fr });
                        // Première lettre en majuscule pour le jour
                        const formattedDate = rawFormattedDate.charAt(0).toUpperCase() + rawFormattedDate.slice(1);

                        return (
                          <div className="relative py-4 mt-6 first:mt-2 mb-4">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-violet-200 border-dashed"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-sm font-semibold text-white rounded-md shadow-sm">
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error("Erreur lors du formatage de la date dans l'agenda", error, label);

                        // Utiliser le label tel quel si on ne peut pas le formater
                        return (
                          <div className="relative py-4 mt-6 first:mt-2 mb-4">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-violet-200 border-dashed"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-sm font-semibold text-white rounded-md shadow-sm">
                                {label}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    },
                    // Personnaliser l'affichage de l'heure dans la vue Agenda
                    time: (props: any) => {
                      if (!props.event || !props.event.start) {
                        console.error("Événement ou heure de début invalide", props);
                        return <span>--:--</span>;
                      }

                      try {
                        // Convertir l'heure au format français (15h30)
                        const date = new Date(props.event.start);
                        const hours = date.getHours();
                        const minutes = date.getMinutes();
                        const frenchTime = `${hours}h${minutes === 0 ? '' : minutes < 10 ? `0${minutes}` : minutes}`;

                        return (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-medium text-violet-800 bg-violet-100 border border-violet-200 text-sm">
                            {frenchTime}
                          </span>
                        );
                      } catch (error) {
                        console.error("Erreur lors du formatage de l'heure dans l'agenda", error);
                        return (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-medium text-rose-800 bg-rose-100 border border-rose-200 text-sm">
                            Heure invalide
                          </span>
                        );
                      }
                    },
                    // Personnaliser le conteneur d'événements dans la vue Agenda
                    event: (props: any) => {
                      const { event } = props;
                      const visit = (event as any).visit as Visit;

                      // Récupérer le type de visite pour l'icône
                      const visitType = visit.visitType;
                      // Utiliser directement les composants Lucide en fonction du type de visite
                      let VisitIcon;
                      switch (visitType) {
                        case 'physical':
                          VisitIcon = Home;
                          break;
                        case 'video':
                          VisitIcon = Video;
                          break;
                        case 'virtual':
                          VisitIcon = Laptop;
                          break;
                        default:
                          VisitIcon = Home;
                      }

                      // Obtenir la couleur selon le statut
                      const statusColorClass = visit.status === 'pending' 
                        ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
                        : visit.status === 'completed'
                        ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                        : visit.status === 'cancelled'
                        ? 'bg-rose-50 border border-rose-200 hover:bg-rose-100'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100';

                      return (
                        <div className={`rounded-lg p-3 mb-2 ${statusColorClass} transition-colors duration-150`}>
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-violet-100 flex-shrink-0">
                              <VisitIcon className="h-4 w-4 text-violet-500" />
                            </div>
                            <div className="flex-grow space-y-1">
                              <div className="font-medium text-black">{visit.firstName} {visit.lastName}</div>

                              {/* Adresse */}
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Home className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {visit.property?.name || visit.manualAddress || "Adresse non spécifiée"}
                                </span>
                              </div>

                              {/* Email */}
                              {visit.email && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Zap className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{visit.email}</span>
                                </div>
                              )}

                              {/* Téléphone */}
                              {visit.phone && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <span>{visit.phone}</span>
                                </div>
                              )}

                              {/* Statut */}
                              <div className="flex items-center gap-1 mt-1">
                                <Badge className={
                                  visit.status === 'pending' 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    : visit.status === 'completed'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : visit.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }>
                                  {visit.status === 'pending' && 'En attente'}
                                  {visit.status === 'completed' && 'Terminée'}
                                  {visit.status === 'cancelled' && 'Annulée'}
                                  {visit.status !== 'pending' && visit.status !== 'completed' && visit.status !== 'cancelled' && visit.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  },

                  event: (props) => {
                    const { event } = props;
                    const visit = (event as any).visit as Visit;

                    // Récupérer le type de visite pour l'icône
                    const visitType = visit.visitType;
                    // Utiliser directement les composants Lucide en fonction du type de visite
                    let VisitIcon;
                    switch (visitType) {
                      case 'physical':
                        VisitIcon = Home;
                        break;
                      case 'video':
                        VisitIcon = Video;
                        break;
                      case 'virtual':
                        VisitIcon = Laptop;
                        break;
                      default:
                        VisitIcon = Home;
                    }

                    // Obtenir la classe de statut pour la bordure latérale
                    const statusClass = 
                      visit.status === 'pending' ? 'border-l-amber-500' : 
                      visit.status === 'completed' ? 'border-l-green-500' : 
                      visit.status === 'cancelled' ? 'border-l-rose-500' : 
                      'border-l-gray-400';

                    // Formater l'heure en format français
                    const visitDate = new Date(visit.datetime);
                    const hours = visitDate.getHours();
                    const minutes = visitDate.getMinutes();
                    const timeStr = `${hours}h${minutes === 0 ? '' : minutes < 10 ? `0${minutes}` : minutes}`;

                    // Adapter l'affichage selon la vue
                    const isMobile = window.innerWidth < 768;
                    const isCompactView = view === "month" || isMobile;
                    const isWeekView = view === "week";
                    const isDayView = view === "day";
                    const isFullDayView = isDayView && !isMobile;

                    // Définir la hauteur minimale en fonction de la vue
                    const minEventHeight = isCompactView 
                      ? 'auto' 
                      : isFullDayView 
                        ? '120px' 
                        : isWeekView 
                          ? '80px' 
                          : '70px';

                    // Définir les classes CSS en fonction de la vue
                    const containerClasses = cn(
                      'text-black hover:bg-violet-50/50 transition-colors duration-150 border-l-3',
                      statusClass,
                      {
                        'p-2': true,
                        'rounded-r border-t border-r border-b border-slate-100': !isCompactView,
                        'overflow-hidden': true,  // Toujours masquer les dépassements
                        'max-h-full': isCompactView, // Limiter la hauteur en vue compacte
                        'h-full': isWeekView || isDayView,  // Prendre toute la hauteur disponible en vue jour et semaine
                        'flex flex-col': isWeekView || isDayView, // Organisation en colonne pour les vues jour et semaine
                        'w-full': true,           // Prendre toute la largeur disponible
                        'min-h-[60px]': !isCompactView, // Hauteur minimale pour les vues non compactes
                      }
                    );

                    // Définir les classes pour le contenu basées sur la vue
                    const contentClasses = cn({
                      'flex-grow overflow-auto': isWeekView || isDayView, // Contenu scrollable en vue semaine et jour
                      'flex flex-col': isWeekView || isDayView,          // Organisation en colonne flexible
                      'min-h-0': isWeekView || isDayView,               // Minimum height pour flex
                      'justify-between': isDayView,                     // Espacement justifié pour la vue jour
                    });

                    return (
                      <div className={containerClasses}>
                        {/* En-tête avec heure, nom et type - toujours présent */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-black flex items-center gap-1 min-w-0 flex-shrink-0">
                            <span className="inline-flex items-center justify-center w-5 h-5 text-violet-600 bg-violet-100 rounded-full flex-shrink-0">
                              <VisitIcon className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate max-w-[120px]">{visit.firstName} {visit.lastName}</span>
                          </div>

                          {!isCompactView && (
                            <div className="text-xs font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 whitespace-nowrap flex-shrink-0">
                              {timeStr}
                            </div>
                          )}
                        </div>

                        {/* Contenus additionnels seulement pour les vues non compactes */}
                        {!isCompactView && (
                          isDayView ? (
                            <div className="flex flex-wrap gap-2 mt-1 justify-between items-center">
                              {/* Informations principales en ligne */}
                              <div className="flex flex-wrap gap-2 items-center">
                                {/* Adresse */}
                                <div className="text-sm text-black/80 flex items-center gap-1 border border-slate-100 rounded px-1.5 py-0.5 bg-slate-50">
                                  <Home className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]">
                                    {visit.property?.name || visit.manualAddress || "Adresse non spécifiée"}
                                  </span>
                                </div>

                                {/* Email */}
                                {visit.email && (
                                  <div className="text-sm text-black/80 flex items-center gap-1 border border-slate-100 rounded px-1.5 py-0.5 bg-slate-50">
                                    <Zap className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                                    <span className="truncate max-w-[150px]">{visit.email}</span>
                                  </div>
                                )}

                                {/* Téléphone */}
                                {visit.phone && (
                                  <div className="text-sm text-black/80 flex items-center gap-1 border border-slate-100 rounded px-1.5 py-0.5 bg-slate-50">
                                    <Clock className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                                    <span className="truncate max-w-[100px]">{visit.phone}</span>
                                  </div>
                                )}

                                {/* Type de visite */}
                                <div className="text-xs text-gray-500 border border-slate-100 rounded px-1.5 py-0.5 bg-slate-50 whitespace-nowrap">
                                  {visit.visitType === 'physical' ? 'Visite sur place' : 
                                   visit.visitType === 'virtual' ? 'Visite virtuelle' : 
                                   visit.visitType === 'video' ? 'Visite vidéo' : 'Visite'}
                                </div>
                              </div>

                              {/* Badge de statut */}
                              <Badge className={cn(
                                "flex-shrink-0 whitespace-nowrap ml-auto",
                                visit.status === 'pending' 
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  : visit.status === 'completed'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : visit.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              )}>
                                {visit.status === 'pending' && 'En attente'}
                                {visit.status === 'completed' && 'Terminée'}
                                {visit.status === 'cancelled' && 'Annulée'}
                                {visit.status !== 'pending' && visit.status !== 'completed' && visit.status !== 'cancelled' && visit.status}
                              </Badge>
                            </div>
                          ) : (
                            <div className={contentClasses}>
                              {/* Adresse */}
                              <div className="text-sm text-black/80 flex items-center gap-1 mt-1 border-b border-slate-100 pb-1 min-w-0">
                                <Home className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="truncate">
                                  {visit.property?.name || visit.manualAddress || "Adresse non spécifiée"}
                                </span>
                              </div>

                              {/* Informations de contact */}
                              <div className="mt-1.5 space-y-1.5">
                                {visit.email && (
                                  <div className="text-sm text-black/80 flex items-center gap-1 min-w-0">
                                    <Zap className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                                    <span className="truncate">{visit.email}</span>
                                  </div>
                                )}

                                {isFullDayView && visit.phone && (
                                  <div className="text-sm text-black/80 flex items-center gap-1 min-w-0">
                                    <Clock className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                                    <span className="truncate">{visit.phone}</span>
                                  </div>
                                )}
                              </div>

                              {/* Badge de statut - au fond pour toujours être visible */}
                              <div className="mt-2 flex justify-between items-center mt-auto">
                                <Badge className={cn(
                                  "flex-shrink-0 whitespace-nowrap",
                                  visit.status === 'pending' 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    : visit.status === 'completed'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : visit.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                )}>
                                  {visit.status === 'pending' && 'En attente'}
                                  {visit.status === 'completed' && 'Terminée'}
                                  {visit.status === 'cancelled' && 'Annulée'}
                                  {visit.status !== 'pending' && visit.status !== 'completed' && visit.status !== 'cancelled' && visit.status}
                                </Badge>

                                {isFullDayView && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {visit.visitType === 'physical' ? 'Visite sur place' : 
                                     visit.visitType === 'virtual' ? 'Visite virtuelle' : 
                                     visit.visitType === 'video' ? 'Visite vidéo' : 'Visite'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  },
                  toolbar: () => null, // On supprime la barre d'outils par défaut
                }}
              />
            </div>
          </div>

          {/* Plus de bandeau orange des visites passées - déplacé dans la barre d'outils */}
        </div>
      </Card>

      {/* Dialogue de détails de la visite */}
      <VisitEventDialog 
        visit={selectedVisit} 
        open={showVisitDialog} 
        onOpenChange={setShowVisitDialog}
      />

      {/* Dialogue d'archivage automatique */}
      <AutoArchiveDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        onConfirm={executeAutoArchive}
        pastVisitsCount={pastPendingVisitsCount}
      />

      {/* Dialogue des visites passées */}
      <VisitsPastDialog
        open={showVisitsPastDialog}
        onOpenChange={setShowVisitsPastDialog}
        visits={visits}
        onSelectVisit={(visit: Visit) => {
          setSelectedVisit(visit);
          setShowVisitDialog(true);
          setShowVisitsPastDialog(false);
        }}
      />
    </motion.div>
  );
}