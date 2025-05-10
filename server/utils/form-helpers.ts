import { z } from 'zod';
import logger from './logger';
import { sql } from 'drizzle-orm';

/**
 * Nettoie et sanitise les données de formulaire pour éviter les injections
 * 
 * @param formData Données brutes du formulaire
 * @returns Données sanitisées
 */
export function sanitizeFormData(formData: any): Record<string, any> {
  // Si les données sont undefined ou null, retourner un objet vide
  if (!formData) {
    return {};
  }
  
  // Si les données sont déjà une chaîne JSON, essayer de les parser
  if (typeof formData === 'string') {
    try {
      formData = JSON.parse(formData);
    } catch (error) {
      logger.warn('Impossible de parser les données JSON du formulaire:', error);
      return {};
    }
  }
  
  const sanitized: Record<string, any> = {};
  
  // Parcourir toutes les clés de l'objet pour sanitiser les valeurs
  Object.keys(formData).forEach(key => {
    const value = formData[key];
    
    // Traitement en fonction du type de valeur
    if (typeof value === 'string') {
      // Supprimer les caractères potentiellement dangereux
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      // Les nombres et booléens sont sûrs tels quels
      sanitized[key] = value;
    } else if (value === null) {
      // Garder null tel quel
      sanitized[key] = null;
    } else if (Array.isArray(value)) {
      // Pour les tableaux, sanitiser chaque élément
      sanitized[key] = value.map(item => 
        typeof item === 'string' 
          ? item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+=/gi, '')
          : item
      );
    } else if (typeof value === 'object') {
      // Pour les objets, appliquer récursivement
      sanitized[key] = sanitizeFormData(value);
    } else {
      // Si le type n'est pas géré, convertir en chaîne
      sanitized[key] = String(value);
    }
  });
  
  return sanitized;
}

/**
 * Récupère les colonnes d'une table pour vérifier sa structure
 * 
 * @param db Instance de base de données
 * @param schema Nom du schéma
 * @param table Nom de la table
 * @returns Tableau des noms de colonnes
 */
export async function getTableColumns(db: any, schema: string, table: string): Promise<string[]> {
  try {
    const columnsQuery = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = ${schema} 
          AND table_name = ${table}`
    );
    
    return columnsQuery.rows.map((row: any) => row.column_name as string);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des colonnes pour ${schema}.${table}:`, error);
    return [];
  }
}

/**
 * Valide un champ de formulaire avec un schéma Zod spécifique au type
 * 
 * @param field Définition du champ avec type et contraintes
 * @param value Valeur à valider
 * @returns Résultat de validation {success, value, error}
 */
export function validateFormField(field: any, value: any): { success: boolean; value?: any; error?: string } {
  try {
    // Fonction pour valider un email
    const validateEmail = (val: any) => {
      const emailSchema = z.string().email(field.errorMessage || 'Email invalide');
      return field.required ? emailSchema : emailSchema.optional();
    };
    
    // Fonction pour valider un nombre
    const validateNumber = (val: any) => {
      let numberSchema = z.coerce.number({
        invalid_type_error: field.errorMessage || 'Doit être un nombre'
      });
      
      if (typeof field.min === 'number') {
        numberSchema = numberSchema.min(field.min, field.minErrorMessage || `Doit être au moins ${field.min}`);
      }
      
      if (typeof field.max === 'number') {
        numberSchema = numberSchema.max(field.max, field.maxErrorMessage || `Doit être au maximum ${field.max}`);
      }
      
      return field.required ? numberSchema : numberSchema.optional();
    };
    
    // Fonction pour valider un texte
    const validateText = (val: any) => {
      let textSchema = z.string();
      
      if (typeof field.minLength === 'number') {
        textSchema = textSchema.min(field.minLength, field.minErrorMessage || `Doit contenir au moins ${field.minLength} caractères`);
      }
      
      if (typeof field.maxLength === 'number') {
        textSchema = textSchema.max(field.maxLength, field.maxErrorMessage || `Doit contenir au maximum ${field.maxLength} caractères`);
      }
      
      return field.required ? textSchema : textSchema.optional();
    };
    
    // Fonction pour valider une case à cocher
    const validateCheckbox = (val: any) => {
      const checkboxSchema = z.boolean();
      
      if (field.required) {
        return checkboxSchema.refine(val => val === true, {
          message: field.errorMessage || 'Ce champ est requis',
        });
      }
      
      return checkboxSchema;
    };
    
    // Fonction pour valider une sélection
    const validateSelect = (val: any) => {
      let selectSchema = z.string();
      
      if (Array.isArray(field.options) && field.options.length > 0) {
        selectSchema = selectSchema.refine((val) => field.options.includes(val), {
          message: field.errorMessage || 'Option non valide'
        });
      }
      
      return field.required ? selectSchema : selectSchema.optional();
    };
    
    // Sélectionner la fonction de validation appropriée
    let validationResult;
    
    switch (field.type) {
      case 'email':
        validationResult = validateEmail(value).safeParse(value);
        break;
      case 'number':
        validationResult = validateNumber(value).safeParse(value);
        break;
      case 'checkbox':
        validationResult = validateCheckbox(value).safeParse(value);
        break;
      case 'select':
        validationResult = validateSelect(value).safeParse(value);
        break;
      case 'textarea':
      case 'text':
      default:
        validationResult = validateText(value).safeParse(value);
        break;
    }
    
    if (validationResult.success) {
      return { success: true, value: validationResult.data };
    } else {
      const error = validationResult.error.errors[0]?.message || 'Valeur invalide';
      return { success: false, error };
    }
  } catch (error) {
    logger.error('Erreur de validation de champ:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur de validation' 
    };
  }
} 