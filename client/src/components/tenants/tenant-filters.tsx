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

interface TenantFiltersProps {
  onFilterChange: (filters: {
    search: string;
    dateRange: DateRange | undefined;
    rentRange: {
      min: number | undefined;
      max: number | undefined;
    };
  }) => void;
}

export function TenantFilters({ onFilterChange }: TenantFiltersProps) {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState<DateRange | undefined>();
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [rentRange, setRentRange] = useState("");

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
      rentRange: parseRentRange(rentRange)
    });
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onFilterChange({ 
      search,
      dateRange: newDate,
      rentRange: parseRentRange(rentRange)
    });
  };

  const parseRentRange = (value: string) => {
    const [min, max] = value.split("-").map(v => {
      const num = Number(v.trim());
      return isNaN(num) ? undefined : num;
    });
    return { min, max };
  };

  const handleRentRangeChange = (value: string) => {
    setRentRange(value);
    onFilterChange({
      search,
      dateRange: date,
      rentRange: parseRentRange(value)
    });
  };

  const handleManualDateChange = (type: 'start' | 'end', value: string) => {
    if (!value) {
      if (type === 'start') {
        setStartDateInput("");
        handleDateChange({ from: undefined, to: date?.to });
      } else {
        setEndDateInput("");
        handleDateChange({ from: date?.from, to: undefined });
      }
      return;
    }

    const parsedDate = parse(value, "yyyy-MM-dd", new Date());
    if (isValid(parsedDate)) {
      if (type === 'start') {
        setStartDateInput(value);
        handleDateChange({
          from: startOfDay(parsedDate),
          to: date?.to ? endOfDay(date.to) : undefined
        });
      } else {
        setEndDateInput(value);
        handleDateChange({
          from: date?.from ? startOfDay(date.from) : undefined,
          to: endOfDay(parsedDate)
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
      rentRange: parseRentRange(rentRange)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bail (nom, téléphone, propriété...)..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Loyer (min-max). Ex: 500-1500"
            value={rentRange}
            onChange={(e) => handleRentRangeChange(e.target.value)}
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