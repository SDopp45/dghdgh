/**
 * Utilitaires pour la gestion des catégories dans l'historique des locataires
 */

import { 
  FileText, 
  Building2, 
  User, 
  AlertCircle, 
  MessageSquare, 
  Clock,
  BadgePlus,
  BadgeMinus,
  CalendarClock,
  Home,
  Wrench,
  AlertTriangle,
  HelpCircle,
  Star,
  CreditCard,
  ShieldCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React from "react";
import { TenantHistoryCategory } from '@/types/tenant-history';

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

export type CategoryIconType = 
  | 'file-text'
  | 'badge-plus'
  | 'badge-minus'
  | 'calendar-clock'
  | 'user'
  | 'alert-circle'
  | 'wrench'
  | 'alert-triangle'
  | 'message-square'
  | 'home'
  | 'help-circle';

/**
 * Obtient le type d'icône correspondant à une catégorie
 * @param category La catégorie
 * @returns Le type d'icône à utiliser
 */
export function getCategoryIconType(category: string): CategoryIconType {
  switch (category) {
    // Catégories financières
    case 'paiement':
    case 'paiement_retard':
      return 'file-text';
    
    // Catégories liées au bail
    case 'debut_bail':
    case 'movein':
      return 'badge-plus';
    case 'fin_bail':
    case 'moveout':
      return 'badge-minus';
    
    // Catégories d'évaluation
    case 'evaluation':
      return 'calendar-clock';
    case 'comportement':
      return 'user';
    case 'respect_regles':
      return 'alert-circle';
    
    // Catégories de maintenance
    case 'entretien':
    case 'maintenance':
      return 'wrench';
    
    // Catégories de problèmes
    case 'incident':
    case 'plainte':
    case 'litige':
      return 'alert-triangle';
    
    // Autres catégories
    case 'communication':
      return 'message-square';
    case 'visite':
      return 'home';
    
    // Fallback
    default:
      return 'help-circle';
  }
}

/**
 * Obtient la classe CSS pour la couleur de fond d'un badge de catégorie
 * @param category La catégorie
 * @returns La classe CSS correspondante
 */
export function getCategoryBadgeClass(category: string): string {
  switch (category) {
    // Catégories financières
    case 'paiement':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'paiement_retard':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    
    // Catégories liées au bail
    case 'debut_bail':
    case 'movein':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'fin_bail':
    case 'moveout':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    
    // Catégories d'évaluation
    case 'evaluation':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'comportement':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'respect_regles':
      return 'bg-red-50 text-red-700 border-red-200';
    
    // Catégories de maintenance
    case 'entretien':
    case 'maintenance':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    
    // Catégories de problèmes
    case 'incident':
    case 'plainte':
    case 'litige':
      return 'bg-red-50 text-red-700 border-red-200';
    
    // Autres catégories
    case 'communication':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'visite':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    
    // Fallback
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
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

/**
 * Options pour le sélecteur de catégories avec affichage visuel - sans JSX
 */
export const CATEGORY_OPTIONS = [
  {
    id: 'general',
    label: 'Général',
    iconName: 'Star',
    color: 'border-amber-100 text-amber-700 bg-amber-50',
    activeColor: 'border-amber-300 text-amber-800 bg-amber-100'
  },
  {
    id: 'paiement',
    label: 'Paiement',
    iconName: 'CreditCard',
    color: 'border-green-100 text-green-700 bg-green-50',
    activeColor: 'border-green-300 text-green-800 bg-green-100'
  },
  {
    id: 'incident',
    label: 'Incident',
    iconName: 'AlertCircle',
    color: 'border-red-100 text-red-700 bg-red-50',
    activeColor: 'border-red-300 text-red-800 bg-red-100'
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    iconName: 'Wrench',
    color: 'border-blue-100 text-blue-700 bg-blue-50',
    activeColor: 'border-blue-300 text-blue-800 bg-blue-100'
  },
  {
    id: 'communication',
    label: 'Communication',
    iconName: 'MessageSquare',
    color: 'border-indigo-100 text-indigo-700 bg-indigo-50',
    activeColor: 'border-indigo-300 text-indigo-800 bg-indigo-100'
  },
  {
    id: 'litige',
    label: 'Légal',
    iconName: 'ShieldCheck',
    color: 'border-purple-100 text-purple-700 bg-purple-50',
    activeColor: 'border-purple-300 text-purple-800 bg-purple-100'
  }
]; 