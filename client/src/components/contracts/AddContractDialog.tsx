import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { useProperties } from "@/api/properties";
import { useCreateContract } from "@/api/contracts";
import { Contract } from "@/api/contracts";

// Types pour les parties (locataires, propriétaires, etc.)
interface Party {
  id: number;
  name: string;
  type: "tenant" | "owner" | "manager" | "other";
}

// Type pour les parties sélectionnées
type SelectedParty = {
  id: number;
  type: "tenant" | "owner" | "manager" | "other";
};

// Définition du schéma de validation pour le formulaire
const contractFormSchema = z.object({
  name: z.string().min(3, {
    message: "Le nom du contrat doit contenir au moins 3 caractères.",
  }),
  type: z.enum(["rental", "mandate", "commercial", "attestation", "other"], {
    required_error: "Veuillez sélectionner un type de contrat.",
  }),
  startDate: z.date({
    required_error: "Veuillez sélectionner une date de début.",
  }),
  endDate: z.date().optional(),
  propertyId: z.number().optional(),
  parties: z.array(
    z.object({
      id: z.number(),
      type: z.enum(["tenant", "owner", "manager", "other"]),
    })
  ).min(1, {
    message: "Veuillez sélectionner au moins une partie concernée."
  }),
  description: z.string().optional(),
  signatureRequired: z.boolean().default(true),
  automatedRenewal: z.boolean().default(false),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface AddContractDialogProps {
  initialTenantId?: number;
}

export function AddContractDialog({ initialTenantId }: AddContractDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedParties, setSelectedParties] = useState<SelectedParty[]>([]);

  // Récupérer la liste des propriétés
  const { data: propertiesData, isLoading: propertiesLoading } = useProperties();
  const properties = propertiesData || [];

  // Mutation pour créer un contrat
  const createContractMutation = useCreateContract();

  // Initialisation du formulaire
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      name: "",
      type: "rental",
      parties: [],
      signatureRequired: true,
      automatedRenewal: false,
    },
  });

  // Effect pour pré-sélectionner le locataire si initialTenantId est fourni
  useEffect(() => {
    if (initialTenantId) {
      // Récupérer les informations du locataire si l'ID est fourni
      const fetchTenantInfo = async () => {
        try {
          // Normalement, on ferait un appel API ici
          // On va simuler pour l'exemple
          const tenant = {
            id: initialTenantId,
            name: `Locataire #${initialTenantId}`,
            type: "tenant" as const
          };
          
          // Ajouter le locataire aux parties sélectionnées
          const party: SelectedParty = {
            id: tenant.id,
            type: tenant.type
          };
          
          setSelectedParties([party]);
          form.setValue('parties', [party]);
        } catch (error) {
          console.error("Erreur lors de la récupération des informations du locataire:", error);
        }
      };
      
      fetchTenantInfo();
    }
  }, [initialTenantId, form]);

  // Chargement des parties (locataires, propriétaires, etc.)
  // Pour l'instant, on utilise des données simulées
  const availableParties: Party[] = [
    { id: 1, name: "Jean Dupont", type: "tenant" },
    { id: 2, name: "Immobilière XYZ", type: "owner" },
    { id: 3, name: "SCI Résidence Les Pins", type: "owner" },
    { id: 4, name: "Agence Immoconcept", type: "manager" },
    { id: 5, name: "SARL Mode Express", type: "tenant" },
    { id: 6, name: "SCI Immo Center", type: "owner" },
    { id: 7, name: "Marie Martin", type: "tenant" },
    { id: 8, name: "Étudiant - Paul Durand", type: "tenant" },
  ];

  // Soumission du formulaire
  function onSubmit(data: ContractFormValues) {
    createContractMutation.mutate(
      {
        name: data.name,
        type: data.type,
        status: 'draft', // Par défaut en brouillon
        startDate: data.startDate,
        endDate: data.endDate || null,
        propertyId: data.propertyId || null,
        parties: data.parties,
        signatureRequired: data.signatureRequired,
        automatedRenewal: data.automatedRenewal,
        description: data.description,
      },
      {
        onSuccess: () => {
          toast({
            title: "Contrat créé",
            description: "Le contrat a été créé avec succès.",
            className: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20",
          });
          
          // Réinitialiser le formulaire et fermer
          form.reset();
          setSelectedParties([]);
          setOpen(false);
        },
        onError: (error) => {
          console.error("Erreur lors de la création du contrat:", error);
          toast({
            variant: "destructive",
            title: "Erreur lors de la création",
            description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la création du contrat."
          });
        }
      }
    );
  }

  // Constantes pour les libellés
  const contractTypeLabels: Record<string, string> = {
    "rental": "Bail location",
    "mandate": "Mandat de gestion",
    "commercial": "Bail commercial",
    "attestation": "Attestation",
    "other": "Autre contrat"
  };

  const partyTypeLabels: Record<string, string> = {
    "tenant": "Locataire",
    "owner": "Propriétaire",
    "manager": "Gestionnaire",
    "other": "Autre"
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau contrat</DialogTitle>
          <DialogDescription>
            Complétez les informations pour créer un nouveau contrat. Vous pourrez ajouter plus de détails après la création.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contrat</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Bail d'habitation - Dupont" {...field} />
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
                    <FormLabel>Type de contrat</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(contractTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de début</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Sélectionner une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de fin (optionnelle)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Sélectionner une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Laissez vide pour un contrat à durée indéterminée
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propriété concernée (optionnelle)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une propriété" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.name}
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
                name="parties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parties concernées</FormLabel>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          onValueChange={(value) => {
                            const selectedParty = availableParties.find(p => p.id === parseInt(value));
                            if (selectedParty) {
                              const party: SelectedParty = {
                                id: selectedParty.id,
                                type: selectedParty.type
                              };
                              setSelectedParties([...selectedParties, party]);
                              field.onChange([...selectedParties, party]);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Ajouter une partie" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableParties
                              .filter(party => !selectedParties.some(p => p.id === party.id))
                              .map((party) => (
                                <SelectItem key={party.id} value={party.id.toString()}>
                                  {party.name} ({partyTypeLabels[party.type]})
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedParties.length > 0 && (
                        <div className="border rounded-md p-3">
                          <div className="text-sm font-medium mb-2">Parties sélectionnées:</div>
                          <div className="space-y-2">
                            {selectedParties.map((party, index) => {
                              const partyInfo = availableParties.find(p => p.id === party.id);
                              return (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <div>
                                    {partyInfo?.name} 
                                    <span className="text-muted-foreground ml-1">
                                      ({partyTypeLabels[party.type]})
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newParties = selectedParties.filter((_, i) => i !== index);
                                      setSelectedParties(newParties);
                                      field.onChange(newParties);
                                    }}
                                  >
                                    Retirer
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnelle)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Détails supplémentaires concernant ce contrat..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="signatureRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Signature requise</FormLabel>
                      <FormDescription>
                        Ce contrat nécessite-t-il une signature électronique?
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
                name="automatedRenewal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Renouvellement automatique</FormLabel>
                      <FormDescription>
                        Ce contrat sera-t-il renouvelé automatiquement?
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
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSelectedParties([]);
                  setOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={createContractMutation.isPending}
              >
                {createContractMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer le contrat"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 