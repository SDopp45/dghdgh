import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Shield, Lock, AlertTriangle, KeyRound, LogOut, Smartphone } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useUserSettings } from '@/hooks/use-user-settings';

const securityFormSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "Le mot de passe actuel est requis",
  }),
  newPassword: z.string().min(8, {
    message: "Le nouveau mot de passe doit contenir au moins 8 caractères",
  }).optional(),
  confirmPassword: z.string().optional(),
  twoFactorEnabled: z.boolean().default(false),
  loginNotifications: z.boolean().default(true),
  sessionTimeout: z.boolean().default(false),
  mobileVerification: z.boolean().default(false),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type SecurityFormValues = z.infer<typeof securityFormSchema>;

export default function SecurityPage() {
  const { user } = useUser();
  const { settings } = useUserSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastLogin, setLastLogin] = useState({
    date: "15/06/2023 à 14:30",
    location: "Paris, France",
    device: "Chrome sur Windows 10",
    ip: "192.168.1.1"
  });
  
  // Simuler des sessions actives
  const [activeSessions, setActiveSessions] = useState([
    {
      id: "1",
      device: "Chrome sur Windows 10",
      location: "Paris, France",
      ip: "192.168.1.1",
      lastActive: "Maintenant",
      isCurrent: true
    },
    {
      id: "2",
      device: "Safari sur iPhone",
      location: "Lyon, France",
      ip: "192.168.1.245",
      lastActive: "Il y a 2 heures",
      isCurrent: false
    }
  ]);
  
  const defaultValues: Partial<SecurityFormValues> = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: settings?.security?.twoFactorEnabled || false,
    loginNotifications: settings?.security?.loginAlerts || true,
    sessionTimeout: settings?.security?.sessionTimeout || false,
    mobileVerification: settings?.security?.passwordResetViaSms || false,
  };

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Mettre à jour le formulaire quand les paramètres sont chargés
  useEffect(() => {
    if (settings?.security) {
      form.setValue('twoFactorEnabled', settings.security.twoFactorEnabled);
      form.setValue('loginNotifications', settings.security.loginAlerts);
      form.setValue('sessionTimeout', settings.security.sessionTimeout);
      form.setValue('mobileVerification', settings.security.passwordResetViaSms);
    }
  }, [settings, form]);

  async function onSubmit(data: SecurityFormValues) {
    setIsSubmitting(true);
    try {
      // Simuler une requête API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Paramètres de sécurité mis à jour",
        description: "Vos préférences de sécurité ont été enregistrées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour des paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      // Simuler une requête API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mettre à jour la liste des sessions
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      
      toast({
        title: "Session révoquée",
        description: "La session a été déconnectée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la révocation de la session",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déconnecter toutes les autres sessions ?")) {
      return;
    }
    
    try {
      // Simuler une requête API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Conserver uniquement la session courante
      setActiveSessions(prev => prev.filter(session => session.isCurrent));
      
      toast({
        title: "Sessions révoquées",
        description: "Toutes les autres sessions ont été déconnectées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la révocation des sessions",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sécurité</h1>
        <p className="text-muted-foreground">
          Gérez vos paramètres de sécurité et protégez votre compte
        </p>
      </div>
      <Separator />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Mot de passe
              </CardTitle>
              <CardDescription>
                Modifiez votre mot de passe pour sécuriser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Entrez votre mot de passe actuel pour confirmer votre identité
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Utilisez un mot de passe fort avec au moins 8 caractères
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmation du mot de passe</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••••" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Confirmez votre nouveau mot de passe
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mettre à jour le mot de passe
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Paramètres de sécurité
              </CardTitle>
              <CardDescription>
                Configurez vos préférences de sécurité pour protéger votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="twoFactorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-1">
                          <FormLabel className="text-base">Authentification à deux facteurs</FormLabel>
                          <FormDescription>
                            Ajoutez une couche de sécurité supplémentaire à votre compte
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        {field.value && (
                          <Badge className="absolute -right-2 -top-2" variant="outline">
                            Activé
                          </Badge>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="loginNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-1">
                          <FormLabel className="text-base">Notifications de connexion</FormLabel>
                          <FormDescription>
                            Recevez un email lorsqu'une nouvelle connexion est détectée
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sessionTimeout"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-1">
                          <FormLabel className="text-base">Expiration automatique des sessions</FormLabel>
                          <FormDescription>
                            Déconnexion automatique après 30 minutes d'inactivité
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mobileVerification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                        <div className="space-y-1">
                          <FormLabel className="text-base">Vérification mobile</FormLabel>
                          <FormDescription>
                            Utilisez votre téléphone pour réinitialiser votre mot de passe
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="button" onClick={form.handleSubmit(onSubmit)} className="mt-6" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer les paramètres
                </Button>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Dernière connexion
              </CardTitle>
              <CardDescription>
                Informations sur votre dernière connexion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Date et heure</div>
                <div className="font-medium">{lastLogin.date}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Localisation</div>
                <div className="font-medium">{lastLogin.location}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Appareil</div>
                <div className="font-medium">{lastLogin.device}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Adresse IP</div>
                <div className="font-medium">{lastLogin.ip}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Sessions actives
              </CardTitle>
              <CardDescription>
                Gérez vos sessions de connexion actives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium flex items-center gap-2">
                      {session.device}
                      {session.isCurrent && (
                        <Badge variant="outline" className="ml-2">
                          Actuel
                        </Badge>
                      )}
                    </div>
                    {!session.isCurrent && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <LogOut className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {session.location} • {session.ip}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Dernière activité: {session.lastActive}
                  </div>
                </div>
              ))}
              
              {activeSessions.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={handleRevokeAllSessions}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnecter toutes les autres sessions
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 