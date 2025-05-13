import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, User, Save, Loader2, RefreshCcw, Key } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profileImage?: string;
  role: string;
}

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // États pour gérer le formulaire des informations de profil
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  
  // États pour gérer le formulaire de changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  
  // Requête pour récupérer les infos du profil
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données utilisateur');
      }
      return await response.json();
    },
  });
  
  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: { fullName: string, email: string, phoneNumber?: string }) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
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
  
  // Mise à jour des états du formulaire quand les données utilisateur sont chargées
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user]);
  
  // Soumission du formulaire de profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    
    try {
      await updateProfileMutation.mutateAsync({
        fullName,
        email,
        phoneNumber: phoneNumber || undefined,
      });
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
  
  if (isLoading) {
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
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/settings')}
          className="flex gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Paramètres du compte</h2>
      </div>
      
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Mot de passe
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Mettez à jour vos informations personnelles et de contact
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleProfileSubmit}>
              <CardContent className="space-y-4">
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
                    placeholder="Votre adresse e-mail"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                  <Input 
                    id="phoneNumber" 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="Votre numéro de téléphone"
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between border-t pt-5">
                <Button variant="outline" type="button" onClick={() => {
                  if (user) {
                    setFullName(user.fullName || "");
                    setEmail(user.email || "");
                    setPhoneNumber(user.phoneNumber || "");
                  }
                }}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button type="submit" disabled={isSubmittingProfile}>
                  {isSubmittingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Changer votre mot de passe</CardTitle>
              <CardDescription>
                Assurez-vous d'utiliser un mot de passe fort et unique
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
                    required
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
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required
                  />
                </div>
              </CardContent>
              
              <CardFooter className="border-t pt-5">
                <Button 
                  type="submit" 
                  disabled={isSubmittingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="ml-auto"
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Modification...
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
        </TabsContent>
      </Tabs>
    </motion.div>
  );
} 