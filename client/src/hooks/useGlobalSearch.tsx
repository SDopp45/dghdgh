import React from 'react';
import { useState, useCallback } from 'react';
import { PiggyBank, Home, User, Wrench, CalendarDays } from 'lucide-react';

interface SearchResult {
  type: 'transaction' | 'property' | 'tenant' | 'maintenance' | 'visit';
  id: string | number;
  title: string;
  subtitle?: string;
  route: string;
  icon: React.ReactNode;
}

export const useGlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }
    
    setQuery(searchQuery);
    setIsSearching(true);
    
    try {
      // Search transactions
      const transactionsPromise = fetch(`/api/transactions?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then(res => res.ok ? res.json() : { data: [] })
        .then(data => (data.data || []).map((t: any) => ({
          type: 'transaction' as const,
          id: t.id,
          title: `${t.description || 'Transaction'} (${t.formattedAmount || t.amount}€)`,
          subtitle: `${t.category} - ${t.formattedDate || t.date}`,
          route: `/finance?selected=${t.id}`,
          icon: React.createElement(PiggyBank, { className: "h-4 w-4 mr-2" })
        })));
      
      // Search properties
      const propertiesPromise = fetch(`/api/properties?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then(res => res.ok ? res.json() : [])
        .then(data => (Array.isArray(data) ? data : []).map((p: any) => ({
          type: 'property' as const,
          id: p.id,
          title: p.name || 'Propriété sans nom',
          subtitle: p.address || '',
          route: `/properties?selected=${p.id}`,
          icon: React.createElement(Home, { className: "h-4 w-4 mr-2" })
        })));
      
      // Search tenants
      const tenantsPromise = fetch(`/api/tenants?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then(res => res.ok ? res.json() : [])
        .then(data => (Array.isArray(data) ? data : []).map((t: any) => ({
          type: 'tenant' as const,
          id: t.id,
          title: t.user?.fullName || 'Locataire',
          subtitle: t.email || '',
          route: `/tenants?selected=${t.id}`,
          icon: React.createElement(User, { className: "h-4 w-4 mr-2" })
        })));
      
      // Search maintenance
      const maintenancePromise = fetch(`/api/maintenance?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then(res => res.ok ? res.json() : [])
        .then(data => (Array.isArray(data) ? data : []).map((m: any) => ({
          type: 'maintenance' as const,
          id: m.id,
          title: m.title || 'Demande de maintenance',
          subtitle: m.status || '',
          route: `/maintenance?selected=${m.id}`,
          icon: React.createElement(Wrench, { className: "h-4 w-4 mr-2" })
        })));
      
      // Search visits
      const visitsPromise = fetch(`/api/visits?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then(res => res.ok ? res.json() : [])
        .then(data => (Array.isArray(data) ? data : []).map((v: any) => ({
          type: 'visit' as const,
          id: v.id,
          title: `Visite ${v.property?.name || ''}`,
          subtitle: v.scheduledDate || '',
          route: `/visits?selected=${v.id}`,
          icon: React.createElement(CalendarDays, { className: "h-4 w-4 mr-2" })
        })));
      
      // Get all results
      const [transactions, properties, tenants, maintenance, visits] = await Promise.all([
        transactionsPromise, 
        propertiesPromise, 
        tenantsPromise, 
        maintenancePromise, 
        visitsPromise
      ]);
      
      setResults([
        ...transactions,
        ...properties,
        ...tenants,
        ...maintenance,
        ...visits
      ]);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    search
  };
};

export default useGlobalSearch; 