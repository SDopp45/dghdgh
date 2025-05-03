/**
 * Utilitaires pour la gestion des catégories dans l'historique des locataires (côté serveur)
 */

/**
 * Type pour les catégories de l'historique des locataires
 */
export type TenantHistoryCategory = 
  // Catégories financières
  | 'paiement'
  | 'paiement_retard'
  
  // Catégories liées au bail
  | 'debut_bail'
  | 'fin_bail'
  | 'movein'
  | 'moveout'
  
  // Catégories d'évaluation
  | 'evaluation'
  | 'comportement' 
  | 'respect_regles'
  
  // Catégories de maintenance
  | 'entretien'
  | 'maintenance'
  
  // Catégories de problèmes
  | 'incident'
  | 'plainte'
  | 'litige'
  
  // Autres catégories
  | 'communication'
  | 'visite'
  | 'general'
  | string; // Fallback pour les anciennes catégories non standardisées

/**
 * Obtient le libellé français correspondant à une catégorie
 * @param category La catégorie à traduire
 * @returns Le libellé en français
 */
export function getCategoryLabel(category: string): string {
  switch (category) {
    // Catégories financières
    case 'paiement': return 'Paiement';
    case 'paiement_retard': return 'Retard de paiement';
    
    // Catégories liées au bail
    case 'debut_bail': return 'Début de bail';
    case 'fin_bail': return 'Fin de bail';
    case 'movein': return 'Emménagement';
    case 'moveout': return 'Déménagement';
    
    // Catégories d'évaluation
    case 'evaluation': return 'Évaluation';
    case 'comportement': return 'Comportement';
    case 'respect_regles': return 'Respect du règlement';
    
    // Catégories de maintenance
    case 'entretien': return 'Entretien';
    case 'maintenance': return 'Maintenance';
    
    // Catégories de problèmes
    case 'incident': return 'Incident';
    case 'plainte': return 'Plainte';
    case 'litige': return 'Litige';
    
    // Autres catégories
    case 'communication': return 'Communication';
    case 'visite': return 'Visite';
    case 'general': return 'Général';
    
    // Catégories de transactions
    case 'insurance': return 'Assurance';
    case 'tax': return 'Impôts';
    case 'utility': return 'Charges';
    
    // Fallback
    default: return 'Autre';
  }
}

/**
 * Liste des catégories standardisées
 */
export const VALID_CATEGORIES: TenantHistoryCategory[] = [
  // Catégories financières
  'paiement',
  'paiement_retard',
  
  // Catégories liées au bail
  'debut_bail',
  'fin_bail',
  'movein',
  'moveout',
  
  // Catégories d'évaluation
  'evaluation',
  'comportement',
  'respect_regles',
  
  // Catégories de maintenance
  'entretien',
  'maintenance',
  
  // Catégories de problèmes
  'incident',
  'plainte',
  'litige',
  
  // Autres catégories
  'communication',
  'visite',
  'general'
];

/**
 * Vérifie si une catégorie est valide (fait partie des catégories standardisées)
 * @param category La catégorie à vérifier
 * @returns true si la catégorie est valide, false sinon
 */
export function isValidCategory(category: string): boolean {
  return VALID_CATEGORIES.includes(category as TenantHistoryCategory);
}

/**
 * Convertit une catégorie non standardisée ou legacy en catégorie standardisée appropriée
 * @param category La catégorie à convertir
 * @returns Une catégorie standardisée
 */
export function normalizeCategory(category: string): TenantHistoryCategory {
  // Mappings pour les anciennes catégories ou les variantes non standardisées
  const categoryMappings: Record<string, TenantHistoryCategory> = {
    // Variantes des catégories financières
    'payment': 'paiement',
    'late_payment': 'paiement_retard',
    'rent': 'paiement',
    
    // Variantes des catégories liées au bail
    'lease_start': 'debut_bail',
    'lease_end': 'fin_bail',
    'move_in': 'movein',
    'move_out': 'moveout',
    
    // Variantes des catégories d'évaluation
    'review': 'evaluation',
    'behavior': 'comportement',
    'rules': 'respect_regles',
    
    // Variantes des catégories de maintenance
    'repair': 'maintenance',
    'cleaning': 'entretien',
    
    // Variantes des catégories de problèmes
    'issue': 'incident',
    'complaint': 'plainte',
    'dispute': 'litige',
    
    // Variantes des autres catégories
    'contact': 'communication',
    'visit': 'visite',
    'general_info': 'general',
  };
  
  // Vérifier si la catégorie est déjà valide
  if (isValidCategory(category)) {
    return category as TenantHistoryCategory;
  }
  
  // Convertir en utilisant le mapping
  const normalizedCategory = categoryMappings[category.toLowerCase()];
  if (normalizedCategory) {
    return normalizedCategory;
  }
  
  // Si aucune correspondance n'est trouvée, retourner 'general' comme fallback sécurisé
  return 'general';
} 