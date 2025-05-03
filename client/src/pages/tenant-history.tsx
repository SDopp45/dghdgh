import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlusCircle, History, Clock, Search, AlertTriangle, Filter, User, Star, BarChart3, Users } from 'lucide-react';
import TenantHistoryTable from '@/components/tenant-history/TenantHistoryTable';
import TenantHistoryDetails from '@/components/tenant-history/TenantHistoryDetails';
import TenantHistoryDialog from '@/components/tenant-history/TenantHistoryDialog';
import TenantHistoryListDialog from '@/components/tenant-history/TenantHistoryListDialog';
import ReassignDialog from '@/components/tenant-history/ReassignDialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantHistoryCategory, TenantHistoryStats, TenantHistoryEntry } from '@/types/tenant-history';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { Progress } from "@/components/ui/progress";

// Animation variants for the container and items
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
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

const TenantHistoryPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  
  // États locaux
  const [activeTab, setActiveTab] = useState<TenantHistoryCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<number | undefined>(undefined);
  const [selectedTenantName, setSelectedTenantName] = useState<string | null | undefined>(undefined);
  const [selectedTenantEntries, setSelectedTenantEntries] = useState<TenantHistoryEntry[]>([]);
  
  // Récupération des statistiques
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['tenantHistoryStats'],
    queryFn: async () => {
      const response = await fetch('/api/tenant-history/stats');
      if (!response.ok) {
        throw new Error('Impossible de récupérer les statistiques');
      }
      return await response.json() as TenantHistoryStats;
    },
  });
  
  // Mutation pour réassigner une entrée orpheline
  const reassignMutation = useMutation({
    mutationFn: async ({ id, tenantId }: { id: number; tenantId: number }) => {
      const response = await fetch(`/api/tenant-history/${id}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });
      
      if (!response.ok) {
        throw new Error('Impossible de réassigner l\'entrée');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Entrée réassignée',
        description: 'L\'entrée d\'historique a été réassignée avec succès',
      });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
      queryClient.invalidateQueries({ queryKey: ['tenantHistoryStats'] });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const handleViewDetails = (id: number) => {
    setSelectedEntryId(id);
    setShowDetailsDialog(true);
  };
  
  const handleOpenEditDialog = (entry: any) => {
    // Si un ID est passé directement (vieux format), sinon utiliser l'ID de l'entrée
    const entryId = typeof entry === 'number' ? entry : entry?.id;
    
    if (entryId) {
      setSelectedEntryId(entryId);
      setShowEditDialog(true);
      setShowDetailsDialog(false);
    }
  };
  
  const handleReassign = (id: number, tenantName: string | null | undefined) => {
    // Ouvrir le dialogue de réassignation avec les paramètres fournis
    setSelectedEntryId(id);
    setSelectedTenantName(tenantName);
    setShowReassignDialog(true);
  };
  
  const handleViewAllEntries = (tenantName: string, entries: TenantHistoryEntry[]) => {
    setSelectedTenantName(tenantName);
    setSelectedTenantEntries(entries);
    setShowListDialog(true);
  };
  
  const [isPageReady, setIsPageReady] = useState(false);
  
  // Simulate data loading like in finance/maintenance pages
  React.useEffect(() => {
    const timer = setTimeout(() => setIsPageReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Squelette de chargement
  if (!isPageReady) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Squelette de l'en-tête */}
        <div className="p-6 rounded-xl border border-gray-200 mb-8">
          <div className="flex justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
              <div className="h-5 w-80 bg-gray-200 animate-pulse rounded-lg ml-[52px]"></div>
            </div>
            <div className="w-40 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
        
        {/* Squelette des stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((_, index) => (
            <div key={index} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
        
        {/* Squelette des tabs */}
        <div className="h-10 bg-gray-200 animate-pulse rounded-lg w-full mb-4"></div>
        
        {/* Squelette du contenu */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((_, index) => (
            <div key={index} className="h-24 bg-gray-200 animate-pulse rounded-lg w-full"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="container mx-auto p-4 space-y-6">
        {/* En-tête avec style amélioré */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-6 rounded-xl bg-white bg-gradient-to-r from-background/80 to-background/40 backdrop-blur-xl border border-orange-500/20 shadow-lg flex justify-between items-start"
        >
            <div>
            <motion.div
              className="flex items-center gap-3 mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <History className="h-10 w-10 text-orange-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent animate-gradient">
                Système de notation des locataires
              </h1>
            </motion.div>
            <motion.p
              className="text-muted-foreground text-lg ml-[52px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Évaluation et suivi des locataires pour anticiper les risques
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button 
              onClick={() => setShowAddDialog(true)} 
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Star className="h-4 w-4" />
            Ajouter une évaluation
          </Button>
          </motion.div>
        </motion.div>
        
        {/* Statistiques améliorées */}
        {stats && (
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div 
                variants={item}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative min-w-[200px] hover:shadow-lg transition-all duration-300"
              >
                <Card className="overflow-hidden border-none shadow-lg">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-orange-50 to-amber-100/40 dark:from-orange-900/10 dark:to-amber-800/10 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-600 dark:text-orange-400">
                          <History className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                          Tous
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats?.totalEntries}</h3>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            {stats?.tenantsWithHistory} locataires
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <Progress 
                            value={100} 
                            className="h-2 bg-orange-100 dark:bg-orange-950/20" 
                          />
                          <div className="flex justify-between text-xs">
                            <span className="text-orange-600 dark:text-orange-400">Toutes les notations</span>
                            <span className="font-medium">100%</span>
                          </div>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
              </motion.div>
              
              <motion.div 
                variants={item}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative min-w-[200px] hover:shadow-lg transition-all duration-300"
              >
                <Card className="overflow-hidden border-none shadow-lg">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-100/40 dark:from-amber-900/10 dark:to-orange-800/10 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-500 dark:text-amber-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium text-orange-500/80 dark:text-amber-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                          Bien notés
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-orange-500 dark:text-amber-400">{stats?.positiveRatingsPercentage}%</h3>
                          <span className="text-sm text-muted-foreground">
                            Note &gt; 4/5
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-amber-100 dark:bg-amber-950/20">
                            <motion.div 
                              className="bg-orange-500 dark:bg-amber-600 transition-all" 
                              initial={{ width: 0 }}
                              animate={{ width: `${stats?.positiveRatingsPercentage || 0}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-orange-500 dark:text-amber-400">Locataires bien notés</span>
                            <span className="font-medium">{stats?.positiveRatingsPercentage || 0}%</span>
                          </div>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
              </motion.div>
              
              <motion.div 
                variants={item}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative min-w-[200px] hover:shadow-lg transition-all duration-300"
              >
                <Card className="overflow-hidden border-none shadow-lg">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-orange-50/90 to-amber-100/50 dark:from-orange-800/10 dark:to-amber-700/15 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-500 dark:text-amber-300">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium text-orange-500/80 dark:text-amber-300/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                          À risque
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-orange-500 dark:text-amber-300">{stats?.atRiskPercentage || 0}%</h3>
                          <span className="text-sm text-muted-foreground">
                            Note &lt; 3/5
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-orange-100 dark:bg-orange-950/20">
                            <motion.div 
                              className="bg-orange-500 dark:bg-amber-600 transition-all" 
                              initial={{ width: 0 }}
                              animate={{ width: `${stats?.atRiskPercentage || 0}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-orange-500 dark:text-amber-300">Locataires à surveiller</span>
                            <span className="font-medium">{stats?.atRiskPercentage || 0}%</span>
                          </div>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
              </motion.div>
              
              <motion.div 
                variants={item}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative min-w-[200px] hover:shadow-lg transition-all duration-300"
              >
                <Card className="overflow-hidden border-none shadow-lg">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-100/30 dark:from-amber-800/10 dark:to-orange-700/10 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-orange-600 dark:text-amber-400">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium text-orange-600/80 dark:text-amber-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                          Récentes
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-orange-600 dark:text-amber-400">{stats?.recentEntries || 0}</h3>
                          <span className="text-sm text-muted-foreground">
                            30 derniers jours
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-amber-100 dark:bg-amber-950/20">
                            <motion.div 
                              className="bg-orange-500 dark:bg-amber-600 transition-all" 
                              initial={{ width: 0 }}
                              animate={{ width: `${stats?.positiveRecentPercentage || 60}%` }}
                              transition={{ duration: 0.5 }}
                            />
                            <motion.div 
                              className="bg-orange-300 dark:bg-orange-800 transition-all" 
                              initial={{ width: 0 }}
                              animate={{ width: `${100 - (stats?.positiveRecentPercentage || 60)}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-orange-500 dark:text-amber-400">Positives</span>
                            <span className="text-orange-600 dark:text-amber-700">Négatives</span>
                          </div>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Filtres par catégorie */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
        <Tabs 
          defaultValue={activeTab} 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TenantHistoryCategory | 'all')}
          className="space-y-4"
        >
          <div className="border-b">
            <div className="flex-1 flex overflow-x-auto">
              <TabsList className="flex h-10 flex-1 items-center justify-start rounded-none bg-transparent p-0">
                <TabsTrigger value="all" className="flex gap-1 items-center">
                  <History className="h-4 w-4" />
                  <span>Tous</span>
                </TabsTrigger>
                <TabsTrigger value="movein" className="flex gap-1 items-center">
                  <Clock className="h-4 w-4" />
                  <span>Arrivées</span>
                </TabsTrigger>
                <TabsTrigger value="moveout" className="flex gap-1 items-center">
                  <Clock className="h-4 w-4" />
                  <span>Départs</span>
                </TabsTrigger>
                <TabsTrigger value="evaluation" className="flex gap-1 items-center">
                  <Star className="h-4 w-4" />
                  <span>Évaluations</span>
                </TabsTrigger>
                <TabsTrigger value="incident" className="flex gap-1 items-center">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Incidents</span>
                </TabsTrigger>
                <TabsTrigger value="communication" className="flex gap-1 items-center">
                  <User className="h-4 w-4" />
                  <span>Communication</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <TabsContent value={activeTab} className="mt-0">
            <Card className="border-0 shadow-none">
              <CardContent className="p-0">
                <TenantHistoryTable 
                  filter={activeTab}
                  searchTerm={searchTerm}
                  onViewDetails={handleViewDetails}
                  onReassign={handleReassign}
                  onViewAllEntries={handleViewAllEntries}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="communication" className="m-0">
            <TenantHistoryTable 
              filter="communication" 
              onViewDetails={handleViewDetails} 
              onReassign={handleReassign}
              onViewAllEntries={handleViewAllEntries}
            />
          </TabsContent>
        </Tabs>
        </motion.div>
      </div>
      
      {/* Dialogue des détails d'une entrée spécifique */}
      {selectedEntryId && (
        <TenantHistoryDetails
          id={selectedEntryId}
          isOpen={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedEntryId(undefined);
          }}
          onEdit={handleOpenEditDialog}
        />
      )}
      
      {/* Dialogue d'ajout/modification */}
      <TenantHistoryDialog
        open={showAddDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setShowEditDialog(false);
            // Ne pas effacer selectedEntryId ici car on pourrait en avoir besoin ailleurs
          }
        }}
        historyId={showEditDialog ? selectedEntryId : undefined}
        onSuccess={() => {
          // Fermer le dialogue
          setShowAddDialog(false);
          setShowEditDialog(false);
          // Rafraîchir les données
          queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
          queryClient.invalidateQueries({ queryKey: ['tenantHistoryStats'] });
        }}
        title={showEditDialog ? "Modifier l'évaluation" : "Ajouter une évaluation"}
      />
      
      {/* Dialogue de la liste des entrées pour un locataire */}
      {selectedTenantName && (
        <TenantHistoryListDialog
          open={showListDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowListDialog(false);
            }
          }}
          tenantName={selectedTenantName}
          entries={selectedTenantEntries}
          onViewDetails={handleViewDetails}
        />
      )}
      
      {/* Dialogue de réassignation */}
      <ReassignDialog
        open={showReassignDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowReassignDialog(false);
          }
        }}
        entryId={selectedEntryId}
        tenantName={selectedTenantName}
        onSuccess={(tenantId) => {
          if (selectedEntryId) {
            reassignMutation.mutate({ id: selectedEntryId, tenantId });
          }
          // Fermer le dialogue
          setShowReassignDialog(false);
          setSelectedEntryId(undefined);
          setSelectedTenantName(undefined);
        }}
      />
    </>
  );
};

export default TenantHistoryPage;