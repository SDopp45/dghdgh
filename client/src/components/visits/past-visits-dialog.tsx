import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/types/visits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InputGroup } from "@/components/ui/input-group";
import { isBefore } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Search,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Archive,
  CalendarIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface PastVisitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PastVisitsDialog({ open, onOpenChange }: PastVisitsDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Récupération des visites depuis l'API
  const { data: visits = [], isLoading } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filtrage des visites passées non archivées
  const pastVisits = useMemo(() => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Filtrer les visites passées non archivées
    const filtered = visits.filter(visit => {
      const visitDate = new Date(visit.datetime);
      visitDate.setHours(0, 0, 0, 0);
      return !visit.archived && isBefore(visitDate, currentDate);
    });

    // Appliquer la recherche si nécessaire
    const searchFiltered = searchTerm
      ? filtered.filter(visit => 
          visit.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visit.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (visit.property?.name && visit.property.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (visit.manualAddress && visit.manualAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
          visit.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : filtered;

    // Trier par date (plus récent en premier)
    return searchFiltered.sort((a, b) => 
      new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
  }, [visits, searchTerm]);

  // Modifier rapidement le statut d'une visite
  const handleStatusChange = async (visitId: number, newStatus: string) => {
    try {
      await fetch(`/api/visits/${visitId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });

      toast({
        title: "Statut mis à jour",
        description: "Le statut de la visite a été modifié avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  // Archiver une visite
  const handleArchiveVisit = async (visitId: number) => {
    try {
      await fetch(`/api/visits/${visitId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true })
      });

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });

      toast({
        title: "Visite archivée",
        description: "La visite a été archivée avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur lors de l'archivage:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'archiver la visite",
        variant: "destructive",
      });
    }
  };

  // Archiver toutes les visites passées
  const handleArchiveAllPastVisits = async () => {
    try {
      const archivePromises = pastVisits.map(visit =>
        fetch(`/api/visits/${visit.id}/archive`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true })
        })
      );

      await Promise.all(archivePromises);

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });

      toast({
        title: "Visites archivées",
        description: `${pastVisits.length} visite(s) ont été archivées avec succès`,
        className: "bg-green-500/10 border-green-500/20",
      });

      // Fermer la boîte de dialogue si toutes les visites ont été archivées
      if (pastVisits.length > 0) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Erreur lors de l'archivage:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'archiver les visites",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Archive className="h-5 w-5 text-indigo-500" />
            Visites passées
          </DialogTitle>
          <DialogDescription>
            Gérez les visites passées et modifiez leur statut
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barre d'outils */}
          <div className="flex flex-wrap items-center justify-between gap-3">
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

          {/* Liste des visites passées */}
          <div className="max-h-[500px] overflow-y-auto pr-2 -mr-2">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : pastVisits.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                  <CalendarIcon className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Aucune visite passée</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchTerm 
                    ? "Essayez de modifier vos critères de recherche."
                    : "Toutes vos visites passées ont été archivées ou sont à venir."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastVisits.map((visit) => (
                  <motion.div
                    key={visit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      visit.status === "pending" && "border-amber-200 bg-amber-50/50",
                      visit.status === "completed" && "border-emerald-200 bg-emerald-50/50",
                      visit.status === "cancelled" && "border-rose-200 bg-rose-50/50",
                      visit.status === "no_show" && "border-neutral-200 bg-neutral-50/50",
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{visitTypeIcons[visit.visitType]}</span>
                          <h3 className="font-medium">
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
                            <span>{format(new Date(visit.datetime), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</span>
                          </div>

                          {(visit.property?.name || visit.manualAddress) && (
                            <div>
                              <span>•</span>
                              <span className="ml-1">
                                {visit.property?.name || visit.manualAddress}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-white"
                            >
                              <Clock3 className="h-4 w-4 mr-1" />
                              Changer statut
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
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}