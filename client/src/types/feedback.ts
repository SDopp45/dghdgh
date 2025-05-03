/**
 * Types pour le système de feedback et d'évaluation des locataires
 */

export type FeedbackCategory = 
  | 'paiement'
  | 'entretien'
  | 'comportement'
  | 'respect_regles'
  | 'communication'
  | 'general';

export interface FeedbackEntry {
  id: number;
  tenantId: number | null;
  tenantFullName?: string;
  originalUserId?: number;
  rating: number | null;
  feedback: string | null;
  category: FeedbackCategory;
  createdAt: string | Date;
  createdBy: number | null;
  updatedAt?: string | Date;
  isOrphaned: boolean;
  creator?: {
    id: number;
    fullName: string;
    username: string;
  };
}

export interface FeedbackStats {
  averageRating: number | null;
  categoryRatings: Record<FeedbackCategory, number | null>;
  totalCount: number;
  recentTrend: 'up' | 'down' | 'stable' | null;
}

export interface TenantWithRating {
  id: number;
  userId: number;
  propertyId: number;
  leaseStart: string | Date;
  leaseEnd: string | Date;
  rentAmount: string;
  leaseType: string;
  active: boolean;
  leaseStatus: string;
  user: {
    id: number;
    fullName: string;
    username: string;
    email?: string;
    phoneNumber?: string;
  };
  property: {
    id: number;
    name: string;
    address: string;
  };
  feedbackHistory: FeedbackEntry[];
  // Propriété calculée ajoutée par le serveur
  averageRating: number | null;
}

export interface FeedbackFormValues {
  tenantId: number | null;
  rating: number | null;
  feedback: string;
  category: FeedbackCategory;
  date?: Date;
}

export interface FeedbackFilterOptions {
  category?: FeedbackCategory | null;
  dateRange?: {
    from: Date | null;
    to: Date | null;
  } | null;
  rating?: number | null;
  showOrphaned: boolean;
} 