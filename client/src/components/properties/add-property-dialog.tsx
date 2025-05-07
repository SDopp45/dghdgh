import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Building2, Euro, Ruler, FileText, BadgeInfo, CheckCircle2, X, Home, Lightbulb, Calendar, Banknote, Info, MapIcon, CreditCard, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from 'embla-carousel-react';
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { format } from "date-fns";

const ACCEPTED_IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
const CURRENT_YEAR = new Date().getFullYear();

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  address: z.string().min(1, "L'adresse est requise"),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
  type: z.enum(["apartment", "house", "commercial", "parking", "garage", "land", "office", "building", "storage"]),
  description: z.string().optional(),
  units: z.coerce.number().min(0),
  bedrooms: z.coerce.number().min(0),
  floors: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  toilets: z.coerce.number().min(0),
  energyClass: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
  energyEmissions: z.enum(["A", "B", "C", "D", "E", "F", "G"]).optional(),
  livingArea: z.coerce.number().min(0),
  landArea: z.coerce.number().min(0),
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
  monthlyExpenses: z.coerce.number().min(0).optional(),
  loanAmount: z.coerce.number().min(0).optional(),
  monthlyLoanPayment: z.coerce.number().min(0).optional(),
  loanDuration: z.coerce.number().min(1).max(30).optional(),
  status: z.enum(["available", "rented", "maintenance", "sold"]).default("available"),
  area: z.coerce.number().min(0),
  rooms: z.coerce.number().min(0),
  images: z.instanceof(FileList).optional(),
  constructionYear: z.coerce.number().min(1800).max(CURRENT_YEAR).optional(),
  acquisitionDate: z.string().optional(),
  createPurchaseTransaction: z.boolean().default(true),
  createLoanTransactions: z.boolean().default(false),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  totalLoanRepayment: z.coerce.number().min(0).optional(),
});

export function AddPropertyDialog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [emblaRef] = useEmblaCarousel();
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [propertyCreated, setPropertyCreated] = useState<any>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [prefilledTransactions, setPrefilledTransactions] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      coordinates: {
        latitude: 0,
        longitude: 0
      },
      type: "apartment",
      description: "",
      units: 0,
      bedrooms: 0,
      floors: 0,
      bathrooms: 0,
      toilets: 0,
      energyClass: "D",
      energyEmissions: "D",
      livingArea: 0,
      landArea: 0,
      hasParking: false,
      hasTerrace: false,
      hasGarage: false,
      hasOutbuilding: false,
      hasBalcony: false,
      hasElevator: false,
      hasCellar: false,
      hasGarden: false,
      purchasePrice: 0,
      monthlyRent: 0,
      loanAmount: 0,
      monthlyLoanPayment: 0,
      loanDuration: 20,
      status: "available",
      area: 0,
      rooms: 0,
      images: undefined,
      constructionYear: undefined,
      acquisitionDate: undefined,
      createPurchaseTransaction: true,
      createLoanTransactions: false,
      interestRate: undefined,
      totalLoanRepayment: 0,
    },
  });

  const handleImageChange = (files: FileList | null) => {
    if (!files) {
      setImagePreviews([]);
      return;
    }

    const previews = Array.from(files).map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
    form.setValue('images', files);
  };

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        
        // Log pour la date d'acquisition
        console.log('AddPropertyDialog - Date d\'acquisition:', values.acquisitionDate);
        
        // Ajout des champs au FormData
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'acquisitionDate') {
              console.log('AddPropertyDialog - Ajout de la date au FormData:', value);
            }
            if (key === 'images') {
              if (value instanceof FileList) {
                Array.from(value).forEach((file) => {
                  formData.append('images', file);
                });
              }
            } else if (key === 'coordinates') {
              // Ne rien faire ici, les coordonnées sont gérées séparément
            } else {
              formData.append(key, value.toString());
            }
          }
        });

        // Ajout des coordonnées
        if (coordinates) {
          formData.append('coordinates', JSON.stringify({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          }));
        }

        const response = await fetch("/api/properties", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de l'ajout de la propriété");
        }

        return await response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: async (data) => {
      // Force refresh both queries
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/property-features/coordinates"],
        exact: false
      });

      const values = form.getValues();
      const propertyId = data.id;
      
      // Stocker la propriété créée
      setPropertyCreated(data);
      
      // Vérifier si l'utilisateur souhaite créer des transactions
      if (values.createPurchaseTransaction || values.createLoanTransactions) {
        // Préparer les transactions préfillées
        const prefilled = [];
        
        // Transaction d'achat de la propriété
        if (values.createPurchaseTransaction && values.purchasePrice > 0) {
          const purchaseDate = values.acquisitionDate 
            ? new Date(values.acquisitionDate).toISOString().split('T')[0]
            : format(new Date(), 'yyyy-MM-dd');
          
          prefilled.push({
            type: "expense",
            propertyId: propertyId,
            tenantId: null,
            category: "other",
            amount: values.purchasePrice,
            description: `Achat de la propriété: ${values.name}`,
            date: purchaseDate,
            paymentMethod: "bank_transfer",
            status: "completed",
            documents: {
              files: [],
              folderId: null
            }
          });
        }
        
        // Transaction pour le prêt immobilier
        if (values.createLoanTransactions && 
            values.loanAmount && values.loanAmount > 0 && 
            values.monthlyLoanPayment && values.monthlyLoanPayment > 0 && 
            values.loanDuration && values.loanDuration > 0) {
          
          // Utiliser le montant total des remboursements comme montant du crédit
          const totalRepayment = values.totalLoanRepayment || 
                                 (values.monthlyLoanPayment * values.loanDuration * 12);
          
          // Calculer le nombre total de mensualités
          const totalMonths = values.loanDuration * 12;
          
          // Limiter le nombre de transactions préfillées à afficher dans le formulaire 
          // (pour éviter de surcharger l'interface avec des centaines de transactions)
          const maxPrefilledTransactions = 60; // Limiter à 5 ans de mensualités préfillées
          const transactionsToCreate = Math.min(totalMonths, maxPrefilledTransactions);
          
          // Créer les transactions pour chaque mensualité
          for (let i = 0; i < transactionsToCreate; i++) {
            const paymentDate = new Date(values.acquisitionDate 
              ? values.acquisitionDate
              : new Date());
            paymentDate.setMonth(paymentDate.getMonth() + i);
            
            prefilled.push({
              type: "credit",
              propertyId: propertyId,
              tenantId: null,
              category: "other",
              amount: values.monthlyLoanPayment,
              description: i === 0 
                ? `Mensualité prêt ${i+1}/${totalMonths} - ${values.name} (sur ${totalMonths} mensualités)`
                : `Mensualité prêt ${i+1}/${totalMonths} - ${values.name}`,
              date: format(paymentDate, 'yyyy-MM-dd'),
              paymentMethod: "bank_transfer",
              status: i === 0 ? "completed" : "pending",
              documents: {
                files: [],
                folderId: null
              }
            });
          }
          
          // Si on a limité le nombre de transactions, ajouter une information dans la première transaction
          if (totalMonths > maxPrefilledTransactions) {
            if (prefilled.length > 0) {
              prefilled[0].description += ` (${maxPrefilledTransactions} premières mensualités préfillées sur ${totalMonths})`;
            }
          }
        }
        
        setPrefilledTransactions(prefilled);
        
        // Ouvrir le dialogue de transactions
        setShowTransactionDialog(true);
      } else {
        // Si pas de transactions à créer, afficher simplement le message de succès
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setDialogOpen(false);
        form.reset();
        setImagePreviews([]);
      }, 1500);
      }
    },
    onError: (error: Error) => {
      console.error('Error during property creation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'ajout de la propriété",
        variant: "destructive",
      });
    },
  });

  const cleanup = () => {
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    setImagePreviews([]);
  };

  // Modifions la fonction de calcul pour qu'elle soit appelée à chaque changement des paramètres
  const calculateLoanDetails = (amount: number, years: number, interestRate?: number) => {
    if (amount <= 0 || years <= 0) return { monthlyPayment: 0, totalRepayment: 0 };
    
    const rate = ((interestRate || 0) / 100) / 12; // Taux mensuel
    const months = years * 12;
    
    let monthlyPayment: number;
    if (rate > 0) {
      // Formule standard pour le calcul de mensualité avec intérêt
      monthlyPayment = Math.round(
        (amount * rate * Math.pow(1 + rate, months)) / 
        (Math.pow(1 + rate, months) - 1)
      );
    } else {
      // Sans taux d'intérêt, simple division
      monthlyPayment = Math.round(amount / months);
    }
    
    const totalRepayment = monthlyPayment * months;
    
    return { monthlyPayment, totalRepayment };
  };

  // Fonction pour mettre à jour la mensualité automatiquement
  const updateMonthlyPayment = () => {
    const amount = form.getValues("loanAmount") || 0;
    const years = form.getValues("loanDuration") || 0;
    const rate = form.getValues("interestRate");
    
    if (amount > 0 && years > 0) {
      const { monthlyPayment, totalRepayment } = calculateLoanDetails(amount, years, rate);
      form.setValue("monthlyLoanPayment", monthlyPayment);
      form.setValue("totalLoanRepayment", totalRepayment);
    }
  };

  return (
    <>
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) cleanup();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all duration-300">
          <Plus className="h-4 w-4" />
          Ajouter une propriété
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
            <Building2 className="h-6 w-6 text-emerald-500" />
            Ajouter une nouvelle propriété
          </DialogTitle>
        </DialogHeader>
        
          {showSuccess ? (
          <div className="py-8 flex justify-center">
            <div className="flex flex-col items-center space-y-6 max-w-md bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl p-8 border border-emerald-500/20">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full p-3">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  Propriété ajoutée avec succès !
                </h3>
                <p className="text-muted-foreground">
                  Votre nouvelle propriété a été enregistrée et est maintenant disponible dans votre portefeuille immobilier.
                </p>
              </div>
              
              <div className="w-full bg-muted/30 rounded-lg p-4 border border-muted">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-muted-foreground">Ajoutée à votre inventaire</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <MapIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-muted-foreground">Visible sur la carte</span>
                  </li>
                  {form.getValues().createPurchaseTransaction && (
                    <li className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-amber-500" />
                      <span className="text-muted-foreground">Transaction d'achat créée</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => {
                  mutation.mutate(values);
                })}
                className="space-y-8"
              >
                {/* 1. Photos */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-emerald-500">
                    <FileText className="h-5 w-5" />
                    Photos du bien
                  </h3>
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>Photos</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <Input
                              type="file"
                              accept={ACCEPTED_IMAGE_TYPES.join(",")}
                              onChange={(e) => handleImageChange(e.target.files)}
                              multiple
                              {...field}
                              className="cursor-pointer"
                            />
                            <FormDescription className="flex flex-col gap-2 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 flex-shrink-0" />
                                Si aucune image n'est ajoutée, une image par défaut sera utilisée selon le type de bien choisi.
                              </div>
                            </FormDescription>
                            {imagePreviews.length > 0 && (
                              <div className="relative w-full overflow-hidden" ref={emblaRef}>
                                <div className="flex gap-4">
                                  {imagePreviews.map((preview, index) => (
                                    <div key={preview} className="relative min-w-[200px]">
                                      <img
                                        src={preview}
                                        alt={`Aperçu ${index + 1}`}
                                        className="h-40 w-full object-cover rounded-md border"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newPreviews = imagePreviews.filter((_, i) => i !== index);
                                          setImagePreviews(newPreviews);
                                          const dt = new DataTransfer();
                                          const files = Array.from(value as FileList);
                                          files.forEach((file, i) => {
                                            if (i !== index) dt.items.add(file);
                                          });
                                          handleImageChange(dt.files);
                                        }}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* 2. Informations essentielles */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-500/5 to-violet-500/5 border border-blue-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <BadgeInfo className="h-5 w-5" />
                    Informations essentielles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du bien</FormLabel>
                          <FormControl>
                            <Input placeholder="Nom du bien" {...field} />
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
                          <FormLabel>Type de bien</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="apartment">Appartement</SelectItem>
                              <SelectItem value="house">Maison</SelectItem>
                              <SelectItem value="commercial">Local commercial</SelectItem>
                              <SelectItem value="parking">Place de parking</SelectItem>
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
                  </div>
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
                            placeholder="Entrez l'adresse..."
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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
                </motion.div>

                {/* 3. Caractéristiques */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-500">
                    <Home className="h-5 w-5" />
                    Caractéristiques
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="rooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pièces</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
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
                          <FormLabel>Chambres</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
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
                          <FormLabel>Étages</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
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
                          <FormLabel>Salles de bain</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
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
                          <FormLabel>Toilettes</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
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
                          <FormLabel>Unités</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>

                {/* 4. Surface */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-pink-500/5 to-rose-500/5 border border-pink-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-pink-500">
                    <Ruler className="h-5 w-5" />
                    Surface
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surface totale (m²)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="livingArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surface habitable (m²)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
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
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>

                {/* 5. Informations financières */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 p-6 rounded-xl bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 border border-purple-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-500">
                    <Euro className="h-5 w-5" />
                    Informations financières
                  </h3>

                  {/* Section Achat */}
                  <div className="space-y-4 border border-purple-200 dark:border-purple-900/30 rounded-lg p-4 bg-white/50 dark:bg-gray-900/20">
                    <h4 className="text-md font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Informations d'achat
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix d'achat (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10) || 0;
                                  field.onChange(value);
                                }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      
                    <FormField
                      control={form.control}
                      name="createPurchaseTransaction"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Créer transaction d'achat</FormLabel>
                            <FormDescription>
                              Crée automatiquement une transaction pour l'achat du bien
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
                  </div>
                  
                  {/* Section Loyer et Charges */}
                  <div className="space-y-4 border border-purple-200 dark:border-purple-900/30 rounded-lg p-4 bg-white/50 dark:bg-gray-900/20">
                    <h4 className="text-md font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
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
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
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
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    </div>
                  </div>
                  
                  {/* Section Prêt immobilier */}
                  <div className="space-y-4 border border-purple-200 dark:border-purple-900/30 rounded-lg p-4 bg-white/50 dark:bg-gray-900/20">
                    <h4 className="text-md font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
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
                              {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10) || 0;
                                  field.onChange(value);
                                  
                                  // Mettre à jour automatiquement les montants liés
                                  const years = form.getValues("loanDuration") || 0;
                                  const rate = form.getValues("interestRate");
                                  if (years > 0) {
                                    updateMonthlyPayment();
                                  }
                                }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      
                    <FormField
                      control={form.control}
                        name="interestRate"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Taux d'intérêt (%)</FormLabel>
                            <FormDescription className="text-xs mb-2">
                              Taux d'intérêt annuel du prêt
                            </FormDescription>
                            <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Ex: 3.5"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                    field.onChange(value);
                                    updateMonthlyPayment();
                                  }}
                                  className="pr-8"
                            />
                          </FormControl>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">%</div>
                            </div>
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
                              {...field}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10) || 0;
                                  field.onChange(value);
                                  
                                  // Mettre à jour automatiquement les montants liés
                                  const amount = form.getValues("loanAmount") || 0;
                                  if (amount > 0) {
                                    updateMonthlyPayment();
                                  }
                                }}
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
                            <FormLabel>Mensualité calculée (€)</FormLabel>
                            <div className="flex items-center mt-2 mb-1">
                              <div className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex justify-between items-center">
                                <span className="font-medium text-lg text-blue-700 dark:text-blue-300">
                                  {field.value ? field.value.toLocaleString() : '0'} €
                                </span>
                                <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50 px-2 py-1 rounded-md">
                                  {(form.watch("loanDuration") || 0) > 0 ? `sur ${(form.watch("loanDuration") || 0) * 12} mois` : ''}
                                </span>
                          </div>
                            </div>
                            <FormDescription className="text-xs italic">
                              Calculée à partir du capital, du taux et de la durée
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="createLoanTransactions"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2 flex flex-row items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200 dark:border-blue-800/30">
                            <div className="pt-1">
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                                className="scale-110"
                            />
                            </div>
                            <div className="space-y-1 flex-1">
                              <FormLabel className="text-base">Créer transactions de prêt</FormLabel>
                              <FormDescription>
                                Crée automatiquement des transactions mensuelles pour les mensualités du prêt. Ces transactions seront présentées dans le formulaire de transactions après la création de la propriété.
                              </FormDescription>
                            </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  </div>
                  
                  {/* Résumé des transactions de prêt */}
                  {form.watch("createLoanTransactions") && form.watch("loanDuration") && form.watch("monthlyLoanPayment") && (
                    <motion.div 
                      className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/30"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-md font-medium text-blue-700 dark:text-blue-300">
                            Résumé des transactions de prêt
                          </h4>
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs text-blue-600 dark:text-blue-300 bg-blue-100/70 hover:bg-blue-200/60 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:border-blue-700/50"
                          onClick={updateMonthlyPayment}
                        >
                          <RefreshCw className="h-3 w-3 mr-1.5" />
                          Recalculer
                        </Button>
                      </div>

                      {/* Calcul des valeurs dérivées */}
                      {(() => {
                        const capital = form.watch("loanAmount") || 0;
                        const duration = form.watch("loanDuration") || 0;
                        const monthlyPayment = form.watch("monthlyLoanPayment") || 0;
                        const months = duration * 12;
                        const totalRepayment = monthlyPayment * months;
                        const totalInterest = totalRepayment - capital;
                        
                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground dark:text-gray-400 mb-1">Capital emprunté :</p>
                                <p className="font-medium dark:text-gray-200">{capital.toLocaleString()} €</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground dark:text-gray-400 mb-1">Durée totale :</p>
                                <p className="font-medium dark:text-gray-200">{months} mensualités ({duration} ans)</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground dark:text-gray-400 mb-1">Mensualité :</p>
                                <p className="font-medium dark:text-gray-200">{monthlyPayment.toLocaleString()} €</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground dark:text-gray-400 mb-1">Taux d'intérêt :</p>
                                <p className="font-medium dark:text-gray-200">{form.watch("interestRate") || 0}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground dark:text-gray-400 mb-1">Total des intérêts :</p>
                                <p className="font-medium text-amber-600 dark:text-amber-300">{totalInterest.toLocaleString()} €</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground dark:text-gray-400 mb-1">Total à rembourser :</p>
                                <p className="font-medium text-blue-700 dark:text-blue-300">{totalRepayment.toLocaleString()} €</p>
                              </div>
                            </div>
                            
                            {/* Progress bar showing interest vs capital */}
                            <div className="mb-3">
                              <div className="w-full h-4 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-400 flex items-center justify-center text-[9px] text-white font-bold"
                                  style={{ width: `${(capital / totalRepayment) * 100}%` }}
                                >
                                  {Math.round((capital / totalRepayment) * 100)}%
                                </div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground dark:text-gray-400 mt-1">
                                <span>Capital: {Math.round((capital / totalRepayment) * 100)}%</span>
                                <span>Intérêts: {Math.round((totalInterest / totalRepayment) * 100)}%</span>
                              </div>
                            </div>
                            
                            <div className="text-xs text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                              <p className="mb-1">Chaque mensualité inclut à la fois une part du capital emprunté et des intérêts. <strong>{duration > 0 ? Math.round((capital / totalRepayment) * 100) : 0}%</strong> de vos paiements serviront à rembourser le capital.</p>
                              <p>Ces transactions seront présentées dans le formulaire de transaction après la création de la propriété.</p>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </motion.div>

                {/* 6. Équipements et commodités */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-gray-500/5 to-gray-700/5 border border-gray-600/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-700">
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
                    
                    {/* Nouvelles commodités */}
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

                {/* 7. Performance énergétique */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-teal-500/5 to-emerald-500/5 border border-teal-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-teal-500">
                    <Lightbulb className="h-5 w-5" />
                    Performance énergétique
                  </h3>
                  <FormField
                    control={form.control}
                    name="energyClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classe énergétique</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["A", "B", "C", "D", "E", "F", "G"].map((value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
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
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["A", "B", "C", "D", "E", "F", "G"].map((value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* 8. Dates et Années */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-indigo-500/5 to-blue-500/5 border border-indigo-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-500">
                    <Calendar className="h-5 w-5" />
                    Dates et Années
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="constructionYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Année de construction</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1800}
                              max={CURRENT_YEAR}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>

                {/* 9. Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/20"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600">
                    <FileText className="h-5 w-5" />
                    Description
                  </h3>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description détaillée</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Description détaillée du bien..."
                            className="resize-y min-h-[150px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

              <div className="sticky bottom-0 pt-4 pb-2 bg-white dark:bg-gray-950 border-t mt-6">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting} 
                    className="gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600"
                  >
                    {isSubmitting && (
                        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    Ajouter la propriété
                  </Button>
                </div>
                </div>
              </form>
            </Form>
          )}
      </DialogContent>
    </Dialog>

    {/* Dialogue de transaction */}
    <NewTransactionDialog 
      open={showTransactionDialog} 
      onOpenChange={(open) => {
        setShowTransactionDialog(open);
        
        // Si le dialogue se ferme, afficher le message de succès final
        if (!open) {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setDialogOpen(false);
            form.reset();
            setImagePreviews([]);
          }, 1500);
        }
      }}
      initialTransactions={prefilledTransactions}
    />
    </>
  );
}