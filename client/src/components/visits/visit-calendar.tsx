import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views, View, SlotInfo } from "react-big-calendar";
import type { Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isBefore, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css";
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

// Fonction utilitaire pour formater les dates en français avec la première lettre en majuscule
const formatDateWithCapitalization = (date: Date): string => {
  const rawFormattedDate = format(date, 'EEEE d MMMM yyyy', { locale: fr });
  return rawFormattedDate.charAt(0).toUpperCase() + rawFormattedDate.slice(1);
};

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

        // Nous ne filtrons plus par statut
        // Cette partie a été supprimée intentionnellement

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

  // État pour suivre les changements d'affichage
  const [isChangingView, setIsChangingView] = useState(false);
  
  // Gérer le changement de date
  const handleNavigate = useCallback((newDate: Date, view: View, action: string) => {
    setIsChangingView(true);
    setTimeout(() => {
      setDate(newDate);
      setIsChangingView(false);
    }, 200);
  }, []);
  
  // Gérer le changement de vue
  const handleViewChange = useCallback((view: View) => {
    setIsChangingView(true);
    setTimeout(() => {
      setView(view);
      setIsChangingView(false);
    }, 200);
  }, []);

  if (isLoading) {
    return (
      <Card className="p-4 overflow-hidden border border-violet-200 dark:border-violet-500/20 shadow-lg bg-gradient-to-br from-white to-violet-50/30 dark:from-card dark:to-background/30">
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
      <Card className="overflow-hidden border border-violet-200 dark:border-violet-500/20 shadow-xl bg-gradient-to-br from-white to-violet-50/30 dark:from-card dark:to-background/30 rounded-xl">
        <div className="p-5 space-y-6">
          {/* Barre d'outils avec design identique à la page des propriétés */}
          <div className="mb-6">
            {/* En-tête principal avec dégradé vert comme dans properties.tsx */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-background/80 to-background/40 dark:from-background/30 dark:to-background/20 backdrop-blur-xl border border-primary/20 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent animate-gradient flex items-center">
                    <CalendarIcon className="h-10 w-10 mr-3 text-emerald-500" />
                    Gestion des Visites
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    {view === "month" && `Calendrier - ${format(date, 'MMMM yyyy', { locale: fr }).charAt(0).toUpperCase() + format(date, 'MMMM yyyy', { locale: fr }).slice(1)}`}
                    {view === "week" && `Semaine du ${format(date, 'd MMMM', { locale: fr })}`}
                    {view === "day" && formatDateWithCapitalization(date)}
                    {view === "agenda" && formatDateWithCapitalization(date)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80 hover:border-primary/40 shadow-sm"
                    onClick={() => setDate(new Date())}
                  >
                    <CalendarIcon className="h-4 w-4 mr-1.5" />
                    Aujourd'hui
                  </Button>

                  <div className="flex items-center rounded-lg overflow-hidden bg-background border border-input shadow-sm">
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
                      className="h-8 px-2 rounded-none hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
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
                      className="h-8 px-2 rounded-none border-l border-input hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sous-barre avec les contrôles de vue */}
            <div className="bg-white dark:bg-card p-4 rounded-xl mt-3 border border-violet-200/80 dark:border-violet-500/20 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-violet-500" />
                <span className="text-sm font-medium text-foreground">Agenda des visites</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Bouton pour les visites passées en attente */}
                <Button
                  variant="outline"
                  size="sm"
                  className="relative bg-white dark:bg-card border-[#70C7BA]/20 dark:border-[#70C7BA]/40 hover:bg-[#70C7BA]/5 dark:hover:bg-[#70C7BA]/10 text-[#70C7BA] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => setShowVisitsPastDialog(true)}
                  title="Visites passées en attente"
                >
                  <History className="h-4 w-4 mr-1.5" />
                  Historique
                  {pastPendingVisitsCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 py-0 h-4 min-w-4 flex items-center justify-center text-xs bg-violet-200 dark:bg-violet-800 border-violet-300 dark:border-violet-700 text-violet-900 dark:text-violet-100"
                    >
                      {pastPendingVisitsCount}
                    </Badge>
                  )}
                </Button>

                {/* Bouton pour basculer vers la vue liste */}
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-card border-[#70C7BA]/20 dark:border-[#70C7BA]/40 hover:bg-[#70C7BA]/5 dark:hover:bg-[#70C7BA]/10 text-[#70C7BA] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => {
                    // Utiliser l'historique pour retirer le paramètre view=calendar
                    window.history.pushState({}, '', '/visits');
                    // Déclencher un événement popstate pour mettre à jour la vue
                    window.dispatchEvent(new Event('popstate'));
                  }}
                  title="Passer à la vue liste"
                >
                  <ListChecks className="h-4 w-4 mr-1.5" />
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
                  showPastPending={showPastPending}
                  onTogglePastPending={setShowPastPending}
                />
              </div>
            </div>
          </div>

          {/* Calendrier */}
          <div className="relative overflow-hidden rounded-xl">
            {filteredEvents.length === 0 && !isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-background/80 backdrop-blur-sm rounded-xl">
                <div className="text-center space-y-4 p-8 rounded-xl bg-white dark:bg-card border border-violet-200 dark:border-violet-500/20 shadow-lg max-w-md">
                  <div className="mx-auto w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center immo-calendar-empty-state">
                    <Layers className="h-10 w-10 text-violet-500" />
                  </div>
                  <h3 className="text-2xl font-semibold">Aucune visite trouvée</h3>
                  <p className="text-muted-foreground">
                    {filters.visitType.length > 0 || filters.dateRange?.from
                      ? "Essayez d'ajuster vos filtres pour voir plus de résultats."
                      : "Ajoutez votre première visite en cliquant sur le bouton 'Nouvelle visite'."}
                  </p>
                  {(filters.visitType.length > 0 || filters.dateRange?.from) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFilters({
                        visitType: [],
                        dateRange: undefined
                      })}
                      className="mt-4 border-[#70C7BA]/20 text-[#70C7BA] hover:bg-[#70C7BA]/5 shadow-sm"
                    >
                      Réinitialiser les filtres
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className={cn("immo-calendar", { "changing": isChangingView })}>
              <Calendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 700 }}
                defaultView={Views.AGENDA}
                view="agenda"
                date={date}
                onNavigate={handleNavigate}
                onSelectEvent={handleEventClick}
                step={30}
                timeslots={2}
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
                    return raw.charAt(0).toUpperCase() + raw.slice(1);
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
                  showMore: (total: number) => `+ ${total} visite(s)`,
                }}
                eventPropGetter={(event: Event) => {
                  const visit = (event as any).visit as Visit;
                  const borderColor = visit.status === 'pending' 
                    ? 'rgb(245, 158, 11)' // amber-500
                    : visit.status === 'completed'
                    ? 'rgb(16, 185, 129)' // emerald-500
                    : visit.status === 'cancelled'
                    ? 'rgb(244, 63, 94)' // rose-500
                    : 'rgb(156, 163, 175)'; // gray-400
                    
                  return {
                    className: cn(
                      'text-black dark:text-foreground hover:bg-[#70C7BA]/5 dark:hover:bg-[#70C7BA]/10 transition-all duration-200 backdrop-blur-sm rounded-lg',
                      visit.status === 'pending' ? 'status-pending' : 
                      visit.status === 'completed' ? 'status-completed' : 
                      visit.status === 'cancelled' ? 'status-cancelled' : ''
                    ),
                    style: {
                      padding: '2px 4px',
                      textOverflow: 'ellipsis',
                      borderLeft: `3px solid ${borderColor}`,
                      backgroundColor: 'transparent'
                    }
                  };
                }}
                dayPropGetter={(date: Date) => {
                  if (isToday(date)) {
                    return {
                      className: 'rbc-today bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 shadow-inner',
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
                      if (!label) return null;

                      try {
                        // Récupérer la date depuis le label
                        const dateObj = new Date(label);
                        if (isNaN(dateObj.getTime())) {
                          throw new Error("Format de date incorrect");
                        }

                        // Formater la date en français
                        const formattedDate = format(dateObj, 'EEEE d MMMM yyyy', { locale: fr });
                        const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

                        // Déterminer si c'est aujourd'hui
                        const isToday = new Date().toDateString() === dateObj.toDateString();

                        return (
                          <div className="relative py-4 mt-4 first:mt-0 mb-3">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-muted"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <span className={cn(
                                "px-4 py-1.5 text-sm font-semibold rounded-md shadow-sm",
                                isToday 
                                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white dark:from-violet-800 dark:to-indigo-800 dark:text-violet-50" 
                                  : "bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300"
                              )}>
                                {isToday && "✨ "}{capitalizedDate}
                              </span>
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error("Erreur lors du formatage de la date:", error);
                        return null;
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

                        // Vérifier si l'événement est aujourd'hui
                        const isToday = new Date().toDateString() === date.toDateString();
                        // Vérifier si la visite est dans le futur ou le passé
                        const isFuture = date > new Date();

                        return (
                          <span className={cn(
                            "inline-flex items-center justify-center px-2 py-0.5 rounded-md font-medium text-sm",
                            isToday 
                              ? isFuture 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/40" 
                                : "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40"
                              : "bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/40"
                          )}>
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
                      let typeLabel = "";
                      switch (visitType) {
                        case 'physical':
                          VisitIcon = Home;
                          typeLabel = "Sur place";
                          break;
                        case 'video':
                          VisitIcon = Video;
                          typeLabel = "Vidéo";
                          break;
                        case 'virtual':
                          VisitIcon = Laptop;
                          typeLabel = "Virtuelle";
                          break;
                        default:
                          VisitIcon = Home;
                          typeLabel = "Sur place";
                      }

                      // Obtenir les classes de bordure selon le statut
                      const statusBorder = visit.status === 'pending' 
                        ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-800/30'
                        : visit.status === 'completed'
                        ? 'border-l-4 border-l-emerald-500 border-green-200 dark:border-emerald-800/30'
                        : visit.status === 'cancelled'
                        ? 'border-l-4 border-l-rose-500 border-rose-200 dark:border-rose-800/30'
                        : 'border-l-4 border-l-gray-400 border-gray-200 dark:border-gray-700/50';
                        
                      // Appliquer la couleur de fond subtile seulement à l'événement, pas à tout l'agenda
                      const statusColor = visit.status === 'pending' 
                        ? 'bg-white hover:bg-amber-50/50 dark:bg-card dark:hover:bg-amber-900/5'
                        : visit.status === 'completed'
                        ? 'bg-white hover:bg-green-50/50 dark:bg-card dark:hover:bg-emerald-900/5'
                        : visit.status === 'cancelled'
                        ? 'bg-white hover:bg-rose-50/50 dark:bg-card dark:hover:bg-rose-900/5'
                        : 'bg-white hover:bg-gray-50/50 dark:bg-card dark:hover:bg-gray-800/5';
                        
                      const statusText = visit.status === 'pending' 
                        ? 'En attente'
                        : visit.status === 'completed'
                        ? 'Terminée'
                        : visit.status === 'cancelled'
                        ? 'Annulée'
                        : visit.status;

                      // Vérifier si la visite est aujourd'hui
                      const visitDate = new Date(visit.datetime);
                      const isToday = new Date().toDateString() === visitDate.toDateString();
                      
                      // Calculer si c'est dans le futur ou le passé
                      const now = new Date();
                      const isFuture = visitDate > now;
                      const isPast = visitDate < now && visit.status === 'pending';

                      return (
                        <div className={cn(
                          `rounded-lg p-3 mb-2 ${statusBorder} ${statusColor} transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md`,
                          isToday && "bg-gradient-to-r from-background to-violet-50/10 dark:from-background dark:to-violet-950/5 shadow-sm"
                        )}>
                          <div className="flex items-start gap-3">
                            {/* Icône et indicateur de type */}
                            <div className="flex-shrink-0">
                              <div className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-violet-100 dark:border-violet-800/30 mb-1">
                                <VisitIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                              <div className="text-[10px] font-medium text-center text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-900/30 rounded-full px-1 py-0.5 border border-violet-100 dark:border-violet-800/30 whitespace-nowrap">
                                {typeLabel}
                              </div>
                            </div>
                            
                            {/* Informations principales */}
                            <div className="flex-grow space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-black dark:text-white">{visit.firstName} {visit.lastName}</div>
                                
                                {isPast && (
                                  <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    En retard
                                  </Badge>
                                )}
                              </div>

                              {/* Bloc d'informations */}
                              <div className="grid grid-cols-1 gap-1.5">
                              {/* Adresse */}
                                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5 border border-slate-100 dark:border-slate-700/50">
                                  <Home className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                                <span className="truncate">
                                  {visit.property?.name || visit.manualAddress || "Adresse non spécifiée"}
                                </span>
                              </div>

                                {/* Ligne de contact - Email et téléphone */}
                                <div className="flex gap-1.5">
                              {/* Email */}
                              {visit.email && (
                                    <div className="flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5 border border-slate-100 dark:border-slate-700/50">
                                      <Zap className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                  <span className="truncate">{visit.email}</span>
                                </div>
                              )}

                              {/* Téléphone */}
                              {visit.phone && (
                                    <div className="flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5 border border-slate-100 dark:border-slate-700/50">
                                      <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                      <span className="truncate">{visit.phone}</span>
                                </div>
                              )}
                                </div>
                              </div>

                              {/* Statut */}
                              <div className="flex items-center justify-end gap-2 mt-2">
                                <Badge className={cn(
                                  visit.status === 'pending' 
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : visit.status === 'completed'
                                    ? 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : visit.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800/70 dark:text-gray-300'
                                )}>
                                  {statusText}
                                </Badge>
                                
                                {isToday && (
                                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/30">
                                    Aujourd'hui
                                  </Badge>
                                )}
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

                    // Obtenir les classes de bordure selon le statut
                    const statusBorder = visit.status === 'pending' 
                      ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-800/30'
                      : visit.status === 'completed'
                      ? 'border-l-4 border-l-emerald-500 border-green-200 dark:border-emerald-800/30'
                      : visit.status === 'cancelled'
                      ? 'border-l-4 border-l-rose-500 border-rose-200 dark:border-rose-800/30'
                      : 'border-l-4 border-l-gray-400 border-gray-200 dark:border-gray-700/50';
                      
                    // Appliquer la couleur de fond subtile seulement à l'événement, pas à tout l'agenda
                    const statusColor = visit.status === 'pending' 
                      ? 'bg-white hover:bg-amber-50/50 dark:bg-card dark:hover:bg-amber-900/5'
                      : visit.status === 'completed'
                      ? 'bg-white hover:bg-green-50/50 dark:bg-card dark:hover:bg-emerald-900/5'
                      : visit.status === 'cancelled'
                      ? 'bg-white hover:bg-rose-50/50 dark:bg-card dark:hover:bg-rose-900/5'
                      : 'bg-white hover:bg-gray-50/50 dark:bg-card dark:hover:bg-gray-800/5';
                      
                    const statusText = visit.status === 'pending' 
                      ? 'En attente'
                      : visit.status === 'completed'
                      ? 'Terminée'
                      : visit.status === 'cancelled'
                      ? 'Annulée'
                      : visit.status;

                    // Vérifier si la visite est aujourd'hui
                    const visitDate = new Date(visit.datetime);
                    const isToday = new Date().toDateString() === visitDate.toDateString();
                    
                    // Calculer si c'est dans le futur ou le passé
                    const now = new Date();
                    const isFuture = visitDate > now;
                    const isPast = visitDate < now && visit.status === 'pending';

                    return (
                      <div className={cn(
                        `rounded-lg p-3 mb-2 ${statusBorder} ${statusColor} transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md`,
                        isToday && "bg-gradient-to-r from-background to-violet-50/10 dark:from-background dark:to-violet-950/5 shadow-sm"
                      )}>
                        <div className="flex items-start gap-3">
                          {/* Icône et indicateur de type */}
                          <div className="flex-shrink-0">
                            <div className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-violet-100 dark:border-violet-800/30 mb-1">
                              <VisitIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </div>
                            <div className="text-[10px] font-medium text-center text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-900/30 rounded-full px-1 py-0.5 border border-violet-100 dark:border-violet-800/30 whitespace-nowrap">
                              {visit.visitType === 'physical' ? 'Visite sur place' : 
                               visit.visitType === 'virtual' ? 'Visite virtuelle' : 
                               visit.visitType === 'video' ? 'Visite vidéo' : 'Visite'}
                            </div>
                          </div>
                          
                          {/* Informations principales */}
                          <div className="flex-grow space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-black dark:text-white">{visit.firstName} {visit.lastName}</div>
                              
                              {isPast && (
                                <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  En retard
                                </Badge>
                          )}
                        </div>

                            {/* Bloc d'informations */}
                            <div className="grid grid-cols-1 gap-1.5">
                              {/* Adresse */}
                              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5 border border-slate-100 dark:border-slate-700/50">
                                <Home className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                                <span className="truncate">
                                  {visit.property?.name || visit.manualAddress || "Adresse non spécifiée"}
                                </span>
                              </div>

                              {/* Email */}
                              {visit.email && (
                                <div className="text-sm text-black/80 dark:text-foreground/80 flex items-center gap-1 border border-slate-100 dark:border-slate-700 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/40">
                                  <Zap className="h-3 w-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]">{visit.email}</span>
                                </div>
                              )}

                              {/* Téléphone */}
                              {visit.phone && (
                                <div className="text-sm text-black/80 dark:text-foreground/80 flex items-center gap-1 border border-slate-100 dark:border-slate-700 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/40">
                                  <Clock className="h-3 w-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                  <span className="truncate max-w-[100px]">{visit.phone}</span>
                                </div>
                              )}

                              {/* Type de visite */}
                              <div className="text-xs text-gray-500 dark:text-gray-400 border border-slate-100 dark:border-slate-700 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/40 whitespace-nowrap">
                                {visit.visitType === 'physical' ? 'Visite sur place' : 
                                 visit.visitType === 'virtual' ? 'Visite virtuelle' : 
                                 visit.visitType === 'video' ? 'Visite vidéo' : 'Visite'}
                              </div>
                            </div>

                            {/* Badge de statut */}
                            <Badge className={cn(
                              "flex-shrink-0 whitespace-nowrap ml-auto",
                              visit.status === 'pending' 
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/40'
                                : visit.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40'
                                : visit.status === 'cancelled'
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/40'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            )}>
                              {visit.status === 'pending' && 'En attente'}
                              {visit.status === 'completed' && 'Terminée'}
                              {visit.status === 'cancelled' && 'Annulée'}
                              {visit.status !== 'pending' && visit.status !== 'completed' && visit.status !== 'cancelled' && visit.status}
                            </Badge>
                          </div>
                            </div>
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