import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Check, ExternalLink, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ExternalCalendarSyncProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExternalCalendarSync({ open, onOpenChange }: ExternalCalendarSyncProps) {
  const [activeTab, setActiveTab] = useState<"google" | "outlook">("google");
  const [isLoading, setIsLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const { toast } = useToast();

  // Demander l'URL d'authentification pour Google
  const getGoogleAuthUrl = async () => {
    setIsLoading(true);
    setSyncStatus("connecting");
    try {
      const response = await fetch("/api/calendar/google/auth-url");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'URL d'authentification Google");
      }

      const data = await response.json();
      setAuthUrl(data.url);
    } catch (error) {
      console.error("Erreur:", error);
      setSyncStatus("error");
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter à Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demander l'URL d'authentification pour Outlook
  const getOutlookAuthUrl = async () => {
    setIsLoading(true);
    setSyncStatus("connecting");
    try {
      const response = await fetch("/api/calendar/outlook/auth-url");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'URL d'authentification Outlook");
      }

      const data = await response.json();
      setAuthUrl(data.url);
    } catch (error) {
      console.error("Erreur:", error);
      setSyncStatus("error");
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter à Outlook Calendar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ouvrir la fenêtre d'authentification
  const openAuthWindow = () => {
    if (!authUrl) return;

    // Ouvrir une nouvelle fenêtre pour l'authentification
    const authWindow = window.open(authUrl, "_blank", "width=600,height=700");

    // Vérifier périodiquement si l'authentification est terminée
    const checkAuthStatus = setInterval(async () => {
      try {
        const response = await fetch(`/api/calendar/${activeTab}/status`);
        const data = await response.json();

        if (data.connected) {
          clearInterval(checkAuthStatus);
          setSyncStatus("success");
          toast({
            title: "Connexion réussie",
            description: `Votre compte ${activeTab === "google" ? "Google" : "Outlook"} a été connecté avec succès`,
            className: "bg-green-500/10 border-green-500/20",
          });

          // Fermer la fenêtre d'authentification si elle est encore ouverte
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du statut:", error);
      }
    }, 2000);

    // Arrêter de vérifier après 2 minutes (au cas où l'utilisateur annule)
    setTimeout(() => {
      clearInterval(checkAuthStatus);
    }, 120000);
  };

  // Gérer les changements d'onglet
  const handleTabChange = (value: string) => {
    setActiveTab(value as "google" | "outlook");
    setAuthUrl(null);
    setSyncStatus("idle");
  };

  // Démarrer le processus d'authentification en fonction de l'onglet actif
  const handleConnectClick = () => {
    if (activeTab === "google") {
      getGoogleAuthUrl();
    } else {
      getOutlookAuthUrl();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-violet-500" />
            <span>Synchronisation avec calendriers externes</span>
          </DialogTitle>
          <DialogDescription>
            Connectez vos comptes pour synchroniser automatiquement les visites dans votre calendrier
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="google" className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.086-10.432L4.226 5.22a8.03 8.03 0 0 0-1.836 5.116c-.103 4.02 2.845 7.51 6.837 8.252l1.687-6.788v-.232z"
                  fill="#EA4335"
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
            </TabsTrigger>
            <TabsTrigger value="outlook" className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zm4.93 1.75q0-.9-.27-1.73-.28-.82-.7-1.51-.44-.7-1.13-1.37-.69-.66-1.41-1.21-.74-.55-1.5-.99-.77-.44-1.57-.73-.81-.3-1.72-.48Q3.59 5.58 2.47 5.57v-.03q-.92 0-1.55.65-.64.64-.64 1.56 0 .93.65 1.56.65.64 1.55.64h21.35q.8 0 1.28-.41.49-.4.47-1.17-.01-.36-.14-.68-.14-.32-.4-.56t-.65-.36q-.39-.13-.85-.13H10.8q-.36 2.02-1.94 3.4-1.57 1.38-3.98 1.38-.57 0-1.1-.1-.53-.1-1.06-.27z"
                  fill="#0072C6"
                />
                <path
                  d="M5.73 15.1q3.5 0 6.25-2.5 2.75-2.5 3.44-6.13h6.13q.16 0 .3.06.15.07.26.18.1.12.17.28.06.17.06.35 0 .36-.25.62-.26.26-.62.26h-4.95q-.72 3.75-3.4 6.43-2.67 2.68-6.4 3.4v4.1q0 .35-.26.6-.25.26-.6.26t-.6-.25q-.26-.26-.26-.6V15.1z"
                  fill="#0072C6"
                />
              </svg>
              <span>Outlook</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google">
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-medium">Google Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Connectez votre compte Google pour ajouter automatiquement vos visites à votre calendrier.
                </p>
              </div>

              {syncStatus === "success" ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle>Connexion réussie</AlertTitle>
                  <AlertDescription>
                    Votre compte Google Calendar est maintenant connecté. Les visites seront automatiquement synchronisées.
                  </AlertDescription>
                </Alert>
              ) : syncStatus === "error" ? (
                <Alert variant="destructive">
                  <AlertTitle>Erreur de connexion</AlertTitle>
                  <AlertDescription>
                    Impossible de se connecter à Google Calendar. Veuillez réessayer ultérieurement.
                  </AlertDescription>
                </Alert>
              ) : null}

              {authUrl ? (
                <Button 
                  onClick={openAuthWindow}
                  className="w-full flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir la page d'authentification
                </Button>
              ) : (
                <Button 
                  onClick={handleConnectClick}
                  className="w-full"
                  disabled={isLoading || syncStatus === "success"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : syncStatus === "success" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Connecté
                    </>
                  ) : (
                    "Connecter Google Calendar"
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="outlook">
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-medium">Outlook Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Connectez votre compte Microsoft pour ajouter automatiquement vos visites à votre calendrier Outlook.
                </p>
              </div>

              {syncStatus === "success" ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle>Connexion réussie</AlertTitle>
                  <AlertDescription>
                    Votre compte Outlook Calendar est maintenant connecté. Les visites seront automatiquement synchronisées.
                  </AlertDescription>
                </Alert>
              ) : syncStatus === "error" ? (
                <Alert variant="destructive">
                  <AlertTitle>Erreur de connexion</AlertTitle>
                  <AlertDescription>
                    Impossible de se connecter à Outlook Calendar. Veuillez réessayer ultérieurement.
                  </AlertDescription>
                </Alert>
              ) : null}

              {authUrl ? (
                <Button 
                  onClick={openAuthWindow}
                  className="w-full flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir la page d'authentification
                </Button>
              ) : (
                <Button 
                  onClick={handleConnectClick}
                  className="w-full"
                  disabled={isLoading || syncStatus === "success"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : syncStatus === "success" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Connecté
                    </>
                  ) : (
                    "Connecter Outlook Calendar"
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}