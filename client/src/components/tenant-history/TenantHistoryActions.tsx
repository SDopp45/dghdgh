import React from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash, LinkIcon } from 'lucide-react';
import { TenantHistoryEntry } from '@/types/tenant-history';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface TenantHistoryActionsProps {
  id: number;
  tenantName?: string | null;
  isOrphaned?: boolean;
  onViewDetails?: (id: number) => void;
  onReassign?: (id: number, tenantName: string | null | undefined) => void;
}

export default function TenantHistoryActions({ 
  id, 
  tenantName, 
  isOrphaned = false,
  onViewDetails,
  onReassign
}: TenantHistoryActionsProps) {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const refreshPage = () => {
    // Recharger la page pour rafraîchir les données
    navigate('/tenant-history');
  };
  
  const handleDelete = async () => {
    if (isDeleting) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette entrée d'historique ?`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      // Utiliser l'ID passé en props
      await apiRequest(`/api/tenant-history/${id}`, { method: 'DELETE' });
      
      toast({
        title: "Entrée supprimée",
        description: "L'entrée d'historique a été supprimée avec succès",
      });
      
      // Recharger la page pour voir les changements
      refreshPage();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de l'entrée",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleView = () => {
    if (onViewDetails) {
      onViewDetails(id);
    }
  };
  
  const handleReassign = () => {
    if (onReassign) {
      onReassign(id, tenantName);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={handleView}
        >
          <Edit className="mr-2 h-4 w-4" />
          <span>Voir détails</span>
        </DropdownMenuItem>
        
        {isOrphaned && (
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={handleReassign}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>Réassigner</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem 
          className="cursor-pointer text-destructive focus:text-destructive" 
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash className="mr-2 h-4 w-4" />
          <span>Supprimer</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}