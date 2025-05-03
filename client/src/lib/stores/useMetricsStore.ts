import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Interface pour les métriques de propriété
 */
export interface PropertyMetric {
  propertyId: number;
  date: string;            // Format YYYY-MM
  occupancyRate: number;   // Taux d'occupation en %
  maintenanceCosts: number; // Coûts de maintenance
  cashflow: number;        // Flux de trésorerie
  value: number;           // Valeur estimée de la propriété
}

/**
 * Interface pour les métriques de finances
 */
export interface FinanceMetric {
  date: string;            // Format YYYY-MM
  revenue: number;         // Revenus totaux
  expenses: number;        // Dépenses totales
  cashflow: number;        // Flux de trésorerie
  breakdown: {
    [category: string]: number;
  };
}

/**
 * Interface pour les métriques de location
 */
export interface RentalMetric {
  date: string;            // Format YYYY-MM
  occupancyRate: number;   // Taux d'occupation en %
  rentCollection: number;  // Taux de recouvrement des loyers en %
  rentalYield: number;     // Rendement locatif en %
  previous: {              // Données du mois précédent pour comparaison
    occupancyRate: number;
    rentCollection: number;
    rentalYield: number;
  };
}

/**
 * Interface pour le store de métriques
 */
interface MetricsState {
  propertyMetrics: Record<number, PropertyMetric[]>; // Métriques par propriété
  financeMetrics: FinanceMetric[];                  // Métriques financières globales
  rentalMetrics: RentalMetric[];                    // Métriques de location
  lastUpdated: string | null;                       // Dernière mise à jour
  
  // Actions
  addPropertyMetric: (metric: PropertyMetric) => void;
  addFinanceMetric: (metric: FinanceMetric) => void;
  addRentalMetric: (metric: RentalMetric) => void;
  getPropertyHistory: (propertyId: number, limit?: number) => PropertyMetric[];
  getFinanceHistory: (limit?: number) => FinanceMetric[];
  getRentalHistory: (limit?: number) => RentalMetric[];
  clearAllMetrics: () => void;
  updateTimestamp: () => void;
}

/**
 * Store Zustand pour les métriques
 */
export const useMetricsStore = create<MetricsState>()(
  persist(
    (set, get) => ({
      propertyMetrics: {},
      financeMetrics: [],
      rentalMetrics: [],
      lastUpdated: null,
      
      // Ajouter une métrique de propriété
      addPropertyMetric: (metric) => {
        set((state) => {
          const propertyId = metric.propertyId;
          const currentMetrics = state.propertyMetrics[propertyId] || [];
          
          // Vérifier si cette métrique existe déjà pour éviter les doublons
          const exists = currentMetrics.some(m => 
            m.propertyId === metric.propertyId && m.date === metric.date
          );
          
          if (exists) return state; // Ne rien changer si la métrique existe déjà
          
          return {
            propertyMetrics: {
              ...state.propertyMetrics,
              [propertyId]: [...currentMetrics, metric]
            }
          };
        });
      },
      
      // Ajouter une métrique financière
      addFinanceMetric: (metric) => {
        set((state) => {
          // Vérifier si cette métrique existe déjà
          const exists = state.financeMetrics.some(m => m.date === metric.date);
          
          if (exists) return state; // Ne rien changer si la métrique existe déjà
          
          return {
            financeMetrics: [...state.financeMetrics, metric]
          };
        });
      },
      
      // Ajouter une métrique de location
      addRentalMetric: (metric) => {
        set((state) => {
          // Vérifier si cette métrique existe déjà
          const exists = state.rentalMetrics.some(m => m.date === metric.date);
          
          if (exists) return state; // Ne rien changer si la métrique existe déjà
          
          return {
            rentalMetrics: [...state.rentalMetrics, metric]
          };
        });
      },
      
      // Récupérer l'historique des métriques d'une propriété
      getPropertyHistory: (propertyId, limit = 12) => {
        const { propertyMetrics } = get();
        const metrics = propertyMetrics[propertyId] || [];
        
        // Trier par date (du plus récent au plus ancien)
        return [...metrics]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
      },
      
      // Récupérer l'historique des métriques financières
      getFinanceHistory: (limit = 12) => {
        const { financeMetrics } = get();
        
        // Trier par date (du plus récent au plus ancien)
        return [...financeMetrics]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
      },
      
      // Récupérer l'historique des métriques de location
      getRentalHistory: (limit = 12) => {
        const { rentalMetrics } = get();
        
        // Trier par date (du plus récent au plus ancien)
        return [...rentalMetrics]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
      },
      
      // Effacer toutes les métriques (utile pour les tests)
      clearAllMetrics: () => {
        set({
          propertyMetrics: {},
          financeMetrics: [],
          rentalMetrics: [],
          lastUpdated: null
        });
      },
      
      // Mettre à jour le timestamp
      updateTimestamp: () => {
        set({
          lastUpdated: new Date().toISOString()
        });
      }
    }),
    {
      name: 'imimo-metrics-storage',
      partialize: (state) => ({
        propertyMetrics: state.propertyMetrics,
        financeMetrics: state.financeMetrics,
        rentalMetrics: state.rentalMetrics,
        lastUpdated: state.lastUpdated
      })
    }
  )
); 