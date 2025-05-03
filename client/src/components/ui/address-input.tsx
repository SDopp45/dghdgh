import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import debounce from 'lodash/debounce';

interface AddressInputProps {
  value: string;
  onChange: (address: string, coordinates?: { latitude: number; longitude: number }) => void;
  className?: string;
  placeholder?: string;
}

export function AddressInput({ value, onChange, className, placeholder = "Saisir une adresse..." }: AddressInputProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    address: string;
    coordinates: { latitude: number; longitude: number };
  }>>([]);
  const [loading, setLoading] = useState(false);

  const searchAddress = debounce(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/property-features/geocode?address=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Erreur lors de la recherche d\'adresse');
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    return () => {
      searchAddress.cancel();
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder="Rechercher une adresse..."
            onValueChange={(search) => {
              searchAddress(search);
            }}
          />
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && suggestions.length === 0 && (
            <CommandEmpty>Aucune adresse trouvée.</CommandEmpty>
          )}
          <CommandGroup>
            {suggestions.map((suggestion, index) => (
              <CommandItem
                key={index}
                onSelect={() => {
                  onChange(suggestion.address, suggestion.coordinates);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === suggestion.address ? "opacity-100" : "opacity-0"
                  )}
                />
                {suggestion.address}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
