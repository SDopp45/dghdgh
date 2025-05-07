import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Property, PropertyImage, PropertyStatus, EnergyClass } from "@/types/shared";
import { Building2, Users, Maximize2, Home, CalendarRange, Gauge, Euro, Calendar, Bed, Bath, Building, ParkingSquare, ChevronLeft, ChevronRight, Trash2, Car, SunDim, Info, Layout, Warehouse, FileText, ChevronDown, Star, StarOff, LayoutTemplate, ArrowUpDown, CreditCard, Banknote, PercentIcon, Edit, Settings, MoreVertical } from "lucide-react";
import { EditPropertyDialog } from "./edit-property-dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ImageViewerDialog } from "./image-viewer-dialog";
import { ROICalculator } from "./analysis/roi-calculator";
import { cardHover, fadeIn, slideInRight } from "@/lib/animations/transitions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColors: Record<PropertyStatus, string> = {
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  rented: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  sold: "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300",
};

const statusLabels: Record<PropertyStatus, string> = {
  available: "Disponible",
  rented: "Loué",
  maintenance: "En maintenance",
  sold: "Vendu",
};

const energyClassColors: Record<EnergyClass, string> = {
  A: "bg-emerald-600",
  B: "bg-emerald-500",
  C: "bg-yellow-400",
  D: "bg-yellow-500",
  E: "bg-orange-500",
  F: "bg-red-500",
  G: "bg-red-600",
};

export interface PropertyCardProps {
  property: Property;
  index?: number;
}

function ImageError() {
  return (
    <div className="relative aspect-[4/3] rounded-t-lg overflow-hidden bg-muted flex items-center justify-center">
      <div className="text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Image non disponible</p>
      </div>
    </div>
  );
}

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

// Fonction pour gérer le stockage des favoris dans localStorage
const toggleFavorite = (propertyId: number) => {
  const storedFavorites = localStorage.getItem('favoriteProperties');
  let favorites: number[] = storedFavorites ? JSON.parse(storedFavorites) : [];
  
  if (favorites.includes(propertyId)) {
    favorites = favorites.filter(id => id !== propertyId);
  } else {
    favorites.push(propertyId);
  }
  
  localStorage.setItem('favoriteProperties', JSON.stringify(favorites));
  return favorites.includes(propertyId);
};

const isFavorite = (propertyId: number) => {
  const storedFavorites = localStorage.getItem('favoriteProperties');
  const favorites: number[] = storedFavorites ? JSON.parse(storedFavorites) : [];
  return favorites.includes(propertyId);
};

export function PropertyCard({ property, index = 0 }: PropertyCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [favorite, setFavorite] = useState(false);
  
  // Initialiser l'état du favori au chargement du composant
  useEffect(() => {
    setFavorite(isFavorite(property.id));
  }, [property.id]);
  
  // Filtrer les images valides
  const validImages = useMemo(() => {
    if (!property.images || property.images.length === 0) {
      return [];
    }
    return property.images.filter((_, index) => !failedImages.has(index));
  }, [property.images, failedImages]);

  // Vérifier si toutes les images ont échoué au chargement
  const allImagesFailed = useMemo(() => {
    if (!property.images || property.images.length === 0) {
      return true;
    }
    return validImages.length === 0;
  }, [property.images, validImages]);

  // Obtenir l'URL d'une image
  const getImageUrl = (image: any) => {
    // Utiliser un chemin relatif par défaut si la variable d'environnement n'est pas définie
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    
    // Si l'image est une chaîne de caractères
    if (typeof image === 'string') {
      console.log(`Image as string: ${image}`);
      return `${serverUrl}/uploads/properties/${image}`;
    }
    
    // Si l'image a une propriété imageUrl (nouveau format)
    if (image && image.imageUrl) {
      console.log(`Image with imageUrl: ${image.imageUrl}`);
      return `${serverUrl}/uploads/properties/${image.imageUrl}`;
    }
    
    // Si l'image a une propriété filename (ancien format)
    if (image && image.filename) {
      console.log(`Image with filename: ${image.filename}`);
      return `${serverUrl}/uploads/properties/${image.filename}`;
    }
    
    // Si l'image n'est pas valide, utiliser l'image par défaut
    console.log(`Invalid image format, using default for property ${property.id}`);
    return getDefaultImageUrl();
  };

  // Obtenir l'URL de l'image par défaut en fonction du type de propriété
  const getDefaultImageUrl = () => {
    // Utiliser un chemin relatif par défaut si la variable d'environnement n'est pas définie
    const serverUrl = import.meta.env.VITE_SERVER_URL || '';
    const defaultImageName = `${property.type}-default.jpg`;
    return `${serverUrl}/uploads/properties/${defaultImageName}`;
  };

  // Gérer les erreurs de chargement d'image
  const handleImageError = (index: number) => {
    console.error(`Failed to load image at index ${index} for property ${property.id}`);
    setFailedImages(prev => {
      const newSet = new Set([...Array.from(prev), index]);
      return newSet;
    });
  };

  // Navigation entre les images
  const nextImage = () => {
    if (validImages.length <= 1) return;
    setCurrentImageIndex(prev => (prev + 1) % validImages.length);
  };

  const previousImage = () => {
    if (validImages.length <= 1) return;
    setCurrentImageIndex(prev => (prev - 1 + validImages.length) % validImages.length);
  };

  const goToImage = (index: number) => {
    if (index >= 0 && index < validImages.length) {
      setCurrentImageIndex(index);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete property");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Succès",
        description: "La propriété a été supprimée",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return null;
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  };

  const roiInitialData = {
    monthlyRent: Number(property.monthlyRent) || 0,
    monthlyExpenses: Number(property.monthlyExpenses) || 0,
    purchasePrice: Number(property.purchasePrice) || 0,
    propertyTaxRate: 0,
    maintenanceReserve: 0,
    vacancyRate: 0,
  };

  const handleStatusChange = async (newStatus: PropertyStatus) => {
    try {
      const response = await fetch(`/api/properties/${property.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Succès",
        description: "Le statut a été mis à jour",
      });
    } catch (error) {
      console.error("Status update error:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher l'ouverture du dialogue de détails
    const newFavoriteStatus = toggleFavorite(property.id);
    setFavorite(newFavoriteStatus);
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeIn}
      custom={index}
      layout
      layoutId={`property-${property.id}`}
      className="h-full group"
    >
      <motion.div
        variants={cardHover}
        whileHover="hover"
        className="h-full transform-gpu"
      >
        <Card className={cn(
          "overflow-hidden transition-all duration-300 hover:shadow-xl dark:hover:shadow-primary/5 group bg-card h-full flex flex-col backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-md border-opacity-50 dark:border-opacity-30 hover:border-primary/50 dark:hover:border-primary/30",
          favorite && "border-amber-500/50 shadow-amber-500/10"
        )}>
          {validImages.length > 0 && !allImagesFailed ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
              <div className="relative h-full w-full">
                {validImages.map((image: PropertyImage, i: number) => (
                  <div
                    key={`image-${property.id}-${i}`}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      i === currentImageIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ pointerEvents: i === currentImageIndex ? 'auto' : 'none' }}
                    onClick={() => {
                      setViewerOpen(true);
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />
                    <img
                      src={getImageUrl(image)}
                      alt={`${property.name} - Image ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={() => handleImageError(i)}
                      loading="lazy"
                    />
                  </div>
                ))}
                
                {/* Badge de type de propriété dans le coin supérieur gauche */}
                <div className="absolute top-3 left-3 z-20">
                  <Badge 
                    variant="outline"
                    className="bg-black/60 text-white backdrop-blur-sm shadow-lg border-gray-700 dark:border-gray-800"
                  >
                    {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels]}
                  </Badge>
                </div>
                
                {/* Bouton favori */}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handleFavoriteToggle}
                  className={cn(
                    "absolute top-2 right-2 z-20 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 transition-all duration-300 backdrop-blur-sm",
                    favorite ? "text-amber-400 shadow-md shadow-amber-500/20" : "text-white"
                  )}
                >
                  {favorite ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}
                </Button>
                
                {validImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        previousImage();
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                      {validImages.map((_: PropertyImage, i: number) => (
                        <button
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            i === currentImageIndex
                              ? "bg-primary scale-125"
                              : "bg-white/60 hover:bg-white/80"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            goToImage(i);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
                
                {/* Property price badge */}
                <div className="absolute bottom-3 right-3 z-20">
                  <Badge className="bg-black/70 text-white backdrop-blur-sm px-2.5 py-1.5 text-sm font-semibold shadow-lg dark:bg-white/10">
                    {formatCurrency(property.purchasePrice)}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            // Image par défaut si aucune image valide n'est disponible ou si toutes les images ont échoué
            <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
              <img
                src={getDefaultImageUrl()}
                alt={`Image par défaut pour ${property.name}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => console.error(`Failed to load default image for property type ${property.type}`)}
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-20">
                Image par défaut
              </div>
              
              {/* Badge de type de propriété dans le coin supérieur gauche pour image par défaut */}
              <div className="absolute top-3 left-3 z-20">
                <Badge 
                  variant="outline"
                  className="bg-black/60 text-white backdrop-blur-sm shadow-lg border-gray-700 dark:border-gray-800"
                >
                  {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels]}
                </Badge>
              </div>
            </div>
          )}
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4">
            <motion.div variants={slideInRight} className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base bg-gradient-to-r from-green-400 via-green-500 to-emerald-400 bg-clip-text text-transparent shadow-green-500/20">
                  {property.name}
                </h3>
                <div className="flex items-center gap-1">
                  <motion.div
                    layout
                    layoutId={`status-${property.id}`}
                    transition={{ duration: 0.5, type: "spring" }}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-1 cursor-pointer">
                          <Badge
                            variant="secondary"
                            className={`${
                              statusColors[property.status as PropertyStatus] || statusColors.available
                            } transition-all duration-300 hover:scale-105`}
                          >
                            {statusLabels[property.status as PropertyStatus] || statusLabels.available}
                          </Badge>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 dark:bg-black/90 backdrop-blur-md">
                        {Object.entries(statusLabels).map(([status, label]) => (
                          <DropdownMenuItem
                            key={status}
                            className={cn(
                              "cursor-pointer",
                              status === property.status && "bg-primary/10"
                            )}
                            onClick={() => {
                              fetch(`/api/properties/${property.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status })
                              })
                                .then(res => {
                                  if (res.ok) {
                                    queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
                                    toast({
                                      title: "Statut mis à jour",
                                      description: "Le statut de la propriété a été mis à jour avec succès",
                                      className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
                                    });
                                  } else {
                                    throw new Error('Erreur lors de la mise à jour du statut');
                                  }
                                })
                                .catch((error) => {
                                  console.error('Error updating status:', error);
                                  toast({
                                    title: "Erreur",
                                    description: "Une erreur est survenue lors de la mise à jour du statut",
                                    variant: "destructive",
                                  });
                                });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  status === "available" && "bg-emerald-500",
                                  status === "rented" && "bg-blue-500",
                                  status === "maintenance" && "bg-amber-500",
                                  status === "sold" && "bg-gray-500"
                                )}
                              />
                              {label}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                </div>
              </div>
              <p className="text-sm text-green-500 dark:text-green-400 truncate max-w-[200px] group-hover:text-green-600 dark:group-hover:text-green-300 transition-colors duration-300">
                {property.address}
              </p>
            </motion.div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 text-primary/70 hover:text-primary hover:bg-primary/10 transition-all duration-300 hover:scale-110"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 dark:bg-black/90 backdrop-blur-md">
                  <DropdownMenuItem 
                    className="cursor-pointer flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      const element = document.getElementById(`roi-calculator-${property.id}`);
                      if (element) (element as HTMLElement).click();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-primary h-4 w-4 flex items-center justify-center">
                        <PercentIcon className="h-4 w-4" />
                      </div>
                      <span>Calculer rentabilité</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      const element = document.getElementById(`edit-property-${property.id}`);
                      if (element) (element as HTMLElement).click();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-blue-500 h-4 w-4 flex items-center justify-center">
                        <Edit className="h-4 w-4" />
                      </div>
                      <span>Modifier</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `/api/export/export/pdf?type=properties&id=${property.id}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-amber-500 h-4 w-4 flex items-center justify-center">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span>Exporter en PDF</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer flex items-center gap-2 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-destructive h-4 w-4 flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                      </div>
                      <span>Supprimer</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="hidden">
              <ROICalculator
                propertyId={property.id}
                initialData={roiInitialData}
                buttonProps={{
                  variant: "ghost",
                  size: "icon",
                    className: "h-8 w-8 p-0 text-primary/70 hover:text-primary hover:bg-primary/10 transition-all duration-300 hover:scale-110",
                    id: `roi-calculator-${property.id}`
                }}
              />
              <EditPropertyDialog 
                property={property}
                buttonProps={{
                  variant: "ghost",
                  size: "icon",
                    className: "h-8 w-8 p-0 text-primary/70 hover:text-primary hover:bg-primary/10 transition-all duration-300 hover:scale-110",
                    id: `edit-property-${property.id}`
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-3 text-sm"
              >
                <h4 className="text-xs uppercase font-medium text-muted-foreground col-span-2 mb-1">Caractéristiques</h4>
                {property.livingArea > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Layout className="h-4 w-4 text-blue-500 group-hover/item:text-blue-600 transition-colors" />
                          <span className="group-hover/item:text-blue-600 transition-colors">{property.livingArea} m² hab.</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Surface habitable du bien</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {property.landArea > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Layout className="h-4 w-4 text-primary group-hover/item:text-primary/80 transition-colors" />
                          <span className="group-hover/item:text-primary/80 transition-colors">{property.landArea} m² terrain</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Surface totale du terrain</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {property.area > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Layout className="h-4 w-4 text-violet-500 group-hover/item:text-violet-600 transition-colors" />
                          <span className="group-hover/item:text-violet-600 transition-colors">{property.area} m² total</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Surface totale du bien</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-3 text-sm border-t border-t-primary/10 dark:border-t-green-900/30 pt-3"
              >
                <h4 className="text-xs uppercase font-medium text-muted-foreground col-span-2 mb-1">Pièces & Configuration</h4>
                {property.units > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Building2 className="h-4 w-4 text-amber-500 group-hover/item:text-amber-600 transition-colors" />
                          <span className="group-hover/item:text-amber-600 transition-colors">{property.units} unité(s)</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nombre d'unités dans le bien</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {property.rooms > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Home className="h-4 w-4 text-rose-500 group-hover/item:text-rose-600 transition-colors" />
                          <span className="group-hover/item:text-rose-600 transition-colors">{property.rooms} pièce(s)</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nombre total de pièces</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {property.bedrooms > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Bed className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600 transition-colors" />
                          <span className="group-hover/item:text-indigo-600 transition-colors">{property.bedrooms} chambre(s)</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nombre de chambres dans le bien</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {property.bathrooms > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Bath className="h-4 w-4 text-cyan-500 group-hover/item:text-cyan-600 transition-colors" />
                          <span className="group-hover/item:text-cyan-600 transition-colors">{property.bathrooms} sdb</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nombre de salles de bain</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {property.toilets > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Bath className="h-4 w-4 text-teal-500 group-hover/item:text-teal-600 transition-colors" />
                          <span className="group-hover/item:text-teal-600 transition-colors">{property.toilets} wc</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nombre de toilettes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {property.floors > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Building className="h-4 w-4 text-fuchsia-500 group-hover/item:text-fuchsia-600 transition-colors" />
                          <span className="group-hover/item:text-fuchsia-600 transition-colors">{property.floors} étage(s)</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nombre d'étages dans le bien</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </motion.div>

              {/* Section Construction et Acquisition */}
              {(property.constructionYear || property.purchaseDate) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-3 text-sm border-t border-t-primary/10 dark:border-t-green-900/30 pt-3"
              >
                  <h4 className="text-xs uppercase font-medium text-muted-foreground col-span-2 mb-1">Construction & Acquisition</h4>
                  {property.constructionYear && Number(property.constructionYear) > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                      >
                        <Building className="h-4 w-4 text-orange-500 group-hover/item:text-orange-600 transition-colors" />
                        <span className="group-hover/item:text-orange-600 transition-colors">
                              Construit en {property.constructionYear}
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Année de construction du bien</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                  )}

                  {property.purchaseDate && formatDate(property.purchaseDate) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                      >
                        <Calendar className="h-4 w-4 text-green-500 group-hover/item:text-green-600 transition-colors" />
                        <span className="group-hover/item:text-green-600 transition-colors">
                              Acquis le {formatDate(property.purchaseDate)}
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Date d'acquisition du bien</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                  )}
              </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3 text-sm border-t border-t-primary/10 dark:border-t-green-900/30 pt-3"
              >
                <h4 className="text-xs uppercase font-medium text-muted-foreground col-span-2 mb-1">Équipements & DPE</h4>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                      >
                        <Gauge className="h-4 w-4 text-amber-500 group-hover/item:text-amber-600 transition-colors animate-pulse" />
                        <div className="flex gap-2">
                          <Badge variant="secondary" className={`${energyClassColors[property.energyClass as EnergyClass] || energyClassColors.G} text-white shadow-lg`}>
                            DPE {property.energyClass}
                          </Badge>
                          {property.energyEmissions && (
                            <Badge variant="secondary" className={`${energyClassColors[property.energyEmissions] || energyClassColors.G} text-white shadow-lg`}>
                              GES {property.energyEmissions}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Performance énergétique</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {property.hasParking && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <ParkingSquare className="h-4 w-4 text-blue-500 group-hover/item:text-blue-600 transition-colors" />
                          <span>Parking</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Place de parking disponible</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {property.hasGarage && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Car className="h-4 w-4 text-purple-500 group-hover/item:text-purple-600 transition-colors" />
                          <span>Garage</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Garage inclus</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {property.hasTerrace && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <SunDim className="h-4 w-4 text-amber-500 group-hover/item:text-amber-600 transition-colors" />
                          <span>Terrasse</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Terrasse disponible</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {property.hasBalcony && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <SunDim className="h-4 w-4 text-teal-500 group-hover/item:text-teal-600 transition-colors" />
                          <span>Balcon</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Balcon disponible</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {property.hasElevator && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <ArrowUpDown className="h-4 w-4 text-indigo-500 group-hover/item:text-indigo-600 transition-colors" />
                          <span>Ascenseur</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ascenseur disponible</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {property.hasCellar && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Warehouse className="h-4 w-4 text-rose-500 group-hover/item:text-rose-600 transition-colors" />
                          <span>Cave</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cave disponible</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {property.hasGarden && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <LayoutTemplate className="h-4 w-4 text-green-500 group-hover/item:text-green-600 transition-colors" />
                          <span>Jardin</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Jardin disponible</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {property.hasOutbuilding && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Building className="h-4 w-4 text-orange-500 group-hover/item:text-orange-600 transition-colors" />
                          <span>Dépendance</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dépendance disponible</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {(property.isNewConstruction || property.isnewconstruction) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Home className="h-4 w-4 text-cyan-500 group-hover/item:text-cyan-600 transition-colors" />
                          <span>Construction neuve</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Bien neuf</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </motion.div>

              {/* Financial information with updated design - more compact for grid view */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-3 text-sm border-t border-t-primary/10 dark:border-t-green-900/30 pt-3"
              >
                <h4 className="text-xs uppercase font-medium text-muted-foreground col-span-2 mb-1">Finances</h4>
                {/* Prix d'achat */}
                {property.purchasePrice > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                  >
                          <Euro className="h-4 w-4 text-primary group-hover/item:text-primary/80 transition-colors" />
                          <span className="group-hover/item:text-primary/80 transition-colors">{formatCurrency(property.purchasePrice)}</span>
                  </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Prix d'achat du bien</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Loyer mensuel */}
                {property.monthlyRent && Number(property.monthlyRent) > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Euro className="h-4 w-4 text-blue-500 group-hover/item:text-blue-600 transition-colors" />
                          <span className="group-hover/item:text-blue-600 transition-colors">{formatCurrency(property.monthlyRent)}/mois</span>
                  </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Loyer mensuel</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Charges mensuelles */}
                {property.monthlyExpenses !== null && property.monthlyExpenses !== undefined && Number(property.monthlyExpenses) > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Euro className="h-4 w-4 text-orange-500 group-hover/item:text-orange-600 transition-colors" />
                          <span className="group-hover/item:text-orange-600 transition-colors">{formatCurrency(property.monthlyExpenses)} charges</span>
                  </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Charges mensuelles</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Capital emprunté */}
                {property.loanAmount !== null && property.loanAmount !== undefined && Number(property.loanAmount) > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <CreditCard className="h-4 w-4 text-violet-500 group-hover/item:text-violet-600 transition-colors" />
                          <span className="group-hover/item:text-violet-600 transition-colors">{formatCurrency(property.loanAmount)} prêt</span>
                  </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Capital emprunté {property.loanDuration ? `(${property.loanDuration} ans)` : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Mensualité prêt */}
                {property.monthlyLoanPayment !== null && property.monthlyLoanPayment !== undefined && Number(property.monthlyLoanPayment) > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group/item backdrop-blur-sm"
                        >
                          <Banknote className="h-4 w-4 text-emerald-500 group-hover/item:text-emerald-600 transition-colors" />
                          <span className="group-hover/item:text-emerald-600 transition-colors">{formatCurrency(property.monthlyLoanPayment)}/mois</span>
                  </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mensualité du prêt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </motion.div>

              {/* Property description with improved styling */}
              {property?.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="border-t border-t-primary/10 dark:border-t-green-900/30 pt-3"
                >
                  <h4 className="text-xs uppercase font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground italic line-clamp-2 group-hover:text-primary/80 transition-colors duration-300">
                    {property.description}
                  </p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      {validImages.length > 0 && (
        <ImageViewerDialog
          images={validImages.map((img: PropertyImage) => ({
            id: img.id,
            imageUrl: getImageUrl(img)
          }))}
          currentIndex={currentImageIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </motion.div>
  );
}