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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Pencil, Loader2, Check, X, FileText, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { PdfUpload } from "@/components/ui/pdf-upload";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginatedSelect } from "@/components/ui/paginated-select";
import { Badge } from "@/components/ui/badge";
import { DocumentViewerButton } from "@/components/ui/document-viewer-button";
import {
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Image } from "lucide-react";
import { Label } from "@/components/ui/label";
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
  Euro,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Combobox } from "@/components/ui/combobox";
import { PlusCircle } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "in_progress", "completed"]),
  reportedBy: z.string().optional(),
  totalCost: z.string().optional(),
  propertyId: z.number().optional(),
});

interface EditMaintenanceDialogProps {
  request: any;
  children?: ReactNode;
}

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

export function EditMaintenanceDialog({ request, children }: EditMaintenanceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentId, setDocumentId] = useState<number | null>(request.documentId || null);
  const [documentIds, setDocumentIds] = useState<number[]>(request.documentIds || (request.documentId ? [request.documentId] : []));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteWithDocument, setDeleteWithDocument] = useState(false);
  const [documentLoading, setDocumentLoading] = useState<{[key: number]: boolean}>({});
  const [showConfirmDocDelete, setShowConfirmDocDelete] = useState<number | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [documentTypes, setDocumentTypes] = useState<Map<File, string>>(new Map());
  const [pendingDocumentNames, setPendingDocumentNames] = useState<Map<File, string>>(new Map());
  const [editingPendingDocName, setEditingPendingDocName] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentNames, setDocumentNames] = useState<Map<number, string>>(new Map());
  const [editingDocumentName, setEditingDocumentName] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["/api/folders"],
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

  const formatPropertiesForSelect = (properties: any[]) => {
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      reportedBy: request.reportedBy || "",
      totalCost: request.totalCost?.toString() || "",
      propertyId: request.propertyId,
    },
  });

  // Mise à jour complète avec tous les types disponibles
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
    // Limiter la longueur du nom à 55 caractères
    let trimmedName = newName.slice(0, 55);
    
    // Vérifier si le nom se termine par .pdf, sinon l'ajouter
    const fullName = trimmedName.toLowerCase().endsWith('.pdf') ? trimmedName : `${trimmedName}.pdf`;
    
    setPendingDocumentNames(prev => {
      const newMap = new Map(prev);
      newMap.set(file, fullName);
      return newMap;
    });
    setEditingPendingDocName(null);
  };

  // Fonction pour mettre à jour le nom d'un document existant
  const updateExistingDocumentName = (docId: number, newName: string) => {
    // Limiter la longueur du nom à 55 caractères
    let trimmedName = newName.slice(0, 55);
    
    // Vérifier si le nom se termine par .pdf, sinon l'ajouter
    const fullName = trimmedName.toLowerCase().endsWith('.pdf') ? trimmedName : `${trimmedName}.pdf`;
    
    // Mettre à jour localement
    setDocumentNames(prev => {
      const newMap = new Map(prev);
      newMap.set(docId, fullName);
      return newMap;
    });
    
    // Fermer le champ d'édition
    setEditingDocumentName(null);
  };

  // Fonction pour charger les noms des documents existants
  const loadDocumentNames = async () => {
    if (documentIds.length === 0) return;
    
    try {
      const newDocumentNames = new Map<number, string>();
      
      for (const docId of documentIds) {
        const response = await fetch(`/api/documents/${docId}`);
        if (response.ok) {
          const doc = await response.json();
          if (doc.title) {
            newDocumentNames.set(docId, doc.title);
          }
        }
      }
      
      setDocumentNames(newDocumentNames);
    } catch (error) {
      console.error("Erreur lors du chargement des noms de documents:", error);
    }
  };

  // Charger les noms des documents existants lorsque la liste des documents change
  useEffect(() => {
    if (dialogOpen && documentIds.length > 0) {
      loadDocumentNames();
    }
  }, [dialogOpen, documentIds]);

  const uploadDocument = async (file: File): Promise<number> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const docType = documentTypes.get(file) || "invoice";
    formData.append('type', docType);
    
    const customName = pendingDocumentNames.get(file) || file.name;
    formData.append('title', customName);
    
    // Ajouter l'ID du dossier à la formData
    if (selectedFolderId) {
      formData.append('folderId', selectedFolderId.toString());
    }

    const documentCategory = 'maintenance';
    const documentDescription = `Document de maintenance associé à une demande modifiée: ${form.getValues().title}`;

    // Utiliser le type corrigé ici
    const docTypeLabel = documentTypeConfig[docType as DocumentTypeKey]?.label || "Maintenance";
    
    const formDataObj = {
      section: 'maintenance',
      description: documentDescription,
      source: 'maintenance',
      documentTypeLabel: docTypeLabel,
      uploadSource: 'maintenance_edit_form',
      uploadMethod: 'form',
      uploadContext: 'maintenance_edit',
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

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      try {
        setIsUploading(true);
        let newDocumentId = documentId;
        let newDocumentIds = [...documentIds]; // Conserver les documents existants
        
        if (pendingFiles.length > 0) {
          const uploadResults = await Promise.all(pendingFiles.map(async (file) => {
            return await uploadDocument(file);
          }));
          
          // Ajouter les nouveaux documents aux documents existants
          newDocumentIds = [...newDocumentIds, ...uploadResults];
          
          // Si aucun document principal n'est défini, utiliser le premier du lot
          if (newDocumentId === null && uploadResults.length > 0) {
            newDocumentId = uploadResults[0];
          }
        }
        
        else if (selectedFile) {
          const uploadedId = await uploadDocument(selectedFile);
          if (uploadedId) {
            if (!newDocumentIds.includes(uploadedId)) {
              newDocumentIds.push(uploadedId);
            }
            if (newDocumentId === null) {
              newDocumentId = uploadedId;
            }
          }
        }
        
        setIsUploading(false);

        const response = await fetch(`/api/maintenance/${request.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...values,
            totalCost: values.totalCost ? parseFloat(values.totalCost) : null,
            documentId: newDocumentId,
            documentIds: newDocumentIds,
            folderId: selectedFolderId,
            updatedAt: new Date().toISOString()
          }),
          credentials: "include",
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Erreur lors de la modification");
        }

        const data = await response.json();
        
        // Mettre à jour l'état local avec les nouveaux documents
        setDocumentId(newDocumentId);
        setDocumentIds(newDocumentIds);

        await queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        await queryClient.fetchQuery({ queryKey: ["/api/documents"] });

        return data;
      } catch (error: any) {
        setIsUploading(false);
        throw error;
      }
    },
    onSuccess: async () => {
      setIsSuccess(true);

      await queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      await queryClient.fetchQuery({ queryKey: ["/api/documents"] });

      toast({
        title: "✨ Modification réussie !",
        description: (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <Check className="h-5 w-5 text-green-500" />
            <span>La demande a été mise à jour avec succès</span>
          </motion.div>
        ),
        className: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setTimeout(() => {
        setIsSuccess(false);
        setDialogOpen(false);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeDocument = async (docId: number) => {
    try {
      setDocumentLoading((prev) => ({ ...prev, [docId]: true }));
      
      const newDocIds = documentIds.filter(id => id !== docId);
      setDocumentIds(newDocIds);
      
      if (documentId === docId) {
        setDocumentId(newDocIds.length > 0 ? newDocIds[0] : null);
      }
      
      setShowConfirmDocDelete(null);
      
      toast({
        title: "✅ Document retiré",
        description: "Le document a été retiré de la demande",
      });
      
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le document",
        variant: "destructive",
      });
    } finally {
      setDocumentLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const deleteMaintenance = async () => {
    try {
      if (deleteWithDocument && documentId) {
        await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      }

      const response = await fetch(`/api/maintenance/${request.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      await queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

      toast({
        title: "✨ Suppression réussie !",
        description: (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <Check className="h-5 w-5 text-green-500" />
            <span>La demande a été supprimée avec succès</span>
          </motion.div>
        ),
        className: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setShowDeleteAlert(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Fonction pour réinitialiser les états liés aux documents
  const resetDocumentStates = () => {
    setPendingFiles([]);
    setDocumentTypes(new Map());
    setPendingDocumentNames(new Map());
    setEditingPendingDocName(null);
    setSelectedFile(null);
    setSelectedFiles([]);
    setSelectedFolderId(null);
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  // Réinitialiser le formulaire lorsqu'il est fermé
  useEffect(() => {
    if (!dialogOpen) {
      resetDocumentStates();
    }
  }, [dialogOpen]);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          resetDocumentStates();
        }
      }}>
        <DialogTrigger asChild>
          {children || (
          <Button
              variant="outline"
              size="sm"
              className="h-8 flex items-center gap-1.5 border-blue-500/20 hover:border-blue-500 hover:bg-blue-500/10 text-blue-500"
              onClick={() => setDialogOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Modifier</span>
          </Button>
          )}
        </DialogTrigger>
        <AnimatePresence>
          {dialogOpen && (
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
                    Modifier la demande
                  </DialogTitle>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                    Modifiez les informations de la demande de maintenance et ajoutez des documents supplémentaires si nécessaire.
                  </p>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((values) => {
                      mutation.mutate(values);
                    })}
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
                                <PaginatedSelect
                                  options={formatPropertiesForSelect(Array.isArray(properties) ? properties : [])}
                                  value={field.value?.toString() || ""}
                                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                                  placeholder="Sélectionner une propriété"
                                />
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
                              <PaginatedSelect
                                options={[
                                  { value: "low", label: "Basse" },
                                  { value: "medium", label: "Moyenne" },
                                  { value: "high", label: "Haute" },
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Sélectionner une priorité"
                              />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium text-foreground/90">Titre</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-10 bg-background/50 hover:bg-background/80 transition-colors focus-within:border-red-300" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium text-foreground/90">Statut</FormLabel>
                              <PaginatedSelect
                                options={[
                                  { value: "open", label: "Ouvert" },
                                  { value: "in_progress", label: "En cours" },
                                  { value: "completed", label: "Terminé" },
                                ]}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Sélectionner un statut"
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel className="font-medium text-foreground/90">Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Description détaillée du problème"
                                className="min-h-[120px] resize-none bg-background/50 hover:bg-background/80 transition-colors focus-within:border-red-300"
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
                        Informations complémentaires
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="reportedBy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium text-foreground/90">Signalé par</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-10 bg-background/50 hover:bg-background/80 transition-colors focus-within:border-red-300" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="totalCost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium text-foreground/90">Coût total (€)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field} 
                                    className="h-10 bg-background/50 hover:bg-background/80 transition-colors pl-6 focus-within:border-red-300" 
                                  />
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">€</span>
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground mt-1">Indiquez le coût estimé ou réel des travaux.</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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
                        {documentIds.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-red-500" />
                              Documents joints ({documentIds.length})
                            </h4>
                            <div className="border border-red-200/30 rounded-md p-2 space-y-2 max-h-40 overflow-y-auto bg-red-50/10">
                              {documentIds.map((docId) => (
                                <div key={docId} className="flex items-center justify-between bg-background rounded p-2 text-sm border border-red-100/20">
                                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                    <FileText className="h-4 w-4 text-red-500" />
                                    {editingDocumentName === docId ? (
                                      <div className="flex-1 flex items-center gap-2">
                                        <div className="relative flex-1">
                                          <Input
                                            name={`document-name-${docId}`}
                                            defaultValue={getNameWithoutExtension(documentNames.get(docId) || `Document ${docId}`)}
                                            className="flex-1 h-7 py-1 pr-8 text-xs focus-within:border-red-300"
                                            maxLength={55}
                                            autoFocus
                                            onBlur={(e) => {
                                              if (e.target.value.trim()) {
                                                updateExistingDocumentName(docId, e.target.value.trim());
                                              } else {
                                                setEditingDocumentName(null);
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (e.currentTarget.value.trim()) {
                                                  updateExistingDocumentName(docId, e.currentTarget.value.trim());
                                                } else {
                                                  setEditingDocumentName(null);
                                                }
                                              } else if (e.key === 'Escape') {
                                                e.preventDefault();
                                                setEditingDocumentName(null);
                                              }
                                            }}
                                          />
                                          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">.pdf</span>
                                        </div>
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-7 px-2 py-1 bg-red-500 hover:bg-red-600 text-white"
                                          onClick={() => {
                                            const input = document.querySelector(`[name="document-name-${docId}"]`) as HTMLInputElement;
                                            if (input && input.value.trim()) {
                                              updateExistingDocumentName(docId, input.value.trim());
                                            } else {
                                              setEditingDocumentName(null);
                                            }
                                          }}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 flex-1 overflow-hidden">
                                        <span className="truncate" title={documentNames.get(docId) || `Document ${docId}`}>
                                          {(documentNames.get(docId) || `Document ${docId}`).length > 30 
                                            ? (documentNames.get(docId) || `Document ${docId}`).substring(0, 27) + '...' 
                                            : (documentNames.get(docId) || `Document ${docId}`)} {docId === documentId ? '(principal)' : ''}
                                        </span>
                                        <Button 
                                          type="button"
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => setEditingDocumentName(docId)}
                                          className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-500"
                                          title="Renommer le document"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                    {docId === documentId && (
                                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                        Principal
                                      </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DocumentViewerButton
                                      documentId={docId}
                                      section="maintenance"
                                      className="h-7 w-7 hover:bg-red-500/10 hover:text-red-500"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </DocumentViewerButton>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-red-500/10 hover:text-red-500"
                                      onClick={() => setShowConfirmDocDelete(docId)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {pendingFiles.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-red-500" />
                              Nouveaux documents à télécharger ({pendingFiles.length})
                            </h4>
                            <div className="border border-red-200/30 rounded-md p-3 mb-3 bg-red-50/10">
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
                                              maxLength={55}
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
                                              {(pendingDocumentNames.get(file) || file.name).length > 30 
                                                ? (pendingDocumentNames.get(file) || file.name).substring(0, 27) + '...' 
                                                : (pendingDocumentNames.get(file) || file.name)}
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
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Select
                                        value={documentTypes.get(file) || "invoice"}
                                        onValueChange={(value) => updateDocumentType(file, value as DocumentTypeKey)}
                                      >
                                        <SelectTrigger className="h-8 py-1 pl-3 pr-2 text-xs border-red-200 bg-background w-[110px]">
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
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="border border-dashed border-red-300/50 rounded-md py-6 px-4 text-center bg-red-50/10 hover:bg-red-50/20 transition-colors">
                          <div className="flex flex-col items-center justify-center">
                            <div className="mb-3 bg-red-100/20 p-3 rounded-full">
                              <FileText className="h-6 w-6 text-red-500" />
                            </div>
                            <p className="text-sm font-medium mb-2 text-foreground/90">
                              Ajouter des documents supplémentaires
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

                    <div className="flex items-center gap-4">
                    <Button
                      type="submit"
                        className={`flex-1 h-12 transition-all duration-300 rounded-md shadow-md hover:shadow-lg ${
                        isSuccess
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
                      }`}
                        disabled={mutation.isPending || isUploading}
                    >
                        {mutation.isPending || isUploading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Enregistrement...
                        </>
                      ) : isSuccess ? (
                        <>
                            <Check className="mr-2 h-5 w-5" />
                            Enregistré !
                        </>
                      ) : (
                        "Enregistrer les modifications"
                      )}
                    </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée.
              {documentId && (
                <div className="mt-4 flex items-center space-x-2">
                  <Checkbox
                    id="deleteDocument"
                    checked={deleteWithDocument}
                    onCheckedChange={(checked) => setDeleteWithDocument(checked as boolean)}
                  />
                  <label
                    htmlFor="deleteDocument"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Supprimer également le document associé
                  </label>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-red-500/10">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMaintenance}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDocDelete !== null} onOpenChange={() => setShowConfirmDocDelete(null)}>
        <AlertDialogContent className="bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer le document</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer ce document de la demande de maintenance ?
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Note : Le document ne sera pas supprimé de la médiathèque mais seulement détaché de cette demande.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-red-500/10">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showConfirmDocDelete !== null) {
                  removeDocument(showConfirmDocDelete);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
              disabled={documentLoading[showConfirmDocDelete || 0]}
            >
              {documentLoading[showConfirmDocDelete || 0] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : 'Retirer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}