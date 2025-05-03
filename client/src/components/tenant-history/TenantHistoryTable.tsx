import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Star,
  ChevronDown,
  Mail,
  Phone,
  Clock,
  Home,
  User,
  Building2,
  AlertCircle,
  Pencil,
  Trash2,
  Smile,
  Frown,
  Meh,
  Search,
  FileText,
  Settings,
  Info,
  Loader2,
  List,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TenantHistoryTableProps, TenantHistoryEntry, TenantHistoryCategory, TenantHistoryEventType, GroupedTenantHistory } from '@/types/tenant-history';
import { useQuery } from '@tanstack/react-query';
import TenantHistoryActions from './TenantHistoryActions';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS_PER_PAGE = 10;

const getRatingColor = (rating: number) => {
  if (rating >= 4) return "text-green-500 bg-green-50 border-green-200";
  if (rating >= 3) return "text-yellow-500 bg-yellow-50 border-yellow-200";
  return "text-red-500 bg-red-50 border-red-200";
};

const getRatingEmoji = (rating: number) => {
  if (rating >= 4) return <Smile className="h-5 w-5 text-green-500" />;
  if (rating >= 3) return <Meh className="h-5 w-5 text-yellow-500" />;
  return <Frown className="h-5 w-5 text-red-500" />;
};

// Export des fonctions utilisées par d'autres composants
export function getEventTypeIcon(eventType: TenantHistoryEventType) {
  switch (eventType) {
    case 'evaluation':
      return <Star className="h-4 w-4" />;
    case 'paiement':
      return <FileText className="h-4 w-4" />;
    case 'incident':
      return <AlertCircle className="h-4 w-4" />;
    case 'maintenance':
      return <Settings className="h-4 w-4" />;
    case 'plainte':
      return <Info className="h-4 w-4" />;
    case 'litige':
      return <AlertCircle className="h-4 w-4" />;
    case 'visite':
      return <User className="h-4 w-4" />;
    case 'fin_bail':
      return <Clock className="h-4 w-4" />;
    case 'debut_bail':
      return <User className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

export function getEventTypeLabel(eventType: TenantHistoryEventType): string {
  const labels: Record<string, string> = {
    evaluation: 'Évaluation',
    paiement: 'Paiement',
    incident: 'Incident',
    maintenance: 'Maintenance',
    plainte: 'Plainte',
    general: 'Général',
    entretien: 'Entretien',
    comportement: 'Comportement',
    respect_regles: 'Respect des règles',
    communication: 'Communication',
    litige: 'Litige',
    visite: 'Visite',
    fin_bail: 'Fin de bail',
    debut_bail: 'Début de bail',
  };
  
  return labels[eventType] || eventType;
}

export function getEventTypeBadgeColor(eventType: TenantHistoryEventType): string {
  switch (eventType) {
    case 'evaluation':
      return 'bg-blue-100 text-blue-800';
    case 'paiement':
      return 'bg-green-100 text-green-800';
    case 'incident':
      return 'bg-red-100 text-red-800';
    case 'maintenance':
      return 'bg-orange-100 text-orange-800';
    case 'plainte':
      return 'bg-purple-100 text-purple-800';
    case 'litige':
      return 'bg-red-100 text-red-800';
    case 'visite':
      return 'bg-teal-100 text-teal-800';
    case 'fin_bail':
      return 'bg-gray-100 text-gray-800';
    case 'debut_bail':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

const getCategoryIcon = (category: TenantHistoryCategory) => {
  switch (category) {
    case 'paiement':
      return <FileText className="h-4 w-4" />;
    case 'entretien':
      return <Building2 className="h-4 w-4" />;
    case 'comportement':
      return <User className="h-4 w-4" />;
    case 'respect_regles':
      return <AlertCircle className="h-4 w-4" />;
    case 'communication':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getCategoryLabel = (category: TenantHistoryCategory): string => {
  switch (category) {
    // Catégories financières
    case 'paiement': return 'Paiement';
    case 'paiement_retard': return 'Retard de paiement';
    
    // Catégories liées au bail
    case 'debut_bail': return 'Début de bail';
    case 'fin_bail': return 'Fin de bail';
    case 'movein': return 'Emménagement';
    case 'moveout': return 'Déménagement';
    
    // Catégories d'évaluation
    case 'evaluation': return 'Évaluation';
    case 'comportement': return 'Comportement';
    case 'respect_regles': return 'Respect du règlement';
    
    // Catégories de maintenance
    case 'entretien': return 'Entretien';
    case 'maintenance': return 'Maintenance';
    
    // Catégories de problèmes
    case 'incident': return 'Incident';
    case 'plainte': return 'Plainte';
    case 'litige': return 'Litige';
    
    // Autres catégories
    case 'communication': return 'Communication';
    case 'visite': return 'Visite';
    case 'general': return 'Général';
    
    // Fallback
    default: return 'Autre';
  }
};

const formatHistoryDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    return format(date, "Pp", { locale: fr });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date invalide";
  }
};

const getLatestDate = (entries: TenantHistoryEntry[]): string => {
  if (!entries.length) return '';
  
  return entries.reduce((latest, entry) => {
    if (!latest) return entry.createdAt;
    return new Date(entry.createdAt) > new Date(latest) ? entry.createdAt : latest;
  }, '');
};

const TenantHistoryTable: React.FC<TenantHistoryTableProps> = ({
  filter = 'all',
  searchTerm: externalSearchTerm,
  onViewDetails,
  onReassign,
  onViewAllEntries,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm || '');
  const { toast } = useToast();

  // Récupération des données avec les paramètres de filtre côté serveur
  const { data: historyEntries, isLoading, error, refetch } = useQuery({
    queryKey: ['tenantHistory', filter, searchTerm],
    queryFn: async () => {
      // Construire l'URL avec tous les paramètres nécessaires
      const url = new URL('/api/tenant-history', window.location.origin);
      
      // Ajouter les paramètres de filtre
      if (filter && filter !== 'all') {
        url.searchParams.append('filter', filter);
      }
      
      // Ajouter le terme de recherche si présent
      if (searchTerm) {
        url.searchParams.append('search', searchTerm);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la récupération des données');
      }
      
      return await response.json() as TenantHistoryEntry[];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Grouper les historiques par locataire
  const groupedHistory = useMemo(() => {
    if (!historyEntries) return [];

    const grouped: Record<string, TenantHistoryEntry[]> = {};

    // Regrouper par nom de locataire
    historyEntries.forEach(entry => {
      const tenantName = entry.tenantFullName || entry.userName || 'Ancien locataire';
      if (!grouped[tenantName]) {
        grouped[tenantName] = [];
      }
      grouped[tenantName].push(entry);
    });

    // Convertir en tableau pour l'affichage
    return Object.entries(grouped).map(([tenantName, entries]) => {
      // Calculer la note moyenne
      const validRatings = entries.filter(e => e.rating > 0).map(e => e.rating);
      const averageRating = validRatings.length 
        ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length 
        : 0;
      
      // Récupérer toutes les catégories uniques
      const categories: TenantHistoryCategory[] = Array.from(
        new Set(entries.map(e => e.category as TenantHistoryCategory))
      );
      
      // Vérifier si au moins une entrée est orpheline
      const isOrphaned = entries.some(e => e.isOrphaned);
      
      // Obtenir les données du premier locataire pour les informations de contact
      const firstEntry = entries[0];
      
      return {
        tenantFullName: tenantName,
        tenantId: firstEntry.tenantId,
        propertyId: firstEntry.propertyId,
        propertyName: firstEntry.propertyName || 'Non définie',
        isOrphaned,
        entries,
        averageRating,
        categories,
        latestEntry: getLatestDate(entries)
      } as GroupedTenantHistory;
    }).sort((a, b) => {
      // Trier d'abord par statut orphelin (non orphelins en premier)
      if (a.isOrphaned !== b.isOrphaned) {
        return a.isOrphaned ? 1 : -1;
      }
      // Ensuite par date la plus récente
      return new Date(b.latestEntry).getTime() - new Date(a.latestEntry).getTime();
    });
  }, [historyEntries]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleViewAllEntries = (group: GroupedTenantHistory) => {
    if (onViewAllEntries) {
      onViewAllEntries(group.tenantFullName || 'Ancien locataire', group.entries);
    } else if (group.entries.length === 1 && onViewDetails) {
      // S'il n'y a qu'une seule entrée, ouvrir directement les détails
      onViewDetails(group.entries[0].id);
    }
  };

  // Pagination des données
  const totalPages = Math.ceil(groupedHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedGroups = groupedHistory.slice(startIndex, startIndex + itemsPerPage);

  // Fonction pour changer de page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll vers le haut de la table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center relative mb-4 w-full">
        <Search className="absolute left-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher dans l'historique..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 w-full"
        />
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden bg-white w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Locataire</TableHead>
              <TableHead className="w-[100px]">Note</TableHead>
              <TableHead className="w-[100px]">Avis</TableHead>
              <TableHead className="w-[200px]">Catégorie</TableHead>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Chargement des données...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : !displayedGroups.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <p className="text-muted-foreground">Aucune entrée d'historique trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence>
                {displayedGroups.map((group) => (
                  <motion.tr
                    key={group.tenantFullName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="group hover:bg-gray-50/50 transition-all duration-300"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {group.tenantFullName}
                        </span>
                        {group.isOrphaned && (
                          <Badge variant="outline" className="mt-1 w-fit bg-amber-50 text-amber-700 border-amber-200">
                            Historique orphelin
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {group.averageRating > 0 ? (
                          <>
                            <div className="mr-2">
                              {getRatingEmoji(group.averageRating)}
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= Math.round(group.averageRating)
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="text-sm text-muted-foreground ml-2">
                                {group.averageRating.toFixed(1)}/5
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Non évalué</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">
                        {group.entries.length} avis
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {group.categories.slice(0, 3).map((category, index) => (
                          <Badge 
                            key={index}
                            variant="outline" 
                            className={`flex items-center gap-1 ${
                              category === 'paiement' 
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50' 
                                : category === 'comportement' 
                                  ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50'
                                  : category === 'respect_regles'
                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50'
                                    : category === 'communication'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50'
                                      : category === 'entretien'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50'
                                        : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700/50'
                            }`}
                          >
                            {getCategoryIcon(category)}
                            <span>{getCategoryLabel(category)}</span>
                          </Badge>
                        ))}
                        {group.categories.length > 3 && (
                          <Badge variant="outline">
                            +{group.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatHistoryDate(group.latestEntry)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAllEntries(group)}
                          className="h-8 px-2 hover:bg-rose-50 hover:text-rose-500"
                          title="Voir les détails"
                        >
                          <List className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                        {group.isOrphaned && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Réassigner la première entrée orpheline
                              const orphanedEntry = group.entries.find(e => e.isOrphaned);
                              if (orphanedEntry && onReassign) {
                                onReassign(orphanedEntry.id, group.tenantFullName || undefined);
                              }
                            }}
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-500"
                            title="Réassigner l'historique"
                          >
                            <User className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Nouvelle pagination améliorée */}
      {groupedHistory.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-2 w-full">
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
              {[5, 10, 20, 50].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>par page | Total: {groupedHistory.length} entrée{groupedHistory.length > 1 ? 's' : ''}</span>
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
                        ? "bg-orange-600 hover:bg-orange-700 text-white" 
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
  );
};

export default TenantHistoryTable;