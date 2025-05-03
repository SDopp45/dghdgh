import { useState, useEffect, useRef } from "react";
import { Command, CommandInput } from "@/components/ui/command";
import { Loader2 } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

interface AddressResult {
  address: string;
  lat: number;
  lng: number;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Saisissez une adresse...",
  className,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  const searchAddress = useDebouncedCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Recherche d'adresse pour:", query);
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          query
        )}&limit=5`
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Résultats reçus:", data);

      const formattedResults: AddressResult[] = data.features.map(
        (feature: any) => ({
          address: feature.properties.label,
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
        })
      );

      setResults(formattedResults);
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresse:", error);
      setError(error instanceof Error ? error.message : "Erreur inconnue");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  useEffect(() => {
    if (value.trim().length > 2) {
      searchAddress(value);
    } else {
      setResults([]);
    }
  }, [value, searchAddress]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: AddressResult) => {
    onChange(result.address);
    onSelect?.(result);
    setIsOpen(false);
    console.log("Adresse sélectionnée avec coordonnées:", result);
  };

  return (
    <div className="relative w-full" ref={commandRef}>
      <Command className={className}>
        <CommandInput
          value={value}
          onValueChange={(value) => {
            onChange(value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full"
        />
      </Command>
      {isOpen && value.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-[100%] mt-1 z-50">
          <div className="bg-popover text-popover-foreground shadow-lg rounded-md border border-border max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="p-2 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                Recherche en cours...
              </div>
            ) : error ? (
              <div className="p-2 text-center text-destructive">
                {error}
              </div>
            ) : results.length > 0 ? (
              results.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(result)}
                  className="p-2 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  {result.address}
                </div>
              ))
            ) : (
              <div className="p-2 text-center text-muted-foreground">
                Aucun résultat trouvé
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}