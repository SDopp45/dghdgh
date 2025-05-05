import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bot, AlertTriangle, RefreshCw, Settings, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/hooks/use-user';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';

interface UserAiData {
  id: number;
  username: string;
  fullName: string;
  email: string;
  requestCount: number;
  requestLimit: number;
  preferredModel: string;
}

export default function AiAdminPage() {
  const [users, setUsers] = useState<UserAiData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserAiData | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const { user } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Rediriger les non-administrateurs
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [user]);

  // Charger les données des utilisateurs
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/admin/users-ai-data', {
        method: 'GET',
      });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données des utilisateurs.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Réinitialiser le compteur de requêtes d'un utilisateur
  const resetUserQuota = async () => {
    if (!selectedUser) return;
    
    try {
      await apiRequest(`/api/admin/reset-user-quota/${selectedUser.id}`, {
        method: 'POST',
      });
      
      // Mettre à jour l'état local
      setUsers(prev => 
        prev.map(u => 
          u.id === selectedUser.id ? { ...u, requestCount: 0 } : u
        )
      );
      
      toast({
        title: 'Succès',
        description: `Le compteur de ${selectedUser.fullName} a été réinitialisé.`,
      });
      
      setShowResetDialog(false);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de réinitialiser le compteur.',
        variant: 'destructive',
      });
    }
  };

  // Mettre à jour la limite de requêtes d'un utilisateur
  const updateUserLimit = async () => {
    if (!selectedUser || !newLimit || isNaN(parseInt(newLimit))) return;
    
    try {
      await apiRequest(`/api/admin/update-user-limit/${selectedUser.id}`, {
        method: 'POST',
        body: JSON.stringify({ limit: parseInt(newLimit) }),
      });
      
      // Mettre à jour l'état local
      setUsers(prev => 
        prev.map(u => 
          u.id === selectedUser.id ? { ...u, requestLimit: parseInt(newLimit) } : u
        )
      );
      
      toast({
        title: 'Succès',
        description: `La limite de ${selectedUser.fullName} a été mise à jour.`,
      });
      
      setShowLimitDialog(false);
      setNewLimit('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la limite:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la limite.',
        variant: 'destructive',
      });
    }
  };

  // Formater le nom du modèle pour l'affichage
  const formatModelName = (modelId: string) => {
    const models: Record<string, string> = {
      'openai-gpt-3.5': 'OpenAI GPT-3.5',
      'openai-gpt-4o': 'OpenAI GPT-4o',
      'huggingface-zephyr': 'HuggingFace Zephyr',
      'anthropic-claude': 'Anthropic Claude',
      'mistral-7b': 'Mistral 7B',
      'local': 'Modèle Local'
    };
    
    return models[modelId] || modelId;
  };

  // Statistiques globales
  const stats = {
    totalRequests: users.reduce((sum, user) => sum + user.requestCount, 0),
    activeUsers: users.filter(user => user.requestCount > 0).length,
    limitExceeded: users.filter(user => user.requestCount >= user.requestLimit).length,
    modelUsage: users.reduce((acc, user) => {
      const model = user.preferredModel || 'Non défini';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return (
    <>
      <Helmet>
        <title>Administration IA | ImmoBot</title>
      </Helmet>
      
      <Container className="py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink>Administration</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink isCurrentPage>IA</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administration IA</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les quotas d'utilisation de l'IA et les préférences des utilisateurs.
            </p>
          </div>
          
          <Button onClick={fetchUsers} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Total des requêtes</CardTitle>
                  <CardDescription>Nombre total de requêtes effectuées</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalRequests}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Utilisateurs actifs</CardTitle>
                  <CardDescription>Utilisateurs ayant utilisé l'IA</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.activeUsers}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    sur {users.length} utilisateurs
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Quota dépassé</CardTitle>
                  <CardDescription>Utilisateurs ayant atteint leur limite</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.limitExceeded}</p>
                  {stats.limitExceeded > 0 && (
                    <Alert variant="warning" className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Attention</AlertTitle>
                      <AlertDescription>
                        {stats.limitExceeded} utilisateur(s) ne peuvent plus utiliser l'IA.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Répartition des modèles préférés</CardTitle>
                <CardDescription>Modèles d'IA sélectionnés par les utilisateurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(stats.modelUsage).map(([modelId, count]) => (
                    <Card key={modelId} className="border">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Bot className="h-8 w-8 mx-auto text-primary mb-2" />
                          <h3 className="font-medium">{formatModelName(modelId)}</h3>
                          <p className="text-2xl font-bold mt-2">{count}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round((count / users.length) * 100)}% des utilisateurs
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Utilisateurs et quotas</CardTitle>
                <CardDescription>
                  Gérez les quotas d'utilisation et réinitialisez les compteurs des utilisateurs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Modèle préféré</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{user.requestCount}</span>
                              <span className="text-muted-foreground">/</span>
                              <span>{user.requestLimit}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.preferredModel ? formatModelName(user.preferredModel) : 'Par défaut'}
                          </TableCell>
                          <TableCell>
                            {user.requestCount >= user.requestLimit ? (
                              <Badge variant="destructive">Bloqué</Badge>
                            ) : user.requestCount > 0 ? (
                              <Badge variant="success">Actif</Badge>
                            ) : (
                              <Badge variant="outline">Inactif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowResetDialog(true);
                                }}
                              >
                                Réinitialiser
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewLimit(user.requestLimit.toString());
                                  setShowLimitDialog(true);
                                }}
                              >
                                Modifier limite
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Dialog de réinitialisation */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Réinitialiser le compteur</DialogTitle>
              <DialogDescription>
                Cette action réinitialisera le compteur de requêtes pour cet utilisateur.
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="py-4">
                <p>
                  Voulez-vous vraiment réinitialiser le compteur de <strong>{selectedUser.fullName}</strong> ?
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  L'utilisateur pourra à nouveau utiliser l'assistant IA jusqu'à sa limite de {selectedUser.requestLimit} requêtes.
                </p>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                Annuler
              </Button>
              <Button onClick={resetUserQuota}>
                Réinitialiser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog de modification de limite */}
        <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la limite de requêtes</DialogTitle>
              <DialogDescription>
                Définissez une nouvelle limite de requêtes pour cet utilisateur.
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="py-4">
                <p className="mb-4">
                  Modifier la limite pour <strong>{selectedUser.fullName}</strong>:
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input 
                      type="number" 
                      value={newLimit} 
                      onChange={(e) => setNewLimit(e.target.value)}
                      placeholder="Nouvelle limite"
                      min="0"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Limite actuelle: {selectedUser.requestLimit}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLimitDialog(false)}>
                Annuler
              </Button>
              <Button onClick={updateUserLimit}>
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Container>
    </>
  );
} 