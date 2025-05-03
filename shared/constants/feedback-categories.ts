/**
 * Définitions standardisées des catégories de feedback
 * 
 * Ce fichier définit toutes les catégories de feedback valides
 * et doit être la référence unique utilisée par le client et le serveur.
 */

/**
 * Catégories de base pour les feedbacks
 */
export const FEEDBACK_CATEGORIES = [
  'paiement',
  'entretien',
  'comportement',
  'respect_regles',
  'communication',
  'general'
] as const;

/**
 * Type pour les catégories de base
 */
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];

/**
 * Catégories étendues pour les événements spécifiques
 */
export const EVENT_CATEGORIES = [
  ...FEEDBACK_CATEGORIES,
  'incident',
  'maintenance',
  'paiement_retard',
  'plainte',
  'litige',
  'visite',
  'fin_bail',
  'debut_bail',
  'evaluation'
] as const;

/**
 * Type pour les catégories étendues
 */
export type EventCategory = typeof EVENT_CATEGORIES[number];

/**
 * Structure de mapping des catégories vers leurs informations d'affichage
 */
export interface CategoryInfo {
  label: string;
  description: string;
  color: string;
  activeColor: string;
  importance: number; // 1-5 pour le tri
}

/**
 * Informations détaillées pour chaque catégorie
 */
export const CATEGORY_INFO: Record<FeedbackCategory | EventCategory, CategoryInfo> = {
  paiement: {
    label: 'Paiement',
    description: 'Ponctualité et fiabilité des paiements de loyer',
    color: 'bg-green-100 border-green-400 hover:bg-green-200 text-green-700', 
    activeColor: 'bg-green-600 hover:bg-green-700 text-white',
    importance: 5
  },
  entretien: {
    label: 'Entretien',
    description: 'État de propreté et maintenance du logement',
    color: 'bg-blue-100 border-blue-400 hover:bg-blue-200 text-blue-700', 
    activeColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    importance: 4
  },
  comportement: {
    label: 'Comportement',
    description: 'Attitude générale du locataire',
    color: 'bg-purple-100 border-purple-400 hover:bg-purple-200 text-purple-700', 
    activeColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    importance: 3
  },
  respect_regles: {
    label: 'Respect des règles',
    description: 'Respect du règlement et des obligations',
    color: 'bg-red-100 border-red-400 hover:bg-red-200 text-red-700', 
    activeColor: 'bg-red-600 hover:bg-red-700 text-white',
    importance: 4
  },
  communication: {
    label: 'Communication',
    description: 'Qualité des échanges et réactivité',
    color: 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200 text-yellow-700', 
    activeColor: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    importance: 3
  },
  general: {
    label: 'Général',
    description: 'Évaluation globale du locataire',
    color: 'bg-orange-100 border-orange-400 hover:bg-orange-200 text-orange-700', 
    activeColor: 'bg-orange-600 hover:bg-orange-700 text-white',
    importance: 5
  },
  incident: {
    label: 'Incident',
    description: 'Événement notable survenu dans le logement',
    color: 'bg-red-100 border-red-400 hover:bg-red-200 text-red-700', 
    activeColor: 'bg-red-600 hover:bg-red-700 text-white',
    importance: 4
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Travaux d\'entretien ou réparations',
    color: 'bg-blue-100 border-blue-400 hover:bg-blue-200 text-blue-700', 
    activeColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    importance: 3
  },
  paiement_retard: {
    label: 'Retard de paiement',
    description: 'Retard spécifique dans le paiement du loyer',
    color: 'bg-amber-100 border-amber-400 hover:bg-amber-200 text-amber-700', 
    activeColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    importance: 5
  },
  plainte: {
    label: 'Plainte',
    description: 'Réclamation formelle du locataire',
    color: 'bg-rose-100 border-rose-400 hover:bg-rose-200 text-rose-700', 
    activeColor: 'bg-rose-600 hover:bg-rose-700 text-white',
    importance: 4
  },
  litige: {
    label: 'Litige',
    description: 'Conflit juridique ou dispute formelle',
    color: 'bg-red-100 border-red-400 hover:bg-red-200 text-red-700', 
    activeColor: 'bg-red-600 hover:bg-red-700 text-white',
    importance: 5
  },
  visite: {
    label: 'Visite',
    description: 'Visite de contrôle ou inspection',
    color: 'bg-teal-100 border-teal-400 hover:bg-teal-200 text-teal-700', 
    activeColor: 'bg-teal-600 hover:bg-teal-700 text-white',
    importance: 2
  },
  debut_bail: {
    label: 'Début de bail',
    description: 'Informations sur le début de location',
    color: 'bg-emerald-100 border-emerald-400 hover:bg-emerald-200 text-emerald-700', 
    activeColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    importance: 3
  },
  fin_bail: {
    label: 'Fin de bail',
    description: 'Informations sur la fin de location',
    color: 'bg-gray-100 border-gray-400 hover:bg-gray-200 text-gray-700', 
    activeColor: 'bg-gray-600 hover:bg-gray-700 text-white',
    importance: 3
  },
  evaluation: {
    label: 'Évaluation',
    description: 'Notation générale du locataire',
    color: 'bg-orange-100 border-orange-400 hover:bg-orange-200 text-orange-700', 
    activeColor: 'bg-orange-600 hover:bg-orange-700 text-white',
    importance: 5
  }
};

/**
 * Vérifie si une catégorie est valide
 */
export function isValidFeedbackCategory(category: string): category is FeedbackCategory {
  return FEEDBACK_CATEGORIES.includes(category as FeedbackCategory);
}

/**
 * Vérifie si une catégorie d'événement est valide
 */
export function isValidEventCategory(category: string): category is EventCategory {
  return EVENT_CATEGORIES.includes(category as EventCategory);
}

/**
 * Obtient les informations d'une catégorie
 */
export function getCategoryInfo(category: string): CategoryInfo | undefined {
  if (isValidEventCategory(category)) {
    return CATEGORY_INFO[category];
  }
  return undefined;
}

/**
 * Groupe les catégories principales par importance
 */
export function getMainCategories(): FeedbackCategory[] {
  return [...FEEDBACK_CATEGORIES].sort((a, b) => 
    CATEGORY_INFO[b].importance - CATEGORY_INFO[a].importance
  );
} 