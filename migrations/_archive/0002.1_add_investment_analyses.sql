CREATE TABLE "investment_analyses" (
  "id" serial PRIMARY KEY,
  "property_id" integer NOT NULL REFERENCES "properties"("id"),
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW(),

  -- Données d'entrée
  "purchase_price" decimal(10,2) NOT NULL,
  "monthly_rent" decimal(10,2) NOT NULL,
  "annual_expenses" decimal(10,2) NOT NULL,
  "property_tax_rate" decimal(5,2) NOT NULL,
  "maintenance_reserve" decimal(5,2) NOT NULL,
  "vacancy_rate" decimal(5,2) NOT NULL,
  "mortgage_rate" decimal(5,2) NOT NULL,
  "down_payment" decimal(5,2) NOT NULL,
  "loan_term" integer NOT NULL,

  -- Résultats calculés
  "cash_on_cash" decimal(10,2) NOT NULL,
  "total_roi" decimal(10,2) NOT NULL,
  "net_operating_income" decimal(10,2) NOT NULL,
  "capitalization_rate" decimal(10,2) NOT NULL,

  -- Notes et commentaires
  "notes" text
);

-- Index pour optimiser les requêtes par propriété
CREATE INDEX idx_investment_analyses_property_id ON "investment_analyses"("property_id");