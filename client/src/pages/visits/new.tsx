import { useEffect } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { NewVisitDialog } from "@/components/visits/new-visit-dialog";
import { useToast } from "@/hooks/use-toast";

export default function NewVisitPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Dialog is always open on this page
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Redirect to visits page when dialog is closed
      setLocation("/visits");
    }
  };

  const handleSuccess = (message: string) => {
    toast({
      title: "✅ Visite planifiée",
      description: message,
      className: "bg-green-500/10 border-green-500/20",
    });
  };

  useEffect(() => {
    // Set page title
    document.title = "Nouvelle visite | Gestion Immobilière";
  }, []);

  return (
    <div className="container max-w-7xl mx-auto p-4 space-y-6">
      <PageHeader
        title="Nouvelle visite"
        description="Planifier une nouvelle visite pour un bien immobilier"
      />

      {/* Les éléments de fond ne seront pas visibles car la boîte de dialogue sera ouverte */}
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            La boîte de dialogue pour planifier une nouvelle visite devrait être ouverte.
            Si ce n'est pas le cas, <a href="/visits" className="text-primary hover:underline">retournez à la liste des visites</a>.
          </p>
        </CardContent>
      </Card>

      {/* Boîte de dialogue toujours ouverte sur cette page */}
      <NewVisitDialog 
        open={true} 
        onOpenChange={handleOpenChange} 
        onSuccess={handleSuccess}
      />
    </div>
  );
}