import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileUp, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ExportMenuProps {
  type: "visits" | "tenants" | "transactions" | "properties" | "maintenance";
  allowImport?: boolean;
  currentFilters?: Record<string, any>;
  selectedId?: number;
}

export function ExportMenu({ type, allowImport = false, currentFilters, selectedId }: ExportMenuProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleImport = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/export/import/csv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'import');
      }

      toast({
        title: "✨ Import réussi",
        description: "Les données ont été importées avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      setIsImportDialogOpen(false);
      setDropdownOpen(false);
    } catch (error) {
      console.error('Erreur import:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'import",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      let url = `/api/export/export/csv?type=${type}`;

      if (currentFilters) {
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value) url += `&${key}=${encodeURIComponent(value)}`;
        });
      }

      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "✨ Export réussi",
        description: "Les données ont été exportées avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });
      setDropdownOpen(false);
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'export",
        variant: "destructive",
      });
    }
  };

  const getExampleCSV = () => {
    let exampleContent = '';
    switch (type) {
      case 'tenants':
        exampleContent = 'Locataire,Propriété,Type de bail,Début du bail,Fin du bail,Loyer\n' +
          'Jean Dupont,Résidence Les Jardins,bail_meuble,2024-01-01,2025-01-01,1000\n' +
          'Marie Martin,Le Carré des Arts,bail_vide,2024-02-01,2025-02-01,1500\n' +
          'Pierre Durand,Les Terrasses du Parc,bail_professionnel,2024-03-01,2025-03-01,800';
        break;
      case 'visits':
        exampleContent = 'propertyId,date,status,visitorName,visitorEmail,visitorPhone,notes\n' +
          '1,2024-03-10T14:00:00,scheduled,Pierre Dubois,pierre@email.com,0601020304,"Intéressé par le jardin"\n' +
          '2,2024-03-11T10:00:00,completed,Marie Martin,marie@email.com,0605060708,"Question sur le garage"';
        break;
      case 'transactions':
        exampleContent = 'type,montant,date,categorie,description,proprieteId,methodePaiement,statut\n' +
          'revenu,1000,completed,2024-03-01,loyer,"Loyer Mars 2024",1,virement\n' +
          'depense,150,completed,2024-03-05,maintenance,"Réparation plomberie",2,carte';
        break;
      case 'properties':
        exampleContent = 'name,type,address,rooms,bedrooms,bathrooms,livingArea,purchasePrice,description\n' +
          'Résidence Les Jardins,apartment,"123 Rue du Centre",4,2,1,85,250000,"Bel appartement rénové"\n' +
          'Le Carré des Arts,house,"45 Avenue des Fleurs",6,4,2,150,450000,"Grande maison avec jardin"';
        break;
      case 'maintenance':
        exampleContent = 'propertyId,title,description,priority,status,reportedBy,totalCost,date\n' +
          '1,"Fuite d\'eau","Fuite sous l\'évier de la cuisine",high,open,"Jean Dupont",150,"2024-03-01"\n' +
          '2,"Serrure défectueuse","La serrure de la porte d\'entrée ne fonctionne plus",medium,in_progress,"Marie Martin",75,"2024-03-05"';
        break;
    }

    const blob = new Blob([exampleContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `exemple_${type}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Import/Export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allowImport && (
            <DropdownMenuItem onClick={() => {
              setIsImportDialogOpen(true);
              setDropdownOpen(false);
            }}>
              <FileUp className="mr-2 h-4 w-4" />
              Importer CSV
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            Exporter CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog 
        open={isImportDialogOpen} 
        onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) setDropdownOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer des données</DialogTitle>
            <DialogDescription>
              Importez vos données à partir d'un fichier CSV.
              Assurez-vous que votre fichier respecte le format attendu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
            <div className="text-sm text-muted-foreground">
              <p>Format attendu :</p>
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-blue-500 hover:text-blue-600"
                onClick={getExampleCSV}
              >
                Télécharger exemple_{type}.csv
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}