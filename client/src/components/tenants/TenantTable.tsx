import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2,
  Archive,
  Eye,
  Trash2,
  Home,
  Calendar,
  Euro,
  AlertTriangle,
  Phone,
  FileText,
  ChevronDown,
  Mail,
  ChevronsLeft,
  ChevronsRight,
  Search,
  MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TenantWithDetails } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

// Ajout des labels pour les types de bail
const leaseTypeLabels: { [key: string]: string } = {
  bail_meuble: "Bail meublé",
  bail_vide: "Bail vide",
  bail_commercial: "Bail commercial",
  bail_professionnel: "Bail professionnel",
  bail_mobilite: "Bail mobilité",
  bail_etudiant: "Bail étudiant",
  bail_saisonnier: "Bail saisonnier",
  bail_terrain: "Bail terrain",
  bail_garage: "Bail garage",
  bail_social: "Bail social",
  bail_mixte: "Bail mixte",
  bail_derogatoire: "Bail dérogatoire",
  bail_rehabilitation: "Bail réhabilitation"
};

interface TenantTableProps {
  tenants: TenantWithDetails[];
  showArchived?: boolean;
  onDelete: (tenant: TenantWithDetails) => void;
  onEdit: (tenant: TenantWithDetails) => void;
  onArchive: (tenant: TenantWithDetails) => void;
}

const ITEMS_PER_PAGE = 20;

export function TenantTable({ tenants, showArchived = false, onDelete, onEdit, onArchive }: TenantTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);

  // Pagination des données
  const totalPages = Math.ceil(tenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTenants = tenants.slice(startIndex, startIndex + itemsPerPage);

  // Fonction pour changer de page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll vers le haut de la table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreview = async (tenant: TenantWithDetails) => {
    try {
      // Vérifier d'abord si le locataire a des documents
      if (!tenant.documents || tenant.documents.length === 0) {
        toast({
          title: "Information",
          description: "Aucun document disponible pour ce locataire",
          variant: "default",
        });
        return;
      }

      // Récupérer tous les documents valides du locataire (avec vérification stricte)
      const validDocuments = tenant.documents
        .filter(d => d && d.document && typeof d.document === 'object' && d.document.id && typeof d.document.id === 'number')
        .map(d => d.document);
      
      if (validDocuments.length === 0) {
        toast({
          title: "Information",
          description: "Aucun document disponible pour ce locataire",
          variant: "default",
        });
        return;
      }

      // Stocker tous les IDs des documents
      const docIds = validDocuments.map(doc => doc.id);
      
      // Ouvrir directement la prévisualisation
      setSelectedDocumentIds(docIds);
      setCurrentDocumentIndex(0);
      setSelectedDocument(docIds[0]);
      setShowPreview(true);
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le document",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 dark:border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-muted/20">
              <TableRow className="hover:bg-gray-100/50 dark:hover:bg-muted/30 transition-colors">
                <TableHead className="w-[250px] font-semibold text-gray-700 dark:text-muted-foreground">Locataire</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-muted-foreground">Propriété</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-muted-foreground">Type de bail</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-muted-foreground">Période</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-muted-foreground">Loyer</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 dark:text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTenants.map((tenant) => (
                <motion.tr
                  key={tenant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="group hover:bg-gray-50/50 transition-all duration-300 border-b border-gray-200"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {tenant.tenantInfo?.fullName || tenant.user?.fullName || tenant.user?.username || "Locataire sans nom"}
                        {!tenant.tenantInfo?.fullName && !tenant.user?.fullName && tenant.user?.username && (
                          <span className="text-xs text-gray-500 ml-2">(Nom complet manquant)</span>
                        )}
                        {!tenant.tenantInfo && !tenant.user && (
                          <span className="text-xs text-red-500 ml-2">(Utilisateur non associé)</span>
                        )}
                      </span>
                      {tenant.tenantInfo?.email && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tenant.tenantInfo.email}
                        </span>
                      )}
                      {!tenant.tenantInfo?.email && tenant.user?.email && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tenant.user.email}
                        </span>
                      )}
                      {tenant.tenantInfo?.phoneNumber && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {tenant.tenantInfo.phoneNumber}
                        </span>
                      )}
                      {!tenant.tenantInfo?.phoneNumber && tenant.user?.phoneNumber && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {tenant.user.phoneNumber}
                        </span>
                      )}
                      {tenant.documents?.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <FileText className="h-3 w-3" />
                          <span>{tenant.documents.length} document(s)</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-orange-500" />
                      <span>{tenant.property?.name || "Propriété non associée"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-gray-50 border-gray-200">
                      {leaseTypeLabels[tenant.leaseType] || tenant.leaseType?.replace('bail_', '').replace('_', ' ') || 'Type inconnu'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-orange-500" />
                        {tenant.leaseStart ? format(new Date(tenant.leaseStart), "d MMMM yyyy", { locale: fr }) : 'Date non définie'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-orange-500" />
                        {tenant.leaseEnd ? format(new Date(tenant.leaseEnd), "d MMMM yyyy", { locale: fr }) : 'Date non définie'}
                      </span>
                      {tenant.leaseEnd && new Date(tenant.leaseEnd) < addDays(new Date(), 30) && tenant.leaseStatus === "actif" && (
                        <span className="text-yellow-600 flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          Expire bientôt
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-orange-500" />
                      <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(tenant.rentAmount || 0))}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePreview(tenant);
                        }}
                        className="h-8 w-8 hover:bg-gray-100 relative"
                        disabled={!tenant.documents || tenant.documents.length === 0 || !tenant.documents.some(d => d && d.document && typeof d.document === 'object')}
                        title={tenant.documents && tenant.documents.some(d => d && d.document) ? "Voir le document" : "Aucun document disponible"}
                      >
                        <FileText className="h-4 w-4 text-orange-500" />
                        {tenant.documents && tenant.documents.length > 1 && (
                          <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {tenant.documents.filter(d => d && d.document && typeof d.document === 'object').length}
                          </span>
                        )}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                          >
                            <MoreVertical className="h-4 w-4 text-orange-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onEdit(tenant)}>
                            <Edit2 className="h-4 w-4 text-orange-500 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onArchive(tenant)}>
                            <Archive className="h-4 w-4 text-orange-500 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/contracts?tenant=${tenant.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              Contrats
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(tenant)}
                            className="text-red-500 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Nouvelle pagination améliorée */}
        {tenants.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Afficher</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Revenir à la première page
                }}
                className="h-8 w-16 rounded-md border border-input bg-background px-2"
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>par page | Total: {tenants.length} locataire{tenants.length > 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                aria-label="Première page"
              >
                <span className="sr-only">Première page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
                aria-label="Page précédente"
              >
                <span className="sr-only">Page précédente</span>
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  // Afficher 5 pages maximum avec la page actuelle au milieu si possible
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
                      onClick={() => goToPage(pageNumber)}
                      className={`h-8 w-8 p-0 ${
                        currentPage === pageNumber 
                          ? "bg-orange-500 hover:bg-orange-600 text-white" 
                          : ""
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
                      onClick={() => goToPage(totalPages)}
                      className="h-8 w-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                aria-label="Page suivante"
              >
                <span className="sr-only">Page suivante</span>
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
                aria-label="Dernière page"
              >
                <span className="sr-only">Dernière page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>
                {selectedDocumentIds.length > 1 
                  ? `Document ${currentDocumentIndex + 1}/${selectedDocumentIds.length}` 
                  : "Document du bail"}
              </DialogTitle>
              {selectedDocumentIds.length > 1 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                  {selectedDocumentIds.length} documents
                </Badge>
              )}
            </div>
            
            {selectedDocumentIds.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentDocumentIndex === 0}
                  onClick={() => {
                    if (currentDocumentIndex > 0) {
                      const newIndex = currentDocumentIndex - 1;
                      setCurrentDocumentIndex(newIndex);
                      setSelectedDocument(selectedDocumentIds[newIndex]);
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>
                <span className="text-sm text-gray-500">
                  {currentDocumentIndex + 1} / {selectedDocumentIds.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentDocumentIndex === selectedDocumentIds.length - 1}
                  onClick={() => {
                    if (currentDocumentIndex < selectedDocumentIds.length - 1) {
                      const newIndex = currentDocumentIndex + 1;
                      setCurrentDocumentIndex(newIndex);
                      setSelectedDocument(selectedDocumentIds[newIndex]);
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 w-full h-full min-h-[600px] mt-4">
            {selectedDocument ? (
              <object
                data={`/api/documents/${selectedDocument}/preview`}
                type="application/pdf"
                className="w-full h-full border-0 rounded-md"
              >
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <p className="mb-4 text-red-500">Impossible d'afficher le PDF dans le navigateur.</p>
                  <a 
                    href={`/api/documents/${selectedDocument}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Télécharger le document
                  </a>
                </div>
              </object>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Aucun document à afficher</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}