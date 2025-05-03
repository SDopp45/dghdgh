/**
 * Utilitaires pour les calculs et la gestion des notations de locataires
 */

/**
 * Interface pour les éléments avec notation
 */
export interface ItemWithRating {
  rating: number | null;
  status?: string;
  category?: string;
}

/**
 * Descriptions standardisées des niveaux de notation
 */
export const RATING_DESCRIPTIONS = {
  1: "Insuffisant - Locataire problématique, nombreux incidents",
  2: "Passable - Quelques difficultés, mais gérables",
  3: "Correct - Locataire sans problème majeur",
  4: "Bon - Locataire respectueux et fiable",
  5: "Excellent - Locataire idéal, aucun problème"
};

/**
 * Type pour les valeurs de notation valides
 */
export type ValidRating = 1 | 2 | 3 | 4 | 5;

/**
 * Couleurs associées à chaque niveau de notation
 */
export const RATING_COLORS = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-yellow-500",
  4: "text-lime-500",
  5: "text-green-500"
};

/**
 * Seuils standardisés pour les évaluations
 * Utilisés pour garantir une cohérence entre couleurs et descriptions
 */
export const RATING_THRESHOLDS = {
  LOW: 1.5,    // < 1.5 -> niveau 1
  FAIR: 2.5,   // < 2.5 -> niveau 2
  MEDIUM: 3.5, // < 3.5 -> niveau 3
  GOOD: 4.5,   // < 4.5 -> niveau 4
  // >= 4.5 -> niveau 5
};

/**
 * Vérifie si une valeur est une notation valide
 * @param value Valeur à vérifier
 * @returns True si c'est une notation valide (1-5)
 */
export function isValidRating(value: any): value is ValidRating {
  return value !== null &&
         value !== undefined &&
         typeof value === 'number' &&
         value >= 1 &&
         value <= 5 &&
         Number.isInteger(value);
}

/**
 * Calcule la note moyenne à partir d'un tableau de notations
 * Version simple pour les cas d'usage généraux
 * 
 * @param ratings Tableau d'objets contenant une propriété 'rating'
 * @param defaultValue Valeur par défaut si aucune notation valide n'est trouvée (null par défaut)
 * @returns La moyenne arrondie à une décimale ou la valeur par défaut
 */
export function calculateAverageRating<T extends { rating: number | null }>(
  ratings: T[],
  defaultValue: number | null = null
): number | null {
  if (!ratings || ratings.length === 0) return defaultValue;
  
  // Filtrer les notes nulles, undefined ou hors limites (notes invalides)
  const validRatings = ratings.filter(r => 
    r.rating !== null && 
    r.rating !== undefined && 
    r.rating > 0 && 
    r.rating <= 5
  );
  
  if (validRatings.length === 0) return defaultValue;
  
  const sum = validRatings.reduce((acc, curr) => acc + Number(curr.rating), 0);
  // Arrondir à une décimale avec toFixed puis reconvertir en nombre
  return Number((sum / validRatings.length).toFixed(1));
}

/**
 * Calcule la moyenne des évaluations pour une liste d'éléments d'historique
 * Version avancée avec options de filtrage
 * 
 * @param historyItems - Liste des éléments d'historique avec des évaluations
 * @param options - Options de configuration pour le calcul
 * @returns La moyenne des évaluations arrondie à une décimale, ou null si aucune évaluation valide
 */
export function calculateDetailedAverageRating(
  historyItems: ItemWithRating[] = [],
  options: {
    includeArchived?: boolean;  // Inclure les entrées archivées
    onlyCategories?: string[];  // Filtrer par catégories spécifiques
    excludeCategories?: string[]; // Exclure certaines catégories
    decimals?: number;          // Nombre de décimales pour l'arrondi (défaut: 1)
  } = {}
): number | null {
  const {
    includeArchived = false,
    onlyCategories = [],
    excludeCategories = [],
    decimals = 1
  } = options;

  // Filtrer les éléments qui ont une notation valide
  const validItems = historyItems.filter(item => {
    // Vérifier si la notation existe et est un nombre valide
    if (item.rating === undefined || item.rating === null || item.rating <= 0 || item.rating > 5) return false;
    
    // Vérifier le statut si on n'inclut pas les archives
    if (!includeArchived && item.status === 'archived') return false;
    
    // Filtrer par catégories incluses si spécifié
    if (onlyCategories.length > 0 && item.category && !onlyCategories.includes(item.category)) {
      return false;
    }
    
    // Exclure certaines catégories si spécifié
    if (excludeCategories.length > 0 && item.category && excludeCategories.includes(item.category)) {
      return false;
    }
    
    return true;
  });

  // Retourner null si aucun élément valide
  if (validItems.length === 0) return null;

  // Calculer la moyenne
  const sum = validItems.reduce((acc, item) => acc + (item.rating || 0), 0);
  const average = sum / validItems.length;
  
  // Arrondir à la précision demandée
  const factor = Math.pow(10, decimals);
  return Math.round(average * factor) / factor;
}

/**
 * Convertit une note numérique en description textuelle
 * @param rating Note entre 1 et 5 (ou null)
 * @returns Description textuelle correspondante
 */
export function getRatingDescription(rating: number | null): string {
  if (rating === null || rating === undefined) return 'Non évalué';
  
  // Utiliser les mêmes seuils que pour les couleurs au lieu d'arrondir
  if (rating < RATING_THRESHOLDS.LOW) return RATING_DESCRIPTIONS[1];
  if (rating < RATING_THRESHOLDS.FAIR) return RATING_DESCRIPTIONS[2];
  if (rating < RATING_THRESHOLDS.MEDIUM) return RATING_DESCRIPTIONS[3];
  if (rating < RATING_THRESHOLDS.GOOD) return RATING_DESCRIPTIONS[4];
  return RATING_DESCRIPTIONS[5];
}

/**
 * Obtient la couleur CSS associée à une note
 * @param rating Note entre 1 et 5 (ou null)
 * @returns Classe CSS correspondante
 */
export function getRatingColorClass(rating: number | null): string {
  if (rating === null || rating === undefined) return 'text-gray-400';
  
  if (rating < RATING_THRESHOLDS.LOW) return RATING_COLORS[1];
  if (rating < RATING_THRESHOLDS.FAIR) return RATING_COLORS[2];
  if (rating < RATING_THRESHOLDS.MEDIUM) return RATING_COLORS[3];
  if (rating < RATING_THRESHOLDS.GOOD) return RATING_COLORS[4];
  return RATING_COLORS[5];
}

/**
 * Alias pour getRatingDescription pour compatibilité avec l'ancienne API
 */
export const getRatingLabel = getRatingDescription; 