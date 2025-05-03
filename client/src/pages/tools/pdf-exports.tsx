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
import { FileText, Upload, Download, Save, Trash2, Check, Settings, Building, RefreshCw, Eye, Users } from "lucide-react";
import { Visit } from "@/types/visits";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Schéma pour le formulaire de configuration
const pdfConfigSchema = z.object({
  companyName: z.string().min(1, "Le nom de l'entreprise est requis"),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().optional(),
  useLogo: z.boolean().default(true),
  logoPosition: z.enum(["left", "center", "right"]).default("left"),
  headerColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Couleur hexadécimale invalide").default("#4B70E2"),
  footerText: z.string().optional(),
  includeDateInHeader: z.boolean().default(true),
});

type PDFConfigFormValues = z.infer<typeof pdfConfigSchema>;

export default function PDFExportsPage() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState(true);
  const [selectedPdfType, setSelectedPdfType] = useState<string>("visits");
  const { toast } = useToast();

  // Référence pour le conteneur d'aperçu
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Récupérer les visites pour l'aperçu
  const { data: visits = [] } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Récupérer la configuration PDF enregistrée
  const { data: savedConfig, isLoading } = useQuery<PDFConfigFormValues>({
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
          footerText: "Document généré par ImmoVault",
          includeDateInHeader: true,
        };
      } catch (error) {
        console.error("Erreur lors du chargement de la configuration PDF", error);
        throw error;
      }
    },
  });

  // Formulaire avec valeurs par défaut
  const form = useForm<PDFConfigFormValues>({
    resolver: zodResolver(pdfConfigSchema),
    defaultValues: savedConfig || {
      companyName: "ImmoVault",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      useLogo: true,
      logoPosition: "left",
      headerColor: "#4B70E2",
      footerText: "Document généré par ImmoVault",
      includeDateInHeader: true,
    },
  });

  // Observer les changements dans le formulaire
  const watchedValues = form.watch();
  const formValueJSON = useMemo(() => JSON.stringify(watchedValues), [watchedValues]);

  // Mettre à jour le formulaire quand les données sont chargées
  useEffect(() => {
    if (savedConfig) {
      form.reset(savedConfig);
      
      // Récupérer le logo du localStorage s'il existe
      const savedLogo = localStorage.getItem('pdfLogo');
      if (savedLogo) {
        setLogoPreview(savedLogo);
      }
    }
  }, [savedConfig, form]);

  // Générer automatiquement l'aperçu lorsque les valeurs du formulaire changent
  useEffect(() => {
    if (autoPreview && visits.length > 0) {
      const timer = setTimeout(() => {
        generatePdfPreview(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [formValueJSON, logoPreview, autoPreview, visits, selectedPdfType]);

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
  const onSubmit = (data: PDFConfigFormValues) => {
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
    if (selectedPdfType === "visits" && !visits.length) {
      toast({
        title: "Aucune visite disponible",
        description: "Il n'y a pas de visites à inclure dans le PDF",
        variant: "destructive",
      });
      return;
    }

    if (!forPreview) {
      setIsGeneratingPreview(true);
    }

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
      doc.setTextColor(255, 255, 255);
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
      
      let documentTitle = "Document";
      switch (selectedPdfType) {
        case "visits":
          documentTitle = "Liste des visites";
          break;
        case "tenants":
          documentTitle = "Liste des locataires";
          break;
        default:
          documentTitle = "Document";
      }
      
      doc.text(documentTitle, 15, 40);
      
      // Information de la société sous le titre
      if (values.companyAddress || values.companyPhone || values.companyEmail) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        let yPos = 45;
        
        if (values.companyAddress) {
          doc.text(values.companyAddress, 15, yPos);
          yPos += 5;
        }
        
        if (values.companyPhone) {
          doc.text(`Tél: ${values.companyPhone}`, 15, yPos);
          yPos += 5;
        }
        
        if (values.companyEmail) {
          doc.text(`Email: ${values.companyEmail}`, 15, yPos);
          yPos += 5;
        }
      }
      
      // Contenu spécifique au type de document
      switch (selectedPdfType) {
        case "visits":
          generateVisitsTable(doc);
          break;
        case "tenants":
          generateTenantsTable(doc);
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
        // Générer une URL pour l'aperçu
        const pdfBlob = doc.output('blob');
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
        }
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
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
      if (!forPreview) {
        setIsGeneratingPreview(false);
      }
    }
  };

  // Générer le tableau de visites
  const generateVisitsTable = (doc: jsPDF) => {
    if (!visits.length) return;
    
    const values = form.getValues();
    
    // Convertir les données pour autoTable
    const tableData = visits.slice(0, 10).map(visit => [
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
    
    // Définir les colonnes
    const tableColumns = [
      { header: 'Visiteur', dataKey: 'visitor' },
      { header: 'Date & Heure', dataKey: 'datetime' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Bien', dataKey: 'property' },
      { header: 'Statut', dataKey: 'status' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Téléphone', dataKey: 'phone' }
    ];
    
    // Créer le tableau
    autoTable(doc, {
      head: [tableColumns.map(col => col.header)],
      body: tableData,
      startY: 60,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: hexToRgb(values.headerColor).array as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number]
      },
      alternateRowStyles: { fillColor: [245, 245, 255] as [number, number, number] },
      columnStyles: {
        0: { fontStyle: 'bold' }, // Nom du visiteur en gras
        4: { fontStyle: 'bold' }  // Statut en gras
      },
      margin: { top: 35 }
    });
  };

  // Générer le tableau des locataires
  const generateTenantsTable = (doc: jsPDF) => {
    const values = form.getValues();
    
    // Exemple de données pour les locataires
    const tableData = [
      ["Jean Dupont", "Appartement 1A", "01/01/2023", "31/12/2023", "850,00 €", "Actif", "2 interventions"],
      ["Marie Martin", "Villa Les Roses", "15/03/2022", "14/03/2024", "1250,00 €", "Actif", "Aucune"],
      ["Pierre Durand", "Studio 3B", "01/09/2022", "31/08/2023", "550,00 €", "Résilié", "1 intervention"],
      ["Sophie Bernard", "Appartement 2C", "01/05/2023", "30/04/2024", "900,00 €", "Actif", "En attente"],
      ["Lucas Petit", "Maison Bleue", "01/02/2022", "31/01/2025", "1500,00 €", "Actif", "3 interventions"],
    ];
    
    // Définir les colonnes
    const tableColumns = [
      'Locataire',
      'Propriété',
      'Début bail',
      'Fin bail',
      'Loyer',
      'Statut',
      'Maintenance'
    ];
    
    // Créer le tableau
    autoTable(doc, {
      head: [tableColumns],
      body: tableData,
      startY: 60,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: hexToRgb(values.headerColor).array as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number]
      },
      alternateRowStyles: { fillColor: [245, 245, 255] as [number, number, number] },
      columnStyles: {
        0: { fontStyle: 'bold' }, // Nom du locataire en gras
        5: { fontStyle: 'bold' }, // Statut en gras
        6: { fontStyle: 'bold' }  // Maintenance en gras
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
  ];

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
                  onClick={() => setSelectedPdfType(type.id)}
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
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de l'entreprise</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Votre entreprise" />
                          </FormControl>
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
                            <FormControl>
                              <Input {...field} placeholder="123 rue des Exemples, 75000 Paris" />
                            </FormControl>
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
                              <FormControl>
                                <Input {...field} placeholder="01 23 45 67 89" />
                              </FormControl>
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
                              <FormControl>
                                <Input {...field} placeholder="contact@entreprise.com" />
                              </FormControl>
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
                              />
                            </FormControl>
                            <Input
                              type="text"
                              value={field.value}
                              onChange={field.onChange}
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
                  </div>

                  <div className="flex gap-2 justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                    >
                      Réinitialiser
                    </Button>
                    
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
                    <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-muted-foreground">
                      {visits.length === 0 
                        ? "Aucune visite disponible pour générer un aperçu"
                        : "Génération de l'aperçu en cours..."}
                    </p>
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