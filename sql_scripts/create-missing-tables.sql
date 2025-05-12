-- Script pour créer les tables manquantes dans le schéma client
-- Exécuter ce script pour chaque client qui a besoin des tables tenant_history et properties

-- Fonction pour créer les tables manquantes dans un schéma client spécifique
CREATE OR REPLACE FUNCTION create_missing_tables_for_client(client_schema text) RETURNS void AS $$
BEGIN
    -- Vérifier si la table properties existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = client_schema AND table_name = 'properties'
    ) THEN
        EXECUTE format('
            CREATE TABLE %I.properties (
                id integer NOT NULL,
                name text NOT NULL,
                address text NOT NULL,
                description text,
                type text NOT NULL,
                units integer,
                bedrooms integer,
                floors integer,
                bathrooms integer,
                toilets integer,
                energy_class text,
                energy_emissions text,
                living_area integer,
                land_area integer,
                has_parking boolean,
                has_terrace boolean,
                has_garage boolean,
                has_outbuilding boolean,
                has_balcony boolean,
                has_elevator boolean,
                has_cellar boolean,
                has_garden boolean,
                is_new_construction boolean,
                purchase_price numeric,
                monthly_rent numeric,
                monthly_expenses numeric,
                loan_amount numeric,
                monthly_loan_payment numeric,
                loan_duration integer,
                status text,
                construction_year integer,
                purchase_date timestamp without time zone,
                rooms integer,
                isnewconstruction boolean,
                images jsonb,
                user_id integer NOT NULL,
                area integer,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                updated_at timestamp without time zone DEFAULT now() NOT NULL
            );

            ALTER TABLE %I.properties ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
        ', client_schema, client_schema);
        
        RAISE NOTICE 'Table properties créée dans le schéma %', client_schema;
    ELSE
        RAISE NOTICE 'Table properties existe déjà dans le schéma %', client_schema;
    END IF;

    -- Vérifier si la table tenant_history existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = client_schema AND table_name = 'tenant_history'
    ) THEN
        EXECUTE format('
            CREATE TABLE %I.tenant_history (
                id integer NOT NULL,
                rating integer NOT NULL,
                feedback text,
                category text DEFAULT ''general''::text,
                tenant_full_name text,
                original_user_id integer,
                event_type text DEFAULT ''evaluation''::text,
                event_severity integer DEFAULT 0,
                event_details jsonb,
                documents text[],
                bail_status text,
                bail_id integer,
                property_name text,
                created_at timestamp without time zone DEFAULT now() NOT NULL,
                created_by integer,
                tenant_id integer,
                is_orphaned boolean DEFAULT false
            );

            ALTER TABLE %I.tenant_history ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);
        ', client_schema, client_schema);
        
        RAISE NOTICE 'Table tenant_history créée dans le schéma %', client_schema;
    ELSE
        RAISE NOTICE 'Table tenant_history existe déjà dans le schéma %', client_schema;
    END IF;

    -- Créer les séquences si elles n'existent pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.sequences
        WHERE sequence_schema = client_schema AND sequence_name = 'tenant_history_id_seq'
    ) THEN
        EXECUTE format('
            CREATE SEQUENCE %I.tenant_history_id_seq
            AS integer
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;
            
            ALTER TABLE %I.tenant_history_id_seq OWNER TO postgres;
            ALTER SEQUENCE %I.tenant_history_id_seq OWNED BY %I.tenant_history.id;
            ALTER TABLE ONLY %I.tenant_history ALTER COLUMN id SET DEFAULT nextval(''%I.tenant_history_id_seq''::regclass);
        ', client_schema, client_schema, client_schema, client_schema, client_schema, client_schema);
        
        RAISE NOTICE 'Séquence tenant_history_id_seq créée dans le schéma %', client_schema;
    ELSE
        RAISE NOTICE 'Séquence tenant_history_id_seq existe déjà dans le schéma %', client_schema;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.sequences
        WHERE sequence_schema = client_schema AND sequence_name = 'properties_id_seq'
    ) THEN
        EXECUTE format('
            CREATE SEQUENCE %I.properties_id_seq
            AS integer
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;
            
            ALTER TABLE %I.properties_id_seq OWNER TO postgres;
            ALTER SEQUENCE %I.properties_id_seq OWNED BY %I.properties.id;
            ALTER TABLE ONLY %I.properties ALTER COLUMN id SET DEFAULT nextval(''%I.properties_id_seq''::regclass);
        ', client_schema, client_schema, client_schema, client_schema, client_schema, client_schema);
        
        RAISE NOTICE 'Séquence properties_id_seq créée dans le schéma %', client_schema;
    ELSE
        RAISE NOTICE 'Séquence properties_id_seq existe déjà dans le schéma %', client_schema;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Exemple d'utilisation pour le client_52
SELECT create_missing_tables_for_client('client_52');

-- Pour créer les tables pour tous les schémas clients
-- Cette requête identifie tous les schémas client_XX et crée les tables manquantes dans chacun
DO $$
DECLARE
    client_schema text;
BEGIN
    FOR client_schema IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'client_%'
    LOOP
        PERFORM create_missing_tables_for_client(client_schema);
    END LOOP;
END $$; 