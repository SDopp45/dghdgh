
-- Ajouter la colonne parent_id à la table documents si elle n'existe pas déjà
ALTER TABLE "documents" 
ADD COLUMN IF NOT EXISTS "parent_id" integer;
