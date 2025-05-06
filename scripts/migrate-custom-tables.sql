-- Script pour migrer les tables link_profiles et form_responses
-- Exécuter ce script pour déplacer ces tables du schéma public vers template et client_31

-- Étape 1: Désactiver temporairement les contraintes de clé étrangère
SET session_replication_role = 'replica';

------------------------------------------------------------
-- Migration de link_profiles
------------------------------------------------------------

-- Créer la table dans le schéma template
CREATE TABLE IF NOT EXISTS template.link_profiles (LIKE public.link_profiles INCLUDING ALL);

-- Créer la table dans le schéma client
CREATE TABLE IF NOT EXISTS client_31.link_profiles (LIKE template.link_profiles INCLUDING ALL);

-- Migrer les données du client 31
INSERT INTO client_31.link_profiles
SELECT * FROM public.link_profiles
WHERE user_id = 31
ON CONFLICT DO NOTHING;

------------------------------------------------------------
-- Migration de form_responses
------------------------------------------------------------

-- Créer la table dans le schéma template
CREATE TABLE IF NOT EXISTS template.form_responses (LIKE public.form_responses INCLUDING ALL);

-- Créer la table dans le schéma client
CREATE TABLE IF NOT EXISTS client_31.form_responses (LIKE template.form_responses INCLUDING ALL);

-- Migrer les données liées aux soumissions du client 31
INSERT INTO client_31.form_responses
SELECT r.* FROM public.form_responses r
WHERE submission_id IN (SELECT id FROM client_31.form_submissions)
ON CONFLICT DO NOTHING;

-- Réactiver les contraintes de clé étrangère
SET session_replication_role = 'origin';

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration des tables link_profiles et form_responses terminée avec succès.';
  RAISE NOTICE 'ATTENTION: Les tables originales dans le schéma public n''ont pas été supprimées.';
  RAISE NOTICE 'Après avoir vérifié que la migration a réussi, vous pouvez les supprimer manuellement avec:';
  RAISE NOTICE 'DROP TABLE public.link_profiles;';
  RAISE NOTICE 'DROP TABLE public.form_responses;';
END $$; 