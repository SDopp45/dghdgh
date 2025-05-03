import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { FileText, Upload, Eye, Download, Trash2, Search, Filter, Edit2, ChevronDown, Folder, Plus, FilePenLine, FileSpreadsheet, FileImage, Clock, File, ChevronLeft, ChevronRight, Library, LayoutGrid, List, ChevronsLeft, ChevronsRight, Link, Info, FileX, FolderOpen, FolderX, FolderPlus } from "lucide-react";
import { Document, Folder as FolderType } from "@shared/schema";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { useToast } from "../../hooks/use-toast";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { ConfirmDialog } from "../../components/alerts/confirm-dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { DocumentViewerButton } from "../../components/ui/document-viewer-button";
import { PdfViewerDialog } from "../../components/document/pdf-viewer-dialog";
import axios from "axios";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Dialog as CustomDialog,
  DialogContent as CustomDialogContent,
  DialogHeader as CustomDialogHeader,
  DialogTitle as CustomDialogTitle,
  DialogDescription as CustomDialogDescription,
  DialogFooter as CustomDialogFooter
} from "../../components/ui/dialog";
import { PdfUpload } from "../../components/ui/pdf-upload";
import { Checkbox } from "../../components/ui/checkbox";
import { DataPagination } from "../../components/ui/data-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";


const ITEMS_PER_PAGE = 12;
const FOLDERS_PER_PAGE = 10;

const documentTypeIcons = {
  'contract': <FileText />,
  'lease': <FilePenLine />,
  'invoice': <FileSpreadsheet />,
  'form': <FileText />,
  'maintenance': <FileImage />,
  'other': <File />,
};

const documentTypeLabels = {
  contract: 'Contrat',
  lease: 'Bail',
  invoice: 'Facture',
  form: 'Formulaire',
  maintenance: 'Maintenance',
  other: 'Autre',
};

interface Document2 extends Omit<Document, 'originalName'> {
  fileUrl?: string;
  originalName?: string;
}

type TabType = 'all' | 'contract' | 'lease' | 'invoice' | 'form' | 'maintenance' | 'other';

interface PaginationState {
  [key: string]: {
    currentPage: number;
    itemsPerPage: number;
  };
}

export const DocumentList = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [documentType, setDocumentType] = useState("other");
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
  const [selectedDocument, setSelectedDocument] = useState<Document2 | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [folderToDelete, setFolderToDelete] = useState<{ id: number, name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: "all",
    sortBy: "name",
    sortOrder: "asc"
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document2 | null>(null);
  const [newDocumentDialogOpen, setNewDocumentDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [paginationState, setPaginationState] = useState<PaginationState>({
    all: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    contract: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    lease: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    invoice: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    form: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    maintenance: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    insurance: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    tax: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    legal: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    certificate: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    payment: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    deposit: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    budget: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    expense: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    tenant: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    guarantor: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    inventory: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    complaint: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    inspection: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    repair: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    renovation: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    plan: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    notice: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    correspondence: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    report: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    meeting: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE },
    other: { currentPage: 1, itemsPerPage: ITEMS_PER_PAGE }
  });
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [currentFolderPage, setCurrentFolderPage] = useState(1);
  const [deleteWithDocuments, setDeleteWithDocuments] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<Document2 | null>(null);

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ['/api/folders'],
    retry: 3
  });

  const { data: documents = [], isLoading, error, refetch } = useQuery<Document2[]>({
    queryKey: ['/api/documents'],
    retry: 3
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error('Erreur lors de la création du dossier');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      setCreateFolderDialogOpen(false);
      setNewFolderName("");
      
      // Si nous sommes dans le dialogue d'ajout de document, sélectionner le nouveau dossier
      if (newDocumentDialogOpen || createFolderDialogOpen) {
        setSelectedFolder(data.id.toString());
        // Réouvrir le dialogue d'ajout de document s'il était fermé
        setTimeout(() => {
          if (!newDocumentDialogOpen) {
            setNewDocumentDialogOpen(true);
          }
        }, 300);
      }
      
      toast({
        title: "✨ Dossier créé",
        description: "Le dossier a été créé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer le dossier"
      });
    }
  });

  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      const matchesFolder = selectedFolderId === "all"
        ? true
        : selectedFolderId === "none"
          ? !doc.folderId
          : doc.folderId === Number(selectedFolderId);

      const matchesType = activeTab === "all" || doc.type === activeTab;

      const searchLower = searchQuery.toLowerCase();
      const folderName = doc.folderId ? folders.find(f => f.id === doc.folderId)?.name.toLowerCase() : "";

      const matchesSearch = searchQuery === "" || (
        doc.title.toLowerCase().includes(searchLower) ||
        doc.type.toLowerCase().includes(searchLower) ||
        folderName?.includes(searchLower) ||
        (doc.originalName || "").toLowerCase().includes(searchLower)
      );

      let matchesDate = true;
      const docDate = new Date(doc.createdAt);
      const now = new Date();
      switch (advancedFilters.dateRange) {
        case "today":
          matchesDate = docDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = docDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = docDate >= monthAgo;
          break;
      }

      return matchesFolder && matchesType && matchesSearch && matchesDate;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (advancedFilters.sortBy) {
        case "name":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return advancedFilters.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [documents, selectedFolderId, activeTab, searchQuery, advancedFilters, folders]);

  const documentTypes = {
    // Documents principaux
    contract: { label: "Contrats", color: "bg-blue-500" },
    lease: { label: "Baux", color: "bg-green-500" },
    invoice: { label: "Factures", color: "bg-purple-500" },
    form: { label: "Formulaires", color: "bg-orange-500" },
    maintenance: { label: "Maintenance", color: "bg-red-500" },
    
    // Documents légaux et administratifs
    insurance: { label: "Assurances", color: "bg-indigo-500" },
    tax: { label: "Documents fiscaux", color: "bg-yellow-500" },
    legal: { label: "Documents juridiques", color: "bg-pink-500" },
    certificate: { label: "Certificats", color: "bg-teal-500" },
    
    // Documents financiers
    payment: { label: "Paiements", color: "bg-emerald-500" },
    deposit: { label: "Dépôts de garantie", color: "bg-cyan-500" },
    budget: { label: "Budget", color: "bg-rose-500" },
    expense: { label: "Dépenses", color: "bg-amber-500" },
    
    // Documents liés aux locataires
    tenant: { label: "Documents locataires", color: "bg-violet-500" },
    guarantor: { label: "Documents garants", color: "bg-sky-500" },
    inventory: { label: "États des lieux", color: "bg-lime-500" },
    complaint: { label: "Réclamations", color: "bg-red-400" },
    
    // Documents techniques
    inspection: { label: "Inspections", color: "bg-blue-400" },
    repair: { label: "Réparations", color: "bg-green-400" },
    renovation: { label: "Rénovations", color: "bg-purple-400" },
    plan: { label: "Plans", color: "bg-orange-400" },
    
    // Documents de communication
    notice: { label: "Avis", color: "bg-indigo-400" },
    correspondence: { label: "Correspondance", color: "bg-yellow-400" },
    report: { label: "Rapports", color: "bg-pink-400" },
    meeting: { label: "Procès-verbaux", color: "bg-teal-400" },
    
    other: { label: "Autres", color: "bg-gray-500" }
  };

  const getPaginatedDocuments = () => {
    const { currentPage, itemsPerPage } = paginationState[activeTab as TabType];
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredDocuments.slice(start, end);
  };

  const handlePageChange = (page: number) => {
    setPaginationState(prev => ({
      ...prev,
      [activeTab as TabType]: {
        ...prev[activeTab as TabType],
        currentPage: page
      }
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: number) => {
    setPaginationState(prev => ({
      ...prev,
      [activeTab as TabType]: {
        currentPage: 1,
        itemsPerPage: value
      }
    }));
  };

  const currentDocuments = getPaginatedDocuments();
  const { currentPage, itemsPerPage } = paginationState[activeTab as TabType];
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const loadMore = () => {
    setVisibleItems(prev => prev + ITEMS_PER_PAGE);
  };

  const handleDownload = async (document: Document2) => {
    try {
      const response = await axios.get(`/api/documents/${document.id}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${document.title}.pdf`);
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✨ Téléchargement réussi",
        description: `Le document "${document.title}" a été téléchargé`,
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le document"
      });
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      await axios.delete(`/api/documents/${documentToDelete.id}`);

      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "Document supprimé",
        description: `Le document "${documentToDelete.title}" a été supprimé`,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const confirmDelete = (document: Document2) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleFileSelected = (file: File | File[]) => {
    if (Array.isArray(file)) {
      // Handle array of files if needed
      return;
    }
    setSelectedFile(file);
    const filename = file.name.replace(/\.[^/.]+$/, "");
    setDocumentTitle(filename);
  };

  const handleCreateDocument = async () => {
    if (!selectedFile || !documentTitle.trim()) {
      toast({
        title: "Données manquantes",
        description: "Veuillez sélectionner un fichier et saisir un titre",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', documentTitle);
      formData.append('type', documentType);
      
      // N'ajouter le folderId que s'il n'est pas "none"
      if (selectedFolder && selectedFolder !== "none") {
        formData.append('folderId', selectedFolder);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erreur lors de la création du document');

      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "✨ Document créé",
        description: "Le document a été créé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setNewDocumentDialogOpen(false);
      setDocumentTitle("");
      setSelectedFile(null);
      setSelectedFolder("none");
    } catch (error) {
      console.error('Erreur lors de la création du document:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer le document"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreview = async (document: Document2) => {
    try {
      const response = await fetch(`/api/documents/${document.id}`);
      if (!response.ok) {
        throw new Error('Document non trouvé');
      }

      const documentData = await response.json();
      console.log("Document data:", documentData);

      setSelectedDocument({
        ...document,
        fileUrl: `/api/documents/${document.id}/preview`
      });
      setPreviewOpen(true);

      toast({
        title: "✨ Chargement du document",
        description: "Le document est en cours d'ouverture",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'ouvrir le document",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File | File[]) => {
    if (Array.isArray(file) || !file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.pdf', ''));
    formData.append('type', documentType);

    setIsUploading(true);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erreur lors du téléchargement');

      await queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "✨ Document ajouté",
        description: "Le document a été ajouté avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setUploadDialogOpen(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le document"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredFolders = useMemo(() => {
    const searchLower = folderSearchQuery.toLowerCase();
    return folders.filter(folder => !folderSearchQuery || folder.name.toLowerCase().includes(searchLower));
  }, [folders, folderSearchQuery]);

  useEffect(() => {
    // Réinitialiser la page à 1 quand la recherche change
    setCurrentFolderPage(1);
  }, [folderSearchQuery]);

  const totalFolderPages = Math.ceil(filteredFolders.length / FOLDERS_PER_PAGE);
  const startFolderIndex = (currentFolderPage - 1) * FOLDERS_PER_PAGE;
  const endFolderIndex = startFolderIndex + FOLDERS_PER_PAGE;
  const currentFolders = filteredFolders.slice(startFolderIndex, endFolderIndex);

  const handleFolderPageChange = (page: number) => {
    setCurrentFolderPage(page);
  };

  const handleFolderDelete = async () => {
    if (!folderToDelete) return;

    try {
      if (deleteWithDocuments) {
        const documentsInFolder = documents.filter(doc => doc.folderId === folderToDelete.id);
        for (const doc of documentsInFolder) {
          await axios.delete(`/api/documents/${doc.id}`);
        }
      }

      await axios.delete(`/api/folders/${folderToDelete.id}`);

      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "Dossier supprimé",
        description: `Le dossier "${folderToDelete.name}" a été supprimé`,
      });

      setFolderToDelete(null);
      setDeleteWithDocuments(false);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer le dossier",
        variant: "destructive",
      });
    }
  };

  const handleMoveDocument = async (documentId: number, targetFolderId: number | null) => {
    try {
      // Récupérer d'abord les informations du document actuel
      const currentDoc = documents.find(doc => doc.id === documentId);
      if (!currentDoc) {
        throw new Error("Document non trouvé");
      }

      // Créer le payload avec les informations existantes du document et le nouveau folderId
      const payload = {
        title: currentDoc.title,
        type: currentDoc.type,
        folderId: targetFolderId,
        formData: currentDoc.formData || {}
      };
      
      console.log("Moving document", documentId, "to folder", targetFolderId, "with payload:", payload);
      
      // Utiliser PUT au lieu de PATCH car le serveur n'a pas d'endpoint PATCH
      const response = await axios.put(`/api/documents/${documentId}`, payload);
      
      console.log("Move response:", response.data);

      // Mettre à jour l'UI immédiatement
      queryClient.setQueryData(['/api/documents'], (oldData: Document2[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(doc => {
          if (doc.id === documentId) {
            return {
              ...doc,
              folderId: targetFolderId
            };
          }
          return doc;
        });
      });

      // Invalider les deux requêtes pour forcer un rafraîchissement complet
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/folders'] })
      ]);

      toast({
        title: "✨ Document déplacé",
        description: "Le document a été déplacé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de déplacer le document"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
          <File className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium">Erreur de chargement</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Impossible de charger les documents. Veuillez réessayer.
        </p>
        <Button onClick={() => refetch()} className="mt-4" variant="outline">
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center mb-8 p-6 rounded-xl bg-white border border-gray-200 shadow-lg">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-500 via-violet-500 to-blue-500 bg-clip-text text-transparent animate-gradient flex items-center">
            <Library className="h-10 w-10 mr-3 text-purple-500" />
            Centre de Documents
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez et organisez tous vos documents
          </p>
        </div>
        <div className="flex gap-2">
          <CustomDialog open={newDocumentDialogOpen} onOpenChange={setNewDocumentDialogOpen}>
            <CustomDialogContent className="sm:max-w-[600px] bg-gradient-to-br from-background/95 via-background/98 to-background/95 backdrop-blur-xl border border-primary/30 shadow-xl">
              <div className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 p-4 border-b border-primary/20">
              <CustomDialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <CustomDialogTitle className="text-xl font-semibold bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">Ajouter un nouveau document</CustomDialogTitle>
                  </div>
                  <CustomDialogDescription className="text-muted-foreground mt-2">
                  Chargez un document PDF et complétez les informations nécessaires
                </CustomDialogDescription>
              </CustomDialogHeader>
              </div>

              <div className="p-4 md:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5 order-2 md:order-1">
                <div className="space-y-2">
                      <label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                    Titre du document
                  </label>
                  <Input
                    id="title"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Entrez un titre pour le document"
                        className="border-primary/20 focus:border-primary/40 bg-white/50 backdrop-blur-sm transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                      <label htmlFor="type" className="text-sm font-medium flex items-center gap-2">
                        <FilePenLine className="h-4 w-4 text-primary" />
                    Type de document
                  </label>
                  <Select
                    value={documentType}
                    onValueChange={setDocumentType}
                  >
                        <SelectTrigger id="type" className="border-primary/20 focus:border-primary/40 bg-white/50 backdrop-blur-sm">
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                        <SelectContent 
                          position="popper" 
                          className="w-[var(--radix-select-trigger-width)] bg-white border border-primary/20 shadow-md rounded-md"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <div 
                            className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent" 
                            onWheel={(e) => e.stopPropagation()}
                          >
                            {Object.entries(documentTypes).map(([value, { label, color }]) => (
                              <SelectItem key={value} value={value} className="rounded-md cursor-pointer py-1.5 px-2 my-1 data-[state=checked]:bg-primary/10 hover:bg-muted">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${color}`}></div>
                                  <span>{label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="folder" className="text-sm font-medium flex items-center gap-2">
                          <Folder className="h-4 w-4 text-primary" />
                    Dossier (optionnel)
                  </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                          onClick={() => {
                            setCreateFolderDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nouveau dossier
                        </Button>
                      </div>
                      <div className="flex gap-2">
                  <Select
                    value={selectedFolder}
                    onValueChange={setSelectedFolder}
                  >
                          <SelectTrigger id="folder" className="border-primary/20 focus:border-primary/40 bg-white/50 backdrop-blur-sm w-full">
                      <SelectValue placeholder="Sélectionnez un dossier" />
                    </SelectTrigger>
                          <SelectContent 
                            position="popper" 
                            className="w-[var(--radix-select-trigger-width)] bg-white border border-primary/20 shadow-md rounded-md"
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <div 
                              className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent" 
                              onWheel={(e) => e.stopPropagation()}
                            >
                              <SelectItem value="none" className="rounded-md cursor-pointer py-1.5 px-2 my-1 data-[state=checked]:bg-primary/10 hover:bg-muted">
                                <div className="flex items-center gap-2">
                                  <FileX className="h-3.5 w-3.5 opacity-70" />
                                  <span>Aucun dossier</span>
                                </div>
                              </SelectItem>
                              
                              {folders?.length > 0 && (
                                <div className="py-1.5 px-2 text-xs text-muted-foreground">
                                  Mes dossiers ({folders.length})
                                </div>
                              )}
                              
                      {folders?.map(folder => (
                                <SelectItem key={folder.id} value={folder.id.toString()} className="rounded-md cursor-pointer py-1.5 px-2 my-1 data-[state=checked]:bg-primary/10 hover:bg-muted">
                                  <div className="flex items-center gap-2">
                                    <Folder className="h-3.5 w-3.5 opacity-70" />
                                    <span>{folder.name}</span>
                                  </div>
                        </SelectItem>
                      ))}
                            </div>
                    </SelectContent>
                  </Select>
                </div>
              </div>

                    <div className="pt-2">
                      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <FolderPlus className="h-5 w-5 text-primary" />
                              <span>Créer un nouveau dossier</span>
                            </DialogTitle>
                            <DialogDescription>
                              Créez un nouveau dossier pour organiser vos documents
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="folderName">Nom du dossier</Label>
                              <Input
                                id="folderName"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Mon nouveau dossier"
                                className="border-primary/20 focus:border-primary/40"
                              />
                            </div>
                            <DialogFooter className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setCreateFolderDialogOpen(false);
                                  if (!newDocumentDialogOpen) {
                                    setNewDocumentDialogOpen(true);
                                  }
                                }}
                                className="border-primary/20"
                              >
                  Annuler
                </Button>
                <Button
                                onClick={() => {
                                  createFolderMutation.mutate(newFolderName);
                                  // Ne pas réouvrir ici, c'est fait dans onSuccess du mutation
                                }}
                                disabled={!newFolderName.trim()}
                                className="bg-gradient-to-r from-primary to-blue-500"
                              >
                                Créer le dossier
                </Button>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5 backdrop-blur-sm rounded-xl p-4 border border-primary/10 order-1 md:order-2">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      Document PDF
                    </h3>
                    <PdfUpload
                      onFileSelected={handleFileSelected}
                      label="Glisser ou sélectionner un PDF"
                      className="min-h-[150px] flex flex-col items-center justify-center bg-white/60 transition-all duration-300 hover:bg-white/80 rounded-lg border-primary/20 border-dashed"
                    />
                    {selectedFile && (
                      <div className="mt-3 bg-white/60 rounded-lg p-3 border border-primary/20">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium truncate">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                </div>
                </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 p-4 border-t border-primary/20">
                <CustomDialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setNewDocumentDialogOpen(false)}
                    className="bg-white/70 hover:bg-white border-primary/20 hover:border-primary/40 transition-all duration-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateDocument}
                    disabled={!selectedFile || !documentTitle.trim() || isUploading}
                    className="bg-gradient-to-r from-primary via-blue-500 to-purple-600 hover:opacity-90 transition-all duration-300"
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        <span>Création en cours...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Créer le document</span>
                      </div>
                    )}
                  </Button>
                </CustomDialogFooter>
              </div>
            </CustomDialogContent>
          </CustomDialog>

          <Button 
            className="gap-2 bg-gradient-to-r from-primary via-purple-500 to-blue-500 hover:from-primary/90 hover:via-purple-500/90 hover:to-blue-500/90 shadow-lg hover:shadow-xl transition-all duration-300 animate-gradient-x"
            onClick={() => setNewDocumentDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Ajouter un document
          </Button>
        </div>
      </div>

      <div className="mb-6 space-y-4 p-4 rounded-xl bg-gradient-to-r from-background/80 to-background/40 backdrop-blur-xl border border-primary/20">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par titre, type ou dossier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all duration-300"
            />
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 bg-gradient-to-r from-background to-muted hover:from-muted hover:to-background transition-all duration-300 border-primary/20 hover:border-primary/40"
          >
                  <Folder className="h-4 w-4" />
                  Dossiers
                  <Badge variant="secondary" className="ml-2 bg-primary/10">
                    {folders.length}
                  </Badge>
          </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-primary/30 backdrop-blur-lg bg-white">
                <div className="bg-white p-4 border-b border-primary/20">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Folder className="h-5 w-5 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">Gestion des dossiers</DialogTitle>
                      </div>
      </div>
                </DialogHeader>
                </div>
                <div className="p-4 space-y-4">
                <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      <Search className="h-4 w-4" />
                    </div>
                  <Input
                    type="text"
                      placeholder="Rechercher un dossier..."
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                      className="pl-10 bg-white rounded-full border-primary/20 focus:border-primary/40 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                      className={`justify-start rounded-lg transition-all duration-300 ${
                      selectedFolderId === "all"
                          ? "bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/5 text-primary shadow-sm"
                          : "hover:bg-primary/5 text-gray-800"
                    }`}
                    onClick={() => setSelectedFolderId("all")}
                  >
                      <div className={`p-1.5 rounded-full mr-2 ${selectedFolderId === "all" ? "bg-primary/20" : "bg-primary/10"}`}>
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 text-sm font-medium">Tous les documents</span>
                      <Badge variant="secondary" className={`ml-2 ${selectedFolderId === "all" ? "bg-primary/20" : "bg-primary/10"}`}>
                      {documents.length}
                    </Badge>
                  </Button>
                    
                  <Button
                    variant="ghost"
                      className={`justify-start rounded-lg transition-all duration-300 ${
                      selectedFolderId === "none"
                          ? "bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/5 text-primary shadow-sm"
                          : "hover:bg-primary/5 text-gray-800"
                    }`}
                    onClick={() => setSelectedFolderId("none")}
                  >
                      <div className={`p-1.5 rounded-full mr-2 ${selectedFolderId === "none" ? "bg-primary/20" : "bg-primary/10"}`}>
                        <FileX className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 text-sm font-medium">Sans dossier</span>
                      <Badge variant="secondary" className={`ml-2 ${selectedFolderId === "none" ? "bg-primary/20" : "bg-primary/10"}`}>
                      {documents.filter(d => !d.folderId).length}
                    </Badge>
                  </Button>
                  </div>
                  
                  <div className="border border-primary/10 rounded-xl overflow-hidden bg-white">
                    <div className="bg-white px-3 py-2 flex items-center border-b border-primary/10">
                      <FolderOpen className="h-4 w-4 mr-2 text-primary/70" />
                      <span className="text-sm font-medium text-primary/70">Mes dossiers ({folders.length})</span>
                    </div>
                    <ScrollArea className="h-[350px]">
                      <div className="p-1">
                        {currentFolders.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-20 text-center text-gray-500">
                            <FolderX className="h-5 w-5 mb-1 opacity-40" />
                            <p className="text-xs">Aucun dossier correspondant</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-1">
                  {currentFolders.map(folder => {
                    const folderDocCount = documents.filter(d => d.folderId === folder.id).length;
                    return (
                          <div key={folder.id} className="group relative">
                        <Button
                          variant="ghost"
                                  className={`justify-start rounded-lg p-2 h-auto transition-all duration-300 w-full ${
                            selectedFolderId === folder.id.toString()
                                      ? "bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/5 text-primary shadow-sm"
                                      : "hover:bg-primary/5 text-gray-800"
                            }`}
                          onClick={() => setSelectedFolderId(folder.id.toString())}
                        >
                                  <div className="flex items-center gap-2 w-full">
                                    <div className={`p-1.5 rounded-full ${selectedFolderId === folder.id.toString() ? "bg-primary/20" : "bg-primary/10"}`}>
                                      <Folder className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                      <div className="truncate text-sm font-medium">{folder.name}</div>
                                      <div className="text-xs text-gray-500">{folderDocCount} document{folderDocCount !== 1 ? 's' : ''}</div>
                                    </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          variant="ghost"
                          size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                            window.open(`/api/folders/${folder.id}/download`, '_blank');
                            toast({
                              title: "✨ Exportation en cours",
                              description: "Le téléchargement du dossier va commencer",
                              className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
                            });
                          }}
                          title="Télécharger le dossier"
                                        className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary"
                        >
                                    <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFolderToDelete({ id: folder.id, name: folder.name });
                                    }}
                          title="Supprimer le dossier"
                                        className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                        </Button>
                      </div>
                    );
                  })}
                </div>
                      </div>
                      
                    {filteredFolders.length > FOLDERS_PER_PAGE && (
                        <div className="px-4 py-2 flex items-center justify-center gap-2 border-t border-primary/10 bg-white">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFolderPageChange(currentFolderPage - 1)}
                      disabled={currentFolderPage === 1}
                            className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                          <span className="text-sm text-gray-500">
                      {currentFolderPage} / {totalFolderPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFolderPageChange(currentFolderPage + 1)}
                      disabled={currentFolderPage >= totalFolderPages}
                            className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </ScrollArea>
                  </div>
                </div>
                
                <div className="p-4 border-t border-primary/10 bg-white">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newFolderName.trim()) {
                        createFolderMutation.mutate(newFolderName);
                        setNewFolderName("");
                      }
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <FolderPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Nouveau dossier..."
                        className="pl-10 rounded-full bg-white border-primary/20 focus:border-primary/40"
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="rounded-full hover:bg-primary/10 bg-white border border-primary/20 text-gray-800"
                      disabled={!newFolderName.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Créer
                    </Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2 bg-gradient-to-r from-background to-muted hover:from-muted hover:to-background transition-all duration-300 border-primary/20 hover:border-primary/40"
            >
              <Filter className="h-4 w-4" />
              Filtres avancés
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="grid grid-cols-3 gap-4 overflow-hidden"
            >
              <Select
                value={advancedFilters.dateRange}
                onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={advancedFilters.sortBy}
                onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={advancedFilters.sortOrder}
                onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, sortOrder: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ordre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Croissant</SelectItem>
                  <SelectItem value="desc">Décroissant</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/60 to-background/40 backdrop-blur-xl border border-primary/20 rounded-xl shadow-lg"></div>
              <TabsList className="relative flex flex-wrap gap-1 p-1 min-h-[2.5rem] pl-0 overflow-x-auto md:overflow-visible max-w-full md:flex-wrap">
              <TabsTrigger
                value="all"
                  className="rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:via-purple-500/10 data-[state=active]:to-blue-500/5 data-[state=active]:text-primary whitespace-nowrap px-2 py-1 min-w-[80px] flex items-center justify-center h-[2rem] group text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <FileText className="h-3 w-3 transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <span className="font-medium">Tous</span>
                    <Badge variant="secondary" className="ml-1 bg-primary/10 backdrop-blur-sm border-primary/20 group-hover:bg-primary/20 transition-colors duration-300 text-xs px-1.5 py-0">
                      {documents.length}
                </Badge>
                  </div>
              </TabsTrigger>
                
                {/* Afficher les types en fonction de la taille de l'écran */}
                {Object.entries(documentTypes)
                  .filter(([value]) => documents.filter(doc => doc.type === value).length > 0)
                  .sort((a, b) => documents.filter(doc => doc.type === b[0]).length - documents.filter(doc => doc.type === a[0]).length)
                  .slice(0, 8)
                  .map(([value, { label, color }], index) => {
                    const typeCount = documents.filter(doc => doc.type === value).length;
                return (
                  <TabsTrigger
                    key={value}
                    value={value}
                        className={`rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:via-purple-500/10 data-[state=active]:to-blue-500/5 data-[state=active]:text-primary whitespace-nowrap px-2 py-1 min-w-[80px] flex items-center justify-center h-[2rem] group relative overflow-hidden text-sm ${
                          // Sur les très petits écrans, n'afficher que les 3 premiers types
                          index >= 3 ? 'hidden sm:flex' : 'flex'
                        } ${
                          // Sur les petits écrans, n'afficher que les 5 premiers types
                          index >= 5 ? 'hidden md:flex' : 'flex'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                        <div className="flex items-center gap-1 relative z-10">
                          <div className="relative">
                            <div className={`w-1.5 h-1.5 rounded-full ${color.replace('bg-', 'bg-')} transition-transform duration-300 group-hover:scale-110`}></div>
                            <div className={`absolute inset-0 ${color.replace('bg-', 'bg-')} rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                          </div>
                          <span className="font-medium text-xs">{label}</span>
                          <Badge variant="secondary" className="ml-1 bg-primary/10 backdrop-blur-sm border-primary/20 group-hover:bg-primary/20 transition-colors duration-300 text-xs px-1 py-0">
                      {typeCount}
                    </Badge>
                        </div>
                  </TabsTrigger>
                );
              })}

                {/* Dropdown pour les autres types qui ont des documents mais ne sont pas dans les 8 premiers, ou n'ont pas de documents */}
                {(Object.entries(documentTypes).filter(([value]) => documents.filter(doc => doc.type === value).length > 0).length > 8 ||
                  Object.entries(documentTypes).filter(([value]) => documents.filter(doc => doc.type === value).length === 0).length > 0) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="rounded-lg bg-background/50 hover:bg-background/80 transition-all duration-300 whitespace-nowrap px-2 py-1 min-w-[80px] flex items-center justify-center gap-1 h-[2rem] group relative overflow-hidden text-sm"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                        <div className="flex items-center gap-1 relative z-10">
                          <ChevronDown className="h-3 w-3 transition-transform duration-300 group-hover:translate-y-0.5" />
                          <span className="font-medium text-xs">Autres</span>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-1 bg-white backdrop-blur-xl shadow-xl border border-primary/20">
                      <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        {/* Afficher d'abord les types qui ont des documents mais qui ne sont pas dans les 8 premiers */}
                        {Object.entries(documentTypes)
                          .filter(([value]) => documents.filter(doc => doc.type === value).length > 0)
                          .sort((a, b) => documents.filter(doc => doc.type === b[0]).length - documents.filter(doc => doc.type === a[0]).length)
                          .slice(8)
                          .map(([value, { label, color }]) => {
                            const typeCount = documents.filter(doc => doc.type === value).length;
                            return (
                              <DropdownMenuItem 
                                key={value}
                                onClick={() => setActiveTab(value)}
                                className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-all duration-200 ${
                                  activeTab === value 
                                    ? "bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/5 text-primary" 
                                    : "hover:bg-primary/10"
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${color.replace('bg-', 'bg-')}`}></div>
                                <span className="flex-1">{label}</span>
                                {activeTab === value ? (
                                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-xs px-1.5">Actuel</Badge>
                                ) : (
                                  <Badge variant="secondary" className="ml-auto bg-muted text-muted-foreground">{typeCount}</Badge>
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                          
                        {/* Ensuite afficher les types qui n'ont pas de documents */}
                        {Object.entries(documentTypes)
                          .filter(([value]) => documents.filter(doc => doc.type === value).length === 0)
                          .map(([value, { label, color }]) => (
                            <DropdownMenuItem 
                              key={value}
                              onClick={() => setActiveTab(value)}
                              className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-all duration-200 ${
                                activeTab === value 
                                  ? "bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/5 text-primary" 
                                  : "hover:bg-primary/10"
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${color.replace('bg-', 'bg-')}`}></div>
                              <span className="flex-1">{label}</span>
                              {activeTab === value ? (
                                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-xs px-1.5">Actuel</Badge>
                              ) : (
                                <Badge variant="secondary" className="ml-auto bg-muted text-muted-foreground">0</Badge>
                              )}
                            </DropdownMenuItem>
                          ))}
                      </div>
                      <div className="p-2 border-t border-primary/10 bg-gradient-to-r from-primary/5 to-purple-500/5">
                        <div className="text-xs text-muted-foreground">
                          <span>{Object.entries(documentTypes).length - 8 - 1} autres types disponibles</span>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-6">
              <AnimatePresence>
                {filteredDocuments.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="p-12 border-dashed bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border-primary/20">
                      <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 p-6">
                          <FileText className="h-12 w-12 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Aucun document</h3>
                          <p className="text-muted-foreground max-w-sm mx-auto">
                            {selectedFolderId === "all"
                              ? "Commencez par ajouter un document PDF"
                              : selectedFolderId === "none"
                                ? "Aucun document sans dossier"
                                : `Aucun document dans ce dossier`}
                          </p>
                        </div>
                        <Button
                          onClick={() => setNewDocumentDialogOpen(true)}
                          className="mt-4"
                          variant="outline"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Ajouter un document
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                <div>
                  <Tabs defaultValue="grid">
                    <div className="flex justify-end mb-4">
                      <TabsList>
                        <TabsTrigger value="grid">Grille</TabsTrigger>
                        <TabsTrigger value="list">Liste</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="grid" className="mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentDocuments.map((doc) => (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{
                              duration: 0.4,
                              ease: "easeOut",
                              delay: Math.random() * 0.2
                            }}
                            whileHover={{ 
                              y: -5,
                              scale: 1.02,
                              transition: { 
                                duration: 0.3,
                                ease: "easeOut"
                              }
                            }}
                            className="relative"
                          >
                            <Card className="group h-full flex flex-col hover:shadow-2xl transition-all duration-500 border border-primary/10 hover:border-primary/30 overflow-hidden bg-gradient-to-br from-background/40 via-background/20 to-background/10">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-primary group-hover:via-purple-500 group-hover:to-blue-500 transition-all duration-500"></div>
                              
                              {/* Effet futuriste au survol */}
                              <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_var(--x)_var(--y),theme(colors.primary/5%),transparent_40%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ '--x': '50%', '--y': '50%' } as React.CSSProperties}></div>
                              <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-transparent via-transparent to-transparent group-hover:from-blue-500/50 group-hover:via-purple-500/50 group-hover:to-primary/50 transition-all duration-500"></div>
                              
                              <CardHeader className="bg-gradient-to-r from-background/80 to-muted/5 pb-2 relative">
                                <div className="flex justify-between items-start gap-2">
                                    <Badge
                                      variant="outline"
                                      className={`${documentTypes[doc.type as keyof typeof documentTypes]?.color || documentTypes.other.color} bg-opacity-20 text-xs font-medium px-2.5 py-1 transition-all duration-300 group-hover:bg-opacity-30 backdrop-blur-sm`}
                                    >
                                      {documentTypes[doc.type as keyof typeof documentTypes]?.label || documentTypes.other.label}
                                    </Badge>
                                  <div className="text-xs text-muted-foreground flex items-center bg-background/50 px-2 py-1 rounded-full transition-all duration-300 group-hover:bg-background/70 backdrop-blur-sm">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {doc.createdAt
                                      ? formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: fr })
                                      : "Date inconnue"}
                                  </div>
                                </div>
                                <CardTitle className="truncate text-base font-medium mt-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent group-hover:from-primary group-hover:to-purple-500 transition-all duration-300">{doc.title}</CardTitle>
                              </CardHeader>
                              
                              <CardContent className="flex-1 p-4 relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10 space-y-2">
                                  <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300">
                                    <div className="p-1.5 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-all duration-300 shadow-sm group-hover:shadow-md">
                                      {documentTypeIcons[doc.type as keyof typeof documentTypeIcons] || <FileText className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors duration-300" />}
                                    </div>
                                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300 truncate">{doc.originalName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm group-hover:translate-x-1 transition-transform duration-300">
                                    <div className="p-1.5 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-all duration-300 shadow-sm group-hover:shadow-md">
                                      <Folder className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                                        {doc.folderId ? (
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            {folders.find(f => f.id === doc.folderId)?.name || "Dossier inconnu"}
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                            Non lié
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-xs text-muted-foreground/70">
                                        {doc.folderId ? "Document lié à un dossier" : "Document non lié"}
                                      </span>
                                </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm group-hover:translate-x-1 transition-transform duration-300">
                                    <div className="p-1.5 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-all duration-300 shadow-sm group-hover:shadow-md">
                                      <Info className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                                        {doc.formData?.source === 'maintenance' || doc.type === 'maintenance' || doc.formData?.uploadContext === 'maintenance' || doc.formData?.uploadContext === 'maintenance_edit' ? (
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                            Document de maintenance
                                          </span>
                                        ) : doc.formData?.source === 'finance' || doc.type === 'invoice' || doc.type === 'lease' || doc.formData?.uploadContext === 'transaction' ? (
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Document financier
                                          </span>
                                        ) : doc.formData?.source === 'tenant' || doc.type === 'contract' ? (
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                            Document locataire
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                            Document standard
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-xs text-muted-foreground/70">
                                        {doc.formData?.source === 'maintenance' || doc.type === 'maintenance' || doc.formData?.uploadContext === 'maintenance' || doc.formData?.uploadContext === 'maintenance_edit'
                                          ? doc.formData?.uploadContext === 'maintenance_edit' || doc.formData?.uploadSource === 'maintenance_edit_form'
                                            ? "Document uploadé via le formulaire modification Maintenance"
                                            : "Document uploadé via le formulaire Maintenance"
                                          : doc.formData?.source === 'finance' || doc.type === 'invoice' || doc.type === 'lease' || doc.formData?.uploadContext === 'transaction'
                                            ? doc.formData?.description?.includes("modification")
                                              ? "Document uploadé via le formulaire modification Finances"
                                              : "Document uploadé via le formulaire Finances"
                                            : doc.formData?.source === 'tenant' || doc.type === 'contract'
                                              ? "Document uploadé via le formulaire Locataire"
                                              : "Document uploadé manuellement"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>

                              <CardFooter className="p-4 pt-0 relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10 w-full flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="hover:bg-primary/10 hover:text-primary transition-all duration-300 relative overflow-hidden group/btn"
                                          title="Déplacer"
                                        >
                                          <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover/btn:opacity-100 transition-all duration-300"></span>
                                          <Folder className="h-4 w-4 relative z-10" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-72 p-0 overflow-hidden bg-white border border-primary/20 shadow-xl">
                                        <div className="p-2 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-purple-500/5">
                                          <div className="relative">
                                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <input 
                                              className="w-full py-1.5 pl-8 pr-2 bg-background/50 border border-primary/10 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary/20" 
                                              placeholder="Rechercher un dossier..." 
                                              onChange={(e) => {
                                                const searchValue = e.target.value.toLowerCase();
                                                const folderItems = window.document.querySelectorAll('[data-folder-item]');
                                                folderItems.forEach((item) => {
                                                  const htmlItem = item as HTMLElement;
                                                  const text = htmlItem.dataset.folderName?.toLowerCase() || '';
                                                  htmlItem.style.display = text.includes(searchValue) ? 'flex' : 'none';
                                        });
                                      }}
                                          />
                                          </div>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-1 scrollbar-thin">
                                          <div 
                                            data-folder-item
                                            data-folder-name="Sans dossier"
                                            onClick={() => handleMoveDocument(doc.id, null)}
                                            className="flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-md cursor-pointer transition-all duration-200 group"
                                          >
                                            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-background/80 border border-primary/10 group-hover:border-primary/30 transition-all duration-300">
                                              <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                                            </div>
                                            <span className="flex-1 text-sm font-medium">Sans dossier</span>
                                            {doc.folderId === null && (
                                              <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-xs px-1.5">Actuel</Badge>
                                            )}
                                          </div>
                                        {folders.map(folder => (
                                            <div 
                                              key={folder.id} 
                                              data-folder-item
                                              data-folder-name={folder.name}
                                              onClick={() => !folder || doc.folderId === folder.id ? null : handleMoveDocument(doc.id, folder.id)}
                                              className={`flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-md cursor-pointer transition-all duration-200 group ${doc.folderId === folder.id ? 'bg-primary/5' : ''}`}
                                            >
                                              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-background/80 border border-primary/10 group-hover:border-primary/30 transition-all duration-300">
                                                <Folder className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                                              </div>
                                              <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
                                              {doc.folderId === folder.id && (
                                                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-xs px-1.5">Actuel</Badge>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <div className="p-2 border-t border-primary/10 bg-gradient-to-r from-primary/5 to-purple-500/5">
                                          <div className="text-xs text-muted-foreground mb-2">
                                            <span>{folders.length} dossiers</span>
                                          </div>
                                          <form 
                                            onSubmit={(e) => {
                                              e.preventDefault();
                                              if (newFolderName.trim()) {
                                                createFolderMutation.mutate(newFolderName);
                                                setNewFolderName("");
                                              }
                                            }}
                                            className="flex gap-2"
                                          >
                                            <Input
                                              value={newFolderName}
                                              onChange={(e) => setNewFolderName(e.target.value)}
                                              placeholder="Nouveau dossier..."
                                              className="h-7 text-xs"
                                            />
                                  <Button
                                              type="submit"
                                              size="sm" 
                                              className="h-7 text-xs hover:bg-primary/10"
                                              disabled={!newFolderName.trim()}
                                            >
                                              <Plus className="h-3 w-3" />
                                  </Button>
                                          </form>
                                        </div>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                      onClick={() => handleDownload(doc)}
                                      className="hover:bg-primary/10 hover:text-primary transition-all duration-300 relative overflow-hidden group/btn"
                                      title="Télécharger"
                                    >
                                      <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover/btn:opacity-100 transition-all duration-300"></span>
                                      <Download className="h-4 w-4 relative z-10" />
                                  </Button>
                                    <DocumentViewerButton
                                      documentId={doc.id}
                                      section="documents"
                                      className="hover:bg-primary/10 hover:text-primary transition-all duration-300 relative overflow-hidden group/btn"
                                      onClick={() => handlePreview(doc)}
                                    >
                                      <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover/btn:opacity-100 transition-all duration-300"></span>
                                      <Eye className="h-4 w-4 relative z-10" />
                                    </DocumentViewerButton>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => confirmDelete(doc)}
                                      className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 relative overflow-hidden group/btn"
                                      title="Supprimer"
                                    >
                                      <span className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-red-500/10 opacity-0 group-hover/btn:opacity-100 transition-all duration-300"></span>
                                      <Trash2 className="h-4 w-4 relative z-10" />
                                    </Button>
                                  </div>
                                  </div>
                                </CardFooter>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                      <div className="mt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Afficher</span>
                            <select 
                              value={itemsPerPage}
                              onChange={(e) => {
                                const newPageSize = Number(e.target.value);
                                handleItemsPerPageChange(newPageSize);
                              }}
                              className="h-8 w-16 rounded-md border border-input bg-background/50 backdrop-blur-sm px-2 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all duration-300"
                            >
                              {[5, 10, 20, 50].map(size => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                            <span>par page | Total: <span className="font-semibold text-primary">{filteredDocuments.length}</span> document{filteredDocuments.length > 1 ? 's' : ''}</span>
                          </div>
                          
                          {totalPages > 1 && (
                            <div className="flex items-center space-x-2 relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-full opacity-30 blur-md -z-10"></div>
                        <Button
                          variant="outline"
                          size="sm"
                                onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                                className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                aria-label="Première page"
                              >
                                <span className="sr-only">Première page</span>
                                <ChevronsLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                aria-label="Page précédente"
                              >
                                <span className="sr-only">Page précédente</span>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNumber;
                                  
                                  if (totalPages <= 5) {
                                    pageNumber = i + 1;
                                  } else if (currentPage <= 3) {
                                    pageNumber = i + 1;
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNumber = totalPages - 4 + i;
                                  } else {
                                    pageNumber = currentPage - 2 + i;
                                  }
                                  
                                  return (
                                    <Button 
                                      key={pageNumber}
                                      variant={currentPage === pageNumber ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handlePageChange(pageNumber)}
                                      className={`h-8 w-8 p-0 transition-all duration-300 border-primary/20 ${
                                        currentPage === pageNumber 
                                          ? "bg-gradient-to-br from-primary via-primary/90 to-purple-500/80 text-white shadow-md hover:shadow-lg hover:from-primary/90 hover:to-purple-500/70" 
                                          : "hover:bg-primary/10 hover:border-primary/30"
                                      }`}
                                    >
                                      {pageNumber}
                                    </Button>
                                  );
                                })}
                                
                                {totalPages > 5 && currentPage < totalPages - 2 && (
                                  <>
                                    <span className="px-1">...</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePageChange(totalPages)}
                                      className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                    >
                                      {totalPages}
                                    </Button>
                                  </>
                                )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                aria-label="Page suivante"
                              >
                                <span className="sr-only">Page suivante</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                aria-label="Dernière page"
                              >
                                <span className="sr-only">Dernière page</span>
                                <ChevronsRight className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="list" className="mt-0">
                      <div className="rounded-xl overflow-hidden border border-primary/20 bg-card/40 backdrop-blur-xl shadow-lg">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-primary/80 w-[30%]">Nom</TableHead>
                              <TableHead className="text-primary/80 w-[15%]">Type</TableHead>
                              <TableHead className="text-primary/80 w-[20%]">Dossier</TableHead>
                              <TableHead className="text-primary/80 w-[15%]">Date</TableHead>
                              <TableHead className="text-primary/80 w-[20%] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentDocuments.map((document, index) => (
                              <TableRow key={document.id} className="group hover:bg-muted/50 relative">
                                <TableCell className="font-medium transition-colors group-hover:text-primary py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-all duration-300">
                                      {documentTypeIcons[document.type as keyof typeof documentTypeIcons] || <FileText className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-300" />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-medium truncate">{document.title}</span>
                                      <span className="text-xs text-muted-foreground truncate">{document.originalName}</span>
                                    </div>
                                  </div>
                                  </TableCell>
                                <TableCell className="py-4">
                                    <Badge 
                                      variant="outline" 
                                      className={`${documentTypes[document.type as keyof typeof documentTypes]?.color || documentTypes.other.color} bg-opacity-20 flex items-center gap-1.5 transition-all duration-300 group-hover:bg-opacity-30`}
                                    >
                                    <div className="flex items-center gap-1.5">
                                      <div className="relative">
                                        {document.type === 'contract' && <FileText className="h-3 w-3 text-blue-500 group-hover:text-blue-600 transition-colors duration-300" />}
                                        {document.type === 'lease' && <FilePenLine className="h-3 w-3 text-green-500 group-hover:text-green-600 transition-colors duration-300" />}
                                        {document.type === 'invoice' && <FileSpreadsheet className="h-3 w-3 text-purple-500 group-hover:text-purple-600 transition-colors duration-300" />}
                                        {document.type === 'form' && <FileText className="h-3 w-3 text-orange-500 group-hover:text-orange-600 transition-colors duration-300" />}
                                        {document.type === 'maintenance' && <FileImage className="h-3 w-3 text-red-500 group-hover:text-red-600 transition-colors duration-300" />}
                                        {document.type === 'insurance' && <FileText className="h-3 w-3 text-indigo-500 group-hover:text-indigo-600 transition-colors duration-300" />}
                                        {document.type === 'tax' && <FileText className="h-3 w-3 text-yellow-500 group-hover:text-yellow-600 transition-colors duration-300" />}
                                        {document.type === 'legal' && <FileText className="h-3 w-3 text-pink-500 group-hover:text-pink-600 transition-colors duration-300" />}
                                        {document.type === 'certificate' && <FileText className="h-3 w-3 text-teal-500 group-hover:text-teal-600 transition-colors duration-300" />}
                                        {document.type === 'payment' && <FileText className="h-3 w-3 text-emerald-500 group-hover:text-emerald-600 transition-colors duration-300" />}
                                        {document.type === 'deposit' && <FileText className="h-3 w-3 text-cyan-500 group-hover:text-cyan-600 transition-colors duration-300" />}
                                        {document.type === 'budget' && <FileText className="h-3 w-3 text-rose-500 group-hover:text-rose-600 transition-colors duration-300" />}
                                        {document.type === 'expense' && <FileText className="h-3 w-3 text-amber-500 group-hover:text-amber-600 transition-colors duration-300" />}
                                        {document.type === 'tenant' && <FileText className="h-3 w-3 text-violet-500 group-hover:text-violet-600 transition-colors duration-300" />}
                                        {document.type === 'guarantor' && <FileText className="h-3 w-3 text-sky-500 group-hover:text-sky-600 transition-colors duration-300" />}
                                        {document.type === 'inventory' && <FileText className="h-3 w-3 text-lime-500 group-hover:text-lime-600 transition-colors duration-300" />}
                                        {document.type === 'complaint' && <FileText className="h-3 w-3 text-red-400 group-hover:text-red-500 transition-colors duration-300" />}
                                        {document.type === 'inspection' && <FileText className="h-3 w-3 text-blue-400 group-hover:text-blue-500 transition-colors duration-300" />}
                                        {document.type === 'repair' && <FileText className="h-3 w-3 text-green-400 group-hover:text-green-500 transition-colors duration-300" />}
                                        {document.type === 'renovation' && <FileText className="h-3 w-3 text-purple-400 group-hover:text-purple-500 transition-colors duration-300" />}
                                        {document.type === 'plan' && <FileText className="h-3 w-3 text-orange-400 group-hover:text-orange-500 transition-colors duration-300" />}
                                        {document.type === 'notice' && <FileText className="h-3 w-3 text-indigo-400 group-hover:text-indigo-500 transition-colors duration-300" />}
                                        {document.type === 'correspondence' && <FileText className="h-3 w-3 text-yellow-400 group-hover:text-yellow-500 transition-colors duration-300" />}
                                        {document.type === 'report' && <FileText className="h-3 w-3 text-pink-400 group-hover:text-pink-500 transition-colors duration-300" />}
                                        {document.type === 'meeting' && <FileText className="h-3 w-3 text-teal-400 group-hover:text-teal-500 transition-colors duration-300" />}
                                        {(!document.type || document.type === 'other') && <File className="h-3 w-3 text-gray-500 group-hover:text-gray-600 transition-colors duration-300" />}
                                        <div className={`absolute inset-0 ${documentTypes[(document.type || 'other') as keyof typeof documentTypes]?.color || documentTypes.other.color} rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                      </div>
                                      <span className={`w-1.5 h-1.5 rounded-full ${documentTypes[(document.type || 'other') as keyof typeof documentTypes]?.color || documentTypes.other.color}`}></span>
                                      <span className="font-medium text-xs truncate">
                                        {documentTypeLabels[(document.type || 'other') as keyof typeof documentTypeLabels] || documentTypes[(document.type || 'other') as keyof typeof documentTypes]?.label || "Autre"}
                                      </span>
                                    </div>
                                    </Badge>
                                  </TableCell>
                                <TableCell className="py-4">
                                    {document.folderId ? (
                                      <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500/10 border border-green-500/30 group-hover:bg-green-500/20 transition-all duration-300">
                                        <Folder className="h-4 w-4 text-green-500" />
                                        </div>
                                      <span className="text-sm font-medium transition-colors group-hover:text-primary truncate">
                                          {folders.find(f => f.id === document.folderId)?.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground flex items-center gap-2">
                                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-400/10 border border-gray-400/30 group-hover:bg-gray-400/20 transition-all duration-300">
                                        <Folder className="h-4 w-4 text-gray-400" />
                                        </div>
                                      <span className="truncate">Aucun dossier</span>
                                      </span>
                                    )}
                                  </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/30 group-hover:bg-primary/20 transition-all duration-300">
                                      <Clock className="h-4 w-4 text-primary" />
                                      </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-medium transition-colors group-hover:text-primary truncate">
                                    {format(new Date(document.createdAt), 'dd/MM/yyyy', { locale: fr })}
                                      </span>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true, locale: fr })}
                                      </span>
                                    </div>
                                    </div>
                                  </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex justify-end gap-1">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="relative overflow-hidden group border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                          >
                                            <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
                                            <Folder className="h-4 w-4 relative z-10" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden bg-white border border-primary/20 shadow-xl">
                                          <div className="p-2 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-purple-500/5">
                                            <div className="relative">
                                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                              <input 
                                                className="w-full py-1.5 pl-8 pr-2 bg-background/50 border border-primary/10 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary/20" 
                                                placeholder="Rechercher un dossier..." 
                                                onChange={(e) => {
                                                  const searchValue = e.target.value.toLowerCase();
                                                  const folderItems = window.document.querySelectorAll('[data-folder-list-item]');
                                                  folderItems.forEach((item) => {
                                                    const htmlItem = item as HTMLElement;
                                                    const text = htmlItem.dataset.folderName?.toLowerCase() || '';
                                                    htmlItem.style.display = text.includes(searchValue) ? 'flex' : 'none';
                                                  });
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <div className="max-h-64 overflow-y-auto p-1 scrollbar-thin">
                                            <div 
                                              data-folder-list-item
                                              data-folder-name="Sans dossier"
                                              onClick={() => handleMoveDocument(document.id, null)}
                                              className="flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-md cursor-pointer transition-all duration-200 group"
                                            >
                                              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-background/80 border border-primary/10 group-hover:border-primary/30 transition-all duration-300">
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                                              </div>
                                              <span className="flex-1 text-sm font-medium">Sans dossier</span>
                                              {document.folderId === null && (
                                                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-xs px-1.5">Actuel</Badge>
                                              )}
                                            </div>
                                            {folders.map(folder => (
                                              <div 
                                                key={folder.id} 
                                                data-folder-list-item
                                                data-folder-name={folder.name}
                                                onClick={() => !folder || document.folderId === folder.id ? null : handleMoveDocument(document.id, folder.id)}
                                                className={`flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-md cursor-pointer transition-all duration-200 group ${document.folderId === folder.id ? 'bg-primary/5' : ''}`}
                                              >
                                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-background/80 border border-primary/10 group-hover:border-primary/30 transition-all duration-300">
                                                  <Folder className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                                                </div>
                                                <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
                                                {document.folderId === folder.id && (
                                                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-xs px-1.5">Actuel</Badge>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                          <div className="p-2 border-t border-primary/10 bg-gradient-to-r from-primary/5 to-purple-500/5">
                                            <div className="text-xs text-muted-foreground mb-2">
                                              <span>{folders.length} dossiers</span>
                                            </div>
                                            <form 
                                              onSubmit={(e) => {
                                                e.preventDefault();
                                                if (newFolderName.trim()) {
                                                  createFolderMutation.mutate(newFolderName);
                                                  setNewFolderName("");
                                                }
                                              }}
                                              className="flex gap-2"
                                            >
                                              <Input
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                placeholder="Nouveau dossier..."
                                                className="h-7 text-xs"
                                              />
                                              <Button 
                                                type="submit"
                                                size="sm" 
                                                className="h-7 text-xs hover:bg-primary/10"
                                                disabled={!newFolderName.trim()}
                                              >
                                                <Plus className="h-3 w-3" />
                                              </Button>
                                            </form>
                                          </div>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleDownload(document)}
                                        className="border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300" 
                                        onClick={() => confirmDelete(document)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                      <DocumentViewerButton
                                        documentId={document.id}
                                        section="documents"
                                        className="border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                        onClick={() => handlePreview(document)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </DocumentViewerButton>
                                    </div>
                                  </TableCell>
                              </TableRow>
                              ))}
                          </TableBody>
                        </Table>

                        {filteredDocuments.length > itemsPerPage && (
                          <div className="p-4 border-t border-primary/20 bg-gradient-to-r from-background/90 via-background/70 to-background/50">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Afficher</span>
                                <select 
                                  value={itemsPerPage}
                                  onChange={(e) => {
                                    const newPageSize = Number(e.target.value);
                                    handleItemsPerPageChange(newPageSize);
                                  }}
                                  className="h-8 w-16 rounded-md border border-input bg-background/50 backdrop-blur-sm px-2 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all duration-300"
                                >
                                  {[5, 10, 20, 50].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                                <span>par page | Total: <span className="font-semibold text-primary">{filteredDocuments.length}</span> document{filteredDocuments.length > 1 ? 's' : ''}</span>
                              </div>
                              
                              {totalPages > 1 && (
                              <div className="flex items-center space-x-2 relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-full opacity-30 blur-md -z-10"></div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePageChange(1)}
                                  disabled={currentPage === 1}
                                  className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                  aria-label="Première page"
                                >
                                  <span className="sr-only">Première page</span>
                                  <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                  disabled={currentPage === 1}
                                  className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                  aria-label="Page précédente"
                                >
                                  <span className="sr-only">Page précédente</span>
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNumber;
                                      
                                    if (totalPages <= 5) {
                                      pageNumber = i + 1;
                                    } else if (currentPage <= 3) {
                                      pageNumber = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                      pageNumber = totalPages - 4 + i;
                                    } else {
                                      pageNumber = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                      <Button 
                                        key={pageNumber}
                                        variant={currentPage === pageNumber ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(pageNumber)}
                                        className={`h-8 w-8 p-0 transition-all duration-300 border-primary/20 ${
                                          currentPage === pageNumber 
                                            ? "bg-gradient-to-br from-primary via-primary/90 to-purple-500/80 text-white shadow-md hover:shadow-lg hover:from-primary/90 hover:to-purple-500/70" 
                                            : "hover:bg-primary/10 hover:border-primary/30"
                                        }`}
                                      >
                                        {pageNumber}
                                      </Button>
                                    );
                                  })}
                                  
                                  {totalPages > 5 && currentPage < totalPages - 2 && (
                                    <>
                                      <span className="px-1">...</span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(totalPages)}
                                        className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                      >
                                        {totalPages}
                                      </Button>
                                    </>
                                  )}
                                </div>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                  disabled={currentPage === totalPages}
                                  className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                  aria-label="Page suivante"
                                >
                                  <span className="sr-only">Page suivante</span>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePageChange(totalPages)}
                                  disabled={currentPage === totalPages}
                                  className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                                  aria-label="Dernière page"
                                >
                                  <span className="sr-only">Dernière page</span>
                                  <ChevronsRight className="h-4 w-4" />
                                </Button>
                              </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Le document "{documentToDelete?.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée.
              <div className="mt-4 flex items-center space-x-2">
                <Checkbox
                  id="deleteDocuments"
                  checked={deleteWithDocuments}
                  onCheckedChange={(checked) => setDeleteWithDocuments(checked as boolean)}
                />
                <label
                  htmlFor="deleteDocuments"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Supprimer également les documents contenus dans le dossier
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFolderDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedDocument && (
        <PdfViewerDialog
          fileUrl={selectedDocument.fileUrl || ''}
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
};

export default DocumentList;