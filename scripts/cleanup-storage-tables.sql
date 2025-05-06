-- Script pour supprimer les anciennes tables de stockage

-- Supprimer les anciennes tables du schéma public
DROP TABLE IF EXISTS public.storage_extensions CASCADE;
DROP TABLE IF EXISTS public.storage_transactions CASCADE;
DROP TABLE IF EXISTS public.storage_usage_details CASCADE;

-- Vérifier s'il y a d'autres tables de stockage obsolètes à supprimer
-- (à exécuter manuellement pour vérifier avant de supprimer)
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'storage_%'
-- AND table_name NOT IN ('storage_plans', 'storage_quotas');

-- Note: Les tables suivantes seront conservées car elles font partie de la nouvelle architecture:
-- 1. public.storage_plans
-- 2. public.storage_quotas
-- 3. template.storage_usage
-- 4. client_XX.storage_usage (pour chaque client)
-- 5. admin_views.storage_usage_XX (vues pour chaque client) 