-- Ajouter colonne documentIds à la table maintenance_requests si elle n'existe pas déjà
ALTER TABLE "maintenance_requests" 
ADD COLUMN IF NOT EXISTS "document_ids" jsonb DEFAULT '[]';

-- Pour chaque demande avec un documentId existant, migrer vers documentIds
UPDATE "maintenance_requests"
SET "document_ids" = jsonb_build_array("document_id")
WHERE "document_id" IS NOT NULL AND ("document_ids" IS NULL OR jsonb_array_length("document_ids") = 0);