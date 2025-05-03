import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileUp, FileText, Filter, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExportMenuProps {
  type: "visits" | "tenants" | "transactions" | "properties" | "maintenance";
  allowImport?: boolean;
  currentFilters?: Record<string, any>;
  selectedId?: number;
  data?: any[];
}

export function ExportMenu({ type, allowImport = false, currentFilters, selectedId, data = [] }: ExportMenuProps) {
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

  const handleExportPDF = async () => {
    try {
      // Charger la configuration PDF stockée dans localStorage
      let pdfConfig = {
        companyName: "ImmoVault",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "",
        useLogo: true,
        logoPosition: "left" as "left" | "center" | "right",
        headerColor: "#4B70E2",
        footerText: "Document généré par ImmoVault",
        includeDateInHeader: true,
      };

      // Récupérer les paramètres personnalisés si disponibles
      const savedConfig = localStorage.getItem('pdfConfig');
      if (savedConfig) {
        pdfConfig = { ...pdfConfig, ...JSON.parse(savedConfig) };
      }
      
      // Récupérer le logo s'il existe
      const savedLogo = localStorage.getItem('pdfLogo');
      
      // Récupérer les données depuis l'API si elles ne sont pas fournies
      let exportData = data;
      if (exportData.length === 0) {
        let url = `/api/${type}`;
        if (currentFilters) {
          const queryParams = new URLSearchParams();
          Object.entries(currentFilters).forEach(([key, value]) => {
            if (value) {
              // S'assurer que le statut est correctement passé à l'API
              if (key === 'status') {
                queryParams.append('leaseStatus', value.toString());
              } else {
                queryParams.append(key, value.toString());
              }
            }
          });
          if (queryParams.toString()) url += `?${queryParams.toString()}`;
        }
        
        console.log(`Récupération des données depuis: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données');
        }
        exportData = await response.json();

        // Si un statut est spécifié dans les filtres, filtrer les données manuellement pour être sûr
        if (currentFilters?.status) {
          exportData = exportData.filter((item: any) => 
            item.leaseStatus === currentFilters.status
          );
        }
      } else {
        console.log(`Utilisation des données fournies (${exportData.length} éléments)`);
      }
      
      // Créer un nouveau document PDF
      const doc = new jsPDF();
      
      // Fonction pour convertir couleur hex en RGB
      const hexToRgb = (hex: string) => {
        // Enlever le # si présent
        hex = hex.replace(/^#/, '');
        
        // Convertir les formats abrégés (par exemple, #03F en #0033FF)
        if (hex.length === 3) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        
        return {r, g, b, array: [r, g, b] as [number, number, number]};
      };
      
      // Appliquer la configuration
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Ajouter l'en-tête avec la couleur personnalisée
      const headerColor = hexToRgb(pdfConfig.headerColor);
      doc.setFillColor(headerColor.r, headerColor.g, headerColor.b);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      // Ajouter le logo si activé
      if (pdfConfig.useLogo && savedLogo) {
        let xPosition = 15; // default left
        
        if (pdfConfig.logoPosition === "center") {
          xPosition = pageWidth / 2 - 10;
        } else if (pdfConfig.logoPosition === "right") {
          xPosition = pageWidth - 40;
        }
        
        doc.addImage(savedLogo, 'PNG', xPosition, 5, 20, 20);
      }
      
      // Ajouter le nom de l'entreprise
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      
      // Positionner le texte en fonction du logo
      let textX = 15;
      
      if (pdfConfig.useLogo && savedLogo) {
        if (pdfConfig.logoPosition === "left") {
          textX = 40;
        } else if (pdfConfig.logoPosition === "center") {
          textX = 15;
        }
      }
      
      doc.text(pdfConfig.companyName, textX, 16);
      
      // Ajouter la date si activé
      if (pdfConfig.includeDateInHeader) {
        doc.setFontSize(10);
        const today = new Date();
        const dateStr = format(today, 'dd MMMM yyyy', { locale: fr });
        doc.text(`Généré le ${dateStr}`, pageWidth - 60, 10);
      }
      
      // Ajouter un titre
      let title = "Document";
      if (type === "tenants") {
        // Vérifier s'il y a un filtre de statut pour personnaliser le titre
        if (currentFilters?.status === 'actif') {
          title = "Liste des locataires - Baux actifs";
        } else if (currentFilters?.status === 'fini') {
          title = "Liste des locataires - Baux archivés";
        } else {
          title = "Liste des locataires";
        }
      }
      else if (type === "maintenance") {
        // Vérifier s'il y a un filtre de statut pour personnaliser le titre
        if (currentFilters?.status === 'open') {
          title = "Liste des maintenances - Demandes ouvertes";
        } else if (currentFilters?.status === 'in_progress') {
          title = "Liste des maintenances - Demandes en cours";
        } else if (currentFilters?.status === 'completed') {
          title = "Liste des maintenances - Demandes terminées";
        } else {
          title = "Liste des maintenances";
        }
      }
      else if (type === "visits") title = "Liste des visites";
      else if (type === "properties") title = "Liste des biens";
      else if (type === "transactions") title = "Liste des transactions";
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text(title, 15, 40);
      
      // Information de la société sous le titre
      let yPos = 48;
      if (pdfConfig.companyAddress || pdfConfig.companyPhone || pdfConfig.companyEmail) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        
        if (pdfConfig.companyAddress) {
          yPos += 5;
          doc.text(pdfConfig.companyAddress, pageWidth - 60, yPos, { align: 'right' });
        }
        
        if (pdfConfig.companyPhone) {
          yPos += 4;
          doc.text(`Tél: ${pdfConfig.companyPhone}`, pageWidth - 60, yPos, { align: 'right' });
        }
        
        if (pdfConfig.companyEmail) {
          yPos += 4;
          doc.text(`Email: ${pdfConfig.companyEmail}`, pageWidth - 60, yPos, { align: 'right' });
        }
        
        yPos += 8;
      } else {
        yPos += 10;
      }
      
      // Ajouter des infos sur les filtres appliqués
      if (currentFilters && Object.keys(currentFilters).length > 0) {
        let filterText = 'Filtres appliqués : ';
        const filters: string[] = [];
        
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value) {
            // Traduire les clés
            let displayKey = key;
            let displayValue = value;
            
            // Traduire les clés
            if (key === 'search') displayKey = 'Recherche';
            else if (key === 'leaseType') displayKey = 'Type de bail';
            else if (key === 'status') displayKey = 'Statut';
            else if (key === 'priority') displayKey = 'Priorité';
            else if (key === 'property') displayKey = 'Propriété';
            
            // Traduire les valeurs
            if (key === 'status') {
              if (value === 'actif') displayValue = 'Baux actifs';
              else if (value === 'fini') displayValue = 'Baux archivés';
              else if (value === 'open') displayValue = 'Demandes ouvertes';
              else if (value === 'in_progress') displayValue = 'Demandes en cours';
              else if (value === 'completed') displayValue = 'Demandes terminées';
            }
            else if (key === 'priority') {
              if (value === 'high') displayValue = 'Haute';
              else if (value === 'medium') displayValue = 'Moyenne';
              else if (value === 'low') displayValue = 'Basse';
            }
            else if (key === 'leaseType' && value.toString().startsWith('bail_')) {
              displayValue = value.toString().replace('bail_', '');
            }
            
            filters.push(`${displayKey}: ${displayValue}`);
          }
        });
        
        if (filters.length > 0) {
          filterText += filters.join(', ');
          
          // Ajouter le texte des filtres avec wrapping
          const textLines = doc.splitTextToSize(filterText, 180);
          doc.text(textLines, 15, yPos);
          yPos += textLines.length * 5 + 5;
        }
      }
      
      // Générer le contenu en fonction du type
      let tableData: any[][] = [];
      let tableColumns: string[] = [];
      
      if (type === "tenants") {
        tableColumns = ['Locataire', 'Propriété', 'Type de bail', 'Début bail', 'Fin bail', 'Loyer', 'Statut', 'Email', 'Téléphone'];
        
        // Log pour debug
        console.log(`Export de ${exportData.length} locataires - Statut filtre: ${currentFilters?.status || 'tous'}`);
        
        tableData = exportData.map((tenant: any) => [
          tenant.user?.fullName || `${tenant.firstName || ''} ${tenant.lastName || ''}`,
          tenant.property?.name || tenant.property?.address || '-',
          tenant.leaseType ? tenant.leaseType.replace('bail_', '') : '-',
          tenant.leaseStart ? format(new Date(tenant.leaseStart), 'dd/MM/yyyy', { locale: fr }) : '-',
          tenant.leaseEnd ? format(new Date(tenant.leaseEnd), 'dd/MM/yyyy', { locale: fr }) : '-',
          tenant.rentAmount ? `${tenant.rentAmount} €` : '-',
          tenant.leaseStatus || '-',
          tenant.user?.email || tenant.email || '-',
          tenant.user?.phoneNumber || tenant.phoneNumber || '-'
        ]);
      } else if (type === "maintenance") {
        tableColumns = ['Date', 'Signalé par', 'Propriété', 'Titre', 'Description', 'Coût', 'Priorité'];
        
        // Log pour debug
        console.log(`Export de ${exportData.length} maintenance - Statut: ${currentFilters?.status || 'tous'}`);
        
        tableData = exportData.map((item: any) => [
          item.date ? format(new Date(item.date), 'dd/MM/yyyy', { locale: fr }) : 
          item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: fr }) : '-',
          item.reportedBy || item.tenant?.user?.fullName || 
            (item.tenant ? `${item.tenant.firstName || ''} ${item.tenant.lastName || ''}` : '-'),
          item.property?.name || item.property?.address || '-',
          item.title || '-',
          item.description || '-',
          item.totalCost ? `${item.totalCost} €` : '-',
          item.priority ? (
            item.priority === 'high' ? 'Haute' :
            item.priority === 'medium' ? 'Moyenne' :
            item.priority === 'low' ? 'Basse' : item.priority
          ) : '-'
        ]);
      }
      
      // Créer le tableau
      autoTable(doc, {
        head: [tableColumns],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: headerColor.array, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 255] },
        columnStyles: {
          '0': { fontStyle: 'bold' }, // Première colonne en gras
          [type === "tenants" ? tableColumns.length - 2 : tableColumns.length - 2]: { fontStyle: 'bold' }, // Email ou avant-dernière colonne en gras
          [type === "tenants" ? tableColumns.length - 1 : 0]: { fontStyle: 'bold' } // Téléphone ou première colonne en gras
        },
        margin: { top: 35 }
      });
      
      // Ajouter un pied de page avec numéros de page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        // Pied de page personnalisé
        if (pdfConfig.footerText) {
          doc.text(pdfConfig.footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
        
        // Numéro de page
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 10);
      }
      
      // Télécharger le fichier PDF
      const today = new Date();
      const dateStr = format(today, 'yyyy-MM-dd');
      
      // Créer un nom de fichier plus descriptif
      let fileName = `${type}_${dateStr}.pdf`;
      
      // Personnaliser le nom du fichier selon le type et les filtres
      if (type === "tenants" && currentFilters?.status) {
        const statusLabel = currentFilters.status === 'actif' ? 'actifs' : 'archives';
        fileName = `locataires_${statusLabel}_${dateStr}.pdf`;
      } else if (type === "maintenance" && currentFilters?.status) {
        let statusLabel = '';
        if (currentFilters.status === 'open') statusLabel = 'ouvertes';
        else if (currentFilters.status === 'in_progress') statusLabel = 'en_cours';
        else if (currentFilters.status === 'completed') statusLabel = 'terminees';
        
        fileName = `maintenance_${statusLabel}_${dateStr}.pdf`;
      }
      
      doc.save(fileName);
      
      toast({
        title: "✨ Export PDF réussi",
        description: "Le document PDF a été généré avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });
      setDropdownOpen(false);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la génération du PDF",
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
          <DropdownMenuItem onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Exporter PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              window.location.href = '/tools/pdf-exports';
              setDropdownOpen(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Personnaliser PDF
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