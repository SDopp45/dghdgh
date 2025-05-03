ALTER TABLE "properties" 
ADD COLUMN IF NOT EXISTS "monthly_rent" decimal(10,2),
ADD COLUMN IF NOT EXISTS "acquisition_date" date;

-- Mettre à jour les enregistrements existants avec une date d'acquisition par défaut
UPDATE "properties" 
SET "acquisition_date" = CURRENT_DATE
WHERE "acquisition_date" IS NULLL;
