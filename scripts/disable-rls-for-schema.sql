-- Script pour désactiver le RLS (Row Level Security) et configurer le système pour l'architecture multi-schémas
-- À exécuter lors de la migration vers l'architecture multi-schémas

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

-- 3. Supprimer les fonctions RLS obsolètes
DROP FUNCTION IF EXISTS public.setup_user_environment(integer);
DROP FUNCTION IF EXISTS public.set_current_user_id();
DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.user_has_access_to_record(integer);

-- 4. Créer ou remplacer la fonction pour définir le schéma pour un utilisateur
CREATE OR REPLACE FUNCTION public.set_schema_for_user(user_id INTEGER) 
RETURNS TEXT AS $$
DECLARE
  schema_name TEXT;
  user_role TEXT;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  
  IF user_role = 'admin' THEN
    -- L'administrateur a accès à tout
    RETURN 'public, admin_views';
  ELSE
    -- Récupérer le nom du schéma pour cet utilisateur
    SELECT 'client_' || user_id::TEXT INTO schema_name;
    
    -- Définir le search_path
    RETURN schema_name || ', public';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Créer ou remplacer la fonction pour configurer l'environnement utilisateur
CREATE OR REPLACE FUNCTION public.setup_user_environment(user_id INTEGER) 
RETURNS VOID AS $$
DECLARE
  search_path_value TEXT;
BEGIN
  -- Définir le search_path
  search_path_value := public.set_schema_for_user(user_id);
  EXECUTE 'SET search_path TO ' || search_path_value;
  
  -- Pour maintenir la compatibilité avec l'ancien code, on garde app.user_id
  -- mais il n'est plus nécessaire pour la sécurité des données
  PERFORM set_config('app.user_id', user_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

-- 6. Vérifier que les schémas nécessaires existent pour chaque utilisateur
DO $$
DECLARE
    user_record RECORD;
    schema_name TEXT;
BEGIN
    RAISE NOTICE 'Vérification et création des schémas clients...';
    
    FOR user_record IN 
        SELECT id, username FROM public.users
    LOOP
        schema_name := 'client_' || user_record.id;
        
        -- Vérifier si le schéma existe déjà
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = schema_name
        ) THEN
            -- Créer le schéma pour cet utilisateur
            EXECUTE format('CREATE SCHEMA %I', schema_name);
            RAISE NOTICE 'Schéma % créé pour l''utilisateur % (ID: %)', 
                         schema_name, user_record.username, user_record.id;
        ELSE
            RAISE NOTICE 'Schéma % existe déjà pour l''utilisateur % (ID: %)', 
                         schema_name, user_record.username, user_record.id;
        END IF;
    END LOOP;
END
$$;

-- 7. Créer le schéma admin_views s'il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'admin_views'
    ) THEN
        CREATE SCHEMA admin_views;
        RAISE NOTICE 'Schéma admin_views créé';
    ELSE
        RAISE NOTICE 'Schéma admin_views existe déjà';
    END IF;
END
$$;

-- Restaurer le mode normal
SET session_replication_role = 'origin';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Configuration terminée : RLS désactivé et architecture multi-schémas configurée';
END
$$; 