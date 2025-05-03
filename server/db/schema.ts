import { pgTable, index, sql, text, timestamp, integer, decimal, boolean } from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id: integer('id').primaryKey().notNull(),
  userId: integer('user_id').notNull(),
  propertyId: integer('property_id'),
  tenantId: integer('tenant_id'),
  amount: decimal('amount').notNull(),
  type: text('type', { enum: ['income', 'expense', 'credit'] }).notNull(),
  category: text('category').notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull(),
  documentIds: text('document_ids').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Index pour les regroupements simples
  dateIdx: index('transactions_date_idx').on(table.date),
  typeIdx: index('transactions_type_idx').on(table.type),
  categoryIdx: index('transactions_category_idx').on(table.category),
  propertyIdIdx: index('transactions_property_id_idx').on(table.propertyId),
  
  // Index pour les regroupements combinés
  propertyTypeCategoryIdx: index('transactions_property_type_category_idx')
    .on(table.propertyId, table.type, table.category),
  propertyCategoryIdx: index('transactions_property_category_idx')
    .on(table.propertyId, table.category),
  typeCategoryIdx: index('transactions_type_category_idx')
    .on(table.type, table.category),
  propertyTypeIdx: index('transactions_property_type_idx')
    .on(table.propertyId, table.type),
  
  // Index pour les regroupements par mois
  monthIdx: index('transactions_month_idx')
    .on(sql`date_trunc('month', ${table.date})`),
  monthCategoryIdx: index('transactions_month_category_idx')
    .on(sql`date_trunc('month', ${table.date})`, table.category),
  monthTypeIdx: index('transactions_month_type_idx')
    .on(sql`date_trunc('month', ${table.date})`, table.type),
  monthPropertyIdx: index('transactions_month_property_idx')
    .on(sql`date_trunc('month', ${table.date})`, table.propertyId)
})); 