import React, { useState } from 'react';
import { TenantHistoryEntry } from '@/types/tenant-history';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date-utils";
import {
  MessageSquare,
  Star,
  Clock,
  User,
  Mail,
  Phone,
  Info,
  AlertCircle,
  FileText,
  Settings,
  Building,
  Smile,
  Meh,
  Frown,
  Trash2,
  Loader2,
  BugPlay,
} from "lucide-react";
import { getEventTypeIcon, getEventTypeLabel } from './TenantHistoryTable';
import { calculateAverageRating } from "@/utils/rating-utils";
import { useToast } from "@/hooks/use-toast";
import { useDeleteTenantHistory } from '@/api/tenant-history';
import { useQueryClient } from '@tanstack/react-query';

interface TenantHistoryListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  entries: TenantHistoryEntry[];
  onViewDetails?: (id: number) => void;
}

const getRatingEmoji = (rating: number) => {
  if (rating >= 4) return <Smile className="h-5 w-5 text-green-500" />;
  if (rating >= 3) return <Meh className="h-5 w-5 text-yellow-500" />;
  return <Frown className="h-5 w-5 text-red-500" />;
};

const formatHistoryDate = (dateString: string) => {
  return formatDate(dateString, 'pretty');
};

const getCategoryLabel = (category: string): string => {
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

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'paiement':
      return <FileText className="h-4 w-4" />;
    case 'entretien':
      return <Building className="h-4 w-4" />;
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

const TenantHistoryListDialog: React.FC<TenantHistoryListDialogProps> = ({
  open,
  onOpenChange,
  tenantName,
  entries,
  onViewDetails,
}) => {
  const { toast } = useToast();
  const deleteHistoryMutation = useDeleteTenantHistory();
  const queryClient = useQueryClient();
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);
  const [localEntries, setLocalEntries] = useState<TenantHistoryEntry[]>(entries);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  
  // Mise à jour de localEntries lorsque entries change (par exemple quand le dialogue s'ouvre)
  React.useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);
  
  // Trier les entrées par date (plus récent en premier)
  const sortedEntries = [...localEntries].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Calculer la note moyenne en utilisant la fonction utilitaire
  const averageRating = calculateAverageRating(localEntries, 0) || 0;

  // Fonction pour demander confirmation avant suppression
  const confirmDelete = (id: number) => {
    setEntryToDelete(id);
    setShowDeleteConfirm(true);
  };
  
  // Fonction pour supprimer une entrée
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    
    try {
      setDeletingEntryId(entryToDelete);
      
      // Appeler l'API pour supprimer l'entrée
      await deleteHistoryMutation(entryToDelete);
      
      // Mettre à jour l'état local pour refléter la suppression
      const updatedEntries = localEntries.filter(entry => entry.id !== entryToDelete);
      setLocalEntries(updatedEntries);
      
      // Invalider les requêtes pour forcer un rechargement des données
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
      
      toast({
        title: "Entrée supprimée",
        description: "L'entrée a été supprimée avec succès.",
      });
      
      // Si plus d'entrées, fermer le dialogue
      if (updatedEntries.length === 0) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Erreur détaillée lors de la suppression:", error);
      let errorMessage = "Impossible de supprimer cette entrée.";
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingEntryId(null);
      setEntryToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <User className="h-5 w-5" />
              Historique du locataire: {tenantName}
            </DialogTitle>
            <DialogDescription>
              Liste complète des évaluations et événements enregistrés pour ce locataire
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {localEntries.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex flex-wrap gap-4 items-center">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Note moyenne</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {averageRating > 0 ? (
                        <>
                          {getRatingEmoji(averageRating)}
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= Math.round(averageRating)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="text-sm font-medium ml-2">
                              {averageRating.toFixed(1)}/5
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Non évalué</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Nombre d'évaluations</h3>
                    <p className="mt-1 text-lg font-semibold">{localEntries.length}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Première évaluation</h3>
                    <p className="mt-1 text-sm">
                      {formatHistoryDate(localEntries[localEntries.length - 1].createdAt)}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Dernière évaluation</h3>
                    <p className="mt-1 text-sm">
                      {formatHistoryDate(localEntries[0].createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200 border rounded-lg">
              {sortedEntries.map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-gray-100">
                        {getEventTypeIcon(entry.eventType)}
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {getEventTypeLabel(entry.eventType)}
                          <Badge 
                            variant="outline" 
                            className="ml-2 flex items-center gap-1 px-2 py-0 text-xs"
                          >
                            {getCategoryIcon(entry.category)}
                            <span>{getCategoryLabel(entry.category)}</span>
                          </Badge>
                        </h3>
                        <p className="text-xs text-gray-500">{formatHistoryDate(entry.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.rating > 0 && (
                        <div className="flex items-center mr-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= (entry.rating || 0)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails && onViewDetails(entry.id)}
                        className="h-8 px-2 text-xs"
                      >
                        Détails
                      </Button>
                      
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={() => confirmDelete(entry.id)}
                        disabled={deletingEntryId === entry.id}
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Supprimer cette entrée"
                      >
                        {deletingEntryId === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {entry.feedback && (
                    <div className="mt-2 pl-10">
                      <p className="text-sm text-gray-700">{entry.feedback}</p>
                    </div>
                  )}
                  
                  {entry.propertyName && (
                    <div className="mt-2 pl-10 flex items-center gap-1 text-xs text-gray-500">
                      <Building className="h-3 w-3" />
                      <span>{entry.propertyName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation pour la suppression */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette entrée de l'historique ?
              <br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TenantHistoryListDialog;