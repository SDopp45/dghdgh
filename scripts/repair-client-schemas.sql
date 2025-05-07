-- Script pour vérifier et réparer les tables manquantes dans les schémas clients
-- Ce script parcourt tous les schémas client_X et vérifie si les tables essentielles existent

-- Fonction pour vérifier et créer les tables manquantes dans un schéma client
CREATE OR REPLACE FUNCTION public.verify_and_repair_client_schema(p_schema_name text)
RETURNS void AS $$
DECLARE
    missing_table_count integer := 0;
BEGIN
    RAISE NOTICE 'Vérification des tables dans le schéma %...', p_schema_name;
    
    -- Vérifier si la table property_coordinates existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = p_schema_name 
        AND table_name = 'property_coordinates'
    ) THEN
        RAISE NOTICE 'Table property_coordinates manquante dans le schéma %. Création en cours...', p_schema_name;
        
        -- Créer la table property_coordinates
        EXECUTE format('
            CREATE TABLE %I.property_coordinates (
                id serial PRIMARY KEY,
                property_id integer NOT NULL,
                latitude numeric,
                longitude numeric,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                updated_at timestamp without time zone DEFAULT now() NOT NULL
            )', p_schema_name);
            
        RAISE NOTICE 'Table property_coordinates créée dans le schéma %', p_schema_name;
        missing_table_count := missing_table_count + 1;
    END IF;
    
    -- Vérifier les autres tables essentielles
    DECLARE
        essential_tables text[] := ARRAY['properties', 'tenants', 'transactions', 'documents', 'property_history', 'tenant_history'];
        t text;
    BEGIN
        FOREACH t IN ARRAY essential_tables LOOP
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = p_schema_name 
                AND table_name = t
            ) AND EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'template' 
                AND table_name = t
            ) THEN
                RAISE NOTICE 'Table % manquante dans le schéma %. Création en cours...', t, p_schema_name;
                
                -- Créer la table depuis le modèle template
                EXECUTE format('
                    CREATE TABLE %I.%I (
                        LIKE template.%I INCLUDING ALL
                    )', p_schema_name, t, t);
                    
                RAISE NOTICE 'Table % créée dans le schéma %', t, p_schema_name;
                missing_table_count := missing_table_count + 1;
            END IF;
        END LOOP;
    END;
    
    IF missing_table_count = 0 THEN
        RAISE NOTICE 'Aucune table manquante trouvée dans le schéma %', p_schema_name;
    ELSE
        RAISE NOTICE '% table(s) ont été créées dans le schéma %', missing_table_count, p_schema_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réparer tous les schémas clients
CREATE OR REPLACE FUNCTION public.repair_all_client_schemas()
RETURNS void AS $$
DECLARE
    schema_record RECORD;
BEGIN
    RAISE NOTICE 'Recherche des schémas clients à réparer...';
    
    FOR schema_record IN (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'client_%'
    ) LOOP
        PERFORM public.verify_and_repair_client_schema(schema_record.schema_name);
    END LOOP;
    
    RAISE NOTICE 'Vérification et réparation des schémas clients terminée';
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction pour réparer tous les schémas clients
SELECT public.repair_all_client_schemas(); 