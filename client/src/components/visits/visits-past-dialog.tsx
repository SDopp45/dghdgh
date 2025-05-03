import { useState, useMemo } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/types/visits";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { InputGroup } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Clock3, 
  CheckCircle2, 
  XCircle, 
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { VisitEventDialog } from "./visit-event-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Configuration des statuts
const statusConfig = {
  pending: {
    label: "En attente",
    icon: <Clock3 className="h-4 w-4" />,
    color: "bg-amber-500 text-white"
  },
  completed: {
    label: "Terminée",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-emerald-500 text-white"
  },
  cancelled: {
    label: "Annulée",
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-rose-500 text-white"
  },
  no_show: {
    label: "Absent",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "bg-neutral-500 text-white"
  }
};

// Icônes des types de visites
const visitTypeIcons = {
  physical: "🏠",
  virtual: "💻",
  video: "📹",
};

interface VisitsPastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visits?: Visit[]; // Liste de visites à utiliser (optionnelle)
  onSelectVisit?: (visit: Visit) => void; // Callback lorsqu'une visite est sélectionnée (optionnel)
}

export function VisitsPastDialog({ open, onOpenChange, visits: propVisits, onSelectVisit }: VisitsPastDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showVisitDialog, setShowVisitDialog] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Récupération des visites depuis l'API si elles ne sont pas fournies en prop
  const { data: apiVisits = [], isLoading: apiLoading } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !propVisits, // Ne pas exécuter la requête si les visites sont fournies en props
  });

  // Utiliser les visites fournies en prop ou celles récupérées via l'API
  const visits = propVisits || apiVisits;
  const isLoading = propVisits ? false : apiLoading;

  // Filtrer les visites passées non archivées et en attente
  const pendingPastVisits = useMemo(() => {
    const currentDate = new Date();

    // Filtrer par terme de recherche
    const searchFiltered = searchTerm 
      ? visits.filter(visit => 
          visit.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visit.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (visit.property?.name && visit.property.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.manualAddress && visit.manualAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          visit.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : visits;

    // Filtrer pour n'inclure que les visites passées, en attente et non archivées
    return searchFiltered.filter(visit => {
      const visitDate = new Date(visit.datetime);
      return !visit.archived && visitDate < currentDate && visit.status === "pending";
    }).sort((a, b) => {
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime(); // Plus récentes en premier
    });
  }, [visits, searchTerm]);

  // Grouper les visites par date pour les séparateurs
  const visitsByDate = useMemo(() => {
    const groups: Record<string, Visit[]> = {};

    pendingPastVisits.forEach(visit => {
      const date = new Date(visit.datetime);
      const dateKey = format(date, "yyyy-MM-dd");

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(visit);
    });

    return groups;
  }, [pendingPastVisits]);

  // Mutation pour changer le statut d'une visite
  const statusChangeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/visits/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du statut");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Mettre à jour localement les visites
      const currentVisits = queryClient.getQueryData<Visit[]>(["/api/visits"]) || [];
      const updatedVisits = currentVisits.map(v => 
        v.id === variables.id ? { ...v, status: variables.status } : v
      );

      // Mettre à jour le cache
      queryClient.setQueryData(["/api/visits"], updatedVisits);

      // Rafraîchir en arrière-plan
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${statusConfig[variables.status as keyof typeof statusConfig].label}"`,
        className: "bg-green-500/10 border-green-500/20",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  });

  // Gérer le changement de statut d'une visite
  const handleStatusChange = (visitId: number, newStatus: string) => {
    statusChangeMutation.mutate({ id: visitId, status: newStatus });
  };

  // Ouvrir la boîte de dialogue des détails ou transmettre à l'appelant
  const handleOpenVisitDetails = (visit: Visit) => {
    if (onSelectVisit) {
      // Si un callback est fourni, l'utiliser (pour la vue calendrier)
      onSelectVisit(visit);
    } else {
      // Sinon, ouvrir le dialogue interne (pour la vue liste)
      setSelectedVisit(visit);
      setShowVisitDialog(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Visites passées en attente</DialogTitle>
            <DialogDescription>
              Liste des visites passées avec statut "En attente" qui nécessitent d'être classées
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <InputGroup className="max-w-md">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Search className="h-4 w-4" />
              </div>
              <Input
                placeholder="Rechercher une visite passée..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>

          <div className="overflow-y-auto flex-1 pr-2 -mr-2">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
              </div>
            ) : pendingPastVisits.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                  <CalendarIcon className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Aucune visite passée en attente</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchTerm 
                    ? "Essayez de modifier vos critères de recherche."
                    : "Toutes vos visites passées ont déjà été classées ou vous n'avez pas encore de visites passées en attente."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Afficher les visites groupées par date */}
                {Object.entries(visitsByDate).map(([dateKey, visitsForDate]) => (
                  <div key={dateKey} className="space-y-3">
                    {/* Séparateur de date */}
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-muted"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-background px-4 text-sm font-medium text-muted-foreground">
                          {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    </div>

                    {/* Visites de cette date */}
                    {visitsForDate.map((visit) => (
                      <div
                        key={visit.id}
                        className={cn(
                          "p-4 rounded-lg border transition-colors cursor-pointer",
                          visit.status === "pending" && "border-amber-200 bg-amber-50/50",
                          visit.status === "completed" && "border-emerald-200 bg-emerald-50/50",
                          visit.status === "cancelled" && "border-rose-200 bg-rose-50/50",
                          visit.status === "no_show" && "border-neutral-200 bg-neutral-50/50",
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div 
                            className="space-y-1 flex-1"
                            onClick={() => handleOpenVisitDetails(visit)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{visitTypeIcons[visit.visitType]}</span>
                              <h3 className="font-medium text-lg">
                                {visit.firstName} {visit.lastName}
                              </h3>
                              <Badge 
                                className={cn(
                                  "ml-2 flex items-center gap-1.5",
                                  statusConfig[visit.status as keyof typeof statusConfig].color
                                )}
                              >
                                {statusConfig[visit.status as keyof typeof statusConfig].icon}
                                <span>{statusConfig[visit.status as keyof typeof statusConfig].label}</span>
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                <span>{format(new Date(visit.datetime), "'à' HH'h'mm", { locale: fr })}</span>
                              </div>

                              {(visit.property?.name || visit.manualAddress) && (
                                <div>
                                  <span>•</span>
                                  <span className="ml-1">
                                    {visit.property?.name || visit.manualAddress}
                                  </span>
                                </div>
                              )}

                              {visit.email && (
                                <div>
                                  <span>•</span>
                                  <span className="ml-1">
                                    {visit.email}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Menu pour changer rapidement le statut */}
                          <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="bg-white"
                                  title="Changer statut"
                                >
                                  <Clock3 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {Object.entries(statusConfig).map(([status, config]) => (
                                  <DropdownMenuItem
                                    key={status}
                                    disabled={visit.status === status}
                                    onClick={() => handleStatusChange(visit.id, status)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    {config.icon}
                                    <span>{config.label}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de détails de visite */}
      {selectedVisit && (
        <VisitEventDialog
          visit={selectedVisit}
          open={showVisitDialog}
          onOpenChange={setShowVisitDialog}
          fromPastVisits={true}
        />
      )}
    </>
  );
}