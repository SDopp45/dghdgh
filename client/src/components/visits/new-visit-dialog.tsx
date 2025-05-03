import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, User, Mail, Phone, Home, Video, MapPin, MessageSquare, Loader2, Check } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Property } from "@/lib/types";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().regex(/^(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})$/, "Numéro de téléphone invalide"),
  propertyId: z.string().optional(),
  manualAddress: z.string().optional(),
  visitType: z.enum(["physical", "virtual", "video"]),
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
  message: z.string().optional(),
}).refine(
  (data) => data.propertyId || data.manualAddress,
  {
    message: "Veuillez sélectionner une propriété ou saisir une adresse",
    path: ["propertyId"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function NewVisitDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [addressType, setAddressType] = useState<"property" | "manual">("property");
  const [propertySearch, setPropertySearch] = useState("");
  const queryClient = useQueryClient();

  const { data: properties, isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    staleTime: 1000 * 60 * 5,
  });

  // Filtrer les propriétés en fonction de la recherche
  const filteredProperties = properties?.filter(property => 
    property.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
    property.address.toLowerCase().includes(propertySearch.toLowerCase())
  ) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyId: "",
      manualAddress: "",
      visitType: "physical",
      date: "",
      time: "",
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);

      const [year, month, day] = values.date.split('-').map(Number);
      const [hours, minutes] = values.time.split(':').map(Number);
      const visitDate = new Date(year, month - 1, day, hours, minutes);

      if (isNaN(visitDate.getTime())) {
        throw new Error("Date ou heure invalide");
      }

      await apiRequest("/api/visits", {
        method: "POST",
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          visitType: values.visitType,
          datetime: visitDate.toISOString(),
          propertyId: values.propertyId ? parseInt(values.propertyId) : null,
          manualAddress: values.manualAddress || null,
          message: values.message || null,
          status: "pending"
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/properties"] });

      setIsSuccess(true);
      onSuccess("La visite a été planifiée avec succès");

      setTimeout(() => {
        form.reset();
        onOpenChange(false);
        setIsSuccess(false);
      }, 1500);

    } catch (error) {
      console.error("Erreur lors de la création de la visite:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la planification de la visite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setAddressType(value as "property" | "manual");
  };

  if (isLoadingProperties) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chargement...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement des propriétés...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#8A4FFF] to-[#AF7FFB] bg-clip-text text-transparent">
                Planifier une visite
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="h-[70vh] pr-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="bg-gradient-to-r from-[#8A4FFF]/10 to-[#AF7FFB]/10 p-6 rounded-xl shadow-sm border border-[#8A4FFF]/20">
                    <h3 className="text-lg font-medium text-[#8A4FFF] mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informations du visiteur
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#8A4FFF]">Prénom</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-white" />
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
                            <FormLabel className="text-[#8A4FFF]">Nom</FormLabel>
                            <FormControl>
                              <Input {...field} className="bg-white" />
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
                            <FormLabel className="text-[#8A4FFF]">Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#8A4FFF]/50" />
                                <Input {...field} type="email" className="pl-9 bg-white" />
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
                            <FormLabel className="text-[#8A4FFF]">Téléphone</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#8A4FFF]/50" />
                                <Input {...field} className="pl-9 bg-white" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#AF7FFB]/10 to-[#8A4FFF]/10 p-6 rounded-xl shadow-sm border border-[#8A4FFF]/20">
                    <h3 className="text-lg font-medium text-[#8A4FFF] mb-4 flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Propriété à visiter
                    </h3>
                    <div className="space-y-4">
                      <Select
                        value={addressType}
                        onValueChange={handleTabChange}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Sélectionner le type d'adresse" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="property">Propriété existante</SelectItem>
                          <SelectItem value="manual">Adresse manuelle</SelectItem>
                        </SelectContent>
                      </Select>

                      {addressType === "property" ? (
                        <FormField
                          control={form.control}
                          name="propertyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#8A4FFF]">Propriété</FormLabel>
                              <FormControl>
                                <Combobox
                                  options={properties?.map(property => ({
                                    value: property.id.toString(),
                                    label: `${property.name} - ${property.address}`
                                  })) || []}
                                  value={field.value || ""}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setPropertySearch("");
                                  }}
                                  placeholder="Sélectionner une propriété"
                                  emptyText="Aucune propriété trouvée"
                                  searchPlaceholder="Rechercher une propriété..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="manualAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#8A4FFF]">Adresse</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-[#8A4FFF]/50" />
                                  <Input 
                                    {...field} 
                                    className="pl-9 bg-white" 
                                    placeholder="Saisissez l'adresse complète"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      form.clearErrors("manualAddress");
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#8A4FFF]/10 to-[#AF7FFB]/10 p-6 rounded-xl shadow-sm border border-[#8A4FFF]/20">
                    <h3 className="text-lg font-medium text-[#8A4FFF] mb-4 flex items-center gap-2">
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
                              <SelectTrigger className="bg-white">
                                <SelectValue />
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

                  <div className="bg-gradient-to-r from-[#AF7FFB]/10 to-[#8A4FFF]/10 p-6 rounded-xl shadow-sm border border-[#8A4FFF]/20">
                    <h3 className="text-lg font-medium text-[#8A4FFF] mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Date et heure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#8A4FFF]">Date</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#8A4FFF]/50" />
                                <Input
                                  type="date"
                                  {...field}
                                  className="pl-9 bg-white"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#8A4FFF]">Heure</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-[#8A4FFF]/50" />
                                <Input
                                  type="time"
                                  {...field}
                                  className="pl-9 bg-white"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#8A4FFF]/10 to-[#AF7FFB]/10 p-6 rounded-xl shadow-sm border border-[#8A4FFF]/20">
                    <h3 className="text-lg font-medium text-[#8A4FFF] mb-4 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Message (optionnel)
                    </h3>
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="bg-white hover:bg-[#8A4FFF]/10"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className={`transition-all duration-300 ${
                        isSuccess
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gradient-to-r from-[#8A4FFF] to-[#AF7FFB] hover:from-[#AF7FFB] hover:to-[#8A4FFF]"
                      }`}
                      disabled={isLoading || isLoadingProperties}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Planification en cours...
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Visite planifiée !
                        </>
                      ) : (
                        "Planifier la visite"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
              <ScrollBar />
            </ScrollArea>
          </DialogContent>
        </motion.div>
      </AnimatePresence>
    </Dialog>
  );
}