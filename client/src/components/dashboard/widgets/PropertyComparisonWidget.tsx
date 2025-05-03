import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpDown, Search, SortAsc, SortDesc, Filter, Building2, 
  TrendingUp, Circle, ArrowUp, ArrowDown, RefreshCw
} from "lucide-react";
import { Widget } from "@/lib/stores/useWidgetStore";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/api/properties";
import { usePropertyAnalytics, PropertyAnalytics } from "@/api/analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PropertyComparisonWidgetProps {
  widget: Widget;
}

// Propriété enrichie avec des données analytiques pour la comparaison
interface EnrichedProperty {
  id: number;
  name: string;
  type: string;
  area: number;
  rooms: number;
  purchasePrice: number;
  purchaseDate: string;
  currentValue: number;
  appreciation: number;
  annualYield: number;
  location: string;
  status: string;
}

// Type de tri
type SortField = 'name' | 'purchasePrice' | 'currentValue' | 'appreciation' | 'annualYield';
type SortDirection = 'asc' | 'desc';

export function PropertyComparisonWidget({ widget }: PropertyComparisonWidgetProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<SortField>('appreciation');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const propertiesPerPage = 4;
  
  // Récupérer les propriétés avec leurs analyses
  const { data: properties = [], isLoading: isPropertiesLoading } = useProperties();
  const { data: propertyAnalytics = [], isLoading: isAnalyticsLoading, error } = usePropertyAnalytics();
  
  // État du chargement global
  const isLoading = isPropertiesLoading || isAnalyticsLoading;
  
  // Convertir les données d'analyses en propriétés enrichies pour la comparaison
  const enrichedProperties = React.useMemo(() => {
    if (!properties.length || !propertyAnalytics.length) return [];
    
    return properties.map(property => {
      // Trouver les données d'analyse correspondantes
      const analytics = propertyAnalytics.find(a => a.propertyId === property.id);
      
      return {
        id: property.id,
        name: property.name,
        type: property.type || 'N/A',
        area: property.area || 0,
        rooms: property.rooms || 0,
        purchasePrice: Number(property.purchasePrice) || 0,
        purchaseDate: property.purchaseDate || new Date().toISOString(),
        currentValue: analytics?.marketValue || Number(property.purchasePrice) || 0,
        appreciation: analytics?.appreciation || 0,
        annualYield: analytics?.roi || 0,
        location: property.city || 'N/A',
        status: property.status || 'available'
      };
    });
  }, [properties, propertyAnalytics]);
  
  // Types de propriétés uniques pour le filtre
  const propertyTypes = React.useMemo(() => {
    if (!enrichedProperties.length) return [];
    const types = [...new Set(enrichedProperties.map(p => p.type))];
    return types.filter(type => type !== 'N/A');
  }, [enrichedProperties]);
  
  // Propriétés filtrées et triées
  const filteredProperties = React.useMemo(() => {
    if (!enrichedProperties.length) return [];
    
    // Filtrer par recherche et type sélectionné
    let filtered = enrichedProperties.filter(property => {
      const matchesSearch = !searchQuery || 
        property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !selectedType || property.type === selectedType;
      
      return matchesSearch && matchesType;
    });
    
    // Trier selon le champ et la direction
    return filtered.sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      // Pour les chaînes de caractères
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      // Pour les valeurs numériques
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }, [enrichedProperties, searchQuery, selectedType, sortField, sortDirection]);
  
  // Calcul des propriétés pour la page actuelle
  const paginatedFilteredProperties = React.useMemo(() => {
    const start = (page - 1) * propertiesPerPage;
    const end = start + propertiesPerPage;
    return filteredProperties.slice(start, end);
  }, [filteredProperties, page, propertiesPerPage]);
  
  // Calcul du nombre total de pages
  const totalPages = React.useMemo(() => {
    return Math.ceil(filteredProperties.length / propertiesPerPage);
  }, [filteredProperties.length, propertiesPerPage]);
  
  // Fonction pour changer de page
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Gérer le tri
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Inverser la direction si le même champ est cliqué
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouveau champ, définir la direction par défaut
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Simuler un rafraîchissement des données
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Temporisation simulée
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };
  
  // Formatter les valeurs monétaires
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Formatter les pourcentages
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };
  
  // Afficher l'indicateur de tendance
  const getTrend = (value: number) => {
    const trendColor = value >= 0 ? 'text-emerald-500' : 'text-rose-500';
    const Icon = value >= 0 ? ArrowUp : ArrowDown;
    
      return (
      <div className={`flex items-center justify-end ${trendColor}`}>
        <Icon className="h-3 w-3 mr-1" />
        <span>{formatPercent(Math.abs(value))}</span>
        </div>
      );
  };
  
  // Rendu de la pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
      return (
      <div className="widget-pagination mt-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
          <div 
            key={pageNum}
            className={cn("widget-pagination-item", pageNum === page && "active")}
            onClick={() => handlePageChange(pageNum)}
          >
            {pageNum}
          </div>
        ))}
        </div>
      );
  };

  return (
    <Card className={`overflow-hidden backdrop-blur-sm bg-background/30 border-white/10 h-full`}>
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="font-medium text-base">
            {widget.title}
          </CardTitle>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une propriété..."
              className="pl-8 h-9 bg-background/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-background/20"
              >
                <Filter className="h-4 w-4 mr-2" />
                {selectedType || "Tous les types"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedType(null)}>
                Tous les types
              </DropdownMenuItem>
              {propertyTypes.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 overflow-x-auto">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-64"
            >
              <motion.div
                className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          ) : error ? (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erreur lors du chargement des données
              </AlertDescription>
            </Alert>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {paginatedFilteredProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Building2 className="h-12 w-12 mb-2 opacity-20" />
                  <p>Aucune propriété ne correspond à votre recherche</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div 
                          className="flex items-center cursor-pointer"
                          onClick={() => handleSort("name")}
                        >
                          Propriété
                          {sortField === "name" && (
                            sortDirection === "asc" ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead className="text-right">
                        <div 
                          className="flex items-center justify-end cursor-pointer"
                          onClick={() => handleSort("purchasePrice")}
                        >
                          Prix d'achat
                          {sortField === "purchasePrice" && (
                            sortDirection === "asc" ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div 
                          className="flex items-center justify-end cursor-pointer"
                          onClick={() => handleSort("currentValue")}
                        >
                          Valeur actuelle
                          {sortField === "currentValue" && (
                            sortDirection === "asc" ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div 
                          className="flex items-center justify-end cursor-pointer"
                          onClick={() => handleSort("appreciation")}
                        >
                          Valorisation
                          {sortField === "appreciation" && (
                            sortDirection === "asc" ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div 
                          className="flex items-center justify-end cursor-pointer"
                          onClick={() => handleSort("annualYield")}
                        >
                          Rendement
                          {sortField === "annualYield" && (
                            sortDirection === "asc" ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {paginatedFilteredProperties.map((property) => (
                      <TableRow 
                        key={property.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-8 w-8 mr-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/50 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                          <div>
                              <div className="font-medium">{property.name}</div>
                              <div className="text-xs text-muted-foreground">{property.location}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="capitalize">
                            {property.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(property.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(property.currentValue)}</TableCell>
                        <TableCell className="text-right">{getTrend(property.appreciation)}</TableCell>
                        <TableCell className="text-right">
                          {property.annualYield !== null ? (
                            <div className="flex items-center justify-end">
                              <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                              <span>{formatPercent(property.annualYield)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {renderPagination()}
      </CardContent>
    </Card>
  );
}