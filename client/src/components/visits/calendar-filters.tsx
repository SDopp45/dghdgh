import { useState } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Check, 
  Filter, 
  X 
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { type DateRange as DayPickerDateRange } from "react-day-picker";

// Interface pour la plage de dates
// Utiliser la même structure que dans visit-calendar.tsx pour assurer la compatibilité
interface DateRange {
  from?: Date;
  to?: Date;
}

type CalendarFiltersProps = {
  onFilterChange: (filters: {
    visitType: string[];
    dateRange?: DateRange;
  }) => void;
  activeFilters: {
    visitType: string[];
    dateRange?: DateRange;
  };
};

export function CalendarFilters({ onFilterChange, activeFilters }: CalendarFiltersProps) {
  const [open, setOpen] = useState(false);
  const [typeFilters, setTypeFilters] = useState<string[]>(activeFilters.visitType);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(activeFilters.dateRange);

  const hasActiveFilters = 
    typeFilters.length > 0 || 
    (dateRange?.from !== undefined);

  const handleTypeFilterChange = (type: string) => {
    const updatedTypeFilters = typeFilters.includes(type)
      ? typeFilters.filter(t => t !== type)
      : [...typeFilters, type];

    setTypeFilters(updatedTypeFilters);
  };

  const applyFilters = () => {
    onFilterChange({
      visitType: typeFilters,
      dateRange: dateRange
    });
    setOpen(false);
  };

  const resetFilters = () => {
    setTypeFilters([]);
    setDateRange(undefined);
    onFilterChange({
      visitType: [],
      dateRange: undefined
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn(
            "flex items-center gap-1.5 px-3 h-9 relative",
            hasActiveFilters && "bg-primary text-primary-foreground"
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Filtres</span>
          {hasActiveFilters && (
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center rounded-full text-xs">
              {typeFilters.length + (dateRange?.from ? 1 : 0)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Filtres du calendrier</h3>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-muted-foreground"
                onClick={resetFilters}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>



          {/* Filtre par type de visite */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type de visite</Label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: "physical", label: "Visite physique", emoji: "🏠" },
                { id: "virtual", label: "Visite virtuelle", emoji: "💻" },
                { id: "video", label: "Visite vidéo", emoji: "📹" },
              ].map((type) => (
                <div 
                  key={type.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-colors",
                    typeFilters.includes(type.id) 
                      ? `border-primary/30 bg-primary/5` 
                      : "border-border hover:bg-muted"
                  )}
                  onClick={() => handleTypeFilterChange(type.id)}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{type.emoji}</span>
                    <span className="text-sm">{type.label}</span>
                  </div>
                  {typeFilters.includes(type.id) && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filtre par plage de dates */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Période</Label>
            <div className="border rounded-md p-3">
              <Calendar
                locale={fr}
                mode="range"
                selected={dateRange as any}
                onSelect={setDateRange as any}
                className="mx-auto"
                initialFocus
              />
              {dateRange?.from && (
                <div className="mt-3 text-sm text-center text-muted-foreground">
                  <span className="font-medium">
                    {dateRange.from && format(dateRange.from, 'PPP', { locale: fr })}
                  </span>
                  {dateRange.to && (
                    <>
                      <span> au </span>
                      <span className="font-medium">
                        {format(dateRange.to, 'PPP', { locale: fr })}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={applyFilters}>
              Appliquer les filtres
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}