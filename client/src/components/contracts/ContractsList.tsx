import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, isBefore, isToday, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Search,
  Plus,
  Filter,
  Download,
  Pencil,
  Trash2,
  Eye,
  MoreVertical,
  FileSignature,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Check,
  X,
  ArrowUpDown,
  MoreHorizontal,
  Tag
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { ExportMenu } from "@/components/data-export/ExportMenu";
import { cn } from "@/lib/utils";
import { Contract, useContracts, useDeleteContract } from "@/api/contracts";
import { Spinner } from "@/components/ui/spinner";
import { AddContractDialog } from "@/components/contracts/AddContractDialog";

// Constantes pour les libellés
const contractTypeLabels: Record<string, string> = {
  "rental": "Bail location",
  "mandate": "Mandat de gestion",
  "commercial": "Bail commercial",
  "attestation": "Attestation",
  "other": "Autre contrat"
};

const contractStatusLabels: Record<string, string> = {
  "draft": "Brouillon",
  "pending_signature": "En attente de signature",
  "active": "Actif",
  "expired": "Expiré",
  "terminated": "Résilié"
};

const contractStatusIcons: Record<string, JSX.Element> = {
  "draft": <FileText className="h-3.5 w-3.5 text-gray-500" />,
  "pending_signature": <FileSignature className="h-3.5 w-3.5 text-yellow-500" />,
  "active": <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  "expired": <Clock className="h-3.5 w-3.5 text-red-500" />,
  "terminated": <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
};

const contractStatusColors: Record<string, string> = {
  "draft": "bg-gray-100 text-gray-800 hover:bg-gray-200/50 border-gray-200",
  "pending_signature": "bg-yellow-100 text-yellow-800 hover:bg-yellow-200/50 border-yellow-200",
  "active": "bg-green-100 text-green-800 hover:bg-green-200/50 border-green-200",
  "expired": "bg-red-100 text-red-800 hover:bg-red-200/50 border-red-200",
  "terminated": "bg-orange-100 text-orange-800 hover:bg-orange-200/50 border-orange-200"
};

interface ContractsListProps {
  tenantId?: string;
}

export function ContractsList({ tenantId }: ContractsListProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // États du composant
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedContracts, setSelectedContracts] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<number | null>(null);

  // Récupération des contrats
  const { data: contractsData, isLoading, isError } = useContracts({
    tenantId: tenantId ? parseInt(tenantId) : undefined
  });
  
  // Ajouter des logs pour le débogage
  useEffect(() => {
    console.log("Contract data:", contractsData);
    if (isError) {
      console.error("Error loading contracts:", isError);
    }
  }, [contractsData, isError]);
  
  const contracts = contractsData?.data || [];
  
  // Hooks de mutation pour la suppression
  const deleteContractMutation = useDeleteContract();

  // Filtrage des contrats
  const filteredContracts = contracts.filter((contract) => {
    // Filtrage par recherche
    const matchesSearch = searchTerm === "" || 
      contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contract.propertyName && contract.propertyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtrage par type
    const matchesType = selectedType === "all" || contract.type === selectedType;
    
    // Filtrage par statut
    const matchesStatus = selectedStatus === "all" || contract.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Gestionnaires d'événements
  const handleRowClick = (contract: Contract) => {
    setLocation(`/contracts/${contract.id}`);
  };
  
  const handleSelectContract = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedContracts([...selectedContracts, id]);
    } else {
      setSelectedContracts(selectedContracts.filter(contractId => contractId !== id));
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContracts(filteredContracts.map(c => c.id));
    } else {
      setSelectedContracts([]);
    }
  };
  
  const confirmDelete = (id: number) => {
    setContractToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = () => {
    if (contractToDelete) {
      deleteContractMutation.mutate(contractToDelete, {
        onSuccess: () => {
          toast({
            title: "Contrat supprimé",
            description: "Le contrat a été supprimé avec succès.",
            className: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20",
          });
          setSelectedContracts(selectedContracts.filter(id => id !== contractToDelete));
          setDeleteDialogOpen(false);
          setContractToDelete(null);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Erreur lors de la suppression",
            description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la suppression du contrat.",
          });
        }
      });
    }
  };

  // Fonctions utilitaires pour l'affichage
  const getContractStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300";
      case "pending_signature":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300";
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300";
      case "terminated":
        return "bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300";
    }
  };
  
  const getContractStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "pending_signature":
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case "expired":
        return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case "draft":
        return <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      case "terminated":
        return <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case "rental":
        return "Bail location";
      case "mandate":
        return "Mandat de gestion";
      case "commercial":
        return "Bail commercial";
      case "attestation":
        return "Attestation";
      case "other":
        return "Autre contrat";
      default:
        return type;
    }
  };
  
  const getContractStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Actif";
      case "pending_signature":
        return "En attente de signature";
      case "expired":
        return "Expiré";
      case "draft":
        return "Brouillon";
      case "terminated":
        return "Résilié";
      default:
        return status;
    }
  };
  
  const getExpirationStatus = (endDate: string | null | undefined) => {
    if (!endDate) return null;
    
    const date = new Date(endDate);
    const today = new Date();
    
    if (isBefore(date, today)) {
      return {
        label: "Expiré",
        color: "text-red-600 dark:text-red-400",
        icon: <X className="h-4 w-4" />
      };
    }
    
    if (isToday(date)) {
      return {
        label: "Expire aujourd'hui",
        color: "text-orange-600 dark:text-orange-400",
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
    
    if (isBefore(date, addDays(today, 30))) {
      return {
        label: "Expire bientôt",
        color: "text-yellow-600 dark:text-yellow-400",
        icon: <Clock className="h-4 w-4" />
      };
    }
    
    return {
      label: "Valide",
      color: "text-green-600 dark:text-green-400",
      icon: <Check className="h-4 w-4" />
    };
  };

  // Déterminer les filtres disponibles
  const availableTypes = Array.from(new Set(contracts.map(c => c.type)));
  const availableStatuses = Array.from(new Set(contracts.map(c => c.status)));

  // Afficher les messages d'erreur ou de chargement
  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-blue-500 border-opacity-50"></div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Erreur de chargement</h3>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
          Impossible de charger les données des contrats. Veuillez réessayer ultérieurement.
        </p>
      </div>
    );
  }
  
  if (!contracts || contracts.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-lg text-center">
        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium mb-1">Aucun contrat trouvé</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {tenantId 
            ? "Il n'y a pas encore de contrats associés à ce locataire."
            : "Vous n'avez pas encore de contrats. Commencez par en créer un nouveau."}
        </p>
        <AddContractDialog initialTenantId={tenantId ? parseInt(tenantId) : undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec les filtres */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher un contrat..."
              className="w-full rounded-lg pl-8 sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedType}
            onValueChange={setSelectedType}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {availableTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getContractTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={selectedStatus}
            onValueChange={setSelectedStatus}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {getContractStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tableau des contrats */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedContracts.length > 0 && selectedContracts.length === filteredContracts.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tous les contrats"
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center space-x-1">
                  <span>Contrat</span>
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Propriété</TableHead>
              <TableHead>Parties</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {searchTerm || selectedType || selectedStatus ? 
                    "Aucun contrat ne correspond à vos critères de recherche." : 
                    "Aucun contrat trouvé. Commencez par créer un nouveau contrat."}
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((contract) => {
                const isSelected = selectedContracts.includes(contract.id);
                const expirationStatus = getExpirationStatus(contract.endDate);
                
                return (
                  <TableRow 
                    key={contract.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      isSelected && "bg-muted/50"
                    )}
                    onClick={() => handleRowClick(contract)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked: boolean) => handleSelectContract(contract.id, checked)}
                        aria-label={`Sélectionner le contrat ${contract.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{contract.name}</div>
                      <div className="text-sm text-muted-foreground">
                        #{contract.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Tag className="h-3.5 w-3.5" />
                        {getContractTypeLabel(contract.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1 font-normal", getContractStatusColor(contract.status))}>
                        {getContractStatusIcon(contract.status)}
                        {getContractStatusLabel(contract.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">Début:</span> {format(new Date(contract.startDate), "dd/MM/yyyy")}
                      </div>
                      {contract.endDate && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-medium">Fin:</span> {format(new Date(contract.endDate), "dd/MM/yyyy")}
                          {expirationStatus && (
                            <span className={cn("flex items-center gap-0.5 text-xs", expirationStatus.color)}>
                              {expirationStatus.icon}
                              {expirationStatus.label}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.propertyName ? (
                        <div className="max-w-[200px] truncate">{contract.propertyName}</div>
                      ) : (
                        <div className="text-muted-foreground text-sm">Non spécifiée</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.parties && contract.parties.length > 0 ? (
                        <div className="flex flex-col space-y-1">
                          {contract.parties.slice(0, 2).map((party, index) => (
                            <div key={index} className="flex items-center gap-1 text-sm">
                              <Badge variant="outline" className="font-normal">
                                {party.type === "tenant" ? "Locataire" : 
                                 party.type === "owner" ? "Propriétaire" : 
                                 party.type === "manager" ? "Gestionnaire" : "Autre"}
                              </Badge>
                              <span className="max-w-[120px] truncate">{party.name}</span>
                            </div>
                          ))}
                          {contract.parties.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{contract.parties.length - 2} autres
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-sm">Aucune partie</div>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setLocation(`/contracts/${contract.id}`)}>
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/contracts/${contract.id}/edit`)}>
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={() => confirmDelete(contract.id)}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteContractMutation.isPending}
            >
              {deleteContractMutation.isPending ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 