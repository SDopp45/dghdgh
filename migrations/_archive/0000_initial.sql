ALTER TABLE "properties" 
ADD COLUMN IF NOT EXISTS "construction_year" integer NOT NULL DEFAULT 2024,
ADD COLUMN IF NOT EXISTS "energy_class" text NOT NULL DEFAULT 'D' CHECK ("energy_class" IN ('A', 'B', 'C', 'D', 'E', 'F', 'G'));

-- Update existing records to have default values
UPDATE "properties" 
SET "construction_year" = 2024, "energy_class" = 'D'
WHERE "construction_year" IS NULL OR "energy_class" IS NULL;
