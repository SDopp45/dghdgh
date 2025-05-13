import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Save, AlertTriangle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  passwordResetViaSms: boolean;
  sessionTimeout: boolean;
}

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // États pour les paramètres de sécurité
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlerts: true,
    passwordResetViaSms: false,
    sessionTimeout: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Requête pour récupérer les paramètres actuels
  const { isLoading } = useQuery({
    queryKey: ['security-settings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/security-settings');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des paramètres de sécurité');
        }
        const data = await response.json();
        
        // Mettre à jour les états avec les données reçues
        setSecuritySettings(data);
        return data;
      } catch (error) {
        console.error('Erreur:', error);
        // En développement, utiliser les valeurs par défaut
        if (process.env.NODE_ENV === 'development') {
          return securitySettings;
        }
        throw error;
      }
    }
  });
  
  // Mutation pour mettre à jour les paramètres
  const updateSecuritySettingsMutation = useMutation({
    mutationFn: async (settings: SecuritySettings) => {
      const response = await fetch('/api/user/security-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des paramètres de sécurité');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['security-settings'], data);
      toast({
        title: 'Paramètres de sécurité mis à jour',
        description: 'Vos préférences de sécurité ont été enregistrées avec succès.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour des paramètres',
      });
    }
  });
  
  // Gestionnaire pour le changement d'état d'un switch
  const handleSwitchChange = (key: keyof SecuritySettings) => {
    setSecuritySettings({
      ...securitySettings,
      [key]: !securitySettings[key]
    });
  };
  
  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await updateSecuritySettingsMutation.mutateAsync(securitySettings);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/settings')}
          className="flex gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-7 w-7 text-red-500" />
          Sécurité
        </h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de sécurité</CardTitle>
          <CardDescription>
            Configurez les options de sécurité pour protéger votre compte
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="twoFactorEnabled">Authentification à deux facteurs</Label>
                <p className="text-sm text-muted-foreground">
                  Activez cette option pour ajouter une couche de sécurité supplémentaire lors de la connexion
                </p>
              </div>
              <Switch
                id="twoFactorEnabled"
                checked={securitySettings.twoFactorEnabled}
                onCheckedChange={() => handleSwitchChange('twoFactorEnabled')}
                aria-label="Activer l'authentification à deux facteurs"
              />
            </div>
            
            {securitySettings.twoFactorEnabled && (
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Fonctionnalité en cours de développement</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>L'authentification à deux facteurs sera bientôt disponible.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="loginAlerts">Alertes de connexion</Label>
                <p className="text-sm text-muted-foreground">
                  Recevez une notification par email lorsqu'une nouvelle connexion est détectée sur votre compte
                </p>
              </div>
              <Switch
                id="loginAlerts"
                checked={securitySettings.loginAlerts}
                onCheckedChange={() => handleSwitchChange('loginAlerts')}
                aria-label="Activer les alertes de connexion"
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="passwordResetViaSms">Récupération de mot de passe par SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Autorisez la récupération de votre mot de passe par SMS (nécessite un numéro de téléphone validé)
                </p>
              </div>
              <Switch
                id="passwordResetViaSms"
                checked={securitySettings.passwordResetViaSms}
                onCheckedChange={() => handleSwitchChange('passwordResetViaSms')}
                aria-label="Activer la récupération de mot de passe par SMS"
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="sessionTimeout">Expiration automatique des sessions</Label>
                <p className="text-sm text-muted-foreground">
                  Déconnectez-vous automatiquement après une période d'inactivité
                </p>
              </div>
              <Switch
                id="sessionTimeout"
                checked={securitySettings.sessionTimeout}
                onCheckedChange={() => handleSwitchChange('sessionTimeout')}
                aria-label="Activer l'expiration automatique des sessions"
              />
            </div>
          </CardContent>
          
          <CardFooter className="border-t pt-5">
            <Button 
              type="submit" 
              disabled={isSubmitting || isLoading}
              className="ml-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
} 