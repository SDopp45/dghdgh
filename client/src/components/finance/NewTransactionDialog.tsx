import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema, type Transaction } from "../../../../shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { PDFUpload } from "@/components/ui/pdf-upload";
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { FileText as FileTextIcon, X, Plus, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, CreditCard as CreditCardIcon, Calendar, Building2, Tag, FileText, FilePenLine, FileSignature, Clipboard, FileSearch, FileCheck, FileIcon, FileSpreadsheet, Euro, Mail, FileImage, HelpCircle, AlertCircle, PlusCircle, Loader2, Pencil, Clock, Eye, Receipt, Check, CreditCard, Folder } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExtendedTransaction extends Omit<Transaction, 'documentIds'> {
  documentId: number | null;
  documentIds: number[] | null;
}

const transactionFormSchema = insertTransactionSchema.omit({ userId: true }).extend({
  amount: z.coerce.number({
    required_error: "Le montant est requis",
    invalid_type_error: "Le montant doit être un nombre valide"
  }).min(0, {
    message: "Le montant doit être égal ou supérieur à zéro"
  }),
  date: z.string({
    required_error: "La date est requise"
  }),
  description: z.string().optional(),
  documents: z.object({
    files: z.array(z.instanceof(File)),
    folderId: z.number().nullable()
  }).optional()
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface DocumentWithType {
  file: File;
  type: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: ExtendedTransaction;
  initialTransactions?: TransactionFormData[];
}

interface Property {
  id: number;
  name: string;
}

interface Folder {
  id: number;
  name: string;
  path: string;
}

interface DocumentTypeConfig {
  [key: string]: {
    label: string;
    icon: JSX.Element;
  };
}

export function NewTransactionDialog({ open, onOpenChange, editingTransaction, initialTransactions }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<TransactionFormData[]>([{
    type: "income",
    propertyId: null as unknown as number,
    tenantId: null,
    category: "rent",
    amount: 0,
    description: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: "bank_transfer",
    status: "pending",
    documents: {
      files: [],
      folderId: null
    }
  }]);
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [documentIds, setDocumentIds] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [key, setKey] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<number | null>(null); 
  const [documentTypes, setDocumentTypes] = useState<Map<File, string>>(new Map());
  const [documentNames, setDocumentNames] = useState<Map<File, string>>(new Map());
  const [editingDocumentName, setEditingDocumentName] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  // Ajouter un état pour stocker les documents validés associés à la transaction
  const [existingDocuments, setExistingDocuments] = useState<{ id: number, title: string, type: string }[]>([]);
  const [isLoadingExistingDocs, setIsLoadingExistingDocs] = useState(false);
  // Ajouter ces nouveaux états pour le dialogue de progression
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressStep, setProgressStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(1);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [progressStatus, setProgressStatus] = useState<'processing' | 'success' | 'error'>('processing');

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: editingTransaction?.type || "income",
      propertyId: editingTransaction?.propertyId || (null as unknown as number),
      tenantId: editingTransaction?.tenantId || null,
      category: (editingTransaction?.category as "rent" | "maintenance" | "insurance" | "tax" | "utility" | "other") || "rent",
      amount: editingTransaction ? Number(editingTransaction.amount) : 0,
      description: editingTransaction?.description || "",
      date: editingTransaction?.date
        ? format(new Date(editingTransaction.date), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: editingTransaction?.paymentMethod || "bank_transfer",
      status: (editingTransaction?.status as "pending" | "completed" | "cancelled" | "failed" | "deleted" | "archived") || "pending",
    }
  });

  useEffect(() => {
    if (editingTransaction) {
      form.reset({
        type: editingTransaction.type,
        propertyId: editingTransaction.propertyId,
        tenantId: editingTransaction.tenantId,
        category: editingTransaction.category as "rent" | "maintenance" | "insurance" | "tax" | "utility" | "other",
        amount: Number(editingTransaction.amount),
        description: editingTransaction.description || "",
        date: format(new Date(editingTransaction.date), 'yyyy-MM-dd'),
        paymentMethod: editingTransaction.paymentMethod || "bank_transfer",
        status: editingTransaction.status as "pending" | "completed" | "cancelled" | "failed" | "deleted" | "archived",
      });
      
      // Verify document references and filter out any that are invalid
      const validateDocuments = async () => {
        try {
          // Validate single document reference
          if (editingTransaction.documentId) {
            try {
              const response = await fetch(`/api/documents/${editingTransaction.documentId}`);
              if (response.ok) {
                setDocumentId(editingTransaction.documentId);
      setPreviewDocument(editingTransaction.documentId);
              } else {
                console.warn(`Document ${editingTransaction.documentId} not found, removing reference`);
                setDocumentId(null);
                setPreviewDocument(null);
              }
            } catch (error) {
              console.error(`Error validating document ${editingTransaction.documentId}:`, error);
              setDocumentId(null);
              setPreviewDocument(null);
            }
          }
          
          // Validate multiple document references
      if (editingTransaction.documentIds && editingTransaction.documentIds.length > 0) {
            const validDocIds: number[] = [];
            
            for (const docId of editingTransaction.documentIds) {
              try {
                const response = await fetch(`/api/documents/${docId}`);
                if (response.ok) {
                  validDocIds.push(docId);
                } else {
                  console.warn(`Document ${docId} not found, will be removed from references`);
                }
              } catch (error) {
                console.error(`Error validating document ${docId}:`, error);
              }
            }
            
            setDocumentIds(validDocIds);
            
            // If no valid single document but we have valid multiple documents, use the first one for preview
            if (!documentId && validDocIds.length > 0) {
              setPreviewDocument(validDocIds[0]);
            }
            
            console.log(`Validated ${validDocIds.length} of ${editingTransaction.documentIds.length} documents`);
          }
        } catch (error) {
          console.error("Error validating document references:", error);
        }
      };
      
      validateDocuments();
    }
  }, [editingTransaction, form]);

  useEffect(() => {
    if (!open) {
      // Nettoyer tous les états liés aux documents
      setDocumentId(null);
      setDocumentIds([]);
      setSelectedFile(null);
      setSelectedFiles([]);
      setSelectedFolderId(null);
      setIsCreatingFolder(false);
      setNewFolderName("");
      setKey(key + 1);
      setPreviewDocument(null); 
      setDocumentTypes(new Map());
      setDocumentNames(new Map());
      setEditingDocumentName(null);
    }
  }, [open]);

  useEffect(() => {
    if (currentTransactionIndex < transactions.length) {
      const currentTransaction = transactions[currentTransactionIndex];
      form.reset({
        type: currentTransaction.type,
        propertyId: currentTransaction.propertyId,
        tenantId: currentTransaction.tenantId,
        category: currentTransaction.category,
        amount: currentTransaction.amount,
        description: currentTransaction.description,
        date: currentTransaction.date,
        paymentMethod: currentTransaction.paymentMethod,
        status: currentTransaction.status,
      });
    }
  }, [currentTransactionIndex, transactions, form]);

  useEffect(() => {
    // Si des transactions initiales sont fournies et que c'est la première ouverture
    if (initialTransactions && initialTransactions.length > 0 && open) {
      setTransactions(initialTransactions);
      
      // Mettre à jour le formulaire avec les données de la première transaction
      if (initialTransactions[0]) {
        form.reset(initialTransactions[0]);
      }
      
      // Réinitialiser au prochain cycle pour éviter de réinitialiser les données après la fermeture
      return () => {
        // Ne rien faire ici, c'est juste pour s'assurer que l'effet ne se lance qu'une fois
      };
    }
  }, [initialTransactions, open, form]);

  const onFormChange = (data: Partial<TransactionFormData>) => {
    updateTransactionForm(currentTransactionIndex, data);
  };

  const uploadDocument = async () => {
    if (!selectedFile) return null;

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Récupérer le type du document s'il existe, sinon utiliser "invoice" par défaut
    const docType = documentTypes.get(selectedFile) || "invoice";
    console.log(`Document type for file ${selectedFile.name}:`, docType);
    formData.append('type', docType);
    
    // Ajouter le titre (nom personnalisé ou nom du fichier par défaut)
    const customName = documentNames.get(selectedFile);
    formData.append('title', customName || selectedFile.name);
    console.log(`Custom name for file ${selectedFile.name}:`, customName || 'not set');
    
    // Ajouter l'ID du dossier si disponible
    if (selectedFolderId) {
      formData.append('folderId', selectedFolderId.toString());
    }

    const currentData = form.getValues();
    const isMaintenance = currentData.category === 'maintenance';
    const documentCategory = isMaintenance ? 'maintenance' : 'finance';
    const documentDescription = isMaintenance 
      ? `Document de maintenance associé à une transaction de ${currentData.amount}€`
      : `Document financier associé à une transaction de ${currentData.amount}€`;

    // Récupérer le libellé du type de document pour l'affichage
    const docTypeLabel = documentTypeConfig[docType]?.label || "Factures";
    console.log(`Document type label for file ${selectedFile.name}:`, docTypeLabel);

    // Ajouter des métadonnées spécifiques pour la section finance
    const formDataObj = {
      section: 'finance',
      description: `Document financier\nDocument uploadé via le formulaire Finances`,
      source: 'finance',
      transactionType: currentData.type,
      documentTypeLabel: docTypeLabel,
      uploadSource: 'finance',
      uploadMethod: 'form',
      uploadContext: 'transaction',
      documentCategory: documentCategory,
      originalFileName: selectedFile.name,
      customFileName: customName || selectedFile.name
    };
    console.log(`FormData for file ${selectedFile.name}:`, formDataObj);
    formData.append('formData', JSON.stringify(formDataObj));

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Erreur lors du téléchargement du document");

      const data = await response.json();
      console.log(`Upload response for file ${selectedFile.name}:`, data);
      return data.id;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le document"
      });
      throw error;
    }
  };
  
  // Nouvelle fonction pour télécharger plusieurs documents
  const uploadMultipleDocuments = async () => {
    try {
    if (!selectedFiles || selectedFiles.length === 0) return [];

      console.log(`Uploading ${selectedFiles.length} documents...`);
      
      // Préparer l'objet qui contient les noms personnalisés des fichiers
      const customNamesObj: Record<string, string> = {};
      selectedFiles.forEach(file => {
        const customName = documentNames.get(file);
        if (customName) {
          customNamesObj[file.name] = customName;
        }
      });
      
      // Convertir l'objet en JSON s'il y a des noms personnalisés
      const customNamesJson = Object.keys(customNamesObj).length > 0 
        ? JSON.stringify(customNamesObj) 
        : null;
      
      console.log('Custom names for files:', customNamesObj);

      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        // Récupérer le type du document s'il existe, sinon utiliser "invoice" par défaut
        const docType = documentTypes.get(file) || "invoice";
        console.log(`Document type for file ${file.name}:`, docType);
        
        // Utiliser le type tel quel sans conversion
        formData.append('type', docType);
        
        // Ajouter le titre (nom personnalisé ou nom du fichier par défaut)
        const customName = documentNames.get(file);
        formData.append('title', customName || file.name);
        
        // Ajouter l'ID du dossier si disponible
        if (selectedFolderId) {
          formData.append('folderId', selectedFolderId.toString());
        }

        const currentData = form.getValues();
        const isMaintenance = currentData.category === 'maintenance';
        const documentCategory = isMaintenance ? 'maintenance' : 'finance';
        const documentDescription = isMaintenance 
          ? `Document de maintenance associé à une transaction de ${currentData.amount}€`
          : `Document financier associé à une transaction de ${currentData.amount}€`;

        // Récupérer le libellé du type de document pour l'affichage
        const docTypeLabel = documentTypeConfig[docType]?.label || "Factures";
        console.log(`Document type label for file ${file.name}:`, docTypeLabel);

        // Ajouter des métadonnées spécifiques pour la section finance
        const formDataObj = {
          section: 'finance',
          description: `Document financier\nDocument uploadé via le formulaire Finances`,
          source: 'finance',
          transactionType: currentData.type,
          documentTypeLabel: docTypeLabel,
          uploadSource: 'finance',
          uploadMethod: 'form',
          uploadContext: 'transaction',
          documentCategory: documentCategory,
          originalFileName: file.name,
          customFileName: customName || file.name
        };
        console.log(`FormData for file ${file.name}:`, formDataObj);
        formData.append('formData', JSON.stringify(formDataObj));

        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Erreur lors du téléchargement de ${file.name}`);

        const data = await response.json();
        return data.id;
      });

      // Exécute toutes les promesses en parallèle
      const documentIds = await Promise.all(uploadPromises);
      console.log(`Uploaded ${documentIds.length} documents`, documentIds);
      return documentIds;
    } catch (error) {
      console.error('Error uploading multiple documents:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger certains documents"
      });
      throw error;
    }
  };

  const createTransaction = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      let docId = documentId;
      let docIds: number[] = [];

      // Priorité au mode multiple
      if (selectedFiles && selectedFiles.length > 0) {
        try {
          docIds = await uploadMultipleDocuments();
          console.log("Multiple documents uploaded:", docIds);
        } catch (error) {
          console.error("Error uploading multiple documents:", error);
          throw error;
        }
      } 
      // Fallback au mode unique si aucun fichier multiple n'est sélectionné
      else if (selectedFile) {
        try {
          docId = await uploadDocument();
          console.log("Single document uploaded:", docId);
          // Ajouter l'ID du document au tableau docIds également
          if (docId) {
            docIds = [docId];
          }
    } catch (error) {
          console.error("Error uploading single document:", error);
      throw error;
    }
      }

      const transformedData = {
        ...data,
        amount: parseFloat(data.amount.toString()),
        date: parseISO(data.date),
        documentId: docId,
        documentIds: docIds, // Toujours envoyer documentIds, même vide
          };

      // Loguer les données transformées pour débogage
      console.log("Données envoyées au serveur:", transformedData);
      console.log("documentIds envoyés:", transformedData.documentIds);

          return apiRequest("/api/transactions", {
            method: "POST",
        body: JSON.stringify(transformedData),
          });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Succès",
        description: "Transaction créée avec succès"
      });
      onOpenChange(false);
      form.reset();
      setDocumentId(null);
      setDocumentIds([]);
      setSelectedFile(null);
      setSelectedFiles([]);
      setSelectedFolderId(null);
      setPreviewDocument(null); 
    },
    onError: (error: Error) => {
      console.error("Erreur lors de la création:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la transaction",
        variant: "destructive",
      });
    }
  });

  const updateTransaction = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!editingTransaction?.id) {
        throw new Error("ID de transaction manquant");
      }

      let docId = documentId;
      let docIds: number[] = [];

      // Priorité au mode multiple
      if (selectedFiles && selectedFiles.length > 0) {
        try {
          docIds = await uploadMultipleDocuments();
          console.log("Multiple documents uploaded during update:", docIds);
        } catch (error) {
          console.error("Error uploading multiple documents during update:", error);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de télécharger certains documents"
          });
          throw error;
        }
      } 
      // Fallback au mode unique si aucun fichier multiple n'est sélectionné
      else if (selectedFile) {
        try {
          docId = await uploadDocument();
          console.log("Single document uploaded during update:", docId);
        } catch (error) {
          console.error("Error uploading single document during update:", error);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de télécharger le document"
          });
          throw error;
        }
      }

      // Utiliser les valeurs existantes si elles ne sont pas fournies
      const transformedData = {
        ...editingTransaction,
        ...data,
        // Si le montant n'est pas fourni ou est égal à 0, utiliser le montant existant
        amount: data.amount ? parseFloat(data.amount.toString()) : Number(editingTransaction.amount),
        // Si la description n'est pas fournie ou est vide, utiliser la description existante
        description: data.description || editingTransaction.description || "",
        date: parseISO(data.date || format(new Date(editingTransaction.date), 'yyyy-MM-dd')),
        documentId: docId || editingTransaction.documentId,
        documentIds: docIds.length > 0 ? docIds : (editingTransaction.documentIds || []),
      };

      return apiRequest(`/api/transactions/${editingTransaction.id}`, {
        method: "PUT",
        body: JSON.stringify(transformedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Succès",
        description: "Transaction modifiée avec succès"
      });
      onOpenChange(false);
      setDocumentId(null);
      setDocumentIds([]);
      setSelectedFile(null);
      setSelectedFiles([]);
      setPreviewDocument(null); 
    },
    onError: (error: Error) => {
      console.error("Erreur lors de la modification:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la transaction",
        variant: "destructive",
      });
    }
  });

  const addNewTransaction = () => {
    setTransactions(prev => [...prev, {
      type: "income",
      propertyId: null as unknown as number,
      tenantId: null,
      category: "rent",
      amount: 0,
      description: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: "bank_transfer",
      status: "pending",
      documents: {
        files: [],
        folderId: null
      }
    }]);
    const newIndex = transactions.length;
    setCurrentTransactionIndex(newIndex);
    setKey(key => key + 1);
  };

  const removeTransaction = (index: number) => {
    if (transactions.length > 1) {
      setTransactions(prev => prev.filter((_, i) => i !== index));
      
      // Ajuster l'index courant en fonction de ce qui a été supprimé
      setCurrentTransactionIndex(prev => {
        // Si on supprime une transaction avant l'index courant, on décrémente l'index
        if (index < prev) return prev - 1;
        // Si on supprime la transaction courante ou après, on reste sur le même index
        // (qui pointera vers la transaction suivante après suppression)
        // Mais on s'assure de ne pas dépasser la nouvelle longueur
        return Math.min(prev, transactions.length - 2);
      });
    }
  };

  const updateTransactionForm = (index: number, data: Partial<TransactionFormData>) => {
    setTransactions(prev => prev.map((t, i) => {
      if (i === index) {
        const updatedTransaction = {
          ...t,
          ...data,
          // Préserver les documents existants si non explicitement fournis dans data
          documents: data.documents 
            ? {
                // Si files est fourni, l'utiliser, sinon conserver l'existant
                files: data.documents.files || t.documents?.files || [],
                // Si folderId est fourni, l'utiliser, sinon conserver l'existant
                folderId: data.documents.folderId !== undefined 
                  ? data.documents.folderId 
                  : t.documents?.folderId || null
              }
            : t.documents || { files: [], folderId: null }
        };
        
        // Log pour déboguer
        console.log(`Mise à jour de la transaction ${index + 1}`);
        console.log(`Nombre de documents après mise à jour: ${updatedTransaction.documents?.files?.length || 0}`);
        
        return updatedTransaction;
      }
      return t;
    }));
  };

  const handleFileSelected = (files: File | File[]) => {
    const fileArray = Array.isArray(files) ? files : [files];
    const currentTransaction = transactions[currentTransactionIndex];
    const existingFiles = currentTransaction.documents?.files || [];
    
    // Fusionner les fichiers existants avec les nouveaux fichiers
    // Utiliser Set pour éviter les doublons basés sur le nom de fichier
    const fileSet = new Set([...existingFiles, ...fileArray].map(file => file.name));
    const uniqueFiles = [...existingFiles];
    
    // Ajouter seulement les nouveaux fichiers
    fileArray.forEach(file => {
      if (!existingFiles.some(existing => existing.name === file.name)) {
        uniqueFiles.push(file);
      }
    });
    
    console.log(`Fichiers sélectionnés: ${fileArray.length}`);
    console.log(`Fichiers existants: ${existingFiles.length}`);
    console.log(`Fichiers totaux après fusion: ${uniqueFiles.length}`);
    
    // Conserver le dossier sélectionné actuel
    const currentFolderId = currentTransaction.documents?.folderId || selectedFolderId;
    
    updateTransactionForm(currentTransactionIndex, {
      documents: {
        files: uniqueFiles,
        folderId: currentFolderId
      }
    });
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      // Afficher le dialogue de progression
      setShowProgressDialog(true);
      setProgressStatus('processing');
      setProgressMessage('Préparation des transactions...');
      // Corriger le calcul du nombre total d'étapes - une étape par transaction, pas deux
      setTotalSteps(transactions.length);
      setProgressStep(0);
      setProgressPercentage(0);

      // S'assurer que les transactions ont les dernières données du formulaire actuel
      if (currentTransactionIndex < transactions.length) {
        const currentFormValues = form.getValues();
        updateTransactionForm(currentTransactionIndex, currentFormValues);
      }

      // Traiter toutes les transactions
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        try {
          setProgressMessage(`Traitement de la transaction ${i+1}/${transactions.length}...`);
          // Mise à jour de l'étape de progression - une seule étape par transaction
          setProgressStep(i);
          setProgressPercentage(Math.round(i / totalSteps * 100));

          // Préparer les données explicitement
          const transactionData = {
            ...transaction,
            documents: undefined,
            documentId: null,
            documentIds: []
          };
          
          // Create transaction 
          const newTransaction = await createTransaction.mutateAsync(transactionData);
          
          // Mise à jour du pourcentage uniquement, pas de nouvelle étape
          setProgressPercentage(Math.round((i + 0.5) / totalSteps * 100));
          setProgressMessage(`Finalisation de la transaction ${i+1}/${transactions.length}...`);
          
          // Si nous avons des documents à uploader, les associer à la transaction créée
        if (transaction.documents?.files?.length) {
            try {
          const files = transaction.documents.files;
              
              // Préparer le FormData pour l'upload multiple
              const formData = new FormData();
              
              // Ajouter chaque fichier
              files.forEach(file => {
                formData.append('documents', file);
              });
          
          // Préparer l'objet qui contient les noms personnalisés des fichiers
              const customNamesObj: Record<string, string> = {};
          files.forEach(file => {
            const customName = documentNames.get(file);
            if (customName) {
              customNamesObj[file.name] = customName;
            }
          });
          
              // Ajouter les noms personnalisés
              if (Object.keys(customNamesObj).length > 0) {
                formData.append('customNames', JSON.stringify(customNamesObj));
              }
              
              // Préparer les types de documents
              const docTypesObj: Record<string, string> = {};
              files.forEach(file => {
            const docType = documentTypes.get(file) || "invoice";
                docTypesObj[`documentTypes[${file.name}]`] = docType;
              });
              
              // Ajouter les types de documents
              formData.append('documentTypes', JSON.stringify(docTypesObj));
              
              console.log("Upload des documents pour la transaction", newTransaction.id);
              console.log("Types de documents:", docTypesObj);
              console.log("Noms personnalisés:", customNamesObj);
              
              // Utiliser l'endpoint spécifique pour ajouter des documents à une transaction
              const uploadResponse = await fetch(`/api/transactions/${newTransaction.id}/documents`, {
              method: 'POST',
              body: formData
            });

              if (!uploadResponse.ok) {
                throw new Error(`Erreur lors de l'upload des documents pour la transaction ${newTransaction.id}`);
              }
              
              const uploadResult = await uploadResponse.json();
              console.log("Résultat de l'upload:", uploadResult);
              
              // Vérifier que les documents ont bien été associés
              if (uploadResult.documentIds && uploadResult.documentIds.length > 0) {
                console.log("Documents associés avec succès:", uploadResult.documentIds);
              } else {
                console.warn("Aucun document n'a été associé à la transaction");
              }
            } catch (error) {
              console.error("Erreur lors de l'upload des documents:", error);
              throw error;
            }
          }
        } catch (error) {
          console.error(`Erreur lors du traitement de la transaction ${i+1}:`, error);
          setProgressStatus('error');
          setProgressMessage(`Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`);
          
          toast({
            variant: "destructive",
            title: "Erreur",
            description: `Erreur lors du traitement de la transaction ${i+1}.`
          });
          
          // Attendre un moment avant de fermer le dialogue de progression en cas d'erreur
          setTimeout(() => {
            setShowProgressDialog(false);
          }, 3000);
          
          return;
        }
      }
      
      // Toutes les transactions ont été traitées avec succès
      setProgressStatus('success');
      setProgressPercentage(100);
      setProgressMessage('Opération terminée avec succès !');
      
      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      // Afficher un message de succès
      toast({
        title: "✅ Succès",
        description: editingTransaction 
          ? "Transaction modifiée avec succès" 
          : `${transactions.length} transaction${transactions.length > 1 ? 's' : ''} créée${transactions.length > 1 ? 's' : ''} avec succès`,
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/30",
      });
      
      // Attendre un moment pour que l'utilisateur voie le succès avant de fermer
      setTimeout(() => {
        setShowProgressDialog(false);
        onOpenChange(false);
      }, 2000);
      
    } catch (error) {
      console.error('Erreur globale:', error);
      setProgressStatus('error');
      setProgressMessage(`Erreur: ${error instanceof Error ? error.message : 'Une erreur est survenue'}`);
      
      setTimeout(() => {
        setShowProgressDialog(false);
      }, 3000);
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors du traitement des transactions."
      });
    }
  };

  const formatPropertiesForSelect = (properties: Property[] = []) => {
    return properties.map(property => ({
      value: property.id.toString(),
      label: `${property.name} (ID: ${property.id})`
    }));
  };

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('/api/folders', {
        method: 'POST',
        body: JSON.stringify({ name, path: "", section: "finance" }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      
      // Mettre à jour le selectedFolderId
      setSelectedFolderId(data.id);
      
      // Mettre à jour la transaction actuelle avec le nouveau dossier
      const currentTransaction = transactions[currentTransactionIndex];
      updateTransactionForm(currentTransactionIndex, {
        documents: {
          files: currentTransaction.documents?.files || [],
          folderId: data.id
        }
      });
      
      setIsCreatingFolder(false);
      setNewFolderName("");
      setKey(prev => prev + 1);
      
      toast({
        title: "✨ Dossier créé",
        description: "Le dossier a été créé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
      
      console.log(`Nouveau dossier créé et associé à la transaction ${currentTransactionIndex + 1}:`, data.id);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleFolderChange = (folderId: number | null) => {
    setSelectedFolderId(folderId);
    
    // Mettre à jour le dossier pour la transaction actuelle
    updateTransactionForm(currentTransactionIndex, {
      documents: {
        files: transactions[currentTransactionIndex].documents?.files || [],
        folderId
      }
    });
    
    // Log pour le débogage
    console.log(`Dossier mis à jour pour la transaction ${currentTransactionIndex + 1}:`, folderId);
  };

  const formatFoldersForSelect = (folders: any[] = []) => {
    return folders.map(folder => ({
      value: folder.id.toString(),
      label: folder.name
    }));
  };

  useEffect(() => {
    const transaction = transactions[currentTransactionIndex];
    if (transaction) {
      // Ne pas incrémenter la clé à chaque changement car cela provoque des rechargements
      // setKey(key => key + 1);
      
      // Mettre à jour le dossier sélectionné avec celui de la transaction courante
      setSelectedFolderId(transaction.documents?.folderId || null);
      
      // Mettre à jour le type pour chaque document de cette transaction
      if (transaction.documents?.files?.length) {
        const newDocTypes = new Map(documentTypes);
        transaction.documents.files.forEach(file => {
          if (!newDocTypes.has(file)) {
            newDocTypes.set(file, "invoice");
          }
        });
        setDocumentTypes(newDocTypes);
      }
      
      // Ajouter un log pour déboguer
      console.log(`Changement vers la transaction ${currentTransactionIndex + 1}`);
      console.log(`Nombre de documents: ${transaction.documents?.files?.length || 0}`);
      console.log(`Documents:`, transaction.documents?.files);
    }
  }, [currentTransactionIndex, transactions]);

  // Créer un objet validDocumentTypes plus diversifié
  const validDocumentTypes = [
    "invoice",  // Facture
    "receipt",  // Reçu
    "contract", // Contrat
    "quote",    // Devis
    "lease",    // Bail
    "tax",      // Document fiscal
    "insurance",// Assurance
    "bank",     // Relevé bancaire
    "legal",    // Document légal
    "report",   // Rapport
    "other"     // Autre
  ] as const;
  
  type ValidDocumentType = typeof validDocumentTypes[number];

  // Document type configuration
  const documentTypeConfig: DocumentTypeConfig = {
    "invoice": { 
      label: "Factures", 
      icon: <CreditCardIcon className="h-3 w-3 text-blue-500" />
    },
    "receipt": { 
      label: "Reçu", 
      icon: <Receipt className="h-3 w-3 text-green-500" />
    },
    "contract": { 
      label: "Contrat", 
      icon: <FilePenLine className="h-3 w-3 text-emerald-500" /> 
    },
    "quote": { 
      label: "Devis", 
      icon: <FileText className="h-3 w-3 text-orange-500" /> 
    },
    "lease": { 
      label: "Bail", 
      icon: <FileSignature className="h-3 w-3 text-amber-500" /> 
    },
    "tax": { 
      label: "Impôts", 
      icon: <FileIcon className="h-3 w-3 text-orange-500" /> 
    },
    "insurance": { 
      label: "Assurance", 
      icon: <FileCheck className="h-3 w-3 text-cyan-500" /> 
    },
    "bank": { 
      label: "Relevé bancaire", 
      icon: <Euro className="h-3 w-3 text-blue-500" /> 
    },
    "legal": { 
      label: "Juridique", 
      icon: <FileSpreadsheet className="h-3 w-3 text-gray-500" /> 
    },
    "report": { 
      label: "Rapport", 
      icon: <FileSpreadsheet className="h-3 w-3 text-violet-500" /> 
    },
    "other": { 
      label: "Autre", 
      icon: <FileIcon className="h-3 w-3 text-gray-500" /> 
    }
  };
  
  // Définir les types de transactions avec leurs catégories associées
  const categoryByType = {
    income: [
      { value: "rent", label: "Loyer" },
      { value: "security_deposit", label: "Dépôt de garantie" },
      { value: "refund", label: "Remboursement" },
      { value: "commission", label: "Commission" },
      { value: "late_fees", label: "Pénalités de retard" },
      { value: "service_fees", label: "Frais de service" },
      { value: "application_fees", label: "Frais de dossier" },
      { value: "short_term_rental", label: "Location courte durée" },
      { value: "parking_income", label: "Revenus parking/garage" },
      { value: "common_area_income", label: "Revenus espaces communs" },
      { value: "additional_services", label: "Services additionnels" },
      { value: "advertising_income", label: "Revenus publicitaires" },
      { value: "subsidies", label: "Subventions ou aides" },
      { value: "insurance_claims", label: "Indemnités d'assurance" },
      { value: "property_sale", label: "Vente de bien" },
      { value: "dividend_income", label: "Revenus de dividendes" },
      { value: "interest_income", label: "Revenus d'intérêts" },
      { value: "rental_equipment", label: "Location d'équipements" },
      { value: "other", label: "Autre revenu" }
    ],
    expense: [
      { value: "maintenance", label: "Maintenance" },
      { value: "insurance", label: "Assurance" },
      { value: "tax", label: "Taxe" },
      { value: "utility", label: "Charges générales" },
      { value: "management_fee", label: "Frais de gestion" },
      { value: "legal_fee", label: "Frais juridiques" },
      { value: "renovation", label: "Rénovation" },
      { value: "condominium_fee", label: "Charges copropriété" },
      { value: "marketing", label: "Marketing" },
      { value: "inspection", label: "Inspection" },
      { value: "cleaning", label: "Nettoyage" },
      { value: "furnishing", label: "Ameublement" },
      { value: "security", label: "Sécurité" },
      { value: "landscaping", label: "Espaces verts" },
      { value: "utilities_water", label: "Eau" },
      { value: "utilities_electricity", label: "Électricité" },
      { value: "utilities_gas", label: "Gaz" },
      { value: "utilities_internet", label: "Internet/Télécom" },
      { value: "accounting", label: "Comptabilité" },
      { value: "consulting", label: "Conseil" },
      { value: "travel", label: "Déplacement" },
      { value: "equipment", label: "Équipement" },
      { value: "penalty_fees", label: "Frais de pénalité" },
      { value: "other", label: "Autre dépense" }
    ],
    credit: [
      { value: "mortgage", label: "Crédit immobilier" },
      { value: "renovation", label: "Prêt travaux" },
      { value: "equipment_loan", label: "Prêt équipement" },
      { value: "investment_loan", label: "Prêt investissement" },
      { value: "bridge_loan", label: "Prêt relais" },
      { value: "commercial_loan", label: "Prêt commercial" },
      { value: "construction_loan", label: "Prêt construction" },
      { value: "refinancing", label: "Refinancement" },
      { value: "business_loan", label: "Prêt professionnel" },
      { value: "other", label: "Autre crédit" }
    ]
  };
  
  // Définir toutes les méthodes de paiement disponibles
  const paymentMethods = [
    { value: "bank_transfer", label: "Virement bancaire" },
    { value: "cash", label: "Espèces" },
    { value: "credit_card", label: "Carte de crédit" },
    { value: "debit_card", label: "Carte de débit" },
    { value: "check", label: "Chèque" },
    { value: "direct_debit", label: "Prélèvement automatique" },
    { value: "paypal", label: "PayPal" },
    { value: "stripe", label: "Stripe" },
    { value: "wire_transfer", label: "Virement international" },
    { value: "mobile_payment", label: "Paiement mobile" },
    { value: "cryptocurrency", label: "Cryptomonnaie" },
    { value: "interac", label: "Interac" },
    { value: "sepa", label: "SEPA" },
    { value: "venmo", label: "Venmo" },
    { value: "installment", label: "Paiement échelonné" },
    { value: "prepaid_card", label: "Carte prépayée" },
    { value: "voucher", label: "Bon/Voucher" },
    { value: "other", label: "Autre méthode" }
  ];

  // Mappage des types français vers les types valides du schéma
  const typeMapping: Record<string, ValidDocumentType> = {
    "facture": "invoice",
    "contrat": "contract",
    "bail": "lease",
    "quittance": "other",
  };

  // Liste triée des types de documents pour l'affichage
  const availableDocumentTypes = Object.keys(documentTypeConfig)
    .sort((a, b) => documentTypeConfig[a].label.localeCompare(documentTypeConfig[b].label));

  // Mettre à jour le type d'un document
  const updateDocumentType = (index: number, type: string) => {
    const currentDocs = transactions[currentTransactionIndex].documents;
    if (currentDocs?.files) {
      const file = currentDocs.files[index];
      
      // Stocker le type dans un Map pour ce fichier spécifique
      setDocumentTypes(prev => {
        const newMap = new Map(prev);
        newMap.set(file, type);
        console.log(`Type du document ${file.name} mis à jour:`, type);
        return newMap;
      });
      
      // Notifier l'interface utilisateur du changement sans modifier les fichiers
      // cela permet de préserver les fichiers existants
      updateTransactionForm(currentTransactionIndex, {
        documents: {
          files: currentDocs.files,
          folderId: currentDocs.folderId || null
        }
      });
    }
  };

  // Fonction pour vérifier l'existence des fichiers si documents?.files est undefined
  const hasDocs = (index: number): boolean => {
    const docs = transactions[index]?.documents;
    return !!docs && Array.isArray(docs.files) && docs.files.length > 0;
  };

  // Fonction pour obtenir le nom sans extension pour l'édition
  const getNameWithoutExtension = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, "");
  };

  // Mettre à jour le nom d'un document
  const updateDocumentName = (file: File, name: string) => {
    // Vérifier si le nom se termine par .pdf, sinon l'ajouter
    const fullName = name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
    
    setDocumentNames(prev => {
      const newMap = new Map(prev);
      newMap.set(file, fullName);
      return newMap;
    });
  };

  // Ajouter une fonction pour afficher la confirmation
  const confirmRemoveTransaction = (index: number) => {
    setTransactionToDelete(index);
    setShowDeleteConfirm(true);
  };

  // Fonction pour charger les documents existants associés à la transaction
  const loadExistingDocuments = async () => {
    if (!editingTransaction) return;
    
    setIsLoadingExistingDocs(true);
    const validDocs: { id: number, title: string, type: string }[] = [];
    
    // Vérifier le document principal
    if (editingTransaction.documentId) {
      try {
        const response = await fetch(`/api/documents/${editingTransaction.documentId}`);
        if (response.ok) {
          const doc = await response.json();
          validDocs.push({ 
            id: doc.id, 
            title: doc.title || 'Document sans titre', 
            type: doc.type || 'invoice' 
          });
        } else {
          console.warn(`Document ${editingTransaction.documentId} non trouvé, référence supprimée`);
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification du document ${editingTransaction.documentId}:`, error);
      }
    }
    
    // Vérifier les documents multiples
    if (editingTransaction.documentIds && editingTransaction.documentIds.length > 0) {
      for (const docId of editingTransaction.documentIds) {
        // Ne pas vérifier à nouveau si c'est le document principal
        if (docId === editingTransaction.documentId) continue;
        
        try {
          const response = await fetch(`/api/documents/${docId}`);
          if (response.ok) {
            const doc = await response.json();
            validDocs.push({ 
              id: doc.id, 
              title: doc.title || 'Document sans titre', 
              type: doc.type || 'invoice' 
            });
          } else {
            console.warn(`Document ${docId} non trouvé, référence supprimée`);
          }
        } catch (error) {
          console.error(`Erreur lors de la vérification du document ${docId}:`, error);
        }
      }
    }
    
    setExistingDocuments(validDocs);
    setIsLoadingExistingDocs(false);
  };

  // Charger les documents existants lorsque la transaction en cours d'édition change
  useEffect(() => {
    if (editingTransaction) {
      loadExistingDocuments();
    } else {
      setExistingDocuments([]);
    }
  }, [editingTransaction]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-white border border-blue-100 overflow-y-auto"
          aria-describedby="dialog-description"
        >
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                {editingTransaction ? (
                  <>
                    <FileTextIcon className="h-6 w-6 text-blue-500" />
                    Modifier la transaction
                  </>
                ) : (
                  <>
                    <FileTextIcon className="h-6 w-6 text-blue-500" />
                    Nouvelle transaction
                  </>
                )}
              </DialogTitle>
              <DialogDescription id="dialog-description" className="text-base text-muted-foreground/80">
                {editingTransaction
                  ? "Modifiez les informations de la transaction existante"
                  : "Ajoutez une ou plusieurs transactions"}
              </DialogDescription>
            </DialogHeader>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Transaction {currentTransactionIndex + 1} sur {transactions.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {transactions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => confirmRemoveTransaction(currentTransactionIndex)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewTransaction}
                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une transaction
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center z-10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentTransactionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentTransactionIndex === 0}
                    className="h-6 w-6 rounded-full bg-white hover:bg-blue-50 border border-blue-200 shadow-sm"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-1 px-8">
                  {(() => {
                    const startIndex = Math.max(0, Math.min(
                      currentTransactionIndex - 3,
                      transactions.length - 8
                    ));
                    return transactions.slice(startIndex, startIndex + 8).map((_, index) => {
                      const actualIndex = startIndex + index;
                      const isActive = currentTransactionIndex === actualIndex;
                      return (
                        <motion.div
                          key={actualIndex}
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="relative"
                        >
                          <Button
                            type="button"
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentTransactionIndex(actualIndex)}
                            className={`
                              min-w-[60px] h-6 px-1.5 relative overflow-hidden text-xs
                              ${isActive 
                                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm" 
                                : "bg-white hover:bg-blue-50 border-blue-200"
                              }
                            `}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <FileTextIcon className={`h-3 w-3 ${isActive ? "text-white" : "text-blue-500"}`} />
                              <span>#{actualIndex + 1}</span>
                            </div>
                            {isActive && (
                              <div className="absolute inset-0 bg-blue-500 opacity-10" />
                            )}
                          </Button>
                        </motion.div>
                      );
                    });
                  })()}
                </div>

                <div className="absolute inset-y-0 right-0 flex items-center z-10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentTransactionIndex(prev => Math.min(transactions.length - 1, prev + 1))}
                    disabled={currentTransactionIndex === transactions.length - 1}
                    className="h-6 w-6 rounded-full bg-white hover:bg-blue-50 border border-blue-200 shadow-sm"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>

            <Form {...form} key={key}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  onSubmit(form.getValues());
                }} className="space-y-6">
                      <div className="grid gap-6">
                        {/* Type et Montant */}
                        <motion.div 
                          className="grid gap-6 sm:grid-cols-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <FormField
                            control={form.control}
                        name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-blue-500" />
                                  Type
                                </FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            onFormChange({ type: value as TransactionFormData["type"] });
                          }} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-500/50 transition-colors">
                                      <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-white border-blue-200">
                                    <SelectItem value="income" className="hover:bg-blue-500/5">
                                      <div className="flex items-center gap-2">
                                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                                        Revenu
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="expense" className="hover:bg-blue-500/5">
                                      <div className="flex items-center gap-2">
                                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                                        Dépense
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="credit" className="hover:bg-blue-500/5">
                                      <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-amber-500" />
                                        Crédit
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                        name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Euro className="h-4 w-4 text-blue-500" />
                                  Montant
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                onFormChange({ amount: Number(e.target.value) });
                              }}
                                    className="font-mono bg-white border-blue-200 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <Separator className="bg-border/50" />

                        {/* Date et Propriété */}
                        <motion.div 
                          className="grid gap-6 sm:grid-cols-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <FormField
                            control={form.control}
                        name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-blue-500" />
                              Date de la transaction
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                onFormChange({ date: e.target.value });
                              }}
                                    className="bg-white border-blue-200 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                                  />
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
                                <FormLabel className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-blue-500" />
                                  Propriété
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Associez cette transaction à une propriété spécifique (optionnel)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                                </FormLabel>
                                <FormControl>
                                  <Combobox
                                    options={[
                                  { value: "null", label: "Aucune propriété" },
                                      ...formatPropertiesForSelect(Array.isArray(properties) ? properties : [])
                                    ]}
                                value={field.value?.toString() || "null"}
                              onValueChange={(value) => {
                                field.onChange(value === "null" ? null : parseInt(value));
                                onFormChange({ propertyId: value === "null" ? null : parseInt(value) });
                              }}
                                    placeholder="Sélectionner une propriété"
                                    emptyText="Aucune propriété trouvée"
                                    searchPlaceholder="Rechercher une propriété..."
                                    className="bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-500/50 transition-colors"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <Separator className="bg-border/50" />

                        {/* Catégorie et Description */}
                        <motion.div 
                          className="grid gap-6 sm:grid-cols-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <FormField
                            control={form.control}
                        name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Folder className="h-4 w-4 text-blue-500" />
                                  Catégorie
                                </FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                            field.onChange(value);
                                    // Mettre à jour la transaction actuelle
                                    updateTransactionForm(currentTransactionIndex, { category: value as any });
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-500/50 transition-colors">
                                      <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-white border-blue-200">
                                    {categoryByType[form.getValues('type')] && categoryByType[form.getValues('type')].map((category) => (
                                      <SelectItem key={category.value} value={category.value} className="hover:bg-blue-500/5">
                                        {category.label}
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
                        name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <FileTextIcon className="h-4 w-4 text-blue-500" />
                                  Description
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value || ''}
                                    placeholder="Description de la transaction"
                              onChange={(e) => {
                                field.onChange(e);
                                onFormChange({ description: e.target.value });
                              }}
                                    className="bg-white border-blue-200 hover:border-blue-500/50 focus:border-blue-500/50 transition-colors"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <Separator className="bg-border/50" />

                        {/* Méthode de paiement et Statut */}
                        <motion.div 
                          className="grid gap-6 sm:grid-cols-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.3 }}
                        >
                          <FormField
                            control={form.control}
                        name="paymentMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-blue-500" />
                                  Méthode de paiement
                                </FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                            field.onChange(value);
                                    // Mettre à jour la transaction actuelle
                                    updateTransactionForm(currentTransactionIndex, { paymentMethod: value as any });
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-500/50 transition-colors">
                                      <SelectValue placeholder="Sélectionner une méthode de paiement" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-white border-blue-200">
                                    {paymentMethods.map((method) => (
                                      <SelectItem key={method.value} value={method.value} className="hover:bg-blue-500/5">
                                        {method.label}
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
                        name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-blue-500" />
                                  Statut
                                </FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            onFormChange({ status: value as TransactionFormData["status"] });
                          }} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-500/50 transition-colors">
                                      <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-white border-blue-200">
                                    <SelectItem value="pending" className="hover:bg-blue-500/5">En attente</SelectItem>
                                    <SelectItem value="completed" className="hover:bg-blue-500/5">Complété</SelectItem>
                                    <SelectItem value="cancelled" className="hover:bg-blue-500/5">Annulé</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                  {/* Section Documents */}
                        <motion.div
                      className="space-y-4"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <FileTextIcon className="h-5 w-5 text-blue-500" />
                        Documents
                      </h3>
                    </div>

                    {/* Afficher les documents existants si c'est une modification et s'il y en a */}
                    {editingTransaction && existingDocuments.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-blue-600">Documents associés à la transaction</Label>
                        <div className="border rounded-md p-3 bg-blue-50/30 space-y-2">
                          {isLoadingExistingDocs ? (
                            <div className="flex items-center justify-center py-2">
                              <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">Chargement des documents...</span>
                            </div>
                          ) : (
                            existingDocuments.map((doc) => (
                              <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-2 bg-white rounded-md border border-blue-100"
                              >
                                <div className="flex items-center gap-2">
                                  {documentTypeConfig[doc.type as keyof DocumentTypeConfig]?.icon || <FileTextIcon className="h-4 w-4 text-blue-500" />}
                                  <span className="text-sm font-medium">{doc.title}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPreviewDocument(doc.id);
                                      // Ici vous pourriez ouvrir une prévisualisation du document
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-blue-100"
                                    title="Prévisualiser le document"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Dossier de destination</Label>
                              <div className="flex items-center gap-2">
                          {!isCreatingFolder ? (
                            <>
                              <Combobox
                                options={[
                                  { value: "", label: "Aucun dossier" },
                                  ...formatFoldersForSelect(Array.isArray(folders) ? folders : [])
                                ]}
                                value={selectedFolderId?.toString() || ""}
                                onValueChange={(value) => handleFolderChange(value ? parseInt(value) : null)}
                                placeholder="Aucun dossier"
                                emptyText="Aucun dossier trouvé"
                                searchPlaceholder="Rechercher un dossier..."
                                className="w-full bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-500/50 transition-colors"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreatingFolder(true)}
                                className="border-blue-500/20 hover:bg-blue-500/10 min-w-[100px]"
                              >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Créer
                              </Button>
                            </>
                          ) : (
                            <>
                            <Input
                              placeholder="Nom du nouveau dossier"
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                                className="flex-1 bg-white border-blue-200 hover:bg-blue-50 transition-colors"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newFolderName.trim()) {
                                    createFolderMutation.mutate(newFolderName.trim());
                                  } else if (e.key === 'Escape') {
                                    setIsCreatingFolder(false);
                                    setNewFolderName("");
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
                                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                                className="border-blue-500/20 hover:bg-blue-500/10"
                            >
                              {createFolderMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                  "Valider"
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
                                className="hover:bg-blue-500/10"
                            >
                              Annuler
                                </Button>
                            </>
                        )}
                      </div>
                                </div>

                      <div className="space-y-2">
                        <Label>Documents</Label>
                                <PDFUpload
                          onFileSelected={handleFileSelected}
                          multiple
                          key={`upload-${currentTransactionIndex}-${transactions[currentTransactionIndex]?.documents?.files?.length || 0}-${key}`}
                          initialFiles={transactions[currentTransactionIndex]?.documents?.files || []}
                          maxFiles={10}
                        />
                        
                        {hasDocs(currentTransactionIndex) && (
                          <div className="grid gap-2 mt-3 border rounded-md p-3 bg-white">
                            <h4 className="text-sm font-medium mb-1">Types de documents</h4>
                            {transactions[currentTransactionIndex]?.documents?.files?.map((file, index) => (
                                <motion.div
                                key={index}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="flex items-center justify-between p-2 bg-white rounded-md border border-blue-200"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <FileTextIcon className="h-4 w-4 text-blue-500" />
                                  {editingDocumentName === file ? (
                                    <div className="relative flex-1 max-w-[230px]">
                                      <Input
                                        className="h-7 text-xs py-1 px-2 w-full pr-8"
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
                                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">.pdf</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm truncate">{documentNames.get(file) || file.name}</span>
                                          <Button 
                                        type="button"
                                            variant="ghost" 
                                        size="sm"
                                        onClick={() => setEditingDocumentName(file)}
                                        className="h-6 w-6 p-0 hover:bg-blue-500/10 hover:text-blue-500"
                                        title="Renommer le fichier"
                                      >
                                        <Pencil className="h-3 w-3" />
                                          </Button>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Select 
                                    value={documentTypes.get(file) || "invoice"}
                                    onValueChange={(value) => updateDocumentType(index, value)}
                                  >
                                    <SelectTrigger className="w-[150px] h-8 text-xs bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-500/50 transition-colors">
                                      <SelectValue placeholder="Type de document" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-blue-200">
                                      <div 
                                        className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent py-1 px-1" 
                                        onWheel={(e) => e.stopPropagation()}
                                      >
                                        {/* Option par défaut: Facture */}
                                        <SelectItem key="invoice" value="invoice" className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                          <div className="flex items-center gap-2">
                                            {documentTypeConfig["invoice"].icon}
                                            <span className="font-medium">{documentTypeConfig["invoice"].label}</span>
                                          </div>
                                        </SelectItem>
                                        
                                        <SelectSeparator className="my-1" />
                                        
                                        {/* Documents principaux */}
                                        <SelectGroup>
                                          <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents principaux</SelectLabel>
                                          {["contract", "lease", "form", "maintenance"].map((type) => (
                                            <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                              <div className="flex items-center gap-2">
                                                {documentTypeConfig[type].icon}
                                                <span>{documentTypeConfig[type].label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                        
                                        <SelectSeparator className="my-1" />
                                        
                                        {/* Documents légaux et administratifs */}
                                        <SelectGroup>
                                          <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents légaux</SelectLabel>
                                          {["insurance", "tax", "legal", "certificate"].map((type) => (
                                            <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                              <div className="flex items-center gap-2">
                                                {documentTypeConfig[type].icon}
                                                <span>{documentTypeConfig[type].label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                        
                                        <SelectSeparator className="my-1" />
                                        
                                        {/* Documents financiers */}
                                        <SelectGroup>
                                          <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents financiers</SelectLabel>
                                          {["payment", "deposit", "budget", "expense"].map((type) => (
                                            <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                              <div className="flex items-center gap-2">
                                                {documentTypeConfig[type].icon}
                                                <span>{documentTypeConfig[type].label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                        
                                        <SelectSeparator className="my-1" />
                                        
                                        {/* Documents liés aux locataires */}
                                        <SelectGroup>
                                          <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Documents locataires</SelectLabel>
                                          {["tenant", "guarantor", "inventory", "complaint"].map((type) => (
                                            <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                              <div className="flex items-center gap-2">
                                                {documentTypeConfig[type].icon}
                                                <span>{documentTypeConfig[type].label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                        
                                        <SelectSeparator className="my-1" />
                                        
                                        {/* Autres types */}
                                        <SelectGroup>
                                          <SelectLabel className="text-xs font-semibold text-blue-500/80 pl-2 py-1 pointer-events-none">Autres types</SelectLabel>
                                          {["inspection", "repair", "renovation", "plan", "notice", "correspondence", "report", "meeting", "other"].map((type) => (
                                            <SelectItem key={type} value={type} className="text-xs hover:bg-blue-500/10 cursor-pointer py-1.5 px-2 my-1 rounded-md">
                                              <div className="flex items-center gap-2">
                                                {documentTypeConfig[type].icon}
                                                <span>{documentTypeConfig[type].label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </div>
                                    </SelectContent>
                                  </Select>
                                  
                    <Button
                      type="button"
                              variant="ghost"
                              size="sm"
                                    onClick={() => {
                                      const currentDocs = transactions[currentTransactionIndex].documents?.files || [];
                                      const newFiles = currentDocs.filter((_, i) => i !== index);
                                      
                                      // Mettre à jour les types de documents
                                      const fileToRemove = currentDocs[index];
                                      if (fileToRemove) {
                                        setDocumentTypes(prev => {
                                          const newMap = new Map(prev);
                                          newMap.delete(fileToRemove);
                                          return newMap;
                                        });
                                      }
                                      
                                      // Conserver le dossier sélectionné actuel
                                      const currentFolderId = transactions[currentTransactionIndex].documents?.folderId || selectedFolderId;
                                      
                                      // Mettre à jour la transaction
                                      updateTransactionForm(currentTransactionIndex, {
                                        documents: {
                                          files: newFiles,
                                          folderId: currentFolderId
                                        }
                                      });
                                      
                                      // Si c'était le dernier document, forcer le rechargement du composant PDFUpload
                                      if (newFiles.length === 0) {
                                        setKey(prev => prev + 1);
                                      }
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500"
                                  >
                                    <X className="h-4 w-4" />
                    </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                  )}
                      </div>
                    </div>
                    </motion.div>

                  {/* Bouton de confirmation */}
                <motion.div
                  className="flex justify-center w-full pt-8 pb-4 mt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium text-base rounded-md flex justify-center items-center gap-2"
                    disabled={createTransaction.isPending || updateTransaction.isPending}
                  >
                    {createTransaction.isPending || updateTransaction.isPending ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Traitement en cours...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Plus className="h-5 w-5" />
                            <span>Confirmer la transaction</span>
                      </div>
                    )}
                  </Button>
                </motion.div>
                  </div>
              </form>
            </Form>
          </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white border-red-200 max-w-md dark:bg-background dark:border-red-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-red-600 flex items-center gap-2 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Confirmation de suppression
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Êtes-vous sûr de vouloir supprimer la transaction #{transactionToDelete !== null ? transactionToDelete + 1 : ''} ?
              <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-md text-sm dark:bg-red-900/20 dark:border-red-900/40 dark:text-gray-300">
                Cette action est irréversible et toutes les informations saisies pour cette transaction seront perdues.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setTransactionToDelete(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-700"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (transactionToDelete !== null) {
                  removeTransaction(transactionToDelete);
                  setTransactionToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nouveau dialogue de progression */}
      <Dialog open={showProgressDialog} onOpenChange={() => false}>
        <DialogContent className="sm:max-w-md border-0 shadow-lg bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 p-0 overflow-hidden">
          <div className="p-6">
            <div className="mb-6 flex items-center justify-center">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center
                ${progressStatus === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30' : 
                  progressStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {progressStatus === 'processing' ? (
                  <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400 animate-pulse" />
                ) : progressStatus === 'success' ? (
                  <Check className="h-8 w-8 text-green-500 dark:text-green-400" />
                ) : (
                  <X className="h-8 w-8 text-red-500 dark:text-red-400" />
                )}
              </div>
            </div>
            
            <h3 className={`text-xl font-semibold text-center mb-2
              ${progressStatus === 'processing' ? 'text-gray-900 dark:text-gray-100' : 
                progressStatus === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {progressStatus === 'processing' ? 'Traitement en cours' : 
               progressStatus === 'success' ? 'Opération réussie' : 'Erreur'}
            </h3>
            
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              {progressMessage}
            </p>
            
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5" /> 
                    Progression
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {progressStep}/{totalSteps}
                  </span>
                </div>
                <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${progressStatus === 'processing' ? 'bg-blue-500 dark:bg-blue-400' : 
                      progressStatus === 'success' ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{progressPercentage}% terminé</span>
                {progressStatus === 'processing' && (
                  <span>Étape {progressStep + 1} sur {totalSteps}</span>
                )}
              </div>
            </div>
            
            {progressStatus === 'processing' && (
              <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {progressStep === 0 
                    ? "Initialisation..." 
                    : `Traitement en cours...`}
                </span>
              </div>
            )}
          </div>
          
          <div className={`p-4 border-t
            ${progressStatus === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30' : 
              progressStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30'}`}>
            <p className={`text-xs text-center
              ${progressStatus === 'processing' ? 'text-blue-500 dark:text-blue-400' : 
                progressStatus === 'success' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {progressStatus === 'processing' 
                ? "Ne fermez pas cette fenêtre pendant le processus." 
                : progressStatus === 'success'
                ? "Les données ont été enregistrées avec succès."
                : "Une erreur est survenue. Veuillez réessayer."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}