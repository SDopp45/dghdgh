/**
 * Utilitaires pour la manipulation et le formatage de dates côté serveur
 */
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from './logger';

/**
 * Types de format pour les dates
 */
type DateFormat = 
  | 'short'        // 01/01/2023
  | 'medium'       // 01 janv. 2023
  | 'long'         // 01 janvier 2023
  | 'full'         // lundi 01 janvier 2023
  | 'iso'          // 2023-01-01
  | 'time'         // 14:30
  | 'datetime'     // 01/01/2023 14:30
  | 'pretty';      // aujourd'hui, hier, etc.

/**
 * Fonction standard pour formater une date
 * @param date Date à formater (string, Date ou null)
 * @param formatType Type de format à utiliser
 * @returns Date formatée selon le type spécifié
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatType: DateFormat = 'long'
): string {
  // Gestion des valeurs null/undefined
  if (!date) return 'Date inconnue';
  
  try {
    // Conversion de la date en objet Date
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Si le format est DD/MM/YYYY
      if (date.includes('/')) {
        const [day, month, year] = date.split('/').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        // Sinon, on suppose que c'est un format ISO
        dateObj = parseISO(date);
      }
    } else {
      throw new Error('Format de date non supporté');
    }
    
    // Vérification de la validité de la date
    if (!isValid(dateObj)) {
      return 'Date invalide';
    }
    
    // Formatage selon le type demandé
    switch (formatType) {
      case 'short':
        return format(dateObj, 'dd/MM/yyyy', { locale: fr });
      case 'medium':
        return format(dateObj, 'dd MMM yyyy', { locale: fr });
      case 'long':
        return format(dateObj, 'dd MMMM yyyy', { locale: fr });
      case 'full':
        return format(dateObj, 'EEEE dd MMMM yyyy', { locale: fr });
      case 'iso':
        return format(dateObj, 'yyyy-MM-dd');
      case 'time':
        return format(dateObj, 'HH:mm', { locale: fr });
      case 'datetime':
        return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: fr });
      case 'pretty':
        return format(dateObj, 'Pp', { locale: fr }); // Format "prettytime" localisé
      default:
        return format(dateObj, 'dd MMMM yyyy', { locale: fr });
    }
  } catch (error) {
    logger.error('Erreur de formatage de date:', error);
    return 'date inconnue';
  }
}

/**
 * Fonction pour formater un intervalle de dates
 * @param startDate Date de début
 * @param endDate Date de fin
 * @param formatType Type de format à utiliser
 * @returns Intervalle formaté (ex: "01/01/2023 - 31/01/2023")
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  formatType: DateFormat = 'long'
): string {
  if (!startDate || !endDate) return 'Période indéfinie';
  
  try {
    return `${formatDate(startDate, formatType)} - ${formatDate(endDate, formatType)}`;
  } catch (error) {
    logger.error('Erreur de formatage d\'intervalle de dates:', error);
    return 'Erreur de période';
  }
}

/**
 * Fonction pour formater une date pour un champ input
 * @param date Date à formater
 * @returns Date au format YYYY-MM-DD
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    return formatDate(date, 'iso');
  } catch (error) {
    logger.error('Erreur de formatage de date pour input:', error);
    return '';
  }
} 