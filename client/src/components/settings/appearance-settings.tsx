import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useTheme } from '@/hooks/use-theme';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  density: z.enum(['compact', 'comfortable', 'spacious']),
  accentColor: z.string().min(4),
  animations: z.boolean(),
  dashboardLayout: z.enum(['grid', 'cards']),
  fontSize: z.number().min(0.5).max(1.5),
  borderRadius: z.number().min(0).max(1),
});

export function AppearanceSettings() {
  const { settings, isLoading, updateSettings } = useUserSettings();
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof appearanceFormSchema>>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: settings?.appearance?.theme || 'system',
      density: settings?.appearance?.density || 'comfortable',
      accentColor: settings?.appearance?.accentColor || '#3b82f6',
      animations: settings?.appearance?.animations || true,
      dashboardLayout: settings?.appearance?.dashboardLayout || 'grid',
      fontSize: settings?.appearance?.fontSize || 1,
      borderRadius: settings?.appearance?.borderRadius || 0.5,
    },
  });

  // Mise à jour du formulaire quand les paramètres chargent
  useEffect(() => {
    if (!isLoading && settings?.appearance) {
      form.reset({
        theme: settings.appearance.theme,
        density: settings.appearance.density,
        accentColor: settings.appearance.accentColor,
        animations: settings.appearance.animations,
        dashboardLayout: settings.appearance.dashboardLayout,
        fontSize: settings.appearance.fontSize,
        borderRadius: settings.appearance.borderRadius,
      });
    }
  }, [form, isLoading, settings]);

  // Synchroniser le thème avec le hook useTheme
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'theme' && value.theme) {
        setTheme(value.theme);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, setTheme]);

  async function onSubmit(data: z.infer<typeof appearanceFormSchema>) {
    setIsSaving(true);
    try {
      // Mettre à jour le thème via le hook useTheme
      setTheme(data.theme);
      
      await updateSettings({
        appearance: data
      });
      toast({
        title: "Paramètres enregistrés",
        description: "Les paramètres d'apparence ont été mis à jour.",
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des paramètres:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser tous les paramètres d'apparence ?")) {
      const defaultSettings = {
        theme: 'system' as 'light' | 'dark' | 'system',
        density: 'comfortable' as 'compact' | 'comfortable' | 'spacious',
        accentColor: '#3b82f6',
        animations: true,
        dashboardLayout: 'grid' as 'grid' | 'cards',
        fontSize: 1,
        borderRadius: 0.5,
      };
      
      // Mettre à jour le thème via le hook useTheme
      setTheme(defaultSettings.theme);
      
      await updateSettings({
        appearance: defaultSettings
      });
      
      form.reset(defaultSettings);
      
      toast({
        title: "Paramètres réinitialisés",
        description: "Les paramètres d'apparence ont été restaurés aux valeurs par défaut.",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apparence</CardTitle>
        <CardDescription>
          Personnalisez l'apparence de l'application selon vos préférences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="colors">Couleurs</TabsTrigger>
                <TabsTrigger value="typography">Typographie</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thème</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setTheme(value as 'light' | 'dark' | 'system');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un thème" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="light">Clair</SelectItem>
                          <SelectItem value="dark">Sombre</SelectItem>
                          <SelectItem value="system">Système</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choisissez entre le thème clair, sombre ou celui du système.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="density"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Densité</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une densité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="compact">Compacte</SelectItem>
                          <SelectItem value="comfortable">Confortable</SelectItem>
                          <SelectItem value="spacious">Spacieuse</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Contrôlez l'espacement des éléments de l'interface.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dashboardLayout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disposition du tableau de bord</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une disposition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="grid">Grille</SelectItem>
                          <SelectItem value="cards">Cartes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choisissez comment afficher les éléments du tableau de bord.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="animations"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Animations</FormLabel>
                        <FormDescription>
                          Activer ou désactiver les animations de l'interface.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="colors" className="space-y-6">
                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur d'accent</FormLabel>
                      <FormControl>
                        <ColorPicker
                          color={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Choisissez la couleur principale de l'application.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="typography" className="space-y-6">
                <FormField
                  control={form.control}
                  name="fontSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taille de police</FormLabel>
                      <div className="flex flex-row items-center gap-4">
                        <FormControl>
                          <Slider
                            min={0.5}
                            max={1.5}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <span className="w-12 text-center">{field.value}x</span>
                      </div>
                      <FormDescription>
                        Ajustez la taille de base du texte.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="borderRadius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rayon de bordure</FormLabel>
                      <div className="flex flex-row items-center gap-4">
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <span className="w-12 text-center">{field.value}x</span>
                      </div>
                      <FormDescription>
                        Définissez l'arrondi des coins des éléments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleReset}
              >
                Réinitialiser
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 