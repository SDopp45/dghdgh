import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import useSearchNavigation from '@/hooks/useSearchNavigation';
import { cn } from '@/lib/utils';

export function GlobalSearchBar() {
  const { query, setQuery, results, isSearching, search } = useGlobalSearch();
  const { navigateWithSelection } = useSearchNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Effectue la recherche quand la requête change
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.trim()) {
        search(query);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, search]);

  // Ferme les résultats quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length > 1);
  };

  const handleSelectResult = (route: string) => {
    setIsOpen(false);
    setQuery('');
    
    // Extraire le chemin de base et les paramètres de l'URL
    const [basePath, queryParams] = route.split('?');
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      const selectedId = params.get('selected');
      
      if (selectedId) {
        // Utiliser le nouveau hook pour naviguer avec le paramètre selected
        navigateWithSelection(basePath, selectedId, false);
        return;
      }
    }
    
    // Si nous ne pouvons pas extraire les paramètres, utiliser l'URL complète
    window.location.href = route;
  };

  const handleFocus = () => {
    if (query.trim().length > 1) {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input 
          ref={inputRef}
          type="search" 
          placeholder="Rechercher..." 
          className="pl-8 pr-3 py-0 bg-muted/50 border-muted focus-visible:ring-primary rounded-full h-6 md:h-8 text-xs md:text-sm w-full"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
        />
      </div>

      {/* Résultats de recherche */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md overflow-hidden max-h-[70vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Recherche en cours...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.id}-${index}`}>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-muted/50 flex items-center"
                    onClick={() => handleSelectResult(result.route)}
                  >
                    <div className="flex items-center">
                      {result.icon}
                      <div>
                        <div className="font-medium text-sm">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length > 1 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun résultat trouvé
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default GlobalSearchBar; 