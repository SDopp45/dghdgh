import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PropertyCard } from "@/components/properties/property-card";
import { AddPropertyDialog } from "@/components/properties/add-property-dialog";
import { PropertyFilters, type PropertyFilters as PropertyFiltersType, defaultFilters } from "@/components/properties/property-filters";
import { PropertyStats } from "@/components/properties/property-stats";
import { PropertyInsightsRow } from "@/components/properties/property-insights-row";
import { ROICalculator } from "@/components/properties/analysis/roi-calculator";
import { EditPropertyDialog } from "@/components/properties/edit-property-dialog";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyCardSkeleton } from "@/components/properties/property-card-skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  Building2, 
  LayoutGrid, 
  List, 
  Trash2, 
  Car, 
  FileText, 
  FileUp, 
  Map, 
  Clock, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight, 
  RotateCcw, 
  Star, 
  SplitSquareVertical, 
  X,
  Plus,
  Save,
  BookMarked,
  Library,
  Edit,
  ArrowUpDown,
  Info,
  PercentIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  BedDouble, 
  Bath, 
  Home, 
  Square, 
  Calendar, 
  Euro, 
  Tag, 
  MapPin, 
  ParkingCircle, 
  Building, 
  Ruler, 
  CircleDollarSign,
  SunDim,
  CreditCard,
  Banknote as BanknoteIcon,
  LandPlot as Land,
  SquareKanban,
  AreaChart,
  Layout,
  Loader2,
  Warehouse,
  Zap,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { Property } from "@shared/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PropertyMapView, Property as MapProperty } from '@/components/properties/PropertyMapView';
import 'leaflet/dist/leaflet.css'; //Import Leaflet CSS
import { EnergyClass } from "@shared/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Label,
} from "@/components/ui/label";

interface PropertyCardProps {
  property: Property;
  isInComparison?: boolean;
  onToggleComparison?: (propertyId: string) => void;
  onRemoveFromComparison?: (propertyId: string) => void;
}

// Définir un type pour les champs de tri étendus
type SortField = keyof Property | 'grossYield' | 'netYield' | 'pricePerSqm' | 'priceToRentRatio';

export default function Properties() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [globalSearch, setGlobalSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [showMap, setShowMap] = useState(false);
  const [filters, setFilters] = useState<PropertyFiltersType>(defaultFilters);
  const [paginationState, setPaginationState] = useState({
    available: { currentPage: 1, itemsPerPage: 9 },
    rented: { currentPage: 1, itemsPerPage: 9 },
    maintenance: { currentPage: 1, itemsPerPage: 9 },
    sold: { currentPage: 1, itemsPerPage: 9 }
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [compareProperties, setCompareProperties] = useState<Property[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [savedFilters, setSavedFilters] = useState<{name: string, filters: PropertyFiltersType}[]>([]);
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Charger les favoris depuis localStorage au chargement du composant
    const storedFavorites = localStorage.getItem('favoriteProperties');
    if (storedFavorites) {
      try {
        const favorites = JSON.parse(storedFavorites);
        // Mettre à jour l'état favoritesOnly si des favoris existent
        if (favorites.length > 0) {
          console.log("Favoris chargés:", favorites);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des favoris:", error);
      }
    }

    // Charger les configurations de filtres sauvegardées
    const storedFilters = localStorage.getItem('savedFilters');
    if (storedFilters) {
      try {
        const filters = JSON.parse(storedFilters);
        setSavedFilters(filters);
      } catch (error) {
        console.error("Erreur lors du chargement des filtres sauvegardés:", error);
      }
    }

    // Charger les préférences de tri depuis localStorage
    const storedSortPreferences = localStorage.getItem('propertySortPreferences');
    if (storedSortPreferences) {
      try {
        const { field, direction } = JSON.parse(storedSortPreferences);
        setSortField(field);
        setSortDirection(direction);
      } catch (error) {
        console.error("Erreur lors du chargement des préférences de tri:", error);
      }
    }
  }, []);

  const toggleFavorite = (propertyId: number) => {
    const storedFavorites = localStorage.getItem('favoriteProperties');
    let favorites: number[] = storedFavorites ? JSON.parse(storedFavorites) : [];
    
    if (favorites.includes(propertyId)) {
      favorites = favorites.filter(id => id !== propertyId);
      toast({
        title: "Retiré des favoris",
        description: "La propriété a été retirée de vos favoris",
        className: "bg-gradient-to-r from-amber-500/10 to-red-500/10 border-amber-500/20",
      });
    } else {
      favorites.push(propertyId);
      toast({
        title: "Ajouté aux favoris",
        description: "La propriété a été ajoutée à vos favoris",
        className: "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20",
      });
    }
    
    localStorage.setItem('favoriteProperties', JSON.stringify(favorites));
    // Force refresh pour mettre à jour l'affichage des favoris
    setFilters({ ...filters });
  };

  const isFavorite = (propertyId: number): boolean => {
    const storedFavorites = localStorage.getItem('favoriteProperties');
    const favorites: number[] = storedFavorites ? JSON.parse(storedFavorites) : [];
    return favorites.includes(propertyId);
  };

  const handleSort = (field: SortField) => {
    let newDirection: 'asc' | 'desc' = 'asc';
    
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortField(field);
    }
    
    // Sauvegarde des préférences dans localStorage
    localStorage.setItem('propertySortPreferences', JSON.stringify({ 
      field, 
      direction: newDirection 
    }));
  };

  const { data: properties = [], isLoading, error } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error("Failed to fetch properties");
      return response.json();
    }
  });

  const filteredProperties = properties.filter((property) => {
    const searchTerms = globalSearch.toLowerCase();
    const matchesGlobalSearch =
      !globalSearch ||
      [
        property.name,
        property.address,
        property.type,
        property.energyClass,
        property.status,
        property.purchasePrice?.toString()
      ].some(field => field?.toString().toLowerCase().includes(searchTerms));

    const matchesType = filters.type === "all" || property.type === filters.type;

    let matchesPrice = true;
    const price = parseFloat(property.purchasePrice?.toString() || "0");
    if (filters.priceRange.min !== undefined) {
      matchesPrice = matchesPrice && price >= filters.priceRange.min;
    }
    if (filters.priceRange.max !== undefined) {
      matchesPrice = matchesPrice && price <= filters.priceRange.max;
    }

    const matchesBedrooms = (() => {
      if (!filters.bedrooms.min && !filters.bedrooms.max) return true;
      if (!property.bedrooms) return false;
      const matchesMin = !filters.bedrooms.min || property.bedrooms >= filters.bedrooms.min;
      const matchesMax = !filters.bedrooms.max || property.bedrooms <= filters.bedrooms.max;
      return matchesMin && matchesMax;
    })();

    let matchesLivingArea = true;
    if (filters.livingArea.min !== undefined) {
      matchesLivingArea = matchesLivingArea && (property.livingArea || 0) >= filters.livingArea.min;
    }
    if (filters.livingArea.max !== undefined) {
      matchesLivingArea = matchesLivingArea && (property.livingArea || 0) <= filters.livingArea.max;
    }

    let matchesLandArea = true;
    if (filters.landArea.min !== undefined) {
      matchesLandArea = matchesLandArea && (property.landArea || 0) >= filters.landArea.min;
    }
    if (filters.landArea.max !== undefined) {
      matchesLandArea = matchesLandArea && (property.landArea || 0) <= filters.landArea.max;
    }

    let matchesFloors = true;
    if (filters.floors.min !== undefined) {
      matchesFloors = matchesFloors && (property.floors || 0) >= filters.floors.min;
    }
    if (filters.floors.max !== undefined) {
      matchesFloors = matchesFloors && (property.floors || 0) <= filters.floors.max;
    }

    let matchesBathrooms = true;
    if (filters.bathrooms.min !== undefined) {
      matchesBathrooms = matchesBathrooms && (property.bathrooms || 0) >= filters.bathrooms.min;
    }
    if (filters.bathrooms.max !== undefined) {
      matchesBathrooms = matchesBathrooms && (property.bathrooms || 0) <= filters.bathrooms.max;
    }

    const matchesEnergyClass = filters.energyClass === "all" || property.energyClass === filters.energyClass;

    const matchesOptions =
      (!filters.hasParking || property.hasParking) &&
      (!filters.hasGarage || property.hasGarage) &&
      (!filters.hasTerrace || property.hasTerrace);
      
    // Vérifier si la propriété est dans les favoris
    const matchesFavorites = () => {
      if (!filters.favoritesOnly) return true;
      const storedFavorites = localStorage.getItem('favoriteProperties');
      const favorites: number[] = storedFavorites ? JSON.parse(storedFavorites) : [];
      return favorites.includes(property.id);
    };

    return (
      matchesGlobalSearch &&
      matchesType &&
      matchesPrice &&
      matchesBedrooms &&
      matchesLivingArea &&
      matchesLandArea &&
      matchesFloors &&
      matchesBathrooms &&
      matchesEnergyClass &&
      matchesOptions &&
      matchesFavorites()
    );
  });

  const propertyGroups = {
    available: filteredProperties.filter((p) => p.status === "available"),
    rented: filteredProperties.filter((p) => p.status === "rented"),
    maintenance: filteredProperties.filter((p) => p.status === "maintenance"),
    sold: filteredProperties.filter((p) => p.status === "sold"),
  };

  const statusTranslations = {
    available: "Disponibles",
    rented: "Louées",
    maintenance: "En maintenance",
    sold: "Vendues",
  } as const;
  
  const propertyTypeLabels = {
    apartment: "Appartement",
    house: "Maison",
    commercial: "Commercial",
    parking: "Parking",
    garage: "Garage",
    land: "Terrain",
    office: "Bureau",
    building: "Immeuble",
    storage: "Stockage"
  } as const;
  
  const energyClassColors = {
    A: "bg-emerald-500",
    B: "bg-green-500",
    C: "bg-lime-500",
    D: "bg-yellow-500",
    E: "bg-amber-500",
    F: "bg-orange-500",
    G: "bg-red-500",
  } as const;

  const handleFilterChange = (newFilters: PropertyFiltersType) => {
    setFilters(newFilters);
  };

  const handleDelete = async (propertyId: number) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "✨ Propriété supprimée !",
        description: "La propriété a été supprimée avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const togglePropertyComparison = (property: Property) => {
    setCompareProperties((current) => {
      if (current.some(p => p.id === property.id)) {
        return current.filter(p => p.id !== property.id);
      }
      
      if (current.length >= 4) {
        toast({
          title: "Maximum atteint",
          description: "Vous ne pouvez comparer que 4 propriétés à la fois",
          variant: "destructive",
        });
        return current;
      }
      
      return [...current, property];
    });
  };

  const renderPropertyCard = (property: Property, index: number) => {
    const isSelected = compareProperties.some(p => p.id === property.id);
    const isFavorited = isFavorite(property.id);
    
    return (
      <div key={property.id} className="relative">
        <PropertyCard 
          property={property} 
          index={index} 
        />
        
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "rounded-full p-2 h-8 w-8",
              isFavorited 
                ? "bg-amber-500 text-white hover:bg-amber-600" 
                : "bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white/90 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(property.id);
            }}
          >
            <Star className={cn("h-4 w-4", isFavorited && "fill-current")} />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "rounded-full p-2 h-8 w-8",
              isSelected 
                ? "bg-blue-500 text-white hover:bg-blue-600" 
                : "bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white/90 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePropertyComparison(property);
            }}
          >
            {isSelected ? <X className="h-4 w-4" /> : <SplitSquareVertical className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  };

  const renderCompareButton = () => {
    if (compareProperties.length === 0) return null;
    
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 transition-all duration-300 bg-blue-500/10 border-blue-500/30 text-blue-500"
        onClick={() => setShowCompareDialog(true)}
      >
        <SplitSquareVertical className="h-4 w-4" />
        Comparer ({compareProperties.length})
      </Button>
    );
  }

  const saveCurrentFilter = () => {
    if (!newFilterName.trim()) return;
    
    const newSavedFilters = [
      ...savedFilters, 
      { name: newFilterName, filters: { ...filters } }
    ];
    
    setSavedFilters(newSavedFilters);
    localStorage.setItem('savedFilters', JSON.stringify(newSavedFilters));
    
    setSaveFilterDialogOpen(false);
    setNewFilterName("");
    
    toast({
      title: "Configuration sauvegardée",
      description: `La configuration "${newFilterName}" a été sauvegardée avec succès`,
      className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
    });
  };

  const applySavedFilter = (savedFilter: {name: string, filters: PropertyFiltersType}) => {
    setFilters(savedFilter.filters);
    
    toast({
      title: "Configuration appliquée",
      description: `La configuration "${savedFilter.name}" a été appliquée`,
      className: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20",
    });
  };

  const deleteSavedFilter = (index: number) => {
    const updatedFilters = [...savedFilters];
    const deletedName = updatedFilters[index].name;
    updatedFilters.splice(index, 1);
    
    setSavedFilters(updatedFilters);
    localStorage.setItem('savedFilters', JSON.stringify(updatedFilters));
    
    toast({
      title: "Configuration supprimée",
      description: `La configuration "${deletedName}" a été supprimée`,
      className: "bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20",
    });
  };

  // Calcul des métriques financières pour permettre le tri par rentabilité
  const calculateReturnMetrics = (property: Property) => {
    // Calcul du rendement brut annuel (si loué)
    const grossYield = property.monthlyRent && property.purchasePrice 
      ? (property.monthlyRent * 12 / property.purchasePrice) * 100 
      : 0;
      
    // Estimation du ROI simplifié (rentabilité nette approximative)
    const monthlyExpenses = property.monthlyExpenses || 0;
    const netYield = property.monthlyRent && property.purchasePrice
      ? ((property.monthlyRent - monthlyExpenses) * 12 / property.purchasePrice) * 100
      : 0;
      
    // Calcul du ratio prix/loyer
    const priceToRentRatio = property.monthlyRent && property.purchasePrice
      ? property.purchasePrice / (property.monthlyRent * 12)
      : 0;
      
    // Prix au m²
    const pricePerSqm = property.purchasePrice && (property.livingArea || property.area)
      ? property.purchasePrice / (property.livingArea || property.area || 1)
      : 0;
      
    return {
      grossYield,
      netYield,
      priceToRentRatio,
      pricePerSqm
    };
  };

  // Fonction pour rendre la vue liste avec le même design que la vue grille
  const renderPropertyList = (properties: Property[]) => {
    return properties.map((property, index) => {
      const isSelected = compareProperties.some(p => p.id === property.id);
      const isFavorited = isFavorite(property.id);
      const hasValidImage = property.images && property.images.length > 0;
      
      // Fonction pour obtenir l'URL de l'image
      const getImageUrl = () => {
        if (!hasValidImage) {
          // Obtenir l'image par défaut basée sur le type de propriété, comme dans PropertyCard
          const serverUrl = import.meta.env.VITE_SERVER_URL || '';
          const defaultImageName = `${property.type}-default.jpg`;
          return `${serverUrl}/uploads/properties/${defaultImageName}`;
        }
        
        const serverUrl = import.meta.env.VITE_SERVER_URL || '';
        const firstImage = property.images![0];
        
        if (typeof firstImage === 'string') {
          return `${serverUrl}/uploads/properties/${firstImage}`;
        }
        
        if (firstImage && typeof firstImage === 'object') {
          if ('imageUrl' in firstImage && firstImage.imageUrl) {
            return `${serverUrl}/uploads/properties/${firstImage.imageUrl}`;
          }
          if ('filename' in firstImage && firstImage.filename) {
            return `${serverUrl}/uploads/properties/${firstImage.filename}`;
          }
        }
        
        // Fallback sur l'image par défaut du type
        const defaultImageName = `${property.type}-default.jpg`;
        return `${serverUrl}/uploads/properties/${defaultImageName}`;
    };

    return (
        <motion.div 
          key={property.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="relative group border rounded-lg hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <div className="flex flex-col md:flex-row">
            {/* Section image et badges */}
            <div className="relative md:w-72 h-60 md:h-full flex-shrink-0 overflow-hidden">
              <img 
                src={getImageUrl()}
                alt={property.name || "Propriété"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  console.error(`Failed to load image for property ${property.id}, falling back to default`);
                  const target = e.target as HTMLImageElement;
                  // Utilise le même pattern que dans PropertyCard
                  const serverUrl = import.meta.env.VITE_SERVER_URL || '';
                  const defaultImageName = `${property.type}-default.jpg`;
                  target.src = `${serverUrl}/uploads/properties/${defaultImageName}`;
                }}
              />
              
              {/* Badge de statut */}
              <Badge 
                className={cn(
                  "absolute top-2 left-2",
                  property.status === "available" && "bg-emerald-500 hover:bg-emerald-600",
                  property.status === "rented" && "bg-blue-500 hover:bg-blue-600",
                  property.status === "maintenance" && "bg-amber-500 hover:bg-amber-600",
                  property.status === "sold" && "bg-red-500 hover:bg-red-600"
                )}
              >
                {statusTranslations[property.status]}
              </Badge>
              
              {/* Badges d'énergie */}
              <div className="absolute bottom-2 left-2 flex gap-1.5">
                {property.energyClass && (
                  <Badge className={cn(
                    "font-medium",
                    energyClassColors[property.energyClass as EnergyClass]
                  )}>
                    DPE {property.energyClass}
                  </Badge>
                )}
                {property.energyClass && (
                  <Badge className={cn(
                    "font-medium",
                    energyClassColors[property.energyClass as EnergyClass]
                  )}>
                    GES {property.energyClass}
                  </Badge>
                )}
              </div>

              {/* Boutons d'action flottants */}
              <div className="absolute top-2 right-2 z-10">
                <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                    variant="ghost"
                            className={cn(
                      "rounded-full p-2 h-8 w-8",
                      isFavorited 
                        ? "bg-amber-500 text-white hover:bg-amber-600" 
                        : "bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white/90 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(property.id);
                    }}
                  >
                    <Star className={cn("h-4 w-4", isFavorited && "fill-current")} />
                          </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                              className={cn(
                      "rounded-full p-2 h-8 w-8",
                      isSelected 
                        ? "bg-blue-500 text-white hover:bg-blue-600" 
                        : "bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white/90 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePropertyComparison(property);
                    }}
                  >
                    {isSelected ? <X className="h-4 w-4" /> : <SplitSquareVertical className="h-4 w-4" />}
                  </Button>
                    </div>
                  </div>
            </div>
            
            {/* Section contenu */}
            <div className="flex-1 p-4 flex flex-col">
              {/* En-tête avec nom et type */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-medium">{property.name || "Sans nom"}</h3>
                  <p className="text-sm text-muted-foreground">{property.address || "Adresse non spécifiée"}</p>
                </div>
                <Badge variant="outline" className="ml-2">
                      {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels] || property.type}
                    </Badge>
                </div>

              {/* Description avec limite de lignes */}
              {property.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {property.description}
                </p>
              )}
              
              {/* Grille d'informations en deux colonnes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-1">
                {/* Colonne 1 - Caractéristiques */}
                {((property.livingArea && Number(property.livingArea) > 0) || 
                  (property.area && Number(property.area) > 0) || 
                  (property.landArea && Number(property.landArea) > 0) || 
                  (property.rooms !== undefined && property.rooms !== null && Number(property.rooms) > 0) || 
                  (property.bedrooms !== undefined && property.bedrooms !== null && Number(property.bedrooms) > 0) || 
                  (property.bathrooms !== undefined && property.bathrooms !== null && Number(property.bathrooms) > 0) || 
                  (property.toilets !== undefined && property.toilets !== null && Number(property.toilets) > 0) || 
                  (property.floors !== undefined && property.floors !== null && Number(property.floors) > 0) || 
                  (property.units !== undefined && property.units !== null && Number(property.units) > 0) || 
                  (property.constructionYear && Number(property.constructionYear) > 0) || 
                  (property.purchaseDate && (() => {
                    try {
                      return format(new Date(property.purchaseDate), 'dd/MM/yyyy', { locale: fr });
                    } catch (error) {
                      return null;
                    }
                  })())
                ) && (
                <div>
                  <h4 className="text-xs uppercase font-medium text-muted-foreground mb-2">Caractéristiques</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    {(property.livingArea || property.area) && 
                      (Number(property.livingArea) > 0 || Number(property.area) > 0) && (
                      <div className="flex items-center gap-1.5">
                        <Square className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        <span className="text-sm">{property.livingArea || property.area} m²</span>
                        </div>
                      )}
                    
                    {property.landArea && Number(property.landArea) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Warehouse className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <span className="text-sm">{property.landArea} m² terrain</span>
                        </div>
                      )}
                    
                    {property.rooms !== undefined && property.rooms !== null && Number(property.rooms) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Layout className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        <span className="text-sm">{property.rooms} pièces</span>
                        </div>
                      )}
                    
                    {property.bedrooms !== undefined && property.bedrooms !== null && Number(property.bedrooms) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <BedDouble className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                        <span className="text-sm">{property.bedrooms} chambres</span>
                        </div>
                      )}
                    
                    {property.bathrooms !== undefined && property.bathrooms !== null && Number(property.bathrooms) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Bath className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                        <span className="text-sm">{property.bathrooms} SDB</span>
                        </div>
                      )}
                    
                    {property.toilets !== undefined && property.toilets !== null && Number(property.toilets) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm">{property.toilets} WC</span>
                        </div>
                      )}
                    
                    {property.floors !== undefined && property.floors !== null && Number(property.floors) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                        <span className="text-sm">{property.floors} étages</span>
                        </div>
                      )}
                    
                    {property.units !== undefined && property.units !== null && Number(property.units) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                        <span className="text-sm">{property.units} unités</span>
                        </div>
                      )}
                    
                    {/* Construction year - Only show if valid year exists */}
                      {property.constructionYear && Number(property.constructionYear) > 0 && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">
                          Construit en {property.constructionYear}
                        </span>
                      </div>
                    )}
                    
                    {/* Purchase date - Only show if valid date exists and can be formatted */}
                      {property.purchaseDate && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                        <span className="text-sm">
                          {(() => {
                            try {
                              const formattedDate = format(new Date(property.purchaseDate), 'dd/MM/yyyy', { locale: fr });
                              return formattedDate ? `Acquis le ${formattedDate}` : null;
                            } catch (error) {
                              // Ne pas afficher si la date n'est pas valide
                              return null;
                            }
                          })()}
                          </span>
                        </div>
                      )}
                        </div>
                    </div>
                )}

                {/* Colonne 2 - Finances */}
                {((property.purchasePrice !== undefined && property.purchasePrice !== null && Number(property.purchasePrice) > 0) ||
                  (property.monthlyRent !== undefined && property.monthlyRent !== null && Number(property.monthlyRent) > 0) ||
                  (property.loanAmount !== undefined && property.loanAmount !== null && Number(property.loanAmount) > 0) ||
                  (property.monthlyLoanPayment !== undefined && property.monthlyLoanPayment !== null && Number(property.monthlyLoanPayment) > 0) ||
                  (property.loanDuration !== undefined && property.loanDuration !== null && Number(property.loanDuration) > 0) ||
                  (property.monthlyExpenses !== undefined && property.monthlyExpenses !== null && Number(property.monthlyExpenses) > 0)
                ) && (
                <div>
                  <h4 className="text-xs uppercase font-medium text-muted-foreground mb-2">Finances</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    {property.purchasePrice !== undefined && property.purchasePrice !== null && Number(property.purchasePrice) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Euro className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                        <span className="text-sm font-medium">{property.purchasePrice.toLocaleString()} € achat</span>
                      </div>
                    )}
                    
                    {property.monthlyRent !== undefined && property.monthlyRent !== null && Number(property.monthlyRent) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CircleDollarSign className="h-4 w-4 text-green-500 dark:text-green-400" />
                        <span className="text-sm">{property.monthlyRent.toLocaleString()} € /mois</span>
                      </div>
                    )}
                    
                    {property.loanAmount !== undefined && property.loanAmount !== null && Number(property.loanAmount) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <BanknoteIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        <span className="text-sm">{property.loanAmount.toLocaleString()} € crédit</span>
                      </div>
                    )}
                    
                    {property.monthlyLoanPayment !== undefined && property.monthlyLoanPayment !== null && Number(property.monthlyLoanPayment) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                        <span className="text-sm">{property.monthlyLoanPayment.toLocaleString()} € /mois</span>
                      </div>
                    )}
                    
                    {property.loanDuration !== undefined && property.loanDuration !== null && Number(property.loanDuration) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <span className="text-sm">{property.loanDuration} {property.loanDuration > 1 ? 'ans' : 'an'}</span>
                      </div>
                    )}
                    
                    {property.monthlyExpenses !== undefined && property.monthlyExpenses !== null && Number(property.monthlyExpenses) > 0 && (
                      <div className="flex items-center gap-1.5">
                        <BanknoteIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-sm">{property.monthlyExpenses.toLocaleString()} € charges</span>
                      </div>
                    )}
                    </div>
                  </div>
                )}
                </div>

              {/* Badges des équipements - Réorganisés pour que Dépendance soit à côté de Terrasse */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {property.hasParking && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/60">
                    Parking
                  </Badge>
                )}
                {property.hasGarage && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-800/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/60">
                    Garage
                  </Badge>
                )}
                {property.hasTerrace && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-800/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/60">
                    Terrasse
                  </Badge>
                )}
                {property.hasBalcony && (
                  <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-800/30 dark:text-teal-300 border-teal-200 dark:border-teal-800/60">
                    Balcon
                  </Badge>
                )}
                {property.hasElevator && (
                  <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-800/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60">
                    Ascenseur
                  </Badge>
                )}
                {property.hasCellar && (
                  <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-800/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/60">
                    Cave
                  </Badge>
                )}
                {(property as any).hasDependency === true && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300 border-green-200 dark:border-green-800/60">
                    Dépendance
                  </Badge>
                )}
                  </div>
              
              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t mt-4">
                    <EditPropertyDialog
                      property={property}
                      buttonProps={{
                    variant: "outline", 
                    size: "sm",
                    className: "text-sm" 
                  }} 
                />
                
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                        Cette action est irréversible et supprimera définitivement la propriété
                        "{property.name}" de la base de données.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(property.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
        </motion.div>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="h-20 w-full bg-muted rounded animate-pulse" />
        <div className="h-12 w-full bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Fonction modifiée pour gérer les nouveaux critères de tri
  const getPaginatedProperties = (status: keyof typeof propertyGroups) => {
    const { currentPage, itemsPerPage } = paginationState[status];
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    // Appliquer le tri avant la pagination
    const sortedProperties = [...propertyGroups[status]].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      // Calculer les métriques pour a et b (ne sera utilisé que si nécessaire)
      const metricsA = calculateReturnMetrics(a);
      const metricsB = calculateReturnMetrics(b);
      
      // Gérer les cas spéciaux selon le champ de tri
      switch (sortField) {
        case 'purchaseDate':
          const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
          const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          
        case 'purchasePrice':
        case 'monthlyRent':
          // Comparer les nombres en toute sécurité
          const aValue1 = a[sortField] || 0;
          const bValue1 = b[sortField] || 0;
          return (Number(aValue1) - Number(bValue1)) * direction;
        
        // Nouveaux critères de tri
        case 'grossYield':
          return (metricsA.grossYield - metricsB.grossYield) * direction;
          
        case 'netYield':
          return (metricsA.netYield - metricsB.netYield) * direction;
          
        case 'pricePerSqm':
          return (metricsA.pricePerSqm - metricsB.pricePerSqm) * direction;
          
        case 'priceToRentRatio':
          // Pour le ratio prix/loyer, un rapport plus bas est généralement meilleur
          // donc on inverse le sens de tri par défaut
          return (metricsA.priceToRentRatio - metricsB.priceToRentRatio) * direction;
          
        default:
          // Traitement général pour les autres champs
          const aValue2 = a[sortField];
          const bValue2 = b[sortField];
          if (aValue2 === undefined || aValue2 === null) return direction;
          if (bValue2 === undefined || bValue2 === null) return -direction;
          if (typeof aValue2 === 'string' && typeof bValue2 === 'string') {
            return aValue2.localeCompare(bValue2) * direction;
          }
          return 0;
      }
    });
    
    return sortedProperties.slice(start, end);
  };

  // Fonction pour changer la page pour un statut donné
  const handlePageChange = (status: keyof typeof propertyGroups, page: number) => {
    setPaginationState(prev => ({
      ...prev,
      [status]: {
        ...prev[status],
        currentPage: page
      }
    }));
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fonction pour changer le nombre d'items par page pour un statut donné
  const handleItemsPerPageChange = (status: keyof typeof propertyGroups, value: number) => {
    setPaginationState(prev => ({
      ...prev,
      [status]: {
        currentPage: 1, // Retour à la première page
        itemsPerPage: value
      }
    }));
  };

  // Ajout d'un menu dropdown pour les options de tri supplémentaires dans la barre d'outils
  const renderSortMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5"
        >
          <ArrowUpDown className="h-4 w-4" />
          Trier
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={() => handleSort('name')}>
          <span className={sortField === 'name' ? 'font-medium' : ''}>
            Nom {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('purchasePrice')}>
          <span className={sortField === 'purchasePrice' ? 'font-medium' : ''}>
            Prix {sortField === 'purchasePrice' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('monthlyRent')}>
          <span className={sortField === 'monthlyRent' ? 'font-medium' : ''}>
            Loyer mensuel {sortField === 'monthlyRent' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('livingArea')}>
          <span className={sortField === 'livingArea' ? 'font-medium' : ''}>
            Surface {sortField === 'livingArea' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('grossYield')}>
          <span className={sortField === 'grossYield' ? 'font-medium' : ''}>
            Rendement brut {sortField === 'grossYield' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('netYield')}>
          <span className={sortField === 'netYield' ? 'font-medium' : ''}>
            Rendement net {sortField === 'netYield' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('pricePerSqm')}>
          <span className={sortField === 'pricePerSqm' ? 'font-medium' : ''}>
            Prix au m² {sortField === 'pricePerSqm' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('priceToRentRatio')}>
          <span className={sortField === 'priceToRentRatio' ? 'font-medium' : ''}>
            Ratio prix/loyer {sortField === 'priceToRentRatio' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSort('purchaseDate')}>
          <span className={sortField === 'purchaseDate' ? 'font-medium' : ''}>
            Date d'acquisition {sortField === 'purchaseDate' && (sortDirection === 'asc' ? '↑' : '↓')}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Ajouter des fonctions utilitaires pour les couleurs des badges
  const getEnergyClassColor = (energyClass: EnergyClass) => {
    return energyClassColors[energyClass] || "bg-muted";
  };

  const getEmissionClassColor = (emissionClass: EnergyClass) => {
    return energyClassColors[emissionClass] || "bg-muted";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête de la page */}
      <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Titre et bouton d'ajout */}
        <div className="flex justify-between items-center p-6">
          <div>
            <motion.div
              className="flex items-center gap-3 mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Building2 className="h-10 w-10 text-green-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-gradient">
                Gestion des Propriétés
              </h1>
            </motion.div>
            <motion.p
              className="text-muted-foreground text-lg ml-[52px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Gérez votre parc immobilier et analysez vos investissements
            </motion.p>
          </div>
          <AddPropertyDialog />
        </div>
      </div>

      {/* Statistiques du portefeuille avec fond */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PropertyStats properties={properties} />
      </motion.div>
      
      <PropertyInsightsRow properties={properties} />

      {/* Barre de recherche et navigation */}
      <div className="mb-6 rounded-xl border border-primary/20 overflow-hidden">
        {/* Recherche et filtres rapides */}
        <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-blue-50/50 dark:from-emerald-950/30 dark:to-blue-950/20">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une propriété..."
                className="pl-9"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filters.favoritesOnly ? "default" : "outline"}
                size="sm"
                className={cn(
                  "gap-1.5 transition-all duration-300",
                  filters.favoritesOnly 
                    ? "bg-amber-500 hover:bg-amber-600 text-white" 
                    : "text-amber-500 border-amber-200 hover:border-amber-300"
                )}
                onClick={() => {
                  setFilters({
                    ...filters,
                    favoritesOnly: !filters.favoritesOnly
                  });
                }}
              >
                <Star className={cn("h-4 w-4", filters.favoritesOnly && "fill-current")} />
                Favoris
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 px-2 lg:px-3",
                    viewMode === "grid" && "bg-primary text-primary-foreground"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="ml-2 hidden lg:inline">Grille</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 px-2 lg:px-3",
                    viewMode === "list" && "bg-primary text-primary-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                  <span className="ml-2 hidden lg:inline">Liste</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className={cn(
                    "h-8 px-2 lg:px-3",
                    viewMode === "map" && "bg-primary text-primary-foreground"
                  )}
                >
                  <Map className="h-4 w-4" />
                  <span className="ml-2 hidden lg:inline">Carte</span>
                </Button>
              </div>
              
              {renderCompareButton()}
              
              {Object.values(filters).some(v => {
                if (typeof v === 'boolean') return v;
                if (typeof v === 'string' && v !== 'all' && v !== '') return true;
                if (typeof v === 'object' && v !== null) {
                  return Object.values(v).some(val => val !== undefined);
                }
                return false;
              }) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 transition-all duration-300 border-rose-500/50 text-rose-500 hover:bg-rose-500/10"
                onClick={() => {
                  setFilters(defaultFilters);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewMode === "map" ? (
        <PropertyMapView 
          properties={filteredProperties as MapProperty[]} 
          selectedPropertyId={undefined}
        />
      ) : (
        <Tabs defaultValue="available" className="w-full">
          <TabsList
            className="mb-4 border rounded-md shadow-sm bg-transparent"
          >
            {Object.entries(propertyGroups).map(([status, props]) => (
              <TabsTrigger 
                key={status} 
                value={status} 
                className="h-9 data-[state=active]:shadow-none data-[state=active]:ring-2 data-[state=active]:ring-green-500"
              >
                {statusTranslations[status as keyof typeof statusTranslations]}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "ml-2 h-5 px-1",
                    status === "available" && "data-[state=active]:border-green-200 data-[state=active]:bg-green-50/30"
                  )}
                  data-state={status === "available" ? "active" : "inactive"}
                >
                  {props.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(propertyGroups).map(([status, allProps]) => {
            const statusKey = status as keyof typeof propertyGroups;
            const { currentPage, itemsPerPage } = paginationState[statusKey];
            const paginatedProps = getPaginatedProperties(statusKey);
            const totalPages = Math.ceil(allProps.length / itemsPerPage);
            
            return (
              <TabsContent key={`tab-${status}`} value={status} className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    viewMode === "grid" ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"
                  )}
                >
                  {viewMode === "grid" ? (
                    paginatedProps.map((property, index) => 
                      renderPropertyCard(property, index)
                    )
                  ) : (
                    renderPropertyList(paginatedProps)
                  )}
                
                  {allProps.length === 0 && (
                    <motion.div
                      key={`empty-${status}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full p-8 text-center"
                    >
                      <p className="text-muted-foreground">
                        Aucune propriété {statusTranslations[status as keyof typeof statusTranslations].toLowerCase()}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
                
                {allProps.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(statusKey, Math.max(1, currentPage - 1))}
                            className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(statusKey, page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(statusKey, Math.min(totalPages, currentPage + 1))}
                            className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {showCompareDialog && compareProperties.length > 0 && (
        <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Comparaison de propriétés</DialogTitle>
              <DialogDescription>
                Comparez les caractéristiques de vos propriétés côte à côte
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
              {compareProperties.map((property) => (
                <div key={property.id} className="relative border rounded-lg overflow-hidden shadow-sm">
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 bg-white/80 backdrop-blur-sm hover:bg-white/90 rounded-full"
                      onClick={() => togglePropertyComparison(property)}
                    >
                      <X className="h-4 w-4 text-gray-700" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium">{property.name}</h3>
                    <p className="text-sm text-muted-foreground">{property.address}</p>
                    <div className="mt-2 space-y-1">
                      <div className="text-sm">Type: {property.type}</div>
                      {property.purchasePrice && (
                        <div className="text-sm">Prix: {property.purchasePrice.toLocaleString()} €</div>
                      )}
                      {property.livingArea && (
                        <div className="text-sm">Surface: {property.livingArea} m²</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 space-y-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Caractéristique</TableHead>
                      {compareProperties.map((property) => (
                        <TableHead key={`th-${property.id}`}>{property.name || property.id}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Type</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`type-${property.id}`}>{property.type}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Surface habitable</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`living-${property.id}`}>
                          {property.livingArea ? `${property.livingArea} m²` : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Surface terrain</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`land-${property.id}`}>
                          {property.landArea ? `${property.landArea} m²` : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Pièces</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`rooms-${property.id}`}>
                          {property.rooms || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Chambres</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`bedrooms-${property.id}`}>
                          {property.bedrooms || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Salles de bain</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`bathrooms-${property.id}`}>
                          {property.bathrooms || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Prix d'achat</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`purchase-${property.id}`}>
                          {property.purchasePrice 
                            ? `${property.purchasePrice.toLocaleString()} €` 
                            : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Prix de vente</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`sale-${property.id}`}>
                          {property.purchasePrice 
                            ? `${property.purchasePrice.toLocaleString()} €` 
                            : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Valeur estimée</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`value-${property.id}`}>
                          {property.purchasePrice 
                            ? `${property.purchasePrice.toLocaleString()} €` 
                            : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Classe énergie</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`energy-${property.id}`}>
                          {property.energyClass ? (
                            <Badge 
                              className={cn(
                                "font-bold",
                                getEnergyClassColor(property.energyClass as EnergyClass)
                              )}
                            >
                              {property.energyClass}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Émissions GES</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`ges-${property.id}`}>
                          {property.energyClass ? (
                            <Badge 
                              className={cn(
                                "font-bold",
                                getEnergyClassColor(property.energyClass as EnergyClass)
                              )}
                            >
                              {property.energyClass}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Adresse</TableCell>
                      {compareProperties.map((property) => (
                        <TableCell key={`address-${property.id}`}>
                          {property.address || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={saveFilterDialogOpen} onOpenChange={setSaveFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sauvegarder la configuration</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre configuration de filtres pour la retrouver facilement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom de la configuration</Label>
              <Input
                id="name"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                placeholder="Ex: Mes propriétés disponibles à Paris"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={saveCurrentFilter} disabled={!newFilterName}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}