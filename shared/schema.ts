import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, numeric, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { PropertyType, PropertyStatus, EnergyClass } from "./types";
import { TRANSACTION_STATUS } from '../server/constants/transaction-status';
import { TRANSACTION_CATEGORIES } from '../server/constants/transaction-categories';

// Export des tables d'analyse financière
export {
  propertyFinancialSnapshots,
  financialEntries,
  propertyFinancialGoals,
  propertyFinancialSnapshotsRelations,
  financialEntriesRelations,
  propertyFinancialGoalsRelations,
} from "./financial-schema";

// Export des tables de liens personnalisés (Linktree)
export {
  linkProfiles,
  links,
  linkProfilesRelations,
  linksRelations
} from "../server/schema/links";

// Property image type
export const propertyImageSchema = z.object({
  id: z.number(),
  filename: z.string(),
  order: z.number()
});

export type PropertyImage = z.infer<typeof propertyImageSchema>;

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', { enum: ['info', 'warning', 'alert'] }).notNull(),
  relatedTo: text('related_to', { enum: ['property', 'tenant', 'maintenance'] }),
  relatedId: integer('related_id'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Create insert schema for notifications
export const insertNotificationSchema = createInsertSchema(notifications)
  .extend({
    type: z.enum(['info', 'warning', 'alert']),
    relatedTo: z.enum(['property', 'tenant', 'maintenance']).optional(),
    relatedId: z.number().int().positive().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
  });

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["apartment", "house", "commercial", "parking", "garage", "land", "office", "building", "storage"]
  }).notNull(),
  units: integer("units").default(0),
  bedrooms: integer("bedrooms").default(0),
  floors: integer("floors").default(0),
  bathrooms: integer("bathrooms").default(0),
  toilets: integer("toilets").default(0),
  energyClass: text("energy_class", {
    enum: ["A", "B", "C", "D", "E", "F", "G"]
  }),
  energyEmissions: text("energy_emissions", {
    enum: ["A", "B", "C", "D", "E", "F", "G"]
  }),
  livingArea: integer("living_area").default(0),
  landArea: integer("land_area").default(0),
  hasParking: boolean("has_parking").default(false),
  hasTerrace: boolean("has_terrace").default(false),
  hasGarage: boolean("has_garage").default(false),
  hasOutbuilding: boolean("has_outbuilding").default(false),
  hasBalcony: boolean("has_balcony").default(false),
  hasElevator: boolean("has_elevator").default(false),
  hasCellar: boolean("has_cellar").default(false),
  hasGarden: boolean("has_garden").default(false),
  isNewConstruction: boolean("is_new_construction").default(false),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).default("0"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).default("0"),
  monthlyExpenses: decimal("monthly_expenses", { precision: 10, scale: 2 }),
  loanAmount: decimal("loan_amount", { precision: 10, scale: 2 }).default("0"),
  monthlyLoanPayment: decimal("monthly_loan_payment", { precision: 10, scale: 2 }).default("0"),
  loanDuration: integer("loan_duration"),
  status: text("status", {
    enum: ["available", "rented", "maintenance", "sold"]
  }).default("available"),
  constructionYear: integer("construction_year"),
  purchaseDate: timestamp("purchase_date"),
  area: integer("area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  images: jsonb("images").$type<PropertyImage[]>().default([]),
  rooms: integer("rooms").default(0)
});

// Create insert schema
export const insertPropertySchema = createInsertSchema(properties)
  .extend({
    name: z.string().min(1, "Le nom est requis"),
    address: z.string().min(1, "L'adresse est requise"),
    type: z.enum(["apartment", "house", "commercial", "parking", "garage", "land", "office", "building", "storage"]),
    energyClass: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
    status: z.enum(["available", "rented", "maintenance", "sold"]).default("available"),
    images: z.array(propertyImageSchema).default([]),
    rooms: z.number().int().min(0).default(0),
    description: z.string().optional(),
    purchasePrice: z.union([z.string(), z.number()]).transform(val => val.toString()),
    monthlyRent: z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
    monthlyExpenses: z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
    loanAmount: z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
    monthlyLoanPayment: z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
    loanDuration: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
    hasBalcony: z.boolean().default(false),
    hasElevator: z.boolean().default(false),
    hasCellar: z.boolean().default(false),
    hasGarden: z.boolean().default(false),
    isNewConstruction: z.boolean().default(false),
    purchaseDate: z.union([
      z.string(),
      z.date(),
      z.undefined()
    ]).transform(val => {
      if (!val) return undefined;
      if (val instanceof Date) return val;
      return new Date(val);
    }).optional()
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export type Property = typeof properties.$inferSelect;


// Property history table to track changes
export const propertyHistory = pgTable("property_history", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changeType: text("change_type", {
    enum: ["update", "modification", "renovation"]
  }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({})
});

// Property coordinates table
export const propertyCoordinates = pgTable("property_coordinates", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Property renovations and work tracking
export const propertyWorks = pgTable("property_works", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["renovation", "repair", "improvement", "maintenance"]
  }).notNull(),
  status: text("status", {
    enum: ["planned", "in_progress", "completed", "cancelled"]
  }).default("planned").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  contractor: text("contractor"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"]
  }).default("medium"),
  documents: jsonb("documents").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Add relations
export const propertyHistoryRelations = relations(propertyHistory, ({ one }) => ({
  property: one(properties, {
    fields: [propertyHistory.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyHistory.userId],
    references: [users.id],
  })
}));

export const propertyCoordinatesRelations = relations(propertyCoordinates, ({ one }) => ({
  property: one(properties, {
    fields: [propertyCoordinates.propertyId],
    references: [properties.id],
  })
}));

export const propertyWorksRelations = relations(propertyWorks, ({ one }) => ({
  property: one(properties, {
    fields: [propertyWorks.propertyId],
    references: [properties.id],
  })
}));

// Create insert schemas
export const insertPropertyHistorySchema = createInsertSchema(propertyHistory)
  .extend({
    changeType: z.enum(["update", "modification", "renovation"]),
    metadata: z.record(z.unknown()).default({})
  })
  .omit({
    id: true,
    createdAt: true
  });

export const insertPropertyCoordinatesSchema = createInsertSchema(propertyCoordinates)
  .extend({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
  .omit({
    id: true,
    updatedAt: true
  });

export const insertPropertyWorksSchema = createInsertSchema(propertyWorks)
  .extend({
    type: z.enum(["renovation", "repair", "improvement", "maintenance"]),
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]).default("planned"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    documents: z.array(z.string()).default([]),
    estimatedCost: z.union([z.string(), z.number()]).transform(val => val.toString()).optional(),
    actualCost: z.union([z.string(), z.number()]).transform(val => val.toString()).optional()
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

// Export types
export type PropertyHistory = typeof propertyHistory.$inferSelect;
export type InsertPropertyHistory = z.infer<typeof insertPropertyHistorySchema>;
export type PropertyCoordinates = typeof propertyCoordinates.$inferSelect;
export type InsertPropertyCoordinates = z.infer<typeof insertPropertyCoordinatesSchema>;
export type PropertyWorks = typeof propertyWorks.$inferSelect;
export type InsertPropertyWorks = z.infer<typeof insertPropertyWorksSchema>;

// Tables pour l'assistant IA
export const aiMessages = pgTable('ai_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).default('user').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  conversationId: integer('conversation_id').references(() => aiConversations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isUrgent: boolean('is_urgent').default(false)
});

export const aiConversations = pgTable('ai_conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  status: text('status', { enum: ['active', 'closed'] }).default('active').notNull(),
  category: text('category', { 
    enum: ['general', 'maintenance', 'lease', 'payment', 'other'] 
  }).default('general').notNull(),
  context: jsonb('context').$type<Record<string, any>>().default({})
});

export const aiSuggestions = pgTable('ai_suggestions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  propertyId: integer('property_id').references(() => properties.id),
  type: text('type', { 
    enum: ['rent_price', 'maintenance', 'tenant_management', 'investment'] 
  }).notNull(),
  suggestion: text('suggestion').notNull(),
  data: jsonb('data').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending')
});

// Relations pour les tables IA
export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  user: one(users, {
    fields: [aiMessages.userId],
    references: [users.id]
  }),
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id]
  })
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id]
  }),
  messages: many(aiMessages)
}));

export const aiSuggestionsRelations = relations(aiSuggestions, ({ one }) => ({
  user: one(users, {
    fields: [aiSuggestions.userId],
    references: [users.id]
  }),
  property: one(properties, {
    fields: [aiSuggestions.propertyId],
    references: [properties.id]
  })
}));

// Schémas d'insertion pour les tables IA
export const insertAiMessageSchema = createInsertSchema(aiMessages)
  .omit({
    id: true,
    createdAt: true
  });

export const insertAiConversationSchema = createInsertSchema(aiConversations)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

export const insertAiSuggestionSchema = createInsertSchema(aiSuggestions)
  .omit({
    id: true,
    createdAt: true
  });

// Types pour les tables IA
export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = typeof aiMessages.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;
export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAiSuggestion = typeof aiSuggestions.$inferInsert;

// Documents table avec type explicite
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type', {
    enum: ['contract', 'lease', 'invoice', 'form', 'maintenance', 'other']
  }).default('lease').notNull(),
  filePath: text('file_path').notNull(),
  originalName: text('original_name').notNull(),
  template: boolean('template').default(false),
  userId: integer('user_id').notNull(),
  folderId: integer('folder_id'),
  parentId: integer('parent_id'),
  templateId: integer('template_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  formData: jsonb('form_data').$type<Record<string, any>>().default({}),
  content: jsonb('content').$type<Record<string, any>>().default({}),
  theme: jsonb('theme').$type<Record<string, any>>().default({})
});

// Folders table avec type explicite
export const folders = pgTable('folders', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Users table with all required fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  role: text("role", { enum: ["admin", "manager", "tenant"] }).default("tenant"),
  profileImage: text("profile_image"),
  archived: boolean("archived").default(false),
  accountType: text("account_type", { enum: ["individual", "enterprise"] }).default("individual"),
  parentAccountId: integer("parent_account_id"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Create insert schema for users with proper validation
export const insertUserSchema = createInsertSchema(users)
  .extend({
    username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    email: z.string().email("Format d'email invalide").optional(),
    phoneNumber: z.string()
      .regex(/^(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})$/, "Numéro de téléphone invalide")
      .optional(),
    role: z.enum(["admin", "manager", "tenant"]).default("tenant"),
    accountType: z.enum(["individual", "enterprise"]).default("individual"),
    settings: z.record(z.unknown()).default({}),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    archived: true,
    profileImage: true,
    parentAccountId: true
  });


// Historique des locataires
export const tenantHistory = pgTable("tenant_history", {
  id: serial("id").primaryKey(),
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
  category: text("category", { 
    enum: [
      // Catégories financières
      "paiement",          // Paiement régulier du loyer
      "paiement_retard",   // Retard de paiement

      // Catégories liées au bail
      "debut_bail",        // Début de bail / emménagement
      "fin_bail",          // Fin de bail / déménagement
      "movein",            // Arrivée du locataire (alias pour debut_bail)
      "moveout",           // Départ du locataire (alias pour fin_bail)
      
      // Catégories d'évaluation
      "evaluation",        // Évaluation générale du locataire
      "comportement",      // Comportement du locataire
      "respect_regles",    // Respect du règlement
      
      // Catégories de maintenance
      "entretien",         // Entretien régulier
      "maintenance",       // Travaux de maintenance
      
      // Catégories de problèmes
      "incident",          // Incidents divers
      "plainte",          // Plaintes formelles
      "litige",           // Litiges juridiques
      
      // Autres catégories
      "communication",     // Communication avec le locataire
      "visite",            // Visite de la propriété
      "general"            // Catégorie par défaut
    ]
  }).default("general"),
  tenantFullName: text("tenant_full_name").notNull(),
  eventType: text("event_type"),
  eventSeverity: integer("event_severity"),
  eventDetails: jsonb("event_details").$type<Record<string, any>>(),
  documents: text("documents").array(),
  bailStatus: text("bail_status"),
  bailId: integer("bail_id"),
  propertyName: text("property_name"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by")
});

// Pour assurer la rétrocompatibilité pendant la migration
export const feedbackHistory = tenantHistory;

// Add relations for feedback history
export const feedbackHistoryRelations = relations(feedbackHistory, ({ one }) => ({
  creator: one(users, {
    fields: [feedbackHistory.createdBy],
    references: [users.id],
  })
}));

// Créer des relations spécifiques pour tenantHistory
export const tenantHistoryRelations = relations(tenantHistory, ({ one }) => ({
  creator: one(users, {
    fields: [tenantHistory.createdBy],
    references: [users.id],
  })
}));

// Schéma d'insertion pour l'historique des locataires
export const insertTenantHistorySchema = createInsertSchema(tenantHistory)
  .extend({
    rating: z.number().int().min(1).max(5),
    feedback: z.string().optional(),
    category: z.enum([
      // Catégories financières
      "paiement",          // Paiement régulier du loyer
      "paiement_retard",   // Retard de paiement

      // Catégories liées au bail
      "debut_bail",        // Début de bail / emménagement
      "fin_bail",          // Fin de bail / déménagement
      "movein",            // Arrivée du locataire (alias pour debut_bail)
      "moveout",           // Départ du locataire (alias pour fin_bail)
      
      // Catégories d'évaluation
      "evaluation",        // Évaluation générale du locataire
      "comportement",      // Comportement du locataire
      "respect_regles",    // Respect du règlement
      
      // Catégories de maintenance
      "entretien",         // Entretien régulier
      "maintenance",       // Travaux de maintenance
      
      // Catégories de problèmes
      "incident",          // Incidents divers
      "plainte",           // Plaintes formelles
      "litige",            // Litiges juridiques
      
      // Autres catégories
      "communication",     // Communication avec le locataire
      "visite",            // Visite de la propriété
      "general"            // Catégorie par défaut
    ]).default("general"),
    tenantFullName: z.string().min(1), // Rendu obligatoire
    eventType: z.enum([
      // Types d'événements principaux
      "evaluation",        // Évaluation périodique
      "incident",          // Incident
      "paiement",          // Relatif au paiement
      "maintenance",       // Maintenance ou réparation
      "plainte",           // Plainte formelle
      "litige",            // Litige ou différend juridique
      "visite",            // Visite de l'appartement
      "fin_bail",          // Fin de bail / déménagement
      "debut_bail",        // Début de bail / emménagement
      
      // Types secondaires (pour la compatibilité)
      "general",           // Événement général
      "entretien",         // Entretien de la propriété
      "comportement",      // Comportement du locataire
      "respect_regles",    // Respect du règlement
      "communication"      // Communication avec le locataire
    ]).default("evaluation"),
    eventSeverity: z.number().int().min(-3).max(3).default(0),
    eventDetails: z.record(z.unknown()).optional(),
    documents: z.array(z.string()).optional(),
    bailStatus: z.enum(["actif", "archivé", "supprimé"]).optional(),
    bailId: z.number().optional(),
    propertyName: z.string().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
  });

// Pour la rétrocompatibilité, on garde l'ancien schéma qui utilise le nouveau
export const insertFeedbackHistorySchema = insertTenantHistorySchema;

// Types
export type TenantHistory = typeof tenantHistory.$inferSelect;
export type InsertTenantHistory = z.infer<typeof insertTenantHistorySchema>;
export type FeedbackHistory = typeof feedbackHistory.$inferSelect; // Alias pour rétrocompatibilité
export type InsertFeedbackHistory = z.infer<typeof insertFeedbackHistorySchema>;

// Update the tenants table definition to include feedback fields
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  leaseStart: timestamp("lease_start").notNull(),
  leaseEnd: timestamp("lease_end").notNull(),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").default(true).notNull(),
  leaseStatus: text("lease_status", { enum: ["actif", "fini"] }).default("actif").notNull(),
  leaseType: text("lease_type", {
    enum: [
      "bail_meuble",
      "bail_vide",
      "bail_commercial",
      "bail_professionnel",
      "bail_mobilite",
      "bail_etudiant",
      "bail_saisonnier",
      "bail_terrain",
      "bail_garage",
      "bail_social",
      "bail_mixte",
      "bail_derogatoire",
      "bail_rehabilitation"
    ]
  }).notNull(),

});

// Relations for tenants
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  user: one(users, {
    fields: [tenants.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [tenants.propertyId],
    references: [properties.id],
  }),
  documents: many(tenantDocuments),
  feedbackHistory: many(feedbackHistory), // Pour rétrocompatibilité
}));

// Relations pour les utilisateurs
export const usersRelations = relations(users, ({ many }) => ({
  tenants: many(tenants),
  documents: many(documents),
  folders: many(folders),
  aiMessages: many(aiMessages),
  aiConversations: many(aiConversations),
  aiSuggestions: many(aiSuggestions),
}));

// Relations pour les propriétés
export const propertiesRelations = relations(properties, ({ many }) => ({
  tenants: many(tenants),
  transactions: many(transactions),
  aiSuggestions: many(aiSuggestions),
}));

// Define document and folder types using table definitions
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;


// Common date preprocessing function
const preprocessDate = (arg: unknown): Date => {
  if (arg instanceof Date) {
    return new Date(arg);
  }
  if (typeof arg === 'string') {
    const date = new Date(arg);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return date;
  }
  return new Date();
};

// Create insert schemas
export const insertFolderSchema = createInsertSchema(folders)
  .extend({
    name: z.string().min(1, "Le nom du dossier est requis"),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertDocumentSchema = createInsertSchema(documents)
  .extend({
    formData: z.record(z.unknown()).default({})
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

// Update the insert schema
export const insertTenantSchema = createInsertSchema(tenants)
  .extend({
    rentAmount: z.union([
      z.string(),
      z.number().transform(val => val.toString())
    ]),
    leaseStart: z.preprocess(
      (arg) => {
        if (arg instanceof Date) {
          const normalized = new Date(arg);
          normalized.setHours(12, 0, 0, 0);
          return normalized;
        }
        if (typeof arg === 'string') {
          const date = new Date(arg);
          if (isNaN(date.getTime())) {
            throw new Error("Date de début de bail invalide");
          }
          date.setHours(12, 0, 0, 0);
          return date;
        }
        throw new Error("La date de début doit être une chaîne ou un objet Date");
      },
      z.date()
    ),
    leaseEnd: z.preprocess(
      (arg) => {
        if (arg instanceof Date) {
          const normalized = new Date(arg);
          normalized.setHours(12, 0, 0, 0);
          return normalized;
        }
        if (typeof arg === 'string') {
          const date = new Date(arg);
          if (isNaN(date.getTime())) {
            throw new Error("Date de fin de bail invalide");
          }
          date.setHours(12, 0, 0, 0);
          return date;
        }
        throw new Error("La date de fin doit être une chaîne ou un objet Date");
      },
      z.date()
    ),
    leaseType: z.enum([
      "bail_meuble",
      "bail_vide",
      "bail_commercial",
      "bail_professionnel",
      "bail_mobilite",
      "bail_etudiant",
      "bail_saisonnier",
      "bail_terrain",
      "bail_garage",
      "bail_social",
      "bail_mixte",
      "bail_derogatoire",
      "bail_rehabilitation"
    ]),
    active: z.boolean().default(true),
    leaseStatus: z.enum(["actif", "fini"]).default("actif"),

  })
  .omit({
    id: true
  });

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  documentId: integer("document_id").references(() => documents.id),
  documentIds: integer("document_ids").array(),
  type: text("type", { enum: ["income", "expense", "credit"] }).notNull(),
  category: text("category", {
    enum: Object.values(TRANSACTION_CATEGORIES)
  }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  status: text("status", {
    enum: Object.values(TRANSACTION_STATUS)
  }).notNull(),
  paymentMethod: text("payment_method", {
    enum: [
      "cash", 
      "bank_transfer", 
      "credit_card", 
      "debit_card", 
      "check", 
      "direct_debit", 
      "paypal", 
      "stripe", 
      "wire_transfer", 
      "mobile_payment", 
      "cryptocurrency", 
      "interac", 
      "sepa", 
      "venmo",
      "installment",
      "prepaid_card",
      "voucher",
      "other"
    ]
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for transactions
export const transactionsRelations = relations(transactions, ({ one }) => ({
  property: one(properties, {
    fields: [transactions.propertyId],
    references: [properties.id],
  }),
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [transactions.documentId],
    references: [documents.id],
  })
}));

// Relations for documents
export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  })
}));

// Document content validation schemas
export const documentSectionSchema = z.object({
  type: z.enum(["header", "subheader", "text", "field", "signature", "date"]),
  content: z.string()
});

export const documentMetadataSchema = z.object({
  logo: z.object({
    url: z.string(),
    position: z.enum(["top-left", "top-center", "top-right"])
  }).optional(),
  companyAddress: z.string().optional(),
  recipientAddress: z.string().optional(),
  watermark: z.string().optional()
});

export const documentContentSchema = z.object({
  sections: z.array(documentSectionSchema).default([]),
  metadata: documentMetadataSchema.default({})
});

export const documentThemeSchema = z.object({
  primary: z.string().default("#2b6cb0"),
  secondary: z.string().default("#f7fafc"),
  accent: z.string().optional(),
  font: z.string().default("Inter"),
  spacing: z.enum(["compact", "comfortable", "spacious"]).default("comfortable")
});

// Document access log
export const documentsAccessLog = pgTable("documents_access_log", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  accessType: text("access_type", {
    enum: ["view", "download", "edit"]
  }).notNull(),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});

// Relations for documents
export const documentsRelations2 = relations(documents, ({ one }) => ({
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

// Document access log relations
export const documentsAccessLogRelations = relations(documentsAccessLog, ({ one }) => ({
  document: one(documents, {
    fields: [documentsAccessLog.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentsAccessLog.userId],
    references: [users.id],
  })
}));


// Tenant documents table
export const tenantDocuments = pgTable("tenant_documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  documentType: text("document_type", {
    enum: ["lease", "id", "contract", "other"]
  }).default("lease").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow()
});

// Relations for tenant documents
export const tenantDocumentsRelations = relations(tenantDocuments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantDocuments.tenantId],
    references: [tenants.id],
  }),
  document: one(documents, {
    fields: [tenantDocuments.documentId],
    references: [documents.id],
  }),
}));

// Types for tenant documents
export interface TenantDocument {
  id: number;
  tenantId: number;
  documentId: number;
  documentType: "lease" | "id" | "contract" | "other";
  document: Document | null;
  uploadedAt: Date | null;
}
export type InsertTenantDocument = typeof tenantDocuments.$inferInsert;

// Create insert schema for tenant documents
export const insertTenantDocumentSchema = createInsertSchema(tenantDocuments)
  .extend({
    documentType: z.enum(["lease", "id", "contract", "other"]),
  })
  .omit({
    id: true,
    uploadedAt: true,
  });

// Export types
export type Document2 = typeof documents.$inferSelect & {
  fileUrl?: string;
};

export type InsertDocument2 = z.infer<typeof insertDocumentSchema>;
export type DocumentAccessLog = typeof documentsAccessLog.$inferSelect;


// Document templates table
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  documentType: text("document_type", {
    enum: ["contract", "mandate", "attestation", "letter", "estimation", "inspection", "other"]
  }).notNull(),
  fieldMappings: jsonb("field_mappings").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insert schema for document templates with proper validation
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates)
  .extend({
    fieldMappings: z.array(z.object({
      pdfField: z.string(),
      mappedValue: z.string(),
      type: z.enum(["text", "date", "number", "checkbox"])
    })).default([]),
    userId: z.number().int().positive().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

// User settings interface
export interface UserSettings {
  [key: string]: any;
}

// Types
export type User = typeof users.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type Transaction = typeof transactions.$inferSelect & {
  documentIds?: number[];
  property?: { name: string };
  tenant?: { user?: { fullName: string } };
};
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;


// Modify the visits table definition
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  datetime: timestamp("datetime").notNull(),
  visitType: text("visit_type", {
    enum: ["virtual", "physical", "video"] // Added "video" option
  }).notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  manualAddress: text("manual_address"),
  message: text("message"),
  status: text("status", {
    enum: ["pending", "completed", "cancelled", "no_show"]
  }).default("pending"),
  rating: integer("rating"),
  feedback: text("feedback"),
  archived: boolean("archived").default(false),
  agentId: integer("agent_id").references(() => users.id),
  source: text("source", {
    enum: ["website", "agency", "partner", "manual"]
  }).default("manual"),
  documents: jsonb("documents").$type<string[]>().default([]),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Update the insert schema
export const insertVisitSchema = createInsertSchema(visits)
  .extend({
    propertyId: z.coerce.number().int().positive().nullable(),
    datetime: z.preprocess(
      (arg) => {
        if (arg instanceof Date) {
          return arg;
        }
        if (typeof arg === 'string') {
          const date = new Date(arg);
          if (isNaN(date.getTime())) {
            throw new Error("Format de date invalide");
          }
          return date;
        }
        throw new Error("La date doit être une chaîne ou un objet Date");
      },
      z.date()
    ),
    visitType: z.enum(["virtual", "physical", "video"]), // Updated to match the table enum
    status: z.enum(["pending", "completed", "cancelled", "no_show"]).default("pending"),
    rating: z.number().int().min(1).max(5).optional(),
    feedback: z.string().optional(),
    agentId: z.number().int().positive().optional(),
    source: z.enum(["website", "agency", "partner", "manual"]).default("manual"),
    documents: z.array(z.string()).default([]),
    reminderSent: z.boolean().default(false),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    archived: true,
  });

// Update visitsRelations to include agent
export const visitsRelations = relations(visits, ({ one }) => ({
  property: one(properties, {
    fields: [visits.propertyId],
    references: [properties.id],
  }),
  agent: one(users, {
    fields: [visits.agentId],
    references: [users.id],
  }),
}));

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;

// Maintenance requests table definition
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"]
  }).default("medium").notNull(),
  status: text("status", {
    enum: ["open", "in_progress", "completed", "cancelled"]
  }).default("open").notNull(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  reportedBy: text("reported_by"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  documentId: integer("document_id"),
  documentIds: jsonb("document_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for maintenance requests
export const maintenanceRequestsRelations = relations(maintenanceRequests, ({ one }) => ({
  property: one(properties, {
    fields: [maintenanceRequests.propertyId],
    references: [properties.id],
  }),
}));

// Create insert schema for maintenance requests
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).extend({
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    status: z.enum(["open", "in_progress", "completed", "cancelled"]).default("open"),
    totalCost: z.union([
      z.string().transform(val => val || "0"),
      z.number().transform(val => val.toString())
    ]).default("0"),
    documentId: z.number().optional(),
    documentIds: z.array(z.number()).optional().default([]),
    reportedBy: z.string().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Update the TenantWithDetails interface
export interface TenantWithDetails {
  id: number;
  propertyId: number;
  userId: number;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  leaseType: string;
  active: boolean;
  leaseStatus: 'actif' | 'fini';
  averageRating?: number;
  documents: TenantDocument[];
  feedbackHistory?: FeedbackHistory[];
  user?: {
    fullName: string | null;
    username: string;
    phoneNumber: string | null;
    email: string | null;
  };
  property?: {
    name: string;
    address: string;
  };
}

// Transaction schema with enhanced date handling

export const insertTransactionSchema = createInsertSchema(transactions)
  .extend({
    amount: z.union([
      z.string(),
      z.number().transform(val => val.toString())
    ]),
    date: z.preprocess(
      (arg) => {
        if (arg instanceof Date) {
          const normalized = new Date(arg);
          normalized.setHours(12, 0, 0, 0);
          return normalized;
        }
        if (typeof arg === 'string') {
          const date = new Date(arg);
          if (isNaN(date.getTime())) {
            throw new Error("Date de transaction invalide");
          }
          date.setHours(12, 0, 0, 0);
          return date;
        }
        throw new Error("La date de transaction doit être une chaîne ou un objet Date");
      },
      z.date()
    ),
    type: z.enum(["income", "expense", "credit"]),
    category: z.enum([
      "rent", "maintenance", "insurance", "tax", "utility", "other", 
      "management_fee", "legal_fee", "renovation", "mortgage", "condominium_fee", 
      "security_deposit", "commission", "marketing", "inspection", "cleaning", 
      "furnishing", "security", "landscaping", "utilities_water", "utilities_electricity", 
      "utilities_gas", "utilities_internet", "accounting", "consulting", "travel", 
      "equipment", "refund", "late_fees", "service_fees", "short_term_rental", 
      "parking_income", "common_area_income", "additional_services", "advertising_income", 
      "subsidies", "insurance_claims", "property_sale", "application_fees", "penalty_fees", 
      "dividend_income", "interest_income", "rental_equipment", "equipment_loan", 
      "investment_loan", "bridge_loan", "commercial_loan", "construction_loan", 
      "refinancing", "business_loan"
    ]),
    status: z.enum(["pending", "completed", "cancelled", "failed", "archived", "deleted"])
      .default("pending"),
    paymentMethod: z.enum([
      "cash", "bank_transfer", "credit_card", "debit_card", "check", "direct_debit", 
      "paypal", "stripe", "wire_transfer", "mobile_payment", "cryptocurrency", 
      "interac", "sepa", "venmo", "installment", "prepaid_card", "voucher", "other"
    ]).default("bank_transfer"),
    documentId: z.number().int().positive().nullable().optional(),
    documentIds: z.array(z.number()).optional()
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Contrats
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["rental", "mandate", "commercial", "attestation", "other"]
  }).notNull(),
  status: text("status", {
    enum: ["draft", "pending_signature", "active", "expired", "terminated"]
  }).default("draft").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  propertyId: integer("property_id").references(() => properties.id),
  documentId: integer("document_id").references(() => documents.id),
  signatureRequired: boolean("signature_required").default(true),
  automatedRenewal: boolean("automated_renewal").default(false),
  renewalDate: timestamp("renewal_date"),
  notificationDate: timestamp("notification_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Parties des contrats (locataires, propriétaires, gestionnaires)
export const contractParties = pgTable("contract_parties", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  partyId: integer("party_id").notNull(), // ID de la partie (utilisateur, locataire, etc.)
  partyType: text("party_type", {
    enum: ["tenant", "owner", "manager", "other"]
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// userNotificationSettings
export const userNotificationSettings = pgTable('user_notification_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['payment', 'maintenance', 'lease', 'visit'] }).notNull(),
  channel: text('channel', { enum: ['app', 'email', 'both'] }).notNull().default('both'),
  enabled: boolean('enabled').notNull().default(true),
  frequency: text('frequency', { enum: ['immediate', 'daily', 'weekly'] }).notNull().default('immediate'),
  importance: text('importance', { enum: ['all', 'high', 'medium', 'none'] }).notNull().default('all'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationSettings.userId],
    references: [users.id],
  })
}));

export type UserNotificationSetting = typeof userNotificationSettings.$inferSelect;
export type InsertUserNotificationSetting = typeof userNotificationSettings.$inferInsert;