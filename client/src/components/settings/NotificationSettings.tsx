import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Clock, AlertTriangle, CircleCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NotificationSetting {
  id: number;
  type: string; // 'payment', 'maintenance', 'lease', 'visit', etc.
  channel: 'app' | 'email' | 'both';
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  importance: 'all' | 'high' | 'medium' | 'none';
}

// Obtenir les paramètres de notification actuels de l'utilisateur
const useNotificationSettings = () => {
  return useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/user/notification-settings');
        return data as NotificationSetting[];
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres de notification :', error);
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

// Mettre à jour les paramètres de notification de l'utilisateur
const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (settings: NotificationSetting[]) => {
      return await apiRequest('/api/user/notification-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast({
        title: 'Paramètres enregistrés',
        description: 'Vos préférences de notification ont été mises à jour.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour des paramètres :', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos préférences. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });
};

export default function NotificationSettings() {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();
  const [localSettings, setLocalSettings] = useState<NotificationSetting[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Initialiser avec les données de l'API
  useEffect(() => {
    if (settings && settings.length > 0) {
      setLocalSettings(settings);
    } else if (!isLoading) {
      // Valeurs par défaut si aucun paramètre n'existe encore
      setLocalSettings([
        { id: 1, type: 'payment', channel: 'both', enabled: true, frequency: 'immediate', importance: 'all' },
        { id: 2, type: 'maintenance', channel: 'both', enabled: true, frequency: 'immediate', importance: 'all' },
        { id: 3, type: 'lease', channel: 'both', enabled: true, frequency: 'daily', importance: 'all' },
        { id: 4, type: 'visit', channel: 'both', enabled: true, frequency: 'immediate', importance: 'all' },
      ]);
    }
  }, [settings, isLoading]);
  
  // Mettre à jour un paramètre
  const updateSetting = (id: number, field: keyof NotificationSetting, value: any) => {
    setLocalSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, [field]: value } 
          : setting
      )
    );
  };
  
  // Enregistrer les modifications
  const saveSettings = () => {
    updateMutation.mutate(localSettings);
  };
  
  // Filtrer les paramètres en fonction de l'onglet actif
  const filteredSettings = activeTab === 'all' 
    ? localSettings 
    : localSettings.filter(setting => setting.type === activeTab);
  
  // Formatage des noms
  const getTypeName = (type: string) => {
    switch (type) {
      case 'payment': return 'Paiements';
      case 'maintenance': return 'Maintenance';
      case 'lease': return 'Contrats de bail';
      case 'visit': return 'Visites';
      default: return type;
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return <Bell className="h-5 w-5 text-green-500" />;
      case 'maintenance': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'lease': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'visit': return <CircleCheck className="h-5 w-5 text-purple-500" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Chargement des paramètres...</div>;
  }
  
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Paramètres de notification</h2>
          <p className="text-muted-foreground mt-1">
            Personnalisez comment et quand vous souhaitez être notifié
          </p>
        </div>
        <Button 
          variant="default" 
          onClick={saveSettings}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="payment">Paiements</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="lease">Baux</TabsTrigger>
          <TabsTrigger value="visit">Visites</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-4">
          {filteredSettings.map(setting => (
            <Card key={setting.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(setting.type)}
                    <CardTitle>{getTypeName(setting.type)}</CardTitle>
                  </div>
                  <Switch 
                    checked={setting.enabled} 
                    onCheckedChange={(enabled) => updateSetting(setting.id, 'enabled', enabled)}
                  />
                </div>
                <CardDescription>
                  Gérez vos notifications pour {getTypeName(setting.type).toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`channel-${setting.id}`}>
                      Canal de notification
                    </Label>
                    <Select 
                      value={setting.channel} 
                      onValueChange={(value) => updateSetting(setting.id, 'channel', value)}
                      disabled={!setting.enabled}
                    >
                      <SelectTrigger id={`channel-${setting.id}`}>
                        <SelectValue placeholder="Sélectionner un canal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="app">App uniquement</SelectItem>
                        <SelectItem value="email">Email uniquement</SelectItem>
                        <SelectItem value="both">App et Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`frequency-${setting.id}`}>
                      Fréquence
                    </Label>
                    <Select 
                      value={setting.frequency} 
                      onValueChange={(value) => updateSetting(setting.id, 'frequency', value as any)}
                      disabled={!setting.enabled}
                    >
                      <SelectTrigger id={`frequency-${setting.id}`}>
                        <SelectValue placeholder="Sélectionner une fréquence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immédiate</SelectItem>
                        <SelectItem value="daily">Résumé quotidien</SelectItem>
                        <SelectItem value="weekly">Résumé hebdomadaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`importance-${setting.id}`}>
                    Niveau d'importance
                  </Label>
                  <Select 
                    value={setting.importance} 
                    onValueChange={(value) => updateSetting(setting.id, 'importance', value as any)}
                    disabled={!setting.enabled}
                  >
                    <SelectTrigger id={`importance-${setting.id}`}>
                      <SelectValue placeholder="Sélectionner un niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les notifications</SelectItem>
                      <SelectItem value="high">Haute importance uniquement</SelectItem>
                      <SelectItem value="medium">Moyenne et haute importance</SelectItem>
                      <SelectItem value="none">Aucune notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
} 