import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Loader2, Check, FileText, PlusCircle, FolderIcon } from "lucide-react";
import type { Document, InsertDocument } from "@shared/schema";
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
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { PdfUpload } from "@/components/ui/pdf-upload";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phoneNumber: z.string()
    .regex(/^(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})$/, "Format invalide (ex: 0612345678 ou +33612345678)")
    .optional(),
  propertyId: z.coerce.number().min(1, "Sélectionnez une propriété"),
  leaseStart: z.string().min(1, "La date de début est requise"),
  leaseEnd: z.string().min(1, "La date de fin est requise"),
  rentAmount: z.coerce.number().min(0, "Le montant du loyer doit être positif"),
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
  })
});

type FormValues = z.infer<typeof formSchema>;

export function AddTenantDialog() {
  const [open, setOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [key, setKey] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  type Property = {
    id: number;
    name: string;
    status: string;
  };

  type Folder = {
    id: number;
    name: string;
  };

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      rentAmount: 0,
      leaseStart: new Date().toISOString().split("T")[0],
      leaseEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      leaseType: "bail_vide"
    },
  });

  const uploadSingleDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Bail locatif');
      formData.append('type', 'lease');
      formData.append('documentType', 'lease');

      if (selectedFolderId) {
        formData.append('folderId', selectedFolderId.toString());
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors du téléchargement du document');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✨ Document téléchargé",
        description: "Le bail a été ajouté avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
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
      if (files.length === 0) return { documents: [] };

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('type', 'lease');
      formData.append('documentType', 'lease');
      formData.append('title', 'Bail locatif');
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
      const count = data.count || 0;
      toast({
        title: "✨ Documents téléchargés",
        description: `${count} document${count > 1 ? 's ont' : ' a'} été ajouté${count > 1 ? 's' : ''} avec succès`,
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
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

  const createTenantMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let documentId;
      
      // Si nous avons plusieurs fichiers (selectedFiles), utiliser l'upload multiple
      if (selectedFiles && selectedFiles.length > 0) {
        try {
          const uploadResults = await uploadMultipleDocumentsMutation.mutateAsync(selectedFiles);
          
          // Utiliser le premier document comme document principal
          if (uploadResults.documents && uploadResults.documents.length > 0) {
            documentId = uploadResults.documents[0].id;
          }
        } catch (error) {
          console.error("Erreur lors du téléchargement des documents:", error);
          // Continue without documents if upload fails
        }
      }
      // Sinon, si nous n'avons qu'un seul fichier, utiliser l'upload simple
      else if (selectedFile) {
        try {
          const uploadResult = await uploadSingleDocumentMutation.mutateAsync(selectedFile);
          documentId = uploadResult.id;
        } catch (error) {
          console.error("Erreur lors du téléchargement du document:", error);
          // Continue without document if upload fails
        }
      }

      const requestData = {
        ...values,
        documentId,
        propertyId: parseInt(values.propertyId.toString()),
        rentAmount: Number(values.rentAmount),
        phoneNumber: values.phoneNumber || null,
        createTransaction: true,
        transactionData: {
          amount: Number(values.rentAmount),
          type: 'income',
          category: 'rent',
          frequency: 'monthly',
          startDate: values.leaseStart,
          endDate: values.leaseEnd,
          status: 'pending'
        }
      };

      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'ajout du locataire");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      setIsSuccess(true);
      toast({
        title: "✅ Succès",
        description: "Le locataire a été ajouté avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });
      
      setTimeout(() => {
        form.reset();
        setOpen(false);
        setIsSuccess(false);
        setSelectedFile(null);
        setSelectedFiles([]);
        setSelectedFolderId(null);
        setIsCreatingFolder(false);
        setNewFolderName("");
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      await createTenantMutation.mutateAsync(values);
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'ajout du locataire",
        variant: "destructive",
      });
    }
  };

  const availableProperties = properties.filter(prop => prop.status === "available");
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 hover:from-rose-600 hover:via-pink-600 hover:to-fuchsia-600 shadow-lg hover:shadow-xl transition-all duration-300 animate-gradient-x">
          <Plus className="h-4 w-4" />
          Ajouter un locataire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau locataire</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nom et prénom du locataire" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de téléphone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: 0612345678 ou +33612345678" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propriété</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une propriété" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProperties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leaseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de bail</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type de bail" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Bail d'habitation</SelectLabel>
                        <SelectItem value="bail_meuble">Bail meublé</SelectItem>
                        <SelectItem value="bail_vide">Bail vide</SelectItem>
                        <SelectItem value="bail_mobilite">Bail mobilité</SelectItem>
                        <SelectItem value="bail_etudiant">Bail étudiant</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Bail commercial</SelectLabel>
                        <SelectItem value="bail_commercial">Bail commercial</SelectItem>
                        <SelectItem value="bail_professionnel">Bail professionnel</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Baux spécifiques</SelectLabel>
                        <SelectItem value="bail_saisonnier">Bail saisonnier</SelectItem>
                        <SelectItem value="bail_terrain">Bail terrain</SelectItem>
                        <SelectItem value="bail_garage">Bail garage</SelectItem>
                        <SelectItem value="bail_social">Bail social</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Autres types de bail</SelectLabel>
                        <SelectItem value="bail_mixte">Bail mixte</SelectItem>
                        <SelectItem value="bail_derogatoire">Bail dérogatoire</SelectItem>
                        <SelectItem value="bail_rehabilitation">Bail réhabilitation</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leaseStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début du bail</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={today}
                        {...field}
                      />
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
                    <FormLabel>Fin du bail</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={form.watch("leaseStart") || today}
                        {...field}
                      />
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
                <FormItem>
                  <FormLabel>Montant du loyer (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <Card className="p-4 bg-gradient-to-br from-background to-muted/20 border-border/50">
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Dossier de destination (optionnel)</label>
                  {isCreatingFolder ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Nom du nouveau dossier"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="flex-1"
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
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedFolderId?.toString()}
                        onValueChange={(value) => setSelectedFolderId(parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un dossier" />
                        </SelectTrigger>
                        <SelectContent>
                          {folders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id.toString()}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreatingFolder(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Nouveau
                      </Button>
                    </div>
                  )}
                </div>

                <PdfUpload
                  key={key}
                  onFileSelected={(files) => {
                    if (Array.isArray(files)) {
                      setSelectedFiles(files);
                      if (files.length > 0) setSelectedFile(files[0]);
                    } else {
                      setSelectedFile(files);
                      setSelectedFiles([files]);
                    }
                  }}
                  label="Sélectionner le(s) document(s) du bail (PDF, optionnel)"
                  multiple={true}
                  maxFiles={5}
                />

                {selectedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {selectedFiles.map((file, index) => (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Document {index + 1} : {file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFiles = selectedFiles.filter((_, i) => i !== index);
                            setSelectedFiles(newFiles);
                            if (newFiles.length > 0) {
                              setSelectedFile(newFiles[0]);
                            } else {
                              setSelectedFile(null);
                            }
                          }}
                          className="h-6 px-2"
                        >
                          ✕
                        </Button>
                      </motion.p>
                    ))}
                  </motion.div>
                )}
              </div>
            </Card>

            <Button type="submit" className="w-full" disabled={createTenantMutation.isPending}>
              {createTenantMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout en cours...
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
      </DialogContent>
    </Dialog>
  );
}