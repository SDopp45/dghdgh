import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  CalendarDays, 
  Check, 
  ChevronDown, 
  RefreshCcw,
  History,
  Clock
} from "lucide-react";
import { ExternalCalendarSync } from "./external-calendar-sync";
import { useToast } from "@/hooks/use-toast";

interface CalendarSyncMenuProps {
  showPastPending?: boolean;
  onTogglePastPending?: (show: boolean) => void;
}

export function CalendarSyncMenu({ 
  showPastPending = false,
  onTogglePastPending = () => {}
}: CalendarSyncMenuProps) {
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Cette fonction serait utilisée pour vérifier si l'utilisateur 
  // a déjà connecté ses comptes Google ou Outlook
  const [connectedServices, setConnectedServices] = useState<{
    google: boolean;
    outlook: boolean;
  }>({
    google: false,
    outlook: false
  });

  // Fonction pour synchroniser manuellement avec les calendriers connectés
  const handleSyncNow = async () => {
    setIsSyncing(true);

    try {
      // Appel à l'API pour synchroniser immédiatement toutes les visites
      const response = await fetch("/api/calendar/sync-all", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la synchronisation des calendriers");
      }

      toast({
        title: "Synchronisation réussie",
        description: "Toutes vos visites ont été synchronisées avec vos calendriers",
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur de synchronisation:", error);
      toast({
        title: "Échec de la synchronisation",
        description: "Une erreur s'est produite lors de la synchronisation des calendriers",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Vérifier les services connectés au chargement du composant
  const checkConnectedServices = async () => {
    try {
      const response = await fetch("/api/calendar/status");

      if (response.ok) {
        const data = await response.json();
        setConnectedServices({
          google: data.google?.connected || false,
          outlook: data.outlook?.connected || false
        });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des services connectés:", error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="bg-white">
            <CalendarDays className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Statut des connexions */}
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium mb-1">Services connectés</p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                  <path
                    d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"
                    fill="#4285F4"
                    fillOpacity="0.2"
                  />
                  <path
                    d="M12 4.938c1.82 0 3.486.668 4.753 1.778l-2.5 2.496a4.53 4.53 0 0 0-2.253-.625 4.573 4.573 0 0 0-4.143 2.634l-1.429.454-.998.316-.662-1.59a8.034 8.034 0 0 1 7.232-5.463z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 18.834a7.963 7.963 0 0 1-6.837-3.913l2.636-2.165a4.564 4.564 0 0 0 6.571 2.333l2.484 2.487a7.985 7.985 0 0 1-4.854 1.258z"
                    fill="#34A853"
                  />
                  <path
                    d="M19.834 11.45h-.621v-.045H12v2.689h4.5c-.44 1.104-1.3 1.91-2.354 2.303l.01-.033 2.482 1.94.172.017c1.578-1.462 2.492-3.61 2.492-6.167a8.323 8.323 0 0 0-.126-.704z"
                    fill="#4285F4"
                  />
                </svg>
                <span>Google</span>
              </span>
              {connectedServices.google ? (
                <span className="flex items-center text-green-500">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Connecté
                </span>
              ) : (
                <span className="text-muted-foreground">Non connecté</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                  <path
                    d="M0 0h24v24H0z"
                    fill="#0072C6"
                    fillOpacity="0.1"
                  />
                  <path
                    d="M11.5 7.5H8v9h8v-6h-4.5V7.5zm1.5 0v3h3v-3h-3z"
                    fill="#0072C6"
                  />
                </svg>
                <span>Outlook</span>
              </span>
              {connectedServices.outlook ? (
                <span className="flex items-center text-green-500">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Connecté
                </span>
              ) : (
                <span className="text-muted-foreground">Non connecté</span>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Action de synchronisation manuelle */}
          <DropdownMenuItem 
            disabled={isSyncing || (!connectedServices.google && !connectedServices.outlook)}
            onClick={handleSyncNow}
            className="cursor-pointer"
          >
            {isSyncing ? (
              <>
                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                <span>Synchronisation...</span>
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-2" />
                <span>Synchroniser maintenant</span>
              </>
            )}
          </DropdownMenuItem>

          {/* Ouvrir le dialogue de configuration */}
          <DropdownMenuItem 
            onClick={() => setSyncDialogOpen(true)}
            className="cursor-pointer"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            <span>Gérer les connexions</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExternalCalendarSync
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
      />
    </>
  );
}