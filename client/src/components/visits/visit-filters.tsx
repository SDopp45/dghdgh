import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  parse, 
  isValid, 
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Search, X, Filter } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface VisitFiltersProps {
  onFilterChange: (filters: {
    search: string;
    dateRange: DateRange | undefined;
  }) => void;
}

export function VisitFilters({ onFilterChange }: VisitFiltersProps) {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState<DateRange | undefined>();
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("");

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
    onFilterChange({ search: value, dateRange: date });
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setSelectedQuickFilter("");
    onFilterChange({ search, dateRange: newDate });
  };

  const handleQuickFilter = (period: string) => {
    const today = new Date();
    let newRange: DateRange | undefined;

    switch (period) {
      case "today":
        newRange = {
          from: startOfDay(today),
          to: endOfDay(today)
        };
        break;
      case "tomorrow":
        const tomorrow = addDays(today, 1);
        newRange = {
          from: startOfDay(tomorrow),
          to: endOfDay(tomorrow)
        };
        break;
      case "thisWeek":
        newRange = {
          from: startOfWeek(today, { locale: fr }),
          to: endOfWeek(today, { locale: fr })
        };
        break;
      case "nextWeek":
        const nextWeek = addWeeks(today, 1);
        newRange = {
          from: startOfWeek(nextWeek, { locale: fr }),
          to: endOfWeek(nextWeek, { locale: fr })
        };
        break;
      case "thisMonth":
        newRange = {
          from: startOfMonth(today),
          to: endOfMonth(today)
        };
        break;
      case "nextMonth":
        const nextMonth = addMonths(today, 1);
        newRange = {
          from: startOfMonth(nextMonth),
          to: endOfMonth(nextMonth)
        };
        break;
      case "clear":
        newRange = undefined;
        break;
    }

    setSelectedQuickFilter(period);
    setDate(newRange);
    onFilterChange({ search, dateRange: newRange });
  };

  const clearFilters = () => {
    setSearch("");
    setDate(undefined);
    setStartDateInput("");
    setEndDateInput("");
    setSelectedQuickFilter("");
    onFilterChange({ search: "", dateRange: undefined });
  };

  const hasActiveFilters = search || date?.from || date?.to;

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou adresse..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex items-center gap-2",
                  date && "text-primary border-primary"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "d MMM", { locale: fr })} -{" "}
                      {format(date.to, "d MMM", { locale: fr })}
                    </>
                  ) : (
                    format(date.from, "d MMMM yyyy", { locale: fr })
                  )
                ) : (
                  "Sélectionner les dates"
                )}
                {date && (
                  <X
                    className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickFilter("clear");
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="grid gap-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedQuickFilter === "today" ? "default" : "outline"}
                    onClick={() => handleQuickFilter("today")}
                    size="sm"
                  >
                    Aujourd'hui
                  </Button>
                  <Button
                    variant={selectedQuickFilter === "tomorrow" ? "default" : "outline"}
                    onClick={() => handleQuickFilter("tomorrow")}
                    size="sm"
                  >
                    Demain
                  </Button>
                  <Button
                    variant={selectedQuickFilter === "thisWeek" ? "default" : "outline"}
                    onClick={() => handleQuickFilter("thisWeek")}
                    size="sm"
                  >
                    Cette semaine
                  </Button>
                  <Button
                    variant={selectedQuickFilter === "nextWeek" ? "default" : "outline"}
                    onClick={() => handleQuickFilter("nextWeek")}
                    size="sm"
                  >
                    Semaine prochaine
                  </Button>
                  <Button
                    variant={selectedQuickFilter === "thisMonth" ? "default" : "outline"}
                    onClick={() => handleQuickFilter("thisMonth")}
                    size="sm"
                  >
                    Ce mois
                  </Button>
                  <Button
                    variant={selectedQuickFilter === "nextMonth" ? "default" : "outline"}
                    onClick={() => handleQuickFilter("nextMonth")}
                    size="sm"
                  >
                    Mois prochain
                  </Button>
                </div>
                <div className="border-t pt-4">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={handleDateChange}
                    numberOfMonths={2}
                    locale={fr}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Effacer les filtres
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {search && (
              <Badge variant="secondary" className="gap-2">
                Recherche: {search}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleSearchChange("")}
                />
              </Badge>
            )}
            {date?.from && (
              <Badge variant="secondary" className="gap-2">
                Période: {format(date.from, "d MMM", { locale: fr })}
                {date.to && ` - ${format(date.to, "d MMM", { locale: fr })}`}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleQuickFilter("clear")}
                />
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}