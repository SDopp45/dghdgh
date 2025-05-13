import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, User, Shield, Save, Loader2, Key, Settings,
  Bell, LockKeyhole, LogOut, FileText, CreditCard, AlertTriangle,
  CheckCircle2, UserCog, ChevronRight, Upload, RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profileImage?: string;
  role: string;
  createdAt: string;
  lastLogin: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  passwordResetViaSms: boolean;
  sessionTimeout: boolean;
}

interface ActivityLog {
  id: number;
  action: string;
  ipAddress: string;
  timestamp: string;
  details?: string;
}

export default function UserDashboardPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // États pour les onglets
  const [activeTab, setActiveTab] = useState("profile");
  
  // États pour gérer le formulaire des informations de profil
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // États pour gérer le formulaire de changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  
  // États pour les paramètres de sécurité
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlerts: true,
    passwordResetViaSms: false,
    sessionTimeout: true
  });
  const [isSubmittingSecurity, setIsSubmittingSecurity] = useState(false);
  
  // Requête pour récupérer les infos du profil
  const { 
    data: user, 
    isLoading: isLoadingProfile 
  } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données utilisateur');
      }
      return await response.json();
    },
  });
  
  // Requête pour récupérer les paramètres de sécurité
  const { 
    isLoading: isLoadingSecuritySettings 
  } = useQuery({
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
  
  // Requête pour récupérer l'historique d'activité
  const {
    data: activityLogs,
    isLoading: isLoadingActivity
  } = useQuery<ActivityLog[]>({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/activity-logs');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'historique d\'activité');
        }
        return await response.json();
      } catch (error) {
        console.error('Erreur:', error);
        // En développement, renvoyer des données simulées
        if (process.env.NODE_ENV === 'development') {
          return [
            {
              id: 1,
              action: "Connexion",
              ipAddress: "192.168.1.1",
              timestamp: new Date().toISOString(),
              details: "Navigateur Chrome sous Windows"
            },
            {
              id: 2,
              action: "Modification du profil",
              ipAddress: "192.168.1.1",
              timestamp: new Date(Date.now() - 86400000).toISOString()
            }
          ];
        }
        throw error;
      }
    }
  });
  
  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: FormData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: profileData
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du profil');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: "Profil mis à jour",
        description: "Vos informations personnelles ont été modifiées avec succès.",
      });
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la mise à jour du profil",
      });
    },
  });
  
  // Mutation pour changer le mot de passe
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: { currentPassword: string, newPassword: string }) => {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors du changement de mot de passe');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mot de passe changé",
        description: "Votre mot de passe a été modifié avec succès.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du changement de mot de passe",
      });
    },
  });
  
  // Mutation pour mettre à jour les paramètres de sécurité
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
  
  // Mise à jour des états du formulaire quand les données utilisateur sont chargées
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user]);
  
  // Gestion du téléchargement d'avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Soumission du formulaire de profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      if (phoneNumber) formData.append('phoneNumber', phoneNumber);
      if (avatarFile) formData.append('avatar', avatarFile);
      
      await updateProfileMutation.mutateAsync(formData);
    } finally {
      setIsSubmittingProfile(false);
    }
  };
  
  // Soumission du formulaire de changement de mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
      });
      return;
    }
    
    setIsSubmittingPassword(true);
    
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };
  
  // Gestionnaire pour le changement d'état d'un switch de sécurité
  const handleSwitchChange = (key: keyof SecuritySettings) => {
    setSecuritySettings({
      ...securitySettings,
      [key]: !securitySettings[key]
    });
  };
  
  // Soumission du formulaire de sécurité
  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSecurity(true);
    
    try {
      await updateSecuritySettingsMutation.mutateAsync(securitySettings);
    } finally {
      setIsSubmittingSecurity(false);
    }
  };
  
  // Formater une date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (isLoadingProfile) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/settings')}
            className="flex gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Tableau de bord utilisateur</h2>
        </div>
      </div>
      
      {/* Carte de profil rapide */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-2">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24" />
            <div className="flex justify-center -mt-12 pb-5">
              <Avatar className="h-24 w-24 border-4 border-white bg-white">
                <AvatarImage src={avatarPreview || user?.profileImage || `/avatars/default.png`} />
                <AvatarFallback>{user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </div>
            
            <CardContent className="text-center -mt-5">
              <h3 className="text-xl font-bold">{user?.fullName || "Utilisateur"}</h3>
              <p className="text-sm text-muted-foreground">@{user?.username}</p>
              <div className="mt-3 flex justify-center gap-2">
                <Badge variant="secondary" className="flex gap-1 items-center">
                  <User className="h-3 w-3" />
                  {user?.role === 'admin' ? "Administrateur" : "Client"}
                </Badge>
                <Badge variant="outline" className="flex gap-1 items-center">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Vérifié
                </Badge>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium">Membre depuis</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.createdAt ? formatDate(user.createdAt).split(' à')[0] : "N/A"}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium">Dernière connexion</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.lastLogin ? formatDate(user.lastLogin).split(' à')[0] : "N/A"}
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full flex gap-1" 
                  onClick={() => setActiveTab("profile")}
                >
                  <UserCog className="h-3.5 w-3.5" />
                  Éditer
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full flex gap-1"
                  onClick={() => setActiveTab("security")}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Sécurité
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Menu latéral */}
          <Card className="mt-6">
            <CardContent className="p-0">
              <nav className="flex flex-col">
                <Button 
                  variant={activeTab === "profile" ? "secondary" : "ghost"} 
                  className="justify-start rounded-none h-12"
                  onClick={() => setActiveTab("profile")}
                >
                  <User className="h-4 w-4 mr-3" />
                  Profil
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant={activeTab === "security" ? "secondary" : "ghost"} 
                  className="justify-start rounded-none h-12"
                  onClick={() => setActiveTab("security")}
                >
                  <Shield className="h-4 w-4 mr-3" />
                  Sécurité
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant={activeTab === "activity" ? "secondary" : "ghost"} 
                  className="justify-start rounded-none h-12"
                  onClick={() => setActiveTab("activity")}
                >
                  <Bell className="h-4 w-4 mr-3" />
                  Activité
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant={activeTab === "password" ? "secondary" : "ghost"} 
                  className="justify-start rounded-none h-12"
                  onClick={() => setActiveTab("password")}
                >
                  <LockKeyhole className="h-4 w-4 mr-3" />
                  Mot de passe
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start rounded-none h-12 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Déconnexion
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Informations personnelles
                    </CardTitle>
                    <CardDescription>
                      Mettez à jour vos informations personnelles et vos coordonnées
                    </CardDescription>
                  </CardHeader>
                  
                  <form onSubmit={handleProfileSubmit}>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col items-center md:flex-row md:items-start gap-4">
                        <div className="relative">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={avatarPreview || user?.profileImage || `/avatars/default.png`} />
                            <AvatarFallback>{user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 rounded-full transition-opacity">
                            <label htmlFor="avatar-upload" className="cursor-pointer">
                              <Upload className="h-6 w-6 text-white" />
                              <span className="sr-only">Changer d'avatar</span>
                            </label>
                            <input 
                              type="file" 
                              id="avatar-upload" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleAvatarChange}
                            />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor="username">Nom d'utilisateur</Label>
                            <Input 
                              id="username" 
                              value={user?.username || ""} 
                              disabled 
                              className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                              Le nom d'utilisateur ne peut pas être modifié
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="fullName">Nom complet</Label>
                          <Input 
                            id="fullName" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)} 
                            placeholder="Votre nom complet"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="email">Adresse e-mail</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="votre@email.com"
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                          <Input 
                            id="phoneNumber" 
                            type="tel" 
                            value={phoneNumber} 
                            onChange={(e) => setPhoneNumber(e.target.value)} 
                            placeholder="+33 6 12 34 56 78"
                          />
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="border-t flex justify-between pt-5">
                      <Button 
                        type="button" 
                        variant="outline"
                        disabled={isSubmittingProfile}
                        onClick={() => {
                          setFullName(user?.fullName || "");
                          setEmail(user?.email || "");
                          setPhoneNumber(user?.phoneNumber || "");
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isSubmittingProfile}
                      >
                        {isSubmittingProfile ? (
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
            )}
            
            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      Paramètres de sécurité
                    </CardTitle>
                    <CardDescription>
                      Configurez les options de sécurité pour protéger votre compte
                    </CardDescription>
                  </CardHeader>
                  
                  <form onSubmit={handleSecuritySubmit}>
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
                        disabled={isSubmittingSecurity || isLoadingSecuritySettings}
                        className="ml-auto"
                      >
                        {isSubmittingSecurity ? (
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
            )}
            
            {activeTab === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LockKeyhole className="h-5 w-5 text-amber-500" />
                      Changer de mot de passe
                    </CardTitle>
                    <CardDescription>
                      Mettez à jour votre mot de passe pour renforcer la sécurité de votre compte
                    </CardDescription>
                  </CardHeader>
                  
                  <form onSubmit={handlePasswordSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                        <Input 
                          id="currentPassword" 
                          type="password" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-1">
                        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                        <Input 
                          id="newPassword" 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                        <Input 
                          id="confirmPassword" 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                        />
                      </div>
                    </CardContent>
                    
                    <CardFooter className="border-t flex justify-between pt-5">
                      <Button 
                        type="button" 
                        variant="outline"
                        disabled={isSubmittingPassword}
                        onClick={() => {
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isSubmittingPassword || !currentPassword || !newPassword || !confirmPassword}
                      >
                        {isSubmittingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Changement en cours...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Changer le mot de passe
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            )}
            
            {activeTab === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-blue-500" />
                        Historique d'activité
                      </CardTitle>
                      <CardDescription>
                        Consultez les dernières actions effectuées sur votre compte
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['activity-logs'] })}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Actualiser
                    </Button>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {isLoadingActivity ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : activityLogs && activityLogs.length > 0 ? (
                      <div className="space-y-4">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card">
                            <div className="rounded-full p-2 bg-blue-100">
                              {log.action.toLowerCase().includes("connexion") ? (
                                <LockKeyhole className="h-4 w-4 text-blue-600" />
                              ) : log.action.toLowerCase().includes("profil") ? (
                                <User className="h-4 w-4 text-green-600" />
                              ) : (
                                <Settings className="h-4 w-4 text-amber-600" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{log.action}</p>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(log.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                IP: {log.ipAddress}
                                {log.details && <span> | {log.details}</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>Aucune activité récente à afficher</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
} 