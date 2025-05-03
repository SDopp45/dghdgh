import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Link, Link2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTenantsForHistory } from '@/api/tenant-history';

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId?: number;  // Renommé pour correspondre à l'utilisation dans tenant-history.tsx
  historyId?: number; // Gardé pour la rétrocompatibilité
  tenantName?: string | null | undefined;
  onSuccess?: (tenantId: number) => void;
}

const ReassignDialog: React.FC<ReassignDialogProps> = ({
  open,
  onOpenChange,
  historyId,
  entryId,
  tenantName,
  onSuccess,
}) => {
  // Utiliser entryId s'il est fourni, sinon utiliser historyId
  const actualId = entryId || historyId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [searchByName, setSearchByName] = useState<boolean>(false);
  const [manualTenantName, setManualTenantName] = useState<string>(tenantName || '');

  // Récupérer la liste des locataires pour le sélecteur en utilisant le nouveau hook
  const { data: tenants = [], isLoading } = useTenantsForHistory({
    enabled: open,
  });

  // Récupérer les détails de l'entrée orpheline pour plus d'informations
  const { data: entryDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['tenantHistoryEntry', actualId],
    queryFn: async () => {
      if (!actualId) return null;
      const response = await fetch(`/api/tenant-history/${actualId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: open && !!actualId,
  });

  // Mutation pour réassigner l'historique
  const reassignMutation = useMutation({
    mutationFn: async () => {
      // Préparer les données en fonction du mode de recherche
      const data = searchByName
        ? { tenantName: manualTenantName }
        : { tenantId: parseInt(selectedTenantId) };

      const response = await fetch(`/api/tenant-history/${actualId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Impossible de réassigner l\'entrée');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Entrée réassignée',
        description: 'L\'entrée d\'historique a été réassignée avec succès',
        variant: 'default',
        className: 'bg-green-500/10 border-green-500/20',
      });

      // Invalider les requêtes pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
      queryClient.invalidateQueries({ queryKey: ['tenantHistoryStats'] });

      if (onSuccess && !searchByName) {
        // Fournir le tenantId sélectionné
        onSuccess(parseInt(selectedTenantId));
      } else if (onSuccess && searchByName) {
        // Si recherche par nom, on ne peut pas fournir d'ID, passer une valeur par défaut
        onSuccess(0); // La valeur sera ignorée car le backend recherchera par nom
      }

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des données
    if (searchByName && !manualTenantName) {
      toast({
        title: 'Champ requis',
        description: 'Veuillez saisir un nom de locataire',
        variant: 'destructive',
      });
      return;
    }

    if (!searchByName && !selectedTenantId) {
      toast({
        title: 'Sélection requise',
        description: 'Veuillez sélectionner un locataire',
        variant: 'destructive',
      });
      return;
    }

    // Exécuter la mutation
    reassignMutation.mutate();
  };

  // Tentative de correspondance automatique si le nom du locataire est fourni
  React.useEffect(() => {
    if (tenantName && tenants && tenants.length > 0 && !selectedTenantId) {
      // Recherche de correspondance exacte
      const exactMatch = tenants.find((t: any) => 
        t.user?.fullName?.toLowerCase() === tenantName.toLowerCase()
      );
      
      if (exactMatch) {
        setSelectedTenantId(String(exactMatch.id));
        toast({
          title: 'Correspondance trouvée',
          description: `Un locataire avec le nom "${tenantName}" a été trouvé automatiquement.`,
          className: 'bg-blue-500/10 border-blue-500/20',
        });
      }
    }
  }, [tenants, tenantName, selectedTenantId, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-orange-500" />
            Réassigner l'entrée d'historique
          </DialogTitle>
          <DialogDescription>
            Associez cette entrée d'historique orpheline à un locataire existant pour maintenir un historique complet.
          </DialogDescription>
        </DialogHeader>

        {entryDetails && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 my-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle>Détails de l'entrée orpheline</AlertTitle>
            <AlertDescription className="text-sm mt-2">
              <div className="flex flex-col space-y-1">
                <div><strong>Date:</strong> {new Date(entryDetails.createdAt).toLocaleDateString()}</div>
                {entryDetails.rating && <div><strong>Note:</strong> {entryDetails.rating}/5</div>}
                {entryDetails.feedback && <div><strong>Commentaire:</strong> {entryDetails.feedback.substring(0, 100)}{entryDetails.feedback.length > 100 ? '...' : ''}</div>}
                {entryDetails.category && <div><strong>Catégorie:</strong> {entryDetails.category}</div>}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant={searchByName ? "outline" : "default"} 
                onClick={() => setSearchByName(false)}
                className="flex-1"
              >
                Par sélection
              </Button>
              <Button 
                type="button" 
                variant={searchByName ? "default" : "outline"} 
                onClick={() => setSearchByName(true)}
                className="flex-1"
              >
                Par nom
              </Button>
            </div>

            {searchByName ? (
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nom du locataire</Label>
                <Input
                  id="tenantName"
                  placeholder="Saisir le nom complet du locataire"
                  value={manualTenantName}
                  onChange={(e) => setManualTenantName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  L'entrée sera réassignée au locataire dont le nom correspond exactement.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tenantId">Sélectionner un locataire</Label>
                <Select
                  value={selectedTenantId}
                  onValueChange={setSelectedTenantId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-white border">
                    <SelectValue placeholder="Sélectionner un locataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant: any) => (
                      <SelectItem key={tenant.id} value={String(tenant.id)}>
                        {tenant.user?.fullName || `Locataire #${tenant.id}`}
                        {tenant.user?.email && ` (${tenant.user.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tenantName && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800 text-sm">
                <p>
                  <strong>Information :</strong> Cette entrée était précédemment associée à "{tenantName}".
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reassignMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={reassignMutation.isPending || isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {reassignMutation.isPending ? 'Réassignation...' : 'Réassigner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReassignDialog;