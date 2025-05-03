-- Migration: 0002_add_property_details.sql
-- Date: 2025-03-25T12:12:50.290Z
-- Description: add_property_details

ALTER TABLE "properties" 
ADD COLUMN IF NOT EXISTS "bedrooms" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "floors" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "bathrooms" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "toilets" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "energy_emissions" text CHECK (energy_emissions IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
ADD COLUMN IF NOT EXISTS "living_area" integer,
ADD COLUMN IF NOT EXISTS "land_area" integer,
ADD COLUMN IF NOT EXISTS "has_parking" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "has_terrace" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "has_garage" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "has_outbuilding" boolean DEFAULT false;

-- Update existing records to set living_area equal to area if it's NULL
UPDATE "properties" 
SET "living_area" = "area"
WHERE "living_area" IS NULL;

-- Make living_area NOT NULL after populating it
ALTER TABLE "properties"
ALTER COLUMN "living_area" SET NOT NULL;
