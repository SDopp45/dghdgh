import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bath, Home, Euro, Maximize2, Gauge, ParkingSquare, Bed, Building2, Car, SunDim, RotateCcw, LayoutTemplate, ArrowUpDown, Warehouse } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

export interface PropertyFilters {
  search: string;
  type: string;
  priceRange: {
    min?: number;
    max?: number;
  };
  bedrooms: {
    min?: number;
    max?: number;
  };
  livingArea: {
    min?: number;
    max?: number;
  };
  landArea: {
    min?: number;
    max?: number;
  };
  floors: {
    min?: number;
    max?: number;
  };
  bathrooms: {
    min?: number;
    max?: number;
  };
  energyClass: string;
  hasParking: boolean;
  hasTerrace: boolean;
  hasGarage: boolean;
  hasBalcony: boolean;
  hasElevator: boolean;
  hasCellar: boolean;
  favoritesOnly: boolean;
}

export interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilters) => void;
  initialFilters?: PropertyFilters;
}

export const defaultFilters: PropertyFilters = {
  search: "",
  type: "all",
  priceRange: { min: undefined, max: undefined },
  bedrooms: { min: undefined, max: undefined },
  livingArea: { min: undefined, max: undefined },
  landArea: { min: undefined, max: undefined },
  floors: { min: undefined, max: undefined },
  bathrooms: { min: undefined, max: undefined },
  energyClass: "all",
  hasParking: false,
  hasTerrace: false,
  hasGarage: false,
  hasBalcony: false,
  hasElevator: false,
  hasCellar: false,
  favoritesOnly: false,
};

export function PropertyFilters({ onFilterChange, initialFilters = defaultFilters }: PropertyFiltersProps) {
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters);

  const handleFilterChange = (updates: Partial<PropertyFilters>) => {
    const newFilters = {
      ...filters,
      ...updates
    };
    setFilters(newFilters);
  };

  const formatRangeValue = (min?: number, max?: number) => {
    if (!min && !max) return '-';
    return `${min || ''}-${max || ''}`;
  };

  const handleRangeChange = (value: string, field: 'price' | 'livingArea' | 'landArea' | 'bedrooms' | 'floors' | 'bathrooms') => {
    if (value === '' || value === '-') {
      const updates = {
        ...(field === 'price' && { priceRange: { min: undefined, max: undefined } }),
        ...(field === 'livingArea' && { livingArea: { min: undefined, max: undefined } }),
        ...(field === 'landArea' && { landArea: { min: undefined, max: undefined } }),
        ...(field === 'bedrooms' && { bedrooms: { min: undefined, max: undefined } }),
        ...(field === 'floors' && { floors: { min: undefined, max: undefined } }),
        ...(field === 'bathrooms' && { bathrooms: { min: undefined, max: undefined } })
      };
      handleFilterChange(updates);
      return;
    }

    const [min, max] = value.split("-").map(v => {
      const num = Number(v.trim());
      return isNaN(num) ? undefined : num;
    });

    const updates = {
      ...(field === 'price' && { priceRange: { min, max } }),
      ...(field === 'livingArea' && { livingArea: { min, max } }),
      ...(field === 'landArea' && { landArea: { min, max } }),
      ...(field === 'bedrooms' && { bedrooms: { min, max } }),
      ...(field === 'floors' && { floors: { min, max } }),
      ...(field === 'bathrooms' && { bathrooms: { min, max } })
    };

    handleFilterChange(updates);
  };


  const resetFilters = () => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const applyFilters = () => {
    onFilterChange(filters);
  };

  return (
    <div className="h-full bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-sm rounded-lg border border-border/50">
      <CardHeader className="space-y-1.5 pb-4 px-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary/90 to-primary/70 bg-clip-text text-transparent">
              Filtres avancés
            </CardTitle>
            <CardDescription>Affinez votre recherche de biens</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs hover:bg-primary/10 transition-colors"
            onClick={resetFilters}
          >
            <RotateCcw className="mr-1 h-3 w-3 text-primary" />
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <ScrollArea className="h-[400px] pr-4">
          <motion.div
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-500">
                  <Home className="h-4 w-4" />
                  <label className="text-sm font-medium">Type de bien</label>
                </div>
                <Select
                  value={filters.type}
                  onValueChange={(value) => handleFilterChange({ type: value })}
                >
                  <SelectTrigger className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="apartment">Appartement</SelectItem>
                    <SelectItem value="house">Maison</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="storage">Stockage</SelectItem>
                    <SelectItem value="land">Terrain</SelectItem>
                    <SelectItem value="office">Bureau</SelectItem>
                    <SelectItem value="building">Immeuble</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            <Separator className="bg-primary/10" />

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Euro className="h-4 w-4" />
                  <label className="text-sm font-medium">Fourchette de prix</label>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: 100000-500000"
                  value={formatRangeValue(filters.priceRange.min, filters.priceRange.max)}
                  onChange={(e) => handleRangeChange(e.target.value, 'price')}
                  className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-500">
                  <Bed className="h-4 w-4" />
                  <label className="text-sm font-medium">Chambres</label>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: 2-4"
                  value={formatRangeValue(filters.bedrooms.min, filters.bedrooms.max)}
                  onChange={(e) => handleRangeChange(e.target.value, 'bedrooms')}
                  className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80"
                />
              </div>
            </motion.div>

            <Separator className="bg-primary/10" />

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-violet-500">
                  <Maximize2 className="h-4 w-4" />
                  <label className="text-sm font-medium">Surface habitable (m²)</label>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: 50-150"
                  value={formatRangeValue(filters.livingArea.min, filters.livingArea.max)}
                  onChange={(e) => handleRangeChange(e.target.value, 'livingArea')}
                  className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-500">
                  <Maximize2 className="h-4 w-4" />
                  <label className="text-sm font-medium">Surface terrain (m²)</label>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: 200-1000"
                  value={formatRangeValue(filters.landArea.min, filters.landArea.max)}
                  onChange={(e) => handleRangeChange(e.target.value, 'landArea')}
                  className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-500">
                  <Building2 className="h-4 w-4" />
                  <label className="text-sm font-medium">Nombre d'étages</label>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: 1-3"
                  value={formatRangeValue(filters.floors.min, filters.floors.max)}
                  onChange={(e) => handleRangeChange(e.target.value, 'floors')}
                  className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-cyan-500">
                  <Bath className="h-4 w-4" />
                  <label className="text-sm font-medium">Salles de bain</label>
                </div>
                <Input
                  type="text"
                  placeholder="Ex: 1-2"
                  value={formatRangeValue(filters.bathrooms.min, filters.bathrooms.max)}
                  onChange={(e) => handleRangeChange(e.target.value, 'bathrooms')}
                  className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80"
                />
              </div>
            </motion.div>

            <Separator className="bg-primary/10" />

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <Gauge className="h-4 w-4" />
                  <label className="text-sm font-medium">Classe énergétique</label>
                </div>
                <Select
                  value={filters.energyClass}
                  onValueChange={(value) => handleFilterChange({ energyClass: value })}
                >
                  <SelectTrigger className="w-full bg-background/60 border-primary/20 focus:border-primary/40 transition-colors hover:bg-background/80">
                    <SelectValue placeholder="Classe énergétique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {["A", "B", "C", "D", "E", "F", "G"].map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={cn(
                            "px-2 py-0.5 font-medium",
                            cls === "A" && "bg-emerald-100 text-emerald-800",
                            cls === "B" && "bg-emerald-100/80 text-emerald-800",
                            cls === "C" && "bg-yellow-100 text-yellow-800",
                            cls === "D" && "bg-yellow-100/80 text-yellow-800",
                            cls === "E" && "bg-orange-100 text-orange-800",
                            cls === "F" && "bg-red-100 text-red-800",
                            cls === "G" && "bg-red-100/80 text-red-800"
                          )}>
                            DPE {cls}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Options</label>
                <div className="grid gap-4">
                  <motion.div
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 text-cyan-500">
                      <ParkingSquare className="h-4 w-4" />
                      <label htmlFor="hasParking" className="text-sm">Parking</label>
                    </div>
                    <Switch
                      id="hasParking"
                      checked={filters.hasParking}
                      onCheckedChange={(checked) => handleFilterChange({ hasParking: checked })}
                    />
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 text-sky-500">
                      <Car className="h-4 w-4" />
                      <label htmlFor="hasGarage" className="text-sm">Garage</label>
                    </div>
                    <Switch
                      id="hasGarage"
                      checked={filters.hasGarage}
                      onCheckedChange={(checked) => handleFilterChange({ hasGarage: checked })}
                    />
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 text-teal-500">
                      <LayoutTemplate className="h-4 w-4" />
                      <label htmlFor="hasBalcony" className="text-sm">Balcon</label>
                    </div>
                    <Switch
                      id="hasBalcony"
                      checked={filters.hasBalcony || false}
                      onCheckedChange={(checked) => handleFilterChange({ hasBalcony: checked })}
                    />
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 text-indigo-500">
                      <ArrowUpDown className="h-4 w-4" />
                      <label htmlFor="hasElevator" className="text-sm">Ascenseur</label>
                    </div>
                    <Switch
                      id="hasElevator"
                      checked={filters.hasElevator || false}
                      onCheckedChange={(checked) => handleFilterChange({ hasElevator: checked })}
                    />
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 text-rose-500">
                      <Warehouse className="h-4 w-4" />
                      <label htmlFor="hasCellar" className="text-sm">Cave</label>
                    </div>
                    <Switch
                      id="hasCellar"
                      checked={filters.hasCellar || false}
                      onCheckedChange={(checked) => handleFilterChange({ hasCellar: checked })}
                    />
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-primary/5 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 text-orange-500">
                      <SunDim className="h-4 w-4" />
                      <label htmlFor="hasTerrace" className="text-sm">Terrasse</label>
                    </div>
                    <Switch
                      id="hasTerrace"
                      checked={filters.hasTerrace}
                      onCheckedChange={(checked) => handleFilterChange({ hasTerrace: checked })}
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </ScrollArea>

        <div className="pt-6 space-x-2 flex justify-end">
          <Button
            variant="default"
            className="bg-primary/90 hover:bg-primary text-primary-foreground transition-colors"
            onClick={applyFilters}
          >
            Appliquer les filtres
          </Button>
        </div>
      </CardContent>
    </div>
  );
}