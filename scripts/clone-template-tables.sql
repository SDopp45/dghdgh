-- Script pour cloner les tables du schéma template vers un schéma client
-- Ce script est conçu pour être appelé depuis la fonction create_client_schema

CREATE OR REPLACE FUNCTION public.clone_template_to_client_schema(p_schema_name text)
RETURNS boolean AS $$
DECLARE
    r RECORD;
BEGIN
    -- Vérifier que le schéma existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = p_schema_name) THEN
        RAISE EXCEPTION 'Le schéma % n''existe pas', p_schema_name;
    END IF;

    -- Vérifier que le schéma template existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'template') THEN
        RAISE EXCEPTION 'Le schéma template n''existe pas';
    END IF;
    
    RAISE NOTICE 'Clonage des tables du schéma template vers le schéma %...', p_schema_name;
    
    -- Créer la table property_coordinates dans le schéma client
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.property_coordinates (
            id serial PRIMARY KEY,
            property_id integer NOT NULL,
            latitude numeric,
            longitude numeric,
            created_at timestamp without time zone DEFAULT now() NOT NULL,
            updated_at timestamp without time zone DEFAULT now() NOT NULL
        )', p_schema_name);
    
    RAISE NOTICE 'Table property_coordinates créée dans le schéma %', p_schema_name;
    
    -- Créer les autres tables importantes du schéma template
    -- Boucle sur les tables du schéma template pour les créer dans le schéma client
    FOR r IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'template'
        AND table_name != 'property_coordinates' -- Déjà créée ci-dessus
        AND table_type = 'BASE TABLE'
    ) LOOP
        BEGIN
            -- Créer la table dans le schéma client en utilisant la structure de la table template
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.%I (
                    LIKE template.%I INCLUDING ALL
                )', p_schema_name, r.table_name, r.table_name);
                
            RAISE NOTICE 'Table % créée dans le schéma %', r.table_name, p_schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erreur lors de la création de la table % dans le schéma %: %', 
                r.table_name, p_schema_name, SQLERRM;
            -- Continuer malgré l'erreur
        END;
    END LOOP;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors du clonage des tables: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Modifier la fonction create_client_schema pour utiliser clone_template_to_client_schema
CREATE OR REPLACE FUNCTION public.create_client_schema(p_user_id integer)
RETURNS boolean AS $$
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
        
        -- Cloner les tables du schéma template vers le nouveau schéma client
        PERFORM public.clone_template_to_client_schema(schema_name);
        
        RETURN true;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la création du schéma %: %', schema_name, SQLERRM;
        RETURN false;
    END;
END;
$$ LANGUAGE plpgsql;

-- Message d'information
DO $$ 
BEGIN
    RAISE NOTICE 'Fonctions de clonage du schéma template vers les schémas clients installées avec succès';
END $$; 