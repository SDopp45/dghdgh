/**
 * Types pour l'historique des locataires
 */

// Catégories des entrées d'historique - Toutes les catégories possibles avec commentaires explicatifs
export type TenantHistoryCategory = 
  // Catégories financières
  | 'paiement'          // Paiement régulier du loyer
  | 'paiement_retard'   // Retard de paiement

  // Catégories liées au bail
  | 'debut_bail'        // Début de bail / emménagement
  | 'fin_bail'          // Fin de bail / déménagement
  | 'movein'            // Arrivée du locataire (alias pour debut_bail)
  | 'moveout'           // Départ du locataire (alias pour fin_bail)
  
  // Catégories d'évaluation
  | 'evaluation'        // Évaluation générale du locataire
  | 'comportement'      // Comportement du locataire
  | 'respect_regles'    // Respect du règlement
  
  // Catégories de maintenance
  | 'entretien'         // Entretien régulier
  | 'maintenance'       // Travaux de maintenance
  
  // Catégories de problèmes
  | 'incident'          // Incidents divers
  | 'plainte'           // Plaintes formelles
  | 'litige'            // Litiges juridiques
  
  // Autres catégories
  | 'communication'     // Communication avec le locataire
  | 'visite'            // Visite de la propriété
  | 'general';          // Catégorie par défaut

// Types d'événements - Tous les types possibles
export type TenantHistoryEventType = 
  // Types d'événements principaux
  | 'evaluation'        // Évaluation périodique
  | 'incident'          // Incident
  | 'paiement'          // Relatif au paiement
  | 'maintenance'       // Maintenance ou réparation
  | 'plainte'           // Plainte formelle
  | 'litige'            // Litige ou différend juridique
  | 'visite'            // Visite de l'appartement
  | 'fin_bail'          // Fin de bail / déménagement
  | 'debut_bail'        // Début de bail / emménagement
  
  // Types secondaires (pour la compatibilité)
  | 'general'           // Événement général
  | 'entretien'         // Entretien de la propriété
  | 'comportement'      // Comportement du locataire
  | 'respect_regles'    // Respect du règlement
  | 'communication';    // Communication avec le locataire

// Statut du bail
export type TenantHistoryBailStatus = 'actif' | 'archivé' | 'supprimé';

// Entrée d'historique des locataires
export interface TenantHistoryEntry {
  id: number;
  tenantId: number | null;
  rating: number;
  feedback: string | null;
  category: TenantHistoryCategory;
  tenantFullName: string | null;
  isOrphaned: boolean;
  originalUserId: number | null;
  eventType: TenantHistoryEventType;
  eventSeverity: number;
  eventDetails: Record<string, any>;
  documents: string[];
  bailStatus: TenantHistoryBailStatus | null;
  bailId: number | null;
  propertyName: string | null;
  createdAt: string;
  createdBy: number | null;
  
  // Propriétés jointes
  userName?: string;
  // Suppression des champs email et téléphone
  // tenantEmail?: string; // Email du locataire
  // tenantPhone?: string; // Téléphone du locataire
  // Alias rétrocompatibles
  date?: string; // pour createdAt
  tenantName?: string; // pour tenantFullName
  description?: string; // pour feedback
  status?: string; // ancien statut
  propertyId?: number; // propriété liée
  updatedAt?: string;
  eventTags?: string[]; // ancienne implémentation
  
  // Relations aux entities
  tenant?: {
    id: number;
    user?: {
      fullName: string;
      // Suppression des champs email et téléphone
      // email: string;
      // phoneNumber: string;
    }
  };
  property?: {
    name: string;
    address: string;
  };
}

// Valeurs de formulaire pour la création/modification
export interface TenantHistoryFormValues {
  tenantId: number | null;
  propertyId: number | null;
  rating: number | null;
  feedback: string | null;  // Seul champ de description/commentaire à utiliser
  category?: TenantHistoryCategory;
  tenantFullName?: string | null;
  eventType: TenantHistoryEventType;
  eventSeverity?: number;
  eventDetails?: Record<string, any>;
  bailStatus?: TenantHistoryBailStatus | null;
  bailId?: number | null;
  propertyName?: string | null;
  date: Date;
  status: string;
  documents?: File[];
  eventTags?: string[];
}

// Props pour les composants
export interface GroupedTenantHistory {
  tenantFullName: string | null;
  tenantId: number | null;
  propertyId: number | null;
  propertyName?: string | null;
  isOrphaned: boolean;
  entries: TenantHistoryEntry[];
  averageRating: number;
  categories: TenantHistoryCategory[];
  latestEntry: string;
}

export interface TenantHistoryTableProps {
  filter?: string | TenantHistoryCategory | 'all';
  searchTerm?: string;
  isLoading?: boolean;
  onFilterChange?: (filter: string) => void;
  onViewDetails?: (id: number) => void;
  onReassign?: (id: number, tenantName: string | null | undefined) => void;
  onViewAllEntries?: (tenantName: string, entries: TenantHistoryEntry[]) => void;
}

export interface TenantHistoryDetailsProps {
  id: number;
  isOpen: boolean;
  onClose?: () => void;
  onEdit?: (entry: TenantHistoryEntry) => void;
}

export interface TenantHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyId?: number;
  tenantId?: number | null;
  initialData?: Partial<TenantHistoryEntry>;
  onSuccess?: (entry: TenantHistoryEntry) => void;
  title?: string;
}

// Statistiques d'historique des locataires
export interface TenantHistoryStats {
  total: number;
  movein: number;
  moveout: number;
  evaluation: number;
  incident: number;
  communication: number;
  orphanedCount: number;  // Nombre total d'entrées marquées comme orphelines
  withoutTenantId: number; // Nombre d'entrées sans ID de locataire associé
  
  // Propriétés utilisées dans la page de statistiques
  totalEntries: number;
  tenantsWithHistory: number;
  recentIncidents: number;
  paymentIssuesCount: number;
  positiveRatingsPercentage: number;
  entriesByTypeCount: Record<string, number>;
  entriesByCategoryCount: Record<string, number>;
  
  // Propriétés additionnelles pour les statistiques avancées
  atRiskPercentage: number;       // Pourcentage de locataires à risque
  recentEntries: number;          // Nombre d'entrées récentes (30 derniers jours)
  positiveRecentPercentage: number; // Pourcentage d'évaluations positives récentes
}

export interface TenantHistory {
  id: string;
  tenantId: string;
  propertyId: string;
  startDate: string;
  endDate?: string;
  rating: number;
  notes: string;
}