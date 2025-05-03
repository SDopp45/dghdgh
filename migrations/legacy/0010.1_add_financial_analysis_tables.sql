-- Migration pour créer les tables d'analyse financière des propriétés

-- Table pour les instantanés financiers mensuels des propriétés
CREATE TABLE "property_financial_snapshots" (
  "id" SERIAL PRIMARY KEY,
  "property_id" INTEGER NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "snapshot_date" DATE NOT NULL,
  "gross_rental_yield" NUMERIC(10, 2),
  "net_rental_yield" NUMERIC(10, 2),
  "cash_on_cash_return" NUMERIC(10, 2),
  "cap_rate" NUMERIC(10, 2),
  "monthly_cash_flow" NUMERIC(10, 2),
  "total_income" NUMERIC(10, 2),
  "total_expenses" NUMERIC(10, 2),
  "occupancy_rate" NUMERIC(10, 2),
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table pour les entrées financières (revenus et dépenses)
CREATE TABLE "financial_entries" (
  "id" SERIAL PRIMARY KEY,
  "property_id" INTEGER NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('income', 'expense')),
  "category" TEXT NOT NULL,
  "amount" NUMERIC(10, 2) NOT NULL,
  "recurring" BOOLEAN DEFAULT FALSE,
  "frequency" TEXT CHECK ("frequency" IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
  "description" TEXT,
  "source" TEXT NOT NULL CHECK ("source" IN ('rent', 'maintenance', 'tax', 'insurance', 'utilities', 'other')),
  "related_entity_id" INTEGER,
  "related_entity_type" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table pour les objectifs financiers par propriété
CREATE TABLE "property_financial_goals" (
  "id" SERIAL PRIMARY KEY,
  "property_id" INTEGER NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('roi', 'cashflow', 'occupancy_rate', 'expense_reduction')),
  "target_value" NUMERIC(10, 2) NOT NULL,
  "current_value" NUMERIC(10, 2),
  "deadline" DATE,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'in_progress', 'achieved', 'missed')),
  "notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_property_financial_snapshots_property_id ON "property_financial_snapshots"("property_id");
CREATE INDEX idx_property_financial_snapshots_date ON "property_financial_snapshots"("snapshot_date");
CREATE INDEX idx_financial_entries_property_id ON "financial_entries"("property_id");
CREATE INDEX idx_financial_entries_date ON "financial_entries"("date");
CREATE INDEX idx_financial_entries_type ON "financial_entries"("type");
CREATE INDEX idx_financial_entries_source ON "financial_entries"("source");
CREATE INDEX idx_property_financial_goals_property_id ON "property_financial_goals"("property_id");
CREATE INDEX idx_property_financial_goals_status ON "property_financial_goals"("status");