import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  format, 
  parse, 
  isValid, 
  startOfDay,
  endOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Search, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface MaintenanceFiltersProps {
  onFilterChange: (filters: {
    search: string;
    dateRange: DateRange | undefined;
    priceRange: {
      min: number | undefined;
      max: number | undefined;
    };
  }) => void;
}

export function MaintenanceFilters({ onFilterChange }: MaintenanceFiltersProps) {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState<DateRange | undefined>();
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [priceRange, setPriceRange] = useState("");

  useEffect(() => {
    if (date?.from) {
      setStartDateInput(format(date.from, "yyyy-MM-dd"));
    } else {
      setStartDateInput("");
    }
    if (date?.to) {
      setEndDateInput(format(date.to, "yyyy-MM-dd"));
    } else {
      setEndDateInput("");
    }
  }, [date]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange({ 
      search: value, 
      dateRange: date,
      priceRange: parsePriceRange(priceRange)
    });
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onFilterChange({ 
      search, 
      dateRange: newDate,
      priceRange: parsePriceRange(priceRange)
    });
  };

  const parsePriceRange = (value: string) => {
    const [min, max] = value.split("-").map(v => {
      const num = Number(v.trim());
      return isNaN(num) ? undefined : num;
    });
    return { min, max };
  };

  const handlePriceRangeChange = (value: string) => {
    setPriceRange(value);
    onFilterChange({
      search,
      dateRange: date,
      priceRange: parsePriceRange(value)
    });
  };

  const handleManualDateChange = (type: 'start' | 'end', value: string) => {
    if (!value) {
      if (type === 'start') {
        setStartDateInput("");
        const newRange = {
          from: undefined,
          to: date?.to
        };
        setDate(newRange);
        onFilterChange({ 
          search, 
          dateRange: newRange,
          priceRange: parsePriceRange(priceRange)
        });
      } else {
        setEndDateInput("");
        const newRange = {
          from: date?.from,
          to: undefined
        };
        setDate(newRange);
        onFilterChange({ 
          search, 
          dateRange: newRange,
          priceRange: parsePriceRange(priceRange)
        });
      }
      return;
    }

    if (type === 'start') {
      setStartDateInput(value);
      const parsedDate = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(parsedDate)) {
        const newRange = {
          from: startOfDay(parsedDate),
          to: date?.to ? endOfDay(date.to) : undefined
        };
        setDate(newRange);
        onFilterChange({ 
          search, 
          dateRange: newRange,
          priceRange: parsePriceRange(priceRange)
        });
      }
    } else {
      setEndDateInput(value);
      const parsedDate = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(parsedDate)) {
        const newRange = {
          from: date?.from ? startOfDay(date.from) : undefined,
          to: endOfDay(parsedDate)
        };
        setDate(newRange);
        onFilterChange({ 
          search, 
          dateRange: newRange,
          priceRange: parsePriceRange(priceRange)
        });
      }
    }
  };

  const clearDates = () => {
    setDate(undefined);
    setStartDateInput("");
    setEndDateInput("");
    onFilterChange({ 
      search, 
      dateRange: undefined,
      priceRange: parsePriceRange(priceRange)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des demandes..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Prix (min-max). Ex: 30-4500"
            value={priceRange}
            onChange={(e) => handlePriceRangeChange(e.target.value)}
            className="w-[200px]"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "P", { locale: fr })} -{" "}
                        {format(date.to, "P", { locale: fr })}
                      </>
                    ) : (
                      format(date.from, "P", { locale: fr })
                    )
                  ) : (
                    "Sélectionner les dates"
                  )}
                </span>
                {date && (
                  <X
                    className="ml-2 h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDates();
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="border-b border-border p-3 space-y-3">
                <div className="flex space-x-2">
                  <Input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => handleManualDateChange('start', e.target.value)}
                    placeholder="Date de début"
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => handleManualDateChange('end', e.target.value)}
                    placeholder="Date de fin"
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      clearDates();
                    }}
                    title="Effacer les dates"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateChange}
                numberOfMonths={2}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}