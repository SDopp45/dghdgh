-- Script pour initialiser les fonctions de schéma dans PostgreSQL
-- Exécutez ce script avec: psql -U username -d database_name -a -f scripts/initdb.sql

-- 1. Supprimer les fonctions existantes pour éviter les conflits
DROP FUNCTION IF EXISTS public.setup_user_environment(integer);
DROP FUNCTION IF EXISTS public.create_client_schema(integer);

-- 2. Créer ou remplacer la fonction setup_user_environment
CREATE OR REPLACE FUNCTION public.setup_user_environment(p_user_id integer)
RETURNS void AS
$$
DECLARE
    schema_name text := 'client_' || p_user_id;
BEGIN
    -- Vérifier si le schéma existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
        -- Créer le schéma s'il n'existe pas
        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
        RAISE NOTICE 'Schéma % créé', schema_name;
    END IF;
    
    -- Configurer le chemin de recherche des schémas pour la session actuelle
    EXECUTE format('SET search_path TO %I, public', schema_name);
    RAISE NOTICE 'Search path configuré à %', schema_name;

    -- Configurer les autorisations
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO current_user', schema_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO current_user', schema_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO current_user', schema_name);
    
    RETURN;
END;
$$
LANGUAGE plpgsql;

-- 3. Créer ou remplacer la fonction create_client_schema
CREATE OR REPLACE FUNCTION public.create_client_schema(p_user_id integer)
RETURNS boolean AS
$$
DECLARE
    schema_name text := 'client_' || p_user_id;
BEGIN
    -- Vérifier si le schéma existe déjà
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
        RAISE NOTICE 'Le schéma % existe déjà', schema_name;
        RETURN true;
    END IF;
    
    -- Créer le schéma
    BEGIN
        EXECUTE format('CREATE SCHEMA %I', schema_name);
        RAISE NOTICE 'Schéma % créé avec succès', schema_name;
        
        -- Configurer les autorisations
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO current_user', schema_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO current_user', schema_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO current_user', schema_name);
        
        RETURN true;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la création du schéma %: %', schema_name, SQLERRM;
        RETURN false;
    END;
END;
$$
LANGUAGE plpgsql;

-- 4. Ajouter ou mettre à jour la fonction set_schema_for_user (si elle n'existe pas déjà)
DROP FUNCTION IF EXISTS public.set_schema_for_user(integer);
CREATE OR REPLACE FUNCTION public.set_schema_for_user(user_id integer)
RETURNS text AS
$$
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
$$
LANGUAGE plpgsql;

-- 5. Commentaires sur les fonctions
COMMENT ON FUNCTION public.setup_user_environment IS 'Configure le schéma client pour un utilisateur spécifique et définit le search_path';
COMMENT ON FUNCTION public.create_client_schema IS 'Crée un nouveau schéma client pour un utilisateur spécifique';
COMMENT ON FUNCTION public.set_schema_for_user IS 'Retourne la valeur à utiliser pour search_path en fonction de l''ID utilisateur';

-- 6. Message d'information
DO $$ 
BEGIN
    RAISE NOTICE 'Fonctions de gestion des schémas installées avec succès';
END $$;

-- 7. Vérification des fonctions installées
SELECT proname, pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('setup_user_environment', 'create_client_schema', 'set_schema_for_user')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'); 