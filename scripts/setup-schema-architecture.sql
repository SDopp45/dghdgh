-- Script pour configurer l'architecture multi-schémas
-- Ce script:
-- 1. Désactive RLS sur toutes les tables
-- 2. Crée les schémas nécessaires
-- 3. Crée les fonctions nécessaires pour l'architecture

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

-- 3. Créer ou remplacer la fonction pour définir le schéma pour un utilisateur
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
    RETURN 'admin_views, public';
  ELSE
    -- Récupérer le nom du schéma pour cet utilisateur
    SELECT 'client_' || user_id::TEXT INTO schema_name;
    
    -- Définir le search_path
    RETURN schema_name || ', public';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Créer ou remplacer la fonction pour configurer l'environnement utilisateur
CREATE OR REPLACE FUNCTION public.setup_user_environment(user_id INTEGER) 
RETURNS VOID AS $$
DECLARE
  search_path_value TEXT;
BEGIN
  -- Définir le search_path
  search_path_value := public.set_schema_for_user(user_id);
  EXECUTE 'SET search_path TO ' || search_path_value;
END;
$$ LANGUAGE plpgsql;

-- 5. Vérifier que les schémas nécessaires existent pour chaque utilisateur
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

-- 6. Créer le schéma admin_views s'il n'existe pas
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

-- 7. Fonction pour ajouter automatiquement un schéma à un nouvel utilisateur
CREATE OR REPLACE FUNCTION public.create_user_schema()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer automatiquement un schéma client pour le nouvel utilisateur
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS client_%s', NEW.id);
    RAISE NOTICE 'Schéma client_% créé automatiquement pour le nouvel utilisateur %', 
                 NEW.id, NEW.username;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Créer le trigger pour créer automatiquement un schéma lors de l'insertion d'un utilisateur
DROP TRIGGER IF EXISTS tr_create_user_schema ON public.users;
CREATE TRIGGER tr_create_user_schema
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_schema();

-- Restaurer le mode normal
SET session_replication_role = 'origin';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Configuration terminée : Architecture multi-schémas configurée';
    RAISE NOTICE 'Chaque utilisateur a maintenant son propre schéma PostgreSQL.';
END
$$; 