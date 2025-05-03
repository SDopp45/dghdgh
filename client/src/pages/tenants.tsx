import { useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Users2, Search, Home, Wallet, History, Download, Archive, Plus, UserCircle2, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EditTenantDialog } from "@/components/tenants/edit-tenant-dialog";
import { TenantTable } from "@/components/tenants/TenantTable";
import { NewTenantDialog } from "@/components/tenants/NewTenantDialog";
import type { TenantWithDetails } from "@shared/schema";
import { ExportMenu } from "@/components/data-export/ExportMenu";
import { AdvancedFilters } from "@/components/tenants/advanced-filters";
import TenantActionDialog from "@/components/tenants/TenantActionDialog";
import { Progress } from "@/components/ui/progress";

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

function TenantStats({ tenants = [] }: { tenants?: TenantWithDetails[] }) {
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(tenant => tenant.leaseStatus === "actif");
  const activeTenantsCount = activeTenants.length;
  const totalRentRevenue = activeTenants.reduce((sum, tenant) => sum + Number(tenant.rentAmount), 0);
  const averageRent = activeTenantsCount > 0 ? totalRentRevenue / activeTenantsCount : 0;

  // Calculer le taux d'occupation
  const occupancyRate = totalTenants > 0 ? (activeTenantsCount / totalTenants) * 100 : 0;

  // Définir les animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
        <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      {/* Widget 1: Total des locataires */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-orange-50 to-amber-100/40 dark:from-orange-900/10 dark:to-amber-800/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-600 dark:text-orange-400">
                  <Users2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  Tous locataires
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalTenants}</h3>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    {activeTenantsCount} actifs
                  </span>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={occupancyRate} 
                    className="h-2 bg-orange-100 dark:bg-orange-950/20" 
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-600 dark:text-orange-400">Taux d'occupation</span>
                    <span className="font-medium">{Math.round(occupancyRate)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Widget 2: Baux actifs */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-amber-50 to-orange-100/40 dark:from-amber-900/10 dark:to-orange-800/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-500 dark:text-amber-400">
                  <Home className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-orange-500/80 dark:text-amber-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  En cours
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-orange-500 dark:text-amber-400">{activeTenantsCount}</h3>
                  <span className="text-sm text-muted-foreground">
                    {totalTenants > 0 
                      ? `${Math.round((activeTenantsCount / totalTenants) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <div className="text-xs text-muted-foreground mb-1">
                    Répartition
                  </div>
                  <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-amber-100 dark:bg-amber-950/20">
                    <motion.div 
                      className="bg-orange-500 dark:bg-amber-600 transition-all" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(activeTenantsCount / Math.max(totalTenants, 1)) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Widget 3: Revenu mensuel */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-orange-50/90 to-amber-100/50 dark:from-orange-800/10 dark:to-amber-700/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-500 dark:text-amber-300">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-orange-500/80 dark:text-amber-300/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  Mensuel
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-orange-500 dark:text-amber-300">{formatCurrency(totalRentRevenue)}</h3>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Moyenne par bail:</span>
                    <span className="font-medium text-orange-500 dark:text-amber-400">{formatCurrency(averageRent)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Nombre de baux actifs:</span>
                    <span className="font-medium">{activeTenantsCount}</span>
                  </div>
                </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      {/* Widget 4: Loyer moyen */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-amber-50 to-orange-100/30 dark:from-amber-800/10 dark:to-orange-700/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-600 dark:text-amber-400">
                  <History className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-orange-600/80 dark:text-amber-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                  Loyer moyen
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-orange-600 dark:text-amber-400">{formatCurrency(averageRent)}</h3>
                
                <div className="space-y-1">
                  <Progress 
                    value={75} // Valeur fictive pour la visualisation
                    className="h-2 bg-amber-100 dark:bg-amber-950/20" 
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Performance</span>
                    <span className="text-orange-600 dark:text-amber-400 font-medium">+2.5% ce mois</span>
                  </div>
                </div>
              </div>
    </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}


export default function Tenants() {
  const [filters, setFilters] = useState({
    search: "",
    leaseType: undefined as string | undefined,
    rentRange: {
      min: undefined as number | undefined,
      max: undefined as number | undefined,
    },
    dateRange: undefined as DateRange | undefined,
  });

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionMode, setActionMode] = useState<'archive' | 'delete'>('delete');
  const [selectedTenant, setSelectedTenant] = useState<TenantWithDetails | null>(null);
  const [isEditingTenant, setIsEditingTenant] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/tenants"],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async ({ tenant, transactionAction }: { tenant: TenantWithDetails, transactionAction: 'delete' | 'cancel' }) => {
      const response = await fetch(`/api/tenants/${tenant.id}/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionAction }),
      });

      if (!response.ok) {
        throw new Error("Impossible d'archiver le bail");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });

      toast({
        title: "✨ Bail archivé",
        description: "Le bail a été archivé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setShowActionDialog(false);
      setSelectedTenant(null);
    },
    onError: (error) => {
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Impossible d'archiver le bail",
        variant: "destructive",
      });

      setShowActionDialog(false);
      setSelectedTenant(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ tenant, transactionAction, purgeHistory }: { tenant: TenantWithDetails, transactionAction: 'delete' | 'cancel', purgeHistory?: boolean, deleteDocuments?: boolean }) => {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionAction, purgeHistory }),
      });

      if (!response.ok) {
        throw new Error("Impossible de supprimer le bail");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });

      toast({
        title: "✨ Bail supprimé",
        description: "Le bail a été supprimé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });

      setShowActionDialog(false);
      setSelectedTenant(null);
    },
    onError: (error) => {
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le bail",
        variant: "destructive",
      });

      setShowActionDialog(false);
      setSelectedTenant(null);
    }
  });

  const handleActionConfirm = (transactionAction: 'delete' | 'cancel', purgeHistory = false, deleteDocuments = false) => {
    if (!selectedTenant) return;
    
    setShowActionDialog(false);

    if (actionMode === 'delete') {
      deleteMutation.mutate({ 
        tenant: selectedTenant, 
        transactionAction, 
        purgeHistory,
        deleteDocuments 
      });
    } else {
      archiveMutation.mutate({ tenant: selectedTenant, transactionAction });
    }
  };

  const handleDelete = (tenant: TenantWithDetails) => {
    setSelectedTenant(tenant);
    setActionMode('delete');
    setShowActionDialog(true);
  };

  const handleArchive = (tenant: TenantWithDetails) => {
    setSelectedTenant(tenant);
    setActionMode('archive');
    setShowActionDialog(true);
  };

  const handleEdit = (tenant: TenantWithDetails) => {
    setSelectedTenant(tenant);
    setIsEditingTenant(true);
  };

  const filteredTenants = tenants.filter(tenant => {
    const searchTerm = filters.search.toLowerCase();
    const matchesSearch =
      ((tenant.user?.fullName?.toLowerCase() || "").includes(searchTerm)) ||
      ((tenant.user?.username?.toLowerCase() || "").includes(searchTerm)) ||
      ((tenant.property?.name?.toLowerCase() || "").includes(searchTerm)) ||
      ((tenant.user?.phoneNumber?.toLowerCase() || "").includes(searchTerm)) ||
      tenant.leaseType.toLowerCase().includes(searchTerm) ||
      tenant.rentAmount.toString().includes(searchTerm);

    const matchesLeaseType = !filters.leaseType || tenant.leaseType === filters.leaseType;

    const matchesRentRange =
      (!filters.rentRange.min || tenant.rentAmount >= filters.rentRange.min) &&
      (!filters.rentRange.max || tenant.rentAmount <= filters.rentRange.max);

    const matchesDateRange =
      !filters.dateRange?.from ||
      !filters.dateRange?.to ||
      (new Date(tenant.leaseStart) >= filters.dateRange.from &&
        new Date(tenant.leaseEnd) <= filters.dateRange.to);

    return matchesSearch && matchesLeaseType && matchesRentRange && matchesDateRange;
  });

  const activeTenants = filteredTenants.filter(t => t.leaseStatus === "actif");
  const archivedTenants = filteredTenants.filter(t => t.leaseStatus === "fini");

  const onFilterChange = useCallback((newFilters: {
    leaseType?: string[];
    rentRange?: { min?: number; max?: number };
    dateRange?: { from?: Date; to?: Date };
  }) => {
    setFilters((prev) => {
      // Properly handle rentRange to ensure min and max are always defined
      const rentRange = {
        min: newFilters.rentRange?.min !== undefined ? newFilters.rentRange.min : prev.rentRange.min,
        max: newFilters.rentRange?.max !== undefined ? newFilters.rentRange.max : prev.rentRange.max,
      };
      
      return {
        ...prev,
        leaseType: newFilters.leaseType || prev.leaseType,
        rentRange: rentRange,
        dateRange: newFilters.dateRange || prev.dateRange,
      };
    });
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex justify-between items-center p-6">
          <div>
            <motion.div
              className="flex items-center gap-3 mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <UserCircle2 className="h-10 w-10 text-amber-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent animate-gradient">
                Gestion des Locataires
              </h1>
            </motion.div>
            <motion.p
              className="text-muted-foreground text-lg ml-[52px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Gérez vos locataires et leurs baux en toute simplicité
            </motion.p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              className="gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 shadow-lg hover:shadow-xl transition-all duration-300 animate-gradient-x"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Ajouter un locataire
            </Button>
          </div>
        </div>
      </div>

      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
      <TenantStats tenants={tenants} />
      </motion.div>

      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, propriété, type de bail, loyer..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          <div className="relative">
            <AdvancedFilters
              onFilterChange={onFilterChange}
            />
          </div>
          <ExportMenu
            type="tenants"
            allowImport={true}
            currentFilters={{
              search: filters.search,
              leaseType: filters.leaseType !== "all" ? filters.leaseType : undefined,
              status: activeTab === 'active' ? 'actif' : 'fini'
            }}
            data={activeTab === 'active' ? activeTenants : archivedTenants}
          />
        </div>

        <Tabs defaultValue="active" className="w-full" onValueChange={(value) => setActiveTab(value as 'active' | 'archived')}>
          <TabsList className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/80 dark:to-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <TabsTrigger
              value="active"
              className="rounded-md transition-all duration-300 text-gray-700 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-orange-500 dark:data-[state=active]:text-orange-400"
            >
              <Users2 className="h-4 w-4 mr-2" />
              Baux actifs ({activeTenants.length})
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="rounded-md transition-all duration-300 text-gray-700 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-orange-500 dark:data-[state=active]:text-orange-400"
            >
              <Archive className="h-4 w-4 mr-2" />
              Baux archivés ({archivedTenants.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/80 dark:to-gray-900/40">
                <div>
                  <CardTitle>Baux actifs</CardTitle>
                  <CardDescription>
                    Liste des baux en cours
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <TenantTable
                  tenants={activeTenants}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived">
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/80 dark:to-gray-900/40">
                <div>
                  <CardTitle>Baux archivés</CardTitle>
                  <CardDescription>
                    Liste des baux terminés
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <TenantTable
                  tenants={archivedTenants}
                  showArchived
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedTenant && (
        <TenantActionDialog
          isOpen={showActionDialog}
          onOpenChange={setShowActionDialog}
          onConfirm={handleActionConfirm}
          mode={actionMode}
          title={actionMode === 'archive' ? "Archiver le bail" : "Supprimer le bail"}
          description={actionMode === 'archive' 
            ? "Êtes-vous sûr de vouloir archiver ce bail ?" 
            : "Êtes-vous sûr de vouloir supprimer ce bail ?"}
        />
      )}

      {selectedTenant && (
        <EditTenantDialog
          tenant={selectedTenant}
          isOpen={isEditingTenant}
          onOpenChange={(open) => {
            setIsEditingTenant(open);
            if (!open) {
              setSelectedTenant(null);
            }
          }}
        />
      )}
      <NewTenantDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}