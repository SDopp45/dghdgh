import { ContractsList } from "@/components/contracts/ContractsList";
import { AddContractDialog } from "@/components/contracts/AddContractDialog";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { FileText, FileSignature, Calendar, CheckCircle2 } from "lucide-react";
import { useContracts } from "@/api/contracts";
import { Button } from "@/components/ui/button";

// Type pour les statistiques de contrats
interface ContractStats {
  total: number;
  active: number;
  pending: number;
  expiringSoon: number;
  expired: number;
}

export default function Contracts() {
  const [activeTab, setActiveTab] = useState("contracts");
  const [contractStats, setContractStats] = useState<ContractStats>({
    total: 0,
    active: 0,
    pending: 0,
    expiringSoon: 0,
    expired: 0
  });
  
  // Extraire l'ID du locataire des paramètres d'URL si présent
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('tenant');
  
  // Récupérer les données des contrats
  const { data: contractsData, isLoading, isError } = useContracts({
    tenantId: tenantId ? parseInt(tenantId) : undefined
  });

  // Calculer les statistiques à partir des données réelles
  useEffect(() => {
    if (contractsData && contractsData.data) {
      const contracts = contractsData.data;
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      // Compter les différents types de contrats
      const activeContracts = contracts.filter(c => c.status === 'active');
      const pendingContracts = contracts.filter(c => c.status === 'pending_signature');
      const expiredContracts = contracts.filter(c => c.status === 'expired');
      const terminatedContracts = contracts.filter(c => c.status === 'terminated');
      
      // Contrats expirant bientôt (actifs avec date de fin dans les 30 jours)
      const expiringSoonContracts = activeContracts.filter(c => {
        if (!c.endDate) return false;
        const endDate = new Date(c.endDate);
        return endDate > now && endDate <= thirtyDaysFromNow;
      });
      
      setContractStats({
        total: contracts.length,
        active: activeContracts.length,
        pending: pendingContracts.length,
        expiringSoon: expiringSoonContracts.length,
        expired: expiredContracts.length
      });
    }
  }, [contractsData]);

  // Animation pour les widgets
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

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des contrats</h1>
        <p className="text-muted-foreground">
          Gérez tous vos contrats, signatures et documents légaux
        </p>
      </div>

      {/* Tabs navigation principale */}
      <Tabs
        defaultValue="contracts"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="contracts" className="px-6">
              Liste des contrats
            </TabsTrigger>
            <TabsTrigger value="letters" className="px-6">
              Modèles de lettres
            </TabsTrigger>
          </TabsList>
          
          {activeTab === "contracts" ? (
            <AddContractDialog />
          ) : (
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => window.location.href = "/contracts/letters"}
            >
              <FileText className="mr-1 h-4 w-4" />
              Créer une lettre
            </Button>
          )}
        </div>

        <TabsContent value="contracts" className="mt-6">
          {/* Stats et liste de contrats existants */}
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-blue-500 border-opacity-50"></div>
            </div>
          ) : isError ? (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Erreur de chargement</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Impossible de charger les données des contrats. Veuillez réessayer ultérieurement.
              </p>
            </div>
          ) : (
            <>
              {/* Statistiques des contrats */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* Widget 1: Total des contrats */}
                <motion.div variants={item}>
                  <Card className="overflow-hidden border-none shadow-lg">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-100/40 dark:from-blue-900/10 dark:to-indigo-800/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-blue-600 dark:text-blue-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                            Total
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{contractStats.total}</h3>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              Contrats
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="h-2 w-full rounded-full bg-blue-200/50 overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${(contractStats.active / contractStats.total) * 100}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-blue-600 dark:text-blue-400">Actifs</span>
                              <span className="font-medium">{contractStats.active} / {contractStats.total}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Widget 2: Contrats actifs */}
                <motion.div variants={item}>
                  <Card className="overflow-hidden border-none shadow-lg">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-100/40 dark:from-green-900/10 dark:to-emerald-800/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-medium text-green-600/80 dark:text-green-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                            Actifs
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{contractStats.active}</h3>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              Contrats
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex flex-col">
                              <div className="text-xs text-muted-foreground mb-1">
                                Proportion
                              </div>
                              <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-green-100 dark:bg-green-950/20">
                                <motion.div 
                                  className="bg-green-500 dark:bg-green-600 transition-all" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(contractStats.active / contractStats.total) * 100}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Widget 3: Contrats en attente de signature */}
                <motion.div variants={item}>
                  <Card className="overflow-hidden border-none shadow-lg">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-100/40 dark:from-yellow-900/10 dark:to-amber-800/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-yellow-600 dark:text-yellow-400">
                            <FileSignature className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-medium text-yellow-600/80 dark:text-yellow-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                            En attente
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{contractStats.pending}</h3>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Signatures à obtenir</span>
                              <span className="font-medium text-yellow-600 dark:text-yellow-400">{contractStats.pending}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Widget 4: Contrats qui expirent bientôt */}
                <motion.div variants={item}>
                  <Card className="overflow-hidden border-none shadow-lg">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-purple-50 to-violet-100/40 dark:from-purple-900/10 dark:to-violet-800/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 rounded-full bg-white/40 dark:bg-white/10 text-purple-600 dark:text-purple-400">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-medium text-purple-600/80 dark:text-purple-400/80 bg-white/40 dark:bg-white/10 rounded-full px-2 py-1">
                            À renouveler
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">{contractStats.expiringSoon}</h3>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Expiration &lt; 30 jours</span>
                              <span className="font-medium text-purple-600 dark:text-purple-400">{contractStats.expiringSoon}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Expirés</span>
                              <span className="font-medium text-red-600 dark:text-red-400">{contractStats.expired}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
              
              {/* Liste des contrats */}
              <div className="mt-6">
                <ContractsList />
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="letters" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Modèles de lettres pour contrats</CardTitle>
              <CardDescription>
                Accédez à notre bibliothèque de modèles de lettres professionnelles pour la gestion immobilière
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Notre outil de génération de modèles de lettres vous permet de créer rapidement des documents professionnels adaptés à vos besoins spécifiques en matière de gestion immobilière.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <Card className="bg-muted/40">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      Mise en demeure
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Créez des lettres de mise en demeure pour loyers impayés ou autres obligations contractuelles.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = "/contracts/letters"}
                    >
                      Voir les modèles
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/40">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      Résiliation
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Modèles pour la résiliation de bail, congés du locataire ou du bailleur.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = "/contracts/letters"}
                    >
                      Voir les modèles
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/40">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      Autres documents
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Quittances, attestations, demandes diverses et autres documents administratifs.
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = "/contracts/letters"}
                    >
                      Voir tous les modèles
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-center mt-6">
                <Button 
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => window.location.href = "/contracts/letters"}
                >
                  Accéder à tous les modèles de lettres
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 