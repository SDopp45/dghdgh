/**
 * Utilitaires pour la manipulation et le formatage de dates
 */
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Types de format pour les dates
 */
export type DateFormat = 
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
 * @param formatType Type de format à utiliser (short, medium, long, full, iso, time, datetime)
 * @returns Date formatée selon le type spécifié
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatType: DateFormat = 'short'
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
        return format(dateObj, 'dd/MM/yyyy', { locale: fr });
    }
  } catch (error) {
    console.error('Erreur de formatage de date:', error);
    return 'Erreur de date';
  }
}

// Fonction pour obtenir le temps relatif (il y a X jours, etc.)
export function getRelativeTime(date: string | Date): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Si la date est invalide, renvoyez un message d'erreur
    if (isNaN(d.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);
    
    if (diffSec < 60) {
      return diffSec <= 0 ? 'à l\'instant' : `il y a ${diffSec} secondes`;
    }
    
    if (diffMin < 60) {
      return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
    }
    
    if (diffHour < 24) {
      return `il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
    }
    
    if (diffDay < 30) {
      return `il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
    }
    
    if (diffMonth < 12) {
      return `il y a ${diffMonth} mois`;
    }
    
    return `il y a ${diffYear} an${diffYear > 1 ? 's' : ''}`;
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return '';
  }
}

// Fonction pour vérifier si une date est dans le passé
export function isPastDate(date: string | Date): boolean {
  if (!date) return false;
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return false;
    }
    
    return d < new Date();
  } catch (error) {
    console.error('Error checking if date is in the past:', error);
    return false;
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
  formatType: DateFormat = 'short'
): string {
  if (!startDate || !endDate) return 'Période indéfinie';
  
  try {
    return `${formatDate(startDate, formatType)} - ${formatDate(endDate, formatType)}`;
  } catch (error) {
    console.error('Erreur de formatage d\'intervalle de dates:', error);
    return 'Erreur de période';
  }
}

// Fonction pour calculer la durée entre deux dates en jours
export function getDurationInDays(startDate: string | Date, endDate: string | Date): number {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    // Conversion en jours et arrondi
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
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
    console.error('Erreur de formatage de date pour input:', error);
    return '';
  }
}

// Export des fonctions de compatibilité pour éviter de casser le code existant
export const formatTransactionDate = (date: string | Date | null): { display: string; iso: string } => {
  try {
    if (!date) {
      throw new Error("Date manquante");
    }
    
    return {
      display: formatDate(date, 'short'),
      iso: formatDate(date, 'iso')
    };
  } catch (error) {
    // Suppression des données sensibles des logs
    console.warn("Erreur de formatage de date");
    const now = new Date();
    return {
      display: formatDate(now, 'short'),
      iso: formatDate(now, 'iso')
    };
  }
};