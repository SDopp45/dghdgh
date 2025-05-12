--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-11 17:59:55

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 13 (class 2615 OID 41330)
-- Name: admin_schema; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA admin_schema;


ALTER SCHEMA admin_schema OWNER TO postgres;

--
-- TOC entry 10 (class 2615 OID 39859)
-- Name: client_109; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_109;


ALTER SCHEMA client_109 OWNER TO postgres;

--
-- TOC entry 14 (class 2615 OID 42195)
-- Name: client_117; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_117;


ALTER SCHEMA client_117 OWNER TO postgres;

--
-- TOC entry 6 (class 2615 OID 27263)
-- Name: template; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA template;


ALTER SCHEMA template OWNER TO postgres;

--
-- TOC entry 2 (class 3079 OID 19479)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 7116 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 545 (class 1255 OID 41190)
-- Name: apply_schema_changes(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_schema_changes(schema_name text) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
    form_link record;
BEGIN
    -- Vérifier si la table forms existe
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.forms (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title VARCHAR(100) NOT NULL,
            description TEXT,
            fields JSONB NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )', schema_name);
    
    -- Vérifier si la table form_responses existe
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.form_responses (
            id SERIAL PRIMARY KEY,
            form_id INTEGER NOT NULL,
            response_data JSONB NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )', schema_name);
    
    -- 1. Migration: Copier les formulaires existants depuis links vers forms
    FOR form_link IN
        EXECUTE format('
            SELECT l.id, l.title, l.form_definition, 
                   COALESCE(l.user_id, (SELECT user_id FROM %I.link_profiles WHERE id = l.profile_id)) as user_id
            FROM %I.links l
            WHERE l.type = ''form'' 
            AND NOT EXISTS (SELECT 1 FROM %I.forms f WHERE f.id = l.id)
        ', schema_name, schema_name, schema_name)
    LOOP
        -- Insérer dans la table forms
        EXECUTE format('
            INSERT INTO %I.forms (id, user_id, title, description, fields, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = $3,
                fields = $5,
                updated_at = NOW()
        ', schema_name)
        USING 
            form_link.id, 
            form_link.user_id, 
            form_link.title, 
            'Formulaire migré depuis links', 
            COALESCE(form_link.form_definition, '[]'::jsonb);
    END LOOP;
    
    -- 2. Commentaires explicatifs dans le schéma
    EXECUTE format('COMMENT ON TABLE %I.forms IS ''Formulaires créés indépendamment des liens''', schema_name);
    EXECUTE format('COMMENT ON TABLE %I.form_responses IS ''Réponses soumises aux formulaires''', schema_name);
    
    -- 3. Créer des index pour améliorer les performances
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_forms_user_id ON %I.forms (user_id)', 
                   schema_name, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_form_responses_form_id ON %I.form_responses (form_id)', 
                   schema_name, schema_name);
    
    -- 4. Nettoyer les anciens liens d'association qui ne sont plus nécessaires (optionnel)
    -- EXECUTE format('DROP TABLE IF EXISTS %I.link_forms', schema_name);
    
    RAISE NOTICE 'Schema % migré avec succès', schema_name;
END;
$_$;


ALTER FUNCTION public.apply_schema_changes(schema_name text) OWNER TO postgres;

--
-- TOC entry 576 (class 1255 OID 19907)
-- Name: check_auth(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_auth(p_username text, p_password text) RETURNS TABLE(id integer, username text, role text, full_name text, email text, authenticated boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
      DECLARE
        v_user RECORD;
        v_valid BOOLEAN;
      BEGIN
        -- Trouver l'utilisateur
        SELECT * INTO v_user FROM users WHERE username = p_username;
        
        -- Vérifie si l'utilisateur existe
        IF v_user.id IS NULL THEN
          RETURN QUERY SELECT 
            NULL::INTEGER, p_username, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
          RETURN;
        END IF;
        
        -- Mode développement: accepter toujours testuser/testpass123
        IF p_username = 'testuser' AND p_password = 'testpass123' THEN
          v_valid := TRUE;
        ELSE 
          -- Vérifier le mot de passe (utiliser crypt pour bcrypt)
          SELECT EXISTS (
            SELECT 1 FROM users 
            WHERE username = p_username AND password = crypt(p_password, password)
          ) INTO v_valid;
          
          -- Fallback: test direct sur le mot de passe hashé (mode dev)
          IF NOT v_valid AND p_username = 'testuser' THEN
            UPDATE users SET password = crypt('testpass123', gen_salt('bf')) WHERE username = 'testuser';
            v_valid := TRUE;
          END IF;
        END IF;
        
        RETURN QUERY SELECT 
          v_user.id, 
          v_user.username, 
          COALESCE(v_user.role, 'clients')::TEXT,
          COALESCE(v_user.full_name, '')::TEXT, 
          COALESCE(v_user.email, '')::TEXT,
          v_valid;
          
        RETURN;
      END;
      $$;


ALTER FUNCTION public.check_auth(p_username text, p_password text) OWNER TO postgres;

--
-- TOC entry 585 (class 1255 OID 32588)
-- Name: clone_schema(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.clone_schema(source_schema text, dest_schema text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    object record;
    seq_record record;
BEGIN
    -- 1. Créer le schéma de destination s'il n'existe pas
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(dest_schema);
    
    -- 2. D'abord créer toutes les séquences
    FOR seq_record IN
        SELECT sequencename 
        FROM pg_sequences
        WHERE schemaname = source_schema
    LOOP
        EXECUTE 'CREATE SEQUENCE ' || quote_ident(dest_schema) || '.' || quote_ident(seq_record.sequencename);
    END LOOP;
    
    -- 3. Ensuite créer toutes les tables
    FOR object IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = source_schema
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'CREATE TABLE ' || quote_ident(dest_schema) || '.' || quote_ident(object.table_name) || 
                ' (LIKE ' || quote_ident(source_schema) || '.' || quote_ident(object.table_name) || ' INCLUDING ALL)';
    END LOOP;
    
    -- 4. Configurer les relations séquence-colonne
    FOR object IN
        SELECT 
            table_name, 
            column_name, 
            pg_get_serial_sequence(source_schema || '.' || table_name, column_name) as seq_name
        FROM information_schema.columns
        WHERE table_schema = source_schema
        AND column_default LIKE 'nextval%'
    LOOP
        IF object.seq_name IS NOT NULL THEN
            -- Extraire le nom de la séquence sans le schéma
            DECLARE
                seq_name_only text;
            BEGIN
                seq_name_only := replace(object.seq_name, source_schema || '.', '');
                
                -- Lier la séquence à la colonne
                EXECUTE 'ALTER TABLE ' || quote_ident(dest_schema) || '.' || quote_ident(object.table_name) || 
                        ' ALTER COLUMN ' || quote_ident(object.column_name) || 
                        ' SET DEFAULT nextval(''' || quote_ident(dest_schema) || '.' || quote_ident(seq_name_only) || ''')';
            END;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION public.clone_schema(source_schema text, dest_schema text) OWNER TO postgres;

--
-- TOC entry 581 (class 1255 OID 42859)
-- Name: create_client_schema(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_client_schema(p_user_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
    $$;


ALTER FUNCTION public.create_client_schema(p_user_id integer) OWNER TO postgres;

--
-- TOC entry 583 (class 1255 OID 30244)
-- Name: create_missing_tables_for_client(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_missing_tables_for_client(client_schema text) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.create_missing_tables_for_client(client_schema text) OWNER TO postgres;

--
-- TOC entry 586 (class 1255 OID 32603)
-- Name: create_schema_for_new_client(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_schema_for_new_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Appeler la fonction qui crée le schéma client
    PERFORM create_client_schema(NEW.id);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur dans le trigger create_schema_for_new_client: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_schema_for_new_client() OWNER TO postgres;

--
-- TOC entry 582 (class 1255 OID 30050)
-- Name: create_user_schema(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_user_schema() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_schema_name TEXT;
    BEGIN
        -- Construire le nom du schéma
        v_schema_name := 'client_' || NEW.id;
        
        -- Créer automatiquement un schéma client pour le nouvel utilisateur
        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema_name);
        RAISE NOTICE 'Schéma % créé automatiquement pour le nouvel utilisateur %', 
                     v_schema_name, NEW.username;
        RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.create_user_schema() OWNER TO postgres;

--
-- TOC entry 579 (class 1255 OID 27847)
-- Name: disable_all_rls_policies(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.disable_all_rls_policies() RETURNS boolean
    LANGUAGE plpgsql
    AS $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN 
          SELECT schemaname, tablename, policyname
          FROM pg_policies
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                         r.policyname, r.schemaname, r.tablename);
          RAISE NOTICE 'Politique % supprimée sur %.%', 
                       r.policyname, r.schemaname, r.tablename;
        END LOOP;
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Erreur: %', SQLERRM;
          RETURN FALSE;
      END;
      $$;


ALTER FUNCTION public.disable_all_rls_policies() OWNER TO postgres;

--
-- TOC entry 542 (class 1255 OID 19950)
-- Name: enable_rls_on_table(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enable_rls_on_table(table_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Vérifier si la table existe
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = table_name) THEN
    -- Activer RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    RAISE NOTICE 'RLS activé sur la table %', table_name;
  ELSE
    RAISE WARNING 'Table % non trouvée, RLS non activé', table_name;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de l''activation de RLS sur la table %: %', table_name, SQLERRM;
END;
$$;


ALTER FUNCTION public.enable_rls_on_table(table_name text) OWNER TO postgres;

--
-- TOC entry 544 (class 1255 OID 18690)
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN current_setting('app.is_admin', TRUE)::BOOLEAN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- TOC entry 578 (class 1255 OID 19948)
-- Name: log_table_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_table_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Enregistre les modifications dans la table d'historique appropriée
    IF TG_TABLE_NAME = 'properties' AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'property_history') THEN
      INSERT INTO property_history (property_id, field, old_value, new_value, change_type, user_id)
      SELECT 
        NEW.id, 
        key, 
        CAST(jsonb_build_object(key, OLD.*)::jsonb->>key AS TEXT), 
        CAST(jsonb_build_object(key, NEW.*)::jsonb->>key AS TEXT),
        'update',
        current_user_id()
      FROM jsonb_object_keys(to_jsonb(NEW.*)) k(key)
      WHERE jsonb_build_object(key, OLD.*)::jsonb->>key IS DISTINCT FROM jsonb_build_object(key, NEW.*)::jsonb->>key;
    END IF;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur dans le trigger de journalisation: %', SQLERRM;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.log_table_changes() OWNER TO postgres;

--
-- TOC entry 7136 (class 0 OID 0)
-- Dependencies: 578
-- Name: FUNCTION log_table_changes(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_table_changes() IS 'Fonction pour journaliser les modifications des tables principales';


--
-- TOC entry 554 (class 1255 OID 19450)
-- Name: recalculate_user_storage(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recalculate_user_storage(user_id_param integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
      DECLARE
        total_size NUMERIC := 0;
      BEGIN
        -- Calculer la taille totale des documents de l'utilisateur
        SELECT COALESCE(SUM(COALESCE(file_size, 0)), 0) INTO total_size
        FROM documents
        WHERE user_id = user_id_param;
        
        -- Mettre à jour la table users
        UPDATE users
        SET 
          storage_used = total_size,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id_param;
        
        RETURN total_size;
      END;
      $$;


ALTER FUNCTION public.recalculate_user_storage(user_id_param integer) OWNER TO postgres;

--
-- TOC entry 577 (class 1255 OID 19940)
-- Name: set_app_variables(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_app_variables() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Créer la fonction qui définit les variables d'application par défaut
  EXECUTE 'ALTER DATABASE ' || current_database() || ' SET app.user_id TO ''0''';
  RAISE NOTICE 'Variables d''application configurées avec succès';
END;
$$;


ALTER FUNCTION public.set_app_variables() OWNER TO postgres;

--
-- TOC entry 584 (class 1255 OID 30323)
-- Name: set_schema_for_user(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_schema_for_user(user_id integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.set_schema_for_user(user_id integer) OWNER TO postgres;

--
-- TOC entry 7160 (class 0 OID 0)
-- Dependencies: 584
-- Name: FUNCTION set_schema_for_user(user_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.set_schema_for_user(user_id integer) IS 'Retourne la valeur à utiliser pour search_path en fonction de l''ID utilisateur';


--
-- TOC entry 580 (class 1255 OID 42858)
-- Name: setup_user_environment(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.setup_user_environment(p_user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
    $$;


ALTER FUNCTION public.setup_user_environment(p_user_id integer) OWNER TO postgres;

--
-- TOC entry 551 (class 1255 OID 19210)
-- Name: sync_theme_colors(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_theme_colors() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.accent_color = (SELECT accent_color FROM pdf_themes WHERE id = NEW.theme_id);
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_theme_colors() OWNER TO postgres;

--
-- TOC entry 540 (class 1255 OID 19957)
-- Name: test_rls_config(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.test_rls_config() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  test_user_id INTEGER;
BEGIN
  -- Vérifier le nombre d'utilisateurs
  EXECUTE 'SELECT COUNT(*) FROM users' INTO test_user_id;
  
  -- Test RLS avec différents contextes
  EXECUTE 'SET app.user_id TO ''0''';
  RAISE NOTICE 'RLS avec utilisateur anonyme: OK';
  
  -- Essayer avec l'ID d'un utilisateur existant si disponible
  IF test_user_id > 0 THEN
    EXECUTE 'SET app.user_id TO ''1''';
    RAISE NOTICE 'RLS avec utilisateur ID=1: OK';
  END IF;
  
  -- Réinitialiser l'ID utilisateur
  EXECUTE 'SET app.user_id TO ''0''';
RETURN;
END;
$$;


ALTER FUNCTION public.test_rls_config() OWNER TO postgres;

--
-- TOC entry 531 (class 1255 OID 18935)
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- TOC entry 561 (class 1255 OID 19451)
-- Name: update_storage_on_document_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_storage_on_document_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Pour les insertions et mises à jour
        IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
          -- Enregistrer l'opération dans storage_usage_details
          IF (TG_OP = 'INSERT') THEN
            INSERT INTO storage_usage_details (
              user_id, document_id, file_size, operation, file_type, file_path
            ) VALUES (
              NEW.user_id, NEW.id, COALESCE(NEW.file_size, 0), 'upload', 
              NEW.file_type, NEW.file_path
            );
          ELSIF (TG_OP = 'UPDATE' AND OLD.file_size IS DISTINCT FROM NEW.file_size) THEN
            INSERT INTO storage_usage_details (
              user_id, document_id, file_size, operation, file_type, file_path
            ) VALUES (
              NEW.user_id, NEW.id, COALESCE(NEW.file_size, 0) - COALESCE(OLD.file_size, 0), 'modify', 
              NEW.file_type, NEW.file_path
            );
          END IF;
          
          -- Mise à jour du stockage utilisateur
          PERFORM recalculate_user_storage(NEW.user_id);
          RETURN NEW;
        
        -- Pour les suppressions
        ELSIF (TG_OP = 'DELETE') THEN
          -- Enregistrer l'opération dans storage_usage_details
          INSERT INTO storage_usage_details (
            user_id, document_id, file_size, operation, file_type, file_path
          ) VALUES (
            OLD.user_id, OLD.id, COALESCE(OLD.file_size, 0) * -1, 'delete', 
            OLD.file_type, OLD.file_path
          );
          
          -- Mise à jour du stockage utilisateur
          PERFORM recalculate_user_storage(OLD.user_id);
          RETURN OLD;
        END IF;
        
        RETURN NULL;
      END;
      $$;


ALTER FUNCTION public.update_storage_on_document_change() OWNER TO postgres;

--
-- TOC entry 543 (class 1255 OID 18464)
-- Name: update_user_storage_quota(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_storage_quota(p_user_id integer, p_extension_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_quota NUMERIC;
BEGIN
  -- Récupérer le quota de l'extension choisie
  SELECT quota_bytes INTO new_quota
  FROM storage_extensions
  WHERE id = p_extension_id;
  
  -- Mettre à jour le quota de l'utilisateur
  UPDATE user_storage
  SET quota_bytes = new_quota, last_updated = NOW()
  WHERE user_id = p_user_id;
  
  -- Si aucune entrée n'existe, en créer une
  IF NOT FOUND THEN
    INSERT INTO user_storage (user_id, used_bytes, quota_bytes)
    VALUES (p_user_id, 0, new_quota);
  END IF;
END;
$$;


ALTER FUNCTION public.update_user_storage_quota(p_user_id integer, p_extension_id integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 429 (class 1259 OID 41456)
-- Name: admin_activity_log; Type: TABLE; Schema: admin_schema; Owner: postgres
--

CREATE TABLE admin_schema.admin_activity_log (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    description text,
    entity_type character varying(50),
    entity_id integer,
    client_id integer,
    ip_address character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE admin_schema.admin_activity_log OWNER TO postgres;

--
-- TOC entry 428 (class 1259 OID 41455)
-- Name: admin_activity_log_id_seq; Type: SEQUENCE; Schema: admin_schema; Owner: postgres
--

CREATE SEQUENCE admin_schema.admin_activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE admin_schema.admin_activity_log_id_seq OWNER TO postgres;

--
-- TOC entry 7166 (class 0 OID 0)
-- Dependencies: 428
-- Name: admin_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: admin_schema; Owner: postgres
--

ALTER SEQUENCE admin_schema.admin_activity_log_id_seq OWNED BY admin_schema.admin_activity_log.id;


--
-- TOC entry 431 (class 1259 OID 41476)
-- Name: backup_history; Type: TABLE; Schema: admin_schema; Owner: postgres
--

CREATE TABLE admin_schema.backup_history (
    id integer NOT NULL,
    backup_name character varying(255) NOT NULL,
    backup_path character varying(255) NOT NULL,
    backup_size_mb integer,
    backup_type character varying(50) DEFAULT 'full'::character varying,
    status character varying(20) DEFAULT 'completed'::character varying,
    client_id integer,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    notes text
);


ALTER TABLE admin_schema.backup_history OWNER TO postgres;

--
-- TOC entry 430 (class 1259 OID 41475)
-- Name: backup_history_id_seq; Type: SEQUENCE; Schema: admin_schema; Owner: postgres
--

CREATE SEQUENCE admin_schema.backup_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE admin_schema.backup_history_id_seq OWNER TO postgres;

--
-- TOC entry 7167 (class 0 OID 0)
-- Dependencies: 430
-- Name: backup_history_id_seq; Type: SEQUENCE OWNED BY; Schema: admin_schema; Owner: postgres
--

ALTER SEQUENCE admin_schema.backup_history_id_seq OWNED BY admin_schema.backup_history.id;


--
-- TOC entry 427 (class 1259 OID 41435)
-- Name: client_access_requests; Type: TABLE; Schema: admin_schema; Owner: postgres
--

CREATE TABLE admin_schema.client_access_requests (
    id integer NOT NULL,
    client_id integer NOT NULL,
    request_type character varying(50) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone,
    processed_by integer,
    notes text
);


ALTER TABLE admin_schema.client_access_requests OWNER TO postgres;

--
-- TOC entry 426 (class 1259 OID 41434)
-- Name: client_access_requests_id_seq; Type: SEQUENCE; Schema: admin_schema; Owner: postgres
--

CREATE SEQUENCE admin_schema.client_access_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE admin_schema.client_access_requests_id_seq OWNER TO postgres;

--
-- TOC entry 7168 (class 0 OID 0)
-- Dependencies: 426
-- Name: client_access_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: admin_schema; Owner: postgres
--

ALTER SEQUENCE admin_schema.client_access_requests_id_seq OWNED BY admin_schema.client_access_requests.id;


--
-- TOC entry 423 (class 1259 OID 41392)
-- Name: client_daily_stats; Type: TABLE; Schema: admin_schema; Owner: postgres
--

CREATE TABLE admin_schema.client_daily_stats (
    id integer NOT NULL,
    client_id integer NOT NULL,
    stat_date date DEFAULT CURRENT_DATE NOT NULL,
    active_users integer DEFAULT 0,
    properties_count integer DEFAULT 0,
    tenants_count integer DEFAULT 0,
    documents_count integer DEFAULT 0,
    transactions_count integer DEFAULT 0,
    disk_usage_mb integer DEFAULT 0,
    requests_count integer DEFAULT 0,
    ai_requests_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE admin_schema.client_daily_stats OWNER TO postgres;

--
-- TOC entry 422 (class 1259 OID 41391)
-- Name: client_daily_stats_id_seq; Type: SEQUENCE; Schema: admin_schema; Owner: postgres
--

CREATE SEQUENCE admin_schema.client_daily_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE admin_schema.client_daily_stats_id_seq OWNER TO postgres;

--
-- TOC entry 7169 (class 0 OID 0)
-- Dependencies: 422
-- Name: client_daily_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: admin_schema; Owner: postgres
--

ALTER SEQUENCE admin_schema.client_daily_stats_id_seq OWNED BY admin_schema.client_daily_stats.id;


--
-- TOC entry 417 (class 1259 OID 41332)
-- Name: client_info; Type: TABLE; Schema: admin_schema; Owner: postgres
--

CREATE TABLE admin_schema.client_info (
    id integer NOT NULL,
    user_id integer NOT NULL,
    schema_name character varying(100) NOT NULL,
    display_name character varying(200),
    subscription_type character varying(50) DEFAULT 'standard'::character varying,
    max_properties integer DEFAULT 10,
    max_users integer DEFAULT 2,
    is_active boolean DEFAULT true,
    has_marketplace_access boolean DEFAULT false,
    has_ai_features boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expiration_date timestamp with time zone,
    last_login timestamp with time zone,
    notes text
);


ALTER TABLE admin_schema.client_info OWNER TO postgres;

--
-- TOC entry 416 (class 1259 OID 41331)
-- Name: client_info_id_seq; Type: SEQUENCE; Schema: admin_schema; Owner: postgres
--

CREATE SEQUENCE admin_schema.client_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE admin_schema.client_info_id_seq OWNER TO postgres;

--
-- TOC entry 7170 (class 0 OID 0)
-- Dependencies: 416
-- Name: client_info_id_seq; Type: SEQUENCE OWNED BY; Schema: admin_schema; Owner: postgres
--

ALTER SEQUENCE admin_schema.client_info_id_seq OWNED BY admin_schema.client_info.id;


--
-- TOC entry 425 (class 1259 OID 41416)
-- Name: system_settings; Type: TABLE; Schema: admin_schema; Owner: postgres
--

CREATE TABLE admin_schema.system_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    setting_type character varying(50) DEFAULT 'string'::character varying,
    description text,
    is_private boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer
);


ALTER TABLE admin_schema.system_settings OWNER TO postgres;

--
-- TOC entry 424 (class 1259 OID 41415)
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: admin_schema; Owner: postgres
--

CREATE SEQUENCE admin_schema.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE admin_schema.system_settings_id_seq OWNER TO postgres;

--
-- TOC entry 7171 (class 0 OID 0)
-- Dependencies: 424
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: admin_schema; Owner: postgres
--

ALTER SEQUENCE admin_schema.system_settings_id_seq OWNED BY admin_schema.system_settings.id;


--
-- TOC entry 421 (class 1259 OID 41374)
-- Name: system_stats; Type: TABLE; Schema: admin_schema; Owner: postgres
--

CREATE TABLE admin_schema.system_stats (
    id integer NOT NULL,
    stat_date date DEFAULT CURRENT_DATE NOT NULL,
    active_clients integer DEFAULT 0,
    total_clients integer DEFAULT 0,
    total_properties integer DEFAULT 0,
    total_tenants integer DEFAULT 0,
    total_transactions integer DEFAULT 0,
    total_documents integer DEFAULT 0,
    total_disk_usage_mb integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE admin_schema.system_stats OWNER TO postgres;

--
-- TOC entry 420 (class 1259 OID 41373)
-- Name: system_stats_id_seq; Type: SEQUENCE; Schema: admin_schema; Owner: postgres
--

CREATE SEQUENCE admin_schema.system_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE admin_schema.system_stats_id_seq OWNER TO postgres;

--
-- TOC entry 7172 (class 0 OID 0)
-- Dependencies: 420
-- Name: system_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: admin_schema; Owner: postgres
--

ALTER SEQUENCE admin_schema.system_stats_id_seq OWNED BY admin_schema.system_stats.id;


--
-- TOC entry 253 (class 1259 OID 27944)
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.ai_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.ai_conversations_id_seq OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 39905)
-- Name: ai_conversations; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.ai_conversations (
    id integer DEFAULT nextval('template.ai_conversations_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ai_conversations_category_check CHECK ((category = ANY (ARRAY['general'::text, 'maintenance'::text, 'lease'::text, 'payment'::text, 'other'::text]))),
    CONSTRAINT ai_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text])))
);


ALTER TABLE client_109.ai_conversations OWNER TO postgres;

--
-- TOC entry 318 (class 1259 OID 39864)
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.ai_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.ai_conversations_id_seq OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 27946)
-- Name: ai_messages_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.ai_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.ai_messages_id_seq OWNER TO postgres;

--
-- TOC entry 355 (class 1259 OID 39922)
-- Name: ai_messages; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.ai_messages (
    id integer DEFAULT nextval('template.ai_messages_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    conversation_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_urgent boolean DEFAULT false NOT NULL,
    model_id text DEFAULT 'huggingface'::text,
    provider text DEFAULT 'huggingface'::text,
    CONSTRAINT ai_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


ALTER TABLE client_109.ai_messages OWNER TO postgres;

--
-- TOC entry 320 (class 1259 OID 39866)
-- Name: ai_messages_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.ai_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.ai_messages_id_seq OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 27948)
-- Name: ai_suggestions_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.ai_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.ai_suggestions_id_seq OWNER TO postgres;

--
-- TOC entry 357 (class 1259 OID 39951)
-- Name: ai_suggestions; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.ai_suggestions (
    id integer DEFAULT nextval('template.ai_suggestions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    property_id integer,
    type text NOT NULL,
    suggestion text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT ai_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))),
    CONSTRAINT ai_suggestions_type_check CHECK ((type = ANY (ARRAY['rent_price'::text, 'maintenance'::text, 'tenant_management'::text, 'investment'::text])))
);


ALTER TABLE client_109.ai_suggestions OWNER TO postgres;

--
-- TOC entry 321 (class 1259 OID 39867)
-- Name: ai_suggestions_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.ai_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.ai_suggestions_id_seq OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 27950)
-- Name: analysis_configs_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.analysis_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.analysis_configs_id_seq OWNER TO postgres;

--
-- TOC entry 359 (class 1259 OID 39979)
-- Name: analysis_configs; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.analysis_configs (
    id integer DEFAULT nextval('template.analysis_configs_id_seq'::regclass) NOT NULL,
    property_id integer,
    user_id integer,
    name character varying(255) NOT NULL,
    period_type character varying(50) NOT NULL,
    period_value integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE client_109.analysis_configs OWNER TO postgres;

--
-- TOC entry 322 (class 1259 OID 39868)
-- Name: analysis_configs_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.analysis_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.analysis_configs_id_seq OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 28154)
-- Name: automatic_reminders_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.automatic_reminders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.automatic_reminders_id_seq OWNER TO postgres;

--
-- TOC entry 374 (class 1259 OID 40165)
-- Name: automatic_reminders; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.automatic_reminders (
    id integer DEFAULT nextval('template.automatic_reminders_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    related_entity_type text NOT NULL,
    related_entity_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    next_trigger_date date NOT NULL,
    days_in_advance integer DEFAULT 0 NOT NULL,
    recurrence text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.automatic_reminders OWNER TO postgres;

--
-- TOC entry 336 (class 1259 OID 39884)
-- Name: automatic_reminders_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.automatic_reminders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.automatic_reminders_id_seq OWNER TO postgres;

--
-- TOC entry 314 (class 1259 OID 32542)
-- Name: company_info_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.company_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.company_info_id_seq OWNER TO postgres;

--
-- TOC entry 381 (class 1259 OID 40268)
-- Name: company_info; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.company_info (
    id integer DEFAULT nextval('template.company_info_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    company_name character varying(200),
    company_address text,
    company_phone character varying(50),
    company_email character varying(100),
    company_website character varying(100),
    company_siret character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_109.company_info OWNER TO postgres;

--
-- TOC entry 342 (class 1259 OID 39891)
-- Name: company_info_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.company_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.company_info_id_seq OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 28166)
-- Name: contract_parties_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.contract_parties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.contract_parties_id_seq OWNER TO postgres;

--
-- TOC entry 375 (class 1259 OID 40180)
-- Name: contract_parties; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.contract_parties (
    id integer DEFAULT nextval('template.contract_parties_id_seq'::regclass) NOT NULL,
    contract_id integer NOT NULL,
    party_id integer NOT NULL,
    party_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT contract_parties_party_type_check CHECK ((party_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'manager'::text, 'other'::text])))
);


ALTER TABLE client_109.contract_parties OWNER TO postgres;

--
-- TOC entry 337 (class 1259 OID 39885)
-- Name: contract_parties_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.contract_parties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.contract_parties_id_seq OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 28095)
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.contracts_id_seq OWNER TO postgres;

--
-- TOC entry 368 (class 1259 OID 40091)
-- Name: contracts; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.contracts (
    id integer DEFAULT nextval('template.contracts_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    property_id integer,
    document_id integer,
    signature_required boolean DEFAULT true,
    automated_renewal boolean DEFAULT false,
    renewal_date timestamp without time zone,
    notification_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT contracts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_signature'::text, 'active'::text, 'expired'::text, 'terminated'::text]))),
    CONSTRAINT contracts_type_check CHECK ((type = ANY (ARRAY['rental'::text, 'mandate'::text, 'commercial'::text, 'attestation'::text, 'other'::text])))
);


ALTER TABLE client_109.contracts OWNER TO postgres;

--
-- TOC entry 331 (class 1259 OID 39879)
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.contracts_id_seq OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 32531)
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.document_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.document_templates_id_seq OWNER TO postgres;

--
-- TOC entry 379 (class 1259 OID 40246)
-- Name: document_templates; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.document_templates (
    id integer DEFAULT nextval('template.document_templates_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    document_type text NOT NULL,
    field_mappings jsonb NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.document_templates OWNER TO postgres;

--
-- TOC entry 341 (class 1259 OID 39890)
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.document_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.document_templates_id_seq OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 30438)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.documents_id_seq OWNER TO postgres;

--
-- TOC entry 370 (class 1259 OID 40116)
-- Name: documents; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.documents (
    id integer DEFAULT nextval('template.documents_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    type text DEFAULT 'lease'::text NOT NULL,
    file_path text NOT NULL,
    original_name text NOT NULL,
    template boolean DEFAULT false,
    user_id integer NOT NULL,
    folder_id integer,
    parent_id integer,
    template_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    form_data jsonb DEFAULT '{}'::jsonb,
    content jsonb DEFAULT '{}'::jsonb,
    theme jsonb DEFAULT '{}'::jsonb,
    file_size numeric DEFAULT 0
);


ALTER TABLE client_109.documents OWNER TO postgres;

--
-- TOC entry 310 (class 1259 OID 32521)
-- Name: documents_access_log_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.documents_access_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.documents_access_log_id_seq OWNER TO postgres;

--
-- TOC entry 378 (class 1259 OID 40237)
-- Name: documents_access_log; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.documents_access_log (
    id integer DEFAULT nextval('template.documents_access_log_id_seq'::regclass) NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    access_type text NOT NULL,
    accessed_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE client_109.documents_access_log OWNER TO postgres;

--
-- TOC entry 338 (class 1259 OID 39886)
-- Name: documents_access_log_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.documents_access_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.documents_access_log_id_seq OWNER TO postgres;

--
-- TOC entry 330 (class 1259 OID 39877)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.documents_id_seq OWNER TO postgres;

--
-- TOC entry 325 (class 1259 OID 39871)
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.feedbacks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.feedbacks_id_seq OWNER TO postgres;

--
-- TOC entry 361 (class 1259 OID 39998)
-- Name: feedbacks; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.feedbacks (
    id integer DEFAULT nextval('client_109.feedbacks_id_seq'::regclass) NOT NULL,
    tenant_id integer,
    property_id integer,
    rating integer,
    comment text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_info_id integer
);


ALTER TABLE client_109.feedbacks OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 28179)
-- Name: financial_entries_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.financial_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.financial_entries_id_seq OWNER TO postgres;

--
-- TOC entry 376 (class 1259 OID 40190)
-- Name: financial_entries; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.financial_entries (
    id integer DEFAULT nextval('template.financial_entries_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    date date NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    recurring boolean DEFAULT false,
    frequency text,
    description text,
    source text NOT NULL,
    related_entity_id integer,
    related_entity_type text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_109.financial_entries OWNER TO postgres;

--
-- TOC entry 339 (class 1259 OID 39887)
-- Name: financial_entries_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.financial_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.financial_entries_id_seq OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 28191)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.folders_id_seq OWNER TO postgres;

--
-- TOC entry 377 (class 1259 OID 40201)
-- Name: folders; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.folders (
    id integer DEFAULT nextval('template.folders_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.folders OWNER TO postgres;

--
-- TOC entry 340 (class 1259 OID 39888)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.folders_id_seq OWNER TO postgres;

--
-- TOC entry 396 (class 1259 OID 40946)
-- Name: form_responses_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.form_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.form_responses_id_seq OWNER TO postgres;

--
-- TOC entry 401 (class 1259 OID 41023)
-- Name: form_responses; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.form_responses (
    id integer DEFAULT nextval('client_109.form_responses_id_seq'::regclass) NOT NULL,
    form_id integer NOT NULL,
    response_data jsonb NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    link_id integer
);


ALTER TABLE client_109.form_responses OWNER TO postgres;

--
-- TOC entry 7173 (class 0 OID 0)
-- Dependencies: 401
-- Name: TABLE form_responses; Type: COMMENT; Schema: client_109; Owner: postgres
--

COMMENT ON TABLE client_109.form_responses IS 'Réponses soumises aux formulaires';


--
-- TOC entry 413 (class 1259 OID 41232)
-- Name: form_submissions; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.form_submissions (
    id integer NOT NULL,
    link_id integer NOT NULL,
    form_data jsonb NOT NULL,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    form_id integer
);


ALTER TABLE client_109.form_submissions OWNER TO postgres;

--
-- TOC entry 412 (class 1259 OID 41231)
-- Name: form_submissions_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.form_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.form_submissions_id_seq OWNER TO postgres;

--
-- TOC entry 7174 (class 0 OID 0)
-- Dependencies: 412
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: client_109; Owner: postgres
--

ALTER SEQUENCE client_109.form_submissions_id_seq OWNED BY client_109.form_submissions.id;


--
-- TOC entry 392 (class 1259 OID 40942)
-- Name: forms_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.forms_id_seq OWNER TO postgres;

--
-- TOC entry 398 (class 1259 OID 40974)
-- Name: forms; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.forms (
    id integer DEFAULT nextval('client_109.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_109.forms OWNER TO postgres;

--
-- TOC entry 7175 (class 0 OID 0)
-- Dependencies: 398
-- Name: TABLE forms; Type: COMMENT; Schema: client_109; Owner: postgres
--

COMMENT ON TABLE client_109.forms IS 'Formulaires créés indépendamment des liens';


--
-- TOC entry 395 (class 1259 OID 40945)
-- Name: link_forms_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.link_forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.link_forms_id_seq OWNER TO postgres;

--
-- TOC entry 400 (class 1259 OID 41004)
-- Name: link_forms; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.link_forms (
    id integer DEFAULT nextval('client_109.link_forms_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    form_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_109.link_forms OWNER TO postgres;

--
-- TOC entry 7176 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE link_forms; Type: COMMENT; Schema: client_109; Owner: postgres
--

COMMENT ON TABLE client_109.link_forms IS 'Association entre liens et formulaires';


--
-- TOC entry 393 (class 1259 OID 40943)
-- Name: link_profiles_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.link_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.link_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 397 (class 1259 OID 40947)
-- Name: link_profiles; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.link_profiles (
    id integer DEFAULT nextval('client_109.link_profiles_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    slug character varying(100) NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    background_color character varying(20) DEFAULT '#ffffff'::character varying,
    text_color character varying(20) DEFAULT '#000000'::character varying,
    accent_color character varying(20) DEFAULT '#70C7BA'::character varying,
    logo_url text,
    views integer DEFAULT 0,
    background_image text,
    background_pattern text,
    button_style character varying(20) DEFAULT 'rounded'::character varying,
    button_radius integer DEFAULT 8,
    font_family character varying(50) DEFAULT 'Inter'::character varying,
    animation character varying(30) DEFAULT 'fade'::character varying,
    custom_css text,
    custom_theme jsonb,
    background_saturation integer DEFAULT 100,
    background_hue_rotate integer DEFAULT 0,
    background_sepia integer DEFAULT 0,
    background_grayscale integer DEFAULT 0,
    background_invert integer DEFAULT 0,
    background_color_filter character varying(20),
    background_color_filter_opacity real DEFAULT 0.3,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_paused boolean DEFAULT false
);


ALTER TABLE client_109.link_profiles OWNER TO postgres;

--
-- TOC entry 7177 (class 0 OID 0)
-- Dependencies: 397
-- Name: TABLE link_profiles; Type: COMMENT; Schema: client_109; Owner: postgres
--

COMMENT ON TABLE client_109.link_profiles IS 'Profils de liens des utilisateurs';


--
-- TOC entry 394 (class 1259 OID 40944)
-- Name: links_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.links_id_seq OWNER TO postgres;

--
-- TOC entry 399 (class 1259 OID 40984)
-- Name: links; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.links (
    id integer DEFAULT nextval('client_109.links_id_seq'::regclass) NOT NULL,
    profile_id integer NOT NULL,
    title character varying(100) NOT NULL,
    url text NOT NULL,
    icon text,
    enabled boolean DEFAULT true,
    clicks integer DEFAULT 0,
    "position" integer DEFAULT 0,
    featured boolean DEFAULT false,
    custom_color character varying(20),
    custom_text_color character varying(20),
    animation character varying(30),
    type character varying(20) DEFAULT 'link'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    button_style character varying(20),
    user_id integer,
    form_definition jsonb
);


ALTER TABLE client_109.links OWNER TO postgres;

--
-- TOC entry 7178 (class 0 OID 0)
-- Dependencies: 399
-- Name: TABLE links; Type: COMMENT; Schema: client_109; Owner: postgres
--

COMMENT ON TABLE client_109.links IS 'Liens des profils';


--
-- TOC entry 270 (class 1259 OID 28253)
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.maintenance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.maintenance_id_seq OWNER TO postgres;

--
-- TOC entry 380 (class 1259 OID 40256)
-- Name: maintenance; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.maintenance (
    id integer DEFAULT nextval('template.maintenance_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "propertyId" integer NOT NULL,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    total_cost numeric(10,2),
    document_id integer,
    document_ids jsonb DEFAULT '[]'::jsonb,
    reported_by text
);


ALTER TABLE client_109.maintenance OWNER TO postgres;

--
-- TOC entry 343 (class 1259 OID 39894)
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.maintenance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.maintenance_id_seq OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 28342)
-- Name: pdf_configuration_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.pdf_configuration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.pdf_configuration_id_seq OWNER TO postgres;

--
-- TOC entry 385 (class 1259 OID 40331)
-- Name: pdf_configuration; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.pdf_configuration (
    id integer DEFAULT nextval('template.pdf_configuration_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    orientation character varying(20) DEFAULT 'portrait'::character varying,
    page_size character varying(20) DEFAULT 'A4'::character varying,
    margin_top integer DEFAULT 20,
    margin_right integer DEFAULT 10,
    margin_bottom integer DEFAULT 20,
    margin_left integer DEFAULT 10,
    show_header boolean DEFAULT true,
    show_footer boolean DEFAULT true,
    show_pagination boolean DEFAULT true,
    show_filters boolean DEFAULT true,
    default_config boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    header_color character varying(20) DEFAULT '#f3f4f6'::character varying,
    alternate_row_color character varying(20) DEFAULT '#f9fafb'::character varying,
    items_per_page integer DEFAULT 25,
    custom_title text,
    font_family character varying(100) DEFAULT 'Helvetica'::character varying,
    font_size integer DEFAULT 10,
    theme_id integer,
    accent_color character varying(20),
    watermark_text text,
    watermark_opacity double precision DEFAULT 0.1,
    compress_pdf boolean DEFAULT true,
    password_protection text,
    print_background boolean DEFAULT true,
    scale double precision DEFAULT 1.0,
    landscape_scaling boolean DEFAULT true,
    header_height integer DEFAULT 30,
    footer_height integer DEFAULT 20
);


ALTER TABLE client_109.pdf_configuration OWNER TO postgres;

--
-- TOC entry 347 (class 1259 OID 39898)
-- Name: pdf_configuration_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.pdf_configuration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.pdf_configuration_id_seq OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 28361)
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.pdf_document_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.pdf_document_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 387 (class 1259 OID 40373)
-- Name: pdf_document_preferences; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.pdf_document_preferences (
    id integer DEFAULT nextval('template.pdf_document_preferences_id_seq'::regclass) NOT NULL,
    configuration_id integer NOT NULL,
    document_type character varying(20) NOT NULL,
    enabled boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    columns_to_display text[],
    custom_title character varying(255),
    table_header_color character varying(10),
    table_text_color character varying(10),
    table_alternate_color character varying(10),
    max_items_per_page integer DEFAULT 10,
    user_id integer,
    CONSTRAINT pdf_document_preferences_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['visits'::character varying, 'tenants'::character varying, 'maintenance'::character varying, 'transactions'::character varying])::text[])))
);


ALTER TABLE client_109.pdf_document_preferences OWNER TO postgres;

--
-- TOC entry 349 (class 1259 OID 39900)
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.pdf_document_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.pdf_document_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 28376)
-- Name: pdf_logos_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.pdf_logos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.pdf_logos_id_seq OWNER TO postgres;

--
-- TOC entry 388 (class 1259 OID 40390)
-- Name: pdf_logos; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.pdf_logos (
    id integer DEFAULT nextval('template.pdf_logos_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_data text NOT NULL,
    width integer DEFAULT 100,
    height integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_109.pdf_logos OWNER TO postgres;

--
-- TOC entry 350 (class 1259 OID 39901)
-- Name: pdf_logos_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.pdf_logos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.pdf_logos_id_seq OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 28396)
-- Name: pdf_templates_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.pdf_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.pdf_templates_id_seq OWNER TO postgres;

--
-- TOC entry 389 (class 1259 OID 40403)
-- Name: pdf_templates; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.pdf_templates (
    id integer DEFAULT nextval('template.pdf_templates_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    columns jsonb NOT NULL,
    header_template text,
    footer_template text,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    header_color character varying(20) DEFAULT '#f3f4f6'::character varying,
    alternate_row_color character varying(20) DEFAULT '#f9fafb'::character varying,
    items_per_page integer DEFAULT 25,
    default_title text,
    border_style character varying(20) DEFAULT 'solid'::character varying,
    border_width integer DEFAULT 1,
    row_padding integer DEFAULT 8,
    cell_alignment character varying(20) DEFAULT 'left'::character varying,
    user_id integer
);


ALTER TABLE client_109.pdf_templates OWNER TO postgres;

--
-- TOC entry 351 (class 1259 OID 39902)
-- Name: pdf_templates_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.pdf_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.pdf_templates_id_seq OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 28412)
-- Name: pdf_themes_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.pdf_themes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.pdf_themes_id_seq OWNER TO postgres;

--
-- TOC entry 390 (class 1259 OID 40421)
-- Name: pdf_themes; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.pdf_themes (
    id integer DEFAULT nextval('template.pdf_themes_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    header_color character varying(20) NOT NULL,
    alternate_row_color character varying(20) NOT NULL,
    text_color character varying(20) DEFAULT '#000000'::character varying,
    border_color character varying(20) DEFAULT '#e5e7eb'::character varying,
    accent_color character varying(20) DEFAULT '#3b82f6'::character varying,
    background_color character varying(20) DEFAULT '#ffffff'::character varying,
    font_family character varying(100) DEFAULT 'Helvetica'::character varying,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE client_109.pdf_themes OWNER TO postgres;

--
-- TOC entry 352 (class 1259 OID 39903)
-- Name: pdf_themes_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.pdf_themes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.pdf_themes_id_seq OWNER TO postgres;

--
-- TOC entry 316 (class 1259 OID 39862)
-- Name: properties_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.properties_id_seq OWNER TO postgres;

--
-- TOC entry 356 (class 1259 OID 39941)
-- Name: properties; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.properties (
    id integer DEFAULT nextval('client_109.properties_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_109.properties OWNER TO postgres;

--
-- TOC entry 329 (class 1259 OID 39876)
-- Name: property_analyses_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.property_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.property_analyses_id_seq OWNER TO postgres;

--
-- TOC entry 367 (class 1259 OID 40073)
-- Name: property_analyses; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.property_analyses (
    id integer DEFAULT nextval('client_109.property_analyses_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    analysis_type text NOT NULL,
    analysis_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.property_analyses OWNER TO postgres;

--
-- TOC entry 328 (class 1259 OID 39875)
-- Name: property_coordinates_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.property_coordinates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.property_coordinates_id_seq OWNER TO postgres;

--
-- TOC entry 364 (class 1259 OID 40044)
-- Name: property_coordinates; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.property_coordinates (
    id integer DEFAULT nextval('client_109.property_coordinates_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    latitude numeric,
    longitude numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.property_coordinates OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 28266)
-- Name: property_financial_goals_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.property_financial_goals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.property_financial_goals_id_seq OWNER TO postgres;

--
-- TOC entry 382 (class 1259 OID 40295)
-- Name: property_financial_goals; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.property_financial_goals (
    id integer DEFAULT nextval('template.property_financial_goals_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    target_value numeric(10,2) NOT NULL,
    current_value numeric(10,2),
    deadline date,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_109.property_financial_goals OWNER TO postgres;

--
-- TOC entry 344 (class 1259 OID 39895)
-- Name: property_financial_goals_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.property_financial_goals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.property_financial_goals_id_seq OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 28278)
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.property_financial_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.property_financial_snapshots_id_seq OWNER TO postgres;

--
-- TOC entry 383 (class 1259 OID 40306)
-- Name: property_financial_snapshots; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.property_financial_snapshots (
    id integer DEFAULT nextval('template.property_financial_snapshots_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    snapshot_date date NOT NULL,
    gross_rental_yield numeric(10,2),
    net_rental_yield numeric(10,2),
    cash_on_cash_return numeric(10,2),
    cap_rate numeric(10,2),
    monthly_cash_flow numeric(10,2),
    total_income numeric(10,2),
    total_expenses numeric(10,2),
    occupancy_rate numeric(10,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_109.property_financial_snapshots OWNER TO postgres;

--
-- TOC entry 345 (class 1259 OID 39896)
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.property_financial_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.property_financial_snapshots_id_seq OWNER TO postgres;

--
-- TOC entry 306 (class 1259 OID 32469)
-- Name: property_history_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.property_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.property_history_id_seq OWNER TO postgres;

--
-- TOC entry 372 (class 1259 OID 40142)
-- Name: property_history; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.property_history (
    id integer DEFAULT nextval('template.property_history_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    field text NOT NULL,
    old_value text,
    new_value text,
    change_type text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE client_109.property_history OWNER TO postgres;

--
-- TOC entry 334 (class 1259 OID 39882)
-- Name: property_history_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.property_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.property_history_id_seq OWNER TO postgres;

--
-- TOC entry 308 (class 1259 OID 32480)
-- Name: property_works_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.property_works_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.property_works_id_seq OWNER TO postgres;

--
-- TOC entry 373 (class 1259 OID 40152)
-- Name: property_works; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.property_works (
    id integer DEFAULT nextval('template.property_works_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2),
    contractor text,
    priority text DEFAULT 'medium'::text,
    documents jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.property_works OWNER TO postgres;

--
-- TOC entry 335 (class 1259 OID 39883)
-- Name: property_works_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.property_works_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.property_works_id_seq OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 28295)
-- Name: rent_receipts_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.rent_receipts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.rent_receipts_id_seq OWNER TO postgres;

--
-- TOC entry 384 (class 1259 OID 40316)
-- Name: rent_receipts; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.rent_receipts (
    id integer DEFAULT nextval('template.rent_receipts_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    property_id integer NOT NULL,
    transaction_id integer NOT NULL,
    amount real NOT NULL,
    charges real NOT NULL,
    rent_period_start date NOT NULL,
    rent_period_end date NOT NULL,
    status text DEFAULT 'generated'::text NOT NULL,
    document_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_109.rent_receipts OWNER TO postgres;

--
-- TOC entry 346 (class 1259 OID 39897)
-- Name: rent_receipts_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.rent_receipts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.rent_receipts_id_seq OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 28097)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.reports_id_seq OWNER TO postgres;

--
-- TOC entry 369 (class 1259 OID 40106)
-- Name: reports; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.reports (
    id integer DEFAULT nextval('template.reports_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "reportType" text,
    "fileUrl" text,
    "userId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_109.reports OWNER TO postgres;

--
-- TOC entry 332 (class 1259 OID 39880)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.reports_id_seq OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 32447)
-- Name: storage_transactions_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.storage_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.storage_transactions_id_seq OWNER TO postgres;

--
-- TOC entry 371 (class 1259 OID 40132)
-- Name: storage_transactions; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.storage_transactions (
    id integer DEFAULT nextval('template.storage_transactions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    previous_tier character varying(10) NOT NULL,
    new_tier character varying(10) NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiration_date timestamp without time zone,
    payment_method character varying(50),
    payment_reference character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying,
    notes text
);


ALTER TABLE client_109.storage_transactions OWNER TO postgres;

--
-- TOC entry 333 (class 1259 OID 39881)
-- Name: storage_transactions_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.storage_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.storage_transactions_id_seq OWNER TO postgres;

--
-- TOC entry 348 (class 1259 OID 39899)
-- Name: storage_usage_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.storage_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.storage_usage_id_seq OWNER TO postgres;

--
-- TOC entry 386 (class 1259 OID 40364)
-- Name: storage_usage; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.storage_usage (
    id integer DEFAULT nextval('client_109.storage_usage_id_seq'::regclass) NOT NULL,
    resource_type text NOT NULL,
    resource_id integer NOT NULL,
    filename text,
    file_path text,
    file_type text,
    size_bytes bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE client_109.storage_usage OWNER TO postgres;

--
-- TOC entry 317 (class 1259 OID 39863)
-- Name: tenant_documents_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.tenant_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.tenant_documents_id_seq OWNER TO postgres;

--
-- TOC entry 358 (class 1259 OID 39969)
-- Name: tenant_documents; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.tenant_documents (
    id integer DEFAULT nextval('client_109.tenant_documents_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    document_type text DEFAULT 'lease'::text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_109.tenant_documents OWNER TO postgres;

--
-- TOC entry 319 (class 1259 OID 39865)
-- Name: tenant_history_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.tenant_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.tenant_history_id_seq OWNER TO postgres;

--
-- TOC entry 362 (class 1259 OID 40008)
-- Name: tenant_history; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.tenant_history (
    id integer DEFAULT nextval('client_109.tenant_history_id_seq'::regclass) NOT NULL,
    rating integer NOT NULL,
    feedback text,
    category text DEFAULT 'general'::text,
    tenant_full_name text,
    original_user_id integer,
    event_type text DEFAULT 'evaluation'::text,
    event_severity integer DEFAULT 0,
    event_details jsonb,
    documents text[],
    bail_status text,
    bail_id integer,
    property_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    tenant_id integer,
    is_orphaned boolean DEFAULT false,
    tenant_info_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer
);


ALTER TABLE client_109.tenant_history OWNER TO postgres;

--
-- TOC entry 323 (class 1259 OID 39869)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.tenants_id_seq OWNER TO postgres;

--
-- TOC entry 363 (class 1259 OID 40022)
-- Name: tenants; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.tenants (
    id integer DEFAULT nextval('client_109.tenants_id_seq'::regclass) NOT NULL,
    user_id integer,
    property_id integer NOT NULL,
    lease_start timestamp without time zone NOT NULL,
    lease_end timestamp without time zone NOT NULL,
    rent_amount numeric(10,2) NOT NULL,
    lease_type text NOT NULL,
    active boolean DEFAULT true,
    lease_status text DEFAULT 'actif'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_id integer,
    tenant_info_id integer
);


ALTER TABLE client_109.tenants OWNER TO postgres;

--
-- TOC entry 324 (class 1259 OID 39870)
-- Name: tenants_info_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.tenants_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.tenants_info_id_seq OWNER TO postgres;

--
-- TOC entry 360 (class 1259 OID 39988)
-- Name: tenants_info; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.tenants_info (
    id integer DEFAULT nextval('client_109.tenants_info_id_seq'::regclass) NOT NULL,
    full_name text NOT NULL,
    email text,
    phone_number text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_109.tenants_info OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 30396)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.transaction_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 366 (class 1259 OID 40064)
-- Name: transaction_attachments; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.transaction_attachments (
    id integer DEFAULT nextval('template.transaction_attachments_id_seq'::regclass) NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE client_109.transaction_attachments OWNER TO postgres;

--
-- TOC entry 327 (class 1259 OID 39874)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.transaction_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 30385)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 365 (class 1259 OID 40054)
-- Name: transactions; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.transactions (
    id integer DEFAULT nextval('template.transactions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    property_id integer,
    tenant_id integer,
    document_id integer,
    document_ids integer[],
    type text NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    date timestamp without time zone NOT NULL,
    status text NOT NULL,
    payment_method text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_109.transactions OWNER TO postgres;

--
-- TOC entry 326 (class 1259 OID 39873)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 39904)
-- Name: visits_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.visits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.visits_id_seq OWNER TO postgres;

--
-- TOC entry 391 (class 1259 OID 40470)
-- Name: visits; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.visits (
    id integer DEFAULT nextval('client_109.visits_id_seq'::regclass) NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    datetime timestamp without time zone NOT NULL,
    visit_type text NOT NULL,
    property_id integer,
    manual_address text,
    message text,
    status text DEFAULT 'pending'::text,
    rating integer,
    feedback text,
    archived boolean DEFAULT false,
    agent_id integer,
    source text DEFAULT 'manual'::text,
    documents jsonb DEFAULT '[]'::jsonb,
    reminder_sent boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.visits OWNER TO postgres;

--
-- TOC entry 476 (class 1259 OID 42242)
-- Name: ai_conversations; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.ai_conversations (
    id integer DEFAULT nextval('template.ai_conversations_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ai_conversations_category_check CHECK ((category = ANY (ARRAY['general'::text, 'maintenance'::text, 'lease'::text, 'payment'::text, 'other'::text]))),
    CONSTRAINT ai_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text])))
);


ALTER TABLE client_117.ai_conversations OWNER TO postgres;

--
-- TOC entry 434 (class 1259 OID 42200)
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.ai_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.ai_conversations_id_seq OWNER TO postgres;

--
-- TOC entry 477 (class 1259 OID 42259)
-- Name: ai_messages; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.ai_messages (
    id integer DEFAULT nextval('template.ai_messages_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    conversation_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_urgent boolean DEFAULT false NOT NULL,
    model_id text DEFAULT 'huggingface'::text,
    provider text DEFAULT 'huggingface'::text,
    CONSTRAINT ai_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


ALTER TABLE client_117.ai_messages OWNER TO postgres;

--
-- TOC entry 436 (class 1259 OID 42202)
-- Name: ai_messages_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.ai_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.ai_messages_id_seq OWNER TO postgres;

--
-- TOC entry 479 (class 1259 OID 42288)
-- Name: ai_suggestions; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.ai_suggestions (
    id integer DEFAULT nextval('template.ai_suggestions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    property_id integer,
    type text NOT NULL,
    suggestion text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT ai_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))),
    CONSTRAINT ai_suggestions_type_check CHECK ((type = ANY (ARRAY['rent_price'::text, 'maintenance'::text, 'tenant_management'::text, 'investment'::text])))
);


ALTER TABLE client_117.ai_suggestions OWNER TO postgres;

--
-- TOC entry 437 (class 1259 OID 42203)
-- Name: ai_suggestions_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.ai_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.ai_suggestions_id_seq OWNER TO postgres;

--
-- TOC entry 481 (class 1259 OID 42316)
-- Name: analysis_configs; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.analysis_configs (
    id integer DEFAULT nextval('template.analysis_configs_id_seq'::regclass) NOT NULL,
    property_id integer,
    user_id integer,
    name character varying(255) NOT NULL,
    period_type character varying(50) NOT NULL,
    period_value integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE client_117.analysis_configs OWNER TO postgres;

--
-- TOC entry 438 (class 1259 OID 42204)
-- Name: analysis_configs_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.analysis_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.analysis_configs_id_seq OWNER TO postgres;

--
-- TOC entry 497 (class 1259 OID 42491)
-- Name: automatic_reminders; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.automatic_reminders (
    id integer DEFAULT nextval('template.automatic_reminders_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    related_entity_type text NOT NULL,
    related_entity_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    next_trigger_date date NOT NULL,
    days_in_advance integer DEFAULT 0 NOT NULL,
    recurrence text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_117.automatic_reminders OWNER TO postgres;

--
-- TOC entry 453 (class 1259 OID 42219)
-- Name: automatic_reminders_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.automatic_reminders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.automatic_reminders_id_seq OWNER TO postgres;

--
-- TOC entry 504 (class 1259 OID 42568)
-- Name: company_info; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.company_info (
    id integer DEFAULT nextval('template.company_info_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    company_name character varying(200),
    company_address text,
    company_phone character varying(50),
    company_email character varying(100),
    company_website character varying(100),
    company_siret character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_117.company_info OWNER TO postgres;

--
-- TOC entry 459 (class 1259 OID 42225)
-- Name: company_info_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.company_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.company_info_id_seq OWNER TO postgres;

--
-- TOC entry 498 (class 1259 OID 42506)
-- Name: contract_parties; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.contract_parties (
    id integer DEFAULT nextval('template.contract_parties_id_seq'::regclass) NOT NULL,
    contract_id integer NOT NULL,
    party_id integer NOT NULL,
    party_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT contract_parties_party_type_check CHECK ((party_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'manager'::text, 'other'::text])))
);


ALTER TABLE client_117.contract_parties OWNER TO postgres;

--
-- TOC entry 454 (class 1259 OID 42220)
-- Name: contract_parties_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.contract_parties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.contract_parties_id_seq OWNER TO postgres;

--
-- TOC entry 491 (class 1259 OID 42417)
-- Name: contracts; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.contracts (
    id integer DEFAULT nextval('template.contracts_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    property_id integer,
    document_id integer,
    signature_required boolean DEFAULT true,
    automated_renewal boolean DEFAULT false,
    renewal_date timestamp without time zone,
    notification_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT contracts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_signature'::text, 'active'::text, 'expired'::text, 'terminated'::text]))),
    CONSTRAINT contracts_type_check CHECK ((type = ANY (ARRAY['rental'::text, 'mandate'::text, 'commercial'::text, 'attestation'::text, 'other'::text])))
);


ALTER TABLE client_117.contracts OWNER TO postgres;

--
-- TOC entry 448 (class 1259 OID 42214)
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.contracts_id_seq OWNER TO postgres;

--
-- TOC entry 502 (class 1259 OID 42546)
-- Name: document_templates; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.document_templates (
    id integer DEFAULT nextval('template.document_templates_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    document_type text NOT NULL,
    field_mappings jsonb NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_117.document_templates OWNER TO postgres;

--
-- TOC entry 458 (class 1259 OID 42224)
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.document_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.document_templates_id_seq OWNER TO postgres;

--
-- TOC entry 493 (class 1259 OID 42442)
-- Name: documents; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.documents (
    id integer DEFAULT nextval('template.documents_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    type text DEFAULT 'lease'::text NOT NULL,
    file_path text NOT NULL,
    original_name text NOT NULL,
    template boolean DEFAULT false,
    user_id integer NOT NULL,
    folder_id integer,
    parent_id integer,
    template_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    form_data jsonb DEFAULT '{}'::jsonb,
    content jsonb DEFAULT '{}'::jsonb,
    theme jsonb DEFAULT '{}'::jsonb,
    file_size numeric DEFAULT 0
);


ALTER TABLE client_117.documents OWNER TO postgres;

--
-- TOC entry 501 (class 1259 OID 42537)
-- Name: documents_access_log; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.documents_access_log (
    id integer DEFAULT nextval('template.documents_access_log_id_seq'::regclass) NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    access_type text NOT NULL,
    accessed_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE client_117.documents_access_log OWNER TO postgres;

--
-- TOC entry 455 (class 1259 OID 42221)
-- Name: documents_access_log_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.documents_access_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.documents_access_log_id_seq OWNER TO postgres;

--
-- TOC entry 447 (class 1259 OID 42213)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.documents_id_seq OWNER TO postgres;

--
-- TOC entry 442 (class 1259 OID 42208)
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.feedbacks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.feedbacks_id_seq OWNER TO postgres;

--
-- TOC entry 484 (class 1259 OID 42342)
-- Name: feedbacks; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.feedbacks (
    id integer DEFAULT nextval('client_117.feedbacks_id_seq'::regclass) NOT NULL,
    tenant_id integer,
    property_id integer,
    rating integer,
    comment text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_info_id integer
);


ALTER TABLE client_117.feedbacks OWNER TO postgres;

--
-- TOC entry 499 (class 1259 OID 42516)
-- Name: financial_entries; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.financial_entries (
    id integer DEFAULT nextval('template.financial_entries_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    date date NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    recurring boolean DEFAULT false,
    frequency text,
    description text,
    source text NOT NULL,
    related_entity_id integer,
    related_entity_type text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_117.financial_entries OWNER TO postgres;

--
-- TOC entry 456 (class 1259 OID 42222)
-- Name: financial_entries_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.financial_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.financial_entries_id_seq OWNER TO postgres;

--
-- TOC entry 500 (class 1259 OID 42527)
-- Name: folders; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.folders (
    id integer DEFAULT nextval('template.folders_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_117.folders OWNER TO postgres;

--
-- TOC entry 457 (class 1259 OID 42223)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.folders_id_seq OWNER TO postgres;

--
-- TOC entry 406 (class 1259 OID 41051)
-- Name: form_responses_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.form_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.form_responses_id_seq OWNER TO postgres;

--
-- TOC entry 518 (class 1259 OID 42785)
-- Name: form_responses; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.form_responses (
    id integer DEFAULT nextval('template.form_responses_id_seq'::regclass) NOT NULL,
    form_id integer NOT NULL,
    response_data jsonb NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    link_id integer
);


ALTER TABLE client_117.form_responses OWNER TO postgres;

--
-- TOC entry 474 (class 1259 OID 42240)
-- Name: form_responses_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.form_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.form_responses_id_seq OWNER TO postgres;

--
-- TOC entry 441 (class 1259 OID 42207)
-- Name: form_submissions_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.form_submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.form_submissions_id_seq OWNER TO postgres;

--
-- TOC entry 482 (class 1259 OID 42325)
-- Name: form_submissions; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.form_submissions (
    id integer DEFAULT nextval('client_117.form_submissions_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    form_data jsonb NOT NULL,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    form_id integer
);


ALTER TABLE client_117.form_submissions OWNER TO postgres;

--
-- TOC entry 402 (class 1259 OID 41047)
-- Name: forms_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.forms_id_seq OWNER TO postgres;

--
-- TOC entry 516 (class 1259 OID 42763)
-- Name: forms; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.forms (
    id integer DEFAULT nextval('template.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_117.forms OWNER TO postgres;

--
-- TOC entry 470 (class 1259 OID 42236)
-- Name: forms_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.forms_id_seq OWNER TO postgres;

--
-- TOC entry 405 (class 1259 OID 41050)
-- Name: link_forms_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.link_forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.link_forms_id_seq OWNER TO postgres;

--
-- TOC entry 517 (class 1259 OID 42774)
-- Name: link_forms; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.link_forms (
    id integer DEFAULT nextval('template.link_forms_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    form_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_117.link_forms OWNER TO postgres;

--
-- TOC entry 473 (class 1259 OID 42239)
-- Name: link_forms_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.link_forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.link_forms_id_seq OWNER TO postgres;

--
-- TOC entry 403 (class 1259 OID 41048)
-- Name: link_profiles_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.link_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.link_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 515 (class 1259 OID 42735)
-- Name: link_profiles; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.link_profiles (
    id integer DEFAULT nextval('template.link_profiles_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    slug character varying(100) NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    background_color character varying(20) DEFAULT '#ffffff'::character varying,
    text_color character varying(20) DEFAULT '#000000'::character varying,
    accent_color character varying(20) DEFAULT '#70C7BA'::character varying,
    logo_url text,
    views integer DEFAULT 0,
    background_image text,
    background_pattern text,
    button_style character varying(20) DEFAULT 'rounded'::character varying,
    button_radius integer DEFAULT 8,
    font_family character varying(50) DEFAULT 'Inter'::character varying,
    animation character varying(30) DEFAULT 'fade'::character varying,
    custom_css text,
    custom_theme jsonb,
    background_saturation integer DEFAULT 100,
    background_hue_rotate integer DEFAULT 0,
    background_sepia integer DEFAULT 0,
    background_grayscale integer DEFAULT 0,
    background_invert integer DEFAULT 0,
    background_color_filter character varying(20),
    background_color_filter_opacity real DEFAULT 0.3,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_paused boolean DEFAULT false
);


ALTER TABLE client_117.link_profiles OWNER TO postgres;

--
-- TOC entry 471 (class 1259 OID 42237)
-- Name: link_profiles_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.link_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.link_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 404 (class 1259 OID 41049)
-- Name: links_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.links_id_seq OWNER TO postgres;

--
-- TOC entry 514 (class 1259 OID 42718)
-- Name: links; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.links (
    id integer DEFAULT nextval('template.links_id_seq'::regclass) NOT NULL,
    profile_id integer NOT NULL,
    title character varying(100) NOT NULL,
    url text NOT NULL,
    icon character varying(50),
    enabled boolean DEFAULT true,
    clicks integer DEFAULT 0,
    "position" integer DEFAULT 0,
    featured boolean DEFAULT false,
    custom_color character varying(20),
    custom_text_color character varying(20),
    animation character varying(30),
    type character varying(20) DEFAULT 'link'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    button_style character varying(20),
    user_id integer,
    form_definition jsonb
);


ALTER TABLE client_117.links OWNER TO postgres;

--
-- TOC entry 472 (class 1259 OID 42238)
-- Name: links_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.links_id_seq OWNER TO postgres;

--
-- TOC entry 503 (class 1259 OID 42556)
-- Name: maintenance; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.maintenance (
    id integer DEFAULT nextval('template.maintenance_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "propertyId" integer NOT NULL,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    total_cost numeric(10,2),
    document_id integer,
    document_ids jsonb DEFAULT '[]'::jsonb,
    reported_by text
);


ALTER TABLE client_117.maintenance OWNER TO postgres;

--
-- TOC entry 460 (class 1259 OID 42226)
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.maintenance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.maintenance_id_seq OWNER TO postgres;

--
-- TOC entry 508 (class 1259 OID 42614)
-- Name: pdf_configuration; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.pdf_configuration (
    id integer DEFAULT nextval('template.pdf_configuration_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    orientation character varying(20) DEFAULT 'portrait'::character varying,
    page_size character varying(20) DEFAULT 'A4'::character varying,
    margin_top integer DEFAULT 20,
    margin_right integer DEFAULT 10,
    margin_bottom integer DEFAULT 20,
    margin_left integer DEFAULT 10,
    show_header boolean DEFAULT true,
    show_footer boolean DEFAULT true,
    show_pagination boolean DEFAULT true,
    show_filters boolean DEFAULT true,
    default_config boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    header_color character varying(20) DEFAULT '#f3f4f6'::character varying,
    alternate_row_color character varying(20) DEFAULT '#f9fafb'::character varying,
    items_per_page integer DEFAULT 25,
    custom_title text,
    font_family character varying(100) DEFAULT 'Helvetica'::character varying,
    font_size integer DEFAULT 10,
    theme_id integer,
    accent_color character varying(20),
    watermark_text text,
    watermark_opacity double precision DEFAULT 0.1,
    compress_pdf boolean DEFAULT true,
    password_protection text,
    print_background boolean DEFAULT true,
    scale double precision DEFAULT 1.0,
    landscape_scaling boolean DEFAULT true,
    header_height integer DEFAULT 30,
    footer_height integer DEFAULT 20
);


ALTER TABLE client_117.pdf_configuration OWNER TO postgres;

--
-- TOC entry 464 (class 1259 OID 42230)
-- Name: pdf_configuration_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.pdf_configuration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.pdf_configuration_id_seq OWNER TO postgres;

--
-- TOC entry 510 (class 1259 OID 42656)
-- Name: pdf_document_preferences; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.pdf_document_preferences (
    id integer DEFAULT nextval('template.pdf_document_preferences_id_seq'::regclass) NOT NULL,
    configuration_id integer NOT NULL,
    document_type character varying(20) NOT NULL,
    enabled boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    columns_to_display text[],
    custom_title character varying(255),
    table_header_color character varying(10),
    table_text_color character varying(10),
    table_alternate_color character varying(10),
    max_items_per_page integer DEFAULT 10,
    user_id integer,
    CONSTRAINT pdf_document_preferences_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['visits'::character varying, 'tenants'::character varying, 'maintenance'::character varying, 'transactions'::character varying])::text[])))
);


ALTER TABLE client_117.pdf_document_preferences OWNER TO postgres;

--
-- TOC entry 466 (class 1259 OID 42232)
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.pdf_document_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.pdf_document_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 511 (class 1259 OID 42673)
-- Name: pdf_logos; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.pdf_logos (
    id integer DEFAULT nextval('template.pdf_logos_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_data text NOT NULL,
    width integer DEFAULT 100,
    height integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_117.pdf_logos OWNER TO postgres;

--
-- TOC entry 467 (class 1259 OID 42233)
-- Name: pdf_logos_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.pdf_logos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.pdf_logos_id_seq OWNER TO postgres;

--
-- TOC entry 512 (class 1259 OID 42686)
-- Name: pdf_templates; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.pdf_templates (
    id integer DEFAULT nextval('template.pdf_templates_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    columns jsonb NOT NULL,
    header_template text,
    footer_template text,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    header_color character varying(20) DEFAULT '#f3f4f6'::character varying,
    alternate_row_color character varying(20) DEFAULT '#f9fafb'::character varying,
    items_per_page integer DEFAULT 25,
    default_title text,
    border_style character varying(20) DEFAULT 'solid'::character varying,
    border_width integer DEFAULT 1,
    row_padding integer DEFAULT 8,
    cell_alignment character varying(20) DEFAULT 'left'::character varying,
    user_id integer
);


ALTER TABLE client_117.pdf_templates OWNER TO postgres;

--
-- TOC entry 468 (class 1259 OID 42234)
-- Name: pdf_templates_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.pdf_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.pdf_templates_id_seq OWNER TO postgres;

--
-- TOC entry 513 (class 1259 OID 42704)
-- Name: pdf_themes; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.pdf_themes (
    id integer DEFAULT nextval('template.pdf_themes_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    header_color character varying(20) NOT NULL,
    alternate_row_color character varying(20) NOT NULL,
    text_color character varying(20) DEFAULT '#000000'::character varying,
    border_color character varying(20) DEFAULT '#e5e7eb'::character varying,
    accent_color character varying(20) DEFAULT '#3b82f6'::character varying,
    background_color character varying(20) DEFAULT '#ffffff'::character varying,
    font_family character varying(100) DEFAULT 'Helvetica'::character varying,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE client_117.pdf_themes OWNER TO postgres;

--
-- TOC entry 469 (class 1259 OID 42235)
-- Name: pdf_themes_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.pdf_themes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.pdf_themes_id_seq OWNER TO postgres;

--
-- TOC entry 432 (class 1259 OID 42198)
-- Name: properties_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.properties_id_seq OWNER TO postgres;

--
-- TOC entry 478 (class 1259 OID 42278)
-- Name: properties; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.properties (
    id integer DEFAULT nextval('client_117.properties_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_117.properties OWNER TO postgres;

--
-- TOC entry 446 (class 1259 OID 42212)
-- Name: property_analyses_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.property_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.property_analyses_id_seq OWNER TO postgres;

--
-- TOC entry 490 (class 1259 OID 42407)
-- Name: property_analyses; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.property_analyses (
    id integer DEFAULT nextval('client_117.property_analyses_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    analysis_type text NOT NULL,
    analysis_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_117.property_analyses OWNER TO postgres;

--
-- TOC entry 445 (class 1259 OID 42211)
-- Name: property_coordinates_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.property_coordinates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.property_coordinates_id_seq OWNER TO postgres;

--
-- TOC entry 487 (class 1259 OID 42378)
-- Name: property_coordinates; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.property_coordinates (
    id integer DEFAULT nextval('client_117.property_coordinates_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    latitude numeric,
    longitude numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_117.property_coordinates OWNER TO postgres;

--
-- TOC entry 505 (class 1259 OID 42578)
-- Name: property_financial_goals; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.property_financial_goals (
    id integer DEFAULT nextval('template.property_financial_goals_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    target_value numeric(10,2) NOT NULL,
    current_value numeric(10,2),
    deadline date,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_117.property_financial_goals OWNER TO postgres;

--
-- TOC entry 461 (class 1259 OID 42227)
-- Name: property_financial_goals_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.property_financial_goals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.property_financial_goals_id_seq OWNER TO postgres;

--
-- TOC entry 506 (class 1259 OID 42589)
-- Name: property_financial_snapshots; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.property_financial_snapshots (
    id integer DEFAULT nextval('template.property_financial_snapshots_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    snapshot_date date NOT NULL,
    gross_rental_yield numeric(10,2),
    net_rental_yield numeric(10,2),
    cash_on_cash_return numeric(10,2),
    cap_rate numeric(10,2),
    monthly_cash_flow numeric(10,2),
    total_income numeric(10,2),
    total_expenses numeric(10,2),
    occupancy_rate numeric(10,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_117.property_financial_snapshots OWNER TO postgres;

--
-- TOC entry 462 (class 1259 OID 42228)
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.property_financial_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.property_financial_snapshots_id_seq OWNER TO postgres;

--
-- TOC entry 495 (class 1259 OID 42468)
-- Name: property_history; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.property_history (
    id integer DEFAULT nextval('template.property_history_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    field text NOT NULL,
    old_value text,
    new_value text,
    change_type text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE client_117.property_history OWNER TO postgres;

--
-- TOC entry 451 (class 1259 OID 42217)
-- Name: property_history_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.property_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.property_history_id_seq OWNER TO postgres;

--
-- TOC entry 496 (class 1259 OID 42478)
-- Name: property_works; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.property_works (
    id integer DEFAULT nextval('template.property_works_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2),
    contractor text,
    priority text DEFAULT 'medium'::text,
    documents jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_117.property_works OWNER TO postgres;

--
-- TOC entry 452 (class 1259 OID 42218)
-- Name: property_works_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.property_works_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.property_works_id_seq OWNER TO postgres;

--
-- TOC entry 507 (class 1259 OID 42599)
-- Name: rent_receipts; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.rent_receipts (
    id integer DEFAULT nextval('template.rent_receipts_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    property_id integer NOT NULL,
    transaction_id integer NOT NULL,
    amount real NOT NULL,
    charges real NOT NULL,
    rent_period_start date NOT NULL,
    rent_period_end date NOT NULL,
    status text DEFAULT 'generated'::text NOT NULL,
    document_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE client_117.rent_receipts OWNER TO postgres;

--
-- TOC entry 463 (class 1259 OID 42229)
-- Name: rent_receipts_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.rent_receipts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.rent_receipts_id_seq OWNER TO postgres;

--
-- TOC entry 492 (class 1259 OID 42432)
-- Name: reports; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.reports (
    id integer DEFAULT nextval('template.reports_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "reportType" text,
    "fileUrl" text,
    "userId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_117.reports OWNER TO postgres;

--
-- TOC entry 449 (class 1259 OID 42215)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.reports_id_seq OWNER TO postgres;

--
-- TOC entry 494 (class 1259 OID 42458)
-- Name: storage_transactions; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.storage_transactions (
    id integer DEFAULT nextval('template.storage_transactions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    previous_tier character varying(10) NOT NULL,
    new_tier character varying(10) NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiration_date timestamp without time zone,
    payment_method character varying(50),
    payment_reference character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying,
    notes text
);


ALTER TABLE client_117.storage_transactions OWNER TO postgres;

--
-- TOC entry 450 (class 1259 OID 42216)
-- Name: storage_transactions_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.storage_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.storage_transactions_id_seq OWNER TO postgres;

--
-- TOC entry 465 (class 1259 OID 42231)
-- Name: storage_usage_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.storage_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.storage_usage_id_seq OWNER TO postgres;

--
-- TOC entry 509 (class 1259 OID 42647)
-- Name: storage_usage; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.storage_usage (
    id integer DEFAULT nextval('client_117.storage_usage_id_seq'::regclass) NOT NULL,
    resource_type text NOT NULL,
    resource_id integer NOT NULL,
    filename text,
    file_path text,
    file_type text,
    size_bytes bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE client_117.storage_usage OWNER TO postgres;

--
-- TOC entry 433 (class 1259 OID 42199)
-- Name: tenant_documents_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.tenant_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.tenant_documents_id_seq OWNER TO postgres;

--
-- TOC entry 480 (class 1259 OID 42306)
-- Name: tenant_documents; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.tenant_documents (
    id integer DEFAULT nextval('client_117.tenant_documents_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    document_type text DEFAULT 'lease'::text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_117.tenant_documents OWNER TO postgres;

--
-- TOC entry 435 (class 1259 OID 42201)
-- Name: tenant_history_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.tenant_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.tenant_history_id_seq OWNER TO postgres;

--
-- TOC entry 485 (class 1259 OID 42352)
-- Name: tenant_history; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.tenant_history (
    id integer DEFAULT nextval('client_117.tenant_history_id_seq'::regclass) NOT NULL,
    rating integer NOT NULL,
    feedback text,
    category text DEFAULT 'general'::text,
    tenant_full_name text,
    original_user_id integer,
    event_type text DEFAULT 'evaluation'::text,
    event_severity integer DEFAULT 0,
    event_details jsonb,
    documents text[],
    bail_status text,
    bail_id integer,
    property_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    tenant_id integer,
    is_orphaned boolean DEFAULT false,
    tenant_info_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer
);


ALTER TABLE client_117.tenant_history OWNER TO postgres;

--
-- TOC entry 439 (class 1259 OID 42205)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.tenants_id_seq OWNER TO postgres;

--
-- TOC entry 486 (class 1259 OID 42366)
-- Name: tenants; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.tenants (
    id integer DEFAULT nextval('client_117.tenants_id_seq'::regclass) NOT NULL,
    user_id integer,
    property_id integer NOT NULL,
    lease_start timestamp without time zone NOT NULL,
    lease_end timestamp without time zone NOT NULL,
    rent_amount numeric(10,2) NOT NULL,
    lease_type text NOT NULL,
    active boolean DEFAULT true,
    lease_status text DEFAULT 'actif'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_id integer,
    tenant_info_id integer
);


ALTER TABLE client_117.tenants OWNER TO postgres;

--
-- TOC entry 440 (class 1259 OID 42206)
-- Name: tenants_info_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.tenants_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.tenants_info_id_seq OWNER TO postgres;

--
-- TOC entry 483 (class 1259 OID 42332)
-- Name: tenants_info; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.tenants_info (
    id integer DEFAULT nextval('client_117.tenants_info_id_seq'::regclass) NOT NULL,
    full_name text NOT NULL,
    email text,
    phone_number text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_117.tenants_info OWNER TO postgres;

--
-- TOC entry 489 (class 1259 OID 42398)
-- Name: transaction_attachments; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.transaction_attachments (
    id integer DEFAULT nextval('template.transaction_attachments_id_seq'::regclass) NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE client_117.transaction_attachments OWNER TO postgres;

--
-- TOC entry 444 (class 1259 OID 42210)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.transaction_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 488 (class 1259 OID 42388)
-- Name: transactions; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.transactions (
    id integer DEFAULT nextval('template.transactions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    property_id integer,
    tenant_id integer,
    document_id integer,
    document_ids integer[],
    type text NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    date timestamp without time zone NOT NULL,
    status text NOT NULL,
    payment_method text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_117.transactions OWNER TO postgres;

--
-- TOC entry 443 (class 1259 OID 42209)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 475 (class 1259 OID 42241)
-- Name: visits_id_seq; Type: SEQUENCE; Schema: client_117; Owner: postgres
--

CREATE SEQUENCE client_117.visits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_117.visits_id_seq OWNER TO postgres;

--
-- TOC entry 519 (class 1259 OID 42795)
-- Name: visits; Type: TABLE; Schema: client_117; Owner: postgres
--

CREATE TABLE client_117.visits (
    id integer DEFAULT nextval('client_117.visits_id_seq'::regclass) NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    datetime timestamp without time zone NOT NULL,
    visit_type text NOT NULL,
    property_id integer,
    manual_address text,
    message text,
    status text DEFAULT 'pending'::text,
    rating integer,
    feedback text,
    archived boolean DEFAULT false,
    agent_id integer,
    source text DEFAULT 'manual'::text,
    documents jsonb DEFAULT '[]'::jsonb,
    reminder_sent boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_117.visits OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 18448)
-- Name: billing_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric NOT NULL,
    description text NOT NULL,
    status character varying(20) NOT NULL,
    payment_method character varying(50),
    transaction_date timestamp without time zone DEFAULT now() NOT NULL,
    next_billing_date timestamp without time zone,
    metadata jsonb
);


ALTER TABLE public.billing_transactions OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 18447)
-- Name: billing_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billing_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.billing_transactions_id_seq OWNER TO postgres;

--
-- TOC entry 7180 (class 0 OID 0)
-- Dependencies: 230
-- Name: billing_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_transactions_id_seq OWNED BY public.billing_transactions.id;


--
-- TOC entry 267 (class 1259 OID 28181)
-- Name: folders; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.folders (
    id integer DEFAULT nextval('template.folders_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.folders OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 28697)
-- Name: folders; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.folders AS
 SELECT id,
    name,
    parent_id,
    user_id,
    created_at,
    updated_at
   FROM template.folders;


ALTER VIEW public.folders OWNER TO postgres;

--
-- TOC entry 419 (class 1259 OID 41358)
-- Name: marketplace_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketplace_providers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    contact_email character varying(100),
    contact_phone character varying(20),
    website character varying(200),
    logo_url character varying(255),
    address text,
    postal_code character varying(20),
    city character varying(100),
    country character varying(50) DEFAULT 'France'::character varying,
    services text[] DEFAULT '{}'::text[],
    rating numeric(3,2),
    visible_to_all boolean DEFAULT false,
    authorized_clients integer[] DEFAULT '{}'::integer[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.marketplace_providers OWNER TO postgres;

--
-- TOC entry 418 (class 1259 OID 41357)
-- Name: marketplace_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.marketplace_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marketplace_providers_id_seq OWNER TO postgres;

--
-- TOC entry 7182 (class 0 OID 0)
-- Dependencies: 418
-- Name: marketplace_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.marketplace_providers_id_seq OWNED BY public.marketplace_providers.id;


--
-- TOC entry 234 (class 1259 OID 27055)
-- Name: schema_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_mapping (
    schema_name text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.schema_mapping OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 18577)
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer,
    session_id character varying(255) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    payload text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- TOC entry 7183 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sessions IS 'Stocke les sessions d''authentification des utilisateurs';


--
-- TOC entry 232 (class 1259 OID 18576)
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- TOC entry 7185 (class 0 OID 0)
-- Dependencies: 232
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- TOC entry 244 (class 1259 OID 27727)
-- Name: storage_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_plans (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    storage_limit bigint NOT NULL,
    price_monthly numeric(10,2),
    price_yearly numeric(10,2),
    is_active boolean DEFAULT true,
    features jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_plans OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 27726)
-- Name: storage_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_plans_id_seq OWNER TO postgres;

--
-- TOC entry 7187 (class 0 OID 0)
-- Dependencies: 243
-- Name: storage_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_plans_id_seq OWNED BY public.storage_plans.id;


--
-- TOC entry 246 (class 1259 OID 27739)
-- Name: storage_quotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_quotas (
    id integer NOT NULL,
    resource_type text NOT NULL,
    size_limit bigint,
    count_limit integer,
    applies_to text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_quotas OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 27738)
-- Name: storage_quotas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_quotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_quotas_id_seq OWNER TO postgres;

--
-- TOC entry 7188 (class 0 OID 0)
-- Dependencies: 245
-- Name: storage_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_quotas_id_seq OWNED BY public.storage_quotas.id;


--
-- TOC entry 229 (class 1259 OID 17811)
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notification_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    channel text DEFAULT 'both'::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    frequency text DEFAULT 'immediate'::text NOT NULL,
    importance text DEFAULT 'all'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_notification_settings_channel_check CHECK ((channel = ANY (ARRAY['app'::text, 'email'::text, 'both'::text]))),
    CONSTRAINT user_notification_settings_frequency_check CHECK ((frequency = ANY (ARRAY['immediate'::text, 'daily'::text, 'weekly'::text]))),
    CONSTRAINT user_notification_settings_importance_check CHECK ((importance = ANY (ARRAY['all'::text, 'high'::text, 'medium'::text, 'none'::text]))),
    CONSTRAINT user_notification_settings_type_check CHECK ((type = ANY (ARRAY['payment'::text, 'maintenance'::text, 'lease'::text, 'visit'::text])))
);


ALTER TABLE public.user_notification_settings OWNER TO postgres;

--
-- TOC entry 7189 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE user_notification_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_notification_settings IS 'Stores user preferences for notification deliveries';


--
-- TOC entry 228 (class 1259 OID 17810)
-- Name: user_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notification_settings_id_seq OWNER TO postgres;

--
-- TOC entry 7191 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- TOC entry 226 (class 1259 OID 16853)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text,
    email text,
    phone_number text,
    role text DEFAULT 'tenant'::text,
    profile_image text,
    archived boolean DEFAULT false,
    account_type text DEFAULT 'individual'::text,
    parent_account_id integer,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_premium boolean DEFAULT false,
    request_count integer DEFAULT 0,
    request_limit integer DEFAULT 100,
    preferred_ai_model text DEFAULT 'openai-gpt-3.5'::text,
    storage_used numeric(20,2) DEFAULT 0,
    storage_limit numeric(20,2) DEFAULT '5368709120'::bigint,
    storage_tier character varying(10) DEFAULT 'basic'::character varying,
    CONSTRAINT chk_preferred_ai_model CHECK ((preferred_ai_model = ANY (ARRAY['openai-gpt-3.5'::text, 'openai-gpt-4o'::text]))),
    CONSTRAINT users_account_type_check CHECK ((account_type = ANY (ARRAY['individual'::text, 'enterprise'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'clients'::text, 'manager'::text, 'tenant'::text, 'client'::text])))
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17365)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 7194 (class 0 OID 0)
-- Dependencies: 227
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 249 (class 1259 OID 27881)
-- Name: ai_conversations; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.ai_conversations (
    id integer DEFAULT nextval('template.ai_conversations_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ai_conversations_category_check CHECK ((category = ANY (ARRAY['general'::text, 'maintenance'::text, 'lease'::text, 'payment'::text, 'other'::text]))),
    CONSTRAINT ai_conversations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text])))
);


ALTER TABLE template.ai_conversations OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 27898)
-- Name: ai_messages; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.ai_messages (
    id integer DEFAULT nextval('template.ai_messages_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    conversation_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_urgent boolean DEFAULT false NOT NULL,
    model_id text DEFAULT 'huggingface'::text,
    provider text DEFAULT 'huggingface'::text,
    CONSTRAINT ai_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


ALTER TABLE template.ai_messages OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 27917)
-- Name: ai_suggestions; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.ai_suggestions (
    id integer DEFAULT nextval('template.ai_suggestions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    property_id integer,
    type text NOT NULL,
    suggestion text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT ai_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))),
    CONSTRAINT ai_suggestions_type_check CHECK ((type = ANY (ARRAY['rent_price'::text, 'maintenance'::text, 'tenant_management'::text, 'investment'::text])))
);


ALTER TABLE template.ai_suggestions OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 27935)
-- Name: analysis_configs; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.analysis_configs (
    id integer DEFAULT nextval('template.analysis_configs_id_seq'::regclass) NOT NULL,
    property_id integer,
    user_id integer,
    name character varying(255) NOT NULL,
    period_type character varying(50) NOT NULL,
    period_value integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE template.analysis_configs OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 28139)
-- Name: automatic_reminders; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.automatic_reminders (
    id integer DEFAULT nextval('template.automatic_reminders_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    related_entity_type text NOT NULL,
    related_entity_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    next_trigger_date date NOT NULL,
    days_in_advance integer DEFAULT 0 NOT NULL,
    recurrence text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.automatic_reminders OWNER TO postgres;

--
-- TOC entry 315 (class 1259 OID 32543)
-- Name: company_info; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.company_info (
    id integer DEFAULT nextval('template.company_info_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    company_name character varying(200),
    company_address text,
    company_phone character varying(50),
    company_email character varying(100),
    company_website character varying(100),
    company_siret character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE template.company_info OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 28156)
-- Name: contract_parties; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.contract_parties (
    id integer DEFAULT nextval('template.contract_parties_id_seq'::regclass) NOT NULL,
    contract_id integer NOT NULL,
    party_id integer NOT NULL,
    party_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT contract_parties_party_type_check CHECK ((party_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'manager'::text, 'other'::text])))
);


ALTER TABLE template.contract_parties OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 28068)
-- Name: contracts; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.contracts (
    id integer DEFAULT nextval('template.contracts_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    property_id integer,
    document_id integer,
    signature_required boolean DEFAULT true,
    automated_renewal boolean DEFAULT false,
    renewal_date timestamp without time zone,
    notification_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT contracts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_signature'::text, 'active'::text, 'expired'::text, 'terminated'::text]))),
    CONSTRAINT contracts_type_check CHECK ((type = ANY (ARRAY['rental'::text, 'mandate'::text, 'commercial'::text, 'attestation'::text, 'other'::text])))
);


ALTER TABLE template.contracts OWNER TO postgres;

--
-- TOC entry 313 (class 1259 OID 32532)
-- Name: document_templates; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.document_templates (
    id integer DEFAULT nextval('template.document_templates_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    document_type text NOT NULL,
    field_mappings jsonb NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.document_templates OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 30439)
-- Name: documents; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.documents (
    id integer DEFAULT nextval('template.documents_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    type text DEFAULT 'lease'::text NOT NULL,
    file_path text NOT NULL,
    original_name text NOT NULL,
    template boolean DEFAULT false,
    user_id integer NOT NULL,
    folder_id integer,
    parent_id integer,
    template_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    form_data jsonb DEFAULT '{}'::jsonb,
    content jsonb DEFAULT '{}'::jsonb,
    theme jsonb DEFAULT '{}'::jsonb,
    file_size numeric DEFAULT 0
);


ALTER TABLE template.documents OWNER TO postgres;

--
-- TOC entry 311 (class 1259 OID 32522)
-- Name: documents_access_log; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.documents_access_log (
    id integer DEFAULT nextval('template.documents_access_log_id_seq'::regclass) NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    access_type text NOT NULL,
    accessed_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE template.documents_access_log OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 27437)
-- Name: feedbacks; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.feedbacks (
    id integer NOT NULL,
    tenant_id integer,
    property_id integer,
    rating integer,
    comment text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_info_id integer
);


ALTER TABLE template.feedbacks OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 27436)
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.feedbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.feedbacks_id_seq OWNER TO postgres;

--
-- TOC entry 7196 (class 0 OID 0)
-- Dependencies: 237
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.feedbacks_id_seq OWNED BY template.feedbacks.id;


--
-- TOC entry 265 (class 1259 OID 28168)
-- Name: financial_entries; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.financial_entries (
    id integer DEFAULT nextval('template.financial_entries_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    date date NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    recurring boolean DEFAULT false,
    frequency text,
    description text,
    source text NOT NULL,
    related_entity_id integer,
    related_entity_type text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE template.financial_entries OWNER TO postgres;

--
-- TOC entry 411 (class 1259 OID 41128)
-- Name: form_responses; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.form_responses (
    id integer DEFAULT nextval('template.form_responses_id_seq'::regclass) NOT NULL,
    form_id integer NOT NULL,
    response_data jsonb NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE template.form_responses OWNER TO postgres;

--
-- TOC entry 7197 (class 0 OID 0)
-- Dependencies: 411
-- Name: TABLE form_responses; Type: COMMENT; Schema: template; Owner: postgres
--

COMMENT ON TABLE template.form_responses IS 'Réponses soumises aux formulaires';


--
-- TOC entry 415 (class 1259 OID 41305)
-- Name: form_submissions; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.form_submissions (
    id integer NOT NULL,
    link_id integer NOT NULL,
    form_data jsonb NOT NULL,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    form_id integer
);


ALTER TABLE template.form_submissions OWNER TO postgres;

--
-- TOC entry 414 (class 1259 OID 41304)
-- Name: form_submissions_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.form_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.form_submissions_id_seq OWNER TO postgres;

--
-- TOC entry 7198 (class 0 OID 0)
-- Dependencies: 414
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.form_submissions_id_seq OWNED BY template.form_submissions.id;


--
-- TOC entry 408 (class 1259 OID 41079)
-- Name: forms; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.forms (
    id integer DEFAULT nextval('template.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE template.forms OWNER TO postgres;

--
-- TOC entry 7199 (class 0 OID 0)
-- Dependencies: 408
-- Name: TABLE forms; Type: COMMENT; Schema: template; Owner: postgres
--

COMMENT ON TABLE template.forms IS 'Formulaires créés par les utilisateurs';


--
-- TOC entry 410 (class 1259 OID 41109)
-- Name: link_forms; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.link_forms (
    id integer DEFAULT nextval('template.link_forms_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    form_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE template.link_forms OWNER TO postgres;

--
-- TOC entry 7200 (class 0 OID 0)
-- Dependencies: 410
-- Name: TABLE link_forms; Type: COMMENT; Schema: template; Owner: postgres
--

COMMENT ON TABLE template.link_forms IS 'Association entre liens et formulaires';


--
-- TOC entry 407 (class 1259 OID 41052)
-- Name: link_profiles; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.link_profiles (
    id integer DEFAULT nextval('template.link_profiles_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    slug character varying(100) NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    background_color character varying(20) DEFAULT '#ffffff'::character varying,
    text_color character varying(20) DEFAULT '#000000'::character varying,
    accent_color character varying(20) DEFAULT '#70C7BA'::character varying,
    logo_url text,
    views integer DEFAULT 0,
    background_image text,
    background_pattern text,
    button_style character varying(20) DEFAULT 'rounded'::character varying,
    button_radius integer DEFAULT 8,
    font_family character varying(50) DEFAULT 'Inter'::character varying,
    animation character varying(30) DEFAULT 'fade'::character varying,
    custom_css text,
    custom_theme jsonb,
    background_saturation integer DEFAULT 100,
    background_hue_rotate integer DEFAULT 0,
    background_sepia integer DEFAULT 0,
    background_grayscale integer DEFAULT 0,
    background_invert integer DEFAULT 0,
    background_color_filter character varying(20),
    background_color_filter_opacity real DEFAULT 0.3,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_paused boolean DEFAULT false
);


ALTER TABLE template.link_profiles OWNER TO postgres;

--
-- TOC entry 7201 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE link_profiles; Type: COMMENT; Schema: template; Owner: postgres
--

COMMENT ON TABLE template.link_profiles IS 'Profils de liens des utilisateurs';


--
-- TOC entry 409 (class 1259 OID 41089)
-- Name: links; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.links (
    id integer DEFAULT nextval('template.links_id_seq'::regclass) NOT NULL,
    profile_id integer NOT NULL,
    title character varying(100) NOT NULL,
    url text NOT NULL,
    icon character varying(50),
    enabled boolean DEFAULT true,
    clicks integer DEFAULT 0,
    "position" integer DEFAULT 0,
    featured boolean DEFAULT false,
    custom_color character varying(20),
    custom_text_color character varying(20),
    animation character varying(30),
    type character varying(20) DEFAULT 'link'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    button_style character varying(20),
    user_id integer,
    form_definition jsonb
);


ALTER TABLE template.links OWNER TO postgres;

--
-- TOC entry 7202 (class 0 OID 0)
-- Dependencies: 409
-- Name: TABLE links; Type: COMMENT; Schema: template; Owner: postgres
--

COMMENT ON TABLE template.links IS 'Liens des profils';


--
-- TOC entry 269 (class 1259 OID 28242)
-- Name: maintenance; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.maintenance (
    id integer DEFAULT nextval('template.maintenance_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "propertyId" integer NOT NULL,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    total_cost numeric(10,2),
    document_id integer,
    document_ids jsonb DEFAULT '[]'::jsonb,
    reported_by text
);


ALTER TABLE template.maintenance OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 28309)
-- Name: pdf_configuration; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.pdf_configuration (
    id integer DEFAULT nextval('template.pdf_configuration_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    orientation character varying(20) DEFAULT 'portrait'::character varying,
    page_size character varying(20) DEFAULT 'A4'::character varying,
    margin_top integer DEFAULT 20,
    margin_right integer DEFAULT 10,
    margin_bottom integer DEFAULT 20,
    margin_left integer DEFAULT 10,
    show_header boolean DEFAULT true,
    show_footer boolean DEFAULT true,
    show_pagination boolean DEFAULT true,
    show_filters boolean DEFAULT true,
    default_config boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    header_color character varying(20) DEFAULT '#f3f4f6'::character varying,
    alternate_row_color character varying(20) DEFAULT '#f9fafb'::character varying,
    items_per_page integer DEFAULT 25,
    custom_title text,
    font_family character varying(100) DEFAULT 'Helvetica'::character varying,
    font_size integer DEFAULT 10,
    theme_id integer,
    accent_color character varying(20),
    watermark_text text,
    watermark_opacity double precision DEFAULT 0.1,
    compress_pdf boolean DEFAULT true,
    password_protection text,
    print_background boolean DEFAULT true,
    scale double precision DEFAULT 1.0,
    landscape_scaling boolean DEFAULT true,
    header_height integer DEFAULT 30,
    footer_height integer DEFAULT 20
);


ALTER TABLE template.pdf_configuration OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 28344)
-- Name: pdf_document_preferences; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.pdf_document_preferences (
    id integer DEFAULT nextval('template.pdf_document_preferences_id_seq'::regclass) NOT NULL,
    configuration_id integer NOT NULL,
    document_type character varying(20) NOT NULL,
    enabled boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    columns_to_display text[],
    custom_title character varying(255),
    table_header_color character varying(10),
    table_text_color character varying(10),
    table_alternate_color character varying(10),
    max_items_per_page integer DEFAULT 10,
    user_id integer,
    CONSTRAINT pdf_document_preferences_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['visits'::character varying, 'tenants'::character varying, 'maintenance'::character varying, 'transactions'::character varying])::text[])))
);


ALTER TABLE template.pdf_document_preferences OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 28363)
-- Name: pdf_logos; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.pdf_logos (
    id integer DEFAULT nextval('template.pdf_logos_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_data text NOT NULL,
    width integer DEFAULT 100,
    height integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE template.pdf_logos OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 28378)
-- Name: pdf_templates; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.pdf_templates (
    id integer DEFAULT nextval('template.pdf_templates_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    columns jsonb NOT NULL,
    header_template text,
    footer_template text,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    header_color character varying(20) DEFAULT '#f3f4f6'::character varying,
    alternate_row_color character varying(20) DEFAULT '#f9fafb'::character varying,
    items_per_page integer DEFAULT 25,
    default_title text,
    border_style character varying(20) DEFAULT 'solid'::character varying,
    border_width integer DEFAULT 1,
    row_padding integer DEFAULT 8,
    cell_alignment character varying(20) DEFAULT 'left'::character varying,
    user_id integer
);


ALTER TABLE template.pdf_templates OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 28398)
-- Name: pdf_themes; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.pdf_themes (
    id integer DEFAULT nextval('template.pdf_themes_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    header_color character varying(20) NOT NULL,
    alternate_row_color character varying(20) NOT NULL,
    text_color character varying(20) DEFAULT '#000000'::character varying,
    border_color character varying(20) DEFAULT '#e5e7eb'::character varying,
    accent_color character varying(20) DEFAULT '#3b82f6'::character varying,
    background_color character varying(20) DEFAULT '#ffffff'::character varying,
    font_family character varying(100) DEFAULT 'Helvetica'::character varying,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE template.pdf_themes OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 27265)
-- Name: properties; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.properties (
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


ALTER TABLE template.properties OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 27264)
-- Name: properties_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.properties_id_seq OWNER TO postgres;

--
-- TOC entry 7203 (class 0 OID 0)
-- Dependencies: 235
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.properties_id_seq OWNED BY template.properties.id;


--
-- TOC entry 242 (class 1259 OID 27565)
-- Name: property_analyses; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_analyses (
    id integer NOT NULL,
    property_id integer NOT NULL,
    analysis_type text NOT NULL,
    analysis_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.property_analyses OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 27564)
-- Name: property_analyses_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.property_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.property_analyses_id_seq OWNER TO postgres;

--
-- TOC entry 7204 (class 0 OID 0)
-- Dependencies: 241
-- Name: property_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_analyses_id_seq OWNED BY template.property_analyses.id;


--
-- TOC entry 240 (class 1259 OID 27549)
-- Name: property_coordinates; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_coordinates (
    id integer NOT NULL,
    property_id integer NOT NULL,
    latitude numeric,
    longitude numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.property_coordinates OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 27548)
-- Name: property_coordinates_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.property_coordinates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.property_coordinates_id_seq OWNER TO postgres;

--
-- TOC entry 7205 (class 0 OID 0)
-- Dependencies: 239
-- Name: property_coordinates_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_coordinates_id_seq OWNED BY template.property_coordinates.id;


--
-- TOC entry 271 (class 1259 OID 28255)
-- Name: property_financial_goals; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_financial_goals (
    id integer DEFAULT nextval('template.property_financial_goals_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    target_value numeric(10,2) NOT NULL,
    current_value numeric(10,2),
    deadline date,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE template.property_financial_goals OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 28268)
-- Name: property_financial_snapshots; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_financial_snapshots (
    id integer DEFAULT nextval('template.property_financial_snapshots_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    snapshot_date date NOT NULL,
    gross_rental_yield numeric(10,2),
    net_rental_yield numeric(10,2),
    cash_on_cash_return numeric(10,2),
    cap_rate numeric(10,2),
    monthly_cash_flow numeric(10,2),
    total_income numeric(10,2),
    total_expenses numeric(10,2),
    occupancy_rate numeric(10,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE template.property_financial_snapshots OWNER TO postgres;

--
-- TOC entry 307 (class 1259 OID 32470)
-- Name: property_history; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_history (
    id integer DEFAULT nextval('template.property_history_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    field text NOT NULL,
    old_value text,
    new_value text,
    change_type text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE template.property_history OWNER TO postgres;

--
-- TOC entry 309 (class 1259 OID 32481)
-- Name: property_works; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_works (
    id integer DEFAULT nextval('template.property_works_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2),
    contractor text,
    priority text DEFAULT 'medium'::text,
    documents jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.property_works OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 28280)
-- Name: rent_receipts; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.rent_receipts (
    id integer DEFAULT nextval('template.rent_receipts_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    property_id integer NOT NULL,
    transaction_id integer NOT NULL,
    amount real NOT NULL,
    charges real NOT NULL,
    rent_period_start date NOT NULL,
    rent_period_end date NOT NULL,
    status text DEFAULT 'generated'::text NOT NULL,
    document_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


ALTER TABLE template.rent_receipts OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 28083)
-- Name: reports; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.reports (
    id integer DEFAULT nextval('template.reports_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "reportType" text,
    "fileUrl" text,
    "userId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE template.reports OWNER TO postgres;

--
-- TOC entry 305 (class 1259 OID 32448)
-- Name: storage_transactions; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.storage_transactions (
    id integer DEFAULT nextval('template.storage_transactions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    previous_tier character varying(10) NOT NULL,
    new_tier character varying(10) NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiration_date timestamp without time zone,
    payment_method character varying(50),
    payment_reference character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying,
    notes text
);


ALTER TABLE template.storage_transactions OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 27750)
-- Name: storage_usage; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.storage_usage (
    id integer NOT NULL,
    resource_type text NOT NULL,
    resource_id integer NOT NULL,
    filename text,
    file_path text,
    file_type text,
    size_bytes bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE template.storage_usage OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 27749)
-- Name: storage_usage_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.storage_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.storage_usage_id_seq OWNER TO postgres;

--
-- TOC entry 7206 (class 0 OID 0)
-- Dependencies: 247
-- Name: storage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.storage_usage_id_seq OWNED BY template.storage_usage.id;


--
-- TOC entry 290 (class 1259 OID 30068)
-- Name: tenant_documents; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenant_documents (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    document_type text DEFAULT 'lease'::text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE template.tenant_documents OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 30075)
-- Name: tenant_documents_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.tenant_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.tenant_documents_id_seq OWNER TO postgres;

--
-- TOC entry 7207 (class 0 OID 0)
-- Dependencies: 291
-- Name: tenant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_documents_id_seq OWNED BY template.tenant_documents.id;


--
-- TOC entry 292 (class 1259 OID 30076)
-- Name: tenant_history; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenant_history (
    id integer NOT NULL,
    rating integer NOT NULL,
    feedback text,
    category text DEFAULT 'general'::text,
    tenant_full_name text,
    original_user_id integer,
    event_type text DEFAULT 'evaluation'::text,
    event_severity integer DEFAULT 0,
    event_details jsonb,
    documents text[],
    bail_status text,
    bail_id integer,
    property_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    tenant_id integer,
    is_orphaned boolean DEFAULT false,
    tenant_info_id integer,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer
);


ALTER TABLE template.tenant_history OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 30086)
-- Name: tenant_history_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.tenant_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.tenant_history_id_seq OWNER TO postgres;

--
-- TOC entry 7208 (class 0 OID 0)
-- Dependencies: 293
-- Name: tenant_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_history_id_seq OWNED BY template.tenant_history.id;


--
-- TOC entry 294 (class 1259 OID 30087)
-- Name: tenants; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenants (
    id integer NOT NULL,
    user_id integer,
    property_id integer NOT NULL,
    lease_start timestamp without time zone NOT NULL,
    lease_end timestamp without time zone NOT NULL,
    rent_amount numeric(10,2) NOT NULL,
    lease_type text NOT NULL,
    active boolean DEFAULT true,
    lease_status text DEFAULT 'actif'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_id integer,
    tenant_info_id integer
);

ALTER TABLE ONLY template.tenants FORCE ROW LEVEL SECURITY;


ALTER TABLE template.tenants OWNER TO postgres;

--
-- TOC entry 295 (class 1259 OID 30096)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.tenants_id_seq OWNER TO postgres;

--
-- TOC entry 7209 (class 0 OID 0)
-- Dependencies: 295
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenants_id_seq OWNED BY template.tenants.id;


--
-- TOC entry 297 (class 1259 OID 30293)
-- Name: tenants_info; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenants_info (
    id integer NOT NULL,
    full_name text NOT NULL,
    email text,
    phone_number text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE template.tenants_info OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 30292)
-- Name: tenants_info_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.tenants_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.tenants_info_id_seq OWNER TO postgres;

--
-- TOC entry 7210 (class 0 OID 0)
-- Dependencies: 296
-- Name: tenants_info_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenants_info_id_seq OWNED BY template.tenants_info.id;


--
-- TOC entry 301 (class 1259 OID 30397)
-- Name: transaction_attachments; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.transaction_attachments (
    id integer DEFAULT nextval('template.transaction_attachments_id_seq'::regclass) NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE template.transaction_attachments OWNER TO postgres;

--
-- TOC entry 299 (class 1259 OID 30386)
-- Name: transactions; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.transactions (
    id integer DEFAULT nextval('template.transactions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    property_id integer,
    tenant_id integer,
    document_id integer,
    document_ids integer[],
    type text NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    date timestamp without time zone NOT NULL,
    status text NOT NULL,
    payment_method text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE template.transactions OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 29334)
-- Name: visits; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.visits (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    datetime timestamp without time zone NOT NULL,
    visit_type text NOT NULL,
    property_id integer,
    manual_address text,
    message text,
    status text DEFAULT 'pending'::text,
    rating integer,
    feedback text,
    archived boolean DEFAULT false,
    agent_id integer,
    source text DEFAULT 'manual'::text,
    documents jsonb DEFAULT '[]'::jsonb,
    reminder_sent boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.visits OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 29346)
-- Name: visits_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.visits_id_seq OWNER TO postgres;

--
-- TOC entry 7211 (class 0 OID 0)
-- Dependencies: 289
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.visits_id_seq OWNED BY template.visits.id;


--
-- TOC entry 5942 (class 2604 OID 41459)
-- Name: admin_activity_log id; Type: DEFAULT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.admin_activity_log ALTER COLUMN id SET DEFAULT nextval('admin_schema.admin_activity_log_id_seq'::regclass);


--
-- TOC entry 5944 (class 2604 OID 41479)
-- Name: backup_history id; Type: DEFAULT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.backup_history ALTER COLUMN id SET DEFAULT nextval('admin_schema.backup_history_id_seq'::regclass);


--
-- TOC entry 5939 (class 2604 OID 41438)
-- Name: client_access_requests id; Type: DEFAULT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_access_requests ALTER COLUMN id SET DEFAULT nextval('admin_schema.client_access_requests_id_seq'::regclass);


--
-- TOC entry 5924 (class 2604 OID 41395)
-- Name: client_daily_stats id; Type: DEFAULT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_daily_stats ALTER COLUMN id SET DEFAULT nextval('admin_schema.client_daily_stats_id_seq'::regclass);


--
-- TOC entry 5897 (class 2604 OID 41335)
-- Name: client_info id; Type: DEFAULT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_info ALTER COLUMN id SET DEFAULT nextval('admin_schema.client_info_id_seq'::regclass);


--
-- TOC entry 5935 (class 2604 OID 41419)
-- Name: system_settings id; Type: DEFAULT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.system_settings ALTER COLUMN id SET DEFAULT nextval('admin_schema.system_settings_id_seq'::regclass);


--
-- TOC entry 5914 (class 2604 OID 41377)
-- Name: system_stats id; Type: DEFAULT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.system_stats ALTER COLUMN id SET DEFAULT nextval('admin_schema.system_stats_id_seq'::regclass);


--
-- TOC entry 5893 (class 2604 OID 41235)
-- Name: form_submissions id; Type: DEFAULT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_submissions ALTER COLUMN id SET DEFAULT nextval('client_109.form_submissions_id_seq'::regclass);


--
-- TOC entry 5434 (class 2604 OID 18451)
-- Name: billing_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions ALTER COLUMN id SET DEFAULT nextval('public.billing_transactions_id_seq'::regclass);


--
-- TOC entry 5906 (class 2604 OID 41361)
-- Name: marketplace_providers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_providers ALTER COLUMN id SET DEFAULT nextval('public.marketplace_providers_id_seq'::regclass);


--
-- TOC entry 5436 (class 2604 OID 18580)
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- TOC entry 5452 (class 2604 OID 27730)
-- Name: storage_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans ALTER COLUMN id SET DEFAULT nextval('public.storage_plans_id_seq'::regclass);


--
-- TOC entry 5456 (class 2604 OID 27742)
-- Name: storage_quotas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas ALTER COLUMN id SET DEFAULT nextval('public.storage_quotas_id_seq'::regclass);


--
-- TOC entry 5427 (class 2604 OID 17814)
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- TOC entry 5413 (class 2604 OID 17399)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5443 (class 2604 OID 27440)
-- Name: feedbacks id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks ALTER COLUMN id SET DEFAULT nextval('template.feedbacks_id_seq'::regclass);


--
-- TOC entry 5895 (class 2604 OID 41308)
-- Name: form_submissions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions ALTER COLUMN id SET DEFAULT nextval('template.form_submissions_id_seq'::regclass);


--
-- TOC entry 5440 (class 2604 OID 27268)
-- Name: properties id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties ALTER COLUMN id SET DEFAULT nextval('template.properties_id_seq'::regclass);


--
-- TOC entry 5449 (class 2604 OID 27568)
-- Name: property_analyses id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses ALTER COLUMN id SET DEFAULT nextval('template.property_analyses_id_seq'::regclass);


--
-- TOC entry 5446 (class 2604 OID 27552)
-- Name: property_coordinates id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates ALTER COLUMN id SET DEFAULT nextval('template.property_coordinates_id_seq'::regclass);


--
-- TOC entry 5459 (class 2604 OID 27753)
-- Name: storage_usage id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage ALTER COLUMN id SET DEFAULT nextval('template.storage_usage_id_seq'::regclass);


--
-- TOC entry 5585 (class 2604 OID 30112)
-- Name: tenant_documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents ALTER COLUMN id SET DEFAULT nextval('template.tenant_documents_id_seq'::regclass);


--
-- TOC entry 5588 (class 2604 OID 30113)
-- Name: tenant_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history ALTER COLUMN id SET DEFAULT nextval('template.tenant_history_id_seq'::regclass);


--
-- TOC entry 5595 (class 2604 OID 30114)
-- Name: tenants id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants ALTER COLUMN id SET DEFAULT nextval('template.tenants_id_seq'::regclass);


--
-- TOC entry 5600 (class 2604 OID 30296)
-- Name: tenants_info id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants_info ALTER COLUMN id SET DEFAULT nextval('template.tenants_info_id_seq'::regclass);


--
-- TOC entry 5577 (class 2604 OID 29347)
-- Name: visits id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits ALTER COLUMN id SET DEFAULT nextval('template.visits_id_seq'::regclass);


--
-- TOC entry 7019 (class 0 OID 41456)
-- Dependencies: 429
-- Data for Name: admin_activity_log; Type: TABLE DATA; Schema: admin_schema; Owner: postgres
--

COPY admin_schema.admin_activity_log (id, admin_id, action_type, description, entity_type, entity_id, client_id, ip_address, created_at) FROM stdin;
\.


--
-- TOC entry 7021 (class 0 OID 41476)
-- Dependencies: 431
-- Data for Name: backup_history; Type: TABLE DATA; Schema: admin_schema; Owner: postgres
--

COPY admin_schema.backup_history (id, backup_name, backup_path, backup_size_mb, backup_type, status, client_id, created_by, created_at, completed_at, notes) FROM stdin;
\.


--
-- TOC entry 7017 (class 0 OID 41435)
-- Dependencies: 427
-- Data for Name: client_access_requests; Type: TABLE DATA; Schema: admin_schema; Owner: postgres
--

COPY admin_schema.client_access_requests (id, client_id, request_type, description, status, requested_at, processed_at, processed_by, notes) FROM stdin;
\.


--
-- TOC entry 7013 (class 0 OID 41392)
-- Dependencies: 423
-- Data for Name: client_daily_stats; Type: TABLE DATA; Schema: admin_schema; Owner: postgres
--

COPY admin_schema.client_daily_stats (id, client_id, stat_date, active_users, properties_count, tenants_count, documents_count, transactions_count, disk_usage_mb, requests_count, ai_requests_count, created_at) FROM stdin;
\.


--
-- TOC entry 7007 (class 0 OID 41332)
-- Dependencies: 417
-- Data for Name: client_info; Type: TABLE DATA; Schema: admin_schema; Owner: postgres
--

COPY admin_schema.client_info (id, user_id, schema_name, display_name, subscription_type, max_properties, max_users, is_active, has_marketplace_access, has_ai_features, created_at, updated_at, expiration_date, last_login, notes) FROM stdin;
\.


--
-- TOC entry 7015 (class 0 OID 41416)
-- Dependencies: 425
-- Data for Name: system_settings; Type: TABLE DATA; Schema: admin_schema; Owner: postgres
--

COPY admin_schema.system_settings (id, setting_key, setting_value, setting_type, description, is_private, updated_at, updated_by) FROM stdin;
1	system_name	ImmoVault Admin	string	Nom du système administrateur	f	2025-05-11 16:32:36.512936+02	\N
2	allow_client_registration	true	boolean	Autoriser les inscriptions clients	f	2025-05-11 16:32:36.512936+02	\N
3	max_upload_size_mb	25	number	Taille maximale d'upload en MB	f	2025-05-11 16:32:36.512936+02	\N
4	marketplace_enabled	true	boolean	Activer le marketplace pour tous les clients	f	2025-05-11 16:32:36.512936+02	\N
5	backup_retention_days	30	number	Nombre de jours de conservation des sauvegardes	f	2025-05-11 16:32:36.512936+02	\N
6	api_rate_limit_per_minute	60	number	Limite de requêtes API par minute	f	2025-05-11 16:32:36.512936+02	\N
7	admin_email	admin@immovault.fr	string	Email pour les notifications administrateur	t	2025-05-11 16:32:36.512936+02	\N
8	smtp_host		string	Hôte SMTP pour les emails	t	2025-05-11 16:32:36.512936+02	\N
9	smtp_port	587	number	Port SMTP	t	2025-05-11 16:32:36.512936+02	\N
10	smtp_secure	true	boolean	Utiliser TLS pour SMTP	t	2025-05-11 16:32:36.512936+02	\N
11	smtp_user		string	Utilisateur SMTP	t	2025-05-11 16:32:36.512936+02	\N
12	smtp_password		string	Mot de passe SMTP	t	2025-05-11 16:32:36.512936+02	\N
\.


--
-- TOC entry 7011 (class 0 OID 41374)
-- Dependencies: 421
-- Data for Name: system_stats; Type: TABLE DATA; Schema: admin_schema; Owner: postgres
--

COPY admin_schema.system_stats (id, stat_date, active_clients, total_clients, total_properties, total_tenants, total_transactions, total_documents, total_disk_usage_mb, created_at) FROM stdin;
1	2025-05-11	0	0	0	0	0	0	0	2025-05-11 16:34:46.381379+02
\.


--
-- TOC entry 6944 (class 0 OID 39905)
-- Dependencies: 354
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 6945 (class 0 OID 39922)
-- Dependencies: 355
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 6947 (class 0 OID 39951)
-- Dependencies: 357
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 6949 (class 0 OID 39979)
-- Dependencies: 359
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6964 (class 0 OID 40165)
-- Dependencies: 374
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6971 (class 0 OID 40268)
-- Dependencies: 381
-- Data for Name: company_info; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6965 (class 0 OID 40180)
-- Dependencies: 375
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6958 (class 0 OID 40091)
-- Dependencies: 368
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6969 (class 0 OID 40246)
-- Dependencies: 379
-- Data for Name: document_templates; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6960 (class 0 OID 40116)
-- Dependencies: 370
-- Data for Name: documents; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.documents (id, title, type, file_path, original_name, template, user_id, folder_id, parent_id, template_id, created_at, updated_at, form_data, content, theme, file_size) FROM stdin;
\.


--
-- TOC entry 6968 (class 0 OID 40237)
-- Dependencies: 378
-- Data for Name: documents_access_log; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.documents_access_log (id, document_id, user_id, access_type, accessed_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 6951 (class 0 OID 39998)
-- Dependencies: 361
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 6966 (class 0 OID 40190)
-- Dependencies: 376
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6967 (class 0 OID 40201)
-- Dependencies: 377
-- Data for Name: folders; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6991 (class 0 OID 41023)
-- Dependencies: 401
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.form_responses (id, form_id, response_data, ip_address, user_agent, created_at, link_id) FROM stdin;
3	1	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 00:41:17.719463	11
4	1	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 02:47:13.884907	11
5	1	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 03:15:32.788406	11
6	1	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 03:16:16.228118	11
7	1	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 03:18:52.465093	11
\.


--
-- TOC entry 7003 (class 0 OID 41232)
-- Dependencies: 413
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.form_submissions (id, link_id, form_data, ip_address, user_agent, created_at, form_id) FROM stdin;
3	11	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 00:41:17.730274	1
4	11	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 02:47:13.889681	1
5	11	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 03:15:32.793205	1
6	11	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 03:16:16.23962	1
7	11	{"1746916857724": "testeeee"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-11 03:18:52.475603	1
\.


--
-- TOC entry 6988 (class 0 OID 40974)
-- Dependencies: 398
-- Data for Name: forms; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.forms (id, user_id, title, description, fields, created_at, updated_at) FROM stdin;
1	109	teste	Formulaire créé automatiquement	[{"id": "1746893940780", "type": "text", "label": "1515", "options": [], "required": false}]	2025-05-10 18:40:33.082756	2025-05-10 18:40:33.082756
2	109	rtert	Formulaire créé automatiquement	[{"id": "1746895090994", "type": "text", "label": "ert", "options": [], "required": false}]	2025-05-10 18:40:33.082756	2025-05-10 18:40:33.082756
3	109	teste1	Formulaire créé automatiquement	[{"id": "1746896182728", "type": "text", "label": "551", "options": [], "required": false}]	2025-05-10 18:56:30.810513	2025-05-10 18:56:30.810513
\.


--
-- TOC entry 6990 (class 0 OID 41004)
-- Dependencies: 400
-- Data for Name: link_forms; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.link_forms (id, link_id, form_id, created_at) FROM stdin;
\.


--
-- TOC entry 6987 (class 0 OID 40947)
-- Dependencies: 397
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at, is_paused) FROM stdin;
1	109	vbcvb	Mon Linktree	Tous mes liens professionnels en un seul endroit	#ffffff	#1f2937	#10b981	/uploads/client_109/logos/user-109-logo-1746925617792-861407810.jpg	320	/uploads/client_109/backgrounds/user-109-background-1746929036206-747438996.png	\N	neon	8	Inter	bounce	\N	\N	100	0	0	10	10	#14b8a6	0.3	2025-05-10 10:23:53.649963	2025-05-11 17:03:25.947183	t
\.


--
-- TOC entry 6989 (class 0 OID 40984)
-- Dependencies: 399
-- Data for Name: links; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, created_at, updated_at, button_style, user_id, form_definition) FROM stdin;
5	1	 teste formularrezerzerzerire	https://facebook.com	\N	t	0	4	f	\N	\N	\N	link	2025-05-10 20:34:31.756831	2025-05-11 04:10:03.876406	\N	\N	\N
4	1	Nouvelle maison 120 m2	https://facebook.com	\N	t	0	3	f	\N	\N	\N	link	2025-05-10 20:34:07.416595	2025-05-11 04:10:03.878945	\N	\N	\N
11	1	fhjfhjfhj		\N	t	6	2	f	\N	\N	\N	form	2025-05-11 00:41:04.607227	2025-05-11 04:10:03.881003	\N	\N	[{"id": "1746916857724", "type": "text", "label": "tzere", "options": [], "required": false}]
12	1	Nouvelle maison 120 m2	https://facebook.com	/uploads/client_109/link-images/user-109-link-image-1746924687701-174582856.jpg	t	2	3	f	\N	\N	\N	link	2025-05-11 02:51:33.240376	2025-05-11 04:23:13.472243	\N	\N	\N
\.


--
-- TOC entry 6970 (class 0 OID 40256)
-- Dependencies: 380
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id, total_cost, document_id, document_ids, reported_by) FROM stdin;
\.


--
-- TOC entry 6975 (class 0 OID 40331)
-- Dependencies: 385
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 6977 (class 0 OID 40373)
-- Dependencies: 387
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 6978 (class 0 OID 40390)
-- Dependencies: 388
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6979 (class 0 OID 40403)
-- Dependencies: 389
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 6980 (class 0 OID 40421)
-- Dependencies: 390
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6946 (class 0 OID 39941)
-- Dependencies: 356
-- Data for Name: properties; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6957 (class 0 OID 40073)
-- Dependencies: 367
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6954 (class 0 OID 40044)
-- Dependencies: 364
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6972 (class 0 OID 40295)
-- Dependencies: 382
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6973 (class 0 OID 40306)
-- Dependencies: 383
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6962 (class 0 OID 40142)
-- Dependencies: 372
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_history (id, property_id, field, old_value, new_value, change_type, user_id, created_at, metadata) FROM stdin;
\.


--
-- TOC entry 6963 (class 0 OID 40152)
-- Dependencies: 373
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_works (id, property_id, title, description, type, status, start_date, end_date, estimated_cost, actual_cost, contractor, priority, documents, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6974 (class 0 OID 40316)
-- Dependencies: 384
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6959 (class 0 OID 40106)
-- Dependencies: 369
-- Data for Name: reports; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6961 (class 0 OID 40132)
-- Dependencies: 371
-- Data for Name: storage_transactions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.storage_transactions (id, user_id, previous_tier, new_tier, amount_paid, transaction_date, expiration_date, payment_method, payment_reference, status, notes) FROM stdin;
\.


--
-- TOC entry 6976 (class 0 OID 40364)
-- Dependencies: 386
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 6948 (class 0 OID 39969)
-- Dependencies: 358
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenant_documents (id, tenant_id, document_id, document_type, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6952 (class 0 OID 40008)
-- Dependencies: 362
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenant_history (id, rating, feedback, category, tenant_full_name, original_user_id, event_type, event_severity, event_details, documents, bail_status, bail_id, property_name, created_at, created_by, tenant_id, is_orphaned, tenant_info_id, updated_at, updated_by) FROM stdin;
1	4	gh	general	bcvbcvb	\N	general	0	{}	{}	\N	\N	\N	2025-05-09 15:15:56.422066	109	\N	f	\N	2025-05-09 15:15:56.422066	\N
\.


--
-- TOC entry 6953 (class 0 OID 40022)
-- Dependencies: 363
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenants (id, user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, created_at, updated_at, tenant_id, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 6950 (class 0 OID 39988)
-- Dependencies: 360
-- Data for Name: tenants_info; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenants_info (id, full_name, email, phone_number, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6956 (class 0 OID 40064)
-- Dependencies: 366
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6955 (class 0 OID 40054)
-- Dependencies: 365
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.transactions (id, user_id, property_id, tenant_id, document_id, document_ids, type, category, amount, description, date, status, payment_method, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6981 (class 0 OID 40470)
-- Dependencies: 391
-- Data for Name: visits; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7066 (class 0 OID 42242)
-- Dependencies: 476
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 7067 (class 0 OID 42259)
-- Dependencies: 477
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 7069 (class 0 OID 42288)
-- Dependencies: 479
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 7071 (class 0 OID 42316)
-- Dependencies: 481
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7087 (class 0 OID 42491)
-- Dependencies: 497
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7094 (class 0 OID 42568)
-- Dependencies: 504
-- Data for Name: company_info; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7088 (class 0 OID 42506)
-- Dependencies: 498
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7081 (class 0 OID 42417)
-- Dependencies: 491
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7092 (class 0 OID 42546)
-- Dependencies: 502
-- Data for Name: document_templates; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7083 (class 0 OID 42442)
-- Dependencies: 493
-- Data for Name: documents; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.documents (id, title, type, file_path, original_name, template, user_id, folder_id, parent_id, template_id, created_at, updated_at, form_data, content, theme, file_size) FROM stdin;
\.


--
-- TOC entry 7091 (class 0 OID 42537)
-- Dependencies: 501
-- Data for Name: documents_access_log; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.documents_access_log (id, document_id, user_id, access_type, accessed_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 7074 (class 0 OID 42342)
-- Dependencies: 484
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 7089 (class 0 OID 42516)
-- Dependencies: 499
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7090 (class 0 OID 42527)
-- Dependencies: 500
-- Data for Name: folders; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7108 (class 0 OID 42785)
-- Dependencies: 518
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.form_responses (id, form_id, response_data, ip_address, user_agent, created_at, link_id) FROM stdin;
\.


--
-- TOC entry 7072 (class 0 OID 42325)
-- Dependencies: 482
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.form_submissions (id, link_id, form_data, ip_address, user_agent, created_at, form_id) FROM stdin;
\.


--
-- TOC entry 7106 (class 0 OID 42763)
-- Dependencies: 516
-- Data for Name: forms; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.forms (id, user_id, title, description, fields, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7107 (class 0 OID 42774)
-- Dependencies: 517
-- Data for Name: link_forms; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.link_forms (id, link_id, form_id, created_at) FROM stdin;
\.


--
-- TOC entry 7105 (class 0 OID 42735)
-- Dependencies: 515
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at, is_paused) FROM stdin;
1	117	admin	Mon Profil	Tous mes liens professionnels en un seul endroit	#ffffff	#000000	#70C7BA	\N	0	\N	\N	rounded	8	Inter	fade	\N	\N	100	0	0	0	0	\N	0.3	2025-05-11 17:03:33.304229	2025-05-11 17:03:33.304229	f
\.


--
-- TOC entry 7104 (class 0 OID 42718)
-- Dependencies: 514
-- Data for Name: links; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, created_at, updated_at, button_style, user_id, form_definition) FROM stdin;
\.


--
-- TOC entry 7093 (class 0 OID 42556)
-- Dependencies: 503
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id, total_cost, document_id, document_ids, reported_by) FROM stdin;
\.


--
-- TOC entry 7098 (class 0 OID 42614)
-- Dependencies: 508
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 7100 (class 0 OID 42656)
-- Dependencies: 510
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 7101 (class 0 OID 42673)
-- Dependencies: 511
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7102 (class 0 OID 42686)
-- Dependencies: 512
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 7103 (class 0 OID 42704)
-- Dependencies: 513
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7068 (class 0 OID 42278)
-- Dependencies: 478
-- Data for Name: properties; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7080 (class 0 OID 42407)
-- Dependencies: 490
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7077 (class 0 OID 42378)
-- Dependencies: 487
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7095 (class 0 OID 42578)
-- Dependencies: 505
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7096 (class 0 OID 42589)
-- Dependencies: 506
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7085 (class 0 OID 42468)
-- Dependencies: 495
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.property_history (id, property_id, field, old_value, new_value, change_type, user_id, created_at, metadata) FROM stdin;
\.


--
-- TOC entry 7086 (class 0 OID 42478)
-- Dependencies: 496
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.property_works (id, property_id, title, description, type, status, start_date, end_date, estimated_cost, actual_cost, contractor, priority, documents, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7097 (class 0 OID 42599)
-- Dependencies: 507
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7082 (class 0 OID 42432)
-- Dependencies: 492
-- Data for Name: reports; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 7084 (class 0 OID 42458)
-- Dependencies: 494
-- Data for Name: storage_transactions; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.storage_transactions (id, user_id, previous_tier, new_tier, amount_paid, transaction_date, expiration_date, payment_method, payment_reference, status, notes) FROM stdin;
\.


--
-- TOC entry 7099 (class 0 OID 42647)
-- Dependencies: 509
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 7070 (class 0 OID 42306)
-- Dependencies: 480
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.tenant_documents (id, tenant_id, document_id, document_type, uploaded_at) FROM stdin;
\.


--
-- TOC entry 7075 (class 0 OID 42352)
-- Dependencies: 485
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.tenant_history (id, rating, feedback, category, tenant_full_name, original_user_id, event_type, event_severity, event_details, documents, bail_status, bail_id, property_name, created_at, created_by, tenant_id, is_orphaned, tenant_info_id, updated_at, updated_by) FROM stdin;
\.


--
-- TOC entry 7076 (class 0 OID 42366)
-- Dependencies: 486
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.tenants (id, user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, created_at, updated_at, tenant_id, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 7073 (class 0 OID 42332)
-- Dependencies: 483
-- Data for Name: tenants_info; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.tenants_info (id, full_name, email, phone_number, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7079 (class 0 OID 42398)
-- Dependencies: 489
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 7078 (class 0 OID 42388)
-- Dependencies: 488
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.transactions (id, user_id, property_id, tenant_id, document_id, document_ids, type, category, amount, description, date, status, payment_method, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7109 (class 0 OID 42795)
-- Dependencies: 519
-- Data for Name: visits; Type: TABLE DATA; Schema: client_117; Owner: postgres
--

COPY client_117.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6822 (class 0 OID 18448)
-- Dependencies: 231
-- Data for Name: billing_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_transactions (id, user_id, amount, description, status, payment_method, transaction_date, next_billing_date, metadata) FROM stdin;
\.


--
-- TOC entry 7009 (class 0 OID 41358)
-- Dependencies: 419
-- Data for Name: marketplace_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.marketplace_providers (id, name, category, description, contact_email, contact_phone, website, logo_url, address, postal_code, city, country, services, rating, visible_to_all, authorized_clients, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6825 (class 0 OID 27055)
-- Dependencies: 234
-- Data for Name: schema_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_mapping (schema_name, user_id, created_at) FROM stdin;
\.


--
-- TOC entry 6824 (class 0 OID 18577)
-- Dependencies: 233
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, session_id, ip_address, user_agent, payload, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6835 (class 0 OID 27727)
-- Dependencies: 244
-- Data for Name: storage_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_plans (id, name, description, storage_limit, price_monthly, price_yearly, is_active, features, created_at, updated_at) FROM stdin;
1	Gratuit	Plan gratuit avec stockage limité	536870912	0.00	0.00	t	{"max_properties": 3, "image_enhancement": false}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	Standard	Plan standard pour les propriétaires	5368709120	9.99	99.99	t	{"max_properties": 15, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	Professionnel	Plan avancé pour les professionnels	53687091200	29.99	299.99	t	{"ai_assistant": true, "max_properties": -1, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 6837 (class 0 OID 27739)
-- Dependencies: 246
-- Data for Name: storage_quotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_quotas (id, resource_type, size_limit, count_limit, applies_to, created_at, updated_at) FROM stdin;
1	document	10485760	50	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	image	5242880	20	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	document	52428800	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
4	image	20971520	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 6820 (class 0 OID 17811)
-- Dependencies: 229
-- Data for Name: user_notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notification_settings (id, user_id, type, channel, enabled, frequency, importance, created_at, updated_at) FROM stdin;
1	2	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
2	4	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
3	8	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
4	19	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
5	3	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
6	10	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
7	5	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
8	6	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
9	7	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
10	11	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
12	2	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
13	4	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
14	8	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
15	19	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
16	3	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
17	10	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
18	5	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
19	6	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
20	7	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
21	11	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
23	2	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
24	4	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
25	8	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
26	19	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
27	3	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
28	10	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
29	5	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
30	6	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
31	7	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
32	11	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
34	2	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
35	4	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
36	8	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
37	19	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
38	3	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
39	10	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
40	5	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
41	6	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
42	7	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
43	11	visit	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
\.


--
-- TOC entry 6817 (class 0 OID 16853)
-- Dependencies: 226
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, full_name, email, phone_number, role, profile_image, archived, account_type, parent_account_id, settings, created_at, updated_at, is_premium, request_count, request_limit, preferred_ai_model, storage_used, storage_limit, storage_tier) FROM stdin;
117	admin	$2b$10$4MHn.IAdY9WZZ1sC95Hkqu0t5YRyeqpR/.2IteoXD7fdQ2JgkX2Vi	admin	admin@admin.com	\N	admin	\N	f	individual	\N	{}	2025-05-11 14:53:36.699	2025-05-11 16:53:36.704479	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
109	testuser	$2b$10$EYcKPWDNT3OQUfqV/Ii3Seh.9nAcnEaDH94QmDHmvBJxLFQXw3/im	Killian polm	hgfgh1482@tutamail.com	\N	clients	\N	f	individual	\N	{}	2025-05-09 13:13:44.232	2025-05-09 15:13:44.249777	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
\.


--
-- TOC entry 6840 (class 0 OID 27881)
-- Dependencies: 249
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 6841 (class 0 OID 27898)
-- Dependencies: 250
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 6842 (class 0 OID 27917)
-- Dependencies: 251
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 6843 (class 0 OID 27935)
-- Dependencies: 252
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6852 (class 0 OID 28139)
-- Dependencies: 261
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6905 (class 0 OID 32543)
-- Dependencies: 315
-- Data for Name: company_info; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6854 (class 0 OID 28156)
-- Dependencies: 263
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6848 (class 0 OID 28068)
-- Dependencies: 257
-- Data for Name: contracts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6903 (class 0 OID 32532)
-- Dependencies: 313
-- Data for Name: document_templates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6893 (class 0 OID 30439)
-- Dependencies: 303
-- Data for Name: documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.documents (id, title, type, file_path, original_name, template, user_id, folder_id, parent_id, template_id, created_at, updated_at, form_data, content, theme, file_size) FROM stdin;
\.


--
-- TOC entry 6901 (class 0 OID 32522)
-- Dependencies: 311
-- Data for Name: documents_access_log; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.documents_access_log (id, document_id, user_id, access_type, accessed_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 6829 (class 0 OID 27437)
-- Dependencies: 238
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 6856 (class 0 OID 28168)
-- Dependencies: 265
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6858 (class 0 OID 28181)
-- Dependencies: 267
-- Data for Name: folders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7001 (class 0 OID 41128)
-- Dependencies: 411
-- Data for Name: form_responses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_responses (id, form_id, response_data, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- TOC entry 7005 (class 0 OID 41305)
-- Dependencies: 415
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_submissions (id, link_id, form_data, ip_address, user_agent, created_at, form_id) FROM stdin;
\.


--
-- TOC entry 6998 (class 0 OID 41079)
-- Dependencies: 408
-- Data for Name: forms; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.forms (id, user_id, title, description, fields, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7000 (class 0 OID 41109)
-- Dependencies: 410
-- Data for Name: link_forms; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.link_forms (id, link_id, form_id, created_at) FROM stdin;
\.


--
-- TOC entry 6997 (class 0 OID 41052)
-- Dependencies: 407
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at, is_paused) FROM stdin;
\.


--
-- TOC entry 6999 (class 0 OID 41089)
-- Dependencies: 409
-- Data for Name: links; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, created_at, updated_at, button_style, user_id, form_definition) FROM stdin;
\.


--
-- TOC entry 6860 (class 0 OID 28242)
-- Dependencies: 269
-- Data for Name: maintenance; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id, total_cost, document_id, document_ids, reported_by) FROM stdin;
\.


--
-- TOC entry 6868 (class 0 OID 28309)
-- Dependencies: 277
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 6870 (class 0 OID 28344)
-- Dependencies: 279
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 6872 (class 0 OID 28363)
-- Dependencies: 281
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6874 (class 0 OID 28378)
-- Dependencies: 283
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 6876 (class 0 OID 28398)
-- Dependencies: 285
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6827 (class 0 OID 27265)
-- Dependencies: 236
-- Data for Name: properties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6833 (class 0 OID 27565)
-- Dependencies: 242
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6831 (class 0 OID 27549)
-- Dependencies: 240
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6862 (class 0 OID 28255)
-- Dependencies: 271
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6864 (class 0 OID 28268)
-- Dependencies: 273
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6897 (class 0 OID 32470)
-- Dependencies: 307
-- Data for Name: property_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_history (id, property_id, field, old_value, new_value, change_type, user_id, created_at, metadata) FROM stdin;
\.


--
-- TOC entry 6899 (class 0 OID 32481)
-- Dependencies: 309
-- Data for Name: property_works; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_works (id, property_id, title, description, type, status, start_date, end_date, estimated_cost, actual_cost, contractor, priority, documents, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6866 (class 0 OID 28280)
-- Dependencies: 275
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6849 (class 0 OID 28083)
-- Dependencies: 258
-- Data for Name: reports; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6895 (class 0 OID 32448)
-- Dependencies: 305
-- Data for Name: storage_transactions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.storage_transactions (id, user_id, previous_tier, new_tier, amount_paid, transaction_date, expiration_date, payment_method, payment_reference, status, notes) FROM stdin;
\.


--
-- TOC entry 6839 (class 0 OID 27750)
-- Dependencies: 248
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 6880 (class 0 OID 30068)
-- Dependencies: 290
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_documents (id, tenant_id, document_id, document_type, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6882 (class 0 OID 30076)
-- Dependencies: 292
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_history (id, rating, feedback, category, tenant_full_name, original_user_id, event_type, event_severity, event_details, documents, bail_status, bail_id, property_name, created_at, created_by, tenant_id, is_orphaned, tenant_info_id, updated_at, updated_by) FROM stdin;
\.


--
-- TOC entry 6884 (class 0 OID 30087)
-- Dependencies: 294
-- Data for Name: tenants; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenants (id, user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, created_at, updated_at, tenant_id, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 6887 (class 0 OID 30293)
-- Dependencies: 297
-- Data for Name: tenants_info; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenants_info (id, full_name, email, phone_number, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6891 (class 0 OID 30397)
-- Dependencies: 301
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6889 (class 0 OID 30386)
-- Dependencies: 299
-- Data for Name: transactions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transactions (id, user_id, property_id, tenant_id, document_id, document_ids, type, category, amount, description, date, status, payment_method, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6878 (class 0 OID 29334)
-- Dependencies: 288
-- Data for Name: visits; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7212 (class 0 OID 0)
-- Dependencies: 428
-- Name: admin_activity_log_id_seq; Type: SEQUENCE SET; Schema: admin_schema; Owner: postgres
--

SELECT pg_catalog.setval('admin_schema.admin_activity_log_id_seq', 1, false);


--
-- TOC entry 7213 (class 0 OID 0)
-- Dependencies: 430
-- Name: backup_history_id_seq; Type: SEQUENCE SET; Schema: admin_schema; Owner: postgres
--

SELECT pg_catalog.setval('admin_schema.backup_history_id_seq', 1, false);


--
-- TOC entry 7214 (class 0 OID 0)
-- Dependencies: 426
-- Name: client_access_requests_id_seq; Type: SEQUENCE SET; Schema: admin_schema; Owner: postgres
--

SELECT pg_catalog.setval('admin_schema.client_access_requests_id_seq', 1, false);


--
-- TOC entry 7215 (class 0 OID 0)
-- Dependencies: 422
-- Name: client_daily_stats_id_seq; Type: SEQUENCE SET; Schema: admin_schema; Owner: postgres
--

SELECT pg_catalog.setval('admin_schema.client_daily_stats_id_seq', 1, false);


--
-- TOC entry 7216 (class 0 OID 0)
-- Dependencies: 416
-- Name: client_info_id_seq; Type: SEQUENCE SET; Schema: admin_schema; Owner: postgres
--

SELECT pg_catalog.setval('admin_schema.client_info_id_seq', 1, false);


--
-- TOC entry 7217 (class 0 OID 0)
-- Dependencies: 424
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: admin_schema; Owner: postgres
--

SELECT pg_catalog.setval('admin_schema.system_settings_id_seq', 12, true);


--
-- TOC entry 7218 (class 0 OID 0)
-- Dependencies: 420
-- Name: system_stats_id_seq; Type: SEQUENCE SET; Schema: admin_schema; Owner: postgres
--

SELECT pg_catalog.setval('admin_schema.system_stats_id_seq', 1, true);


--
-- TOC entry 7219 (class 0 OID 0)
-- Dependencies: 318
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.ai_conversations_id_seq', 1, false);


--
-- TOC entry 7220 (class 0 OID 0)
-- Dependencies: 320
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.ai_messages_id_seq', 1, false);


--
-- TOC entry 7221 (class 0 OID 0)
-- Dependencies: 321
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 7222 (class 0 OID 0)
-- Dependencies: 322
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.analysis_configs_id_seq', 1, false);


--
-- TOC entry 7223 (class 0 OID 0)
-- Dependencies: 336
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 7224 (class 0 OID 0)
-- Dependencies: 342
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.company_info_id_seq', 1, false);


--
-- TOC entry 7225 (class 0 OID 0)
-- Dependencies: 337
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.contract_parties_id_seq', 1, false);


--
-- TOC entry 7226 (class 0 OID 0)
-- Dependencies: 331
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.contracts_id_seq', 1, false);


--
-- TOC entry 7227 (class 0 OID 0)
-- Dependencies: 341
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.document_templates_id_seq', 1, false);


--
-- TOC entry 7228 (class 0 OID 0)
-- Dependencies: 338
-- Name: documents_access_log_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.documents_access_log_id_seq', 1, false);


--
-- TOC entry 7229 (class 0 OID 0)
-- Dependencies: 330
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.documents_id_seq', 1, false);


--
-- TOC entry 7230 (class 0 OID 0)
-- Dependencies: 325
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.feedbacks_id_seq', 1, false);


--
-- TOC entry 7231 (class 0 OID 0)
-- Dependencies: 339
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.financial_entries_id_seq', 1, false);


--
-- TOC entry 7232 (class 0 OID 0)
-- Dependencies: 340
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.folders_id_seq', 1, false);


--
-- TOC entry 7233 (class 0 OID 0)
-- Dependencies: 396
-- Name: form_responses_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.form_responses_id_seq', 7, true);


--
-- TOC entry 7234 (class 0 OID 0)
-- Dependencies: 412
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.form_submissions_id_seq', 7, true);


--
-- TOC entry 7235 (class 0 OID 0)
-- Dependencies: 392
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.forms_id_seq', 1, false);


--
-- TOC entry 7236 (class 0 OID 0)
-- Dependencies: 395
-- Name: link_forms_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.link_forms_id_seq', 6, true);


--
-- TOC entry 7237 (class 0 OID 0)
-- Dependencies: 393
-- Name: link_profiles_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.link_profiles_id_seq', 1, true);


--
-- TOC entry 7238 (class 0 OID 0)
-- Dependencies: 394
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.links_id_seq', 12, true);


--
-- TOC entry 7239 (class 0 OID 0)
-- Dependencies: 343
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.maintenance_id_seq', 1, false);


--
-- TOC entry 7240 (class 0 OID 0)
-- Dependencies: 347
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 7241 (class 0 OID 0)
-- Dependencies: 349
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 7242 (class 0 OID 0)
-- Dependencies: 350
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_logos_id_seq', 1, false);


--
-- TOC entry 7243 (class 0 OID 0)
-- Dependencies: 351
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_templates_id_seq', 1, false);


--
-- TOC entry 7244 (class 0 OID 0)
-- Dependencies: 352
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_themes_id_seq', 1, false);


--
-- TOC entry 7245 (class 0 OID 0)
-- Dependencies: 316
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.properties_id_seq', 1, false);


--
-- TOC entry 7246 (class 0 OID 0)
-- Dependencies: 329
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_analyses_id_seq', 1, false);


--
-- TOC entry 7247 (class 0 OID 0)
-- Dependencies: 328
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_coordinates_id_seq', 1, false);


--
-- TOC entry 7248 (class 0 OID 0)
-- Dependencies: 344
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 7249 (class 0 OID 0)
-- Dependencies: 345
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 7250 (class 0 OID 0)
-- Dependencies: 334
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_history_id_seq', 1, false);


--
-- TOC entry 7251 (class 0 OID 0)
-- Dependencies: 335
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_works_id_seq', 1, false);


--
-- TOC entry 7252 (class 0 OID 0)
-- Dependencies: 346
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.rent_receipts_id_seq', 1, false);


--
-- TOC entry 7253 (class 0 OID 0)
-- Dependencies: 332
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.reports_id_seq', 1, false);


--
-- TOC entry 7254 (class 0 OID 0)
-- Dependencies: 333
-- Name: storage_transactions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.storage_transactions_id_seq', 1, false);


--
-- TOC entry 7255 (class 0 OID 0)
-- Dependencies: 348
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.storage_usage_id_seq', 1, false);


--
-- TOC entry 7256 (class 0 OID 0)
-- Dependencies: 317
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenant_documents_id_seq', 1, false);


--
-- TOC entry 7257 (class 0 OID 0)
-- Dependencies: 319
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenant_history_id_seq', 1, true);


--
-- TOC entry 7258 (class 0 OID 0)
-- Dependencies: 323
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenants_id_seq', 1, false);


--
-- TOC entry 7259 (class 0 OID 0)
-- Dependencies: 324
-- Name: tenants_info_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenants_info_id_seq', 1, false);


--
-- TOC entry 7260 (class 0 OID 0)
-- Dependencies: 327
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 7261 (class 0 OID 0)
-- Dependencies: 326
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.transactions_id_seq', 1, false);


--
-- TOC entry 7262 (class 0 OID 0)
-- Dependencies: 353
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.visits_id_seq', 1, false);


--
-- TOC entry 7263 (class 0 OID 0)
-- Dependencies: 434
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.ai_conversations_id_seq', 1, false);


--
-- TOC entry 7264 (class 0 OID 0)
-- Dependencies: 436
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.ai_messages_id_seq', 1, false);


--
-- TOC entry 7265 (class 0 OID 0)
-- Dependencies: 437
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 7266 (class 0 OID 0)
-- Dependencies: 438
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.analysis_configs_id_seq', 1, false);


--
-- TOC entry 7267 (class 0 OID 0)
-- Dependencies: 453
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 7268 (class 0 OID 0)
-- Dependencies: 459
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.company_info_id_seq', 1, false);


--
-- TOC entry 7269 (class 0 OID 0)
-- Dependencies: 454
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.contract_parties_id_seq', 1, false);


--
-- TOC entry 7270 (class 0 OID 0)
-- Dependencies: 448
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.contracts_id_seq', 1, false);


--
-- TOC entry 7271 (class 0 OID 0)
-- Dependencies: 458
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.document_templates_id_seq', 1, false);


--
-- TOC entry 7272 (class 0 OID 0)
-- Dependencies: 455
-- Name: documents_access_log_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.documents_access_log_id_seq', 1, false);


--
-- TOC entry 7273 (class 0 OID 0)
-- Dependencies: 447
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.documents_id_seq', 1, false);


--
-- TOC entry 7274 (class 0 OID 0)
-- Dependencies: 442
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.feedbacks_id_seq', 1, false);


--
-- TOC entry 7275 (class 0 OID 0)
-- Dependencies: 456
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.financial_entries_id_seq', 1, false);


--
-- TOC entry 7276 (class 0 OID 0)
-- Dependencies: 457
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.folders_id_seq', 1, false);


--
-- TOC entry 7277 (class 0 OID 0)
-- Dependencies: 474
-- Name: form_responses_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.form_responses_id_seq', 1, false);


--
-- TOC entry 7278 (class 0 OID 0)
-- Dependencies: 441
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.form_submissions_id_seq', 1, false);


--
-- TOC entry 7279 (class 0 OID 0)
-- Dependencies: 470
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.forms_id_seq', 1, false);


--
-- TOC entry 7280 (class 0 OID 0)
-- Dependencies: 473
-- Name: link_forms_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.link_forms_id_seq', 1, false);


--
-- TOC entry 7281 (class 0 OID 0)
-- Dependencies: 471
-- Name: link_profiles_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.link_profiles_id_seq', 1, true);


--
-- TOC entry 7282 (class 0 OID 0)
-- Dependencies: 472
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.links_id_seq', 1, false);


--
-- TOC entry 7283 (class 0 OID 0)
-- Dependencies: 460
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.maintenance_id_seq', 1, false);


--
-- TOC entry 7284 (class 0 OID 0)
-- Dependencies: 464
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 7285 (class 0 OID 0)
-- Dependencies: 466
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 7286 (class 0 OID 0)
-- Dependencies: 467
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.pdf_logos_id_seq', 1, false);


--
-- TOC entry 7287 (class 0 OID 0)
-- Dependencies: 468
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.pdf_templates_id_seq', 1, false);


--
-- TOC entry 7288 (class 0 OID 0)
-- Dependencies: 469
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.pdf_themes_id_seq', 1, false);


--
-- TOC entry 7289 (class 0 OID 0)
-- Dependencies: 432
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.properties_id_seq', 1, false);


--
-- TOC entry 7290 (class 0 OID 0)
-- Dependencies: 446
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.property_analyses_id_seq', 1, false);


--
-- TOC entry 7291 (class 0 OID 0)
-- Dependencies: 445
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.property_coordinates_id_seq', 1, false);


--
-- TOC entry 7292 (class 0 OID 0)
-- Dependencies: 461
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 7293 (class 0 OID 0)
-- Dependencies: 462
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 7294 (class 0 OID 0)
-- Dependencies: 451
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.property_history_id_seq', 1, false);


--
-- TOC entry 7295 (class 0 OID 0)
-- Dependencies: 452
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.property_works_id_seq', 1, false);


--
-- TOC entry 7296 (class 0 OID 0)
-- Dependencies: 463
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.rent_receipts_id_seq', 1, false);


--
-- TOC entry 7297 (class 0 OID 0)
-- Dependencies: 449
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.reports_id_seq', 1, false);


--
-- TOC entry 7298 (class 0 OID 0)
-- Dependencies: 450
-- Name: storage_transactions_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.storage_transactions_id_seq', 1, false);


--
-- TOC entry 7299 (class 0 OID 0)
-- Dependencies: 465
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.storage_usage_id_seq', 1, false);


--
-- TOC entry 7300 (class 0 OID 0)
-- Dependencies: 433
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.tenant_documents_id_seq', 1, false);


--
-- TOC entry 7301 (class 0 OID 0)
-- Dependencies: 435
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.tenant_history_id_seq', 1, false);


--
-- TOC entry 7302 (class 0 OID 0)
-- Dependencies: 439
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.tenants_id_seq', 1, false);


--
-- TOC entry 7303 (class 0 OID 0)
-- Dependencies: 440
-- Name: tenants_info_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.tenants_info_id_seq', 1, false);


--
-- TOC entry 7304 (class 0 OID 0)
-- Dependencies: 444
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 7305 (class 0 OID 0)
-- Dependencies: 443
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.transactions_id_seq', 1, false);


--
-- TOC entry 7306 (class 0 OID 0)
-- Dependencies: 475
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: client_117; Owner: postgres
--

SELECT pg_catalog.setval('client_117.visits_id_seq', 1, false);


--
-- TOC entry 7307 (class 0 OID 0)
-- Dependencies: 230
-- Name: billing_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_transactions_id_seq', 2, true);


--
-- TOC entry 7308 (class 0 OID 0)
-- Dependencies: 418
-- Name: marketplace_providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.marketplace_providers_id_seq', 1, false);


--
-- TOC entry 7309 (class 0 OID 0)
-- Dependencies: 232
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- TOC entry 7310 (class 0 OID 0)
-- Dependencies: 243
-- Name: storage_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_plans_id_seq', 3, true);


--
-- TOC entry 7311 (class 0 OID 0)
-- Dependencies: 245
-- Name: storage_quotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_quotas_id_seq', 4, true);


--
-- TOC entry 7312 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 44, true);


--
-- TOC entry 7313 (class 0 OID 0)
-- Dependencies: 227
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 119, true);


--
-- TOC entry 7314 (class 0 OID 0)
-- Dependencies: 253
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_conversations_id_seq', 2, true);


--
-- TOC entry 7315 (class 0 OID 0)
-- Dependencies: 254
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_messages_id_seq', 2, true);


--
-- TOC entry 7316 (class 0 OID 0)
-- Dependencies: 255
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_suggestions_id_seq', 2, true);


--
-- TOC entry 7317 (class 0 OID 0)
-- Dependencies: 256
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.analysis_configs_id_seq', 2, true);


--
-- TOC entry 7318 (class 0 OID 0)
-- Dependencies: 262
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.automatic_reminders_id_seq', 2, true);


--
-- TOC entry 7319 (class 0 OID 0)
-- Dependencies: 314
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.company_info_id_seq', 2, true);


--
-- TOC entry 7320 (class 0 OID 0)
-- Dependencies: 264
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contract_parties_id_seq', 2, true);


--
-- TOC entry 7321 (class 0 OID 0)
-- Dependencies: 259
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contracts_id_seq', 2, true);


--
-- TOC entry 7322 (class 0 OID 0)
-- Dependencies: 312
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.document_templates_id_seq', 2, true);


--
-- TOC entry 7323 (class 0 OID 0)
-- Dependencies: 310
-- Name: documents_access_log_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.documents_access_log_id_seq', 2, true);


--
-- TOC entry 7324 (class 0 OID 0)
-- Dependencies: 302
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.documents_id_seq', 4, true);


--
-- TOC entry 7325 (class 0 OID 0)
-- Dependencies: 237
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.feedbacks_id_seq', 2, true);


--
-- TOC entry 7326 (class 0 OID 0)
-- Dependencies: 266
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.financial_entries_id_seq', 2, true);


--
-- TOC entry 7327 (class 0 OID 0)
-- Dependencies: 268
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.folders_id_seq', 3, true);


--
-- TOC entry 7328 (class 0 OID 0)
-- Dependencies: 406
-- Name: form_responses_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_responses_id_seq', 1, false);


--
-- TOC entry 7329 (class 0 OID 0)
-- Dependencies: 414
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_submissions_id_seq', 1, false);


--
-- TOC entry 7330 (class 0 OID 0)
-- Dependencies: 402
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.forms_id_seq', 1, false);


--
-- TOC entry 7331 (class 0 OID 0)
-- Dependencies: 405
-- Name: link_forms_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.link_forms_id_seq', 1, false);


--
-- TOC entry 7332 (class 0 OID 0)
-- Dependencies: 403
-- Name: link_profiles_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.link_profiles_id_seq', 1, true);


--
-- TOC entry 7333 (class 0 OID 0)
-- Dependencies: 404
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.links_id_seq', 1, false);


--
-- TOC entry 7334 (class 0 OID 0)
-- Dependencies: 270
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_id_seq', 8, true);


--
-- TOC entry 7335 (class 0 OID 0)
-- Dependencies: 278
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_configuration_id_seq', 2, true);


--
-- TOC entry 7336 (class 0 OID 0)
-- Dependencies: 280
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_document_preferences_id_seq', 2, true);


--
-- TOC entry 7337 (class 0 OID 0)
-- Dependencies: 282
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_logos_id_seq', 2, true);


--
-- TOC entry 7338 (class 0 OID 0)
-- Dependencies: 284
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_templates_id_seq', 2, true);


--
-- TOC entry 7339 (class 0 OID 0)
-- Dependencies: 286
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_themes_id_seq', 2, true);


--
-- TOC entry 7340 (class 0 OID 0)
-- Dependencies: 235
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.properties_id_seq', 11, true);


--
-- TOC entry 7341 (class 0 OID 0)
-- Dependencies: 241
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_analyses_id_seq', 2, true);


--
-- TOC entry 7342 (class 0 OID 0)
-- Dependencies: 239
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_coordinates_id_seq', 9, true);


--
-- TOC entry 7343 (class 0 OID 0)
-- Dependencies: 272
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_goals_id_seq', 2, true);


--
-- TOC entry 7344 (class 0 OID 0)
-- Dependencies: 274
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_snapshots_id_seq', 2, true);


--
-- TOC entry 7345 (class 0 OID 0)
-- Dependencies: 306
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_history_id_seq', 2, true);


--
-- TOC entry 7346 (class 0 OID 0)
-- Dependencies: 308
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_works_id_seq', 2, true);


--
-- TOC entry 7347 (class 0 OID 0)
-- Dependencies: 276
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.rent_receipts_id_seq', 2, true);


--
-- TOC entry 7348 (class 0 OID 0)
-- Dependencies: 260
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.reports_id_seq', 2, true);


--
-- TOC entry 7349 (class 0 OID 0)
-- Dependencies: 304
-- Name: storage_transactions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.storage_transactions_id_seq', 2, true);


--
-- TOC entry 7350 (class 0 OID 0)
-- Dependencies: 247
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.storage_usage_id_seq', 2, true);


--
-- TOC entry 7351 (class 0 OID 0)
-- Dependencies: 291
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_documents_id_seq', 2, true);


--
-- TOC entry 7352 (class 0 OID 0)
-- Dependencies: 293
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_history_id_seq', 2, true);


--
-- TOC entry 7353 (class 0 OID 0)
-- Dependencies: 295
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenants_id_seq', 2, true);


--
-- TOC entry 7354 (class 0 OID 0)
-- Dependencies: 296
-- Name: tenants_info_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenants_info_id_seq', 2, true);


--
-- TOC entry 7355 (class 0 OID 0)
-- Dependencies: 300
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transaction_attachments_id_seq', 2, true);


--
-- TOC entry 7356 (class 0 OID 0)
-- Dependencies: 298
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transactions_id_seq', 3, true);


--
-- TOC entry 7357 (class 0 OID 0)
-- Dependencies: 289
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.visits_id_seq', 9, true);


--
-- TOC entry 6503 (class 2606 OID 41464)
-- Name: admin_activity_log admin_activity_log_pkey; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.admin_activity_log
    ADD CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id);


--
-- TOC entry 6506 (class 2606 OID 41486)
-- Name: backup_history backup_history_pkey; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.backup_history
    ADD CONSTRAINT backup_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6501 (class 2606 OID 41444)
-- Name: client_access_requests client_access_requests_pkey; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_access_requests
    ADD CONSTRAINT client_access_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 6491 (class 2606 OID 41407)
-- Name: client_daily_stats client_daily_stats_pkey; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_daily_stats
    ADD CONSTRAINT client_daily_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 6477 (class 2606 OID 41347)
-- Name: client_info client_info_pkey; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_info
    ADD CONSTRAINT client_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6497 (class 2606 OID 41426)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6487 (class 2606 OID 41388)
-- Name: system_stats system_stats_pkey; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.system_stats
    ADD CONSTRAINT system_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 6495 (class 2606 OID 41409)
-- Name: client_daily_stats unique_client_date; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_daily_stats
    ADD CONSTRAINT unique_client_date UNIQUE (client_id, stat_date);


--
-- TOC entry 6480 (class 2606 OID 41351)
-- Name: client_info unique_schema_name; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_info
    ADD CONSTRAINT unique_schema_name UNIQUE (schema_name);


--
-- TOC entry 6499 (class 2606 OID 41428)
-- Name: system_settings unique_setting_key; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.system_settings
    ADD CONSTRAINT unique_setting_key UNIQUE (setting_key);


--
-- TOC entry 6489 (class 2606 OID 41390)
-- Name: system_stats unique_stat_date; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.system_stats
    ADD CONSTRAINT unique_stat_date UNIQUE (stat_date);


--
-- TOC entry 6482 (class 2606 OID 41349)
-- Name: client_info unique_user_schema; Type: CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_info
    ADD CONSTRAINT unique_user_schema UNIQUE (user_id);


--
-- TOC entry 6332 (class 2606 OID 39919)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 6339 (class 2606 OID 39936)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6344 (class 2606 OID 39963)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 6353 (class 2606 OID 39985)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 6386 (class 2606 OID 40176)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6402 (class 2606 OID 40277)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6390 (class 2606 OID 40189)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 6373 (class 2606 OID 40105)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6398 (class 2606 OID 40255)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6396 (class 2606 OID 40245)
-- Name: documents_access_log documents_access_log_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.documents_access_log
    ADD CONSTRAINT documents_access_log_pkey PRIMARY KEY (id);


--
-- TOC entry 6377 (class 2606 OID 40131)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6359 (class 2606 OID 40007)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 6392 (class 2606 OID 40200)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 6394 (class 2606 OID 40210)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 6450 (class 2606 OID 41031)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 6475 (class 2606 OID 41240)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 6436 (class 2606 OID 40983)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6446 (class 2606 OID 41012)
-- Name: link_forms link_forms_link_id_form_id_key; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_forms
    ADD CONSTRAINT link_forms_link_id_form_id_key UNIQUE (link_id, form_id);


--
-- TOC entry 6448 (class 2606 OID 41010)
-- Name: link_forms link_forms_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_forms
    ADD CONSTRAINT link_forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6432 (class 2606 OID 40971)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 6434 (class 2606 OID 40973)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 6442 (class 2606 OID 40998)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 6400 (class 2606 OID 40267)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 6414 (class 2606 OID 40363)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 6418 (class 2606 OID 40388)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 6421 (class 2606 OID 40386)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6423 (class 2606 OID 40402)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 6425 (class 2606 OID 40420)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6427 (class 2606 OID 40434)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 6342 (class 2606 OID 39950)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 6371 (class 2606 OID 40082)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 6365 (class 2606 OID 40053)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 6404 (class 2606 OID 40305)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6406 (class 2606 OID 40315)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 6381 (class 2606 OID 40151)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6383 (class 2606 OID 40164)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 6408 (class 2606 OID 40326)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6375 (class 2606 OID 40115)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6379 (class 2606 OID 40141)
-- Name: storage_transactions storage_transactions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.storage_transactions
    ADD CONSTRAINT storage_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6416 (class 2606 OID 40372)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6351 (class 2606 OID 39978)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6361 (class 2606 OID 40021)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6357 (class 2606 OID 39997)
-- Name: tenants_info tenants_info_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenants_info
    ADD CONSTRAINT tenants_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6363 (class 2606 OID 40033)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 6369 (class 2606 OID 40072)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6367 (class 2606 OID 40063)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6429 (class 2606 OID 40484)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6508 (class 2606 OID 42256)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 6515 (class 2606 OID 42273)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6520 (class 2606 OID 42300)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 6529 (class 2606 OID 42322)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 6562 (class 2606 OID 42502)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6578 (class 2606 OID 42577)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6566 (class 2606 OID 42515)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 6549 (class 2606 OID 42431)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6574 (class 2606 OID 42555)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6572 (class 2606 OID 42545)
-- Name: documents_access_log documents_access_log_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.documents_access_log
    ADD CONSTRAINT documents_access_log_pkey PRIMARY KEY (id);


--
-- TOC entry 6553 (class 2606 OID 42457)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6535 (class 2606 OID 42351)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 6568 (class 2606 OID 42526)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 6570 (class 2606 OID 42536)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 6624 (class 2606 OID 42793)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 6614 (class 2606 OID 42772)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6618 (class 2606 OID 42782)
-- Name: link_forms link_forms_link_id_form_id_key; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.link_forms
    ADD CONSTRAINT link_forms_link_id_form_id_key UNIQUE (link_id, form_id);


--
-- TOC entry 6621 (class 2606 OID 42780)
-- Name: link_forms link_forms_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.link_forms
    ADD CONSTRAINT link_forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6609 (class 2606 OID 42759)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 6611 (class 2606 OID 42761)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 6605 (class 2606 OID 42732)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 6576 (class 2606 OID 42567)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 6590 (class 2606 OID 42646)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 6594 (class 2606 OID 42671)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 6597 (class 2606 OID 42669)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6599 (class 2606 OID 42685)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 6601 (class 2606 OID 42703)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6603 (class 2606 OID 42717)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 6518 (class 2606 OID 42287)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 6547 (class 2606 OID 42416)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 6541 (class 2606 OID 42387)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 6580 (class 2606 OID 42588)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6582 (class 2606 OID 42598)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 6557 (class 2606 OID 42477)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6559 (class 2606 OID 42490)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 6584 (class 2606 OID 42609)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6551 (class 2606 OID 42441)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6555 (class 2606 OID 42467)
-- Name: storage_transactions storage_transactions_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.storage_transactions
    ADD CONSTRAINT storage_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6592 (class 2606 OID 42655)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6527 (class 2606 OID 42315)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6537 (class 2606 OID 42365)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6533 (class 2606 OID 42341)
-- Name: tenants_info tenants_info_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.tenants_info
    ADD CONSTRAINT tenants_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6539 (class 2606 OID 42377)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 6545 (class 2606 OID 42406)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6543 (class 2606 OID 42397)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6626 (class 2606 OID 42809)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6216 (class 2606 OID 18456)
-- Name: billing_transactions billing_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6485 (class 2606 OID 41372)
-- Name: marketplace_providers marketplace_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketplace_providers
    ADD CONSTRAINT marketplace_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 6227 (class 2606 OID 27062)
-- Name: schema_mapping schema_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_pkey PRIMARY KEY (schema_name);


--
-- TOC entry 6223 (class 2606 OID 18586)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 6225 (class 2606 OID 18588)
-- Name: sessions sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_id_key UNIQUE (session_id);


--
-- TOC entry 6237 (class 2606 OID 27737)
-- Name: storage_plans storage_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans
    ADD CONSTRAINT storage_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 6239 (class 2606 OID 27748)
-- Name: storage_quotas storage_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas
    ADD CONSTRAINT storage_quotas_pkey PRIMARY KEY (id);


--
-- TOC entry 6214 (class 2606 OID 17828)
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6209 (class 2606 OID 16868)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 6243 (class 2606 OID 27895)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 6250 (class 2606 OID 27912)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6253 (class 2606 OID 27929)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 6260 (class 2606 OID 27941)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 6269 (class 2606 OID 28150)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6330 (class 2606 OID 32552)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6273 (class 2606 OID 28165)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 6264 (class 2606 OID 28082)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6328 (class 2606 OID 32541)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6326 (class 2606 OID 32530)
-- Name: documents_access_log documents_access_log_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents_access_log
    ADD CONSTRAINT documents_access_log_pkey PRIMARY KEY (id);


--
-- TOC entry 6318 (class 2606 OID 30454)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6231 (class 2606 OID 27446)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 6275 (class 2606 OID 28178)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 6277 (class 2606 OID 28190)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 6472 (class 2606 OID 41136)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 6459 (class 2606 OID 41088)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6468 (class 2606 OID 41117)
-- Name: link_forms link_forms_link_id_form_id_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_forms
    ADD CONSTRAINT link_forms_link_id_form_id_key UNIQUE (link_id, form_id);


--
-- TOC entry 6470 (class 2606 OID 41115)
-- Name: link_forms link_forms_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_forms
    ADD CONSTRAINT link_forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6455 (class 2606 OID 41076)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 6457 (class 2606 OID 41078)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 6464 (class 2606 OID 41103)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 6279 (class 2606 OID 28252)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 6291 (class 2606 OID 28341)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 6293 (class 2606 OID 28359)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 6296 (class 2606 OID 28357)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6298 (class 2606 OID 28375)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 6300 (class 2606 OID 28395)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6302 (class 2606 OID 28411)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 6229 (class 2606 OID 27274)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 6235 (class 2606 OID 27574)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 6233 (class 2606 OID 27558)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 6281 (class 2606 OID 28265)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6283 (class 2606 OID 28277)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 6322 (class 2606 OID 32479)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6324 (class 2606 OID 32493)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 6285 (class 2606 OID 28290)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6266 (class 2606 OID 28092)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6320 (class 2606 OID 32457)
-- Name: storage_transactions storage_transactions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_transactions
    ADD CONSTRAINT storage_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6241 (class 2606 OID 27758)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6306 (class 2606 OID 30118)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6308 (class 2606 OID 30120)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6312 (class 2606 OID 30302)
-- Name: tenants_info tenants_info_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants_info
    ADD CONSTRAINT tenants_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6310 (class 2606 OID 30122)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 6316 (class 2606 OID 30405)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6314 (class 2606 OID 30395)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6304 (class 2606 OID 29349)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6504 (class 1259 OID 41501)
-- Name: idx_admin_activity_log_admin; Type: INDEX; Schema: admin_schema; Owner: postgres
--

CREATE INDEX idx_admin_activity_log_admin ON admin_schema.admin_activity_log USING btree (admin_id);


--
-- TOC entry 6492 (class 1259 OID 41500)
-- Name: idx_client_daily_stats_client; Type: INDEX; Schema: admin_schema; Owner: postgres
--

CREATE INDEX idx_client_daily_stats_client ON admin_schema.client_daily_stats USING btree (client_id);


--
-- TOC entry 6493 (class 1259 OID 41499)
-- Name: idx_client_daily_stats_date; Type: INDEX; Schema: admin_schema; Owner: postgres
--

CREATE INDEX idx_client_daily_stats_date ON admin_schema.client_daily_stats USING btree (stat_date);


--
-- TOC entry 6478 (class 1259 OID 41497)
-- Name: idx_client_info_user_id; Type: INDEX; Schema: admin_schema; Owner: postgres
--

CREATE INDEX idx_client_info_user_id ON admin_schema.client_info USING btree (user_id);


--
-- TOC entry 6333 (class 1259 OID 39920)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_109.ai_conversations USING btree (user_id);


--
-- TOC entry 6334 (class 1259 OID 39921)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_109.ai_conversations USING btree (user_id);


--
-- TOC entry 6335 (class 1259 OID 39938)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_109.ai_messages USING btree (conversation_id);


--
-- TOC entry 6336 (class 1259 OID 39940)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_109.ai_messages USING btree (conversation_id);


--
-- TOC entry 6337 (class 1259 OID 39939)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_109.ai_messages USING btree (created_at);


--
-- TOC entry 6340 (class 1259 OID 39937)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_109.ai_messages USING btree (user_id);


--
-- TOC entry 6345 (class 1259 OID 39965)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_109.ai_suggestions USING btree (property_id);


--
-- TOC entry 6346 (class 1259 OID 39968)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_109.ai_suggestions USING btree (property_id);


--
-- TOC entry 6347 (class 1259 OID 39966)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_109.ai_suggestions USING btree (type);


--
-- TOC entry 6348 (class 1259 OID 39964)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_109.ai_suggestions USING btree (user_id);


--
-- TOC entry 6349 (class 1259 OID 39967)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_109.ai_suggestions USING btree (user_id);


--
-- TOC entry 6354 (class 1259 OID 39986)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_109.analysis_configs USING btree (property_id);


--
-- TOC entry 6355 (class 1259 OID 39987)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_109.analysis_configs USING btree (user_id);


--
-- TOC entry 6384 (class 1259 OID 40178)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_109.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 6387 (class 1259 OID 40179)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_109.automatic_reminders USING btree (status);


--
-- TOC entry 6388 (class 1259 OID 40177)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_109.automatic_reminders USING btree (user_id);


--
-- TOC entry 6451 (class 1259 OID 41192)
-- Name: idx_client_109_form_responses_form_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_client_109_form_responses_form_id ON client_109.form_responses USING btree (form_id);


--
-- TOC entry 6437 (class 1259 OID 41191)
-- Name: idx_client_109_forms_user_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_client_109_forms_user_id ON client_109.forms USING btree (user_id);


--
-- TOC entry 6452 (class 1259 OID 41040)
-- Name: idx_form_responses_form_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_form_responses_form_id ON client_109.form_responses USING btree (form_id);


--
-- TOC entry 6438 (class 1259 OID 41039)
-- Name: idx_forms_user_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_forms_user_id ON client_109.forms USING btree (user_id);


--
-- TOC entry 6443 (class 1259 OID 41042)
-- Name: idx_link_forms_form_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_link_forms_form_id ON client_109.link_forms USING btree (form_id);


--
-- TOC entry 6444 (class 1259 OID 41041)
-- Name: idx_link_forms_link_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_link_forms_link_id ON client_109.link_forms USING btree (link_id);


--
-- TOC entry 6430 (class 1259 OID 41172)
-- Name: idx_link_profiles_user_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_link_profiles_user_id ON client_109.link_profiles USING btree (user_id);


--
-- TOC entry 6439 (class 1259 OID 41037)
-- Name: idx_links_profile_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_links_profile_id ON client_109.links USING btree (profile_id);


--
-- TOC entry 6440 (class 1259 OID 41038)
-- Name: idx_links_user_id; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX idx_links_user_id ON client_109.links USING btree (user_id);


--
-- TOC entry 6419 (class 1259 OID 40389)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_109.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 6409 (class 1259 OID 40328)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_109.rent_receipts USING btree (property_id);


--
-- TOC entry 6410 (class 1259 OID 40330)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_109.rent_receipts USING btree (status);


--
-- TOC entry 6411 (class 1259 OID 40327)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_109.rent_receipts USING btree (tenant_id);


--
-- TOC entry 6412 (class 1259 OID 40329)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_109.rent_receipts USING btree (transaction_id);


--
-- TOC entry 6509 (class 1259 OID 42257)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_117.ai_conversations USING btree (user_id);


--
-- TOC entry 6510 (class 1259 OID 42258)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_117.ai_conversations USING btree (user_id);


--
-- TOC entry 6511 (class 1259 OID 42275)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_117.ai_messages USING btree (conversation_id);


--
-- TOC entry 6512 (class 1259 OID 42277)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_117.ai_messages USING btree (conversation_id);


--
-- TOC entry 6513 (class 1259 OID 42276)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_117.ai_messages USING btree (created_at);


--
-- TOC entry 6516 (class 1259 OID 42274)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_117.ai_messages USING btree (user_id);


--
-- TOC entry 6521 (class 1259 OID 42302)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_117.ai_suggestions USING btree (property_id);


--
-- TOC entry 6522 (class 1259 OID 42305)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_117.ai_suggestions USING btree (property_id);


--
-- TOC entry 6523 (class 1259 OID 42303)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_117.ai_suggestions USING btree (type);


--
-- TOC entry 6524 (class 1259 OID 42301)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_117.ai_suggestions USING btree (user_id);


--
-- TOC entry 6525 (class 1259 OID 42304)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_117.ai_suggestions USING btree (user_id);


--
-- TOC entry 6530 (class 1259 OID 42323)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_117.analysis_configs USING btree (property_id);


--
-- TOC entry 6531 (class 1259 OID 42324)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_117.analysis_configs USING btree (user_id);


--
-- TOC entry 6560 (class 1259 OID 42504)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_117.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 6563 (class 1259 OID 42505)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_117.automatic_reminders USING btree (status);


--
-- TOC entry 6564 (class 1259 OID 42503)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_117.automatic_reminders USING btree (user_id);


--
-- TOC entry 6622 (class 1259 OID 42794)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_117.form_responses USING btree (form_id);


--
-- TOC entry 6615 (class 1259 OID 42773)
-- Name: forms_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON client_117.forms USING btree (user_id);


--
-- TOC entry 6616 (class 1259 OID 42784)
-- Name: link_forms_form_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX link_forms_form_id_idx ON client_117.link_forms USING btree (form_id);


--
-- TOC entry 6619 (class 1259 OID 42783)
-- Name: link_forms_link_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX link_forms_link_id_idx ON client_117.link_forms USING btree (link_id);


--
-- TOC entry 6612 (class 1259 OID 42762)
-- Name: link_profiles_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX link_profiles_user_id_idx ON client_117.link_profiles USING btree (user_id);


--
-- TOC entry 6606 (class 1259 OID 42733)
-- Name: links_profile_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON client_117.links USING btree (profile_id);


--
-- TOC entry 6607 (class 1259 OID 42734)
-- Name: links_user_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX links_user_id_idx ON client_117.links USING btree (user_id);


--
-- TOC entry 6595 (class 1259 OID 42672)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_117.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 6585 (class 1259 OID 42611)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_117.rent_receipts USING btree (property_id);


--
-- TOC entry 6586 (class 1259 OID 42613)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_117.rent_receipts USING btree (status);


--
-- TOC entry 6587 (class 1259 OID 42610)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_117.rent_receipts USING btree (tenant_id);


--
-- TOC entry 6588 (class 1259 OID 42612)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_117; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_117.rent_receipts USING btree (transaction_id);


--
-- TOC entry 6217 (class 1259 OID 18463)
-- Name: idx_billing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_status ON public.billing_transactions USING btree (status);


--
-- TOC entry 6218 (class 1259 OID 18462)
-- Name: idx_billing_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_user_id ON public.billing_transactions USING btree (user_id);


--
-- TOC entry 6483 (class 1259 OID 41498)
-- Name: idx_providers_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_providers_category ON public.marketplace_providers USING btree (category);


--
-- TOC entry 6219 (class 1259 OID 18601)
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- TOC entry 6220 (class 1259 OID 18600)
-- Name: idx_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_session_id ON public.sessions USING btree (session_id);


--
-- TOC entry 6221 (class 1259 OID 18599)
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- TOC entry 6211 (class 1259 OID 17835)
-- Name: idx_user_notification_settings_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_type ON public.user_notification_settings USING btree (type);


--
-- TOC entry 6212 (class 1259 OID 17834)
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- TOC entry 6207 (class 1259 OID 19350)
-- Name: idx_users_preferred_ai_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_preferred_ai_model ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 6210 (class 1259 OID 19349)
-- Name: users_preferred_ai_model_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_preferred_ai_model_idx ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 6244 (class 1259 OID 27896)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 6245 (class 1259 OID 27897)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 6246 (class 1259 OID 27914)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 6247 (class 1259 OID 27916)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 6248 (class 1259 OID 27915)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON template.ai_messages USING btree (created_at);


--
-- TOC entry 6251 (class 1259 OID 27913)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON template.ai_messages USING btree (user_id);


--
-- TOC entry 6254 (class 1259 OID 27931)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 6255 (class 1259 OID 27934)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 6256 (class 1259 OID 27932)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON template.ai_suggestions USING btree (type);


--
-- TOC entry 6257 (class 1259 OID 27930)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 6258 (class 1259 OID 27933)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 6261 (class 1259 OID 27942)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON template.analysis_configs USING btree (property_id);


--
-- TOC entry 6262 (class 1259 OID 27943)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON template.analysis_configs USING btree (user_id);


--
-- TOC entry 6267 (class 1259 OID 28152)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON template.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 6270 (class 1259 OID 28153)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON template.automatic_reminders USING btree (status);


--
-- TOC entry 6271 (class 1259 OID 28151)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON template.automatic_reminders USING btree (user_id);


--
-- TOC entry 6473 (class 1259 OID 41145)
-- Name: idx_form_responses_form_id; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX idx_form_responses_form_id ON template.form_responses USING btree (form_id);


--
-- TOC entry 6460 (class 1259 OID 41144)
-- Name: idx_forms_user_id; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX idx_forms_user_id ON template.forms USING btree (user_id);


--
-- TOC entry 6465 (class 1259 OID 41147)
-- Name: idx_link_forms_form_id; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX idx_link_forms_form_id ON template.link_forms USING btree (form_id);


--
-- TOC entry 6466 (class 1259 OID 41146)
-- Name: idx_link_forms_link_id; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX idx_link_forms_link_id ON template.link_forms USING btree (link_id);


--
-- TOC entry 6453 (class 1259 OID 41175)
-- Name: idx_link_profiles_user_id; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX idx_link_profiles_user_id ON template.link_profiles USING btree (user_id);


--
-- TOC entry 6461 (class 1259 OID 41142)
-- Name: idx_links_profile_id; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX idx_links_profile_id ON template.links USING btree (profile_id);


--
-- TOC entry 6462 (class 1259 OID 41143)
-- Name: idx_links_user_id; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX idx_links_user_id ON template.links USING btree (user_id);


--
-- TOC entry 6294 (class 1259 OID 28360)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON template.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 6286 (class 1259 OID 28292)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON template.rent_receipts USING btree (property_id);


--
-- TOC entry 6287 (class 1259 OID 28294)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON template.rent_receipts USING btree (status);


--
-- TOC entry 6288 (class 1259 OID 28291)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON template.rent_receipts USING btree (tenant_id);


--
-- TOC entry 6289 (class 1259 OID 28293)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON template.rent_receipts USING btree (transaction_id);


--
-- TOC entry 6669 (class 2620 OID 41502)
-- Name: client_info set_timestamp_client_info; Type: TRIGGER; Schema: admin_schema; Owner: postgres
--

CREATE TRIGGER set_timestamp_client_info BEFORE UPDATE ON admin_schema.client_info FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 6668 (class 2620 OID 38516)
-- Name: users create_schema_for_new_client; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_schema_for_new_client AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_schema_for_new_client();


--
-- TOC entry 6670 (class 2620 OID 41503)
-- Name: marketplace_providers set_timestamp_marketplace_providers; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_timestamp_marketplace_providers BEFORE UPDATE ON public.marketplace_providers FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 6658 (class 2606 OID 41465)
-- Name: admin_activity_log admin_activity_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.admin_activity_log
    ADD CONSTRAINT admin_activity_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- TOC entry 6659 (class 2606 OID 41470)
-- Name: admin_activity_log admin_activity_log_client_id_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.admin_activity_log
    ADD CONSTRAINT admin_activity_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES admin_schema.client_info(id) ON DELETE SET NULL;


--
-- TOC entry 6660 (class 2606 OID 41487)
-- Name: backup_history backup_history_client_id_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.backup_history
    ADD CONSTRAINT backup_history_client_id_fkey FOREIGN KEY (client_id) REFERENCES admin_schema.client_info(id) ON DELETE SET NULL;


--
-- TOC entry 6661 (class 2606 OID 41492)
-- Name: backup_history backup_history_created_by_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.backup_history
    ADD CONSTRAINT backup_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 6656 (class 2606 OID 41445)
-- Name: client_access_requests client_access_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_access_requests
    ADD CONSTRAINT client_access_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES admin_schema.client_info(id) ON DELETE CASCADE;


--
-- TOC entry 6657 (class 2606 OID 41450)
-- Name: client_access_requests client_access_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_access_requests
    ADD CONSTRAINT client_access_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- TOC entry 6654 (class 2606 OID 41410)
-- Name: client_daily_stats client_daily_stats_client_id_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_daily_stats
    ADD CONSTRAINT client_daily_stats_client_id_fkey FOREIGN KEY (client_id) REFERENCES admin_schema.client_info(id) ON DELETE CASCADE;


--
-- TOC entry 6653 (class 2606 OID 41352)
-- Name: client_info client_info_user_id_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.client_info
    ADD CONSTRAINT client_info_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 6655 (class 2606 OID 41429)
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: admin_schema; Owner: postgres
--

ALTER TABLE ONLY admin_schema.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 6644 (class 2606 OID 41247)
-- Name: form_responses fk_form_responses_form; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_responses
    ADD CONSTRAINT fk_form_responses_form FOREIGN KEY (form_id) REFERENCES client_109.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6645 (class 2606 OID 41252)
-- Name: form_responses fk_form_responses_link; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_responses
    ADD CONSTRAINT fk_form_responses_link FOREIGN KEY (link_id) REFERENCES client_109.links(id) ON DELETE SET NULL;


--
-- TOC entry 6651 (class 2606 OID 41272)
-- Name: form_submissions fk_form_submissions_form; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_submissions
    ADD CONSTRAINT fk_form_submissions_form FOREIGN KEY (form_id) REFERENCES client_109.forms(id) ON DELETE SET NULL;


--
-- TOC entry 6652 (class 2606 OID 41257)
-- Name: form_submissions fk_form_submissions_link; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_submissions
    ADD CONSTRAINT fk_form_submissions_link FOREIGN KEY (link_id) REFERENCES client_109.links(id) ON DELETE CASCADE;


--
-- TOC entry 6640 (class 2606 OID 41267)
-- Name: link_forms fk_link_forms_form; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_forms
    ADD CONSTRAINT fk_link_forms_form FOREIGN KEY (form_id) REFERENCES client_109.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6641 (class 2606 OID 41262)
-- Name: link_forms fk_link_forms_link; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_forms
    ADD CONSTRAINT fk_link_forms_link FOREIGN KEY (link_id) REFERENCES client_109.links(id) ON DELETE CASCADE;


--
-- TOC entry 6646 (class 2606 OID 41032)
-- Name: form_responses form_responses_form_id_fkey; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_responses
    ADD CONSTRAINT form_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES client_109.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6642 (class 2606 OID 41018)
-- Name: link_forms link_forms_form_id_fkey; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_forms
    ADD CONSTRAINT link_forms_form_id_fkey FOREIGN KEY (form_id) REFERENCES client_109.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6643 (class 2606 OID 41013)
-- Name: link_forms link_forms_link_id_fkey; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_forms
    ADD CONSTRAINT link_forms_link_id_fkey FOREIGN KEY (link_id) REFERENCES client_109.links(id) ON DELETE CASCADE;


--
-- TOC entry 6639 (class 2606 OID 40999)
-- Name: links links_profile_id_fkey; Type: FK CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.links
    ADD CONSTRAINT links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES client_109.link_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 6666 (class 2606 OID 42828)
-- Name: form_responses fk_form_responses_form; Type: FK CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.form_responses
    ADD CONSTRAINT fk_form_responses_form FOREIGN KEY (form_id) REFERENCES client_117.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6667 (class 2606 OID 42833)
-- Name: form_responses fk_form_responses_link; Type: FK CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.form_responses
    ADD CONSTRAINT fk_form_responses_link FOREIGN KEY (link_id) REFERENCES client_117.links(id) ON DELETE SET NULL;


--
-- TOC entry 6662 (class 2606 OID 42843)
-- Name: form_submissions fk_form_submissions_form; Type: FK CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.form_submissions
    ADD CONSTRAINT fk_form_submissions_form FOREIGN KEY (form_id) REFERENCES client_117.forms(id) ON DELETE SET NULL;


--
-- TOC entry 6663 (class 2606 OID 42838)
-- Name: form_submissions fk_form_submissions_link; Type: FK CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.form_submissions
    ADD CONSTRAINT fk_form_submissions_link FOREIGN KEY (link_id) REFERENCES client_117.links(id) ON DELETE CASCADE;


--
-- TOC entry 6664 (class 2606 OID 42853)
-- Name: link_forms fk_link_forms_form; Type: FK CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.link_forms
    ADD CONSTRAINT fk_link_forms_form FOREIGN KEY (form_id) REFERENCES client_117.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6665 (class 2606 OID 42848)
-- Name: link_forms fk_link_forms_link; Type: FK CONSTRAINT; Schema: client_117; Owner: postgres
--

ALTER TABLE ONLY client_117.link_forms
    ADD CONSTRAINT fk_link_forms_link FOREIGN KEY (link_id) REFERENCES client_117.links(id) ON DELETE CASCADE;


--
-- TOC entry 6628 (class 2606 OID 18457)
-- Name: billing_transactions billing_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 6630 (class 2606 OID 27063)
-- Name: schema_mapping schema_mapping_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 6629 (class 2606 OID 18589)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 6627 (class 2606 OID 17829)
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 6631 (class 2606 OID 27452)
-- Name: feedbacks feedbacks_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 6632 (class 2606 OID 30332)
-- Name: feedbacks feedbacks_tenant_info_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_tenant_info_fkey FOREIGN KEY (tenant_info_id) REFERENCES template.tenants_info(id) ON DELETE SET NULL;


--
-- TOC entry 6650 (class 2606 OID 41137)
-- Name: form_responses form_responses_form_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_responses
    ADD CONSTRAINT form_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES template.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6648 (class 2606 OID 41123)
-- Name: link_forms link_forms_form_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_forms
    ADD CONSTRAINT link_forms_form_id_fkey FOREIGN KEY (form_id) REFERENCES template.forms(id) ON DELETE CASCADE;


--
-- TOC entry 6649 (class 2606 OID 41118)
-- Name: link_forms link_forms_link_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_forms
    ADD CONSTRAINT link_forms_link_id_fkey FOREIGN KEY (link_id) REFERENCES template.links(id) ON DELETE CASCADE;


--
-- TOC entry 6647 (class 2606 OID 41104)
-- Name: links links_profile_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.links
    ADD CONSTRAINT links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES template.link_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 6634 (class 2606 OID 27575)
-- Name: property_analyses property_analyses_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 6633 (class 2606 OID 27559)
-- Name: property_coordinates property_coordinates_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 6635 (class 2606 OID 30308)
-- Name: tenant_history tenant_history_tenant_info_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_tenant_info_fkey FOREIGN KEY (tenant_info_id) REFERENCES template.tenants_info(id) ON DELETE SET NULL;


--
-- TOC entry 6636 (class 2606 OID 30350)
-- Name: tenant_history tenant_history_updated_by_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 6637 (class 2606 OID 30303)
-- Name: tenants tenants_tenant_info_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_tenant_info_fkey FOREIGN KEY (tenant_info_id) REFERENCES template.tenants_info(id) ON DELETE SET NULL;


--
-- TOC entry 6638 (class 2606 OID 30406)
-- Name: transaction_attachments transaction_attachments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transaction_attachments
    ADD CONSTRAINT transaction_attachments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES template.transactions(id) ON DELETE CASCADE;


--
-- TOC entry 7115 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO clients;
GRANT USAGE ON SCHEMA public TO client_role_31;


--
-- TOC entry 7117 (class 0 OID 0)
-- Dependencies: 572
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea) TO clients;


--
-- TOC entry 7118 (class 0 OID 0)
-- Dependencies: 573
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO clients;


--
-- TOC entry 7119 (class 0 OID 0)
-- Dependencies: 576
-- Name: FUNCTION check_auth(p_username text, p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_auth(p_username text, p_password text) TO clients;


--
-- TOC entry 7120 (class 0 OID 0)
-- Dependencies: 549
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.crypt(text, text) TO clients;


--
-- TOC entry 7121 (class 0 OID 0)
-- Dependencies: 574
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dearmor(text) TO clients;


--
-- TOC entry 7122 (class 0 OID 0)
-- Dependencies: 546
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 7123 (class 0 OID 0)
-- Dependencies: 557
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 7124 (class 0 OID 0)
-- Dependencies: 552
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(bytea, text) TO clients;


--
-- TOC entry 7125 (class 0 OID 0)
-- Dependencies: 541
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(text, text) TO clients;


--
-- TOC entry 7126 (class 0 OID 0)
-- Dependencies: 542
-- Name: FUNCTION enable_rls_on_table(table_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enable_rls_on_table(table_name text) TO clients;


--
-- TOC entry 7127 (class 0 OID 0)
-- Dependencies: 556
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 7128 (class 0 OID 0)
-- Dependencies: 547
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 7129 (class 0 OID 0)
-- Dependencies: 558
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO clients;


--
-- TOC entry 7130 (class 0 OID 0)
-- Dependencies: 559
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_uuid() TO clients;


--
-- TOC entry 7131 (class 0 OID 0)
-- Dependencies: 550
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text) TO clients;


--
-- TOC entry 7132 (class 0 OID 0)
-- Dependencies: 555
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO clients;


--
-- TOC entry 7133 (class 0 OID 0)
-- Dependencies: 548
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO clients;


--
-- TOC entry 7134 (class 0 OID 0)
-- Dependencies: 553
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(text, text, text) TO clients;


--
-- TOC entry 7135 (class 0 OID 0)
-- Dependencies: 544
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO clients;


--
-- TOC entry 7137 (class 0 OID 0)
-- Dependencies: 578
-- Name: FUNCTION log_table_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_table_changes() TO clients;


--
-- TOC entry 7138 (class 0 OID 0)
-- Dependencies: 575
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO clients;


--
-- TOC entry 7139 (class 0 OID 0)
-- Dependencies: 571
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO clients;


--
-- TOC entry 7140 (class 0 OID 0)
-- Dependencies: 532
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO clients;


--
-- TOC entry 7141 (class 0 OID 0)
-- Dependencies: 534
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 7142 (class 0 OID 0)
-- Dependencies: 536
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO clients;


--
-- TOC entry 7143 (class 0 OID 0)
-- Dependencies: 533
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 7144 (class 0 OID 0)
-- Dependencies: 535
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 7145 (class 0 OID 0)
-- Dependencies: 537
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO clients;


--
-- TOC entry 7146 (class 0 OID 0)
-- Dependencies: 569
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO clients;


--
-- TOC entry 7147 (class 0 OID 0)
-- Dependencies: 538
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO clients;


--
-- TOC entry 7148 (class 0 OID 0)
-- Dependencies: 570
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 7149 (class 0 OID 0)
-- Dependencies: 539
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 7150 (class 0 OID 0)
-- Dependencies: 565
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO clients;


--
-- TOC entry 7151 (class 0 OID 0)
-- Dependencies: 567
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO clients;


--
-- TOC entry 7152 (class 0 OID 0)
-- Dependencies: 566
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 7153 (class 0 OID 0)
-- Dependencies: 568
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 7154 (class 0 OID 0)
-- Dependencies: 560
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO clients;


--
-- TOC entry 7155 (class 0 OID 0)
-- Dependencies: 563
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO clients;


--
-- TOC entry 7156 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 7157 (class 0 OID 0)
-- Dependencies: 564
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 7158 (class 0 OID 0)
-- Dependencies: 554
-- Name: FUNCTION recalculate_user_storage(user_id_param integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recalculate_user_storage(user_id_param integer) TO clients;


--
-- TOC entry 7159 (class 0 OID 0)
-- Dependencies: 577
-- Name: FUNCTION set_app_variables(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_app_variables() TO clients;


--
-- TOC entry 7161 (class 0 OID 0)
-- Dependencies: 551
-- Name: FUNCTION sync_theme_colors(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_theme_colors() TO clients;


--
-- TOC entry 7162 (class 0 OID 0)
-- Dependencies: 540
-- Name: FUNCTION test_rls_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.test_rls_config() TO clients;


--
-- TOC entry 7163 (class 0 OID 0)
-- Dependencies: 531
-- Name: FUNCTION update_modified_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_modified_column() TO clients;


--
-- TOC entry 7164 (class 0 OID 0)
-- Dependencies: 561
-- Name: FUNCTION update_storage_on_document_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_storage_on_document_change() TO clients;


--
-- TOC entry 7165 (class 0 OID 0)
-- Dependencies: 543
-- Name: FUNCTION update_user_storage_quota(p_user_id integer, p_extension_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_storage_quota(p_user_id integer, p_extension_id integer) TO clients;


--
-- TOC entry 7179 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE billing_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.billing_transactions TO clients;


--
-- TOC entry 7181 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE billing_transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.billing_transactions_id_seq TO clients;


--
-- TOC entry 7184 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.sessions TO clients;
GRANT SELECT ON TABLE public.sessions TO client_role_31;


--
-- TOC entry 7186 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.sessions_id_seq TO clients;


--
-- TOC entry 7190 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE user_notification_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_notification_settings TO clients;


--
-- TOC entry 7192 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE user_notification_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.user_notification_settings_id_seq TO clients;


--
-- TOC entry 7193 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.users TO clients;
GRANT SELECT ON TABLE public.users TO client_role_31;


--
-- TOC entry 7195 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.users_id_seq TO clients;


--
-- TOC entry 2843 (class 826 OID 39861)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: client_109; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_109 GRANT ALL ON SEQUENCES TO postgres;


--
-- TOC entry 2842 (class 826 OID 39860)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: client_109; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_109 GRANT ALL ON TABLES TO postgres;


--
-- TOC entry 2845 (class 826 OID 42197)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: client_117; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_117 GRANT ALL ON SEQUENCES TO postgres;


--
-- TOC entry 2844 (class 826 OID 42196)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: client_117; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_117 GRANT ALL ON TABLES TO postgres;


-- Completed on 2025-05-11 17:59:56

--
-- PostgreSQL database dump complete
--

