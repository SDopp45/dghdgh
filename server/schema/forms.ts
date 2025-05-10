import { 
  integer, 
  pgTable, 
  serial, 
  text, 
  varchar, 
  timestamp, 
  boolean,
  json,
  jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../../shared/schema';
import { links, linkProfiles } from './links';

// Table pour stocker les définitions des formulaires
export const forms = pgTable('forms', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  fields: jsonb('fields').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Table intermédiaire pour lier les formulaires aux liens
export const linkForms = pgTable('link_forms', {
  id: serial('id').primaryKey(),
  linkId: integer('link_id').references(() => links.id, { onDelete: 'cascade' }).notNull(),
  formId: integer('form_id').references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Table pour stocker les réponses aux formulaires
export const formResponses = pgTable('form_responses', {
  id: serial('id').primaryKey(),
  formId: integer('form_id').references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  linkId: integer('link_id').references(() => links.id, { onDelete: 'cascade' }),
  responseData: jsonb('response_data').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Définition des relations
export const formsRelations = relations(forms, ({ many }) => ({
  linkForms: many(linkForms),
  responses: many(formResponses)
}));

export const linkFormsRelations = relations(linkForms, ({ one }) => ({
  link: one(links, {
    fields: [linkForms.linkId],
    references: [links.id]
  }),
  form: one(forms, {
    fields: [linkForms.formId],
    references: [forms.id]
  })
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(forms, {
    fields: [formResponses.formId],
    references: [forms.id]
  }),
  link: one(links, {
    fields: [formResponses.linkId],
    references: [links.id]
  })
})); 