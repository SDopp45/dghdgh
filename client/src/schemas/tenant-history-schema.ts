/**
 * Schémas de validation pour l'historique des locataires
 * Ce fichier définit les schémas Zod et les types dérivés pour la validation des formulaires
 * d'historique des locataires.
 */

import { z } from "zod";
import { VALID_CATEGORIES } from "@/utils/category-utils";

// Définition des statuts valides
const VALID_STATUSES = ['active', 'archived', 'orphaned'] as const;

/**
 * Schéma de validation pour le formulaire d'historique des locataires
 */
export const tenantHistoryFormSchema = z.object({
  // Identifiants
  tenantId: z.number().nullable(),
  propertyId: z.number().nullable(),

  // Évaluation - note de 1 à 5 ou null, jamais 0
  rating: z.number().min(1).max(5).nullable().transform(val => 
    (val !== null && (val < 1 || val > 5)) ? null : val
  ),
  
  // Contenu
  feedback: z.string().nullable().default(null).transform(val => 
    val === '' ? null : val
  ),
  
  // Catégorie - uniquement valeurs standardisées
  category: z.enum(VALID_CATEGORIES as [string, ...string[]]).default("general"),
  
  // Méta-données
  tenantFullName: z.string().nullable().optional(),
  
  // Types d'événements (pour compatibilité)
  eventType: z.string(),
  eventSeverity: z.number().default(0),
  eventDetails: z.record(z.unknown()).default({}),
  
  // Informations sur le bail
  bailStatus: z.string().nullable().optional(),
  bailId: z.number().nullable().optional(),
  
  // Propriété
  propertyName: z.string().nullable().optional(),
  
  // Date et statut
  date: z.date().default(() => new Date()),
  status: z.enum(VALID_STATUSES).default("active"),
  
  // Pièces jointes et tags
  documents: z.array(z.instanceof(File)).default([]),
  eventTags: z.array(z.string()).default([]),
});

/**
 * Type dérivé du schéma pour l'utilisation avec react-hook-form
 */
export type TenantHistoryFormValues = z.infer<typeof tenantHistoryFormSchema>;

/**
 * Schéma de validation pour le formulaire de réassignation d'historique
 */
export const tenantHistoryReassignSchema = z.object({
  tenantId: z.number().optional(),
  tenantName: z.string().optional(),
})
.refine(data => data.tenantId !== undefined || data.tenantName !== undefined, {
  message: "Vous devez fournir soit un ID de locataire, soit un nom de locataire."
});

/**
 * Type dérivé du schéma de réassignation
 */
export type TenantHistoryReassignValues = z.infer<typeof tenantHistoryReassignSchema>;

/**
 * Convertit les données validées en FormData pour l'envoi au serveur
 * @param data Données validées conformes au schéma
 * @returns Objet FormData prêt à être envoyé
 */
export function convertToFormData(data: TenantHistoryFormValues): FormData {
  const formData = new FormData();
  
  // Traitement des champs primitifs
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    
    if (key === 'date' && value instanceof Date) {
      formData.append(key, value.toISOString());
    } else if (key === 'documents' && Array.isArray(value)) {
      Array.from(value as File[]).forEach((file) => {
        formData.append('documents', file);
      });
    } else if (key === 'eventTags' && Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (key === 'eventDetails' && typeof value === 'object') {
      formData.append('eventDetails', JSON.stringify(value || {}));
    } else if (typeof value !== 'object') {
      formData.append(key, String(value));
    }
  });
  
  return formData;
}

/**
 * Valide les données d'historique des locataires et retourne les données validées
 * @param data Données brutes à valider
 * @returns Données validées conformes au schéma
 * @throws Erreur si les données ne sont pas valides
 */
export function validateTenantHistoryData(data: unknown): TenantHistoryFormValues {
  return tenantHistoryFormSchema.parse(data);
}

/**
 * Vérifie si les données d'historique des locataires sont valides sans lancer d'erreur
 * @param data Données brutes à valider
 * @returns Résultat de validation avec succès ou erreurs
 */
export function safeParseTenantHistoryData(data: unknown) {
  return tenantHistoryFormSchema.safeParse(data);
} 