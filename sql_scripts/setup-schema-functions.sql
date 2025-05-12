-- Configuration des fonctions pour la gestion des schémas

-- Fonction pour configurer l'environnement utilisateur
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

-- Fonction pour créer un nouveau schéma client
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

-- Commentaires sur les fonctions
COMMENT ON FUNCTION public.setup_user_environment IS 'Configure le schéma client pour un utilisateur spécifique et définit le search_path';
COMMENT ON FUNCTION public.create_client_schema IS 'Crée un nouveau schéma client pour un utilisateur spécifique';

-- Message d'information
DO $$ 
BEGIN
    RAISE NOTICE 'Fonctions de gestion des schémas installées avec succès';
END $$; 