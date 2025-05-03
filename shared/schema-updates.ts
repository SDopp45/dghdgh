/**
 * Modifications recommandées pour le schéma de la base de données
 * 
 * Ce fichier contient les modifications suggérées pour améliorer
 * le schéma de la base de données, notamment pour corriger les
 * problèmes liés aux montants stockés comme chaînes et standardiser
 * les types de données pour les feedbacks.
 */

import { pgTable, serial, text, boolean, timestamp, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Import des tables existantes pour les références
import { users, properties, tenants } from '@shared/schema';

/**
 * 1. Modification de la table tenants pour utiliser decimal pour les montants
 */
export const tenantsUpdated = pgTable('tenants', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  leaseStart: timestamp('lease_start').notNull(),
  leaseEnd: timestamp('lease_end').notNull(),
  // Convertir les montants de string à decimal pour faciliter les calculs
  rentAmount: decimal('rent_amount', { precision: 10, scale: 2 }).notNull(),
  leaseType: text('lease_type').notNull(),
  active: boolean('active').default(true),
  leaseStatus: text('lease_status').default('actif'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
});

/**
 * 2. Création d'un enum pour standardiser les catégories de feedback
 */
export const feedbackCategoryEnum = pgEnum('feedback_category', [
  'paiement',
  'entretien',
  'comportement',
  'respect_regles',
  'communication',
  'general'
]);

/**
 * 3. Mise à jour de la table feedbackHistory pour utiliser l'enum
 */
export const feedbackHistoryUpdated = pgTable('feedback_history', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id),
  rating: integer('rating'),
  feedback: text('feedback'),
  // Utiliser l'enum pour standardiser les catégories
  category: feedbackCategoryEnum('category').default('general'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  tenantFullName: text('tenant_full_name'),
  isOrphaned: boolean('is_orphaned').default(false),
  originalUserId: integer('original_user_id'),
  // Ajout des champs pour traçabilité
  updatedAt: timestamp('updated_at'),
  updatedBy: integer('updated_by').references(() => users.id)
});

/**
 * 4. Mise à jour de la table transactions pour standardiser les montants
 */
export const transactionsUpdated = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  propertyId: integer('property_id').notNull().references(() => properties.id),
  tenantId: integer('tenant_id').references(() => tenants.id),
  type: text('type').notNull(), // 'income' ou 'expense'
  category: text('category').notNull(),
  // Convertir les montants de string à decimal
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  status: text('status').default('pending'),
  paymentMethod: text('payment_method'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
});

/**
 * Migration pour convertir les montants de string à decimal
 * 
 * Cette migration doit être exécutée pour convertir les données existantes
 * 
 * ```sql
 * -- Exemple de SQL pour convertir les montants
 * ALTER TABLE tenants 
 *   ADD COLUMN rent_amount_decimal DECIMAL(10, 2);
 * 
 * UPDATE tenants
 *   SET rent_amount_decimal = CAST(rent_amount AS DECIMAL(10, 2));
 * 
 * ALTER TABLE tenants
 *   DROP COLUMN rent_amount;
 * 
 * ALTER TABLE tenants
 *   RENAME COLUMN rent_amount_decimal TO rent_amount;
 * ```
 */ 