import { integer, numeric, pgTable, serial, text, timestamp, boolean, jsonb, date } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { properties } from './schema';

// Table des instantanés financiers mensuels
export const propertyFinancialSnapshots = pgTable('property_financial_snapshots', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  snapshotDate: date('snapshot_date').notNull(),
  grossRentalYield: numeric('gross_rental_yield', { precision: 10, scale: 2 }),
  netRentalYield: numeric('net_rental_yield', { precision: 10, scale: 2 }),
  cashOnCashReturn: numeric('cash_on_cash_return', { precision: 10, scale: 2 }),
  capRate: numeric('cap_rate', { precision: 10, scale: 2 }),
  monthlyCashFlow: numeric('monthly_cash_flow', { precision: 10, scale: 2 }),
  totalIncome: numeric('total_income', { precision: 10, scale: 2 }),
  totalExpenses: numeric('total_expenses', { precision: 10, scale: 2 }),
  occupancyRate: numeric('occupancy_rate', { precision: 10, scale: 2 }),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Table des entrées financières
export const financialEntries = pgTable('financial_entries', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  type: text('type').notNull().$type<'income' | 'expense'>(),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  recurring: boolean('recurring').default(false),
  frequency: text('frequency').$type<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'>(),
  description: text('description'),
  source: text('source').notNull().$type<'rent' | 'maintenance' | 'tax' | 'insurance' | 'utilities' | 'other'>(),
  relatedEntityId: integer('related_entity_id'),
  relatedEntityType: text('related_entity_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Table des objectifs financiers
export const propertyFinancialGoals = pgTable('property_financial_goals', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: text('type').notNull().$type<'roi' | 'cashflow' | 'occupancy_rate' | 'expense_reduction'>(),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }).notNull(),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }),
  deadline: date('deadline'),
  status: text('status').notNull().$type<'pending' | 'in_progress' | 'achieved' | 'missed'>().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Types inférés pour les sélections
export type PropertyFinancialSnapshot = typeof propertyFinancialSnapshots.$inferSelect;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type PropertyFinancialGoal = typeof propertyFinancialGoals.$inferSelect;

// Exporter les tables pour utilisation externe
export { properties } from './schema';

// Schémas Zod pour les insertions
export const insertFinancialSnapshotSchema = createInsertSchema(propertyFinancialSnapshots)
  .extend({
    snapshotDate: z.union([z.string(), z.date()]).transform(val => val instanceof Date ? val : new Date(val)),
    grossRentalYield: z.union([z.string(), z.number()]).transform(val => val.toString()),
    netRentalYield: z.union([z.string(), z.number()]).transform(val => val.toString()),
    cashOnCashReturn: z.union([z.string(), z.number()]).transform(val => val.toString()),
    capRate: z.union([z.string(), z.number()]).transform(val => val.toString()),
    monthlyCashFlow: z.union([z.string(), z.number()]).transform(val => val.toString()),
    totalIncome: z.union([z.string(), z.number()]).transform(val => val.toString()),
    totalExpenses: z.union([z.string(), z.number()]).transform(val => val.toString()),
    occupancyRate: z.union([z.string(), z.number()]).transform(val => val.toString()),
  })
  .omit({
    id: true,
    createdAt: true
  });

export const insertFinancialEntrySchema = createInsertSchema(financialEntries)
  .extend({
    date: z.union([z.string(), z.date()])
      .transform(val => {
        const date = val instanceof Date ? val : new Date(val);
        return date.toISOString().split('T')[0];
      }),
    amount: z.union([z.string(), z.number()])
      .transform(val => typeof val === 'number' ? val.toString() : val),
    type: z.enum(['income', 'expense']),
    source: z.enum(['rent', 'maintenance', 'tax', 'insurance', 'utilities', 'other']),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']).optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  });

export const insertFinancialGoalSchema = createInsertSchema(propertyFinancialGoals)
  .extend({
    targetValue: z.union([z.string(), z.number()]).transform(val => val.toString()),
    deadline: z.union([z.string(), z.date(), z.undefined()]).transform(val => {
      if (!val) return undefined;
      return val instanceof Date ? val : new Date(val);
    }),
    type: z.enum(['roi', 'cashflow', 'occupancy_rate', 'expense_reduction']),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    currentValue: true,
    status: true
  });

// Relations pour les tables financières
export const propertyFinancialSnapshotsRelations = relations(propertyFinancialSnapshots, ({ one }) => ({
  property: one(properties, {
    fields: [propertyFinancialSnapshots.propertyId],
    references: [properties.id],
  })
}));

export const financialEntriesRelations = relations(financialEntries, ({ one }) => ({
  property: one(properties, {
    fields: [financialEntries.propertyId],
    references: [properties.id],
  })
}));

export const propertyFinancialGoalsRelations = relations(propertyFinancialGoals, ({ one }) => ({
  property: one(properties, {
    fields: [propertyFinancialGoals.propertyId],
    references: [properties.id],
  })
}));