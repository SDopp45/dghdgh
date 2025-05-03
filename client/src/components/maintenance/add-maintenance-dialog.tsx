import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Loader2, Check, PlusCircle, FileText, Image, X, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, ReactNode } from "react";
import { PdfUpload } from "@/components/ui/pdf-upload";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  FileCheck,
  FilePenLine,
  FileSignature,
  FileSpreadsheet,
  FileSearch,
  FileImage,
  Clipboard,
  CreditCardIcon,
  Mail,
  FileIcon,
  Euro
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  propertyId: z.coerce.number().min(1, "Veuillez sélectionner une propriété"),
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  priority: z.enum(["low", "medium", "high"]),
  reportedBy: z.string().min(1, "Le nom du déclarant est requis"),
  totalCost: z.coerce.number().min(0, "Le coût total doit être positif").default(0),
  date: z.string().min(1, "La date est requise"),
});

// Définir le type pour les types de documents
type DocumentTypeKey = 'invoice' | 'quote' | 'contract' | 'photo' | 'report' | 
  'other' | 'form' | 'maintenance' | 'insurance' | 'tax' | 'legal' | 'certificate' | 
  'payment' | 'deposit' | 'budget' | 'expense' | 'tenant' | 'guarantor' | 'inventory' | 
  'complaint' | 'inspection' | 'repair' | 'renovation' | 'plan' | 'notice' | 
  'correspondence' | 'meeting' | 'lease';

// Définir le type pour la configuration de type de document
interface DocumentTypeConfig {
  label: string;
  icon: React.ReactNode;
}

interface AddMaintenanceDialogProps {
  children?: ReactNode;
}

export function AddMaintenanceDialog({ children }: AddMaintenanceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [key, setKey] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [documentTypes, setDocumentTypes] = useState<Map<File, string>>(new Map());
  const [pendingDocumentNames, setPendingDocumentNames] = useState<Map<File, string>>(new Map());
  const [editingPendingDocName, setEditingPendingDocName] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["/api/folders"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: undefined,
      title: "",
      description: "",
      priority: "low" as const,
      reportedBy: "",
      totalCost: 0,
      date: new Date().toISOString().split("T")[0],
    },
    mode: "onBlur",
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création du dossier");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setSelectedFolderId(data.id);
      setIsCreatingFolder(false);
      setNewFolderName("");
      setSelectedFile(null);
      setKey(prev => prev + 1);
      toast({
        title: "✨ Dossier créé",
        description: "Le dossier a été créé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadSingleDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('section', 'maintenance');
      formData.append('type', 'maintenance');
      if (selectedFolderId) {
        formData.append('folderId', selectedFolderId.toString());
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du document');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✨ Document téléchargé",
        description: "Le document a été ajouté avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  });

  const uploadMultipleDocumentsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('section', 'maintenance');
      formData.append('type', 'maintenance');
      if (selectedFolderId) {
        formData.append('folderId', selectedFolderId.toString());
      }

      const response = await fetch('/api/documents/multiple', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement des documents');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✨ Documents téléchargés",
        description: "Les documents ont été ajoutés avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: { values: z.infer<typeof formSchema>, documentId?: number, documentIds?: number[], folderId: number | null }) => {
      const { values, documentId, documentIds, folderId } = data;
      const requestData = {
        ...values,
        status: "open",
        totalCost: Number(values.totalCost),
        reportedBy: values.reportedBy.trim(),
        createdAt: values.date,
        documentId,
        documentIds,
        folderId,
      };

      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la création");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

      toast({
        title: "✨ Succès !",
        description: (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <Check className="h-5 w-5 text-green-500" />
            <span>La demande de maintenance a été ajoutée</span>
          </motion.div>
        ),
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setTimeout(() => {
        setIsSuccess(false);
        form.reset();
        setSelectedFile(null);
        setSelectedFolderId(null);
        setIsOpen(false);
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Erreur lors de la création:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mise à jour avec le typage approprié et tous les types disponibles
  const documentTypeConfig: Record<DocumentTypeKey, DocumentTypeConfig> = {
    "invoice": {
      label: "Facture",
      icon: <CreditCardIcon className="h-4 w-4 text-blue-500" />
    },
    "quote": {
      label: "Devis",
      icon: <FileText className="h-4 w-4 text-amber-500" />
    },
    "contract": {
      label: "Contrat",
      icon: <FilePenLine className="h-4 w-4 text-green-500" />
    },
    "lease": { 
      label: "Bail", 
      icon: <FileSignature className="h-4 w-4 text-amber-500" /> 
    },
    "form": { 
      label: "Formulaire", 
      icon: <Clipboard className="h-4 w-4 text-violet-500" /> 
    },
    "maintenance": { 
      label: "Entretien", 
      icon: <FileSearch className="h-4 w-4 text-red-500" /> 
    },
    "insurance": { 
      label: "Assurance", 
      icon: <FileCheck className="h-4 w-4 text-cyan-500" /> 
    },
    "tax": { 
      label: "Impôts", 
      icon: <FileIcon className="h-4 w-4 text-orange-500" /> 
    },
    "legal": { 
      label: "Juridique", 
      icon: <FileSpreadsheet className="h-4 w-4 text-gray-500" /> 
    },
    "certificate": { 
      label: "Certificat", 
      icon: <FileCheck className="h-4 w-4 text-green-500" /> 
    },
    "payment": { 
      label: "Paiement", 
      icon: <CreditCardIcon className="h-4 w-4 text-indigo-500" /> 
    },
    "deposit": { 
      label: "Dépôt", 
      icon: <Euro className="h-4 w-4 text-amber-500" /> 
    },
    "budget": { 
      label: "Budget", 
      icon: <FileSpreadsheet className="h-4 w-4 text-blue-500" /> 
    },
    "expense": { 
      label: "Dépense", 
      icon: <CreditCardIcon className="h-4 w-4 text-red-500" /> 
    },
    "tenant": { 
      label: "Locataire", 
      icon: <FileIcon className="h-4 w-4 text-purple-500" /> 
    },
    "guarantor": { 
      label: "Garant", 
      icon: <FileIcon className="h-4 w-4 text-teal-500" /> 
    },
    "inventory": { 
      label: "Inventaire", 
      icon: <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> 
    },
    "complaint": { 
      label: "Réclamation", 
      icon: <Mail className="h-4 w-4 text-red-500" /> 
    },
    "photo": {
      label: "Photo",
      icon: <Image className="h-4 w-4 text-purple-500" />
    },
    "inspection": { 
      label: "Inspection", 
      icon: <FileSearch className="h-4 w-4 text-amber-500" /> 
    },
    "repair": { 
      label: "Réparation", 
      icon: <FileIcon className="h-4 w-4 text-red-500" /> 
    },
    "renovation": { 
      label: "Rénovation", 
      icon: <FileIcon className="h-4 w-4 text-cyan-500" /> 
    },
    "plan": { 
      label: "Plan", 
      icon: <FileImage className="h-4 w-4 text-blue-500" /> 
    },
    "notice": { 
      label: "Avis", 
      icon: <FileIcon className="h-4 w-4 text-orange-500" /> 
    },
    "correspondence": { 
      label: "Correspondance", 
      icon: <Mail className="h-4 w-4 text-blue-500" /> 
    },
    "report": { 
      label: "Rapport", 
      icon: <FileSpreadsheet className="h-4 w-4 text-violet-500" /> 
    },
    "meeting": { 
      label: "Réunion", 
      icon: <FileIcon className="h-4 w-4 text-emerald-500" /> 
    },
    "other": { 
      label: "Autre", 
      icon: <FileIcon className="h-4 w-4 text-gray-500" /> 
    }
  };

  // Trier les types de documents par label pour l'affichage
  const sortedDocumentTypes = Object.entries(documentTypeConfig)
    .sort(([, a], [, b]) => a.label.localeCompare(b.label));

  // Types de documents groupés par catégorie
  const documentTypeCategories = {
    finance: ["invoice", "quote", "payment", "expense", "budget", "deposit", "tax"],
    legal: ["contract", "lease", "legal", "notice", "form", "certificate"],
    property: ["maintenance", "repair", "renovation", "plan", "inspection", "inventory"],
    communication: ["report", "correspondence", "complaint", "meeting"],
    other: ["photo", "insurance", "tenant", "guarantor", "other"]
  };

  // Labels des catégories
  const categoryLabels = {
    finance: "Finance",
    legal: "Juridique",
    property: "Propriété",
    communication: "Communication",
    other: "Autres"
  };

  const handleDocumentUpload = (files: File[]) => {
    setPendingFiles(prev => [...prev, ...files]);
  };

  // Fonction pour obtenir le nom sans extension pour l'édition
  const getNameWithoutExtension = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, "");
  };

  const updateDocumentType = (file: File, type: DocumentTypeKey) => {
    setDocumentTypes(prev => {
      const newMap = new Map(prev);
      newMap.set(file, type);
      return newMap;
    });
  };

  const updatePendingDocumentName = (file: File, newName: string) => {
    // Vérifier si le nom se termine par .pdf, sinon l'ajouter
    const fullName = newName.toLowerCase().endsWith('.pdf') ? newName : `${newName}.pdf`;
    
    setPendingDocumentNames(prev => {
      const newMap = new Map(prev);
      newMap.set(file, fullName);
      return newMap;
    });
    setEditingPendingDocName(null);
  };

  const uploadDocument = async (file: File): Promise<number> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const docType = documentTypes.get(file) || "invoice";
    formData.append('type', docType);
    
    const customName = pendingDocumentNames.get(file) || file.name;
    formData.append('title', customName);
    
    if (selectedFolderId) {
      formData.append('folderId', selectedFolderId.toString());
    }

    const documentCategory = 'maintenance';
    const documentDescription = `Document de maintenance associé à une demande: ${form.getValues().title}`;

    // Utiliser le type corrigé ici
    const docTypeLabel = documentTypeConfig[docType as DocumentTypeKey]?.label || "Maintenance";
    
    const formDataObj = {
      section: 'maintenance',
      description: documentDescription,
      source: 'maintenance',
      documentTypeLabel: docTypeLabel,
      uploadSource: 'maintenance_form',
      uploadMethod: 'form',
      uploadContext: 'maintenance',
      documentCategory: documentCategory,
      originalFileName: file.name,
      customFileName: customName || file.name
    };
    
    formData.append('formData', JSON.stringify(formDataObj));
    
    const response = await fetch('/api/documents', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) throw new Error(`Erreur lors du téléchargement de ${file.name}`);
    
    const data = await response.json();
    return data.id;
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsUploading(true);
      let documentId;
      let documentIds: number[] = [];
      
      if (pendingFiles.length > 0) {
        const uploadResults = await Promise.all(pendingFiles.map(async (file) => {
          return await uploadDocument(file);
        }));
        
        documentIds = uploadResults;
        
        if (documentIds.length > 0) {
          documentId = documentIds[0];
        }
        
        // Forcer un refetch des documents après l'upload
        await queryClient.fetchQuery({ queryKey: ["/api/documents"] });
      } 
      else if (selectedFiles && selectedFiles.length > 0) {
        const uploadResults = await uploadMultipleDocumentsMutation.mutateAsync(selectedFiles);
        
        if (uploadResults.documents && uploadResults.documents.length > 0) {
          documentIds = uploadResults.documents.map((doc: { id: number }) => doc.id);
          documentId = uploadResults.documents[0].id;
        }
        
        // Forcer un refetch des documents après l'upload
        await queryClient.fetchQuery({ queryKey: ["/api/documents"] });
      }
      else if (selectedFile) {
        const uploadResult = await uploadSingleDocumentMutation.mutateAsync(selectedFile);
        documentId = uploadResult.id;
        documentIds = [documentId];
        
        // Forcer un refetch des documents après l'upload
        await queryClient.fetchQuery({ queryKey: ["/api/documents"] });
      }
      
      setIsUploading(false);
      
      await createMaintenanceMutation.mutateAsync({ 
        values, 
        documentId,
        documentIds,
        folderId: selectedFolderId
      });
    } catch (error) {
      setIsUploading(false);
      console.error('Error in form submission:', error);
    }
  };

  const formatPropertiesForSelect = (properties: any[] = []) => {
    return properties.map(property => ({
      value: property.id.toString(),
      label: property.name
    }));
  };

  const formatFoldersForSelect = (folders: any[] = []) => {
    return folders.map(folder => ({
      value: folder.id.toString(),
      label: folder.name
    }));
  };

  // Fonction pour réinitialiser les états liés aux documents
  const resetDocumentStates = () => {
    setPendingFiles([]);
    setDocumentTypes(new Map());
    setPendingDocumentNames(new Map());
    setEditingPendingDocName(null);
    setSelectedFile(null);
    setSelectedFiles([]);
  };

  // Réinitialiser le formulaire lorsqu'il est fermé
  useEffect(() => {
    if (!isOpen) {
      resetDocumentStates();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        resetDocumentStates();
      }
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button
            className="bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-600 hover:via-rose-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-300 animate-gradient-x text-white"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        )}
      </DialogTrigger>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-red-50/30">
              <DialogHeader className="border-b border-red-200/20 pb-4">
                <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent flex items-center gap-2">
                  <FileSearch className="h-6 w-6 text-red-500" />
                  Nouvelle demande de maintenance
                </DialogTitle>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Remplissez ce formulaire pour signaler un problème ou une réparation nécessaire sur une propriété. 
                  Joignez des photos ou documents pour faciliter le diagnostic.
                </p>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6 mt-6"
                >
                  <Card className="p-5 bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/20 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-base font-semibold mb-4 text-red-500/80 flex items-center gap-2">
                      <FileSignature className="h-4 w-4" />
                      Informations générales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="propertyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-foreground/90">Propriété</FormLabel>
                            <FormControl>
                              <Combobox
                                options={formatPropertiesForSelect(Array.isArray(properties) ? properties : [])}
                                value={field.value?.toString() || ""}
                                onValueChange={(value: string) => field.onChange(parseInt(value, 10))}
                                placeholder="Sélectionner une propriété"
                                emptyText="Aucune propriété trouvée"
                                searchPlaceholder="Rechercher une propriété..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-foreground/90">Date du signalement</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-10 bg-background hover:bg-background transition-colors focus-within:border-red-300" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/20 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-base font-semibold mb-4 text-red-500/80 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description du problème
                    </h3>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground/90">Titre du problème</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Fuite d'eau dans la salle de bain" className="h-10 bg-background hover:bg-background transition-colors focus-within:border-red-300" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="font-medium text-foreground/90">Description détaillée</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Décrivez en détail le problème rencontré: localisation, symptômes, fréquence, etc."
                              className="min-h-[120px] resize-none bg-background hover:bg-background transition-colors focus-within:border-red-300"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/20 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-base font-semibold mb-4 text-red-500/80 flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Priorité et responsable
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="reportedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-foreground/90">Signalé par</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nom du déclarant" className="h-10 bg-background hover:bg-background transition-colors focus-within:border-red-300" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-foreground/90">Priorité</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10 bg-background hover:bg-background transition-colors focus:border-red-300">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background border-red-500/20">
                                <SelectItem value="low">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span>Basse</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <span>Moyenne</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="high">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span>Haute</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/20 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-base font-semibold mb-4 text-red-500/80 flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Estimation financière
                    </h3>
                    <FormField
                      control={form.control}
                      name="totalCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground/90">Coût total estimé (€)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value === 0 ? "" : field.value.toString()}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                  field.onChange(Math.max(0, isNaN(value) ? 0 : value));
                                }}
                                className="h-10 bg-background hover:bg-background transition-colors pl-6 focus-within:border-red-300"
                              />
                              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">€</span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">Si connu, indiquez le coût estimé des travaux ou réparations.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Card>

                  <Card className="p-5 bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/20 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-base font-semibold mb-4 text-red-500/80 flex items-center gap-2">
                      <FileSearch className="h-4 w-4" />
                      Documents et photos
                    </h3>
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-2">
                        <label className="text-sm font-medium text-foreground/90">Dossier de destination</label>
                        {isCreatingFolder ? (
                          <div className="flex flex-col space-y-2">
                            <div className="flex flex-col space-y-2">
                              <Label htmlFor="new-folder-name">Nom du nouveau dossier</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="new-folder-name"
                                  className="flex-1 border-red-500/20 focus-visible:ring-red-500/30"
                                  placeholder="Entrez le nom du dossier"
                                  value={newFolderName}
                                  onChange={(e) => setNewFolderName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newFolderName.trim()) {
                                      createFolderMutation.mutate(newFolderName.trim());
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (newFolderName.trim()) {
                                      createFolderMutation.mutate(newFolderName.trim());
                                    }
                                  }}
                                  disabled={createFolderMutation.isPending}
                                  className="border-red-500/20 hover:bg-red-500/10 text-red-500"
                                >
                                  {createFolderMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Créer"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setIsCreatingFolder(false);
                                    setNewFolderName("");
                                  }}
                                  className="hover:bg-red-500/10 text-muted-foreground"
                                >
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Combobox
                              options={formatFoldersForSelect(Array.isArray(folders) ? folders : [])}
                              value={selectedFolderId?.toString() || ""}
                              onValueChange={(value) => setSelectedFolderId(parseInt(value))}
                              placeholder="Sélectionner un dossier"
                              emptyText="Aucun dossier trouvé"
                              searchPlaceholder="Rechercher un dossier..."
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsCreatingFolder(true)}
                              className="border-red-500/20 hover:bg-red-500/10 text-red-500"
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Nouveau
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {pendingFiles.length > 0 && (
                        <div className="border border-red-200/30 rounded-md p-3 mb-3 bg-red-50/10">
                          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            Documents à télécharger ({pendingFiles.length})
                          </h3>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {pendingFiles.map((file, index) => (
                              <div key={index} className="flex flex-col space-y-2 p-2 bg-background rounded-md border border-red-100/20">
                                <div className="flex items-center justify-between">
                                  {editingPendingDocName === file ? (
                                    <div className="flex-1 flex items-center gap-2">
                                      <div className="relative flex-1">
                                        <Input
                                          name={`pending-name-${index}`}
                                          defaultValue={getNameWithoutExtension(pendingDocumentNames.get(file) || file.name)}
                                          className="flex-1 h-8 py-1 pr-8 text-xs focus-within:border-red-300"
                                          autoFocus
                                          onBlur={(e) => {
                                            if (e.target.value.trim()) {
                                              updatePendingDocumentName(file, e.target.value.trim());
                                            } else {
                                              setEditingPendingDocName(null);
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              if (e.currentTarget.value.trim()) {
                                                updatePendingDocumentName(file, e.currentTarget.value.trim());
                                              } else {
                                                setEditingPendingDocName(null);
                                              }
                                            } else if (e.key === 'Escape') {
                                              e.preventDefault();
                                              setEditingPendingDocName(null);
                                            }
                                          }}
                                        />
                                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">.pdf</span>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 px-2 py-1 bg-red-500 hover:bg-red-600 text-white"
                                        onClick={() => {
                                          const input = document.querySelector(`[name="pending-name-${index}"]`) as HTMLInputElement;
                                          if (input && input.value.trim()) {
                                            updatePendingDocumentName(file, input.value.trim());
                                          } else {
                                            setEditingPendingDocName(null);
                                          }
                                        }}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                      <FileText className="h-4 w-4 flex-shrink-0 text-red-500" />
                                      <div className="flex items-center gap-1 flex-1 overflow-hidden">
                                        <span 
                                          className="text-xs font-medium truncate" 
                                          title={pendingDocumentNames.get(file) || file.name}
                                        >
                                          {pendingDocumentNames.get(file) || file.name}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingPendingDocName(file)}
                                          className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-500"
                                          title="Renommer le fichier"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">
                                        ({Math.round(file.size / 1024)} Ko)
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Select
                                      value={documentTypes.get(file) || "invoice"}
                                      onValueChange={(value) => updateDocumentType(file, value as DocumentTypeKey)}
                                    >
                                      <SelectTrigger className="h-8 py-1 pl-3 pr-2 text-xs border-gray-200 bg-background w-[110px]">
                                        <SelectValue placeholder="Type" />
                                      </SelectTrigger>
                                      <SelectContent 
                                        className="w-[190px] p-0 bg-background border-red-500/20" 
                                        position="popper"
                                        sideOffset={5}
                                        align="start"
                                      >
                                        <div 
                                          className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent py-1 px-1"
                                          onWheel={(e) => e.stopPropagation()}
                                        >
                                          {Object.entries(documentTypeCategories).map(([category, types]) => (
                                            <SelectGroup key={category} className="px-1">
                                              <SelectLabel className="text-xs font-semibold text-red-500/80 pl-2 py-1 pointer-events-none sticky top-0 bg-popover z-10">
                                                {categoryLabels[category as keyof typeof categoryLabels]}
                                              </SelectLabel>
                                              {types.map((type) => (
                                                <SelectItem 
                                                  key={type} 
                                                  value={type}
                                                  className="text-xs hover:bg-red-500/10 cursor-pointer py-1.5 px-2 my-0.5 rounded-md"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {documentTypeConfig[type as DocumentTypeKey].icon}
                                                    <span>{documentTypeConfig[type as DocumentTypeKey].label}</span>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                              {category !== "other" && <SelectSeparator className="my-1" />}
                                            </SelectGroup>
                                          ))}
                                        </div>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setPendingFiles(prev => prev.filter(f => f !== file));
                                        setDocumentTypes(prev => {
                                          const newMap = new Map(prev);
                                          newMap.delete(file);
                                          return newMap;
                                        });
                                      }}
                                      className="p-1 text-red-500 hover:bg-red-500/10"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border border-dashed border-red-300/50 rounded-md py-6 px-4 text-center bg-red-50/10 hover:bg-red-50/20 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          <div className="mb-3 bg-red-100/20 p-3 rounded-full">
                            <FileText className="h-6 w-6 text-red-500" />
                          </div>
                          <p className="text-sm font-medium mb-2 text-foreground/90">
                            Ajouter des documents et photos
                          </p>
                          <p className="text-xs text-muted-foreground mb-1">
                            Glissez et déposez jusqu'à 5 fichiers PDF ou cliquez pour parcourir
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Taille maximale: 10MB par fichier
                          </p>
                        </div>
                        
                        <div>
                          <PdfUpload
                            key={key}
                            onFileSelected={(files) => {
                              if (Array.isArray(files)) {
                                handleDocumentUpload(files);
                              } else {
                                setSelectedFile(files);
                                setSelectedFiles([files]);
                              }
                            }}
                            multiple={true}
                            maxFiles={5}
                          />
                        </div>
                        
                        {isUploading && (
                          <div className="flex items-center justify-center gap-2 text-sm text-red-600 mt-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Téléchargement en cours...
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Button
                    type="submit"
                    className={`w-full h-12 transition-all duration-300 rounded-md shadow-md hover:shadow-lg ${
                      isSuccess
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
                    }`}
                    disabled={createMaintenanceMutation.isPending || isUploading}
                  >
                    {createMaintenanceMutation.isPending || isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Création en cours...
                      </>
                    ) : isSuccess ? (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Demande créée !
                      </>
                    ) : (
                      "Créer la demande"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}