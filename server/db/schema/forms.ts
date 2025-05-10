import { pgTable, serial, text, varchar, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Définition basique pour éviter l'erreur d'importation
const links = {
  id: 'id',
  profileId: 'profile_id'
};

// Fonction utilitaire pour créer des tables dans un schéma spécifique
export const createSchemaTable = (schema: string) => {
  // Table des formulaires
  const forms = pgTable(`${schema}.forms`, {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description'),
    fields: jsonb('fields').notNull().$type<FormField[]>(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
  });

  // Table pour lier les formulaires aux liens
  const linkForms = pgTable(`${schema}.link_forms`, {
    id: serial('id').primaryKey(),
    linkId: integer('link_id').notNull(),
    formId: integer('form_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  });

  // Table pour les réponses aux formulaires
  const formResponses = pgTable(`${schema}.form_responses`, {
    id: serial('id').primaryKey(),
    linkId: integer('link_id'),
    formId: integer('form_id'),
    responseData: jsonb('response_data').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow()
  });

  return {
    forms,
    linkForms,
    formResponses
  };
};

// Types pour les champs de formulaire
export type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'checkbox' | 'select';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
}

// Schéma de validation pour les champs de formulaire
export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'textarea', 'email', 'number', 'checkbox', 'select']),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional()
});

// Schéma de validation pour un formulaire complet
export const formSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1)
});

// Fonction pour obtenir les tables pour un client spécifique
export const getClientForms = (clientId: number | string) => {
  const schema = `client_${clientId}`;
  return createSchemaTable(schema);
};

// Instance générique pour les migrations et l'intégration avec createClient
export const forms = pgTable('forms', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  fields: jsonb('fields').notNull().$type<FormField[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const linkForms = pgTable('link_forms', {
  id: serial('id').primaryKey(),
  linkId: integer('link_id').notNull(),
  formId: integer('form_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const formResponses = pgTable('form_responses', {
  id: serial('id').primaryKey(),
  linkId: integer('link_id'),
  formId: integer('form_id'),
  responseData: jsonb('response_data').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
});

// Schémas d'insertion et de sélection Zod pour l'API
export const insertFormSchema = createInsertSchema(forms);
export const selectFormSchema = createSelectSchema(forms);

export const insertFormResponseSchema = createInsertSchema(formResponses);
export const selectFormResponseSchema = createSelectSchema(formResponses); 