import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";

interface Props {
  onFilterChange: (filters: {
    status?: string;
    visitType?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

export function AdvancedFilters({ onFilterChange }: Props) {
  const [filters, setFilters] = useState({
    status: "",
    visitType: "all",
    startDate: "",
    endDate: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // Convertir "all" en undefined pour le filtre
    const filterValues = {
      ...newFilters,
      visitType: newFilters.visitType === "all" ? undefined : newFilters.visitType,
    };
    onFilterChange(filterValues);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Filtres avancés</h4>
            <p className="text-sm text-muted-foreground">
              Affinez votre recherche de visites
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label htmlFor="visitType">Type de visite</Label>
              <Select
                value={filters.visitType}
                onValueChange={(value) => handleFilterChange("visitType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="physical">Visite physique</SelectItem>
                  <SelectItem value="virtual">Visite virtuelle</SelectItem>
                  <SelectItem value="video">Visite vidéo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Période</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}