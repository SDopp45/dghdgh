import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { 
  CalendarIcon, 
  Link2, 
  Star, 
  Building2, 
  User,
  AlertCircle,
  MessageSquare,
  Clock,
  CreditCard,
  Wrench,
  ShieldCheck,
  X,
  FileText,
  Eye,
  Trash2,
  Check,
  Pencil,
  PlusCircle,
  Loader2,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantHistoryDialogProps, TenantHistoryFormValues, TenantHistoryEventType, TenantHistoryCategory } from '@/types/tenant-history';
import { formatDate } from '@/lib/date-utils';
import { getRatingDescription, RATING_DESCRIPTIONS } from "@/utils/rating-utils";
import { Combobox } from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTenantsForHistory, usePropertiesForHistory } from '@/api/tenant-history';

interface Tenant {
  id: number;
  fullName: string;
  propertyId: number | null;
  propertyName: string | null;
  isHistoryOnly: boolean;
  tenant_info_id?: number;
}

interface Property {
  id: number;
  name: string;
}

// Définir le schéma du formulaire
const formSchema = z.object({
  tenantId: z.number().nullable(),
  propertyId: z.number().nullable(),
  rating: z.number().min(1).max(5).nullable(),
  feedback: z.string().optional().default(""),
  category: z.string().optional(),
  tenantFullName: z.string().nullable().optional(),
  eventType: z.string(),
  eventSeverity: z.number().optional(),
  eventDetails: z.record(z.unknown()).optional(),
  bailStatus: z.string().nullable().optional(),
  bailId: z.number().nullable().optional(),
  propertyName: z.string().nullable().optional(),
  date: z.date(),
  status: z.string(),
  documents: z.array(z.instanceof(File)).optional(),
  eventTags: z.array(z.string()).optional(),
});

const TenantHistoryDialog: React.FC<TenantHistoryDialogProps> = ({
  open,
  onOpenChange,
  historyId,
  tenantId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchByName, setSearchByName] = useState<boolean>(false);

  // Récupération des locataires et propriétés pour les sélecteurs
  const { data: tenants = [] } = useTenantsForHistory();
  const { data: properties = [] } = usePropertiesForHistory();

  // Récupération des détails de l'entrée existante en cas de modification
  const { data: entryData, isLoading } = useQuery({
    queryKey: ['tenantHistoryEntry', historyId],
    queryFn: async () => {
      const response = await fetch(`/api/tenant-history/${historyId}`);
      if (!response.ok) {
        throw new Error('Impossible de récupérer les détails de l\'entrée');
      }
      return await response.json();
    },
    enabled: !!historyId && open,
  });

  // États pour la gestion des documents
  const [documentTypes, setDocumentTypes] = useState<Map<File, string>>(new Map());
  const [documentNames, setDocumentNames] = useState<Map<File, string>>(new Map());
  const [editingDocumentName, setEditingDocumentName] = useState<File | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Récupérer les dossiers disponibles
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/folders'],
    queryFn: async () => {
      const response = await fetch('/api/folders');
      if (!response.ok) throw new Error('Impossible de récupérer les dossiers');
      return await response.json();
    },
    enabled: open,
  });

  // Configuration des types de documents
  const documentTypeConfig = {
    "invoice": { 
      label: "Facture", 
      icon: <FileText className="h-3 w-3 text-orange-500" /> 
    },
    "contract": { 
      label: "Contrat", 
      icon: <FileText className="h-3 w-3 text-blue-500" /> 
    },
    "lease": { 
      label: "Bail", 
      icon: <FileText className="h-3 w-3 text-green-500" /> 
    },
    "form": { 
      label: "Formulaire", 
      icon: <FileText className="h-3 w-3 text-purple-500" /> 
    },
    "insurance": { 
      label: "Assurance", 
      icon: <FileText className="h-3 w-3 text-red-500" /> 
    },
    "tax": { 
      label: "Taxe", 
      icon: <FileText className="h-3 w-3 text-yellow-500" /> 
    },
    "legal": { 
      label: "Document légal", 
      icon: <FileText className="h-3 w-3 text-gray-500" /> 
    },
    "certificate": { 
      label: "Certificat", 
      icon: <FileText className="h-3 w-3 text-green-500" /> 
    },
    "receipt": { 
      label: "Reçu", 
      icon: <Receipt className="h-3 w-3 text-cyan-500" /> 
    },
    "evaluation": { 
      label: "Avis", 
      icon: <FileText className="h-3 w-3 text-orange-500" /> 
    },
    "maintenance": { 
      label: "Maintenance", 
      icon: <FileText className="h-3 w-3 text-amber-500" /> 
    },
    "complaint": { 
      label: "Réclamation", 
      icon: <FileText className="h-3 w-3 text-red-500" /> 
    },
    "payment": { 
      label: "Paiement", 
      icon: <CreditCard className="h-3 w-3 text-indigo-500" /> 
    },
    "deposit": { 
      label: "Dépôt", 
      icon: <FileText className="h-3 w-3 text-amber-500" /> 
    },
    "budget": { 
      label: "Budget", 
      icon: <FileText className="h-3 w-3 text-blue-500" /> 
    },
    "expense": { 
      label: "Dépense", 
      icon: <CreditCard className="h-3 w-3 text-red-500" /> 
    },
    "tenant": { 
      label: "Locataire", 
      icon: <User className="h-3 w-3 text-purple-500" /> 
    },
    "guarantor": { 
      label: "Garant", 
      icon: <FileText className="h-3 w-3 text-teal-500" /> 
    },
    "inventory": { 
      label: "Inventaire", 
      icon: <FileText className="h-3 w-3 text-emerald-500" /> 
    },
    "inspection": { 
      label: "Inspection", 
      icon: <FileText className="h-3 w-3 text-amber-500" /> 
    },
    "correspondence": { 
      label: "Correspondance", 
      icon: <FileText className="h-3 w-3 text-blue-500" /> 
    },
    "report": { 
      label: "Rapport", 
      icon: <FileText className="h-3 w-3 text-violet-500" /> 
    },
    "meeting": { 
      label: "Réunion", 
      icon: <FileText className="h-3 w-3 text-emerald-500" /> 
    },
    "credit": { 
      label: "Crédit", 
      icon: <CreditCard className="h-3 w-3 text-amber-500" /> 
    },
    "other": { 
      label: "Autre", 
      icon: <FileText className="h-3 w-3 text-gray-500" /> 
    }
  };

  // Convertir les dossiers pour le sélecteur
  const formatFoldersForSelect = (folders: any[] = []) => {
    return folders.map(folder => ({
      value: folder.id.toString(),
      label: folder.name,
      description: folder.path
    }));
  };

  // Gérer le changement de dossier
  const handleFolderChange = (folderId: number | null) => {
    console.log("Dossier sélectionné:", folderId);
    setSelectedFolderId(folderId);
    // Log pour vérifier que le changement est pris en compte
    setTimeout(() => console.log("État selectedFolderId mis à jour:", selectedFolderId), 0);
  };

  // Mettre à jour le type d'un document
  const updateDocumentType = (file: File, type: string) => {
    console.log(`Mise à jour du type pour ${file.name} à ${type}`);
    setDocumentTypes(prev => {
      const newMap = new Map(prev);
      newMap.set(file, type);
      
      // Log pour vérifier le contenu de la map après mise à jour
      console.log("Types de documents après mise à jour:", 
        Array.from(newMap.entries()).map(([f, t]) => `${f.name}: ${t}`));
      
      return newMap;
    });
  };

  // Obtenir le nom sans extension pour l'édition
  const getNameWithoutExtension = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, "");
  };

  // Mettre à jour le nom d'un document
  const updateDocumentName = (file: File, name: string) => {
    // Vérifier si le nom se termine par .pdf, sinon l'ajouter
    const extension = file.name.split('.').pop() || 'pdf';
    const fullName = name.toLowerCase().endsWith(`.${extension}`) ? name : `${name}.${extension}`;
    
    setDocumentNames(prev => {
      const newMap = new Map(prev);
      newMap.set(file, fullName);
      return newMap;
    });
  };

  // Mutation pour créer un nouveau dossier
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        throw new Error('Impossible de créer le dossier');
      }
      
      return await response.json();
    },
    onSuccess: (newFolder) => {
      toast({
        title: 'Dossier créé',
        description: `Le dossier "${newFolder.name}" a été créé avec succès`,
      });
      setIsCreatingFolder(false);
      setNewFolderName("");
      setSelectedFolderId(newFolder.id);
      
      // Invalider la requête pour recharger les dossiers
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la création du dossier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: 'destructive',
      });
    }
  });

  // Initialisation du formulaire
  const form = useForm<TenantHistoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenantId: tenantId || null,
      propertyId: null,
      eventType: 'general', // Utiliser 'general' comme valeur par défaut
      feedback: '',
      date: new Date(), // La date actuelle est toujours initialisée ici
      rating: null,
      status: 'active',
      eventTags: [],
      eventDetails: {}, // Initialisation à un objet vide
      documents: [],
      category: 'general',
    },
  });

  // Mise à jour des valeurs du formulaire quand on reçoit les données existantes
  useEffect(() => {
    if (entryData) {
      form.reset({
        tenantId: entryData.tenantId,
        propertyId: entryData.propertyId || null,
        eventType: entryData.eventType || 'evaluation',
        feedback: entryData.feedback || entryData.description || '',
        date: new Date(entryData.createdAt || entryData.date || new Date()),
        rating: entryData.rating || null,
        status: entryData.status || 'active',
        eventTags: entryData.eventTags || [],
        eventDetails: entryData.eventDetails || {}, // S'assurer qu'il y a un objet
        documents: [],
        category: entryData.category || 'general',
        tenantFullName: entryData.tenantFullName || '',
        propertyName: entryData.propertyName || '',
      });
    }
  }, [entryData, form]);

  // Fonction de mutation pour envoyer les données au serveur
  const mutation = useMutation({
    mutationFn: async (data: TenantHistoryFormValues) => {
      const url = historyId 
        ? `/api/tenant-history/${historyId}` 
        : '/api/tenant-history';
      
      const formData = new FormData();
      
      // Ajouter les champs du formulaire à FormData avec gestion améliorée
      Object.entries(data).forEach(([key, value]) => {
        // Skip undefined values
        if (value === undefined) {
          return;
        }
        
        if (key === 'date') {
          formData.append(key, value.toISOString());
        } else if (key === 'documents' && value) {
          Array.from(value as File[]).forEach((file) => {
            formData.append('documents', file);
          });
        } else if (key === 'eventTags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'eventDetails' && typeof value === 'object') {
          formData.append('eventDetails', JSON.stringify(value || {}));
        } else if (value !== null) {
          formData.append(key, String(value));
        }
      });
      
      // Ajouter explicitement feedback et category pour assurer la compatibilité
      if (data.feedback && !formData.get('feedback')) {
        formData.append('feedback', data.feedback);
      }
      
      if (data.category && !formData.get('category')) {
        formData.append('category', data.category);
      }
      
      // Ajouter le folderId si un dossier est sélectionné
      console.log("ID du dossier avant envoi:", selectedFolderId);
      if (selectedFolderId) {
        formData.append('selectedFolderId', selectedFolderId.toString());
      }
      
      // Ajouter les types de documents et noms personnalisés
      if (data.documents && data.documents.length > 0) {
        // Créer un objet pour les types de documents
        const docTypesObj: Record<string, string> = {};
        Array.from(data.documents).forEach((file) => {
          const type = documentTypes.get(file);
          if (type) {
            docTypesObj[file.name] = type;
            console.log(`Type associé pour ${file.name}: ${type}`);
          } else {
            console.log(`Pas de type associé pour ${file.name}`);
          }
        });
        
        // Créer un objet pour les noms personnalisés
        const docNamesObj: Record<string, string> = {};
        Array.from(data.documents).forEach((file) => {
          const name = documentNames.get(file);
          if (name) {
            docNamesObj[file.name] = name;
            console.log(`Nom personnalisé pour ${file.name}: ${name}`);
          } else {
            console.log(`Pas de nom personnalisé pour ${file.name}`);
          }
        });
        
        // Ajouter ces objets au FormData
        console.log("Types de documents à envoyer:", docTypesObj);
        console.log("Noms personnalisés à envoyer:", docNamesObj);
        
        formData.append('documentTypes', JSON.stringify(docTypesObj));
        formData.append('documentNames', JSON.stringify(docNamesObj));
      }
      
      // Log pour vérifier le contenu de FormData avant envoi
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${typeof value === 'object' ? 'File ou objet' : value}`);
      }
      
      const response = await fetch(url, {
        method: historyId ? 'PUT' : 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || `Erreur lors de l'${historyId ? 'modification' : 'ajout'} de l'entrée`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: historyId ? 'Entrée modifiée' : 'Entrée ajoutée',
        description: historyId 
          ? 'L\'entrée d\'historique a été modifiée avec succès' 
          : 'Une nouvelle entrée a été ajoutée à l\'historique',
      });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
      if (historyId) {
        queryClient.invalidateQueries({ queryKey: ['tenantHistoryEntry', historyId] });
      }
      
      // Close dialog
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: TenantHistoryFormValues) => {
    // Vérifier et définir des valeurs par défaut pour les champs obligatoires
    const updatedData = {
      ...data,
      // S'assurer qu'on a une date valide
      date: data.date || new Date(),
      // S'assurer qu'on a une catégorie et un type d'événement
      category: data.category || data.eventType || 'general',
      eventType: data.eventType || 'general',
      // S'assurer qu'on a un objet eventDetails
      eventDetails: data.eventDetails || {},
      // Utiliser le nom exact du locataire sélectionné
      tenantFullName: data.tenantFullName || (() => {
        const selectedTenant = tenants.find(t => t.id === data.tenantId);
        return selectedTenant ? selectedTenant.fullName : null;
      })()
    };
    
    // Si propertyId est défini, essayer de récupérer aussi le propertyName
    if (updatedData.propertyId && properties) {
      const selectedProperty = properties.find((p: { id: number, name: string }) => p.id === updatedData.propertyId);
      if (selectedProperty && selectedProperty.name) {
        updatedData.propertyName = selectedProperty.name;
      }
    }
    
    // Vérifier qu'il y a un tenantId ou un tenantFullName
    if (!updatedData.tenantId && !updatedData.tenantFullName) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un locataire ou saisir un nom de locataire',
        variant: 'destructive',
      });
      return;
    }
    
    // Soumettre les données mises à jour
    mutation.mutate(updatedData, {
      onSuccess: () => {
        // Réinitialiser le formulaire après une soumission réussie
        form.reset({
          tenantId: null,
          propertyId: null,
          rating: null,
          feedback: '',
          category: 'general',
          tenantFullName: '',
          eventType: 'general',
          eventSeverity: undefined,
          eventDetails: {},
          bailStatus: null,
          bailId: null,
          propertyName: null,
          date: new Date(),
          status: 'active',
          documents: [],
          eventTags: []
        });
        // Réinitialiser les états locaux
        setSearchByName(false);
        setDocumentTypes(new Map());
        setDocumentNames(new Map());
        setEditingDocumentName(null);
        setSelectedFolderId(null);
        setIsCreatingFolder(false);
        setNewFolderName("");
        
        // Rafraîchir la liste des locataires
        queryClient.invalidateQueries({ queryKey: ['tenantsForHistory'] });
      }
    });
  };

  // Affichage du formulaire adapté au type d'événement
  const renderEventSpecificFields = () => {
    // Afficher le formulaire d'évaluation pour toutes les catégories
    return (
      <div className="space-y-4 border-2 border-orange-200 dark:border-orange-900/40 rounded-lg p-5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-5 w-5 text-orange-500 dark:text-orange-400 fill-orange-500 dark:fill-orange-400" />
          <h3 className="font-semibold text-orange-800 dark:text-orange-300 text-lg">Évaluation du locataire</h3>
        </div>
        <p className="text-sm text-orange-700 dark:text-orange-300 mb-5 border-l-2 border-orange-300 dark:border-orange-700 pl-3 italic">
          Évaluez ce locataire pour aider à identifier les locataires problématiques et suivre son historique.
        </p>
        
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-100 dark:border-orange-900/40 shadow-sm">
              <FormLabel className="text-lg font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2 mb-3">
                <Star className="h-5 w-5 fill-orange-400 text-orange-400 dark:fill-orange-300 dark:text-orange-300" />
                Note globale
              </FormLabel>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-center space-x-3 bg-amber-50 dark:bg-amber-900/20 py-4 px-2 rounded-lg">
                  {[1, 2, 3, 4, 5].map((value) => {
                    // Déterminer les couleurs en fonction de la valeur
                    const colorClasses = {
                      1: 'text-red-500 fill-red-500 hover:bg-red-50 dark:text-red-400 dark:fill-red-400 dark:hover:bg-red-900/20',
                      2: 'text-orange-500 fill-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:fill-orange-400 dark:hover:bg-orange-900/20',
                      3: 'text-amber-500 fill-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:fill-amber-400 dark:hover:bg-amber-900/20',
                      4: 'text-yellow-500 fill-yellow-500 hover:bg-yellow-50 dark:text-yellow-400 dark:fill-yellow-400 dark:hover:bg-yellow-900/20',
                      5: 'text-green-500 fill-green-500 hover:bg-green-50 dark:text-green-400 dark:fill-green-400 dark:hover:bg-green-900/20'
                    };
                    
                    return (
                      <div key={value} className="flex flex-col items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="lg"
                          onClick={() => field.onChange(value)}
                          className={cn(
                            'w-14 h-14 p-0 rounded-full transition-all duration-200 transform',
                            field.value === value ? 'scale-110 bg-white dark:bg-gray-700 shadow-md' : '',
                            colorClasses[value as keyof typeof colorClasses]
                          )}
                          title={RATING_DESCRIPTIONS[value as keyof typeof RATING_DESCRIPTIONS]}
                        >
                          <Star className={cn(
                            'h-8 w-8',
                            field.value && field.value >= value
                              ? colorClasses[value as keyof typeof colorClasses]
                              : 'text-gray-300 dark:text-gray-600'
                          )} />
                        </Button>
                        <span className="text-xs font-medium mt-1 dark:text-gray-300">{value}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Affichage de la description de la note sélectionnée */}
                {field.value && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30 text-center">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {RATING_DESCRIPTIONS[field.value as keyof typeof RATING_DESCRIPTIONS]}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">Insuffisant</div>
                    <div className="flex-1 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mx-3"></div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Excellent</div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange(null)}
                    className="ml-2 text-xs bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600"
                  >
                    <X className="h-3 w-3 mr-1" /> Effacer
                  </Button>
                </div>
              </div>
              
              <FormDescription className="text-orange-600 dark:text-orange-400 mt-3 text-sm">
                Attribuez une note globale pour évaluer ce locataire
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
      </div>
    );
  };

  // Modifier la fonction handleFileChange pour stocker les types et noms
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Définir le type par défaut pour les nouveaux fichiers
      files.forEach(file => {
        if (!documentTypes.has(file)) {
          setDocumentTypes(prev => {
            const newMap = new Map(prev);
            newMap.set(file, 'evaluation'); // Type par défaut: évaluation
            return newMap;
          });
        }
      });
      
      form.setValue('documents', files);
    }
  };

  const isEditMode = !!historyId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Star className="h-5 w-5 text-orange-500 dark:text-orange-400 fill-orange-500 dark:fill-orange-400" />
            {isEditMode ? 'Modifier la notation du locataire' : 'Ajouter une notation au locataire'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {isEditMode 
              ? 'Modifiez l\'évaluation ou les informations existantes sur ce locataire'
              : 'Ajoutez une nouvelle évaluation pour suivre l\'historique du locataire et éviter les problèmes futurs'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            {/* Catégorie */}
            <div className="mb-6">
              <Label className="text-base font-medium mb-2 block dark:text-gray-200">
                Catégorie
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { id: 'paiement', label: 'Paiement', icon: <CreditCard className="h-4 w-4" />, color: 'bg-green-100 border-green-400 hover:bg-green-200 text-green-700', activeColor: 'bg-green-600 hover:bg-green-700 text-white' },
                  { id: 'entretien', label: 'Entretien', icon: <Wrench className="h-4 w-4" />, color: 'bg-blue-100 border-blue-400 hover:bg-blue-200 text-blue-700', activeColor: 'bg-blue-600 hover:bg-blue-700 text-white' },
                  { id: 'comportement', label: 'Comportement', icon: <User className="h-4 w-4" />, color: 'bg-purple-100 border-purple-400 hover:bg-purple-200 text-purple-700', activeColor: 'bg-purple-600 hover:bg-purple-700 text-white' },
                  { id: 'respect_regles', label: 'Respect des règles', icon: <ShieldCheck className="h-4 w-4" />, color: 'bg-red-100 border-red-400 hover:bg-red-200 text-red-700', activeColor: 'bg-red-600 hover:bg-red-700 text-white' },
                  { id: 'communication', label: 'Communication', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200 text-yellow-700', activeColor: 'bg-yellow-600 hover:bg-yellow-700 text-white' },
                  { id: 'general', label: 'Général', icon: <Clock className="h-4 w-4" />, color: 'bg-orange-100 border-orange-400 hover:bg-orange-200 text-orange-700', activeColor: 'bg-orange-600 hover:bg-orange-700 text-white' },
                ].map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.setValue('eventType', category.id as any);
                      // Assurons-nous que la catégorie est également définie (pour la rétrocompatibilité)
                      form.setValue('category', category.id as any);
                    }}
                    className={`flex items-center gap-2 py-6 border ${
                      form.watch('eventType') === category.id 
                        ? category.activeColor
                        : category.color
                    }`}
                  >
                    {category.icon}
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Locataire */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 rounded-lg border border-green-200 dark:border-green-900/40 col-span-1 md:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <FormLabel className="text-green-700 dark:text-green-300 flex items-center gap-2">
                    <User className="h-4 w-4 text-green-500 dark:text-green-400" />
                    Locataire évalué
                  </FormLabel>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant={searchByName ? "outline" : "default"} 
                      onClick={() => setSearchByName(false)}
                      className="text-xs h-8 px-2"
                      size="sm"
                    >
                      Sélectionner un locataire
                    </Button>
                    <Button 
                      type="button" 
                      variant={searchByName ? "default" : "outline"} 
                      onClick={() => setSearchByName(true)}
                      className="text-xs h-8 px-2"
                      size="sm"
                    >
                      Saisir un nom
                    </Button>
                  </div>
                </div>

                {searchByName ? (
                  // Formulaire de saisie manuelle du nom du locataire
                  <FormField
                    control={form.control}
                    name="tenantFullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-green-700 dark:text-green-300">Nom du locataire</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Saisir le nom complet du locataire"
                            className="bg-white dark:bg-gray-700 dark:text-white border-green-100 dark:border-green-900/30 focus-visible:ring-green-400 dark:focus-visible:ring-green-500"
                            value={field.value || ''}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              // Réinitialiser le tenantId lorsqu'on entre un nom manuellement
                              form.setValue('tenantId', null);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription className="text-green-600 dark:text-green-400 mt-2 text-sm">
                          Entrez le nom complet du locataire qui n'est pas encore dans la liste
                        </FormDescription>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                ) : (
                  // Formulaire de sélection d'un locataire existant
                  <FormField
                    control={form.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Locataire Évalué</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const tenant = tenants.find((t: Tenant) => t.id === Number(value));
                            if (tenant) {
                              field.onChange(Number(value));
                              // Utiliser le nom exact du locataire sélectionné
                              form.setValue('tenantFullName', tenant.fullName);
                              // Ajouter tenant_info_id si disponible
                              if (tenant.tenant_info_id) {
                                form.setValue('tenant_info_id', tenant.tenant_info_id);
                              }
                              // Si c'est un locataire historique, on ne veut pas d'ID
                              if (tenant.isHistoryOnly) {
                                field.onChange(null);
                              }
                            }
                          }}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un locataire" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px] overflow-y-auto bg-white dark:bg-gray-800">
                            <SelectGroup>
                              <SelectLabel>Locataires</SelectLabel>
                              {tenants.map((tenant: Tenant) => (
                                <SelectItem 
                                  key={tenant.id} 
                                  value={tenant.id.toString()}
                                  className={cn(
                                    "flex items-center gap-2",
                                    tenant.isHistoryOnly && "text-orange-500"
                                  )}
                                >
                                  {tenant.fullName}
                                  {tenant.isHistoryOnly && (
                                    <span className="text-xs text-orange-500">(Historique)</span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Sélectionnez le locataire concerné par cette évaluation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Propriété */}
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900/40 col-span-1 md:col-span-3">
                    <FormLabel className="text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      Propriété concernée
                    </FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : null)}
                      value={field.value ? String(field.value) : 'none'}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-700 dark:text-white border-amber-100 dark:border-amber-900/30 focus-visible:ring-amber-400 dark:focus-visible:ring-amber-500">
                          <SelectValue placeholder="Sélectionner une propriété" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px] overflow-y-auto bg-white dark:bg-gray-800">
                        <SelectItem value="none" className="text-gray-500 dark:text-gray-400 italic">Aucune propriété</SelectItem>
                        {properties?.map((property: any) => (
                          <SelectItem key={property.id} value={String(property.id)} className="font-medium dark:text-white">
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-amber-600 dark:text-amber-400 mt-2 text-sm">
                      Indiquez la propriété liée à cette évaluation
                    </FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-900/40 col-span-1 md:col-span-3">
                    <FormLabel className="text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                      Date de l'évaluation
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-cyan-500/70 dark:text-cyan-400/70" />
                        <Input
                          type="date"
                          value={(() => {
                            try {
                              const dateValue = field.value ? new Date(field.value) : new Date();
                              return dateValue.toISOString().split('T')[0];
                            } catch (error) {
                              console.error("Erreur format date:", error);
                              return new Date().toISOString().split('T')[0];
                            }
                          })()}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                              try {
                                const date = new Date(value);
                                field.onChange(date);
                              } catch (error) {
                                console.error("Erreur au changement de date:", error);
                              }
                            }
                          }}
                          className="pl-9 bg-white dark:bg-gray-700 dark:text-white w-full border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-400 dark:focus-visible:ring-cyan-500"
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-cyan-600 dark:text-cyan-400 mt-2 text-sm">
                      Date à laquelle cette évaluation a été effectuée
                    </FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            </div>

            {/* Type de case de champs spécifiques au type d'événement */}
            {renderEventSpecificFields()}

            {/* Description -> Feedback */}
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900/40">
                  <FormLabel className="text-orange-700 dark:text-orange-300 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    Description détaillée
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez en détail l'évaluation du locataire..."
                      className="min-h-[120px] bg-white dark:bg-gray-700 border-orange-100 dark:border-orange-900/30 focus-visible:ring-orange-400 dark:focus-visible:ring-orange-500 dark:text-white"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription className="text-orange-600 dark:text-orange-400 mt-2 text-sm">
                    Ajoutez des détails spécifiques qui justifient la note attribuée au locataire
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Documents justificatifs */}
            <div className="grid grid-cols-1 gap-4">
              <FormItem className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/40">
                <FormLabel className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  Documents justificatifs
                </FormLabel>
                
                {/* Sélection du dossier de destination */}
                <div className="space-y-2 mb-4">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">Dossier de destination</Label>
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
                          className="w-full bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-500/50 dark:hover:border-blue-500/70 transition-colors"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCreatingFolder(true)}
                          className="border-blue-500/20 dark:border-blue-500/40 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 min-w-[100px] dark:text-blue-300"
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
                          className="flex-1 bg-white dark:bg-gray-700 dark:text-white border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
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
                          className="border-blue-500/20 dark:border-blue-500/40 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-300"
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
                          className="hover:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-300"
                        >
                          Annuler
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <Separator className="my-3 bg-blue-200/50 dark:bg-blue-700/30" />
                
                {/* Upload de documents */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">Sélectionner les fichiers</Label>
                  <div className="relative">
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={isLoading || mutation.isPending}
                      className="bg-white dark:bg-gray-700 dark:text-white border-blue-100 dark:border-blue-900/30 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
                
                {/* Affichage des fichiers sélectionnés avec prévisualisation et type */}
                {form.watch('documents') && form.watch('documents').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Fichiers sélectionnés:</p>
                    <div className="max-h-[250px] overflow-y-auto border border-blue-100 dark:border-blue-900/30 rounded-md bg-white dark:bg-gray-800 p-2">
                      {Array.from(form.watch('documents') || []).map((file: File, index: number) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/20 my-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            {editingDocumentName === file ? (
                              <div className="relative flex-1 max-w-[230px]">
                                <Input
                                  className="h-7 text-xs py-1 px-2 w-full pr-8 dark:bg-gray-700 dark:text-white dark:border-blue-900/30"
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
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground dark:text-gray-400">.{file.name.split('.').pop()}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm truncate max-w-[200px] dark:text-white">{documentNames.get(file) || file.name}</span>
                                <span className="text-xs text-blue-500 dark:text-blue-400">({(file.size / 1024).toFixed(1)} Ko)</span>
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setEditingDocumentName(file)}
                                  className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-700/40 rounded-full"
                                  title="Renommer le fichier"
                                >
                                  <Pencil className="h-3 w-3 dark:text-blue-300" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Type de document */}
                    <Select
                              value={documentTypes.get(file) || "evaluation"}
                              onValueChange={(value) => updateDocumentType(file, value)}
                    >
                              <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-gray-700 dark:text-white border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                <SelectValue placeholder="Type de document" />
                        </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900/40">
                                <ScrollArea className="h-[200px]">
                                  {/* Option par défaut: Avis */}
                                  <SelectItem key="evaluation" value="evaluation" className="text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer dark:text-white">
                                    <div className="flex items-center gap-2">
                                      {documentTypeConfig["evaluation"] ? documentTypeConfig["evaluation"].icon : <FileText className="h-3 w-3 text-orange-500 dark:text-orange-400" />}
                                      <span className="font-medium">{documentTypeConfig["evaluation"] ? documentTypeConfig["evaluation"].label : "Avis"}</span>
                                    </div>
                        </SelectItem>
                                  
                                  <SelectSeparator className="my-1 dark:bg-gray-700" />
                                  
                                  {/* Documents locataires */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-orange-500/80 dark:text-orange-400/80 pl-2 py-1">Documents locataires</SelectLabel>
                                    {["tenant", "contract", "lease", "complaint", "receipt", "guarantor", "inventory"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer dark:text-white">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type as keyof typeof documentTypeConfig].icon}
                                          <span>{documentTypeConfig[type as keyof typeof documentTypeConfig].label}</span>
                                        </div>
                        </SelectItem>
                                    ))}
                                  </SelectGroup>
                                  
                                  <SelectSeparator className="my-1 dark:bg-gray-700" />
                                  
                                  {/* Documents financiers */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-orange-500/80 dark:text-orange-400/80 pl-2 py-1">Documents financiers</SelectLabel>
                                    {["invoice", "payment", "deposit", "budget", "expense", "credit"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer dark:text-white">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type as keyof typeof documentTypeConfig].icon}
                                          <span>{documentTypeConfig[type as keyof typeof documentTypeConfig].label}</span>
                                        </div>
                          </SelectItem>
                                    ))}
                                  </SelectGroup>
                                  
                                  <SelectSeparator className="my-1 dark:bg-gray-700" />
                                  
                                  {/* Documents administratifs */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-orange-500/80 dark:text-orange-400/80 pl-2 py-1">Documents administratifs</SelectLabel>
                                    {["form", "legal", "certificate", "tax", "report", "inspection"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer dark:text-white">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type as keyof typeof documentTypeConfig].icon}
                                          <span>{documentTypeConfig[type as keyof typeof documentTypeConfig].label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                  
                                  <SelectSeparator className="my-1 dark:bg-gray-700" />
                                  
                                  {/* Autres documents */}
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-orange-500/80 dark:text-orange-400/80 pl-2 py-1">Autres documents</SelectLabel>
                                    {["maintenance", "correspondence", "meeting", "insurance", "other"].map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer dark:text-white">
                                        <div className="flex items-center gap-2">
                                          {documentTypeConfig[type as keyof typeof documentTypeConfig].icon}
                                          <span>{documentTypeConfig[type as keyof typeof documentTypeConfig].label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </ScrollArea>
                      </SelectContent>
                    </Select>
                            
                            {/* Icône de prévisualisation */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const url = URL.createObjectURL(file);
                                window.open(url, '_blank');
                              }}
                              className="h-7 w-7 p-0 rounded-full hover:bg-blue-100 dark:hover:bg-blue-700/40"
                              title="Prévisualiser"
                            >
                              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            
                            {/* Icône de suppression */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentFiles = form.watch('documents');
                                if (currentFiles) {
                                  const newFiles = Array.from(currentFiles).filter((f) => f !== file);
                                  form.setValue('documents', newFiles);
                                }
                              }}
                              className="h-7 w-7 p-0 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 italic flex items-center mt-1">
                      <Check className="h-3 w-3 mr-1" />
                      Les documents seront uploadés lors de l'enregistrement
                    </p>
                  </div>
                )}
                
                <FormDescription className="text-blue-600 dark:text-blue-400 mt-2 text-sm">
                  Ajoutez des documents prouvant votre évaluation (photos, contrats, etc.)
                    </FormDescription>
                  </FormItem>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading || mutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white"
              >
                {mutation.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Enregistrer l'évaluation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantHistoryDialog;