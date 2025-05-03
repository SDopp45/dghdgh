-- Migration: 0008_update_feedback_history.sql
-- Date: 2025-03-25T12:12:50.298Z
-- Description: update_feedback_history

-- Migration pour mettre à jour le schéma de feedback_history
-- Date: 2025-03-20

-- Vérifier si la colonne tenant_id existe et la rendre nullable si ce n'est pas déjà le cas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE feedback_history 
    ALTER COLUMN tenant_id DROP NOT NULL;
  END IF;
END $$;

-- Ajouter les colonnes manquantes s'il n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'tenant_full_name'
  ) THEN
    ALTER TABLE feedback_history 
    ADD COLUMN tenant_full_name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'is_orphaned'
  ) THEN
    ALTER TABLE feedback_history 
    ADD COLUMN is_orphaned BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'original_user_id'
  ) THEN
    ALTER TABLE feedback_history 
    ADD COLUMN original_user_id INTEGER;
  END IF;
  
  -- Ajouter la colonne category si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'category'
  ) THEN
    ALTER TABLE feedback_history 
    ADD COLUMN category TEXT DEFAULT 'general';
    
    -- Ajoutons une contrainte pour valider les valeurs
    ALTER TABLE feedback_history 
    ADD CONSTRAINT feedback_category_check
    CHECK (category IN ('paiement', 'entretien', 'comportement', 'respect_regles', 'communication', 'general'));
  END IF;
END $$;

-- Suppression des colonnes qui ne sont plus nécessaires
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'tenant_email'
  ) THEN
    ALTER TABLE feedback_history 
    DROP COLUMN tenant_email;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'tenant_phone'
  ) THEN
    ALTER TABLE feedback_history 
    DROP COLUMN tenant_phone;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'lease_type'
  ) THEN
    ALTER TABLE feedback_history 
    DROP COLUMN lease_type;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'lease_start'
  ) THEN
    ALTER TABLE feedback_history 
    DROP COLUMN lease_start;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_history' AND column_name = 'lease_end'
  ) THEN
    ALTER TABLE feedback_history 
    DROP COLUMN lease_end;
  END IF;
END $$;

-- Mise à jour des feedbacks existants pour définir is_orphaned = true lorsque tenant_id IS NULL
UPDATE feedback_history 
SET is_orphaned = true 
WHERE tenant_id IS NULL AND is_orphaned = false;

-- Si tenant_id est NULL mais que tenant_full_name n'est pas défini, définir une valeur par défaut
UPDATE feedback_history 
SET tenant_full_name = 'Ancien locataire' 
WHERE tenant_id IS NULL AND (tenant_full_name IS NULL OR tenant_full_name = '');