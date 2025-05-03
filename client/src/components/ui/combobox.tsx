import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  group?: string;
}

interface ComboboxProps {
  options: Option[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  error?: boolean;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner une option",
  emptyText = "Aucune option disponible",
  searchPlaceholder = "Rechercher...",
  className,
  error,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    // Mise à jour des options filtrées quand options change
    setFilteredOptions(options);
  }, [options]);

  useEffect(() => {
    // Ajouter l'écouteur d'événement pour le clic en dehors du dropdown
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Focus sur l'input de recherche quand le dropdown s'ouvre
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filtrer les options en fonction du terme de recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
      return;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = options.filter(
      option =>
        option.label.toLowerCase().includes(lowerCaseSearchTerm) ||
        (option.group && option.group.toLowerCase().includes(lowerCaseSearchTerm))
    );
    
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  // Grouper les options par leur propriété group
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const group = option.group || 'default';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(option);
    return acc;
  }, {} as Record<string, Option[]>);

  const selectedOption = options.find(option => option.value === value);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
      setFilteredOptions(options);
    }
  };

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onValueChange("");
    setSearchTerm("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border",
          "bg-background text-foreground",
          error ? "border-red-500" : "border-input",
          className
        )}
        onClick={handleToggle}
      >
        <div className="flex-1 truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 rounded-full hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border border-border shadow-lg">
          <div className="p-2 border-b border-muted">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {Object.keys(groupedOptions).length > 0 ? (
              Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group}>
                  {group !== 'default' && (
                    <div className="sticky top-0 px-2 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                      {group}
                    </div>
                  )}
                  {groupOptions.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center px-2 py-1.5 text-sm cursor-pointer",
                        "hover:bg-accent hover:text-accent-foreground",
                        option.value === value ? "bg-accent/50 text-accent-foreground" : "text-foreground"
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          option.value === value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}