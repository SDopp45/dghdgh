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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Upload, User, Mail, Phone, MapPin, Building, Globe, Calendar } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom doit contenir au moins 2 caractères",
  }),
  email: z.string().email({
    message: "Veuillez entrer une adresse email valide",
  }),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().max(500, {
    message: "La biographie ne doit pas dépasser 500 caractères",
  }).optional(),
  website: z.string().url({
    message: "Veuillez entrer une URL valide",
  }).optional().or(z.literal('')),
  birthdate: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Valeurs par défaut basées sur les données utilisateur réelles si disponibles
  const defaultValues: Partial<ProfileFormValues> = {
    name: user?.fullName || "Jean Dupont",
    email: user?.email || "jean.dupont@exemple.fr",
    phone: user?.phoneNumber || "+33 6 12 34 56 78",
    company: user?.company || "Imùmo SAS",
    address: user?.address || "123 Avenue de la République, 75011 Paris",
    bio: user?.bio || "Gestionnaire immobilier avec 10 ans d'expérience dans la gestion locative et la copropriété.",
    website: user?.website || "https://jeandupont.fr",
    birthdate: user?.birthdate || "1985-06-15",
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Mettre à jour le formulaire lorsque les données utilisateur sont chargées
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.fullName || defaultValues.name,
        email: user.email || defaultValues.email,
        phone: user.phoneNumber || defaultValues.phone,
        company: user.company || defaultValues.company,
        address: user.address || defaultValues.address,
        bio: user.bio || defaultValues.bio,
        website: user.website || defaultValues.website,
        birthdate: user.birthdate || defaultValues.birthdate,
      });
      
      if (user.avatarUrl) {
        setAvatar(user.avatarUrl);
      }
    }
  }, [user]);

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      // Simuler une requête API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du profil",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
      }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      // Simuler un téléchargement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Créer une URL de prévisualisation
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Avatar téléchargé",
        description: "Votre photo de profil a été mise à jour",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du téléchargement",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil & Identité</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et professionnelles
        </p>
      </div>
      <Separator />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
            <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
            <CardDescription>
              Cette photo sera visible dans l'application et par vos collaborateurs
            </CardDescription>
            </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={avatar || (user?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean")} alt={user?.fullName || "Jean Dupont"} />
              <AvatarFallback>{user?.fullName?.charAt(0) || "J"}{user?.fullName?.split(' ')[1]?.charAt(0) || "D"}</AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col w-full gap-2">
                <Button
                  variant="outline"
                onClick={() => document.getElementById("avatar-upload")?.click()}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Modifier la photo
                  </>
                )}
                </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Formats supportés: JPG, PNG ou GIF. Taille max: 2 Mo
                  </p>
              </div>

            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{user?.role || "Admin"}</Badge>
              <Badge variant="outline">Gestionnaire</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations du profil</CardTitle>
            <CardDescription>
              Mettez à jour vos informations personnelles et professionnelles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="personal" className="flex-1">
                      <User className="mr-2 h-4 w-4" />
                      Personnel
                    </TabsTrigger>
                    <TabsTrigger value="professional" className="flex-1">
                      <Building className="mr-2 h-4 w-4" />
                      Professionnel
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                        name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="Jean Dupont" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                    </FormControl>
                    <FormDescription>
                              Votre nom et prénom
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="jean@exemple.fr" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                    </FormControl>
                    <FormDescription>
                              Votre adresse email principale
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                        name="phone"
                render={({ field }) => (
                  <FormItem>
                            <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="+33 6 12 34 56 78" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                    </FormControl>
                    <FormDescription>
                              Votre numéro de téléphone
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                        name="birthdate"
                render={({ field }) => (
                  <FormItem>
                            <FormLabel>Date de naissance</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="date" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                    </FormControl>
                    <FormDescription>
                              Votre date de naissance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                        name="address"
                render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Adresse</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="123 rue de Paris, 75001 Paris" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                    </FormControl>
                    <FormDescription>
                              Votre adresse postale
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
                    </div>
                  </TabsContent>

                  <TabsContent value="professional" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                        name="company"
                render={({ field }) => (
                  <FormItem>
                            <FormLabel>Entreprise</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="Imùmo SAS" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                    </FormControl>
                    <FormDescription>
                              Le nom de votre entreprise
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                        name="website"
                render={({ field }) => (
                  <FormItem>
                            <FormLabel>Site web</FormLabel>
                    <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  placeholder="https://exemple.fr" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                    </FormControl>
                    <FormDescription>
                              Votre site web professionnel
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                        name="bio"
                render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Biographie</FormLabel>
                    <FormControl>
                              <Textarea 
                                placeholder="Parlez de votre expérience professionnelle..." 
                                className="h-24 resize-none" 
                                {...field} 
                      />
                    </FormControl>
                      <FormDescription>
                              Une courte biographie professionnelle (max 500 caractères)
                      </FormDescription>
                            <FormMessage />
                  </FormItem>
                )}
              />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les modifications
          </Button>
                </div>
        </form>
      </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}