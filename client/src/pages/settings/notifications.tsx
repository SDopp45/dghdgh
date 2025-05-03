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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Loader2, BellRing, Mail, MessageSquare, Calendar, Clock, FileText, User, Building } from 'lucide-react';
import { useUserSettings } from '@/hooks/use-user-settings';

const notificationsFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  newMessages: z.boolean().default(true),
  newAppointments: z.boolean().default(true),
  appointmentReminders: z.boolean().default(true),
  documentUpdates: z.boolean().default(true),
  propertyUpdates: z.boolean().default(true),
  newClients: z.boolean().default(true),
  emailDigestFrequency: z.enum(["never", "daily", "weekly"]).default("weekly"),
  emailTime: z.string().optional(),
  notificationSound: z.boolean().default(true),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function NotificationsPage() {
  const { settings, isLoading, updateSettings } = useUserSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultValues: Partial<NotificationsFormValues> = {
    emailNotifications: settings?.notifications?.email?.enabled || true,
    pushNotifications: settings?.notifications?.push?.enabled || true,
    marketingEmails: settings?.notifications?.email?.marketing || false,
    newMessages: true,
    newAppointments: true,
    appointmentReminders: true,
    documentUpdates: settings?.notifications?.email?.maintenanceUpdates || true,
    propertyUpdates: settings?.notifications?.email?.propertyAlerts || true,
    newClients: true,
    emailDigestFrequency: settings?.notifications?.email?.dailyDigest ? "daily" : "weekly",
    emailTime: "08:00",
    notificationSound: true,
  };

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Mettre à jour le formulaire quand les paramètres sont chargés
  useEffect(() => {
    if (!isLoading && settings) {
      form.reset({
        emailNotifications: settings.notifications.email.enabled,
        pushNotifications: settings.notifications.push.enabled,
        marketingEmails: settings.notifications.email.marketing,
        newMessages: true, // Par défaut car non présent dans settings
        newAppointments: true, // Par défaut car non présent dans settings
        appointmentReminders: true, // Par défaut car non présent dans settings
        documentUpdates: settings.notifications.email.maintenanceUpdates,
        propertyUpdates: settings.notifications.email.propertyAlerts,
        newClients: settings.notifications.email.tenantActivity,
        emailDigestFrequency: settings.notifications.email.dailyDigest ? "daily" : "weekly",
        emailTime: "08:00", // Par défaut car non présent dans settings
        notificationSound: true, // Par défaut car non présent dans settings
      });
    }
  }, [isLoading, settings, form]);

  async function onSubmit(data: NotificationsFormValues) {
    setIsSubmitting(true);
    try {
      // Mise à jour des paramètres via l'API
      await updateSettings({
        notifications: {
          email: {
            enabled: data.emailNotifications,
            dailyDigest: data.emailDigestFrequency === "daily",
            marketing: data.marketingEmails,
            propertyAlerts: data.propertyUpdates,
            tenantActivity: data.newClients,
            paymentReminders: true, // Conservé de settings
            maintenanceUpdates: data.documentUpdates,
          },
          push: {
            enabled: data.pushNotifications,
            propertyAlerts: data.propertyUpdates,
            tenantActivity: data.newClients,
            paymentReminders: true, // Conservé de settings
            maintenanceUpdates: data.documentUpdates,
          },
          sms: settings?.notifications?.sms || {
            enabled: false,
            propertyAlerts: false,
            paymentReminders: true,
            maintenanceUpdates: false,
          },
        }
      });
      
      toast({
        title: "Préférences de notification mises à jour",
        description: "Vos paramètres de notification ont été enregistrés",
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

  const isEmailDigestEnabled = form.watch("emailDigestFrequency") !== "never";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
            Gérez comment et quand vous souhaitez être notifié
          </p>
        </div>
        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="channels" className="w-full">
              <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3">
                <TabsTrigger value="channels">Canaux</TabsTrigger>
                <TabsTrigger value="events">Événements</TabsTrigger>
                <TabsTrigger value="preferences">Préférences</TabsTrigger>
        </TabsList>

              <TabsContent value="channels" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BellRing className="h-5 w-5" />
                      Canaux de notification
                    </CardTitle>
                    <CardDescription>
                      Choisissez comment vous souhaitez recevoir les notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                          <div className="space-y-1">
                            <FormLabel className="flex items-center gap-2 text-base">
                              <Mail className="h-4 w-4" /> 
                              Notifications par email
                            </FormLabel>
                            <FormDescription>
                              Recevez des notifications importantes par email
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
                      name="pushNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                          <div className="space-y-1">
                            <FormLabel className="flex items-center gap-2 text-base">
                              <BellRing className="h-4 w-4" /> 
                              Notifications push
                            </FormLabel>
                            <FormDescription>
                              Recevez des notifications en temps réel dans l'application
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
                      name="marketingEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                          <div className="space-y-1">
                            <FormLabel className="flex items-center gap-2 text-base">
                              <Mail className="h-4 w-4" /> 
                              Emails marketing
                            </FormLabel>
                            <FormDescription>
                              Recevez des nouvelles sur les fonctionnalités et offres spéciales
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
                  </CardContent>
                </Card>
        </TabsContent>

              <TabsContent value="events" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Événements et activités
                    </CardTitle>
                    <CardDescription>
                      Choisissez les événements pour lesquels vous souhaitez être notifié
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="newMessages"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" /> 
                                Nouveaux messages
                              </FormLabel>
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
                        name="newAppointments"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> 
                                Nouveaux rendez-vous
                              </FormLabel>
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
                        name="appointmentReminders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel className="flex items-center gap-2">
                                <Clock className="h-4 w-4" /> 
                                Rappels de rendez-vous
                              </FormLabel>
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
                        name="documentUpdates"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel className="flex items-center gap-2">
                                <FileText className="h-4 w-4" /> 
                                Mises à jour de documents
                              </FormLabel>
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
                        name="propertyUpdates"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel className="flex items-center gap-2">
                                <Building className="h-4 w-4" /> 
                                Mises à jour de propriétés
                              </FormLabel>
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
                        name="newClients"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel className="flex items-center gap-2">
                                <User className="h-4 w-4" /> 
                                Nouveaux clients
                              </FormLabel>
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
                  </CardContent>
                </Card>
        </TabsContent>

              <TabsContent value="preferences" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Préférences de notification
              </CardTitle>
                    <CardDescription>
                      Personnalisez vos préférences pour les résumés et les alertes
                    </CardDescription>
            </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="emailDigestFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fréquence des résumés par email</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez une fréquence" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="never">Jamais</SelectItem>
                                <SelectItem value="daily">Quotidien</SelectItem>
                                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choisissez à quelle fréquence vous souhaitez recevoir un résumé de votre activité
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {isEmailDigestEnabled && (
                        <FormField
                          control={form.control}
                          name="emailTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Heure d'envoi</FormLabel>
                              <FormControl>
                                <Input 
                                  type="time" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Choisissez l'heure à laquelle vous souhaitez recevoir vos emails de résumé
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="notificationSound"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel className="text-base">Sons de notification</FormLabel>
                              <FormDescription>
                                Activez les sons lors de la réception de notifications
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
            
            <Button type="submit" className="mt-6" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les préférences
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
}