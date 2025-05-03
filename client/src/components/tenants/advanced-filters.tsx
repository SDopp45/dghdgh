import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { Filter } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useState } from "react";

interface AdvancedFiltersProps {
  onFilterChange: (filters: {
    leaseType?: string;
    rentRange: {
      min?: number;
      max?: number;
    };
    dateRange?: DateRange;
  }) => void;
}

export function AdvancedFilters({ onFilterChange }: AdvancedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    leaseType: "all",
    rentRange: {
      min: undefined as number | undefined,
      max: undefined as number | undefined,
    },
    dateRange: undefined as DateRange | undefined,
  });

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange({
      ...newFilters,
      leaseType: newFilters.leaseType === "all" ? undefined : newFilters.leaseType,
    });
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowFilters(!showFilters)}
        className={`gap-2 ${showFilters ? 'bg-primary/5' : ''}`}
      >
        <Filter className="h-4 w-4" />
        Filtres
      </Button>

      {showFilters && (
        <Card className="p-4 absolute right-0 mt-2 z-50 w-[300px] shadow-lg">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de bail</Label>
              <Select
                value={filters.leaseType}
                onValueChange={(value) => handleFilterChange("leaseType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Type de bail</SelectLabel>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="bail_meuble">Meublé</SelectItem>
                    <SelectItem value="bail_vide">Vide</SelectItem>
                    <SelectItem value="bail_commercial">Commercial</SelectItem>
                    <SelectItem value="bail_professionnel">Professionnel</SelectItem>
                    <SelectItem value="bail_mobilite">Mobilité</SelectItem>
                    <SelectItem value="bail_etudiant">Étudiant</SelectItem>
                    <SelectItem value="bail_saisonnier">Saisonnier</SelectItem>
                    <SelectItem value="bail_terrain">Terrain</SelectItem>
                    <SelectItem value="bail_garage">Garage</SelectItem>
                    <SelectItem value="bail_social">Social</SelectItem>
                    <SelectItem value="bail_mixte">Mixte</SelectItem>
                    <SelectItem value="bail_derogatoire">Dérogatoire</SelectItem>
                    <SelectItem value="bail_rehabilitation">Réhabilitation</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loyer mensuel</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.rentRange.min || ""}
                  onChange={(e) =>
                    handleFilterChange("rentRange", {
                      ...filters.rentRange,
                      min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.rentRange.max || ""}
                  onChange={(e) =>
                    handleFilterChange("rentRange", {
                      ...filters.rentRange,
                      max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Période du bail</Label>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(range) => handleFilterChange("dateRange", range)}
              />
            </div>
          </div>
        </Card>
      )}
    </>
  );
}