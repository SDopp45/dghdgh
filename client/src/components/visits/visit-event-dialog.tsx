import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarClock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Building, 
  FileText, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock3
} from "lucide-react";
import { Visit } from "@/types/visits";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const visitTypeIcons = {
  physical: "🏠",
  virtual: "💻",
  video: "📹",
};

const statusConfig = {
  pending: {
    label: "En attente",
    icon: <Clock3 className="h-4 w-4" />,
    color: "bg-amber-500 border-amber-600 text-white",
    action: "Marquer comme terminée"
  },
  completed: {
    label: "Terminée",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-emerald-500 border-emerald-600 text-white",
    action: "Marquer comme en attente"
  },
  cancelled: {
    label: "Annulée",
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-rose-500 border-rose-600 text-white",
    action: "Marquer comme en attente"
  },
  no_show: {
    label: "Absent",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "bg-neutral-500 border-neutral-600 text-white",
    action: "Marquer comme en attente"
  }
};

interface VisitEventDialogProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromPastVisits?: boolean;
}

export function VisitEventDialog({ 
  visit, 
  open, 
  onOpenChange,
  fromPastVisits = false
}: VisitEventDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // On définit les mutations en dehors des conditions
  const statusMutation = useMutation({
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
    onSuccess: (data, variables) => {
      // Mettre à jour immédiatement toutes les instances du cache
      const currentVisits = queryClient.getQueryData<Visit[]>(["/api/visits"]) || [];
      const updatedVisits = currentVisits.map(v => 
        v.id === variables.id ? { ...v, status: variables.status } : v
      );

      // Mettre à jour le cache
      queryClient.setQueryData(["/api/visits"], updatedVisits);

      // Fermer la boîte de dialogue après la mise à jour
      onOpenChange(false);

      // Rafraîchir en arrière-plan pour s'assurer que toutes les vues sont synchronisées
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });

      toast({
        title: "✅ Statut mis à jour",
        description: "Le statut de la visite a été modifié avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });
      setIsUpdating(false);
    },
    onError: () => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour le statut de la visite",
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  });

  // Si pas de visite sélectionnée, on ne rend rien
  if (!visit) return null;

  // Maintenant que nous avons vérifié que la visite n'est pas null, définissons la date
  const visitDate = new Date(visit.datetime);

  // Toutes les fonctions qui utilisent visit doivent être définies après la vérification
  const handleStatusChange = () => {
    if (!visit) return; // Vérification supplémentaire pour TypeScript
    setIsUpdating(true);

    let newStatus: string;

    switch (visit.status) {
      case "pending":
        newStatus = "completed";
        break;
      case "completed":
        newStatus = "pending";
        break;
      case "cancelled":
        newStatus = "pending";
        break;
      case "no_show":
        newStatus = "pending";
        break;
      default:
        newStatus = "pending";
    }

    statusMutation.mutate({ id: visit.id, status: newStatus });
  };

  const handleCancelVisit = () => {
    if (!visit) return; // Vérification supplémentaire pour TypeScript
    setIsUpdating(true);
    statusMutation.mutate({ id: visit.id, status: "cancelled" });
  };

  const handleMarkNoShow = () => {
    if (!visit) return; // Vérification supplémentaire pour TypeScript
    setIsUpdating(true);
    statusMutation.mutate({ id: visit.id, status: "no_show" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className="text-2xl">{visitTypeIcons[visit.visitType]}</div>
            <div className="flex-1">
              Visite {visitTypeIcons[visit.visitType] === "🏠" ? "physique" : 
                      visitTypeIcons[visit.visitType] === "💻" ? "virtuelle" : "vidéo"}
            </div>
            <Badge 
              className={cn(
                "ml-auto px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5",
                statusConfig[visit.status as keyof typeof statusConfig].color
              )}
            >
              {statusConfig[visit.status as keyof typeof statusConfig].icon}
              {statusConfig[visit.status as keyof typeof statusConfig].label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            Détails et informations sur cette visite
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations principales */}
          <div className="grid grid-cols-1 gap-4 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-lg p-4 border border-violet-100 dark:border-violet-800/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Date et heure</div>
                <div className="font-medium text-foreground">
                  {format(visitDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Lieu</div>
                <div className="font-medium text-foreground">
                  {visit.property?.name || visit.manualAddress || "Non spécifié"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Visiteur</div>
                <div className="font-medium text-foreground">
                  {visit.firstName} {visit.lastName}
                </div>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div>
            <h3 className="font-medium mb-2 text-foreground">Coordonnées</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{visit.email || "Non spécifié"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{visit.phone || "Non spécifié"}</span>
              </div>
            </div>
          </div>

          {/* Notes (si présent) */}
          {visit.message && (
            <div>
              <h3 className="font-medium mb-2 text-foreground">Notes</h3>
              <div className="bg-muted dark:bg-muted/50 rounded-md p-3 text-sm text-foreground">
                {visit.message}
              </div>
            </div>
          )}

          {/* Progression de préparation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">Préparation</h3>
              <span className="text-xs text-muted-foreground">
                {visit.status === "completed" ? "100%" : 
                 visit.status === "cancelled" ? "N/A" : 
                 visit.status === "no_show" ? "N/A" : "75%"}
              </span>
            </div>
            <Progress
              value={visit.status === "completed" ? 100 : 
                    visit.status === "cancelled" ? 0 :
                    visit.status === "no_show" ? 0 : 75}
              className={cn(
                "h-2",
                visit.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30" : 
                visit.status === "cancelled" ? "bg-rose-100 dark:bg-rose-900/30" :
                visit.status === "no_show" ? "bg-neutral-100 dark:bg-neutral-800/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}
            />
          </div>
        </div>

        <Separator />

        {!fromPastVisits && (
          <DialogFooter className="flex flex-col space-y-2 sm:space-y-0">
            <div className="flex flex-wrap gap-2 justify-end">
              {visit.status !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelVisit}
                  disabled={isUpdating}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800/50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                  title="Annuler la visite"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Annuler
                </Button>
              )}

              {visit.status !== "no_show" && visit.status !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkNoShow}
                  disabled={isUpdating}
                  className="border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700/50 dark:text-neutral-300 dark:hover:bg-neutral-800/30"
                  title="Marquer comme absent"
                >
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  Absent
                </Button>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={handleStatusChange}
                disabled={isUpdating || visit.status === "cancelled"}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-700 dark:to-indigo-700 dark:hover:from-violet-800 dark:hover:to-indigo-800"
                title={statusConfig[visit.status as keyof typeof statusConfig].action}
              >
                {isUpdating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="h-4 w-4 mr-1.5" />
                    Mise à jour...
                  </motion.div>
                ) : (
                  <>
                    {visit.status === "pending" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Terminer
                      </>
                    ) : (
                      <>
                        <Clock3 className="h-4 w-4 mr-1.5" />
                        Remettre en attente
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}