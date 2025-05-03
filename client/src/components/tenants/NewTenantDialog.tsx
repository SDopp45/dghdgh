import { z } from "zod";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ScrollArea,
  ScrollBar
} from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Check, Calendar, Euro, Home, User, Mail, Phone, PlusCircle, FileText, Pencil, FolderOpen, Edit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PdfUpload } from "@/components/ui/pdf-upload";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectSeparator,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { Property } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";

const leaseTypeOptions = [
  { value: "bail_meuble", label: "Bail meublé", group: "Bail d'habitation" },
  { value: "bail_vide", label: "Bail vide", group: "Bail d'habitation" },
  { value: "bail_mobilite", label: "Bail mobilité", group: "Bail d'habitation" },
  { value: "bail_etudiant", label: "Bail étudiant", group: "Bail d'habitation" },
  { value: "bail_commercial", label: "Bail commercial", group: "Bail commercial" },
  { value: "bail_professionnel", label: "Bail professionnel", group: "Bail commercial" },
  { value: "bail_saisonnier", label: "Bail saisonnier", group: "Baux spécifiques" },
  { value: "bail_terrain", label: "Bail terrain", group: "Baux spécifiques" },
  { value: "bail_garage", label: "Bail garage", group: "Baux spécifiques" },
  { value: "bail_social", label: "Bail social", group: "Baux spécifiques" },
  { value: "bail_mixte", label: "Bail mixte", group: "Baux spécifiques" },
  { value: "bail_derogatoire", label: "Bail dérogatoire", group: "Baux spécifiques" },
  { value: "bail_rehabilitation", label: "Bail réhabilitation", group: "Baux spécifiques" }
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  propertyId: z.string().min(1, "La propriété est requise"),
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Format d'email invalide").optional(),
  phoneNumber: z.string()
    .regex(/^(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})$/, "Format invalide (ex: 0612345678 ou +33612345678)")
    .optional(),
  rentAmount: z.number().min(1, "Le montant du loyer doit être supérieur à 0"),
  leaseStart: z.string().min(1, "La date de début est requise"),
  leaseEnd: z.string().min(1, "La date de fin est requise"),
  leaseType: z.enum([
    "bail_meuble",
    "bail_vide",
    "bail_commercial",
    "bail_professionnel",
    "bail_mobilite",
    "bail_etudiant",
    "bail_saisonnier",
    "bail_terrain",
    "bail_garage",
    "bail_social",
    "bail_mixte",
    "bail_derogatoire",
    "bail_rehabilitation"
  ], {
    required_error: "Le type de bail est requis"
  }),
  createTransactions: z.boolean().default(false)
});

type FormData = z.infer<typeof formSchema>;

export function NewTenantDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [key, setKey] = useState(0);
  const [documentTypes, setDocumentTypes] = useState<Map<File, string>>(new Map());
  const [documentNames, setDocumentNames] = useState<Map<File, string>>(new Map());
  const [editingDocumentName, setEditingDocumentName] = useState<File | null>(null);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  interface Folder {
    id: number;
    name: string;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
  }
  
  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      propertyId: "",
      rentAmount: 0,
      leaseStart: new Date().toISOString().split("T")[0],
      leaseEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      leaseType: "bail_vide",
      createTransactions: false
    },
  });

  // Document type configuration
  const documentTypeConfig: Record<string, { label: string; icon: JSX.Element }> = {
    "invoice": { 
      label: "Factures", 
      icon: <FileText className="h-3 w-3 text-blue-500" />
    },
    "contract": { 
      label: "Contrat", 
      icon: <FileText className="h-3 w-3 text-emerald-500" /> 
    },
    "lease": { 
      label: "Bail", 
      icon: <FileText className="h-3 w-3 text-amber-500" /> 
    },
    "form": { 
      label: "Formulaire", 
      icon: <FileText className="h-3 w-3 text-violet-500" /> 
    },
    "maintenance": { 
      label: "Entretien", 
      icon: <FileText className="h-3 w-3 text-red-500" /> 
    },
    "insurance": { 
      label: "Assurance", 
      icon: <FileText className="h-3 w-3 text-cyan-500" /> 
    },
    "tax": { 
      label: "Impôts", 
      icon: <FileText className="h-3 w-3 text-orange-500" /> 
    },
    "legal": { 
      label: "Juridique", 
      icon: <FileText className="h-3 w-3 text-gray-500" /> 
    },
    "certificate": { 
      label: "Certificat", 
      icon: <FileText className="h-3 w-3 text-green-500" /> 
    },
    "tenant": { 
      label: "Locataire", 
      icon: <FileText className="h-3 w-3 text-purple-500" /> 
    },
    "guarantor": { 
      label: "Garant", 
      icon: <FileText className="h-3 w-3 text-teal-500" /> 
    },
    "other": { 
      label: "Autre", 
      icon: <FileText className="h-3 w-3 text-gray-500" /> 
    }
  };

  // Helper function to get name without extension
  const getNameWithoutExtension = (fileName: string) => {
    return fileName.replace(/\.[^/.]+$/, "");
  };

  // Function to update document type
  const updateDocumentType = (file: File, type: string) => {
    const newDocumentTypes = new Map(documentTypes);
    newDocumentTypes.set(file, type);
    setDocumentTypes(newDocumentTypes);
  };

  // Function to update document name
  const updateDocumentName = (file: File, newName: string) => {
    const newDocumentNames = new Map(documentNames);
    const extension = file.name.split('.').pop();
    newDocumentNames.set(file, `${newName}.${extension}`);
    setDocumentNames(newDocumentNames);
  };

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use selected document type or default to 'lease'
      const docType = documentTypes.get(file) || "lease";
      formData.append('type', docType);
      
      // Use custom name if available
      const customName = documentNames.get(file);
      formData.append('title', customName || file.name);
      
      // Add the folder ID if available
      if (selectedFolderId) {
        formData.append('folderId', selectedFolderId.toString());
      }

      // Get the current form data for metadata
      const currentData = form.getValues();
      
      // Add document category and get the document type label
      const docTypeLabel = documentTypeConfig[docType]?.label || "Bail";
      
      // Add detailed metadata for better document categorization
      const formDataObj = {
        section: 'tenant',
        description: `Document Locataire\nDocument uploadé via le formulaire Locataire`,
        source: 'tenant',
        tenant: currentData.fullName,
        documentTypeLabel: docTypeLabel,
        uploadSource: 'tenant_form',
        uploadMethod: 'form',
        uploadContext: 'tenant',
        documentCategory: 'tenant',
        originalFileName: file.name,
        customFileName: customName || file.name,
        rentAmount: currentData.rentAmount || 0,
        leaseType: currentData.leaseType
      };
      
      formData.append('formData', JSON.stringify(formDataObj));

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors du téléchargement du document");
      }

      return response.json();
    }
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
      setKey(prev => prev + 1);
      toast({
        title: "✨ Dossier créé",
        description: "Le dossier a été créé avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let documentIds: number[] = [];
      
      // Upload all files if any are selected
      if (selectedFiles.length > 0) {
        try {
          // Upload each file sequentially
          for (const file of selectedFiles) {
            const uploadResult = await uploadDocumentMutation.mutateAsync(file);
            documentIds.push(uploadResult.id);
          }
        } catch (error) {
          console.error("Erreur lors du téléchargement des documents:", error);
          toast({
            title: "Erreur",
            description: "Impossible de télécharger certains documents. Le bail sera enregistré avec les documents réussis.",
            variant: "destructive",
          });
        }
      }

      const tenantData = {
        fullName: data.fullName,
        email: data.email || undefined,
        phoneNumber: data.phoneNumber || undefined,
        propertyId: parseInt(data.propertyId),
        leaseStart: data.leaseStart,
        leaseEnd: data.leaseEnd,
        rentAmount: data.rentAmount.toString(),
        leaseType: data.leaseType,
        documentIds: selectedFiles.length > 0 ? documentIds : undefined,
        createTransactions: data.createTransactions,
        tenant_id: null // Champ factice pour contourner l'erreur côté serveur
      };

      console.log("Données envoyées au serveur:", tenantData);

      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Erreur serveur détaillée:", error);
        throw new Error(error.message || "Erreur lors de l'ajout du locataire");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      toast({
        title: "✨ Locataire ajouté !",
        description: "Le locataire a été créé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setTimeout(() => {
        onOpenChange(false);
        form.reset();
        setIsSuccess(false);
        setSelectedFiles([]);
        setSelectedFolderId(null);
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

  const handleSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const availableProperties = properties.filter(p => p.status === 'available');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-hidden p-0 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:via-amber-400 dark:to-red-400 bg-clip-text text-transparent">
            Ajouter un locataire
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-slate-400">
            Remplissez les informations ci-dessous pour ajouter un nouveau locataire
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 h-full max-h-[calc(90vh-150px)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl shadow-sm border border-orange-100 dark:border-slate-700">
                <h3 className="text-lg font-medium text-orange-700 dark:text-orange-300 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations du locataire
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-orange-700 dark:text-orange-300">Nom complet</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-orange-500/70 dark:text-orange-400/50" />
                            <Input {...field} placeholder="Nom et prénom du locataire" className="pl-9 bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-gray-800 dark:text-slate-200" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-orange-700 dark:text-orange-300">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-orange-500/70 dark:text-orange-400/50" />
                            <Input {...field} type="email" placeholder="email@example.com" className="pl-9 bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-gray-800 dark:text-slate-200" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className="text-orange-700 dark:text-orange-300">Téléphone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-orange-500/70 dark:text-orange-400/50" />
                          <Input {...field} placeholder="Ex: 0612345678 ou +33612345678" type="tel" className="pl-9 bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-gray-800 dark:text-slate-200" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl shadow-sm border border-amber-100 dark:border-slate-700">
                <h3 className="text-lg font-medium text-amber-700 dark:text-amber-300 mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Informations du bail
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-700 dark:text-amber-300">Propriété</FormLabel>
                        <FormControl>
                          <Combobox
                            value={field.value}
                            onValueChange={field.onChange}
                            options={availableProperties.map(property => ({
                              value: property.id.toString(),
                              label: property.name
                            }))}
                            placeholder="Sélectionner une propriété"
                            emptyText="Aucune propriété trouvée"
                            searchPlaceholder="Rechercher une propriété..."
                            error={!!form.formState.errors.propertyId}
                            className="bg-white dark:bg-slate-800 border-amber-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-700 dark:text-amber-300">Type de bail</FormLabel>
                        <FormControl>
                          <Combobox
                            value={field.value}
                            onValueChange={field.onChange}
                            options={leaseTypeOptions}
                            placeholder="Sélectionner un type de bail"
                            emptyText="Aucun type de bail trouvé"
                            searchPlaceholder="Rechercher un type de bail..."
                            error={!!form.formState.errors.leaseType}
                            className="bg-white dark:bg-slate-800 border-amber-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="leaseStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-700 dark:text-amber-300">Début du bail</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-amber-500/70 dark:text-amber-400/50" />
                            <Input
                              type="date"
                              {...field}
                              className="pl-9 bg-white dark:bg-slate-800 border-amber-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leaseEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-700 dark:text-amber-300">Fin du bail</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-amber-500/70 dark:text-amber-400/50" />
                            <Input
                              type="date"
                              {...field}
                              className="pl-9 bg-white dark:bg-slate-800 border-amber-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className="text-amber-700 dark:text-amber-300">Montant du loyer</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Euro className="absolute left-3 top-2.5 h-4 w-4 text-amber-500/70 dark:text-amber-400/50" />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="pl-9 bg-white dark:bg-slate-800 border-amber-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                            placeholder="0.00"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-700 p-6 border-orange-200 dark:border-slate-700">
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documents
                    </h3>
                    {isCreatingFolder ? (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Nom du nouveau dossier"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
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
                          className="bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 hover:bg-orange-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200"
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
                          className="text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-slate-700"
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Combobox
                          value={selectedFolderId?.toString()}
                          onValueChange={(value) => setSelectedFolderId(parseInt(value))}
                          options={folders.map(folder => ({
                            value: folder.id.toString(),
                            label: folder.name
                          }))}
                          placeholder="Sélectionner un dossier"
                          emptyText="Aucun dossier trouvé"
                          searchPlaceholder="Rechercher un dossier..."
                          className="flex-1 bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCreatingFolder(true)}
                          className="bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 hover:bg-orange-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200"
                        >
                          <PlusCircle className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400" />
                          Nouveau
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-inner border border-orange-200 dark:border-slate-700">
                    <PdfUpload
                      key={key}
                      onFileSelected={(files) => {
                        if (Array.isArray(files)) {
                          setSelectedFiles(files);
                        } else {
                          setSelectedFiles([files]);
                        }
                      }}
                      label="Sélectionner jusqu'à 5 documents (PDF, optionnel)"
                      multiple={true}
                      maxFiles={5}
                    />
                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <motion.div
                            key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between bg-orange-50 dark:bg-slate-700 p-2 rounded-md"
                          >
                            <div className="flex items-center gap-2 flex-1 overflow-hidden">
                              <FileText className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                              {editingDocumentName === file ? (
                                <div className="relative flex-1 max-w-[230px]">
                                  <Input
                                    className="h-7 text-xs py-1 px-2 w-full pr-8 bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                                    defaultValue={getNameWithoutExtension(documentNames.get(file) || file.name)}
                                    placeholder="Nouveau nom de fichier"
                                    autoFocus
                                    onBlur={(e) => {
                                      if (e.target.value.trim()) {
                                        updateDocumentName(file, e.target.value);
                                      }
                                      setEditingDocumentName(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (e.currentTarget.value.trim()) {
                                          updateDocumentName(file, e.currentTarget.value);
                                        }
                                        setEditingDocumentName(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingDocumentName(null);
                                      }
                                    }}
                                  />
                                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-orange-400 dark:text-slate-400">.pdf</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 flex-1 overflow-hidden">
                                  <span className="text-sm truncate max-w-[150px] text-gray-800 dark:text-slate-200">
                                    {documentNames.get(file) || file.name}
                                  </span>
                                  <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setEditingDocumentName(file)}
                                    className="h-6 w-6 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300"
                                    title="Renommer le fichier"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Select 
                                value={documentTypes.get(file) || "lease"}
                                onValueChange={(value) => updateDocumentType(file, value)}
                              >
                                <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 hover:bg-orange-100 dark:hover:bg-slate-700 hover:border-orange-300 dark:hover:border-slate-500 transition-colors text-gray-800 dark:text-slate-200">
                                  <SelectValue placeholder="Type de document" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-gray-800 dark:text-slate-200">
                                  <div 
                                    className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent py-1 px-1" 
                                    onWheel={(e) => e.stopPropagation()}
                                  >
                                    <SelectGroup>
                                      <SelectLabel className="text-xs font-semibold text-orange-700 dark:text-orange-300 pl-2 py-1 pointer-events-none">Documents principaux</SelectLabel>
                                      {["contract", "lease", "form", "maintenance"].map((type) => (
                                        <SelectItem key={type} value={type} className="text-xs hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer py-1.5 px-2 my-1 rounded-md text-gray-800 dark:text-slate-200">
                                          <div className="flex items-center gap-2">
                                            {documentTypeConfig[type].icon}
                                            <span>{documentTypeConfig[type].label}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                    
                                    <SelectSeparator className="my-1 bg-orange-100 dark:bg-slate-600" />
                                    
                                    <SelectGroup>
                                      <SelectLabel className="text-xs font-semibold text-orange-700 dark:text-orange-300 pl-2 py-1 pointer-events-none">Documents légaux</SelectLabel>
                                      {["insurance", "tax", "legal", "certificate"].map((type) => (
                                        <SelectItem key={type} value={type} className="text-xs hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer py-1.5 px-2 my-1 rounded-md text-gray-800 dark:text-slate-200">
                                          <div className="flex items-center gap-2">
                                            {documentTypeConfig[type].icon}
                                            <span>{documentTypeConfig[type].label}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                    
                                    <SelectSeparator className="my-1 bg-orange-100 dark:bg-slate-600" />
                                    
                                    <SelectGroup>
                                      <SelectLabel className="text-xs font-semibold text-orange-700 dark:text-orange-300 pl-2 py-1 pointer-events-none">Documents locataires</SelectLabel>
                                      {["tenant", "guarantor"].map((type) => (
                                        <SelectItem key={type} value={type} className="text-xs hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer py-1.5 px-2 my-1 rounded-md text-gray-800 dark:text-slate-200">
                                          <div className="flex items-center gap-2">
                                            {documentTypeConfig[type].icon}
                                            <span>{documentTypeConfig[type].label}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                    
                                    <SelectSeparator className="my-1 bg-orange-100 dark:bg-slate-600" />
                                    
                                    <SelectGroup>
                                      <SelectLabel className="text-xs font-semibold text-orange-700 dark:text-orange-300 pl-2 py-1 pointer-events-none">Autre</SelectLabel>
                                      <SelectItem value="other" className="text-xs hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer py-1.5 px-2 my-1 rounded-md text-gray-800 dark:text-slate-200">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig["other"].icon}
                                          <span>{documentTypeConfig["other"].label}</span>
                                        </div>
                                      </SelectItem>
                                    </SelectGroup>
                                  </div>
                                </SelectContent>
                              </Select>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newFiles = [...selectedFiles];
                                  newFiles.splice(index, 1);
                                  setSelectedFiles(newFiles);
                                }}
                                className="h-6 px-2 hover:bg-orange-100 dark:hover:bg-slate-600 text-orange-700 dark:text-slate-300"
                              >
                                ✕
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Separator className="bg-orange-100 dark:bg-slate-700" />

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <FormField
                    control={form.control}
                    name="createTransactions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-orange-200 dark:border-slate-700 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-slate-700">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base text-orange-700 dark:text-slate-200">
                            Créer les transactions de loyer
                          </FormLabel>
                          <FormDescription className="text-amber-700 dark:text-slate-400">
                            Générer automatiquement les transactions de loyer en attente pour la durée du bail
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
                </div>
              </div>

              <Button
                type="submit"
                className={`w-full transition-all duration-300 ${
                  isSuccess
                    ? "bg-green-700 hover:bg-green-800"
                    : "bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 hover:from-orange-700 hover:via-amber-700 hover:to-red-700"
                }`}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : isSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Locataire ajouté !
                  </>
                ) : (
                  "Ajouter le locataire"
                )}
              </Button>
            </form>
          </Form>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}