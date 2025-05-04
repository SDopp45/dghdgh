import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FileText, Upload, Download, Save, Trash2, Check, Settings, Building, RefreshCw, Eye, Users, DollarSign } from "lucide-react";
import { Visit } from "@/types/visits";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Checkbox } from "@/components/ui/checkbox";

// Schéma pour le formulaire de configuration
const pdfConfigSchema = z.object({
  companyName: z.string().min(1, "Le nom de l'entreprise est requis"),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().optional(),
  useLogo: z.boolean().default(true),
  logoPosition: z.enum(["left", "center", "right"]).default("left"),
  headerColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#4B70E2"),
  companyNameColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#FFFFFF"),
  companyAddressColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#646464"),
  companyPhoneColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#646464"),
  companyEmailColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#646464"),
  footerText: z.string().optional(),
  includeDateInHeader: z.boolean().default(true),
});

// Schéma pour les préférences spécifiques au type de document
const documentPreferencesSchema = z.object({
  customTitle: z.string().optional(),
  columnsToDisplay: z.array(z.string()),
  tableHeaderColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#4B70E2"),
  tableTextColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#000000"),
  tableAlternateColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#F5F5FF"),
  maxItemsPerPage: z.number().min(1).max(50).default(10)
});

// Étendre le schéma principal pour inclure les préférences par type
const extendedPdfConfigSchema = pdfConfigSchema.extend({
  documentPreferences: z.record(z.string(), documentPreferencesSchema).optional()
});

type ExtendedPDFConfigFormValues = z.infer<typeof extendedPdfConfigSchema>;

export default function PDFExportsPage() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState(true);
  const [selectedPdfType, setSelectedPdfType] = useState<string>("visits");
  const [isColorDragging, setIsColorDragging] = useState(false);
  const [configTab, setConfigTab] = useState<string>("general");
  const { toast } = useToast();

  // Référence pour le conteneur d'aperçu
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Récupérer les visites pour l'aperçu
  const { data: visits = [] } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Récupérer les locataires pour l'aperçu
  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["/api/tenants"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Récupérer les maintenances pour l'aperçu
  const { data: maintenances = [] } = useQuery<any[]>({
    queryKey: ["/api/maintenance"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Récupérer les transactions pour l'aperçu
  const { data: transactions = [] } = useQuery<{ data: any[] }, Error, any[]>({
    queryKey: ["/api/transactions"],
    select: (response) => {
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Invalid transactions data:', response);
        return [];
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Récupérer la configuration PDF enregistrée
  const { data: savedConfig, isLoading } = useQuery<ExtendedPDFConfigFormValues>({
    queryKey: ["/api/pdf-config"],
    queryFn: async () => {
      try {
        // Essayer de charger depuis le localStorage
        const config = localStorage.getItem('pdfConfig');
        if (config) {
          return JSON.parse(config);
        }
        
        // Valeurs par défaut
        return {
          companyName: "ImmoVault",
          companyAddress: "",
          companyPhone: "",
          companyEmail: "",
          useLogo: true,
          logoPosition: "left",
          headerColor: "#4B70E2",
          companyNameColor: "#FFFFFF",
          companyAddressColor: "#646464",
          companyPhoneColor: "#646464",
          companyEmailColor: "#646464",
          footerText: "Document généré par ImmoVault",
          includeDateInHeader: true,
          // Préférences par défaut pour chaque type de document
          documentPreferences: {
            visits: {
              customTitle: "Liste des visites",
              columnsToDisplay: ['visitor', 'datetime', 'type', 'property', 'status', 'email', 'phone'],
              tableHeaderColor: "#4B70E2",
              tableTextColor: "#000000",
              tableAlternateColor: "#F5F5FF",
              maxItemsPerPage: 10
            },
            tenants: {
              customTitle: "Liste des locataires",
              columnsToDisplay: ['name', 'property', 'lease_type', 'lease_start', 'lease_end', 'rent', 'status', 'email', 'phone'],
              tableHeaderColor: "#4B70E2",
              tableTextColor: "#000000",
              tableAlternateColor: "#F5F5FF",
              maxItemsPerPage: 10
            },
            maintenance: {
              customTitle: "Suivi de maintenance",
              columnsToDisplay: ['date', 'property', 'title', 'description', 'reporter', 'cost', 'priority', 'status'],
              tableHeaderColor: "#4B70E2",
              tableTextColor: "#000000",
              tableAlternateColor: "#F5F5FF",
              maxItemsPerPage: 10
            },
            transactions: {
              customTitle: "Transactions financières",
              columnsToDisplay: ['date', 'property', 'description', 'category', 'type', 'method', 'amount'],
              tableHeaderColor: "#4B70E2",
              tableTextColor: "#000000",
              tableAlternateColor: "#F5F5FF",
              maxItemsPerPage: 10
            }
          }
        };
      } catch (error) {
        console.error("Erreur lors du chargement de la configuration PDF", error);
        throw error;
      }
    },
  });

  // Formulaire avec valeurs par défaut
  const form = useForm<ExtendedPDFConfigFormValues>({
    resolver: zodResolver(extendedPdfConfigSchema),
    defaultValues: savedConfig || {
      companyName: "ImmoVault",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      useLogo: true,
      logoPosition: "left",
      headerColor: "#4B70E2",
      companyNameColor: "#FFFFFF",
      companyAddressColor: "#646464",
      companyPhoneColor: "#646464",
      companyEmailColor: "#646464",
      footerText: "Document généré par ImmoVault",
      includeDateInHeader: true,
      documentPreferences: {
        visits: {
          customTitle: "Liste des visites",
          columnsToDisplay: ['visitor', 'datetime', 'type', 'property', 'status', 'email', 'phone'],
          tableHeaderColor: "#4B70E2",
          tableTextColor: "#000000",
          tableAlternateColor: "#F5F5FF",
          maxItemsPerPage: 10
        },
        tenants: {
          customTitle: "Liste des locataires",
          columnsToDisplay: ['name', 'property', 'lease_type', 'lease_start', 'lease_end', 'rent', 'status', 'email', 'phone'],
          tableHeaderColor: "#4B70E2",
          tableTextColor: "#000000",
          tableAlternateColor: "#F5F5FF",
          maxItemsPerPage: 10
        },
        maintenance: {
          customTitle: "Suivi de maintenance",
          columnsToDisplay: ['date', 'property', 'title', 'description', 'reporter', 'cost', 'priority', 'status'],
          tableHeaderColor: "#4B70E2",
          tableTextColor: "#000000",
          tableAlternateColor: "#F5F5FF",
          maxItemsPerPage: 10
        },
        transactions: {
          customTitle: "Transactions financières",
          columnsToDisplay: ['date', 'property', 'description', 'category', 'type', 'method', 'amount'],
          tableHeaderColor: "#4B70E2",
          tableTextColor: "#000000",
          tableAlternateColor: "#F5F5FF",
          maxItemsPerPage: 10
        }
      }
    },
  });

  // Observer les changements dans le formulaire
  const watchedValues = form.watch();
  const formValueJSON = useMemo(() => {
    // Ne pas déclencher de mise à jour pendant le glissement des couleurs
    if (isColorDragging) return null;
    return JSON.stringify(watchedValues);
  }, [watchedValues, isColorDragging]);

  // Fonction utilitaire pour gérer le début et la fin du glissement de couleur
  const handleColorDragStart = () => setIsColorDragging(true);
  const handleColorDragEnd = () => {
    setIsColorDragging(false);
    // Générer un aperçu une fois le glissement terminé
    if (autoPreview) {
      setTimeout(() => generatePdfPreview(true), 100);
    }
  };

  // Mettre à jour le formulaire quand les données sont chargées
  useEffect(() => {
    if (savedConfig) {
      // Débogage pour voir ce qui est chargé
      console.log("Configuration PDF chargée:", savedConfig);
      
      // S'assurer que les valeurs columnsToDisplay sont initialisées pour tous les types
      const updatedConfig = { ...savedConfig };
      
      // Vérifier et initialiser les valeurs par défaut pour chaque type si nécessaire
      ["visits", "tenants", "maintenance", "transactions"].forEach(type => {
        if (!updatedConfig.documentPreferences) {
          updatedConfig.documentPreferences = {};
        }
        
        // Toujours sélectionner toutes les colonnes disponibles par défaut
        const allAvailableColumns = availableColumns[type as keyof typeof availableColumns].map(col => col.value);
        
        if (!updatedConfig.documentPreferences[type]) {
          updatedConfig.documentPreferences[type] = {
            customTitle: type === "visits" ? "Liste des visites" :
                         type === "tenants" ? "Liste des locataires" :
                         type === "maintenance" ? "Suivi de maintenance" : 
                         "Transactions financières",
            columnsToDisplay: allAvailableColumns,
            tableHeaderColor: updatedConfig.headerColor || "#4B70E2",
            tableTextColor: "#000000",
            tableAlternateColor: "#F5F5FF",
            maxItemsPerPage: 10
          };
        } else {
          // Correction des titres si nécessaire
          if (type === "visits" && updatedConfig.documentPreferences[type].customTitle === "Suivi de maintenance") {
            updatedConfig.documentPreferences[type].customTitle = "Liste des visites";
          } else if (type === "tenants" && updatedConfig.documentPreferences[type].customTitle === "Suivi de maintenance") {
            updatedConfig.documentPreferences[type].customTitle = "Liste des locataires";
          } else if (type === "transactions" && updatedConfig.documentPreferences[type].customTitle === "Suivi de maintenance") {
            updatedConfig.documentPreferences[type].customTitle = "Transactions financières";
          }
          
          // Remplacer columnsToDisplay par toutes les colonnes disponibles
          updatedConfig.documentPreferences[type].columnsToDisplay = allAvailableColumns;
        }
      });
      
      form.reset(updatedConfig);
      
      // Récupérer le logo du localStorage s'il existe
      const savedLogo = localStorage.getItem('pdfLogo');
      if (savedLogo) {
        setLogoPreview(savedLogo);
      }
    }
  }, [savedConfig, form]);

  // Générer automatiquement l'aperçu lorsque les valeurs du formulaire changent
  useEffect(() => {
    // Ne pas déclencher si formValueJSON est null (pendant le glissement)
    if (!formValueJSON) return;
    
    if (autoPreview) {
      // Vérifier que des données sont disponibles pour le type sélectionné
      const hasData = (
        (selectedPdfType === "visits" && visits.length > 0) ||
        (selectedPdfType === "tenants" && tenants.length > 0) ||
        (selectedPdfType === "maintenance" && maintenances.length > 0) ||
        (selectedPdfType === "transactions" && transactions.length > 0)
      );
      
      if (hasData) {
        console.log(`Scheduling preview for ${selectedPdfType}...`);
        const timer = setTimeout(() => {
          if (!isColorDragging) {  // Vérification supplémentaire
            console.log(`Generating preview for ${selectedPdfType}...`);
            generatePdfPreview(true);
          }
        }, 1500); // Augmenter le délai pour laisser le temps aux composants de se stabiliser
        
        return () => clearTimeout(timer);
      } else {
        console.log(`No data available for ${selectedPdfType}`);
      }
    }
  }, [formValueJSON, logoPreview, autoPreview, visits, tenants, maintenances, transactions, selectedPdfType, isColorDragging]);

  // Gérer le relâchement de la souris en dehors du composant
  useEffect(() => {
    if (isColorDragging) {
      const handleMouseUp = () => {
        handleColorDragEnd();
      };
      
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
      
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isColorDragging]);

  // Gérer le chargement du logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le logo ne doit pas dépasser 2 Mo",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoPreview(result);
      localStorage.setItem('pdfLogo', result);
    };
    reader.readAsDataURL(file);
  };

  // Supprimer le logo
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    localStorage.removeItem('pdfLogo');
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  // Enregistrer la configuration
  const onSubmit = (data: ExtendedPDFConfigFormValues) => {
    try {
      localStorage.setItem('pdfConfig', JSON.stringify(data));
      
      toast({
        title: "Configuration enregistrée",
        description: "Les paramètres d'export PDF ont été enregistrés avec succès",
        variant: "default",
      });
      
      // Générer un aperçu après l'enregistrement
      generatePdfPreview(true);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la configuration", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la configuration",
        variant: "destructive",
      });
    }
  };

  // Générer un PDF de test avec les données adaptées au type sélectionné
  const generatePdfPreview = (forPreview: boolean = false) => {
    // Vérification des données disponibles selon le type
    if (
      (selectedPdfType === "visits" && !visits.length) ||
      (selectedPdfType === "tenants" && !tenants.length) ||
      (selectedPdfType === "maintenance" && !maintenances.length) ||
      (selectedPdfType === "transactions" && !transactions.length)
    ) {
      toast({
        title: `Aucune donnée disponible`,
        description: `Il n'y a pas de ${
          selectedPdfType === "visits" ? "visites" : 
          selectedPdfType === "tenants" ? "locataires" : 
          selectedPdfType === "maintenance" ? "maintenance" :
          "transactions"
        } à inclure dans le PDF`,
        variant: "destructive",
      });
      return;
    }

    // Mettre à jour l'état de chargement
    setIsGeneratingPreview(true);

    try {
      const values = form.getValues();
      const doc = new jsPDF();
      
      // Appliquer la configuration commune
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Ajouter l'en-tête avec la couleur personnalisée
      doc.setFillColor(hexToRgb(values.headerColor).r, hexToRgb(values.headerColor).g, hexToRgb(values.headerColor).b);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      // Ajouter le logo si activé
      if (values.useLogo && logoPreview) {
        let xPosition = 15; // default left
        
        if (values.logoPosition === "center") {
          xPosition = pageWidth / 2 - 10;
        } else if (values.logoPosition === "right") {
          xPosition = pageWidth - 40;
        }
        
        doc.addImage(logoPreview, 'PNG', xPosition, 5, 20, 20);
      }
      
      // Ajouter le nom de l'entreprise
      doc.setTextColor(hexToRgb(values.companyNameColor).r, hexToRgb(values.companyNameColor).g, hexToRgb(values.companyNameColor).b);
      doc.setFontSize(18);
      
      // Positionner le texte en fonction du logo
      let textX = 15;
      
      if (values.useLogo && logoPreview) {
        if (values.logoPosition === "left") {
          textX = 40;
        } else if (values.logoPosition === "center") {
          textX = 15;
        }
      }
      
      doc.text(values.companyName, textX, 16);
      
      // Ajouter la date si activé
      if (values.includeDateInHeader) {
        doc.setFontSize(10);
        const today = new Date();
        const dateStr = format(today, 'dd MMMM yyyy', { locale: fr });
        doc.text(`Généré le ${dateStr}`, pageWidth - 60, 10);
      }
      
      // Titre du document selon le type sélectionné
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      
      // Déterminer le titre par défaut selon le type
      let documentTitle = "Document";
      switch (selectedPdfType) {
        case "visits":
          documentTitle = "Liste des visites";
          break;
        case "tenants":
          documentTitle = "Liste des locataires";
          break;
        case "maintenance":
          documentTitle = "Suivi de maintenance";
          break;
        case "transactions":
          documentTitle = "Transactions";
          break;
        default:
          documentTitle = "Document";
      }
      
      // Vérifier si un titre personnalisé est défini pour ce type
      const typePrefs = values.documentPreferences?.[selectedPdfType];
      const hasCustomTitle = typePrefs && typePrefs.customTitle && typePrefs.customTitle.trim() !== '';
      
      // Afficher le titre approprié (personnalisé ou par défaut)
      if (hasCustomTitle && typePrefs) {
        doc.text(typePrefs.customTitle, 15, 40);
      } else {
        doc.text(documentTitle, 15, 40);
      }
      
      // Information de la société sous le titre
      if (values.companyAddress || values.companyPhone || values.companyEmail) {
        doc.setFontSize(9);
        let yPos = 45;
        
        if (values.companyAddress) {
          doc.setTextColor(hexToRgb(values.companyAddressColor).r, hexToRgb(values.companyAddressColor).g, hexToRgb(values.companyAddressColor).b);
          doc.text(values.companyAddress, 15, yPos);
          yPos += 5;
        }
        
        if (values.companyPhone) {
          doc.setTextColor(hexToRgb(values.companyPhoneColor).r, hexToRgb(values.companyPhoneColor).g, hexToRgb(values.companyPhoneColor).b);
          doc.text(`Tél: ${values.companyPhone}`, 15, yPos);
          yPos += 5;
        }
        
        if (values.companyEmail) {
          doc.setTextColor(hexToRgb(values.companyEmailColor).r, hexToRgb(values.companyEmailColor).g, hexToRgb(values.companyEmailColor).b);
          doc.text(`Email: ${values.companyEmail}`, 15, yPos);
          yPos += 5;
        }
      }
      
      // Contenu spécifique au type de document
      switch (selectedPdfType) {
        case "visits":
          generateVisitsTable(doc, values.documentPreferences?.visits);
          break;
        case "tenants":
          generateTenantsTable(doc, values.documentPreferences?.tenants);
          break;
        case "maintenance":
          generateMaintenanceTable(doc, values.documentPreferences?.maintenance);
          break;
        case "transactions":
          generateTransactionsTable(doc, values.documentPreferences?.transactions);
          break;
        default:
          // Table par défaut avec message
          autoTable(doc, {
            startY: 60,
            head: [["Type de document", "Description"]],
            body: [["", "Sélectionnez un type de document pour voir l'aperçu"]],
            headStyles: { 
              fillColor: hexToRgb(values.headerColor).array as [number, number, number],
              textColor: [255, 255, 255] as [number, number, number] 
            },
          });
      }
      
      // Ajouter un pied de page avec numéros de page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        // Pied de page personnalisé
        if (values.footerText) {
          doc.text(values.footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
        
        // Numéro de page
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 10);
      }
      
      if (forPreview) {
        try {
          // Générer une URL pour l'aperçu
          const pdfBlob = doc.output('blob');
          
          // Libérer l'ancienne URL si elle existe
          if (pdfPreviewUrl) {
            try {
              URL.revokeObjectURL(pdfPreviewUrl);
            } catch (error) {
              console.error("Erreur lors de la libération de l'URL précédente:", error);
            }
          }
          
          // Créer une nouvelle URL
          const url = URL.createObjectURL(pdfBlob);
          console.log("Nouvelle URL d'aperçu générée:", url);
          setPdfPreviewUrl(url);
        } catch (error) {
          console.error("Erreur lors de la création de l'URL d'aperçu:", error);
          toast({
            title: "Erreur d'aperçu",
            description: "Impossible de générer l'aperçu du PDF",
            variant: "destructive",
          });
        }
      } else {
        // Télécharger le fichier PDF
        doc.save(`${documentTitle.toLowerCase().replace(/ /g, '_')}_apercu.pdf`);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      if (!forPreview) {
        toast({
          title: "Erreur",
          description: "Impossible de générer le PDF d'aperçu",
          variant: "destructive",
        });
      }
    } finally {
      // Réinitialiser l'état de chargement dans tous les cas
      setIsGeneratingPreview(false);
    }
  };

  // Générer le tableau de visites
  const generateVisitsTable = (doc: jsPDF, prefs?: any) => {
    if (!visits.length) return;
    
    const values = form.getValues();
    const preferences = prefs || {
      customTitle: "Liste des visites",
      columnsToDisplay: ['visitor', 'datetime', 'type', 'property', 'status', 'email', 'phone'],
      tableHeaderColor: values.headerColor,
      tableTextColor: "#000000",
      tableAlternateColor: "#F5F5FF",
      maxItemsPerPage: 10
    };
    
    // Note: Le titre est maintenant géré uniquement par la fonction principale generatePdfPreview
    // pour éviter la superposition des titres
    
    // Convertir les données pour autoTable
    const tableData = visits.slice(0, preferences.maxItemsPerPage || 10).map(visit => [
      `${visit.firstName} ${visit.lastName}`,
      format(new Date(visit.datetime), 'dd/MM/yyyy HH:mm', { locale: fr }),
      visit.visitType === "physical" ? "En personne" : 
      visit.visitType === "virtual" ? "Virtuelle" : 
      visit.visitType === "video" ? "Vidéo" : visit.visitType,
      visit.property?.name || visit.manualAddress || '-',
      visit.status === "pending" ? "En attente" :
      visit.status === "completed" ? "Terminée" :
      visit.status === "cancelled" ? "Annulée" :
      visit.status === "no_show" ? "Absent" : visit.status,
      visit.email,
      visit.phone || '-'
    ]);
    
    // Définir les colonnes disponibles
    const allColumns = [
      { header: 'Visiteur', dataKey: 'visitor' },
      { header: 'Date & Heure', dataKey: 'datetime' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Bien', dataKey: 'property' },
      { header: 'Statut', dataKey: 'status' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Téléphone', dataKey: 'phone' }
    ];
    
    // Filtrer les colonnes selon les préférences
    const selectedColumns = allColumns.filter(col => 
      preferences.columnsToDisplay.includes(col.dataKey)
    );
    
    // Créer le tableau
    autoTable(doc, {
      head: [selectedColumns.map(col => col.header)],
      body: tableData.map(row => {
        // Filtrer les données selon les colonnes sélectionnées
        const columnIndices = selectedColumns.map(col => allColumns.findIndex(c => c.dataKey === col.dataKey));
        return columnIndices.map(index => row[index]);
      }),
      startY: 60,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: hexToRgb(preferences.tableHeaderColor || values.headerColor).array as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number]
      },
      alternateRowStyles: { 
        fillColor: hexToRgb(preferences.tableAlternateColor || "#F5F5FF").array as [number, number, number] 
      },
      margin: { top: 35 }
    });
  };

  // Générer le tableau des locataires
  const generateTenantsTable = (doc: jsPDF, prefs?: any) => {
    if (!tenants.length) return;
    
    const values = form.getValues();
    const preferences = prefs || {
      customTitle: "Liste des locataires",
      columnsToDisplay: ['name', 'property', 'lease_type', 'lease_start', 'lease_end', 'rent', 'status', 'email', 'phone'],
      tableHeaderColor: values.headerColor,
      tableTextColor: "#000000",
      tableAlternateColor: "#F5F5FF",
      maxItemsPerPage: 10
    };
    
    // Note: Le titre est maintenant géré uniquement par la fonction principale generatePdfPreview
    // pour éviter la superposition des titres
    
    // Convertir les données réelles pour autoTable
    const tableData = tenants.slice(0, preferences.maxItemsPerPage || 10).map((tenant: any) => [
      tenant.user?.fullName || `${tenant.firstName || ''} ${tenant.lastName || ''}`,
      tenant.property?.name || tenant.property?.address || '-',
      tenant.leaseType ? (
        tenant.leaseType === "bail_meuble" ? "Meublé" :
        tenant.leaseType === "bail_vide" ? "Vide" :
        tenant.leaseType === "bail_mobilite" ? "Mobilité" :
        tenant.leaseType === "bail_professionnel" ? "Professionnel" :
        tenant.leaseType
      ) : '-',
      tenant.leaseStart ? format(new Date(tenant.leaseStart), 'dd/MM/yyyy', { locale: fr }) : '-',
      tenant.leaseEnd ? format(new Date(tenant.leaseEnd), 'dd/MM/yyyy', { locale: fr }) : '-',
      tenant.rentAmount ? `${tenant.rentAmount} €` : '-',
      tenant.leaseStatus === "actif" ? "Actif" : 
      tenant.leaseStatus === "fini" ? "Résilié" : 
      tenant.leaseStatus || '-',
      tenant.user?.email || tenant.email || '-',
      tenant.user?.phoneNumber || tenant.phoneNumber || '-'
    ]);
    
    // Définir les colonnes disponibles
    const allColumns = [
      { header: 'Locataire', dataKey: 'name' },
      { header: 'Propriété', dataKey: 'property' },
      { header: 'Type de bail', dataKey: 'lease_type' },
      { header: 'Début bail', dataKey: 'lease_start' },
      { header: 'Fin bail', dataKey: 'lease_end' },
      { header: 'Loyer', dataKey: 'rent' },
      { header: 'Statut', dataKey: 'status' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Téléphone', dataKey: 'phone' }
    ];
    
    // Filtrer les colonnes selon les préférences
    const selectedColumns = allColumns.filter(col => 
      preferences.columnsToDisplay.includes(col.dataKey)
    );
    
    // Créer le tableau
    autoTable(doc, {
      head: [selectedColumns.map(col => col.header)],
      body: tableData.map(row => {
        // Filtrer les données selon les colonnes sélectionnées
        const columnIndices = selectedColumns.map(col => allColumns.findIndex(c => c.dataKey === col.dataKey));
        return columnIndices.map(index => row[index]);
      }),
      startY: 60,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: hexToRgb(preferences.tableHeaderColor || values.headerColor).array as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number]
      },
      alternateRowStyles: { 
        fillColor: hexToRgb(preferences.tableAlternateColor || "#F5F5FF").array as [number, number, number] 
      },
      margin: { top: 35 }
    });
  };
  
  // Générer le tableau de maintenance
  const generateMaintenanceTable = (doc: jsPDF, prefs?: any) => {
    if (!maintenances.length) return;
    
    const values = form.getValues();
    const preferences = prefs || {
      customTitle: "Suivi de maintenance",
      columnsToDisplay: ['date', 'property', 'title', 'description', 'reporter', 'cost', 'priority', 'status'],
      tableHeaderColor: values.headerColor,
      tableTextColor: "#000000",
      tableAlternateColor: "#F5F5FF",
      maxItemsPerPage: 10
    };
    
    // Note: Le titre est maintenant géré uniquement par la fonction principale generatePdfPreview
    // pour éviter la superposition des titres
    
    // Convertir les données pour autoTable
    const tableData = maintenances.slice(0, preferences.maxItemsPerPage || 10).map((maintenance: any) => [
      format(new Date(maintenance.reportDate), 'dd/MM/yyyy'),
      maintenance.property?.name || '-',
      maintenance.title || '-',
      maintenance.description || '-',
      maintenance.reportedBy?.fullName || '-',
      maintenance.cost ? `${maintenance.cost} €` : '-',
      maintenance.priority === "low" ? "Basse" :
      maintenance.priority === "medium" ? "Moyenne" :
      maintenance.priority === "high" ? "Haute" :
      maintenance.priority === "urgent" ? "Urgente" : maintenance.priority || '-',
      maintenance.status === "pending" ? "En attente" :
      maintenance.status === "in_progress" ? "En cours" :
      maintenance.status === "completed" ? "Terminé" :
      maintenance.status === "cancelled" ? "Annulé" : maintenance.status || '-'
    ]);
    
    // Définir les colonnes disponibles
    const allColumns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Propriété', dataKey: 'property' },
      { header: 'Titre', dataKey: 'title' },
      { header: 'Description', dataKey: 'description' },
      { header: 'Signalé par', dataKey: 'reporter' },
      { header: 'Coût', dataKey: 'cost' },
      { header: 'Priorité', dataKey: 'priority' },
      { header: 'Statut', dataKey: 'status' }
    ];
    
    // Filtrer les colonnes selon les préférences
    const selectedColumns = allColumns.filter(col => 
      preferences.columnsToDisplay.includes(col.dataKey)
    );
    
    // Créer le tableau
    autoTable(doc, {
      head: [selectedColumns.map(col => col.header)],
      body: tableData.map(row => {
        // Filtrer les données selon les colonnes sélectionnées
        const columnIndices = selectedColumns.map(col => allColumns.findIndex(c => c.dataKey === col.dataKey));
        return columnIndices.map(index => row[index]);
      }),
      startY: 60,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: hexToRgb(preferences.tableHeaderColor || values.headerColor).array as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number]
      },
      alternateRowStyles: { 
        fillColor: hexToRgb(preferences.tableAlternateColor || "#F5F5FF").array as [number, number, number] 
      },
      margin: { top: 35 }
    });
  };

  // Générer le tableau des transactions
  const generateTransactionsTable = (doc: jsPDF, prefs?: any) => {
    if (!transactions.length) return;
    
    const values = form.getValues();
    const preferences = prefs || {
      customTitle: "Transactions financières",
      columnsToDisplay: ['date', 'property', 'description', 'category', 'type', 'method', 'amount'],
      tableHeaderColor: values.headerColor,
      tableTextColor: "#000000",
      tableAlternateColor: "#F5F5FF",
      maxItemsPerPage: 10
    };
    
    // Note: Le titre est maintenant géré uniquement par la fonction principale generatePdfPreview
    // pour éviter la superposition des titres
    
    // Convertir les données pour autoTable
    const tableData = transactions.slice(0, preferences.maxItemsPerPage || 10).map((transaction: any) => {
      // S'assurer que la date est bien formatée
      const transactionDate = transaction.date ? new Date(transaction.date) : new Date();
      const formattedDate = format(transactionDate, 'dd/MM/yyyy');
      
      // Formater le montant avec Intl.NumberFormat
      const amount = typeof transaction.amount === 'number' 
        ? transaction.amount 
        : parseFloat(transaction.amount || '0');
      const formattedAmount = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
      
      return [
        formattedDate,
        transaction.property?.name || transaction.propertyName || '-',
        transaction.description || '-',
        transaction.category || '-',
        transaction.type === 'income' ? 'Revenu' : 
        transaction.type === 'expense' ? 'Dépense' : 
        transaction.type === 'credit' ? 'Crédit' : transaction.type || '-',
        transaction.paymentMethod || '-',
        formattedAmount
      ];
    });
    
    // Définir les colonnes disponibles
    const allColumns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Propriété', dataKey: 'property' },
      { header: 'Description', dataKey: 'description' },
      { header: 'Catégorie', dataKey: 'category' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Méthode', dataKey: 'method' },
      { header: 'Montant', dataKey: 'amount' }
    ];
    
    // Filtrer les colonnes selon les préférences
    const selectedColumns = allColumns.filter(col => 
      preferences.columnsToDisplay.includes(col.dataKey)
    );
    
    // Créer le tableau
    autoTable(doc, {
      head: [selectedColumns.map(col => col.header)],
      body: tableData.map(row => {
        // Filtrer les données selon les colonnes sélectionnées
        const columnIndices = selectedColumns.map(col => allColumns.findIndex(c => c.dataKey === col.dataKey));
        return columnIndices.map(index => row[index]);
      }),
      startY: 60,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: hexToRgb(preferences.tableHeaderColor || values.headerColor).array as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number]
      },
      alternateRowStyles: { 
        fillColor: hexToRgb(preferences.tableAlternateColor || "#F5F5FF").array as [number, number, number] 
      },
      margin: { top: 35 }
    });
  };

  // Convertir couleur hex en RGB
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

  // Type de PDF et options disponibles
  const pdfTypes = [
    { id: "visits", label: "Visites", icon: Building },
    { id: "tenants", label: "Locataires", icon: Users },
    { id: "maintenance", label: "Maintenance", icon: RefreshCw },
    { id: "transactions", label: "Transactions", icon: DollarSign },
  ];

  // Configurations disponibles par type de document
  const availableColumns = {
    visits: [
      { value: 'visitor', label: 'Visiteur' },
      { value: 'datetime', label: 'Date & Heure' },
      { value: 'type', label: 'Type' },
      { value: 'property', label: 'Bien' },
      { value: 'status', label: 'Statut' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Téléphone' }
    ],
    tenants: [
      { value: 'name', label: 'Locataire' },
      { value: 'property', label: 'Propriété' },
      { value: 'lease_type', label: 'Type de bail' },
      { value: 'lease_start', label: 'Début bail' },
      { value: 'lease_end', label: 'Fin bail' },
      { value: 'rent', label: 'Loyer' },
      { value: 'status', label: 'Statut' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Téléphone' }
    ],
    maintenance: [
      { value: 'date', label: 'Date' },
      { value: 'property', label: 'Propriété' },
      { value: 'title', label: 'Titre' },
      { value: 'description', label: 'Description' },
      { value: 'reporter', label: 'Signalé par' },
      { value: 'cost', label: 'Coût' },
      { value: 'priority', label: 'Priorité' },
      { value: 'status', label: 'Statut' }
    ],
    transactions: [
      { value: 'date', label: 'Date' },
      { value: 'property', label: 'Propriété' },
      { value: 'description', label: 'Description' },
      { value: 'category', label: 'Catégorie' },
      { value: 'type', label: 'Type' },
      { value: 'method', label: 'Méthode' },
      { value: 'amount', label: 'Montant' }
    ]
  };

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <div className="flex flex-col gap-4 p-8">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-4 w-96 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-96 w-full bg-gray-200 animate-pulse rounded-lg mt-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mb-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Personnalisation des PDF</h1>
          <p className="text-muted-foreground">
            Visualisez et personnalisez l'apparence de vos documents exportés
          </p>
        </div>
      </div>

      {/* Sélecteur de type de PDF */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sélectionnez un type de document</CardTitle>
          <CardDescription>Choisissez le type de PDF que vous souhaitez personnaliser</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {pdfTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.id}
                  variant={selectedPdfType === type.id ? "default" : "outline"}
                  className={cn(
                    "flex flex-col h-24 items-center justify-center gap-2 text-xs font-normal",
                    selectedPdfType === type.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setSelectedPdfType(type.id);
                    // Revenir automatiquement à l'onglet Configuration générale
                    setConfigTab("general");
                  }}
                >
                  <Icon className="h-8 w-8" />
                  <span>{type.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulaire de personnalisation */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres d'exportation
              </CardTitle>
              <CardDescription>
                Personnalisez l'apparence de vos documents PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Tabs pour les différentes sections de configuration */}
                  <Tabs value={configTab} onValueChange={setConfigTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general">Configuration générale</TabsTrigger>
                      <TabsTrigger value="advanced">Configuration avancée</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="space-y-4 mt-4">
                      {/* Configuration générale existante */}
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom de l'entreprise</FormLabel>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input {...field} placeholder="Votre entreprise" />
                              </FormControl>
                              <FormField
                                control={form.control}
                                name="companyNameColor"
                                render={({ field: colorField }) => (
                                  <FormControl>
                                    <div className="flex items-center">
                                      <div 
                                        className="h-6 w-6 rounded border mr-1"
                                        style={{ backgroundColor: colorField.value }}
                                      />
                                      <Input
                                        type="color"
                                        {...colorField}
                                        className="w-8 p-0 h-6"
                                        onMouseDown={handleColorDragStart}
                                        onMouseUp={handleColorDragEnd}
                                        onTouchStart={handleColorDragStart}
                                        onTouchEnd={handleColorDragEnd}
                                      />
                                    </div>
                                  </FormControl>
                                )}
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="companyAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Adresse</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Input {...field} placeholder="123 rue des Exemples, 75000 Paris" />
                                </FormControl>
                                <FormField
                                  control={form.control}
                                  name="companyAddressColor"
                                  render={({ field: colorField }) => (
                                    <FormControl>
                                      <div className="flex items-center">
                                        <div 
                                          className="h-6 w-6 rounded border mr-1"
                                          style={{ backgroundColor: colorField.value }}
                                        />
                                        <Input
                                          type="color"
                                          {...colorField}
                                          className="w-8 p-0 h-6"
                                          onMouseDown={handleColorDragStart}
                                          onMouseUp={handleColorDragEnd}
                                          onTouchStart={handleColorDragStart}
                                          onTouchEnd={handleColorDragEnd}
                                        />
                                      </div>
                                    </FormControl>
                                  )}
                                />
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="companyPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Téléphone</FormLabel>
                                <div className="flex items-center gap-2">
                                  <FormControl>
                                    <Input {...field} placeholder="01 23 45 67 89" />
                                  </FormControl>
                                  <FormField
                                    control={form.control}
                                    name="companyPhoneColor"
                                    render={({ field: colorField }) => (
                                      <FormControl>
                                        <div className="flex items-center">
                                          <div 
                                            className="h-6 w-6 rounded border mr-1"
                                            style={{ backgroundColor: colorField.value }}
                                          />
                                          <Input
                                            type="color"
                                            {...colorField}
                                            className="w-8 p-0 h-6"
                                            onMouseDown={handleColorDragStart}
                                            onMouseUp={handleColorDragEnd}
                                            onTouchStart={handleColorDragStart}
                                            onTouchEnd={handleColorDragEnd}
                                          />
                                        </div>
                                      </FormControl>
                                    )}
                                  />
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="companyEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <div className="flex items-center gap-2">
                                  <FormControl>
                                    <Input {...field} placeholder="contact@entreprise.com" />
                                  </FormControl>
                                  <FormField
                                    control={form.control}
                                    name="companyEmailColor"
                                    render={({ field: colorField }) => (
                                      <FormControl>
                                        <div className="flex items-center">
                                          <div 
                                            className="h-6 w-6 rounded border mr-1"
                                            style={{ backgroundColor: colorField.value }}
                                          />
                                          <Input
                                            type="color"
                                            {...colorField}
                                            className="w-8 p-0 h-6"
                                            onMouseDown={handleColorDragStart}
                                            onMouseUp={handleColorDragEnd}
                                            onTouchStart={handleColorDragStart}
                                            onTouchEnd={handleColorDragEnd}
                                          />
                                        </div>
                                      </FormControl>
                                    )}
                                  />
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Separator className="my-2" />
                      
                      <FormField
                        control={form.control}
                        name="headerColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Couleur d'accentuation</FormLabel>
                            <div className="flex gap-2 items-center">
                              <div 
                                className="h-8 w-8 rounded-md border"
                                style={{ backgroundColor: field.value }}
                              />
                              <FormControl>
                                <Input
                                  type="color"
                                  {...field}
                                  className="w-12 p-1 h-8"
                                  onMouseDown={handleColorDragStart}
                                  onMouseUp={handleColorDragEnd}
                                  onTouchStart={handleColorDragStart}
                                  onTouchEnd={handleColorDragEnd}
                                />
                              </FormControl>
                              <Input
                                type="text"
                                value={field.value}
                                onChange={(e) => {
                                  handleColorDragStart();
                                  field.onChange(e);
                                  setTimeout(handleColorDragEnd, 500);
                                }}
                                className="w-32"
                              />
                            </div>
                            <FormDescription>
                              Couleur utilisée pour les en-têtes et titres
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col gap-3">
                        <FormField
                          control={form.control}
                          name="useLogo"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Logo de l'entreprise</FormLabel>
                                <FormDescription>
                                  Ajouter votre logo dans les documents PDF
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {form.watch("useLogo") && (
                          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center">
                              <Label>Télécharger un logo</Label>
                              {logoPreview && (
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={handleRemoveLogo}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Supprimer
                                </Button>
                              )}
                            </div>
                            
                            <div className="flex gap-4 items-center">
                              <div className="h-20 w-20 rounded-lg border flex items-center justify-center bg-white">
                                {logoPreview ? (
                                  <img 
                                    src={logoPreview} 
                                    alt="Logo preview" 
                                    className="max-h-16 max-w-16 object-contain" 
                                  />
                                ) : (
                                  <Upload className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              
                              <div className="flex-1">
                                <Input
                                  type="file"
                                  accept="image/png,image/jpeg,image/svg+xml"
                                  onChange={handleLogoUpload}
                                  ref={logoInputRef}
                                  className="cursor-pointer"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  PNG, JPG ou SVG. 2 Mo maximum.
                                </p>
                              </div>
                            </div>

                            <FormField
                              control={form.control}
                              name="logoPosition"
                              render={({ field }) => (
                                <FormItem className="space-y-2">
                                  <FormLabel>Position du logo</FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      className="flex space-x-1"
                                    >
                                      <FormItem className="flex items-center space-x-1 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="left" />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer text-sm font-normal">
                                          Gauche
                                        </FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-1 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="center" />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer text-sm font-normal">
                                          Centre
                                        </FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-1 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="right" />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer text-sm font-normal">
                                          Droite
                                        </FormLabel>
                                      </FormItem>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>

                      <Separator className="my-2" />

                      <FormField
                        control={form.control}
                        name="includeDateInHeader"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Date de génération</FormLabel>
                              <FormDescription>
                                Inclure la date de génération dans l'en-tête
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="footerText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Texte de pied de page</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Document généré par ImmoVault"
                              />
                            </FormControl>
                            <FormDescription>
                              Ce texte sera affiché en bas de chaque page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Aperçu automatique</FormLabel>
                          <FormDescription>
                            Mettre à jour l'aperçu à chaque modification
                          </FormDescription>
                        </div>
                        <Switch
                          checked={autoPreview}
                          onCheckedChange={setAutoPreview}
                        />
                      </FormItem>
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-4 mt-4">
                      {/* Configuration avancée par type de document */}
                      <div className="bg-muted/50 p-4 rounded-lg mb-4">
                        <p className="text-sm font-medium mb-1">Configuration avancée pour: {
                          selectedPdfType === "visits" ? "Visites" :
                          selectedPdfType === "tenants" ? "Locataires" :
                          selectedPdfType === "maintenance" ? "Maintenance" :
                          "Transactions"
                        }</p>
                        <p className="text-xs text-muted-foreground">
                          Ces paramètres s'appliquent uniquement aux exports de {
                            selectedPdfType === "visits" ? "visites" :
                            selectedPdfType === "tenants" ? "locataires" :
                            selectedPdfType === "maintenance" ? "maintenance" :
                            "transactions"
                          }
                        </p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`documentPreferences.${selectedPdfType}.customTitle`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Titre personnalisé</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder={
                                  selectedPdfType === "visits" ? "Liste des visites" :
                                  selectedPdfType === "tenants" ? "Liste des locataires" :
                                  selectedPdfType === "maintenance" ? "Suivi de maintenance" :
                                  "Transactions financières"
                                }
                              />
                            </FormControl>
                            <FormDescription>
                              Ce titre remplacera le titre par défaut du document
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`documentPreferences.${selectedPdfType}.columnsToDisplay`}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Colonnes à afficher</FormLabel>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    // S'assurer que le tableau est initialisé avant d'utiliser map
                                    const columnsToSelect = availableColumns[selectedPdfType as keyof typeof availableColumns].map(col => col.value);
                                    form.setValue(`documentPreferences.${selectedPdfType}.columnsToDisplay`, columnsToSelect);
                                  }}
                                >
                                  Tout sélectionner
                                </Button>
                              </div>
                              <FormDescription>
                                Sélectionnez les colonnes à inclure dans l'export PDF (toutes sélectionnées par défaut)
                              </FormDescription>
                              <FormControl>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                                  {availableColumns[selectedPdfType as keyof typeof availableColumns].map(column => (
                                    <div key={column.value} className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={`col-${selectedPdfType}-${column.value}`}
                                        checked={field.value?.includes(column.value)}
                                        onCheckedChange={(checked) => {
                                          // Initialiser un tableau vide si field.value est undefined
                                          const currentValues = Array.isArray(field.value) ? field.value : [];
                                          if (checked) {
                                            form.setValue(`documentPreferences.${selectedPdfType}.columnsToDisplay`, 
                                              [...currentValues, column.value]);
                                          } else {
                                            form.setValue(`documentPreferences.${selectedPdfType}.columnsToDisplay`, 
                                              currentValues.filter(v => v !== column.value));
                                          }
                                        }}
                                      />
                                      <Label 
                                        htmlFor={`col-${selectedPdfType}-${column.value}`} 
                                        className="text-sm cursor-pointer"
                                      >
                                        {column.label}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`documentPreferences.${selectedPdfType}.tableHeaderColor`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Couleur d'en-tête du tableau</FormLabel>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-6 w-6 rounded border"
                                  style={{ backgroundColor: field.value }}
                                />
                                <FormControl>
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-10 p-0 h-8"
                                    onMouseDown={handleColorDragStart}
                                    onMouseUp={handleColorDragEnd}
                                    onTouchStart={handleColorDragStart}
                                    onTouchEnd={handleColorDragEnd}
                                  />
                                </FormControl>
                                <Input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => {
                                    handleColorDragStart();
                                    field.onChange(e);
                                    setTimeout(handleColorDragEnd, 500);
                                  }}
                                  className="w-24"
                                />
                              </div>
                              <FormDescription>
                                Couleur des en-têtes de colonnes
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`documentPreferences.${selectedPdfType}.tableAlternateColor`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Couleur alternée des lignes</FormLabel>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-6 w-6 rounded border"
                                  style={{ backgroundColor: field.value }}
                                />
                                <FormControl>
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-10 p-0 h-8"
                                    onMouseDown={handleColorDragStart}
                                    onMouseUp={handleColorDragEnd}
                                    onTouchStart={handleColorDragStart}
                                    onTouchEnd={handleColorDragEnd}
                                  />
                                </FormControl>
                                <Input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => {
                                    handleColorDragStart();
                                    field.onChange(e);
                                    setTimeout(handleColorDragEnd, 500);
                                  }}
                                  className="w-24"
                                />
                              </div>
                              <FormDescription>
                                Couleur de fond alternée pour les lignes du tableau
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`documentPreferences.${selectedPdfType}.maxItemsPerPage`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Éléments par page</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                min={1}
                                max={50}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Nombre maximum d'éléments à afficher sur une page du PDF
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2 justify-between">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                        size="sm"
                      >
                        Réinitialiser
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          // Supprimer complètement la configuration du localStorage
                          localStorage.removeItem('pdfConfig');
                          localStorage.removeItem('pdfLogo');
                          
                          toast({
                            title: "Configuration supprimée",
                            description: "Toutes les préférences d'export PDF ont été réinitialisées",
                            variant: "default",
                          });
                          
                          // Recharger la page pour appliquer les valeurs par défaut
                          window.location.reload();
                        }}
                        size="sm"
                      >
                        Réinitialiser complètement
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      {!autoPreview && (
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => generatePdfPreview(true)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Actualiser l'aperçu
                        </Button>
                      )}
                      
                      <Button type="submit">
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Aperçu du PDF */}
        <div className="lg:col-span-7 sticky top-20" ref={previewContainerRef}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Aperçu du document
              </CardTitle>
              <CardDescription>
                {pdfTypes.find(t => t.id === selectedPdfType)?.label || "Document"} - 
                Visualisation en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent className="relative" style={{ minHeight: '700px' }}>
              {pdfPreviewUrl ? (
                <div className="w-full h-[700px] rounded-md overflow-hidden border shadow-sm">
                  <iframe
                    src={pdfPreviewUrl}
                    title="PDF Preview"
                    width="100%"
                    height="100%"
                    className="border-0"
                  />
                </div>
              ) : (
                <div className="w-full h-[700px] flex items-center justify-center bg-gray-50 rounded-md border">
                  <div className="text-center">
                    {isGeneratingPreview ? (
                      <>
                        <div className="h-16 w-16 mx-auto mb-4 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        <p className="text-muted-foreground">Génération de l'aperçu en cours...</p>
                      </>
                    ) : (
                      <>
                        <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <p className="text-muted-foreground">
                          {(selectedPdfType === "visits" && visits.length === 0) || 
                           (selectedPdfType === "tenants" && tenants.length === 0) ||
                           (selectedPdfType === "maintenance" && maintenances.length === 0) ||
                           (selectedPdfType === "transactions" && transactions.length === 0)
                            ? `Aucune donnée de ${
                                selectedPdfType === "visits" ? "visites" : 
                                selectedPdfType === "tenants" ? "locataires" : 
                                selectedPdfType === "maintenance" ? "maintenance" :
                                "transactions"
                              } disponible pour générer un aperçu`
                            : "Cliquez sur 'Actualiser l'aperçu' pour générer une prévisualisation"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 