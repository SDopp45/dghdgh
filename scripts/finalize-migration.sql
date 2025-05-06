-- Script de finalisation de la migration
-- Supprime les tables link_profiles et form_responses du schéma public
-- ATTENTION: N'exécutez ce script qu'après avoir vérifié que la migration s'est bien déroulée

-- Désactiver temporairement les contraintes de clé étrangère
SET session_replication_role = 'replica';

-- Supprimer les tables migrées du schéma public
DROP TABLE IF EXISTS public.link_profiles CASCADE;
DROP TABLE IF EXISTS public.form_responses CASCADE;

-- Réactiver les contraintes de clé étrangère
SET session_replication_role = 'origin';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Les tables link_profiles et form_responses ont été supprimées du schéma public.';
  RAISE NOTICE 'La migration est maintenant finalisée.';
END $$; 