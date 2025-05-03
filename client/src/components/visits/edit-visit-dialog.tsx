import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Visit } from "@/types/visits";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building, User, Mail, Phone, Home, MapPin, Video, Calendar as CalendarIcon, MessageSquare, Trash2, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Property } from "@/lib/types";
import { Combobox } from "@/components/ui/combobox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Schéma de validation pour le formulaire
const visitSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  visitType: z.enum(["physical", "virtual", "video"]),
  datetime: z.date(),
  manualAddress: z.string().optional(),
  message: z.string().optional(), // Utiliser message au lieu de notes pour correspondre à l'interface Visit
  propertyId: z.number().optional(),
});

type VisitFormValues = z.infer<typeof visitSchema>;

interface EditVisitDialogProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
}

export function EditVisitDialog({ visit, open, onOpenChange }: EditVisitDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressType, setAddressType] = useState<"property" | "manual">("property");

  // Charger la liste des propriétés
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    staleTime: 1000 * 60 * 5,
  });

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      visitType: "physical",
      datetime: new Date(),
      manualAddress: "",
      message: "", // Utiliser message au lieu de notes
      propertyId: undefined
    },
  });

  // Mettre à jour le formulaire lorsque la visite change
  useEffect(() => {
    if (visit) {
      form.reset({
        firstName: visit.firstName,
        lastName: visit.lastName,
        email: visit.email,
        phone: visit.phone || "",
        visitType: visit.visitType as "physical" | "virtual" | "video",
        datetime: new Date(visit.datetime),
        manualAddress: visit.manualAddress || "",
        message: visit.message || "", // Utiliser le champ message 
        propertyId: visit.propertyId
      });
    }
  }, [visit, form]);

  // Gérer la soumission du formulaire
  const onSubmit = async (data: VisitFormValues) => {
    if (!visit) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const updatedVisit = await response.json();

      // Mettre à jour le cache
      queryClient.setQueryData<Visit[]>(["/api/visits"], (oldData) => {
        if (!oldData) return [];
        return oldData.map(v => v.id === visit.id ? updatedVisit : v);
      });

      // Invalider la requête pour forcer un refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      }, 300);

      toast({
        title: "Visite mise à jour",
        description: "Les modifications ont été enregistrées avec succès",
        className: "bg-green-500/10 border-green-500/20",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la visite:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la visite",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction pour supprimer la visite
  const handleDelete = async () => {
    if (!visit) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement cette visite ?")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/visits/${visit.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Mettre à jour le cache
      queryClient.setQueryData<Visit[]>(["/api/visits"], (oldData) => {
        if (!oldData) return [];
        return oldData.filter(v => v.id !== visit.id);
      });

      toast({
        title: "Visite supprimée",
        description: "La visite a été supprimée définitivement",
        className: "bg-blue-500/10 border-blue-500/20",
      });

      onOpenChange(false);

      // Invalider la requête pour forcer un refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      }, 300);
    } catch (error) {
      console.error("Erreur lors de la suppression de la visite:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la visite",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Modifier la visite
          </DialogTitle>
          <DialogDescription>
            Mettez à jour les informations de la visite ou supprimez-la définitivement.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-6 rounded-xl shadow-sm border border-violet-100 dark:border-violet-800/30">
                <h3 className="text-lg font-medium text-violet-600 dark:text-violet-400 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations du visiteur
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-violet-600 dark:text-violet-400">Prénom</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-white dark:bg-gray-800" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-violet-600 dark:text-violet-400">Nom</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-white dark:bg-gray-800" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-violet-600 dark:text-violet-400">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-violet-500" />
                            <Input {...field} type="email" className="pl-9 bg-white dark:bg-gray-800" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-violet-600 dark:text-violet-400">Téléphone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-violet-500" />
                            <Input {...field} className="pl-9 bg-white dark:bg-gray-800" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-6 rounded-xl shadow-sm border border-violet-100 dark:border-violet-800/30">
                <h3 className="text-lg font-medium text-violet-600 dark:text-violet-400 mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Propriété à visiter
                </h3>
                <div className="space-y-4">
                  <Tabs 
                    value={addressType} 
                    onValueChange={(v) => setAddressType(v as "property" | "manual")}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="property" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>Propriété</span>
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>Adresse manuelle</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="property" className="mt-0">
                      <FormField
                        control={form.control}
                        name="propertyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-violet-600 dark:text-violet-400">Propriété</FormLabel>
                            <FormControl>
                              <Combobox
                                options={properties.map(property => ({
                                  value: property.id.toString(),
                                  label: `${property.name} - ${property.address}`
                                }))}
                                value={field.value?.toString() || ""}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                placeholder="Sélectionner une propriété"
                                emptyText="Aucune propriété trouvée"
                                searchPlaceholder="Rechercher une propriété..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="manual" className="mt-0">
                      <FormField
                        control={form.control}
                        name="manualAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-violet-600 dark:text-violet-400">Adresse</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-violet-500" />
                                <Input {...field} className="pl-9 bg-white dark:bg-gray-800" placeholder="Saisissez l'adresse complète" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-6 rounded-xl shadow-sm border border-violet-100 dark:border-violet-800/30">
                <h3 className="text-lg font-medium text-violet-600 dark:text-violet-400 mb-4 flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Type de visite
                </h3>
                <FormField
                  control={form.control}
                  name="visitType"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-gray-800">
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="physical">Visite physique</SelectItem>
                          <SelectItem value="virtual">Visite virtuelle</SelectItem>
                          <SelectItem value="video">Visite vidéo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-6 rounded-xl shadow-sm border border-violet-100 dark:border-violet-800/30">
                <h3 className="text-lg font-medium text-violet-600 dark:text-violet-400 mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Date et heure
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="datetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-violet-600 dark:text-violet-400">Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-violet-500" />
                            <Input
                              type="date"
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                const newDate = new Date(e.target.value);
                                const currentDate = field.value || new Date();
                                newDate.setHours(
                                  currentDate.getHours(),
                                  currentDate.getMinutes()
                                );
                                field.onChange(newDate);
                              }}
                              className="pl-9 bg-white dark:bg-gray-800"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="datetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-violet-600 dark:text-violet-400">Heure</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-violet-500" />
                            <Input
                              type="time"
                              value={field.value ? format(field.value, "HH:mm") : ""}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(":");
                                const newDate = new Date(field.value || new Date());
                                newDate.setHours(
                                  parseInt(hours),
                                  parseInt(minutes)
                                );
                                field.onChange(newDate);
                              }}
                              className="pl-9 bg-white dark:bg-gray-800"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-6 rounded-xl shadow-sm border border-violet-100 dark:border-violet-800/30">
                <h3 className="text-lg font-medium text-violet-600 dark:text-violet-400 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message (optionnel)
                </h3>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} className="bg-white dark:bg-gray-800" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
          <ScrollBar />
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800/50 dark:text-rose-400 dark:hover:bg-rose-900/30"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Supprimer
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:border-violet-800/50 dark:text-violet-400 dark:hover:bg-violet-900/30"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-700 dark:to-indigo-700 dark:hover:from-violet-800 dark:hover:to-indigo-800"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}