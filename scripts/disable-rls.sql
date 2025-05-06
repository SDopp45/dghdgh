-- Désactivation du Row-Level Security (RLS) après migration vers architecture multi-schéma
-- Ce script désactive RLS sur toutes les tables et supprime les fonctions associées

-- Activation du mode super-utilisateur pour supprimer les politiques et désactiver RLS
SET session_replication_role = 'replica';

-- 1. Désactiver RLS sur toutes les tables publiques
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Désactivation de RLS sur toutes les tables du schéma public...';
    
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'RLS désactivé sur public.%', r.tablename;
    END LOOP;
END
$$;

-- 2. Supprimer toutes les politiques RLS existantes
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Suppression de toutes les politiques RLS...';
    
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Politique % supprimée sur %.%', 
                     r.policyname, r.schemaname, r.tablename;
    END LOOP;
END
$$;

-- 3. Supprimer les fonctions RLS
DROP FUNCTION IF EXISTS public.setup_user_environment(integer);
DROP FUNCTION IF EXISTS public.set_current_user_id();
DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.user_has_access_to_record(integer);

-- 4. Supprimer les variables personnalisées utilisées par RLS
RESET app.user_id;

-- Restaurer le mode normal
SET session_replication_role = 'origin';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '-----------------------------------------------';
    RAISE NOTICE 'RLS désactivé avec succès!';
    RAISE NOTICE 'La sécurité est maintenant assurée par la séparation des schémas';
    RAISE NOTICE '-----------------------------------------------';
END
$$; 