import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Plus, Trash, Trash2, CheckCircle2, ImageIcon, X, Building2, BadgeInfo, Home, Euro, Ruler, Lightbulb, Calendar, Info, Undo2, ImageOff, MapIcon, CreditCard, Banknote } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from "@/lib/utils";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

// Définition des interfaces
interface PropertyImage {
  id: number;
  filename: string;
  order: number;
}

interface Property {
  id: number;
  name: string;
  address: string;
  description?: string;
  type: string;
  status: 'available' | 'rented' | 'maintenance' | 'sold';
  purchasePrice?: number;
  monthlyRent?: number;
  monthlyExpenses?: number;
  loanAmount?: number;
  loanDuration?: number;
  monthlyLoanPayment?: number;
  energyClass: string;
  energyEmissions?: string;
  livingArea?: number;
  landArea?: number;
  area?: number;
  units?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  toilets?: number;
  floors?: number;
  constructionYear?: number;
  purchaseDate?: string;
  acquisitionDate?: string;
  hasParking?: boolean;
  hasGarage?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasCellar?: boolean;
  hasGarden?: boolean;
  hasOutbuilding?: boolean;
  isNewConstruction?: boolean;
  images?: PropertyImage[];
  createdAt?: string;
  updatedAt?: string;
}

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  address: z.string().min(1, "L'adresse est requise"),
  description: z.string().optional(),
  type: z.enum(["apartment", "house", "commercial", "parking", "garage", "land", "office", "building", "storage"]),
  units: z.coerce.number().int().min(0).default(0),
  rooms: z.coerce.number().int().min(0).default(0),
  bedrooms: z.coerce.number().int().min(0).default(0),
  floors: z.coerce.number().int().min(0).default(0),
  bathrooms: z.coerce.number().int().min(0).default(0),
  toilets: z.coerce.number().int().min(0).default(0),
  energyClass: z.enum(["A", "B", "C", "D", "E", "F", "G"]).default("D"),
  energyEmissions: z.enum(["A", "B", "C", "D", "E", "F", "G"]).default("D"),
  livingArea: z.coerce.number().min(0).default(0),
  landArea: z.coerce.number().min(0).optional(),
  hasParking: z.boolean().default(false),
  hasTerrace: z.boolean().default(false),
  hasGarage: z.boolean().default(false),
  hasOutbuilding: z.boolean().default(false),
  hasBalcony: z.boolean().default(false),
  hasElevator: z.boolean().default(false),
  hasCellar: z.boolean().default(false),
  hasGarden: z.boolean().default(false),
  purchasePrice: z.coerce.number().min(0),
  monthlyRent: z.coerce.number().min(0).optional(),
  monthlyLoanPayment: z.coerce.number().min(0).optional(),
  loanAmount: z.coerce.number().min(0).optional(),
  loanDuration: z.coerce.number().min(1).max(30).optional(),
  monthlyExpenses: z.coerce.number().min(0).optional(),
  status: z.enum(["available", "rented", "maintenance", "sold"]).default("available"),
  constructionYear: z.coerce.number().int().optional(),
  area: z.coerce.number().min(0).default(0),
  acquisitionDate: z.string().optional(),
  newImages: z.instanceof(FileList).optional(),
});

interface FormValues extends z.infer<typeof formSchema> {
  images?: PropertyImage[];
}

interface EditPropertyDialogProps {
  property: Property;
  buttonProps?: ButtonProps;
}

export function EditPropertyDialog({ property, buttonProps }: EditPropertyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [emblaRef] = useEmblaCarousel();
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: property.name,
      address: property.address,
      description: property.description || "",
      type: property.type as any,
      units: property.units || 0,
      rooms: property.rooms || 0,
      bedrooms: property.bedrooms || 0,
      floors: property.floors || 0,
      bathrooms: property.bathrooms || 0,
      toilets: property.toilets || 0,
      purchasePrice: Number(property.purchasePrice),
      monthlyRent: property.monthlyRent ? Number(property.monthlyRent) : undefined,
      loanAmount: property.loanAmount ? Number(property.loanAmount) : undefined,
      monthlyLoanPayment: property.monthlyLoanPayment ? Number(property.monthlyLoanPayment) : undefined,
      loanDuration: property.loanDuration ? Number(property.loanDuration) : undefined,
      monthlyExpenses: property.monthlyExpenses ? Number(property.monthlyExpenses) : undefined,
      status: property.status as any,
      constructionYear: property.constructionYear || undefined,
      energyClass: property.energyClass as any,
      energyEmissions: property.energyEmissions as any || "D",
      livingArea: property.livingArea || 0,
      landArea: property.landArea || undefined,
      hasParking: property.hasParking || false,
      hasTerrace: property.hasTerrace || false,
      hasGarage: property.hasGarage || false,
      hasOutbuilding: property.hasOutbuilding || false,
      hasBalcony: property.hasBalcony || false,
      hasElevator: property.hasElevator || false,
      hasCellar: property.hasCellar || false,
      hasGarden: property.hasGarden || false,
      area: property.area || 0,
      acquisitionDate: property.acquisitionDate
        ? new Date(property.acquisitionDate).toISOString().split('T')[0]
        : undefined,
      images: property.images || [],
    },
  });

  const handleImageChange = (files: FileList | null) => {
    if (!files) {
      setNewImagePreviews([]);
      setNewImages([]);
      return;
    }

    const fileArray = Array.from(files);
    setNewImages(fileArray);

    // Create preview URLs for the new images
    const previews = fileArray.map(file => URL.createObjectURL(file));
    setNewImagePreviews(previews);

    form.setValue('newImages', files);
  };

  const toggleImageForDeletion = (imageId: number) => {
    setImagesToDelete(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      setIsSubmitting(true);

      try {
        const formData = new FormData();

        // Log pour la date d'acquisition
        console.log('EditPropertyDialog - Date d\'acquisition avant envoi:', values.acquisitionDate);
        
        // Add basic property data
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'acquisitionDate') {
              console.log('EditPropertyDialog - Ajout de la date au FormData:', value);
              formData.append('acquisitionDate', value);
            } else if (key === 'images') {
              // Ne rien faire ici, les images sont gérées séparément
            } else {
              formData.append(key, value.toString());
            }
          }
        });

        // Add images to delete
        if (imagesToDelete.length > 0) {
          formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
        }

        // Add new images
        if (values.newImages) {
          for (let i = 0; i < values.newImages.length; i++) {
            formData.append('images', values.newImages[i]);
          }
        }

        //Adding coordinates
        if (coordinates) {
          formData.append('latitude', coordinates.latitude.toString());
          formData.append('longitude', coordinates.longitude.toString());
        }

        // Send the update request
        const response = await fetch(`/api/properties/${property.id}`, {
          method: 'PUT',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erreur lors de la mise à jour de la propriété');
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating property:', error);
        throw error;
      }
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setDialogOpen(false);
      }, 2000);
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id] });
      toast({
        title: 'Propriété mise à jour',
        description: 'Les informations de la propriété ont été mises à jour avec succès',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la mise à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  const ACCEPTED_IMAGE_TYPES = ["image/gif", "image/jpeg", "image/png"];

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            <Building2 className="h-6 w-6 text-amber-500" />
            Modifier la propriété
          </DialogTitle>
        </DialogHeader>
        
          {showSuccess ? (
          <div className="py-8 flex justify-center">
            <div className="flex flex-col items-center space-y-6 max-w-md bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-8 border border-amber-500/20">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-3">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  Propriété mise à jour avec succès !
                </h3>
                <p className="text-muted-foreground">
                  Les modifications ont été enregistrées et sont maintenant visibles dans votre portefeuille immobilier.
                </p>
              </div>
              
              <div className="w-full bg-muted/30 rounded-lg p-4 border border-muted">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-500" />
                    <span className="text-muted-foreground">Informations mises à jour</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <MapIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-muted-foreground">Changements appliqués sur la carte</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-purple-500" />
                    <span className="text-muted-foreground">Historique des modifications enregistré</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="w-full grid grid-cols-6">
                    <TabsTrigger value="basic">Informations de base</TabsTrigger>
                    <TabsTrigger value="details">Détails</TabsTrigger>
                    <TabsTrigger value="financial">Finances</TabsTrigger>
                    <TabsTrigger value="energy">Performance énergétique</TabsTrigger>
                    <TabsTrigger value="amenities">Équipements</TabsTrigger>
                    <TabsTrigger value="images">Images</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="p-4 border rounded-md">
                  <ScrollArea className="h-[450px] pr-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20"
                      >
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-emerald-500">
                          <BadgeInfo className="h-5 w-5" />
                          Informations essentielles
                        </h3>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom</FormLabel>
                              <FormControl>
                                <Input placeholder="Nom de la propriété" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Adresse</FormLabel>
                              <FormControl>
                                <AddressAutocomplete
                                  value={field.value}
                                  onChange={(value) => field.onChange(value)}
                                  onSelect={(result) => {
                                    field.onChange(result.address);
                                    setCoordinates({
                                      latitude: result.lat,
                                      longitude: result.lng
                                    });
                                  }}
                                  placeholder="Saisissez l'adresse de la propriété"
                                  className="w-full"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type de propriété</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="apartment">Appartement</SelectItem>
                                  <SelectItem value="house">Maison</SelectItem>
                                  <SelectItem value="commercial">Local commercial</SelectItem>
                                  <SelectItem value="parking">Parking</SelectItem>
                                  <SelectItem value="garage">Garage</SelectItem>
                                  <SelectItem value="land">Terrain</SelectItem>
                                  <SelectItem value="office">Bureau</SelectItem>
                                  <SelectItem value="building">Immeuble</SelectItem>
                                  <SelectItem value="storage">Stockage</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Statut</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un statut" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="available">Disponible</SelectItem>
                                  <SelectItem value="rented">Loué</SelectItem>
                                  <SelectItem value="maintenance">En maintenance</SelectItem>
                                  <SelectItem value="sold">Vendu</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Description de la propriété"
                                  className="resize-none"
                                  rows={4}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="details" className="p-4 border rounded-md">
                    <ScrollArea className="h-[400px] pr-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-500/5 to-violet-500/5 border border-blue-500/20"
                      >
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                          <Home className="h-5 w-5" />
                          Caractéristiques détaillées
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="rooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre de pièces</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bedrooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre de chambres</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bathrooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre de salles de bain</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="toilets"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre de toilettes</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="floors"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre d'étages</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="units"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre d'unités</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="livingArea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Surface habitable (m²)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="landArea"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Surface du terrain (m²)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="constructionYear"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Année de construction</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1800" max={new Date().getFullYear()} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="acquisitionDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date d'acquisition</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => {
                                      console.log('EditPropertyDialog - Nouvelle date sélectionnée:', e.target.value);
                                      field.onChange(e.target.value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="financial" className="p-4 border rounded-md">
                    <ScrollArea className="h-[400px] pr-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6 p-6 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20"
                      >
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-500">
                          <Euro className="h-5 w-5" />
                          Informations financières
                        </h3>
                        
                        {/* Section Achat */}
                        <div className="space-y-4 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-white/50 dark:bg-gray-900/20">
                          <h4 className="text-md font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Informations d'achat
                          </h4>
                          
                        <FormField
                          control={form.control}
                          name="purchasePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prix d'achat (€)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        </div>
                        
                        {/* Section Loyer et Charges */}
                        <div className="space-y-4 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-white/50 dark:bg-gray-900/20">
                          <h4 className="text-md font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Loyer et Charges
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="monthlyRent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Loyer mensuel (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                              name="monthlyExpenses"
                          render={({ field }) => (
                            <FormItem>
                                  <FormLabel>Charges mensuelles (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                          </div>
                        </div>
                        
                        {/* Section Prêt immobilier */}
                        <div className="space-y-4 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-white/50 dark:bg-gray-900/20">
                          <h4 className="text-md font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Prêt immobilier
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="loanAmount"
                          render={({ field }) => (
                            <FormItem>
                                  <FormLabel>Capital emprunté (€)</FormLabel>
                                  <FormDescription className="text-xs mb-2">
                                    Montant initial du prêt, sans les intérêts
                                  </FormDescription>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                            
                        <FormField
                          control={form.control}
                          name="loanDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Durée du prêt (années)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                      min="1"
                                  max="30"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                            
                        <FormField
                          control={form.control}
                              name="monthlyLoanPayment"
                          render={({ field }) => (
                            <FormItem>
                                  <FormLabel>Mensualité (€)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                          </div>
                        </div>
                      </motion.div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="energy" className="p-4 border rounded-md">
                    <ScrollArea className="h-[400px] pr-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-teal-500/5 to-emerald-500/5 border border-teal-500/20"
                      >
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-teal-500">
                          <Lightbulb className="h-5 w-5" />
                          Performance énergétique
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name="energyClass"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Classe énergétique (DPE)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner une classe" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="A">Classe A</SelectItem>
                                    <SelectItem value="B">Classe B</SelectItem>
                                    <SelectItem value="C">Classe C</SelectItem>
                                    <SelectItem value="D">Classe D</SelectItem>
                                    <SelectItem value="E">Classe E</SelectItem>
                                    <SelectItem value="F">Classe F</SelectItem>
                                    <SelectItem value="G">Classe G</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="energyEmissions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Émissions GES</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner une classe" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="A">Classe A</SelectItem>
                                    <SelectItem value="B">Classe B</SelectItem>
                                    <SelectItem value="C">Classe C</SelectItem>
                                    <SelectItem value="D">Classe D</SelectItem>
                                    <SelectItem value="E">Classe E</SelectItem>
                                    <SelectItem value="F">Classe F</SelectItem>
                                    <SelectItem value="G">Classe G</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="amenities" className="p-4 border rounded-md">
                    <ScrollArea className="h-[400px] pr-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-indigo-500/5 to-blue-500/5 border border-indigo-500/20"
                      >
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-500">
                          <Home className="h-5 w-5" />
                          Équipements et commodités
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="hasParking"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Parking</FormLabel>
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
                            name="hasTerrace"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Terrasse</FormLabel>
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
                            name="hasGarage"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Garage</FormLabel>
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
                            name="hasOutbuilding"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Dépendance</FormLabel>
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
                            name="hasBalcony"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Balcon</FormLabel>
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
                            name="hasElevator"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Ascenseur</FormLabel>
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
                            name="hasCellar"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Cave</FormLabel>
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
                            name="hasGarden"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Jardin</FormLabel>
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
                      </motion.div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="images" className="p-4 border rounded-md">
                    <ScrollArea className="h-[400px] pr-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 border border-purple-500/20"
                      >
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-500">
                          <ImageIcon className="h-5 w-5" />
                          Gestion des images
                        </h3>
                        <div className="space-y-2">
                          <FormLabel>Images actuelles</FormLabel>
                          {property.images && property.images.length > 0 ? (
                            <div className="embla overflow-hidden" ref={emblaRef}>
                              <div className="embla__container flex h-[200px]">
                                {property.images.map((image: PropertyImage, index: number) => (
                                  <div 
                                    key={`image-${image.id || index}`}
                                    className={`embla__slide flex-[0_0_100%] min-w-0 relative ${
                                      imagesToDelete.includes(image.id) ? 'opacity-30' : ''
                                    }`}
                                  >
                                    <img
                                      src={`${import.meta.env.VITE_SERVER_URL || ''}/uploads/properties/${(image as any).filename}`}
                                      alt={`Property ${index}`}
                                      className={`h-full w-full object-cover`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => toggleImageForDeletion(image.id)}
                                      className="absolute top-2 right-2 bg-white/90 p-1 rounded-full text-red-500 hover:text-red-700"
                                    >
                                      {imagesToDelete.includes(image.id) ? <Undo2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                    {((image as any).filename)?.includes('-default.jpg') && (
                                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                        Image par défaut
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-4 bg-muted rounded-md">
                              <ImageOff className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-muted-foreground">Aucune image disponible</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <FormLabel>Ajouter de nouvelles images</FormLabel>
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,image/gif"
                              onChange={(e) => handleImageChange(e.target.files)}
                              multiple
                              className="cursor-pointer"
                            />
                            <div className="mt-2 flex flex-col gap-2 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 flex-shrink-0" />
                                Si toutes les images sont supprimées, une image par défaut correspondant au type de bien sera utilisée.
                              </div>
                            </div>
                          </div>
                          {newImagePreviews.length > 0 && (
                            <div>
                              <FormLabel>Aperçu des nouvelles images</FormLabel>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                {newImagePreviews.map((preview, i) => (
                                  <div key={i} className="relative">
                                    <img
                                      src={preview}
                                      alt={`Preview ${i}`}
                                      className="h-40 w-full object-cover rounded-md"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.01 }}
                className="pt-4 mt-6 border-t"
                >
                  <Button
                    type="submit"
                    className={cn(
                      "w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500",
                      "hover:from-amber-600 hover:via-orange-600 hover:to-rose-600",
                      "shadow-lg hover:shadow-xl transition-all duration-300",
                      "text-white font-medium py-6"
                    )}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Mise à jour en cours...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Enregistrer les modifications
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>
          )}
      </DialogContent>
    </Dialog>
  );
}