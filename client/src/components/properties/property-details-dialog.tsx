import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, MapPin, Square, Building, BedDouble, Bath, Calendar, Euro, Tag, ParkingCircle, Car, 
  Home, Maximize2, Box, Wrench, Package, CreditCard, CircleDollarSign, Banknote, 
  Clock, SunDim, Zap, Warehouse, Store, RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/utils/data-conversion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type EnergyClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

const energyClassColors: Record<EnergyClass, string> = {
  A: "bg-emerald-600",
  B: "bg-emerald-500",
  C: "bg-yellow-400",
  D: "bg-yellow-500",
  E: "bg-orange-500",
  F: "bg-red-500",
  G: "bg-red-600",
};

const statusColors = {
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  rented: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  sold: "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300",
};

const statusTranslations = {
  available: "Disponible",
  rented: "Louée",
  maintenance: "En maintenance",
  sold: "Vendue",
};

const propertyTypeLabels = {
  apartment: "Appartement",
  house: "Maison",
  commercial: "Local commercial",
  parking: "Parking",
  garage: "Garage",
  land: "Terrain",
  office: "Bureau",
  building: "Immeuble",
  storage: "Stockage",
};

export function PropertyDetailsDialog({ property, open, onOpenChange }: PropertyDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [property]);

  const getImageUrl = () => {
    // Affiche l'URL complète du serveur pour déboguer
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    console.log("URL du serveur:", serverUrl);
    
    if (!property.images || property.images.length === 0) {
      console.log("Aucune image trouvée pour", property.name, "- Utilisation de l'image par défaut");
      return getDefaultImageUrl();
    }
    
    const image = property.images[0];
    console.log("Image trouvée pour", property.name, ":", image);
    
    // Si l'image est une chaîne de caractères
    if (typeof image === 'string') {
      return `${serverUrl}/uploads/properties/${image}`;
    }
    
    // Si l'image a une propriété imageUrl (nouveau format)
    if (image && (image as any).imageUrl) {
      return `${serverUrl}/uploads/properties/${(image as any).imageUrl}`;
    }
    
    // Si l'image a une propriété filename (ancien format)
    if (image && (image as any).filename) {
      return `${serverUrl}/uploads/properties/${(image as any).filename}`;
    }
    
    return getDefaultImageUrl();
  };

  const getDefaultImageUrl = () => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    // Utiliser l'image par défaut basée sur le type de propriété
    const defaultImageName = `${property.type}-default.jpg`;
    console.log("Image par défaut utilisée:", defaultImageName);
    return `${serverUrl}/uploads/properties/${defaultImageName}`;
  };

  const handleImageError = () => {
    console.log("Erreur de chargement d'image pour", property.name);
    setImageError(true);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: 'available' | 'rented' | 'maintenance' | 'sold') => {
      const response = await fetch(`/api/properties/${property.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la propriété a été mis à jour avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du statut",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: 'available' | 'rented' | 'maintenance' | 'sold') => {
    updateStatusMutation.mutate(newStatus);
  };

  const formatCurrencyLocal = (amount?: number) => {
    return formatCurrency(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {property.name}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-secondary/30 text-secondary-foreground"
              >
                {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels]}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "gap-2",
                      statusColors[property.status]
                    )}
                  >
                    {statusTranslations[property.status]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(statusTranslations).map(([status, label]) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status as 'available' | 'rented' | 'maintenance' | 'sold')}
                      className={cn(
                        "cursor-pointer",
                        status === property.status && "bg-primary/10"
                      )}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative h-56 sm:h-96 w-full border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
            {!imageError ? (
              <img 
                src={getImageUrl()}
                alt={property.name} 
                className="h-full w-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full p-4 space-y-3">
                <div className="text-5xl text-gray-400 dark:text-gray-600">
                  {property.type === 'house' ? <Home /> : 
                   property.type === 'apartment' ? <Building2 /> :
                   property.type === 'commercial' ? <Store /> :
                   property.type === 'parking' ? <ParkingCircle /> :
                   property.type === 'garage' ? <Car /> :
                   property.type === 'building' ? <Building /> :
                   property.type === 'storage' ? <Package /> :
                   <Building2 />}
                </div>
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Aucune image disponible</p>
                  <p className="text-sm text-muted-foreground">{property.name}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2" 
                    onClick={() => setImageError(false)}
                  >
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    Réessayer
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-lg text-muted-foreground flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5" />
              {property.address}
            </p>

            <div className="grid grid-cols-1 gap-6">
              {/* Section Superficies */}
              {((property.area && Number(property.area) > 0) || 
                (property.livingArea && Number(property.livingArea) > 0) || 
                (property.landArea && Number(property.landArea) > 0)) && (
              <div className="space-y-2">
                <h4 className="font-medium bg-gradient-to-r from-blue-500 via-blue-500/80 to-blue-500/60 bg-clip-text text-transparent text-sm flex items-center">
                  <Maximize2 className="h-4 w-4 mr-1 text-blue-500" />
                  Superficies
                </h4>
                <div className="grid grid-cols-2 gap-1.5 text-sm">
                  {property.area !== undefined && property.area !== null && Number(property.area) > 0 && String(property.area) !== "0" && (
                    <div className="p-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Square className="h-4 w-4 text-blue-500 group-hover/item:text-blue-600" />
                        Surface totale
                      </span>
                      <span className="font-semibold">{property.area} m²</span>
                    </div>
                  )}
                  
                  {property.livingArea !== undefined && property.livingArea !== null && Number(property.livingArea) > 0 && String(property.livingArea) !== "0" && (
                    <div className="p-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Home className="h-4 w-4 text-blue-500 group-hover/item:text-blue-600" />
                        Surface habitable
                      </span>
                      <span className="font-semibold">{property.livingArea} m²</span>
                    </div>
                  )}
                  
                  {property.landArea !== undefined && property.landArea !== null && Number(property.landArea) > 0 && String(property.landArea) !== "0" && (
                    <div className="p-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <MapPin className="h-4 w-4 text-blue-500 group-hover/item:text-blue-600" />
                        Surface terrain
                      </span>
                      <span className="font-semibold">{property.landArea} m²</span>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Section Pièces */}
              {((property.rooms && Number(property.rooms) > 0) || 
                (property.bedrooms && Number(property.bedrooms) > 0) || 
                (property.bathrooms && Number(property.bathrooms) > 0) || 
                (property.toilets && Number(property.toilets) > 0) || 
                (property.floors && Number(property.floors) > 0) || 
                (property.units && Number(property.units) > 0)) && (
              <div className="space-y-2">
                <h4 className="font-medium bg-gradient-to-r from-indigo-500 via-indigo-500/80 to-indigo-500/60 bg-clip-text text-transparent text-sm flex items-center">
                  <Building className="h-4 w-4 mr-1 text-indigo-500" />
                  Pièces
                </h4>
                <div className="grid grid-cols-2 gap-1.5 text-sm">
                  {property.rooms && Number(property.rooms) > 0 && (
                    <div className="p-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Building className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600" />
                        Pièces
                      </span>
                      <span className="font-semibold">{property.rooms}</span>
                    </div>
                  )}
                  
                  {property.bedrooms && Number(property.bedrooms) > 0 && (
                    <div className="p-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <BedDouble className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600" />
                        Chambres
                      </span>
                      <span className="font-semibold">{property.bedrooms}</span>
                    </div>
                  )}
                  
                  {property.bathrooms && Number(property.bathrooms) > 0 && (
                    <div className="p-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Bath className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600" />
                        Salles de bain
                      </span>
                      <span className="font-semibold">{property.bathrooms}</span>
                    </div>
                  )}
                  
                  {property.toilets && Number(property.toilets) > 0 && (
                    <div className="p-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Wrench className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600" />
                        WC
                      </span>
                      <span className="font-semibold">{property.toilets}</span>
                    </div>
                  )}
                  
                  {property.floors && Number(property.floors) > 0 && (
                    <div className="p-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Building2 className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600" />
                        Étages
                      </span>
                      <span className="font-semibold">{property.floors}</span>
                    </div>
                  )}
                  
                  {property.units && Number(property.units) > 0 && (
                    <div className="p-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Building className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600" />
                        Unités
                      </span>
                      <span className="font-semibold">{property.units}</span>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Section Construction & Energie */}
              {((property.constructionYear && Number(property.constructionYear) > 0) || 
                (property.purchaseDate && (() => {
                  try {
                    return new Date(property.purchaseDate).getTime() > 0;
                  } catch (error) {
                    return false;
                  }
                })()) || 
                property.energyClass) && (
              <div className="space-y-2">
                <h4 className="font-medium bg-gradient-to-r from-orange-500 via-orange-500/80 to-orange-500/60 bg-clip-text text-transparent text-sm flex items-center">
                  <SunDim className="h-4 w-4 mr-1 text-orange-500" />
                  Construction & Energie
                </h4>
                <div className="grid grid-cols-1 gap-1.5 text-sm">
                  {property.constructionYear && Number(property.constructionYear) > 0 && (
                    <div className="p-1.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4 text-orange-500 group-hover/item:text-orange-600" />
                        Année de construction
                      </span>
                      <span className="font-semibold">{property.constructionYear}</span>
                    </div>
                  )}
                  
                  {property.purchaseDate && (() => {
                    try {
                      return new Date(property.purchaseDate).getTime() > 0;
                    } catch (error) {
                      return false;
                    }
                  })() && (
                    <div className="p-1.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Clock className="h-4 w-4 text-orange-500 group-hover/item:text-orange-600" />
                        Date d'acquisition
                      </span>
                      <span className="font-semibold">
                        {new Date(property.purchaseDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  
                  {property.energyClass && (
                    <div className="p-1.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Zap className="h-4 w-4 text-orange-500 group-hover/item:text-orange-600" />
                        DPE / GES
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={cn(
                          property.energyClass === 'A' && 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10',
                          property.energyClass === 'B' && 'border-green-500/50 text-green-500 bg-green-500/10',
                          property.energyClass === 'C' && 'border-lime-500/50 text-lime-500 bg-lime-500/10',
                          property.energyClass === 'D' && 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10',
                          property.energyClass === 'E' && 'border-amber-500/50 text-amber-500 bg-amber-500/10',
                          property.energyClass === 'F' && 'border-orange-500/50 text-orange-500 bg-orange-500/10',
                          property.energyClass === 'G' && 'border-red-500/50 text-red-500 bg-red-500/10',
                        )}>
                          {property.energyClass}
                        </Badge>
                        {property.energyEmissions && (
                          <Badge variant="outline" className={cn(
                            property.energyEmissions === 'A' && 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10',
                            property.energyEmissions === 'B' && 'border-green-500/50 text-green-500 bg-green-500/10',
                            property.energyEmissions === 'C' && 'border-lime-500/50 text-lime-500 bg-lime-500/10',
                            property.energyEmissions === 'D' && 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10',
                            property.energyEmissions === 'E' && 'border-amber-500/50 text-amber-500 bg-amber-500/10',
                            property.energyEmissions === 'F' && 'border-orange-500/50 text-orange-500 bg-orange-500/10',
                            property.energyEmissions === 'G' && 'border-red-500/50 text-red-500 bg-red-500/10',
                          )}>
                            {property.energyEmissions}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Section Finances */}
              {((property.purchasePrice && Number(property.purchasePrice) > 0) || 
                (property.monthlyRent && Number(property.monthlyRent) > 0) || 
                (property.monthlyExpenses && Number(property.monthlyExpenses) > 0) || 
                (property.loanDuration && Number(property.loanDuration) > 0) || 
                (property.loanAmount && Number(property.loanAmount) > 0) || 
                (property.monthlyLoanPayment && Number(property.monthlyLoanPayment) > 0)) && (
              <div className="space-y-2">
                <h4 className="font-medium bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent text-sm flex items-center">
                  <CreditCard className="h-4 w-4 mr-1 text-primary" />
                  Finances
                </h4>
                <div className="grid grid-cols-2 gap-1.5 text-sm">
                  {property.purchasePrice && Number(property.purchasePrice) > 0 && (
                  <div className="p-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 group/item flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <CircleDollarSign className="h-4 w-4 text-blue-500 group-hover/item:text-blue-600" />
                      Prix d'achat
                    </span>
                    <span className="font-semibold">{formatCurrencyLocal(property.purchasePrice)}</span>
                  </div>
                  )}
                  
                  {property.monthlyRent && Number(property.monthlyRent) > 0 && (
                    <div className="p-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Banknote className="h-4 w-4 text-emerald-500 group-hover/item:text-emerald-600" />
                        Loyer mensuel
                      </span>
                      <span className="font-semibold">{formatCurrencyLocal(property.monthlyRent)}</span>
                    </div>
                  )}
                  
                  {property.monthlyExpenses && Number(property.monthlyExpenses) > 0 && (
                    <div className="p-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Euro className="h-4 w-4 text-amber-500 group-hover/item:text-amber-600" />
                        Charges mensuelles
                      </span>
                      <span className="font-semibold">{formatCurrencyLocal(property.monthlyExpenses)}</span>
                    </div>
                  )}
                  
                  {property.loanDuration && Number(property.loanDuration) > 0 && (
                    <div className="p-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600" />
                        Durée du prêt
                      </span>
                      <span className="font-semibold">{property.loanDuration} ans</span>
                    </div>
                  )}
                  
                  {property.loanAmount && Number(property.loanAmount) > 0 && (
                    <div className="p-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Euro className="h-4 w-4 text-violet-500 group-hover/item:text-violet-600" />
                        Crédit
                      </span>
                      <span className="font-semibold">{formatCurrencyLocal(property.loanAmount)}</span>
                    </div>
                  )}
                  
                  {property.monthlyLoanPayment && Number(property.monthlyLoanPayment) > 0 && (
                    <div className="p-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all duration-300 group/item flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Euro className="h-4 w-4 text-rose-500 group-hover/item:text-rose-600" />
                        Mensualité
                      </span>
                      <span className="font-semibold">{formatCurrencyLocal(property.monthlyLoanPayment)}</span>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-wrap gap-2">
              {(property.hasTerrace === true || Boolean(property.hasTerrace)) && <Badge variant="secondary">Terrasse</Badge>}
              {(property.hasParking === true || Boolean(property.hasParking)) && <Badge variant="secondary">Parking</Badge>}
              {(property.hasGarage === true || Boolean(property.hasGarage)) && <Badge variant="secondary">Garage</Badge>}
              {(property.hasOutbuilding === true || Boolean(property.hasOutbuilding)) && <Badge variant="secondary">Dépendance</Badge>}
              {(property.hasBalcony === true || Boolean(property.hasBalcony)) && <Badge variant="secondary">Balcon</Badge>}
              {(property.hasElevator === true || Boolean(property.hasElevator)) && <Badge variant="secondary">Ascenseur</Badge>}
              {(property.hasCellar === true || Boolean(property.hasCellar)) && <Badge variant="secondary">Cave</Badge>}
              {(property.hasGarden === true || Boolean(property.hasGarden)) && <Badge variant="secondary">Jardin</Badge>}
              {(property.isNewConstruction === true || property.isnewconstruction === true) && <Badge variant="secondary">Construction neuve</Badge>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Property {
  id: number;
  name: string;
  address: string;
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
  hasParking?: boolean;
  hasGarage?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasCellar?: boolean;
  hasGarden?: boolean;
  hasOutbuilding?: boolean;
  isNewConstruction?: boolean;
  isnewconstruction?: boolean;
  images?: Array<{ filename: string }>;
}

interface PropertyDetailsDialogProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}