-- Migration: 0001_add_monthly_rent_and_acquisition_date.sql
-- Date: 2025-03-25T12:12:50.288Z
-- Description: add_monthly_rent_and_acquisition_date

ALTER TABLE "properties" 
ADD COLUMN IF NOT EXISTS "monthly_rent" decimal(10,2),
ADD COLUMN IF NOT EXISTS "acquisition_date" date;

-- Mettre à jour les enregistrements existants avec une date d'acquisition par défaut
UPDATE "properties" 
SET "acquisition_date" = CURRENT_DATE
WHERE "acquisition_date" IS NULLL;
