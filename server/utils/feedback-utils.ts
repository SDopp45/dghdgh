/**
 * Utilitaires pour la gestion des feedbacks et des notations
 */
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '../utils/logger';

// Constantes partagées
export const VALID_FEEDBACK_CATEGORIES = [
  'paiement',
  'entretien',
  'comportement',
  'respect_regles',
  'communication',
  'general'
] as const;

export type FeedbackCategory = typeof VALID_FEEDBACK_CATEGORIES[number];

/**
 * Formate une date en français
 */
export const formatDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd MMMM yyyy', { locale: fr });
  } catch (error) {
    logger.error('Error formatting date:', error);
    return 'date inconnue';
  }
};

/**
 * Ajoute une note de contexte (début/fin de bail) au feedback
 */
export const addLeaseContextToFeedback = (
  feedback: string | null,
  propertyName: string,
  date: Date | string,
  isLeaseStart: boolean
): string => {
  let updatedFeedback = feedback?.trim() || '';
  if (updatedFeedback) {
    updatedFeedback += '\n\n';
  }
  
  const contextText = isLeaseStart 
    ? `Début du bail pour la propriété "${propertyName || 'inconnue'}" le ${formatDate(date)}.`
    : `Fin du bail pour la propriété "${propertyName || 'inconnue'}" le ${formatDate(date)}.`;
  
  return updatedFeedback + contextText;
};

/**
 * Vérifie si une catégorie est valide
 */
export const isValidFeedbackCategory = (category: string): boolean => {
  return VALID_FEEDBACK_CATEGORIES.includes(category as FeedbackCategory);
};

/**
 * Normalise le statut d'un feedback orphelin
 */
export const normalizeFeedbackStatus = (
  feedback: any, 
  isArchiving: boolean = false
) => {
  // Lors de l'archivage, on garde la référence au locataire
  return {
    ...feedback,
    isOrphaned: true,
    tenantId: isArchiving ? feedback.tenantId : null
  };
}; 