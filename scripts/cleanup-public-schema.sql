-- Script pour nettoyer le schéma public, supprimant les tables qui existent déjà dans template
-- Exécuter ce script après avoir vérifié que les données importantes sont soit migrées, soit sauvegardées

-- Désactiver temporairement les contraintes de clé étrangère pour éviter les problèmes de dépendance
SET session_replication_role = 'replica';

-- Tables à supprimer du schéma public car elles existent dans template et client_31
-- Note: les tables users, sessions, storage_plans, storage_quotas, link_profiles et links seront conservées

-- Supprimer les tables liées aux propriétés
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.property_coordinates CASCADE;
DROP TABLE IF EXISTS public.property_analyses CASCADE;
DROP TABLE IF EXISTS public.property_history CASCADE;
DROP TABLE IF EXISTS public.property_works CASCADE;

-- Supprimer les tables liées aux locataires
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.tenant_documents CASCADE;
DROP TABLE IF EXISTS public.tenant_history CASCADE;

-- Supprimer les tables liées aux opérations
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
DROP TABLE IF EXISTS public.feedbacks CASCADE;

-- Supprimer les tables liées aux documents et formulaires
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.form_submissions CASCADE;

-- Supprimer les tables financières
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Réactiver les contraintes de clé étrangère
SET session_replication_role = 'origin';

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Nettoyage du schéma public terminé. Les tables dupliquées ont été supprimées.';
END $$; 