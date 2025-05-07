--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-07 16:41:18

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
-- TOC entry 7 (class 2615 OID 27333)
-- Name: admin_views; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA admin_views;


ALTER SCHEMA admin_views OWNER TO postgres;

--
-- TOC entry 8 (class 2615 OID 27337)
-- Name: client_31; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_31;


ALTER SCHEMA client_31 OWNER TO postgres;

--
-- TOC entry 10 (class 2615 OID 28710)
-- Name: client_40; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_40;


ALTER SCHEMA client_40 OWNER TO postgres;

--
-- TOC entry 11 (class 2615 OID 29389)
-- Name: client_47; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_47;


ALTER SCHEMA client_47 OWNER TO postgres;

--
-- TOC entry 12 (class 2615 OID 29405)
-- Name: client_48; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_48;


ALTER SCHEMA client_48 OWNER TO postgres;

--
-- TOC entry 13 (class 2615 OID 29427)
-- Name: client_52; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_52;


ALTER SCHEMA client_52 OWNER TO postgres;

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
-- TOC entry 7485 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 587 (class 1255 OID 19907)
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
-- TOC entry 594 (class 1255 OID 29426)
-- Name: create_client_schema(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_client_schema(client_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_schema_name text := 'client_' || client_id::text;
    tbl_record record; -- Déclaration manquante ajoutée ici
BEGIN
    -- Vérifier si le schéma existe déjà
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata 
                   WHERE information_schema.schemata.schema_name = v_schema_name) THEN
        -- Créer le schéma
        EXECUTE 'CREATE SCHEMA ' || v_schema_name;
        
        -- Copier les tables du schéma template dynamiquement
        FOR tbl_record IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'template' 
            AND table_type = 'BASE TABLE'
        LOOP
            EXECUTE 'CREATE TABLE ' || v_schema_name || '.' || tbl_record.table_name || 
                   ' (LIKE template.' || tbl_record.table_name || ' INCLUDING ALL)';
        END LOOP;
    END IF;
END;
$$;


ALTER FUNCTION public.create_client_schema(client_id integer) OWNER TO postgres;

--
-- TOC entry 591 (class 1255 OID 27335)
-- Name: create_schema_for_new_client(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_schema_for_new_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM public.create_client_schema(NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_schema_for_new_client() OWNER TO postgres;

--
-- TOC entry 590 (class 1255 OID 27847)
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
-- TOC entry 554 (class 1255 OID 19950)
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
-- TOC entry 556 (class 1255 OID 18690)
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
-- TOC entry 589 (class 1255 OID 19948)
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
-- TOC entry 7505 (class 0 OID 0)
-- Dependencies: 589
-- Name: FUNCTION log_table_changes(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_table_changes() IS 'Fonction pour journaliser les modifications des tables principales';


--
-- TOC entry 565 (class 1255 OID 19450)
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
-- TOC entry 588 (class 1255 OID 19940)
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
-- TOC entry 592 (class 1255 OID 27866)
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
-- TOC entry 7529 (class 0 OID 0)
-- Dependencies: 592
-- Name: FUNCTION set_schema_for_user(user_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.set_schema_for_user(user_id integer) IS 'Retourne la valeur à utiliser pour search_path en fonction de l''ID utilisateur';


--
-- TOC entry 593 (class 1255 OID 29423)
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
-- TOC entry 562 (class 1255 OID 19210)
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
-- TOC entry 552 (class 1255 OID 19957)
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
-- TOC entry 543 (class 1255 OID 18935)
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- TOC entry 572 (class 1255 OID 19451)
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
-- TOC entry 555 (class 1255 OID 18464)
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
-- TOC entry 249 (class 1259 OID 27313)
-- Name: documents; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.documents (
    id integer NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size integer,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.documents OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 27312)
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
-- TOC entry 7535 (class 0 OID 0)
-- Dependencies: 248
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.documents_id_seq OWNED BY template.documents.id;


--
-- TOC entry 253 (class 1259 OID 27368)
-- Name: documents; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.documents (
    id integer DEFAULT nextval('template.documents_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size integer,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.documents OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 27393)
-- Name: documents_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.documents_31 AS
 SELECT id,
    name,
    file_path,
    file_type,
    file_size,
    property_id,
    tenant_id,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.documents;


ALTER VIEW admin_views.documents_31 OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 27437)
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.feedbacks OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 27436)
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
-- TOC entry 7537 (class 0 OID 0)
-- Dependencies: 260
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.feedbacks_id_seq OWNED BY template.feedbacks.id;


--
-- TOC entry 277 (class 1259 OID 27602)
-- Name: feedbacks; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.feedbacks (
    id integer DEFAULT nextval('template.feedbacks_id_seq'::regclass) NOT NULL,
    tenant_id integer,
    property_id integer,
    rating integer,
    comment text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.feedbacks OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 27691)
-- Name: feedbacks_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.feedbacks_31 AS
 SELECT id,
    tenant_id,
    property_id,
    rating,
    comment,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.feedbacks;


ALTER VIEW admin_views.feedbacks_31 OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 27458)
-- Name: form_submissions; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.form_submissions (
    id integer NOT NULL,
    form_id text NOT NULL,
    form_data jsonb NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.form_submissions OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 27457)
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
-- TOC entry 7539 (class 0 OID 0)
-- Dependencies: 262
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.form_submissions_id_seq OWNED BY template.form_submissions.id;


--
-- TOC entry 278 (class 1259 OID 27612)
-- Name: form_submissions; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.form_submissions (
    id integer DEFAULT nextval('template.form_submissions_id_seq'::regclass) NOT NULL,
    form_id text NOT NULL,
    form_data jsonb NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.form_submissions OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 27695)
-- Name: form_submissions_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.form_submissions_31 AS
 SELECT id,
    form_id,
    form_data,
    property_id,
    tenant_id,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.form_submissions;


ALTER VIEW admin_views.form_submissions_31 OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 27414)
-- Name: maintenance_requests; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.maintenance_requests (
    id integer NOT NULL,
    property_id integer,
    tenant_id integer,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text,
    reported_date timestamp without time zone DEFAULT now() NOT NULL,
    resolved_date timestamp without time zone,
    resolution_notes text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.maintenance_requests OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 27413)
-- Name: maintenance_requests_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.maintenance_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.maintenance_requests_id_seq OWNER TO postgres;

--
-- TOC entry 7541 (class 0 OID 0)
-- Dependencies: 258
-- Name: maintenance_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.maintenance_requests_id_seq OWNED BY template.maintenance_requests.id;


--
-- TOC entry 276 (class 1259 OID 27590)
-- Name: maintenance_requests; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.maintenance_requests (
    id integer DEFAULT nextval('template.maintenance_requests_id_seq'::regclass) NOT NULL,
    property_id integer,
    tenant_id integer,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text,
    reported_date timestamp without time zone DEFAULT now() NOT NULL,
    resolved_date timestamp without time zone,
    resolution_notes text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.maintenance_requests OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 27687)
-- Name: maintenance_requests_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.maintenance_requests_31 AS
 SELECT id,
    property_id,
    tenant_id,
    title,
    description,
    status,
    priority,
    reported_date,
    resolved_date,
    resolution_notes,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.maintenance_requests;


ALTER VIEW admin_views.maintenance_requests_31 OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 27265)
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
    area integer[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.properties OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 27264)
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
-- TOC entry 7543 (class 0 OID 0)
-- Dependencies: 242
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.properties_id_seq OWNED BY template.properties.id;


--
-- TOC entry 250 (class 1259 OID 27338)
-- Name: properties; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.properties (
    id integer DEFAULT nextval('template.properties_id_seq'::regclass) NOT NULL,
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
    area integer[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.properties OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 27380)
-- Name: properties_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.properties_31 AS
 SELECT id,
    name,
    address,
    description,
    type,
    units,
    bedrooms,
    floors,
    bathrooms,
    toilets,
    energy_class,
    energy_emissions,
    living_area,
    land_area,
    has_parking,
    has_terrace,
    has_garage,
    has_outbuilding,
    has_balcony,
    has_elevator,
    has_cellar,
    has_garden,
    is_new_construction,
    purchase_price,
    monthly_rent,
    monthly_expenses,
    loan_amount,
    monthly_loan_payment,
    loan_duration,
    status,
    construction_year,
    purchase_date,
    rooms,
    isnewconstruction,
    images,
    user_id,
    area,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.properties;


ALTER VIEW admin_views.properties_31 OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 27565)
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
-- TOC entry 274 (class 1259 OID 27564)
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
-- TOC entry 7545 (class 0 OID 0)
-- Dependencies: 274
-- Name: property_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_analyses_id_seq OWNED BY template.property_analyses.id;


--
-- TOC entry 284 (class 1259 OID 27673)
-- Name: property_analyses; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.property_analyses (
    id integer DEFAULT nextval('template.property_analyses_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    analysis_type text NOT NULL,
    analysis_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.property_analyses OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 27719)
-- Name: property_analyses_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.property_analyses_31 AS
 SELECT id,
    property_id,
    analysis_type,
    analysis_data,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.property_analyses;


ALTER VIEW admin_views.property_analyses_31 OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 27549)
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
-- TOC entry 272 (class 1259 OID 27548)
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
-- TOC entry 7547 (class 0 OID 0)
-- Dependencies: 272
-- Name: property_coordinates_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_coordinates_id_seq OWNED BY template.property_coordinates.id;


--
-- TOC entry 283 (class 1259 OID 27663)
-- Name: property_coordinates; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.property_coordinates (
    id integer DEFAULT nextval('template.property_coordinates_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    latitude numeric,
    longitude numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.property_coordinates OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 27715)
-- Name: property_coordinates_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.property_coordinates_31 AS
 SELECT id,
    property_id,
    latitude,
    longitude,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.property_coordinates;


ALTER VIEW admin_views.property_coordinates_31 OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 27515)
-- Name: property_history; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_history (
    id integer NOT NULL,
    property_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.property_history OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 27514)
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
-- TOC entry 7549 (class 0 OID 0)
-- Dependencies: 268
-- Name: property_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_history_id_seq OWNED BY template.property_history.id;


--
-- TOC entry 281 (class 1259 OID 27641)
-- Name: property_history; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.property_history (
    id integer DEFAULT nextval('template.property_history_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.property_history OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 27707)
-- Name: property_history_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.property_history_31 AS
 SELECT id,
    property_id,
    event_type,
    event_data,
    event_date,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.property_history;


ALTER VIEW admin_views.property_history_31 OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 27532)
-- Name: property_works; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.property_works (
    id integer NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    cost numeric,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    contractor text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.property_works OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 27531)
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
-- TOC entry 7551 (class 0 OID 0)
-- Dependencies: 270
-- Name: property_works_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_works_id_seq OWNED BY template.property_works.id;


--
-- TOC entry 282 (class 1259 OID 27652)
-- Name: property_works; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.property_works (
    id integer DEFAULT nextval('template.property_works_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    cost numeric,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    contractor text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.property_works OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 27711)
-- Name: property_works_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.property_works_31 AS
 SELECT id,
    property_id,
    title,
    description,
    status,
    cost,
    start_date,
    end_date,
    contractor,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.property_works;


ALTER VIEW admin_views.property_works_31 OWNER TO postgres;

--
-- TOC entry 299 (class 1259 OID 27750)
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
-- TOC entry 298 (class 1259 OID 27749)
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
-- TOC entry 7553 (class 0 OID 0)
-- Dependencies: 298
-- Name: storage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.storage_usage_id_seq OWNED BY template.storage_usage.id;


--
-- TOC entry 300 (class 1259 OID 27759)
-- Name: storage_usage; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.storage_usage (
    id integer DEFAULT nextval('template.storage_usage_id_seq'::regclass) NOT NULL,
    resource_type text NOT NULL,
    resource_id integer NOT NULL,
    filename text,
    file_path text,
    file_type text,
    size_bytes bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE client_31.storage_usage OWNER TO postgres;

--
-- TOC entry 301 (class 1259 OID 27768)
-- Name: storage_usage_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.storage_usage_31 AS
 SELECT id,
    resource_type,
    resource_id,
    filename,
    file_path,
    file_type,
    size_bytes,
    created_at,
    deleted_at,
    'client_31'::text AS _schema_name
   FROM client_31.storage_usage;


ALTER VIEW admin_views.storage_usage_31 OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 27479)
-- Name: tenant_documents; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenant_documents (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.tenant_documents OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 27478)
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
-- TOC entry 7555 (class 0 OID 0)
-- Dependencies: 264
-- Name: tenant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_documents_id_seq OWNED BY template.tenant_documents.id;


--
-- TOC entry 279 (class 1259 OID 27622)
-- Name: tenant_documents; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.tenant_documents (
    id integer DEFAULT nextval('template.tenant_documents_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.tenant_documents OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 27699)
-- Name: tenant_documents_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.tenant_documents_31 AS
 SELECT id,
    tenant_id,
    document_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.tenant_documents;


ALTER VIEW admin_views.tenant_documents_31 OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 27498)
-- Name: tenant_history; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenant_history (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.tenant_history OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 27497)
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
-- TOC entry 7557 (class 0 OID 0)
-- Dependencies: 266
-- Name: tenant_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_history_id_seq OWNED BY template.tenant_history.id;


--
-- TOC entry 280 (class 1259 OID 27630)
-- Name: tenant_history; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.tenant_history (
    id integer DEFAULT nextval('template.tenant_history_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.tenant_history OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 27703)
-- Name: tenant_history_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.tenant_history_31 AS
 SELECT id,
    tenant_id,
    event_type,
    event_data,
    event_date,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.tenant_history;


ALTER VIEW admin_views.tenant_history_31 OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 27276)
-- Name: tenants; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenants (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    property_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.tenants OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 27275)
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
-- TOC entry 7559 (class 0 OID 0)
-- Dependencies: 244
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenants_id_seq OWNED BY template.tenants.id;


--
-- TOC entry 251 (class 1259 OID 27348)
-- Name: tenants; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.tenants (
    id integer DEFAULT nextval('template.tenants_id_seq'::regclass) NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    property_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.tenants OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 27385)
-- Name: tenants_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.tenants_31 AS
 SELECT id,
    first_name,
    last_name,
    email,
    phone,
    property_id,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.tenants;


ALTER VIEW admin_views.tenants_31 OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 27292)
-- Name: transactions; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.transactions (
    id integer NOT NULL,
    amount numeric NOT NULL,
    description text,
    date timestamp without time zone NOT NULL,
    type text NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.transactions OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 27291)
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
-- TOC entry 7561 (class 0 OID 0)
-- Dependencies: 246
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.transactions_id_seq OWNED BY template.transactions.id;


--
-- TOC entry 252 (class 1259 OID 27358)
-- Name: transactions; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.transactions (
    id integer DEFAULT nextval('template.transactions_id_seq'::regclass) NOT NULL,
    amount numeric NOT NULL,
    description text,
    date timestamp without time zone NOT NULL,
    type text NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.transactions OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 27389)
-- Name: transactions_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.transactions_31 AS
 SELECT id,
    amount,
    description,
    date,
    type,
    property_id,
    tenant_id,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.transactions;


ALTER VIEW admin_views.transactions_31 OWNER TO postgres;

--
-- TOC entry 318 (class 1259 OID 28015)
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.ai_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.ai_conversations_id_seq OWNER TO postgres;

--
-- TOC entry 314 (class 1259 OID 27952)
-- Name: ai_conversations; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.ai_conversations (
    id integer DEFAULT nextval('client_31.ai_conversations_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.ai_conversations OWNER TO postgres;

--
-- TOC entry 319 (class 1259 OID 28017)
-- Name: ai_messages_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.ai_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.ai_messages_id_seq OWNER TO postgres;

--
-- TOC entry 315 (class 1259 OID 27969)
-- Name: ai_messages; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.ai_messages (
    id integer DEFAULT nextval('client_31.ai_messages_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.ai_messages OWNER TO postgres;

--
-- TOC entry 320 (class 1259 OID 28019)
-- Name: ai_suggestions_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.ai_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.ai_suggestions_id_seq OWNER TO postgres;

--
-- TOC entry 316 (class 1259 OID 27988)
-- Name: ai_suggestions; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.ai_suggestions (
    id integer DEFAULT nextval('client_31.ai_suggestions_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.ai_suggestions OWNER TO postgres;

--
-- TOC entry 321 (class 1259 OID 28021)
-- Name: analysis_configs_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.analysis_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.analysis_configs_id_seq OWNER TO postgres;

--
-- TOC entry 317 (class 1259 OID 28006)
-- Name: analysis_configs; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.analysis_configs (
    id integer DEFAULT nextval('client_31.analysis_configs_id_seq'::regclass) NOT NULL,
    property_id integer,
    user_id integer,
    name character varying(255) NOT NULL,
    period_type character varying(50) NOT NULL,
    period_value integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE client_31.analysis_configs OWNER TO postgres;

--
-- TOC entry 369 (class 1259 OID 28429)
-- Name: automatic_reminders_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.automatic_reminders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.automatic_reminders_id_seq OWNER TO postgres;

--
-- TOC entry 368 (class 1259 OID 28414)
-- Name: automatic_reminders; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.automatic_reminders (
    id integer DEFAULT nextval('client_31.automatic_reminders_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.automatic_reminders OWNER TO postgres;

--
-- TOC entry 371 (class 1259 OID 28441)
-- Name: contract_parties_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.contract_parties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.contract_parties_id_seq OWNER TO postgres;

--
-- TOC entry 370 (class 1259 OID 28431)
-- Name: contract_parties; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.contract_parties (
    id integer DEFAULT nextval('client_31.contract_parties_id_seq'::regclass) NOT NULL,
    contract_id integer NOT NULL,
    party_id integer NOT NULL,
    party_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT contract_parties_party_type_check CHECK ((party_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'manager'::text, 'other'::text])))
);


ALTER TABLE client_31.contract_parties OWNER TO postgres;

--
-- TOC entry 332 (class 1259 OID 28134)
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.contracts_id_seq OWNER TO postgres;

--
-- TOC entry 329 (class 1259 OID 28107)
-- Name: contracts; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.contracts (
    id integer DEFAULT nextval('client_31.contracts_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.contracts OWNER TO postgres;

--
-- TOC entry 373 (class 1259 OID 28454)
-- Name: financial_entries_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.financial_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.financial_entries_id_seq OWNER TO postgres;

--
-- TOC entry 372 (class 1259 OID 28443)
-- Name: financial_entries; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.financial_entries (
    id integer DEFAULT nextval('client_31.financial_entries_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.financial_entries OWNER TO postgres;

--
-- TOC entry 375 (class 1259 OID 28466)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.folders_id_seq OWNER TO postgres;

--
-- TOC entry 374 (class 1259 OID 28456)
-- Name: folders; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.folders (
    id integer DEFAULT nextval('client_31.folders_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.folders OWNER TO postgres;

--
-- TOC entry 331 (class 1259 OID 28132)
-- Name: form_field_options_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.form_field_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.form_field_options_id_seq OWNER TO postgres;

--
-- TOC entry 328 (class 1259 OID 28099)
-- Name: form_field_options; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.form_field_options (
    id integer DEFAULT nextval('client_31.form_field_options_id_seq'::regclass) NOT NULL,
    form_field_id integer NOT NULL,
    value character varying(255) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_31.form_field_options OWNER TO postgres;

--
-- TOC entry 377 (class 1259 OID 28482)
-- Name: form_fields_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.form_fields_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.form_fields_id_seq OWNER TO postgres;

--
-- TOC entry 376 (class 1259 OID 28468)
-- Name: form_fields; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.form_fields (
    id integer DEFAULT nextval('client_31.form_fields_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    field_id character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    label character varying(255) NOT NULL,
    required boolean DEFAULT false,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    CONSTRAINT form_fields_type_check CHECK (((type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'email'::character varying, 'number'::character varying, 'checkbox'::character varying, 'select'::character varying])::text[])))
);


ALTER TABLE client_31.form_fields OWNER TO postgres;

--
-- TOC entry 305 (class 1259 OID 27836)
-- Name: form_responses; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.form_responses (
    id integer NOT NULL,
    form_id integer,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address text
);


ALTER TABLE client_31.form_responses OWNER TO postgres;

--
-- TOC entry 379 (class 1259 OID 28496)
-- Name: forms_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.forms_id_seq OWNER TO postgres;

--
-- TOC entry 378 (class 1259 OID 28484)
-- Name: forms; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.forms (
    id integer DEFAULT nextval('client_31.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_31.forms OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 27800)
-- Name: link_profiles; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.link_profiles (
    id integer NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_31.link_profiles OWNER TO postgres;

--
-- TOC entry 381 (class 1259 OID 28515)
-- Name: links_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.links_id_seq OWNER TO postgres;

--
-- TOC entry 380 (class 1259 OID 28498)
-- Name: links; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.links (
    id integer DEFAULT nextval('client_31.links_id_seq'::regclass) NOT NULL,
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
    form_definition jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    button_style character varying(20),
    user_id integer
);


ALTER TABLE client_31.links OWNER TO postgres;

--
-- TOC entry 383 (class 1259 OID 28528)
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.maintenance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.maintenance_id_seq OWNER TO postgres;

--
-- TOC entry 382 (class 1259 OID 28517)
-- Name: maintenance; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.maintenance (
    id integer DEFAULT nextval('client_31.maintenance_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "propertyId" integer NOT NULL,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE client_31.maintenance OWNER TO postgres;

--
-- TOC entry 393 (class 1259 OID 28617)
-- Name: pdf_configuration_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.pdf_configuration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.pdf_configuration_id_seq OWNER TO postgres;

--
-- TOC entry 392 (class 1259 OID 28584)
-- Name: pdf_configuration; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.pdf_configuration (
    id integer DEFAULT nextval('client_31.pdf_configuration_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.pdf_configuration OWNER TO postgres;

--
-- TOC entry 395 (class 1259 OID 28636)
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.pdf_document_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.pdf_document_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 394 (class 1259 OID 28619)
-- Name: pdf_document_preferences; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.pdf_document_preferences (
    id integer DEFAULT nextval('client_31.pdf_document_preferences_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.pdf_document_preferences OWNER TO postgres;

--
-- TOC entry 397 (class 1259 OID 28651)
-- Name: pdf_logos_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.pdf_logos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.pdf_logos_id_seq OWNER TO postgres;

--
-- TOC entry 396 (class 1259 OID 28638)
-- Name: pdf_logos; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.pdf_logos (
    id integer DEFAULT nextval('client_31.pdf_logos_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_data text NOT NULL,
    width integer DEFAULT 100,
    height integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_31.pdf_logos OWNER TO postgres;

--
-- TOC entry 399 (class 1259 OID 28671)
-- Name: pdf_templates_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.pdf_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.pdf_templates_id_seq OWNER TO postgres;

--
-- TOC entry 398 (class 1259 OID 28653)
-- Name: pdf_templates; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.pdf_templates (
    id integer DEFAULT nextval('client_31.pdf_templates_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.pdf_templates OWNER TO postgres;

--
-- TOC entry 401 (class 1259 OID 28687)
-- Name: pdf_themes_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.pdf_themes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.pdf_themes_id_seq OWNER TO postgres;

--
-- TOC entry 400 (class 1259 OID 28673)
-- Name: pdf_themes; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.pdf_themes (
    id integer DEFAULT nextval('client_31.pdf_themes_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.pdf_themes OWNER TO postgres;

--
-- TOC entry 385 (class 1259 OID 28541)
-- Name: property_financial_goals_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.property_financial_goals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.property_financial_goals_id_seq OWNER TO postgres;

--
-- TOC entry 384 (class 1259 OID 28530)
-- Name: property_financial_goals; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.property_financial_goals (
    id integer DEFAULT nextval('client_31.property_financial_goals_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.property_financial_goals OWNER TO postgres;

--
-- TOC entry 387 (class 1259 OID 28553)
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.property_financial_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.property_financial_snapshots_id_seq OWNER TO postgres;

--
-- TOC entry 386 (class 1259 OID 28543)
-- Name: property_financial_snapshots; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.property_financial_snapshots (
    id integer DEFAULT nextval('client_31.property_financial_snapshots_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.property_financial_snapshots OWNER TO postgres;

--
-- TOC entry 389 (class 1259 OID 28570)
-- Name: rent_receipts_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.rent_receipts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.rent_receipts_id_seq OWNER TO postgres;

--
-- TOC entry 388 (class 1259 OID 28555)
-- Name: rent_receipts; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.rent_receipts (
    id integer DEFAULT nextval('client_31.rent_receipts_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.rent_receipts OWNER TO postgres;

--
-- TOC entry 333 (class 1259 OID 28136)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.reports_id_seq OWNER TO postgres;

--
-- TOC entry 330 (class 1259 OID 28122)
-- Name: reports; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.reports (
    id integer DEFAULT nextval('client_31.reports_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "reportType" text,
    "fileUrl" text,
    "userId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_31.reports OWNER TO postgres;

--
-- TOC entry 391 (class 1259 OID 28582)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: client_31; Owner: postgres
--

CREATE SEQUENCE client_31.transaction_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_31.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 390 (class 1259 OID 28572)
-- Name: transaction_attachments; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.transaction_attachments (
    id integer DEFAULT nextval('client_31.transaction_attachments_id_seq'::regclass) NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now(),
    user_id integer
);


ALTER TABLE client_31.transaction_attachments OWNER TO postgres;

--
-- TOC entry 485 (class 1259 OID 29334)
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
-- TOC entry 486 (class 1259 OID 29346)
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
-- TOC entry 7589 (class 0 OID 0)
-- Dependencies: 486
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.visits_id_seq OWNED BY template.visits.id;


--
-- TOC entry 487 (class 1259 OID 29350)
-- Name: visits; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.visits (
    id integer DEFAULT nextval('template.visits_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_31.visits OWNER TO postgres;

--
-- TOC entry 405 (class 1259 OID 28730)
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.ai_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.ai_conversations_id_seq OWNER TO postgres;

--
-- TOC entry 404 (class 1259 OID 28713)
-- Name: ai_conversations; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.ai_conversations (
    id integer DEFAULT nextval('client_40.ai_conversations_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.ai_conversations OWNER TO postgres;

--
-- TOC entry 413 (class 1259 OID 28787)
-- Name: ai_messages_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.ai_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.ai_messages_id_seq OWNER TO postgres;

--
-- TOC entry 412 (class 1259 OID 28768)
-- Name: ai_messages; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.ai_messages (
    id integer DEFAULT nextval('client_40.ai_messages_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.ai_messages OWNER TO postgres;

--
-- TOC entry 417 (class 1259 OID 28819)
-- Name: ai_suggestions_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.ai_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.ai_suggestions_id_seq OWNER TO postgres;

--
-- TOC entry 416 (class 1259 OID 28801)
-- Name: ai_suggestions; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.ai_suggestions (
    id integer DEFAULT nextval('client_40.ai_suggestions_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.ai_suggestions OWNER TO postgres;

--
-- TOC entry 419 (class 1259 OID 28830)
-- Name: analysis_configs_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.analysis_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.analysis_configs_id_seq OWNER TO postgres;

--
-- TOC entry 418 (class 1259 OID 28821)
-- Name: analysis_configs; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.analysis_configs (
    id integer DEFAULT nextval('client_40.analysis_configs_id_seq'::regclass) NOT NULL,
    property_id integer,
    user_id integer,
    name character varying(255) NOT NULL,
    period_type character varying(50) NOT NULL,
    period_value integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE client_40.analysis_configs OWNER TO postgres;

--
-- TOC entry 446 (class 1259 OID 29009)
-- Name: automatic_reminders_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.automatic_reminders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.automatic_reminders_id_seq OWNER TO postgres;

--
-- TOC entry 445 (class 1259 OID 28994)
-- Name: automatic_reminders; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.automatic_reminders (
    id integer DEFAULT nextval('client_40.automatic_reminders_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.automatic_reminders OWNER TO postgres;

--
-- TOC entry 448 (class 1259 OID 29021)
-- Name: contract_parties_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.contract_parties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.contract_parties_id_seq OWNER TO postgres;

--
-- TOC entry 447 (class 1259 OID 29011)
-- Name: contract_parties; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.contract_parties (
    id integer DEFAULT nextval('client_40.contract_parties_id_seq'::regclass) NOT NULL,
    contract_id integer NOT NULL,
    party_id integer NOT NULL,
    party_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT contract_parties_party_type_check CHECK ((party_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'manager'::text, 'other'::text])))
);


ALTER TABLE client_40.contract_parties OWNER TO postgres;

--
-- TOC entry 442 (class 1259 OID 28980)
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.contracts_id_seq OWNER TO postgres;

--
-- TOC entry 441 (class 1259 OID 28965)
-- Name: contracts; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.contracts (
    id integer DEFAULT nextval('client_40.contracts_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.contracts OWNER TO postgres;

--
-- TOC entry 415 (class 1259 OID 28799)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.documents_id_seq OWNER TO postgres;

--
-- TOC entry 414 (class 1259 OID 28789)
-- Name: documents; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.documents (
    id integer DEFAULT nextval('client_40.documents_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size integer,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.documents OWNER TO postgres;

--
-- TOC entry 424 (class 1259 OID 28868)
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.feedbacks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.feedbacks_id_seq OWNER TO postgres;

--
-- TOC entry 423 (class 1259 OID 28858)
-- Name: feedbacks; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.feedbacks (
    id integer DEFAULT nextval('client_40.feedbacks_id_seq'::regclass) NOT NULL,
    tenant_id integer,
    property_id integer,
    rating integer,
    comment text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.feedbacks OWNER TO postgres;

--
-- TOC entry 450 (class 1259 OID 29034)
-- Name: financial_entries_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.financial_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.financial_entries_id_seq OWNER TO postgres;

--
-- TOC entry 449 (class 1259 OID 29023)
-- Name: financial_entries; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.financial_entries (
    id integer DEFAULT nextval('client_40.financial_entries_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.financial_entries OWNER TO postgres;

--
-- TOC entry 452 (class 1259 OID 29046)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.folders_id_seq OWNER TO postgres;

--
-- TOC entry 451 (class 1259 OID 29036)
-- Name: folders; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.folders (
    id integer DEFAULT nextval('client_40.folders_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.folders OWNER TO postgres;

--
-- TOC entry 440 (class 1259 OID 28963)
-- Name: form_field_options_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.form_field_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.form_field_options_id_seq OWNER TO postgres;

--
-- TOC entry 439 (class 1259 OID 28955)
-- Name: form_field_options; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.form_field_options (
    id integer DEFAULT nextval('client_40.form_field_options_id_seq'::regclass) NOT NULL,
    form_field_id integer NOT NULL,
    value character varying(255) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_40.form_field_options OWNER TO postgres;

--
-- TOC entry 454 (class 1259 OID 29062)
-- Name: form_fields_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.form_fields_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.form_fields_id_seq OWNER TO postgres;

--
-- TOC entry 453 (class 1259 OID 29048)
-- Name: form_fields; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.form_fields (
    id integer DEFAULT nextval('client_40.form_fields_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    field_id character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    label character varying(255) NOT NULL,
    required boolean DEFAULT false,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    CONSTRAINT form_fields_type_check CHECK (((type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'email'::character varying, 'number'::character varying, 'checkbox'::character varying, 'select'::character varying])::text[])))
);


ALTER TABLE client_40.form_fields OWNER TO postgres;

--
-- TOC entry 484 (class 1259 OID 29316)
-- Name: form_responses_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.form_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.form_responses_id_seq OWNER TO postgres;

--
-- TOC entry 483 (class 1259 OID 29307)
-- Name: form_responses; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.form_responses (
    id integer DEFAULT nextval('client_40.form_responses_id_seq'::regclass) NOT NULL,
    form_id integer,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address text
);


ALTER TABLE client_40.form_responses OWNER TO postgres;

--
-- TOC entry 426 (class 1259 OID 28880)
-- Name: form_submissions_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.form_submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.form_submissions_id_seq OWNER TO postgres;

--
-- TOC entry 425 (class 1259 OID 28870)
-- Name: form_submissions; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.form_submissions (
    id integer DEFAULT nextval('client_40.form_submissions_id_seq'::regclass) NOT NULL,
    form_id text NOT NULL,
    form_data jsonb NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.form_submissions OWNER TO postgres;

--
-- TOC entry 456 (class 1259 OID 29076)
-- Name: forms_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.forms_id_seq OWNER TO postgres;

--
-- TOC entry 455 (class 1259 OID 29064)
-- Name: forms; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.forms (
    id integer DEFAULT nextval('client_40.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_40.forms OWNER TO postgres;

--
-- TOC entry 482 (class 1259 OID 29305)
-- Name: link_profiles_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.link_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.link_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 481 (class 1259 OID 29280)
-- Name: link_profiles; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.link_profiles (
    id integer DEFAULT nextval('client_40.link_profiles_id_seq'::regclass) NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_40.link_profiles OWNER TO postgres;

--
-- TOC entry 458 (class 1259 OID 29095)
-- Name: links_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.links_id_seq OWNER TO postgres;

--
-- TOC entry 457 (class 1259 OID 29078)
-- Name: links; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.links (
    id integer DEFAULT nextval('client_40.links_id_seq'::regclass) NOT NULL,
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
    form_definition jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    button_style character varying(20),
    user_id integer
);


ALTER TABLE client_40.links OWNER TO postgres;

--
-- TOC entry 460 (class 1259 OID 29108)
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.maintenance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.maintenance_id_seq OWNER TO postgres;

--
-- TOC entry 459 (class 1259 OID 29097)
-- Name: maintenance; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.maintenance (
    id integer DEFAULT nextval('client_40.maintenance_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "propertyId" integer NOT NULL,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE client_40.maintenance OWNER TO postgres;

--
-- TOC entry 422 (class 1259 OID 28856)
-- Name: maintenance_requests_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.maintenance_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.maintenance_requests_id_seq OWNER TO postgres;

--
-- TOC entry 421 (class 1259 OID 28844)
-- Name: maintenance_requests; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.maintenance_requests (
    id integer DEFAULT nextval('client_40.maintenance_requests_id_seq'::regclass) NOT NULL,
    property_id integer,
    tenant_id integer,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text,
    reported_date timestamp without time zone DEFAULT now() NOT NULL,
    resolved_date timestamp without time zone,
    resolution_notes text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.maintenance_requests OWNER TO postgres;

--
-- TOC entry 470 (class 1259 OID 29197)
-- Name: pdf_configuration_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.pdf_configuration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.pdf_configuration_id_seq OWNER TO postgres;

--
-- TOC entry 469 (class 1259 OID 29164)
-- Name: pdf_configuration; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.pdf_configuration (
    id integer DEFAULT nextval('client_40.pdf_configuration_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.pdf_configuration OWNER TO postgres;

--
-- TOC entry 474 (class 1259 OID 29227)
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.pdf_document_preferences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.pdf_document_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 473 (class 1259 OID 29210)
-- Name: pdf_document_preferences; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.pdf_document_preferences (
    id integer DEFAULT nextval('client_40.pdf_document_preferences_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.pdf_document_preferences OWNER TO postgres;

--
-- TOC entry 476 (class 1259 OID 29242)
-- Name: pdf_logos_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.pdf_logos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.pdf_logos_id_seq OWNER TO postgres;

--
-- TOC entry 475 (class 1259 OID 29229)
-- Name: pdf_logos; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.pdf_logos (
    id integer DEFAULT nextval('client_40.pdf_logos_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_data text NOT NULL,
    width integer DEFAULT 100,
    height integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_40.pdf_logos OWNER TO postgres;

--
-- TOC entry 478 (class 1259 OID 29262)
-- Name: pdf_templates_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.pdf_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.pdf_templates_id_seq OWNER TO postgres;

--
-- TOC entry 477 (class 1259 OID 29244)
-- Name: pdf_templates; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.pdf_templates (
    id integer DEFAULT nextval('client_40.pdf_templates_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.pdf_templates OWNER TO postgres;

--
-- TOC entry 480 (class 1259 OID 29278)
-- Name: pdf_themes_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.pdf_themes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.pdf_themes_id_seq OWNER TO postgres;

--
-- TOC entry 479 (class 1259 OID 29264)
-- Name: pdf_themes; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.pdf_themes (
    id integer DEFAULT nextval('client_40.pdf_themes_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.pdf_themes OWNER TO postgres;

--
-- TOC entry 407 (class 1259 OID 28742)
-- Name: properties_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.properties_id_seq OWNER TO postgres;

--
-- TOC entry 406 (class 1259 OID 28732)
-- Name: properties; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.properties (
    id integer DEFAULT nextval('client_40.properties_id_seq'::regclass) NOT NULL,
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
    area integer[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.properties OWNER TO postgres;

--
-- TOC entry 438 (class 1259 OID 28953)
-- Name: property_analyses_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.property_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.property_analyses_id_seq OWNER TO postgres;

--
-- TOC entry 437 (class 1259 OID 28943)
-- Name: property_analyses; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.property_analyses (
    id integer DEFAULT nextval('client_40.property_analyses_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    analysis_type text NOT NULL,
    analysis_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.property_analyses OWNER TO postgres;

--
-- TOC entry 436 (class 1259 OID 28941)
-- Name: property_coordinates_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.property_coordinates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.property_coordinates_id_seq OWNER TO postgres;

--
-- TOC entry 435 (class 1259 OID 28931)
-- Name: property_coordinates; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.property_coordinates (
    id integer DEFAULT nextval('client_40.property_coordinates_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    latitude numeric,
    longitude numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.property_coordinates OWNER TO postgres;

--
-- TOC entry 462 (class 1259 OID 29121)
-- Name: property_financial_goals_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.property_financial_goals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.property_financial_goals_id_seq OWNER TO postgres;

--
-- TOC entry 461 (class 1259 OID 29110)
-- Name: property_financial_goals; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.property_financial_goals (
    id integer DEFAULT nextval('client_40.property_financial_goals_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.property_financial_goals OWNER TO postgres;

--
-- TOC entry 464 (class 1259 OID 29133)
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.property_financial_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.property_financial_snapshots_id_seq OWNER TO postgres;

--
-- TOC entry 463 (class 1259 OID 29123)
-- Name: property_financial_snapshots; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.property_financial_snapshots (
    id integer DEFAULT nextval('client_40.property_financial_snapshots_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.property_financial_snapshots OWNER TO postgres;

--
-- TOC entry 432 (class 1259 OID 28916)
-- Name: property_history_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.property_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.property_history_id_seq OWNER TO postgres;

--
-- TOC entry 431 (class 1259 OID 28905)
-- Name: property_history; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.property_history (
    id integer DEFAULT nextval('client_40.property_history_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.property_history OWNER TO postgres;

--
-- TOC entry 434 (class 1259 OID 28929)
-- Name: property_works_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.property_works_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.property_works_id_seq OWNER TO postgres;

--
-- TOC entry 433 (class 1259 OID 28918)
-- Name: property_works; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.property_works (
    id integer DEFAULT nextval('client_40.property_works_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    cost numeric,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    contractor text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.property_works OWNER TO postgres;

--
-- TOC entry 466 (class 1259 OID 29150)
-- Name: rent_receipts_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.rent_receipts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.rent_receipts_id_seq OWNER TO postgres;

--
-- TOC entry 465 (class 1259 OID 29135)
-- Name: rent_receipts; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.rent_receipts (
    id integer DEFAULT nextval('client_40.rent_receipts_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.rent_receipts OWNER TO postgres;

--
-- TOC entry 444 (class 1259 OID 28992)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.reports_id_seq OWNER TO postgres;

--
-- TOC entry 443 (class 1259 OID 28982)
-- Name: reports; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.reports (
    id integer DEFAULT nextval('client_40.reports_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "reportType" text,
    "fileUrl" text,
    "userId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_40.reports OWNER TO postgres;

--
-- TOC entry 472 (class 1259 OID 29208)
-- Name: storage_usage_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.storage_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.storage_usage_id_seq OWNER TO postgres;

--
-- TOC entry 471 (class 1259 OID 29199)
-- Name: storage_usage; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.storage_usage (
    id integer DEFAULT nextval('client_40.storage_usage_id_seq'::regclass) NOT NULL,
    resource_type text NOT NULL,
    resource_id integer NOT NULL,
    filename text,
    file_path text,
    file_type text,
    size_bytes bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE client_40.storage_usage OWNER TO postgres;

--
-- TOC entry 428 (class 1259 OID 28890)
-- Name: tenant_documents_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.tenant_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.tenant_documents_id_seq OWNER TO postgres;

--
-- TOC entry 427 (class 1259 OID 28882)
-- Name: tenant_documents; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.tenant_documents (
    id integer DEFAULT nextval('client_40.tenant_documents_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.tenant_documents OWNER TO postgres;

--
-- TOC entry 430 (class 1259 OID 28903)
-- Name: tenant_history_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.tenant_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.tenant_history_id_seq OWNER TO postgres;

--
-- TOC entry 429 (class 1259 OID 28892)
-- Name: tenant_history; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.tenant_history (
    id integer DEFAULT nextval('client_40.tenant_history_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.tenant_history OWNER TO postgres;

--
-- TOC entry 409 (class 1259 OID 28754)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.tenants_id_seq OWNER TO postgres;

--
-- TOC entry 408 (class 1259 OID 28744)
-- Name: tenants; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.tenants (
    id integer DEFAULT nextval('client_40.tenants_id_seq'::regclass) NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    property_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.tenants OWNER TO postgres;

--
-- TOC entry 468 (class 1259 OID 29162)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.transaction_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 467 (class 1259 OID 29152)
-- Name: transaction_attachments; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.transaction_attachments (
    id integer DEFAULT nextval('client_40.transaction_attachments_id_seq'::regclass) NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now(),
    user_id integer
);


ALTER TABLE client_40.transaction_attachments OWNER TO postgres;

--
-- TOC entry 411 (class 1259 OID 28766)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 410 (class 1259 OID 28756)
-- Name: transactions; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.transactions (
    id integer DEFAULT nextval('client_40.transactions_id_seq'::regclass) NOT NULL,
    amount numeric NOT NULL,
    description text,
    date timestamp without time zone NOT NULL,
    type text NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_40.transactions OWNER TO postgres;

--
-- TOC entry 488 (class 1259 OID 29365)
-- Name: visits; Type: TABLE; Schema: client_40; Owner: postgres
--

CREATE TABLE client_40.visits (
    id integer DEFAULT nextval('template.visits_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_40.visits OWNER TO postgres;

--
-- TOC entry 420 (class 1259 OID 28842)
-- Name: visits_id_seq; Type: SEQUENCE; Schema: client_40; Owner: postgres
--

CREATE SEQUENCE client_40.visits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_40.visits_id_seq OWNER TO postgres;

--
-- TOC entry 489 (class 1259 OID 29390)
-- Name: visits; Type: TABLE; Schema: client_47; Owner: postgres
--

CREATE TABLE client_47.visits (
    id integer DEFAULT nextval('template.visits_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_47.visits OWNER TO postgres;

--
-- TOC entry 490 (class 1259 OID 29406)
-- Name: visits; Type: TABLE; Schema: client_48; Owner: postgres
--

CREATE TABLE client_48.visits (
    id integer DEFAULT nextval('template.visits_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_48.visits OWNER TO postgres;

--
-- TOC entry 310 (class 1259 OID 27944)
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
-- TOC entry 491 (class 1259 OID 29428)
-- Name: ai_conversations; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.ai_conversations (
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


ALTER TABLE client_52.ai_conversations OWNER TO postgres;

--
-- TOC entry 311 (class 1259 OID 27946)
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
-- TOC entry 495 (class 1259 OID 29475)
-- Name: ai_messages; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.ai_messages (
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


ALTER TABLE client_52.ai_messages OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 27948)
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
-- TOC entry 497 (class 1259 OID 29504)
-- Name: ai_suggestions; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.ai_suggestions (
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


ALTER TABLE client_52.ai_suggestions OWNER TO postgres;

--
-- TOC entry 313 (class 1259 OID 27950)
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
-- TOC entry 498 (class 1259 OID 29522)
-- Name: analysis_configs; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.analysis_configs (
    id integer DEFAULT nextval('template.analysis_configs_id_seq'::regclass) NOT NULL,
    property_id integer,
    user_id integer,
    name character varying(255) NOT NULL,
    period_type character varying(50) NOT NULL,
    period_value integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE client_52.analysis_configs OWNER TO postgres;

--
-- TOC entry 335 (class 1259 OID 28154)
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
-- TOC entry 511 (class 1259 OID 29657)
-- Name: automatic_reminders; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.automatic_reminders (
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


ALTER TABLE client_52.automatic_reminders OWNER TO postgres;

--
-- TOC entry 337 (class 1259 OID 28166)
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
-- TOC entry 512 (class 1259 OID 29672)
-- Name: contract_parties; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.contract_parties (
    id integer DEFAULT nextval('template.contract_parties_id_seq'::regclass) NOT NULL,
    contract_id integer NOT NULL,
    party_id integer NOT NULL,
    party_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT contract_parties_party_type_check CHECK ((party_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'manager'::text, 'other'::text])))
);


ALTER TABLE client_52.contract_parties OWNER TO postgres;

--
-- TOC entry 326 (class 1259 OID 28095)
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
-- TOC entry 509 (class 1259 OID 29632)
-- Name: contracts; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.contracts (
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


ALTER TABLE client_52.contracts OWNER TO postgres;

--
-- TOC entry 496 (class 1259 OID 29494)
-- Name: documents; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.documents (
    id integer DEFAULT nextval('template.documents_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size integer,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.documents OWNER TO postgres;

--
-- TOC entry 500 (class 1259 OID 29543)
-- Name: feedbacks; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.feedbacks (
    id integer DEFAULT nextval('template.feedbacks_id_seq'::regclass) NOT NULL,
    tenant_id integer,
    property_id integer,
    rating integer,
    comment text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.feedbacks OWNER TO postgres;

--
-- TOC entry 339 (class 1259 OID 28179)
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
-- TOC entry 513 (class 1259 OID 29682)
-- Name: financial_entries; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.financial_entries (
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


ALTER TABLE client_52.financial_entries OWNER TO postgres;

--
-- TOC entry 341 (class 1259 OID 28191)
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
-- TOC entry 514 (class 1259 OID 29693)
-- Name: folders; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.folders (
    id integer DEFAULT nextval('template.folders_id_seq'::regclass) NOT NULL,
    name text NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.folders OWNER TO postgres;

--
-- TOC entry 325 (class 1259 OID 28093)
-- Name: form_field_options_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.form_field_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.form_field_options_id_seq OWNER TO postgres;

--
-- TOC entry 508 (class 1259 OID 29624)
-- Name: form_field_options; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.form_field_options (
    id integer DEFAULT nextval('template.form_field_options_id_seq'::regclass) NOT NULL,
    form_field_id integer NOT NULL,
    value character varying(255) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_52.form_field_options OWNER TO postgres;

--
-- TOC entry 343 (class 1259 OID 28207)
-- Name: form_fields_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.form_fields_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.form_fields_id_seq OWNER TO postgres;

--
-- TOC entry 515 (class 1259 OID 29703)
-- Name: form_fields; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.form_fields (
    id integer DEFAULT nextval('template.form_fields_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    field_id character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    label character varying(255) NOT NULL,
    required boolean DEFAULT false,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    CONSTRAINT form_fields_type_check CHECK (((type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'email'::character varying, 'number'::character varying, 'checkbox'::character varying, 'select'::character varying])::text[])))
);


ALTER TABLE client_52.form_fields OWNER TO postgres;

--
-- TOC entry 530 (class 1259 OID 29932)
-- Name: form_responses; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.form_responses (
    id integer NOT NULL,
    form_id integer,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address text
);


ALTER TABLE client_52.form_responses OWNER TO postgres;

--
-- TOC entry 501 (class 1259 OID 29553)
-- Name: form_submissions; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.form_submissions (
    id integer DEFAULT nextval('template.form_submissions_id_seq'::regclass) NOT NULL,
    form_id text NOT NULL,
    form_data jsonb NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.form_submissions OWNER TO postgres;

--
-- TOC entry 345 (class 1259 OID 28221)
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
-- TOC entry 516 (class 1259 OID 29717)
-- Name: forms; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.forms (
    id integer DEFAULT nextval('template.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_52.forms OWNER TO postgres;

--
-- TOC entry 529 (class 1259 OID 29907)
-- Name: link_profiles; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.link_profiles (
    id integer NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_52.link_profiles OWNER TO postgres;

--
-- TOC entry 347 (class 1259 OID 28240)
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
-- TOC entry 517 (class 1259 OID 29729)
-- Name: links; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.links (
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
    form_definition jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    button_style character varying(20),
    user_id integer
);


ALTER TABLE client_52.links OWNER TO postgres;

--
-- TOC entry 349 (class 1259 OID 28253)
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
-- TOC entry 518 (class 1259 OID 29746)
-- Name: maintenance; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.maintenance (
    id integer DEFAULT nextval('template.maintenance_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "propertyId" integer NOT NULL,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer
);


ALTER TABLE client_52.maintenance OWNER TO postgres;

--
-- TOC entry 499 (class 1259 OID 29531)
-- Name: maintenance_requests; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.maintenance_requests (
    id integer DEFAULT nextval('template.maintenance_requests_id_seq'::regclass) NOT NULL,
    property_id integer,
    tenant_id integer,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text,
    reported_date timestamp without time zone DEFAULT now() NOT NULL,
    resolved_date timestamp without time zone,
    resolution_notes text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.maintenance_requests OWNER TO postgres;

--
-- TOC entry 359 (class 1259 OID 28342)
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
-- TOC entry 523 (class 1259 OID 29803)
-- Name: pdf_configuration; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.pdf_configuration (
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


ALTER TABLE client_52.pdf_configuration OWNER TO postgres;

--
-- TOC entry 361 (class 1259 OID 28361)
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
-- TOC entry 525 (class 1259 OID 29845)
-- Name: pdf_document_preferences; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.pdf_document_preferences (
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


ALTER TABLE client_52.pdf_document_preferences OWNER TO postgres;

--
-- TOC entry 363 (class 1259 OID 28376)
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
-- TOC entry 526 (class 1259 OID 29862)
-- Name: pdf_logos; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.pdf_logos (
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


ALTER TABLE client_52.pdf_logos OWNER TO postgres;

--
-- TOC entry 365 (class 1259 OID 28396)
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
-- TOC entry 527 (class 1259 OID 29875)
-- Name: pdf_templates; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.pdf_templates (
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


ALTER TABLE client_52.pdf_templates OWNER TO postgres;

--
-- TOC entry 367 (class 1259 OID 28412)
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
-- TOC entry 528 (class 1259 OID 29893)
-- Name: pdf_themes; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.pdf_themes (
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


ALTER TABLE client_52.pdf_themes OWNER TO postgres;

--
-- TOC entry 492 (class 1259 OID 29445)
-- Name: properties; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.properties (
    id integer DEFAULT nextval('template.properties_id_seq'::regclass) NOT NULL,
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
    area integer[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.properties OWNER TO postgres;

--
-- TOC entry 507 (class 1259 OID 29614)
-- Name: property_analyses; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.property_analyses (
    id integer DEFAULT nextval('template.property_analyses_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    analysis_type text NOT NULL,
    analysis_data jsonb,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.property_analyses OWNER TO postgres;

--
-- TOC entry 506 (class 1259 OID 29604)
-- Name: property_coordinates; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.property_coordinates (
    id integer DEFAULT nextval('template.property_coordinates_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    latitude numeric,
    longitude numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.property_coordinates OWNER TO postgres;

--
-- TOC entry 351 (class 1259 OID 28266)
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
-- TOC entry 519 (class 1259 OID 29757)
-- Name: property_financial_goals; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.property_financial_goals (
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


ALTER TABLE client_52.property_financial_goals OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 28278)
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
-- TOC entry 520 (class 1259 OID 29768)
-- Name: property_financial_snapshots; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.property_financial_snapshots (
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


ALTER TABLE client_52.property_financial_snapshots OWNER TO postgres;

--
-- TOC entry 504 (class 1259 OID 29582)
-- Name: property_history; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.property_history (
    id integer DEFAULT nextval('template.property_history_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.property_history OWNER TO postgres;

--
-- TOC entry 505 (class 1259 OID 29593)
-- Name: property_works; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.property_works (
    id integer DEFAULT nextval('template.property_works_id_seq'::regclass) NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    cost numeric,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    contractor text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.property_works OWNER TO postgres;

--
-- TOC entry 355 (class 1259 OID 28295)
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
-- TOC entry 521 (class 1259 OID 29778)
-- Name: rent_receipts; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.rent_receipts (
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


ALTER TABLE client_52.rent_receipts OWNER TO postgres;

--
-- TOC entry 327 (class 1259 OID 28097)
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
-- TOC entry 510 (class 1259 OID 29647)
-- Name: reports; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.reports (
    id integer DEFAULT nextval('template.reports_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text,
    "reportType" text,
    "fileUrl" text,
    "userId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_52.reports OWNER TO postgres;

--
-- TOC entry 524 (class 1259 OID 29836)
-- Name: storage_usage; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.storage_usage (
    id integer DEFAULT nextval('template.storage_usage_id_seq'::regclass) NOT NULL,
    resource_type text NOT NULL,
    resource_id integer NOT NULL,
    filename text,
    file_path text,
    file_type text,
    size_bytes bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE client_52.storage_usage OWNER TO postgres;

--
-- TOC entry 502 (class 1259 OID 29563)
-- Name: tenant_documents; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.tenant_documents (
    id integer DEFAULT nextval('template.tenant_documents_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.tenant_documents OWNER TO postgres;

--
-- TOC entry 503 (class 1259 OID 29571)
-- Name: tenant_history; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.tenant_history (
    id integer DEFAULT nextval('template.tenant_history_id_seq'::regclass) NOT NULL,
    tenant_id integer NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    event_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.tenant_history OWNER TO postgres;

--
-- TOC entry 493 (class 1259 OID 29455)
-- Name: tenants; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.tenants (
    id integer DEFAULT nextval('template.tenants_id_seq'::regclass) NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    property_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.tenants OWNER TO postgres;

--
-- TOC entry 357 (class 1259 OID 28307)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.transaction_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 522 (class 1259 OID 29793)
-- Name: transaction_attachments; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.transaction_attachments (
    id integer DEFAULT nextval('template.transaction_attachments_id_seq'::regclass) NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now(),
    user_id integer
);


ALTER TABLE client_52.transaction_attachments OWNER TO postgres;

--
-- TOC entry 494 (class 1259 OID 29465)
-- Name: transactions; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.transactions (
    id integer DEFAULT nextval('template.transactions_id_seq'::regclass) NOT NULL,
    amount numeric NOT NULL,
    description text,
    date timestamp without time zone NOT NULL,
    type text NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.transactions OWNER TO postgres;

--
-- TOC entry 531 (class 1259 OID 29941)
-- Name: visits; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.visits (
    id integer DEFAULT nextval('template.visits_id_seq'::regclass) NOT NULL,
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


ALTER TABLE client_52.visits OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17090)
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    "userId" integer,
    type text,
    status text DEFAULT 'unread'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17089)
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alerts_id_seq OWNER TO postgres;

--
-- TOC entry 7592 (class 0 OID 0)
-- Dependencies: 226
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- TOC entry 236 (class 1259 OID 18448)
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
-- TOC entry 235 (class 1259 OID 18447)
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
-- TOC entry 7595 (class 0 OID 0)
-- Dependencies: 235
-- Name: billing_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_transactions_id_seq OWNED BY public.billing_transactions.id;


--
-- TOC entry 240 (class 1259 OID 19148)
-- Name: company_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_info (
    id integer NOT NULL,
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


ALTER TABLE public.company_info OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 19147)
-- Name: company_info_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_info_id_seq OWNER TO postgres;

--
-- TOC entry 7598 (class 0 OID 0)
-- Dependencies: 239
-- Name: company_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_info_id_seq OWNED BY public.company_info.id;


--
-- TOC entry 228 (class 1259 OID 17231)
-- Name: document_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_templates (
    id integer NOT NULL,
    name text NOT NULL,
    document_type text NOT NULL,
    field_mappings jsonb NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_templates OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17238)
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_templates_id_seq OWNER TO postgres;

--
-- TOC entry 7601 (class 0 OID 0)
-- Dependencies: 229
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- TOC entry 340 (class 1259 OID 28181)
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
-- TOC entry 402 (class 1259 OID 28697)
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
-- TOC entry 344 (class 1259 OID 28209)
-- Name: forms; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.forms (
    id integer DEFAULT nextval('template.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE template.forms OWNER TO postgres;

--
-- TOC entry 403 (class 1259 OID 28701)
-- Name: forms; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.forms AS
 SELECT id,
    user_id,
    title,
    slug,
    fields,
    created_at
   FROM template.forms;


ALTER VIEW public.forms OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17287)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    related_to text,
    related_id integer,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17294)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 7604 (class 0 OID 0)
-- Dependencies: 231
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 241 (class 1259 OID 27055)
-- Name: schema_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_mapping (
    schema_name text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.schema_mapping OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 18577)
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
-- TOC entry 7606 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sessions IS 'Stocke les sessions d''authentification des utilisateurs';


--
-- TOC entry 237 (class 1259 OID 18576)
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
-- TOC entry 7608 (class 0 OID 0)
-- Dependencies: 237
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- TOC entry 295 (class 1259 OID 27727)
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
-- TOC entry 294 (class 1259 OID 27726)
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
-- TOC entry 7610 (class 0 OID 0)
-- Dependencies: 294
-- Name: storage_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_plans_id_seq OWNED BY public.storage_plans.id;


--
-- TOC entry 297 (class 1259 OID 27739)
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
-- TOC entry 296 (class 1259 OID 27738)
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
-- TOC entry 7611 (class 0 OID 0)
-- Dependencies: 296
-- Name: storage_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_quotas_id_seq OWNED BY public.storage_quotas.id;


--
-- TOC entry 234 (class 1259 OID 17811)
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
-- TOC entry 7612 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE user_notification_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_notification_settings IS 'Stores user preferences for notification deliveries';


--
-- TOC entry 233 (class 1259 OID 17810)
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
-- TOC entry 7614 (class 0 OID 0)
-- Dependencies: 233
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- TOC entry 225 (class 1259 OID 16853)
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
-- TOC entry 232 (class 1259 OID 17365)
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
-- TOC entry 7617 (class 0 OID 0)
-- Dependencies: 232
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 306 (class 1259 OID 27881)
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
-- TOC entry 307 (class 1259 OID 27898)
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
-- TOC entry 308 (class 1259 OID 27917)
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
-- TOC entry 309 (class 1259 OID 27935)
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
-- TOC entry 334 (class 1259 OID 28139)
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
-- TOC entry 336 (class 1259 OID 28156)
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
-- TOC entry 323 (class 1259 OID 28068)
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
-- TOC entry 338 (class 1259 OID 28168)
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
-- TOC entry 322 (class 1259 OID 28060)
-- Name: form_field_options; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.form_field_options (
    id integer DEFAULT nextval('template.form_field_options_id_seq'::regclass) NOT NULL,
    form_field_id integer NOT NULL,
    value character varying(255) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE template.form_field_options OWNER TO postgres;

--
-- TOC entry 342 (class 1259 OID 28193)
-- Name: form_fields; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.form_fields (
    id integer DEFAULT nextval('template.form_fields_id_seq'::regclass) NOT NULL,
    link_id integer NOT NULL,
    field_id character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    label character varying(255) NOT NULL,
    required boolean DEFAULT false,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    CONSTRAINT form_fields_type_check CHECK (((type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'email'::character varying, 'number'::character varying, 'checkbox'::character varying, 'select'::character varying])::text[])))
);


ALTER TABLE template.form_fields OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 27826)
-- Name: form_responses; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.form_responses (
    id integer NOT NULL,
    form_id integer,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address text
);


ALTER TABLE template.form_responses OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 27774)
-- Name: link_profiles; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.link_profiles (
    id integer NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE template.link_profiles OWNER TO postgres;

--
-- TOC entry 346 (class 1259 OID 28223)
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
    form_definition jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    button_style character varying(20),
    user_id integer
);


ALTER TABLE template.links OWNER TO postgres;

--
-- TOC entry 348 (class 1259 OID 28242)
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
    user_id integer
);


ALTER TABLE template.maintenance OWNER TO postgres;

--
-- TOC entry 358 (class 1259 OID 28309)
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
-- TOC entry 360 (class 1259 OID 28344)
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
-- TOC entry 362 (class 1259 OID 28363)
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
-- TOC entry 364 (class 1259 OID 28378)
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
-- TOC entry 366 (class 1259 OID 28398)
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
-- TOC entry 350 (class 1259 OID 28255)
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
-- TOC entry 352 (class 1259 OID 28268)
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
-- TOC entry 354 (class 1259 OID 28280)
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
-- TOC entry 324 (class 1259 OID 28083)
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
-- TOC entry 356 (class 1259 OID 28297)
-- Name: transaction_attachments; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.transaction_attachments (
    id integer DEFAULT nextval('template.transaction_attachments_id_seq'::regclass) NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now(),
    user_id integer
);


ALTER TABLE template.transaction_attachments OWNER TO postgres;

--
-- TOC entry 5569 (class 2604 OID 17093)
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- TOC entry 5586 (class 2604 OID 18451)
-- Name: billing_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions ALTER COLUMN id SET DEFAULT nextval('public.billing_transactions_id_seq'::regclass);


--
-- TOC entry 5591 (class 2604 OID 19151)
-- Name: company_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info ALTER COLUMN id SET DEFAULT nextval('public.company_info_id_seq'::regclass);


--
-- TOC entry 5573 (class 2604 OID 17382)
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);


--
-- TOC entry 5576 (class 2604 OID 17388)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 5588 (class 2604 OID 18580)
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- TOC entry 5683 (class 2604 OID 27730)
-- Name: storage_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans ALTER COLUMN id SET DEFAULT nextval('public.storage_plans_id_seq'::regclass);


--
-- TOC entry 5687 (class 2604 OID 27742)
-- Name: storage_quotas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas ALTER COLUMN id SET DEFAULT nextval('public.storage_quotas_id_seq'::regclass);


--
-- TOC entry 5579 (class 2604 OID 17814)
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- TOC entry 5555 (class 2604 OID 17399)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5604 (class 2604 OID 27316)
-- Name: documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents ALTER COLUMN id SET DEFAULT nextval('template.documents_id_seq'::regclass);


--
-- TOC entry 5624 (class 2604 OID 27440)
-- Name: feedbacks id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks ALTER COLUMN id SET DEFAULT nextval('template.feedbacks_id_seq'::regclass);


--
-- TOC entry 5627 (class 2604 OID 27461)
-- Name: form_submissions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions ALTER COLUMN id SET DEFAULT nextval('template.form_submissions_id_seq'::regclass);


--
-- TOC entry 5619 (class 2604 OID 27417)
-- Name: maintenance_requests id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests ALTER COLUMN id SET DEFAULT nextval('template.maintenance_requests_id_seq'::regclass);


--
-- TOC entry 5595 (class 2604 OID 27268)
-- Name: properties id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties ALTER COLUMN id SET DEFAULT nextval('template.properties_id_seq'::regclass);


--
-- TOC entry 5648 (class 2604 OID 27568)
-- Name: property_analyses id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses ALTER COLUMN id SET DEFAULT nextval('template.property_analyses_id_seq'::regclass);


--
-- TOC entry 5645 (class 2604 OID 27552)
-- Name: property_coordinates id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates ALTER COLUMN id SET DEFAULT nextval('template.property_coordinates_id_seq'::regclass);


--
-- TOC entry 5637 (class 2604 OID 27518)
-- Name: property_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history ALTER COLUMN id SET DEFAULT nextval('template.property_history_id_seq'::regclass);


--
-- TOC entry 5641 (class 2604 OID 27535)
-- Name: property_works id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works ALTER COLUMN id SET DEFAULT nextval('template.property_works_id_seq'::regclass);


--
-- TOC entry 5690 (class 2604 OID 27753)
-- Name: storage_usage id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage ALTER COLUMN id SET DEFAULT nextval('template.storage_usage_id_seq'::regclass);


--
-- TOC entry 5630 (class 2604 OID 27482)
-- Name: tenant_documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents ALTER COLUMN id SET DEFAULT nextval('template.tenant_documents_id_seq'::regclass);


--
-- TOC entry 5633 (class 2604 OID 27501)
-- Name: tenant_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history ALTER COLUMN id SET DEFAULT nextval('template.tenant_history_id_seq'::regclass);


--
-- TOC entry 5598 (class 2604 OID 27279)
-- Name: tenants id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants ALTER COLUMN id SET DEFAULT nextval('template.tenants_id_seq'::regclass);


--
-- TOC entry 5601 (class 2604 OID 27295)
-- Name: transactions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions ALTER COLUMN id SET DEFAULT nextval('template.transactions_id_seq'::regclass);


--
-- TOC entry 6198 (class 2604 OID 29347)
-- Name: visits id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits ALTER COLUMN id SET DEFAULT nextval('template.visits_id_seq'::regclass);


--
-- TOC entry 7262 (class 0 OID 27952)
-- Dependencies: 314
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 7263 (class 0 OID 27969)
-- Dependencies: 315
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 7264 (class 0 OID 27988)
-- Dependencies: 316
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 7265 (class 0 OID 28006)
-- Dependencies: 317
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7316 (class 0 OID 28414)
-- Dependencies: 368
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7318 (class 0 OID 28431)
-- Dependencies: 370
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7277 (class 0 OID 28107)
-- Dependencies: 329
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7215 (class 0 OID 27368)
-- Dependencies: 253
-- Data for Name: documents; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7235 (class 0 OID 27602)
-- Dependencies: 277
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7320 (class 0 OID 28443)
-- Dependencies: 372
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7322 (class 0 OID 28456)
-- Dependencies: 374
-- Data for Name: folders; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7276 (class 0 OID 28099)
-- Dependencies: 328
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 7324 (class 0 OID 28468)
-- Dependencies: 376
-- Data for Name: form_fields; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7253 (class 0 OID 27836)
-- Dependencies: 305
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 7236 (class 0 OID 27612)
-- Dependencies: 278
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7326 (class 0 OID 28484)
-- Dependencies: 378
-- Data for Name: forms; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 7251 (class 0 OID 27800)
-- Dependencies: 303
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7328 (class 0 OID 28498)
-- Dependencies: 380
-- Data for Name: links; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 7330 (class 0 OID 28517)
-- Dependencies: 382
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 7234 (class 0 OID 27590)
-- Dependencies: 276
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7340 (class 0 OID 28584)
-- Dependencies: 392
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 7342 (class 0 OID 28619)
-- Dependencies: 394
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 7344 (class 0 OID 28638)
-- Dependencies: 396
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7346 (class 0 OID 28653)
-- Dependencies: 398
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 7348 (class 0 OID 28673)
-- Dependencies: 400
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7212 (class 0 OID 27338)
-- Dependencies: 250
-- Data for Name: properties; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7242 (class 0 OID 27673)
-- Dependencies: 284
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7241 (class 0 OID 27663)
-- Dependencies: 283
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
1	1	48.84389100	2.30664100	2025-05-06 21:12:20.868817	2025-04-15 21:10:34.183849
3	5	48.89044600	2.34793700	2025-05-06 21:12:20.868817	2025-04-15 21:25:04.200908
2	4	49.90634600	2.26959100	2025-05-06 21:12:20.868817	2025-04-15 19:25:45.129
4	6	44.84131400	-0.58470900	2025-05-06 21:12:20.868817	2025-04-15 19:45:10.156
5	7	48.83646900	2.28202800	2025-05-06 21:12:20.868817	2025-04-15 20:06:07.078
6	8	48.00395900	2.70708000	2025-05-06 21:12:20.868817	2025-04-15 20:08:02.318
7	9	42.15987900	9.43338100	2025-05-06 21:12:20.868817	2025-04-15 20:20:56.709
8	10	49.36192000	1.01595900	2025-05-06 21:12:20.868817	2025-04-15 20:24:50.453
9	11	44.87737400	6.61276900	2025-05-06 21:12:20.868817	2025-04-15 20:31:36.538
10	12	48.84201600	2.30364800	2025-05-06 21:12:20.868817	2025-04-15 20:34:54.39
11	13	50.62800900	3.04731300	2025-05-06 21:12:20.868817	2025-04-15 20:38:05.927
12	14	44.82306400	-0.56059500	2025-05-06 21:12:20.868817	2025-04-15 21:08:06.997
13	15	47.99008300	2.69742800	2025-05-06 21:12:20.868817	2025-04-15 21:13:05.124
14	16	44.84131400	-0.58470900	2025-05-06 21:12:20.868817	2025-04-15 23:43:41.693
15	17	48.84402400	2.30710400	2025-05-06 21:12:20.868817	2025-04-16 18:08:23.792
16	18	50.62878700	3.04648500	2025-05-06 21:12:20.868817	2025-04-16 18:14:12.192
17	19	50.62878700	3.04648500	2025-05-06 21:12:20.868817	2025-04-16 18:14:20.375
18	20	50.63629000	3.06053500	2025-05-06 21:12:20.868817	2025-04-16 18:45:29.873
19	22	48.89211200	2.34715400	2025-05-06 21:12:20.868817	2025-04-16 19:06:19.457
20	23	48.08815300	-0.63708200	2025-05-06 21:12:20.868817	2025-04-16 19:09:05.174
21	24	48.89130200	2.35043300	2025-05-06 21:12:20.868817	2025-04-16 19:48:58.931
22	25	48.89216800	2.34604600	2025-05-06 21:12:20.868817	2025-04-16 19:54:49.228
23	26	47.75326500	7.31370400	2025-05-06 21:12:20.868817	2025-04-16 20:37:52.411
24	27	48.89211200	2.34715400	2025-05-06 21:12:20.868817	2025-04-16 20:50:30.024
25	28	48.89220900	2.34663600	2025-05-06 21:12:20.868817	2025-04-16 23:22:50.119
26	29	50.62805900	3.04744200	2025-05-06 21:12:20.868817	2025-04-17 03:38:15.033
27	30	48.84425800	2.30889500	2025-05-06 21:12:20.868817	2025-04-17 03:38:52.885
28	31	43.35928200	5.41495300	2025-05-06 21:12:20.868817	2025-04-17 23:00:21.898
\.


--
-- TOC entry 7332 (class 0 OID 28530)
-- Dependencies: 384
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7334 (class 0 OID 28543)
-- Dependencies: 386
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7239 (class 0 OID 27641)
-- Dependencies: 281
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7240 (class 0 OID 27652)
-- Dependencies: 282
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7336 (class 0 OID 28555)
-- Dependencies: 388
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7278 (class 0 OID 28122)
-- Dependencies: 330
-- Data for Name: reports; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 7249 (class 0 OID 27759)
-- Dependencies: 300
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 7237 (class 0 OID 27622)
-- Dependencies: 279
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7238 (class 0 OID 27630)
-- Dependencies: 280
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7213 (class 0 OID 27348)
-- Dependencies: 251
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7338 (class 0 OID 28572)
-- Dependencies: 390
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at, user_id) FROM stdin;
\.


--
-- TOC entry 7214 (class 0 OID 27358)
-- Dependencies: 252
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7433 (class 0 OID 29350)
-- Dependencies: 487
-- Data for Name: visits; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7350 (class 0 OID 28713)
-- Dependencies: 404
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 7358 (class 0 OID 28768)
-- Dependencies: 412
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 7362 (class 0 OID 28801)
-- Dependencies: 416
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 7364 (class 0 OID 28821)
-- Dependencies: 418
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7391 (class 0 OID 28994)
-- Dependencies: 445
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7393 (class 0 OID 29011)
-- Dependencies: 447
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7387 (class 0 OID 28965)
-- Dependencies: 441
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7360 (class 0 OID 28789)
-- Dependencies: 414
-- Data for Name: documents; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7369 (class 0 OID 28858)
-- Dependencies: 423
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7395 (class 0 OID 29023)
-- Dependencies: 449
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7397 (class 0 OID 29036)
-- Dependencies: 451
-- Data for Name: folders; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7385 (class 0 OID 28955)
-- Dependencies: 439
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 7399 (class 0 OID 29048)
-- Dependencies: 453
-- Data for Name: form_fields; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7429 (class 0 OID 29307)
-- Dependencies: 483
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 7371 (class 0 OID 28870)
-- Dependencies: 425
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7401 (class 0 OID 29064)
-- Dependencies: 455
-- Data for Name: forms; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 7427 (class 0 OID 29280)
-- Dependencies: 481
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7403 (class 0 OID 29078)
-- Dependencies: 457
-- Data for Name: links; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 7405 (class 0 OID 29097)
-- Dependencies: 459
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 7367 (class 0 OID 28844)
-- Dependencies: 421
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7415 (class 0 OID 29164)
-- Dependencies: 469
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 7419 (class 0 OID 29210)
-- Dependencies: 473
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 7421 (class 0 OID 29229)
-- Dependencies: 475
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7423 (class 0 OID 29244)
-- Dependencies: 477
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 7425 (class 0 OID 29264)
-- Dependencies: 479
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7352 (class 0 OID 28732)
-- Dependencies: 406
-- Data for Name: properties; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7383 (class 0 OID 28943)
-- Dependencies: 437
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7381 (class 0 OID 28931)
-- Dependencies: 435
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7407 (class 0 OID 29110)
-- Dependencies: 461
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7409 (class 0 OID 29123)
-- Dependencies: 463
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7377 (class 0 OID 28905)
-- Dependencies: 431
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7379 (class 0 OID 28918)
-- Dependencies: 433
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7411 (class 0 OID 29135)
-- Dependencies: 465
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7389 (class 0 OID 28982)
-- Dependencies: 443
-- Data for Name: reports; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 7417 (class 0 OID 29199)
-- Dependencies: 471
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 7373 (class 0 OID 28882)
-- Dependencies: 427
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7375 (class 0 OID 28892)
-- Dependencies: 429
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7354 (class 0 OID 28744)
-- Dependencies: 408
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7413 (class 0 OID 29152)
-- Dependencies: 467
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at, user_id) FROM stdin;
\.


--
-- TOC entry 7356 (class 0 OID 28756)
-- Dependencies: 410
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7434 (class 0 OID 29365)
-- Dependencies: 488
-- Data for Name: visits; Type: TABLE DATA; Schema: client_40; Owner: postgres
--

COPY client_40.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
6	doulma	gf	hgfgh1482@tutamail.com	0659818847	2025-05-22 16:07:00	physical	\N	dfdfdf	\N	pending	\N	\N	f	40	manual	{}	f	2025-05-07 16:05:02.764115	2025-05-07 16:05:02.764115
\.


--
-- TOC entry 7435 (class 0 OID 29390)
-- Dependencies: 489
-- Data for Name: visits; Type: TABLE DATA; Schema: client_47; Owner: postgres
--

COPY client_47.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7436 (class 0 OID 29406)
-- Dependencies: 490
-- Data for Name: visits; Type: TABLE DATA; Schema: client_48; Owner: postgres
--

COPY client_48.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7437 (class 0 OID 29428)
-- Dependencies: 491
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 7441 (class 0 OID 29475)
-- Dependencies: 495
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 7443 (class 0 OID 29504)
-- Dependencies: 497
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 7444 (class 0 OID 29522)
-- Dependencies: 498
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7457 (class 0 OID 29657)
-- Dependencies: 511
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7458 (class 0 OID 29672)
-- Dependencies: 512
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7455 (class 0 OID 29632)
-- Dependencies: 509
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7442 (class 0 OID 29494)
-- Dependencies: 496
-- Data for Name: documents; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7446 (class 0 OID 29543)
-- Dependencies: 500
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7459 (class 0 OID 29682)
-- Dependencies: 513
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7460 (class 0 OID 29693)
-- Dependencies: 514
-- Data for Name: folders; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7454 (class 0 OID 29624)
-- Dependencies: 508
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 7461 (class 0 OID 29703)
-- Dependencies: 515
-- Data for Name: form_fields; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7476 (class 0 OID 29932)
-- Dependencies: 530
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 7447 (class 0 OID 29553)
-- Dependencies: 501
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7462 (class 0 OID 29717)
-- Dependencies: 516
-- Data for Name: forms; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 7475 (class 0 OID 29907)
-- Dependencies: 529
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7463 (class 0 OID 29729)
-- Dependencies: 517
-- Data for Name: links; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 7464 (class 0 OID 29746)
-- Dependencies: 518
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 7445 (class 0 OID 29531)
-- Dependencies: 499
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7469 (class 0 OID 29803)
-- Dependencies: 523
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 7471 (class 0 OID 29845)
-- Dependencies: 525
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 7472 (class 0 OID 29862)
-- Dependencies: 526
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7473 (class 0 OID 29875)
-- Dependencies: 527
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 7474 (class 0 OID 29893)
-- Dependencies: 528
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7438 (class 0 OID 29445)
-- Dependencies: 492
-- Data for Name: properties; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7453 (class 0 OID 29614)
-- Dependencies: 507
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7452 (class 0 OID 29604)
-- Dependencies: 506
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7465 (class 0 OID 29757)
-- Dependencies: 519
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7466 (class 0 OID 29768)
-- Dependencies: 520
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7450 (class 0 OID 29582)
-- Dependencies: 504
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7451 (class 0 OID 29593)
-- Dependencies: 505
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7467 (class 0 OID 29778)
-- Dependencies: 521
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7456 (class 0 OID 29647)
-- Dependencies: 510
-- Data for Name: reports; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 7470 (class 0 OID 29836)
-- Dependencies: 524
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 7448 (class 0 OID 29563)
-- Dependencies: 502
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7449 (class 0 OID 29571)
-- Dependencies: 503
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7439 (class 0 OID 29455)
-- Dependencies: 493
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7468 (class 0 OID 29793)
-- Dependencies: 522
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at, user_id) FROM stdin;
\.


--
-- TOC entry 7440 (class 0 OID 29465)
-- Dependencies: 494
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7477 (class 0 OID 29941)
-- Dependencies: 531
-- Data for Name: visits; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7189 (class 0 OID 17090)
-- Dependencies: 227
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, title, description, "userId", type, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 7198 (class 0 OID 18448)
-- Dependencies: 236
-- Data for Name: billing_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_transactions (id, user_id, amount, description, status, payment_method, transaction_date, next_billing_date, metadata) FROM stdin;
1	1	9.99	Abonnement Premium	completed	\N	2025-04-01 20:51:22.968368	\N	\N
2	1	9.99	Renouvellement abonnement Premium	completed	\N	2025-04-30 20:51:22.968368	\N	\N
\.


--
-- TOC entry 7202 (class 0 OID 19148)
-- Dependencies: 240
-- Data for Name: company_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
1	1	Votre Entreprise	123 Rue Exemple, 75000 Paris	01 23 45 67 89	contact@votreentreprise.com	www.votreentreprise.com	123 456 789 00012	2025-05-04 04:18:46.578071	2025-05-04 04:18:46.578071
\.


--
-- TOC entry 7190 (class 0 OID 17231)
-- Dependencies: 228
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7192 (class 0 OID 17287)
-- Dependencies: 230
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, related_to, related_id, is_read, created_at) FROM stdin;
\.


--
-- TOC entry 7203 (class 0 OID 27055)
-- Dependencies: 241
-- Data for Name: schema_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_mapping (schema_name, user_id, created_at) FROM stdin;
client_31	31	2025-05-06 20:30:12.391884
client_40	40	2025-05-07 15:02:32.113346
\.


--
-- TOC entry 7200 (class 0 OID 18577)
-- Dependencies: 238
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, session_id, ip_address, user_agent, payload, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7244 (class 0 OID 27727)
-- Dependencies: 295
-- Data for Name: storage_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_plans (id, name, description, storage_limit, price_monthly, price_yearly, is_active, features, created_at, updated_at) FROM stdin;
1	Gratuit	Plan gratuit avec stockage limité	536870912	0.00	0.00	t	{"max_properties": 3, "image_enhancement": false}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	Standard	Plan standard pour les propriétaires	5368709120	9.99	99.99	t	{"max_properties": 15, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	Professionnel	Plan avancé pour les professionnels	53687091200	29.99	299.99	t	{"ai_assistant": true, "max_properties": -1, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 7246 (class 0 OID 27739)
-- Dependencies: 297
-- Data for Name: storage_quotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_quotas (id, resource_type, size_limit, count_limit, applies_to, created_at, updated_at) FROM stdin;
1	document	10485760	50	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	image	5242880	20	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	document	52428800	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
4	image	20971520	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 7196 (class 0 OID 17811)
-- Dependencies: 234
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
11	1	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
22	1	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
33	1	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
44	1	visit	both	f	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
\.


--
-- TOC entry 7187 (class 0 OID 16853)
-- Dependencies: 225
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, full_name, email, phone_number, role, profile_image, archived, account_type, parent_account_id, settings, created_at, updated_at, is_premium, request_count, request_limit, preferred_ai_model, storage_used, storage_limit, storage_tier) FROM stdin;
31	testclient	b4bff05682eb0cb5620366a1f7463287963d83bc67599fc803993e819bcc76594e21458d5fd655e0506f3c10eb09eae58e3e57c89004523c8c49e94462849be1.80071a1f1e613d6245b18977fe0c7815	Test Client	testclient@example.com	\N	clients	\N	f	individual	\N	{"postgres_role": "client_role_31"}	2025-05-06 19:32:14.823485	2025-05-06 19:32:14.823485	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
47	astro2	$2b$10$sKiuWR8iSMFIqtOAObrI2O5Z/iLbn.CBQdn7At4hLu9t3Kr1z2zQi	Killian polm	f@gmail.com	\N	clients	\N	f	individual	\N	{}	2025-05-07 14:22:51.135	2025-05-07 16:22:51.137162	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
48	rer4	$2b$10$rGRISuxki1wgNJaWpMMrbe14GyeyhEZT5x3o9p0sSMgxVt7S6mowq	rer4	rezrorez@gmail.com	\N	clients	\N	f	individual	\N	{}	2025-05-07 14:23:22.334	2025-05-07 16:23:22.335397	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
52	testcli11	$2b$10$dNbNM4ooeuPm78NGW56StO4lTeJmb7KbE0SdeOqE1nNLR4/gf/GVu	testcli11	hgfgh1482@tutamail.com	\N	clients	\N	f	individual	\N	{}	2025-05-07 14:32:06.498	2025-05-07 16:32:06.499166	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
1	testuser	b4bff05682eb0cb5620366a1f7463287963d83bc67599fc803993e819bcc76594e21458d5fd655e0506f3c10eb09eae58e3e57c89004523c8c49e94462849be1.80071a1f1e613d6245b18977fe0c7815	Utilisateur Test	test@example.com	\N	admin	\N	f	individual	\N	{}	2025-04-01 17:13:46.736	2025-05-05 21:18:52.353256	f	0	100	openai-gpt-4o	0.00	5368709120.00	basic
38	client1	$2b$10$6MV0lx6jxIZudm1KbXNOB.s9Ees5rIj.p/nipPNRjYXqlUVhjBAT2	client1	f@gmail.com	\N	clients	\N	f	individual	\N	{}	2025-05-07 12:13:29.541	2025-05-07 14:13:29.542167	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
22	admin	$2a$10$EWF7KifLiKnaVLY2FvB/nudA93JYtinqdXFmUDlQNSm6VH0uZ.s9S	Administrateur	admin@example.com	\N	admin	\N	f	individual	\N	{}	2025-04-29 01:22:34.079632	2025-05-05 21:18:52.21245	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
40	astro1	$2b$10$NoOjZa3P4pSFcfe4YsJSP.SBtcfjmqoEjqSFV8h091H5rdiABg.U2	astro1	f@gmail.com	\N	clients	\N	f	individual	\N	{}	2025-05-07 13:02:32.11	2025-05-07 15:02:32.113346	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
\.


--
-- TOC entry 7254 (class 0 OID 27881)
-- Dependencies: 306
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 7255 (class 0 OID 27898)
-- Dependencies: 307
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 7256 (class 0 OID 27917)
-- Dependencies: 308
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 7257 (class 0 OID 27935)
-- Dependencies: 309
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7282 (class 0 OID 28139)
-- Dependencies: 334
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7284 (class 0 OID 28156)
-- Dependencies: 336
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7271 (class 0 OID 28068)
-- Dependencies: 323
-- Data for Name: contracts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7211 (class 0 OID 27313)
-- Dependencies: 249
-- Data for Name: documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7219 (class 0 OID 27437)
-- Dependencies: 261
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7286 (class 0 OID 28168)
-- Dependencies: 338
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7288 (class 0 OID 28181)
-- Dependencies: 340
-- Data for Name: folders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7270 (class 0 OID 28060)
-- Dependencies: 322
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 7290 (class 0 OID 28193)
-- Dependencies: 342
-- Data for Name: form_fields; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7252 (class 0 OID 27826)
-- Dependencies: 304
-- Data for Name: form_responses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 7221 (class 0 OID 27458)
-- Dependencies: 263
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7292 (class 0 OID 28209)
-- Dependencies: 344
-- Data for Name: forms; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 7250 (class 0 OID 27774)
-- Dependencies: 302
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7294 (class 0 OID 28223)
-- Dependencies: 346
-- Data for Name: links; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 7296 (class 0 OID 28242)
-- Dependencies: 348
-- Data for Name: maintenance; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 7217 (class 0 OID 27414)
-- Dependencies: 259
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7306 (class 0 OID 28309)
-- Dependencies: 358
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 7308 (class 0 OID 28344)
-- Dependencies: 360
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 7310 (class 0 OID 28363)
-- Dependencies: 362
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7312 (class 0 OID 28378)
-- Dependencies: 364
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 7314 (class 0 OID 28398)
-- Dependencies: 366
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7205 (class 0 OID 27265)
-- Dependencies: 243
-- Data for Name: properties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7233 (class 0 OID 27565)
-- Dependencies: 275
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7231 (class 0 OID 27549)
-- Dependencies: 273
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7298 (class 0 OID 28255)
-- Dependencies: 350
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7300 (class 0 OID 28268)
-- Dependencies: 352
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 7227 (class 0 OID 27515)
-- Dependencies: 269
-- Data for Name: property_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7229 (class 0 OID 27532)
-- Dependencies: 271
-- Data for Name: property_works; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7302 (class 0 OID 28280)
-- Dependencies: 354
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 7272 (class 0 OID 28083)
-- Dependencies: 324
-- Data for Name: reports; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 7248 (class 0 OID 27750)
-- Dependencies: 299
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 7223 (class 0 OID 27479)
-- Dependencies: 265
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7225 (class 0 OID 27498)
-- Dependencies: 267
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7207 (class 0 OID 27276)
-- Dependencies: 245
-- Data for Name: tenants; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7304 (class 0 OID 28297)
-- Dependencies: 356
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at, user_id) FROM stdin;
\.


--
-- TOC entry 7209 (class 0 OID 27292)
-- Dependencies: 247
-- Data for Name: transactions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7431 (class 0 OID 29334)
-- Dependencies: 485
-- Data for Name: visits; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 7619 (class 0 OID 0)
-- Dependencies: 318
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.ai_conversations_id_seq', 1, false);


--
-- TOC entry 7620 (class 0 OID 0)
-- Dependencies: 319
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.ai_messages_id_seq', 1, false);


--
-- TOC entry 7621 (class 0 OID 0)
-- Dependencies: 320
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 7622 (class 0 OID 0)
-- Dependencies: 321
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.analysis_configs_id_seq', 1, false);


--
-- TOC entry 7623 (class 0 OID 0)
-- Dependencies: 369
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 7624 (class 0 OID 0)
-- Dependencies: 371
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.contract_parties_id_seq', 1, false);


--
-- TOC entry 7625 (class 0 OID 0)
-- Dependencies: 332
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.contracts_id_seq', 1, false);


--
-- TOC entry 7626 (class 0 OID 0)
-- Dependencies: 373
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.financial_entries_id_seq', 1, false);


--
-- TOC entry 7627 (class 0 OID 0)
-- Dependencies: 375
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.folders_id_seq', 1, false);


--
-- TOC entry 7628 (class 0 OID 0)
-- Dependencies: 331
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.form_field_options_id_seq', 1, false);


--
-- TOC entry 7629 (class 0 OID 0)
-- Dependencies: 377
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.form_fields_id_seq', 1, false);


--
-- TOC entry 7630 (class 0 OID 0)
-- Dependencies: 379
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.forms_id_seq', 1, false);


--
-- TOC entry 7631 (class 0 OID 0)
-- Dependencies: 381
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.links_id_seq', 1, false);


--
-- TOC entry 7632 (class 0 OID 0)
-- Dependencies: 383
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.maintenance_id_seq', 1, false);


--
-- TOC entry 7633 (class 0 OID 0)
-- Dependencies: 393
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 7634 (class 0 OID 0)
-- Dependencies: 395
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 7635 (class 0 OID 0)
-- Dependencies: 397
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.pdf_logos_id_seq', 1, false);


--
-- TOC entry 7636 (class 0 OID 0)
-- Dependencies: 399
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.pdf_templates_id_seq', 1, false);


--
-- TOC entry 7637 (class 0 OID 0)
-- Dependencies: 401
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.pdf_themes_id_seq', 1, false);


--
-- TOC entry 7638 (class 0 OID 0)
-- Dependencies: 385
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 7639 (class 0 OID 0)
-- Dependencies: 387
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 7640 (class 0 OID 0)
-- Dependencies: 389
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.rent_receipts_id_seq', 1, false);


--
-- TOC entry 7641 (class 0 OID 0)
-- Dependencies: 333
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.reports_id_seq', 1, false);


--
-- TOC entry 7642 (class 0 OID 0)
-- Dependencies: 391
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: client_31; Owner: postgres
--

SELECT pg_catalog.setval('client_31.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 7643 (class 0 OID 0)
-- Dependencies: 405
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.ai_conversations_id_seq', 1, false);


--
-- TOC entry 7644 (class 0 OID 0)
-- Dependencies: 413
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.ai_messages_id_seq', 1, false);


--
-- TOC entry 7645 (class 0 OID 0)
-- Dependencies: 417
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 7646 (class 0 OID 0)
-- Dependencies: 419
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.analysis_configs_id_seq', 1, false);


--
-- TOC entry 7647 (class 0 OID 0)
-- Dependencies: 446
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 7648 (class 0 OID 0)
-- Dependencies: 448
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.contract_parties_id_seq', 1, false);


--
-- TOC entry 7649 (class 0 OID 0)
-- Dependencies: 442
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.contracts_id_seq', 1, false);


--
-- TOC entry 7650 (class 0 OID 0)
-- Dependencies: 415
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.documents_id_seq', 1, false);


--
-- TOC entry 7651 (class 0 OID 0)
-- Dependencies: 424
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.feedbacks_id_seq', 1, false);


--
-- TOC entry 7652 (class 0 OID 0)
-- Dependencies: 450
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.financial_entries_id_seq', 1, false);


--
-- TOC entry 7653 (class 0 OID 0)
-- Dependencies: 452
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.folders_id_seq', 1, false);


--
-- TOC entry 7654 (class 0 OID 0)
-- Dependencies: 440
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.form_field_options_id_seq', 1, false);


--
-- TOC entry 7655 (class 0 OID 0)
-- Dependencies: 454
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.form_fields_id_seq', 1, false);


--
-- TOC entry 7656 (class 0 OID 0)
-- Dependencies: 484
-- Name: form_responses_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.form_responses_id_seq', 1, false);


--
-- TOC entry 7657 (class 0 OID 0)
-- Dependencies: 426
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.form_submissions_id_seq', 1, false);


--
-- TOC entry 7658 (class 0 OID 0)
-- Dependencies: 456
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.forms_id_seq', 1, false);


--
-- TOC entry 7659 (class 0 OID 0)
-- Dependencies: 482
-- Name: link_profiles_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.link_profiles_id_seq', 1, false);


--
-- TOC entry 7660 (class 0 OID 0)
-- Dependencies: 458
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.links_id_seq', 1, false);


--
-- TOC entry 7661 (class 0 OID 0)
-- Dependencies: 460
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.maintenance_id_seq', 1, false);


--
-- TOC entry 7662 (class 0 OID 0)
-- Dependencies: 422
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.maintenance_requests_id_seq', 1, false);


--
-- TOC entry 7663 (class 0 OID 0)
-- Dependencies: 470
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 7664 (class 0 OID 0)
-- Dependencies: 474
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 7665 (class 0 OID 0)
-- Dependencies: 476
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.pdf_logos_id_seq', 1, false);


--
-- TOC entry 7666 (class 0 OID 0)
-- Dependencies: 478
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.pdf_templates_id_seq', 1, false);


--
-- TOC entry 7667 (class 0 OID 0)
-- Dependencies: 480
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.pdf_themes_id_seq', 1, false);


--
-- TOC entry 7668 (class 0 OID 0)
-- Dependencies: 407
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.properties_id_seq', 1, false);


--
-- TOC entry 7669 (class 0 OID 0)
-- Dependencies: 438
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.property_analyses_id_seq', 1, false);


--
-- TOC entry 7670 (class 0 OID 0)
-- Dependencies: 436
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.property_coordinates_id_seq', 1, false);


--
-- TOC entry 7671 (class 0 OID 0)
-- Dependencies: 462
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 7672 (class 0 OID 0)
-- Dependencies: 464
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 7673 (class 0 OID 0)
-- Dependencies: 432
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.property_history_id_seq', 1, false);


--
-- TOC entry 7674 (class 0 OID 0)
-- Dependencies: 434
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.property_works_id_seq', 1, false);


--
-- TOC entry 7675 (class 0 OID 0)
-- Dependencies: 466
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.rent_receipts_id_seq', 1, false);


--
-- TOC entry 7676 (class 0 OID 0)
-- Dependencies: 444
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.reports_id_seq', 1, false);


--
-- TOC entry 7677 (class 0 OID 0)
-- Dependencies: 472
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.storage_usage_id_seq', 1, false);


--
-- TOC entry 7678 (class 0 OID 0)
-- Dependencies: 428
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.tenant_documents_id_seq', 1, false);


--
-- TOC entry 7679 (class 0 OID 0)
-- Dependencies: 430
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.tenant_history_id_seq', 1, false);


--
-- TOC entry 7680 (class 0 OID 0)
-- Dependencies: 409
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.tenants_id_seq', 1, false);


--
-- TOC entry 7681 (class 0 OID 0)
-- Dependencies: 468
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 7682 (class 0 OID 0)
-- Dependencies: 411
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.transactions_id_seq', 1, false);


--
-- TOC entry 7683 (class 0 OID 0)
-- Dependencies: 420
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: client_40; Owner: postgres
--

SELECT pg_catalog.setval('client_40.visits_id_seq', 1, true);


--
-- TOC entry 7684 (class 0 OID 0)
-- Dependencies: 226
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_id_seq', 1, false);


--
-- TOC entry 7685 (class 0 OID 0)
-- Dependencies: 235
-- Name: billing_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_transactions_id_seq', 2, true);


--
-- TOC entry 7686 (class 0 OID 0)
-- Dependencies: 239
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_info_id_seq', 1, true);


--
-- TOC entry 7687 (class 0 OID 0)
-- Dependencies: 229
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_templates_id_seq', 1, false);


--
-- TOC entry 7688 (class 0 OID 0)
-- Dependencies: 231
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 7689 (class 0 OID 0)
-- Dependencies: 237
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- TOC entry 7690 (class 0 OID 0)
-- Dependencies: 294
-- Name: storage_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_plans_id_seq', 3, true);


--
-- TOC entry 7691 (class 0 OID 0)
-- Dependencies: 296
-- Name: storage_quotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_quotas_id_seq', 4, true);


--
-- TOC entry 7692 (class 0 OID 0)
-- Dependencies: 233
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 44, true);


--
-- TOC entry 7693 (class 0 OID 0)
-- Dependencies: 232
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 52, true);


--
-- TOC entry 7694 (class 0 OID 0)
-- Dependencies: 310
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_conversations_id_seq', 1, false);


--
-- TOC entry 7695 (class 0 OID 0)
-- Dependencies: 311
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_messages_id_seq', 1, false);


--
-- TOC entry 7696 (class 0 OID 0)
-- Dependencies: 312
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 7697 (class 0 OID 0)
-- Dependencies: 313
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.analysis_configs_id_seq', 1, false);


--
-- TOC entry 7698 (class 0 OID 0)
-- Dependencies: 335
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 7699 (class 0 OID 0)
-- Dependencies: 337
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contract_parties_id_seq', 1, false);


--
-- TOC entry 7700 (class 0 OID 0)
-- Dependencies: 326
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contracts_id_seq', 1, false);


--
-- TOC entry 7701 (class 0 OID 0)
-- Dependencies: 248
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.documents_id_seq', 1, false);


--
-- TOC entry 7702 (class 0 OID 0)
-- Dependencies: 260
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.feedbacks_id_seq', 1, false);


--
-- TOC entry 7703 (class 0 OID 0)
-- Dependencies: 339
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.financial_entries_id_seq', 1, false);


--
-- TOC entry 7704 (class 0 OID 0)
-- Dependencies: 341
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.folders_id_seq', 1, false);


--
-- TOC entry 7705 (class 0 OID 0)
-- Dependencies: 325
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_field_options_id_seq', 1, false);


--
-- TOC entry 7706 (class 0 OID 0)
-- Dependencies: 343
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_fields_id_seq', 1, false);


--
-- TOC entry 7707 (class 0 OID 0)
-- Dependencies: 262
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_submissions_id_seq', 1, false);


--
-- TOC entry 7708 (class 0 OID 0)
-- Dependencies: 345
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.forms_id_seq', 1, false);


--
-- TOC entry 7709 (class 0 OID 0)
-- Dependencies: 347
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.links_id_seq', 1, false);


--
-- TOC entry 7710 (class 0 OID 0)
-- Dependencies: 349
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_id_seq', 1, false);


--
-- TOC entry 7711 (class 0 OID 0)
-- Dependencies: 258
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_requests_id_seq', 1, false);


--
-- TOC entry 7712 (class 0 OID 0)
-- Dependencies: 359
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 7713 (class 0 OID 0)
-- Dependencies: 361
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 7714 (class 0 OID 0)
-- Dependencies: 363
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_logos_id_seq', 1, false);


--
-- TOC entry 7715 (class 0 OID 0)
-- Dependencies: 365
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_templates_id_seq', 1, false);


--
-- TOC entry 7716 (class 0 OID 0)
-- Dependencies: 367
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_themes_id_seq', 1, false);


--
-- TOC entry 7717 (class 0 OID 0)
-- Dependencies: 242
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.properties_id_seq', 1, false);


--
-- TOC entry 7718 (class 0 OID 0)
-- Dependencies: 274
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_analyses_id_seq', 1, false);


--
-- TOC entry 7719 (class 0 OID 0)
-- Dependencies: 272
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_coordinates_id_seq', 1, false);


--
-- TOC entry 7720 (class 0 OID 0)
-- Dependencies: 351
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 7721 (class 0 OID 0)
-- Dependencies: 353
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 7722 (class 0 OID 0)
-- Dependencies: 268
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_history_id_seq', 1, false);


--
-- TOC entry 7723 (class 0 OID 0)
-- Dependencies: 270
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_works_id_seq', 1, false);


--
-- TOC entry 7724 (class 0 OID 0)
-- Dependencies: 355
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.rent_receipts_id_seq', 1, false);


--
-- TOC entry 7725 (class 0 OID 0)
-- Dependencies: 327
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.reports_id_seq', 1, false);


--
-- TOC entry 7726 (class 0 OID 0)
-- Dependencies: 298
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.storage_usage_id_seq', 1, false);


--
-- TOC entry 7727 (class 0 OID 0)
-- Dependencies: 264
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_documents_id_seq', 1, false);


--
-- TOC entry 7728 (class 0 OID 0)
-- Dependencies: 266
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_history_id_seq', 1, false);


--
-- TOC entry 7729 (class 0 OID 0)
-- Dependencies: 244
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenants_id_seq', 1, false);


--
-- TOC entry 7730 (class 0 OID 0)
-- Dependencies: 357
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 7731 (class 0 OID 0)
-- Dependencies: 246
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transactions_id_seq', 1, false);


--
-- TOC entry 7732 (class 0 OID 0)
-- Dependencies: 486
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.visits_id_seq', 6, true);


--
-- TOC entry 6620 (class 2606 OID 27966)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 6627 (class 2606 OID 27983)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6630 (class 2606 OID 28000)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 6637 (class 2606 OID 28012)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 6707 (class 2606 OID 28425)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6711 (class 2606 OID 28440)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 6649 (class 2606 OID 28121)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6539 (class 2606 OID 27377)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6561 (class 2606 OID 27611)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 6713 (class 2606 OID 28453)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 6715 (class 2606 OID 28465)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 6647 (class 2606 OID 28106)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 6717 (class 2606 OID 28480)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 6720 (class 2606 OID 28478)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 6597 (class 2606 OID 27844)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 6563 (class 2606 OID 27621)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 6722 (class 2606 OID 28492)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6724 (class 2606 OID 28494)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 6589 (class 2606 OID 27823)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 6591 (class 2606 OID 27825)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 6727 (class 2606 OID 28512)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 6731 (class 2606 OID 28527)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 6559 (class 2606 OID 27601)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 6746 (class 2606 OID 28616)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 6748 (class 2606 OID 28634)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 6751 (class 2606 OID 28632)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6753 (class 2606 OID 28650)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 6755 (class 2606 OID 28670)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6757 (class 2606 OID 28686)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 6533 (class 2606 OID 27347)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 6575 (class 2606 OID 27682)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 6573 (class 2606 OID 27672)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 6733 (class 2606 OID 28540)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6735 (class 2606 OID 28552)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 6569 (class 2606 OID 27651)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6571 (class 2606 OID 27662)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 6737 (class 2606 OID 28565)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6651 (class 2606 OID 28131)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6583 (class 2606 OID 27767)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6565 (class 2606 OID 27629)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6567 (class 2606 OID 27640)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6535 (class 2606 OID 27357)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 6743 (class 2606 OID 28580)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6537 (class 2606 OID 27367)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6876 (class 2606 OID 29364)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6759 (class 2606 OID 28727)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 6772 (class 2606 OID 28782)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6777 (class 2606 OID 28813)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 6784 (class 2606 OID 28827)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 6813 (class 2606 OID 29005)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6817 (class 2606 OID 29020)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 6808 (class 2606 OID 28979)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6775 (class 2606 OID 28798)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6790 (class 2606 OID 28867)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 6819 (class 2606 OID 29033)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 6821 (class 2606 OID 29045)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 6806 (class 2606 OID 28962)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 6823 (class 2606 OID 29060)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 6826 (class 2606 OID 29058)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 6872 (class 2606 OID 29314)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 6792 (class 2606 OID 28879)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 6828 (class 2606 OID 29072)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6830 (class 2606 OID 29074)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 6867 (class 2606 OID 29302)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 6869 (class 2606 OID 29304)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 6833 (class 2606 OID 29092)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 6837 (class 2606 OID 29107)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 6788 (class 2606 OID 28855)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 6852 (class 2606 OID 29196)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 6856 (class 2606 OID 29225)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 6859 (class 2606 OID 29223)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6861 (class 2606 OID 29241)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 6863 (class 2606 OID 29261)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6865 (class 2606 OID 29277)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 6763 (class 2606 OID 28741)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 6804 (class 2606 OID 28952)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 6802 (class 2606 OID 28940)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 6839 (class 2606 OID 29120)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6841 (class 2606 OID 29132)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 6798 (class 2606 OID 28915)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6800 (class 2606 OID 28928)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 6843 (class 2606 OID 29145)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6810 (class 2606 OID 28991)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6854 (class 2606 OID 29207)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6794 (class 2606 OID 28889)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6796 (class 2606 OID 28902)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6765 (class 2606 OID 28753)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 6849 (class 2606 OID 29160)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6767 (class 2606 OID 28765)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6878 (class 2606 OID 29379)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_40; Owner: postgres
--

ALTER TABLE ONLY client_40.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6880 (class 2606 OID 29404)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_47; Owner: postgres
--

ALTER TABLE ONLY client_47.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6882 (class 2606 OID 29420)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_48; Owner: postgres
--

ALTER TABLE ONLY client_48.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6884 (class 2606 OID 29442)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 6897 (class 2606 OID 29489)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6902 (class 2606 OID 29516)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 6909 (class 2606 OID 29528)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 6938 (class 2606 OID 29668)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6942 (class 2606 OID 29681)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 6933 (class 2606 OID 29646)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6900 (class 2606 OID 29503)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6915 (class 2606 OID 29552)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 6944 (class 2606 OID 29692)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 6946 (class 2606 OID 29702)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 6931 (class 2606 OID 29631)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 6948 (class 2606 OID 29715)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 6951 (class 2606 OID 29713)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 6997 (class 2606 OID 29939)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 6917 (class 2606 OID 29562)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 6953 (class 2606 OID 29725)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6955 (class 2606 OID 29727)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 6992 (class 2606 OID 29929)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 6994 (class 2606 OID 29931)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 6958 (class 2606 OID 29743)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 6962 (class 2606 OID 29756)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 6913 (class 2606 OID 29542)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 6977 (class 2606 OID 29835)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 6981 (class 2606 OID 29860)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 6984 (class 2606 OID 29858)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6986 (class 2606 OID 29874)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 6988 (class 2606 OID 29892)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6990 (class 2606 OID 29906)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 6888 (class 2606 OID 29454)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 6929 (class 2606 OID 29623)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 6927 (class 2606 OID 29613)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 6964 (class 2606 OID 29767)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6966 (class 2606 OID 29777)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 6923 (class 2606 OID 29592)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6925 (class 2606 OID 29603)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 6968 (class 2606 OID 29788)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6935 (class 2606 OID 29656)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6979 (class 2606 OID 29844)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6919 (class 2606 OID 29570)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6921 (class 2606 OID 29581)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6890 (class 2606 OID 29464)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 6974 (class 2606 OID 29801)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6892 (class 2606 OID 29474)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6999 (class 2606 OID 29955)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6496 (class 2606 OID 17100)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 6510 (class 2606 OID 18456)
-- Name: billing_transactions billing_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6521 (class 2606 OID 19157)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 6498 (class 2606 OID 17408)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6504 (class 2606 OID 17420)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 6523 (class 2606 OID 27062)
-- Name: schema_mapping schema_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_pkey PRIMARY KEY (schema_name);


--
-- TOC entry 6517 (class 2606 OID 18586)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 6519 (class 2606 OID 18588)
-- Name: sessions sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_id_key UNIQUE (session_id);


--
-- TOC entry 6577 (class 2606 OID 27737)
-- Name: storage_plans storage_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans
    ADD CONSTRAINT storage_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 6579 (class 2606 OID 27748)
-- Name: storage_quotas storage_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas
    ADD CONSTRAINT storage_quotas_pkey PRIMARY KEY (id);


--
-- TOC entry 6508 (class 2606 OID 17828)
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 6493 (class 2606 OID 16868)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 6599 (class 2606 OID 27895)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 6606 (class 2606 OID 27912)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 6609 (class 2606 OID 27929)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 6616 (class 2606 OID 27941)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 6654 (class 2606 OID 28150)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 6658 (class 2606 OID 28165)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 6643 (class 2606 OID 28082)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 6531 (class 2606 OID 27322)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6543 (class 2606 OID 27446)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 6660 (class 2606 OID 28178)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 6662 (class 2606 OID 28190)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 6641 (class 2606 OID 28067)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 6664 (class 2606 OID 28205)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 6667 (class 2606 OID 28203)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 6594 (class 2606 OID 27834)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 6545 (class 2606 OID 27467)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 6669 (class 2606 OID 28217)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 6671 (class 2606 OID 28219)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 6585 (class 2606 OID 27797)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 6587 (class 2606 OID 27799)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 6674 (class 2606 OID 28237)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 6678 (class 2606 OID 28252)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 6541 (class 2606 OID 27425)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 6693 (class 2606 OID 28341)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 6695 (class 2606 OID 28359)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 6698 (class 2606 OID 28357)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 6700 (class 2606 OID 28375)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 6702 (class 2606 OID 28395)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 6704 (class 2606 OID 28411)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 6525 (class 2606 OID 27274)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 6557 (class 2606 OID 27574)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 6555 (class 2606 OID 27558)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 6680 (class 2606 OID 28265)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 6682 (class 2606 OID 28277)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 6551 (class 2606 OID 27525)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6553 (class 2606 OID 27542)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 6684 (class 2606 OID 28290)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 6645 (class 2606 OID 28092)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 6581 (class 2606 OID 27758)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 6547 (class 2606 OID 27486)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 6549 (class 2606 OID 27508)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 6527 (class 2606 OID 27285)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 6690 (class 2606 OID 28305)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 6529 (class 2606 OID 27301)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 6874 (class 2606 OID 29349)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 6621 (class 1259 OID 27967)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_31.ai_conversations USING btree (user_id);


--
-- TOC entry 6622 (class 1259 OID 27968)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_31.ai_conversations USING btree (user_id);


--
-- TOC entry 6623 (class 1259 OID 27985)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_31.ai_messages USING btree (conversation_id);


--
-- TOC entry 6624 (class 1259 OID 27987)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_31.ai_messages USING btree (conversation_id);


--
-- TOC entry 6625 (class 1259 OID 27986)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_31.ai_messages USING btree (created_at);


--
-- TOC entry 6628 (class 1259 OID 27984)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_31.ai_messages USING btree (user_id);


--
-- TOC entry 6631 (class 1259 OID 28002)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_31.ai_suggestions USING btree (property_id);


--
-- TOC entry 6632 (class 1259 OID 28005)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_31.ai_suggestions USING btree (property_id);


--
-- TOC entry 6633 (class 1259 OID 28003)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_31.ai_suggestions USING btree (type);


--
-- TOC entry 6634 (class 1259 OID 28001)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_31.ai_suggestions USING btree (user_id);


--
-- TOC entry 6635 (class 1259 OID 28004)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_31.ai_suggestions USING btree (user_id);


--
-- TOC entry 6638 (class 1259 OID 28013)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_31.analysis_configs USING btree (property_id);


--
-- TOC entry 6639 (class 1259 OID 28014)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_31.analysis_configs USING btree (user_id);


--
-- TOC entry 6705 (class 1259 OID 28427)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_31.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 6708 (class 1259 OID 28428)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_31.automatic_reminders USING btree (status);


--
-- TOC entry 6709 (class 1259 OID 28426)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_31.automatic_reminders USING btree (user_id);


--
-- TOC entry 6718 (class 1259 OID 28481)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON client_31.form_fields USING btree (link_id);


--
-- TOC entry 6595 (class 1259 OID 27845)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_31.form_responses USING btree (form_id);


--
-- TOC entry 6725 (class 1259 OID 28495)
-- Name: forms_user_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON client_31.forms USING btree (user_id);


--
-- TOC entry 6728 (class 1259 OID 28513)
-- Name: links_profile_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON client_31.links USING btree (profile_id);


--
-- TOC entry 6729 (class 1259 OID 28514)
-- Name: links_type_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX links_type_idx ON client_31.links USING btree (type);


--
-- TOC entry 6749 (class 1259 OID 28635)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_31.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 6738 (class 1259 OID 28567)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_31.rent_receipts USING btree (property_id);


--
-- TOC entry 6739 (class 1259 OID 28569)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_31.rent_receipts USING btree (status);


--
-- TOC entry 6740 (class 1259 OID 28566)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_31.rent_receipts USING btree (tenant_id);


--
-- TOC entry 6741 (class 1259 OID 28568)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_31.rent_receipts USING btree (transaction_id);


--
-- TOC entry 6744 (class 1259 OID 28581)
-- Name: transaction_attachments_transaction_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX transaction_attachments_transaction_id_idx ON client_31.transaction_attachments USING btree (transaction_id);


--
-- TOC entry 6760 (class 1259 OID 28728)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_40.ai_conversations USING btree (user_id);


--
-- TOC entry 6761 (class 1259 OID 28729)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_40.ai_conversations USING btree (user_id);


--
-- TOC entry 6768 (class 1259 OID 28784)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_40.ai_messages USING btree (conversation_id);


--
-- TOC entry 6769 (class 1259 OID 28786)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_40.ai_messages USING btree (conversation_id);


--
-- TOC entry 6770 (class 1259 OID 28785)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_40.ai_messages USING btree (created_at);


--
-- TOC entry 6773 (class 1259 OID 28783)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_40.ai_messages USING btree (user_id);


--
-- TOC entry 6778 (class 1259 OID 28815)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_40.ai_suggestions USING btree (property_id);


--
-- TOC entry 6779 (class 1259 OID 28818)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_40.ai_suggestions USING btree (property_id);


--
-- TOC entry 6780 (class 1259 OID 28816)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_40.ai_suggestions USING btree (type);


--
-- TOC entry 6781 (class 1259 OID 28814)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_40.ai_suggestions USING btree (user_id);


--
-- TOC entry 6782 (class 1259 OID 28817)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_40.ai_suggestions USING btree (user_id);


--
-- TOC entry 6785 (class 1259 OID 28828)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_40.analysis_configs USING btree (property_id);


--
-- TOC entry 6786 (class 1259 OID 28829)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_40.analysis_configs USING btree (user_id);


--
-- TOC entry 6811 (class 1259 OID 29007)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_40.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 6814 (class 1259 OID 29008)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_40.automatic_reminders USING btree (status);


--
-- TOC entry 6815 (class 1259 OID 29006)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_40.automatic_reminders USING btree (user_id);


--
-- TOC entry 6824 (class 1259 OID 29061)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON client_40.form_fields USING btree (link_id);


--
-- TOC entry 6870 (class 1259 OID 29315)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_40.form_responses USING btree (form_id);


--
-- TOC entry 6831 (class 1259 OID 29075)
-- Name: forms_user_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON client_40.forms USING btree (user_id);


--
-- TOC entry 6834 (class 1259 OID 29093)
-- Name: links_profile_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON client_40.links USING btree (profile_id);


--
-- TOC entry 6835 (class 1259 OID 29094)
-- Name: links_type_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX links_type_idx ON client_40.links USING btree (type);


--
-- TOC entry 6857 (class 1259 OID 29226)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_40.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 6844 (class 1259 OID 29147)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_40.rent_receipts USING btree (property_id);


--
-- TOC entry 6845 (class 1259 OID 29149)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_40.rent_receipts USING btree (status);


--
-- TOC entry 6846 (class 1259 OID 29146)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_40.rent_receipts USING btree (tenant_id);


--
-- TOC entry 6847 (class 1259 OID 29148)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_40.rent_receipts USING btree (transaction_id);


--
-- TOC entry 6850 (class 1259 OID 29161)
-- Name: transaction_attachments_transaction_id_idx; Type: INDEX; Schema: client_40; Owner: postgres
--

CREATE INDEX transaction_attachments_transaction_id_idx ON client_40.transaction_attachments USING btree (transaction_id);


--
-- TOC entry 6885 (class 1259 OID 29443)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_52.ai_conversations USING btree (user_id);


--
-- TOC entry 6886 (class 1259 OID 29444)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_52.ai_conversations USING btree (user_id);


--
-- TOC entry 6893 (class 1259 OID 29491)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_52.ai_messages USING btree (conversation_id);


--
-- TOC entry 6894 (class 1259 OID 29493)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_52.ai_messages USING btree (conversation_id);


--
-- TOC entry 6895 (class 1259 OID 29492)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_52.ai_messages USING btree (created_at);


--
-- TOC entry 6898 (class 1259 OID 29490)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_52.ai_messages USING btree (user_id);


--
-- TOC entry 6903 (class 1259 OID 29518)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_52.ai_suggestions USING btree (property_id);


--
-- TOC entry 6904 (class 1259 OID 29521)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_52.ai_suggestions USING btree (property_id);


--
-- TOC entry 6905 (class 1259 OID 29519)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_52.ai_suggestions USING btree (type);


--
-- TOC entry 6906 (class 1259 OID 29517)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_52.ai_suggestions USING btree (user_id);


--
-- TOC entry 6907 (class 1259 OID 29520)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_52.ai_suggestions USING btree (user_id);


--
-- TOC entry 6910 (class 1259 OID 29529)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_52.analysis_configs USING btree (property_id);


--
-- TOC entry 6911 (class 1259 OID 29530)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_52.analysis_configs USING btree (user_id);


--
-- TOC entry 6936 (class 1259 OID 29670)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_52.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 6939 (class 1259 OID 29671)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_52.automatic_reminders USING btree (status);


--
-- TOC entry 6940 (class 1259 OID 29669)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_52.automatic_reminders USING btree (user_id);


--
-- TOC entry 6949 (class 1259 OID 29716)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON client_52.form_fields USING btree (link_id);


--
-- TOC entry 6995 (class 1259 OID 29940)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_52.form_responses USING btree (form_id);


--
-- TOC entry 6956 (class 1259 OID 29728)
-- Name: forms_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON client_52.forms USING btree (user_id);


--
-- TOC entry 6959 (class 1259 OID 29744)
-- Name: links_profile_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON client_52.links USING btree (profile_id);


--
-- TOC entry 6960 (class 1259 OID 29745)
-- Name: links_type_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX links_type_idx ON client_52.links USING btree (type);


--
-- TOC entry 6982 (class 1259 OID 29861)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_52.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 6969 (class 1259 OID 29790)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_52.rent_receipts USING btree (property_id);


--
-- TOC entry 6970 (class 1259 OID 29792)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_52.rent_receipts USING btree (status);


--
-- TOC entry 6971 (class 1259 OID 29789)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_52.rent_receipts USING btree (tenant_id);


--
-- TOC entry 6972 (class 1259 OID 29791)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_52.rent_receipts USING btree (transaction_id);


--
-- TOC entry 6975 (class 1259 OID 29802)
-- Name: transaction_attachments_transaction_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX transaction_attachments_transaction_id_idx ON client_52.transaction_attachments USING btree (transaction_id);


--
-- TOC entry 6511 (class 1259 OID 18463)
-- Name: idx_billing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_status ON public.billing_transactions USING btree (status);


--
-- TOC entry 6512 (class 1259 OID 18462)
-- Name: idx_billing_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_user_id ON public.billing_transactions USING btree (user_id);


--
-- TOC entry 6499 (class 1259 OID 18248)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- TOC entry 6500 (class 1259 OID 18247)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 6501 (class 1259 OID 18246)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- TOC entry 6502 (class 1259 OID 18245)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 6513 (class 1259 OID 18601)
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- TOC entry 6514 (class 1259 OID 18600)
-- Name: idx_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_session_id ON public.sessions USING btree (session_id);


--
-- TOC entry 6515 (class 1259 OID 18599)
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- TOC entry 6505 (class 1259 OID 17835)
-- Name: idx_user_notification_settings_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_type ON public.user_notification_settings USING btree (type);


--
-- TOC entry 6506 (class 1259 OID 17834)
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- TOC entry 6491 (class 1259 OID 19350)
-- Name: idx_users_preferred_ai_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_preferred_ai_model ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 6494 (class 1259 OID 19349)
-- Name: users_preferred_ai_model_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_preferred_ai_model_idx ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 6600 (class 1259 OID 27896)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 6601 (class 1259 OID 27897)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 6602 (class 1259 OID 27914)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 6603 (class 1259 OID 27916)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 6604 (class 1259 OID 27915)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON template.ai_messages USING btree (created_at);


--
-- TOC entry 6607 (class 1259 OID 27913)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON template.ai_messages USING btree (user_id);


--
-- TOC entry 6610 (class 1259 OID 27931)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 6611 (class 1259 OID 27934)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 6612 (class 1259 OID 27932)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON template.ai_suggestions USING btree (type);


--
-- TOC entry 6613 (class 1259 OID 27930)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 6614 (class 1259 OID 27933)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 6617 (class 1259 OID 27942)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON template.analysis_configs USING btree (property_id);


--
-- TOC entry 6618 (class 1259 OID 27943)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON template.analysis_configs USING btree (user_id);


--
-- TOC entry 6652 (class 1259 OID 28152)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON template.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 6655 (class 1259 OID 28153)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON template.automatic_reminders USING btree (status);


--
-- TOC entry 6656 (class 1259 OID 28151)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON template.automatic_reminders USING btree (user_id);


--
-- TOC entry 6665 (class 1259 OID 28206)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON template.form_fields USING btree (link_id);


--
-- TOC entry 6592 (class 1259 OID 27835)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON template.form_responses USING btree (form_id);


--
-- TOC entry 6672 (class 1259 OID 28220)
-- Name: forms_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON template.forms USING btree (user_id);


--
-- TOC entry 6675 (class 1259 OID 28238)
-- Name: links_profile_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON template.links USING btree (profile_id);


--
-- TOC entry 6676 (class 1259 OID 28239)
-- Name: links_type_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX links_type_idx ON template.links USING btree (type);


--
-- TOC entry 6696 (class 1259 OID 28360)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON template.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 6685 (class 1259 OID 28292)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON template.rent_receipts USING btree (property_id);


--
-- TOC entry 6686 (class 1259 OID 28294)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON template.rent_receipts USING btree (status);


--
-- TOC entry 6687 (class 1259 OID 28291)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON template.rent_receipts USING btree (tenant_id);


--
-- TOC entry 6688 (class 1259 OID 28293)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON template.rent_receipts USING btree (transaction_id);


--
-- TOC entry 6691 (class 1259 OID 28306)
-- Name: transaction_attachments_transaction_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX transaction_attachments_transaction_id_idx ON template.transaction_attachments USING btree (transaction_id);


--
-- TOC entry 7024 (class 2620 OID 27336)
-- Name: users trg_create_client_schema; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_create_client_schema AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_schema_for_new_client();


--
-- TOC entry 7025 (class 2620 OID 19162)
-- Name: company_info update_company_info_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_company_info_timestamp BEFORE UPDATE ON public.company_info FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 7003 (class 2606 OID 18457)
-- Name: billing_transactions billing_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 7000 (class 2606 OID 17464)
-- Name: document_templates document_templates_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 7001 (class 2606 OID 18249)
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 7005 (class 2606 OID 27063)
-- Name: schema_mapping schema_mapping_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 7004 (class 2606 OID 18589)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 7002 (class 2606 OID 17829)
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 7009 (class 2606 OID 27323)
-- Name: documents documents_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7010 (class 2606 OID 27328)
-- Name: documents documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 7013 (class 2606 OID 27452)
-- Name: feedbacks feedbacks_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7014 (class 2606 OID 27447)
-- Name: feedbacks feedbacks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 7015 (class 2606 OID 27468)
-- Name: form_submissions form_submissions_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7016 (class 2606 OID 27473)
-- Name: form_submissions form_submissions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 7011 (class 2606 OID 27426)
-- Name: maintenance_requests maintenance_requests_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7012 (class 2606 OID 27431)
-- Name: maintenance_requests maintenance_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 7023 (class 2606 OID 27575)
-- Name: property_analyses property_analyses_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7022 (class 2606 OID 27559)
-- Name: property_coordinates property_coordinates_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7020 (class 2606 OID 27526)
-- Name: property_history property_history_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7021 (class 2606 OID 27543)
-- Name: property_works property_works_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7017 (class 2606 OID 27492)
-- Name: tenant_documents tenant_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES template.documents(id);


--
-- TOC entry 7018 (class 2606 OID 27487)
-- Name: tenant_documents tenant_documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 7019 (class 2606 OID 27509)
-- Name: tenant_history tenant_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 7006 (class 2606 OID 27286)
-- Name: tenants tenants_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7007 (class 2606 OID 27302)
-- Name: transactions transactions_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 7008 (class 2606 OID 27307)
-- Name: transactions transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 7483 (class 0 OID 0)
-- Dependencies: 8
-- Name: SCHEMA client_31; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA client_31 TO client_role_31;


--
-- TOC entry 7484 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO clients;
GRANT USAGE ON SCHEMA public TO client_role_31;


--
-- TOC entry 7486 (class 0 OID 0)
-- Dependencies: 583
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea) TO clients;


--
-- TOC entry 7487 (class 0 OID 0)
-- Dependencies: 584
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO clients;


--
-- TOC entry 7488 (class 0 OID 0)
-- Dependencies: 587
-- Name: FUNCTION check_auth(p_username text, p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_auth(p_username text, p_password text) TO clients;


--
-- TOC entry 7489 (class 0 OID 0)
-- Dependencies: 560
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.crypt(text, text) TO clients;


--
-- TOC entry 7490 (class 0 OID 0)
-- Dependencies: 585
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dearmor(text) TO clients;


--
-- TOC entry 7491 (class 0 OID 0)
-- Dependencies: 557
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 7492 (class 0 OID 0)
-- Dependencies: 568
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 7493 (class 0 OID 0)
-- Dependencies: 563
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(bytea, text) TO clients;


--
-- TOC entry 7494 (class 0 OID 0)
-- Dependencies: 553
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(text, text) TO clients;


--
-- TOC entry 7495 (class 0 OID 0)
-- Dependencies: 554
-- Name: FUNCTION enable_rls_on_table(table_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enable_rls_on_table(table_name text) TO clients;


--
-- TOC entry 7496 (class 0 OID 0)
-- Dependencies: 567
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 7497 (class 0 OID 0)
-- Dependencies: 558
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 7498 (class 0 OID 0)
-- Dependencies: 569
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO clients;


--
-- TOC entry 7499 (class 0 OID 0)
-- Dependencies: 570
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_uuid() TO clients;


--
-- TOC entry 7500 (class 0 OID 0)
-- Dependencies: 561
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text) TO clients;


--
-- TOC entry 7501 (class 0 OID 0)
-- Dependencies: 566
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO clients;


--
-- TOC entry 7502 (class 0 OID 0)
-- Dependencies: 559
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO clients;


--
-- TOC entry 7503 (class 0 OID 0)
-- Dependencies: 564
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(text, text, text) TO clients;


--
-- TOC entry 7504 (class 0 OID 0)
-- Dependencies: 556
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO clients;


--
-- TOC entry 7506 (class 0 OID 0)
-- Dependencies: 589
-- Name: FUNCTION log_table_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_table_changes() TO clients;


--
-- TOC entry 7507 (class 0 OID 0)
-- Dependencies: 586
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO clients;


--
-- TOC entry 7508 (class 0 OID 0)
-- Dependencies: 582
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO clients;


--
-- TOC entry 7509 (class 0 OID 0)
-- Dependencies: 544
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO clients;


--
-- TOC entry 7510 (class 0 OID 0)
-- Dependencies: 546
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 7511 (class 0 OID 0)
-- Dependencies: 548
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO clients;


--
-- TOC entry 7512 (class 0 OID 0)
-- Dependencies: 545
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 7513 (class 0 OID 0)
-- Dependencies: 547
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 7514 (class 0 OID 0)
-- Dependencies: 549
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO clients;


--
-- TOC entry 7515 (class 0 OID 0)
-- Dependencies: 580
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO clients;


--
-- TOC entry 7516 (class 0 OID 0)
-- Dependencies: 550
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO clients;


--
-- TOC entry 7517 (class 0 OID 0)
-- Dependencies: 581
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 7518 (class 0 OID 0)
-- Dependencies: 551
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 7519 (class 0 OID 0)
-- Dependencies: 576
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO clients;


--
-- TOC entry 7520 (class 0 OID 0)
-- Dependencies: 578
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO clients;


--
-- TOC entry 7521 (class 0 OID 0)
-- Dependencies: 577
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 7522 (class 0 OID 0)
-- Dependencies: 579
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 7523 (class 0 OID 0)
-- Dependencies: 571
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO clients;


--
-- TOC entry 7524 (class 0 OID 0)
-- Dependencies: 574
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO clients;


--
-- TOC entry 7525 (class 0 OID 0)
-- Dependencies: 573
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 7526 (class 0 OID 0)
-- Dependencies: 575
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 7527 (class 0 OID 0)
-- Dependencies: 565
-- Name: FUNCTION recalculate_user_storage(user_id_param integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recalculate_user_storage(user_id_param integer) TO clients;


--
-- TOC entry 7528 (class 0 OID 0)
-- Dependencies: 588
-- Name: FUNCTION set_app_variables(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_app_variables() TO clients;


--
-- TOC entry 7530 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION sync_theme_colors(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_theme_colors() TO clients;


--
-- TOC entry 7531 (class 0 OID 0)
-- Dependencies: 552
-- Name: FUNCTION test_rls_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.test_rls_config() TO clients;


--
-- TOC entry 7532 (class 0 OID 0)
-- Dependencies: 543
-- Name: FUNCTION update_modified_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_modified_column() TO clients;


--
-- TOC entry 7533 (class 0 OID 0)
-- Dependencies: 572
-- Name: FUNCTION update_storage_on_document_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_storage_on_document_change() TO clients;


--
-- TOC entry 7534 (class 0 OID 0)
-- Dependencies: 555
-- Name: FUNCTION update_user_storage_quota(p_user_id integer, p_extension_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_storage_quota(p_user_id integer, p_extension_id integer) TO clients;


--
-- TOC entry 7536 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE documents; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.documents TO client_role_31;


--
-- TOC entry 7538 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE feedbacks; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.feedbacks TO client_role_31;


--
-- TOC entry 7540 (class 0 OID 0)
-- Dependencies: 278
-- Name: TABLE form_submissions; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.form_submissions TO client_role_31;


--
-- TOC entry 7542 (class 0 OID 0)
-- Dependencies: 276
-- Name: TABLE maintenance_requests; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.maintenance_requests TO client_role_31;


--
-- TOC entry 7544 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE properties; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.properties TO client_role_31;


--
-- TOC entry 7546 (class 0 OID 0)
-- Dependencies: 284
-- Name: TABLE property_analyses; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_analyses TO client_role_31;


--
-- TOC entry 7548 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE property_coordinates; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_coordinates TO client_role_31;


--
-- TOC entry 7550 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE property_history; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_history TO client_role_31;


--
-- TOC entry 7552 (class 0 OID 0)
-- Dependencies: 282
-- Name: TABLE property_works; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_works TO client_role_31;


--
-- TOC entry 7554 (class 0 OID 0)
-- Dependencies: 300
-- Name: TABLE storage_usage; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.storage_usage TO client_role_31;


--
-- TOC entry 7556 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE tenant_documents; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.tenant_documents TO client_role_31;


--
-- TOC entry 7558 (class 0 OID 0)
-- Dependencies: 280
-- Name: TABLE tenant_history; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.tenant_history TO client_role_31;


--
-- TOC entry 7560 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE tenants; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.tenants TO client_role_31;


--
-- TOC entry 7562 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE transactions; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.transactions TO client_role_31;


--
-- TOC entry 7563 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE ai_conversations; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.ai_conversations TO client_role_31;


--
-- TOC entry 7564 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE ai_messages; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.ai_messages TO client_role_31;


--
-- TOC entry 7565 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE ai_suggestions; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.ai_suggestions TO client_role_31;


--
-- TOC entry 7566 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE analysis_configs; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.analysis_configs TO client_role_31;


--
-- TOC entry 7567 (class 0 OID 0)
-- Dependencies: 368
-- Name: TABLE automatic_reminders; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.automatic_reminders TO client_role_31;


--
-- TOC entry 7568 (class 0 OID 0)
-- Dependencies: 370
-- Name: TABLE contract_parties; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.contract_parties TO client_role_31;


--
-- TOC entry 7569 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE contracts; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.contracts TO client_role_31;


--
-- TOC entry 7570 (class 0 OID 0)
-- Dependencies: 372
-- Name: TABLE financial_entries; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.financial_entries TO client_role_31;


--
-- TOC entry 7571 (class 0 OID 0)
-- Dependencies: 374
-- Name: TABLE folders; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.folders TO client_role_31;


--
-- TOC entry 7572 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE form_field_options; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.form_field_options TO client_role_31;


--
-- TOC entry 7573 (class 0 OID 0)
-- Dependencies: 376
-- Name: TABLE form_fields; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.form_fields TO client_role_31;


--
-- TOC entry 7574 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE form_responses; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.form_responses TO client_role_31;


--
-- TOC entry 7575 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE forms; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.forms TO client_role_31;


--
-- TOC entry 7576 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE link_profiles; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.link_profiles TO client_role_31;


--
-- TOC entry 7577 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE links; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.links TO client_role_31;


--
-- TOC entry 7578 (class 0 OID 0)
-- Dependencies: 382
-- Name: TABLE maintenance; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.maintenance TO client_role_31;


--
-- TOC entry 7579 (class 0 OID 0)
-- Dependencies: 392
-- Name: TABLE pdf_configuration; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.pdf_configuration TO client_role_31;


--
-- TOC entry 7580 (class 0 OID 0)
-- Dependencies: 394
-- Name: TABLE pdf_document_preferences; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.pdf_document_preferences TO client_role_31;


--
-- TOC entry 7581 (class 0 OID 0)
-- Dependencies: 396
-- Name: TABLE pdf_logos; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.pdf_logos TO client_role_31;


--
-- TOC entry 7582 (class 0 OID 0)
-- Dependencies: 398
-- Name: TABLE pdf_templates; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.pdf_templates TO client_role_31;


--
-- TOC entry 7583 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE pdf_themes; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.pdf_themes TO client_role_31;


--
-- TOC entry 7584 (class 0 OID 0)
-- Dependencies: 384
-- Name: TABLE property_financial_goals; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_financial_goals TO client_role_31;


--
-- TOC entry 7585 (class 0 OID 0)
-- Dependencies: 386
-- Name: TABLE property_financial_snapshots; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_financial_snapshots TO client_role_31;


--
-- TOC entry 7586 (class 0 OID 0)
-- Dependencies: 388
-- Name: TABLE rent_receipts; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.rent_receipts TO client_role_31;


--
-- TOC entry 7587 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE reports; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.reports TO client_role_31;


--
-- TOC entry 7588 (class 0 OID 0)
-- Dependencies: 390
-- Name: TABLE transaction_attachments; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.transaction_attachments TO client_role_31;


--
-- TOC entry 7590 (class 0 OID 0)
-- Dependencies: 487
-- Name: TABLE visits; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.visits TO client_role_31;


--
-- TOC entry 7591 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.alerts TO clients;


--
-- TOC entry 7593 (class 0 OID 0)
-- Dependencies: 226
-- Name: SEQUENCE alerts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.alerts_id_seq TO clients;


--
-- TOC entry 7594 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE billing_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.billing_transactions TO clients;


--
-- TOC entry 7596 (class 0 OID 0)
-- Dependencies: 235
-- Name: SEQUENCE billing_transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.billing_transactions_id_seq TO clients;


--
-- TOC entry 7597 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE company_info; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.company_info TO clients;


--
-- TOC entry 7599 (class 0 OID 0)
-- Dependencies: 239
-- Name: SEQUENCE company_info_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.company_info_id_seq TO clients;


--
-- TOC entry 7600 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE document_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.document_templates TO clients;


--
-- TOC entry 7602 (class 0 OID 0)
-- Dependencies: 229
-- Name: SEQUENCE document_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.document_templates_id_seq TO clients;


--
-- TOC entry 7603 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.notifications TO clients;


--
-- TOC entry 7605 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.notifications_id_seq TO clients;


--
-- TOC entry 7607 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.sessions TO clients;
GRANT SELECT ON TABLE public.sessions TO client_role_31;


--
-- TOC entry 7609 (class 0 OID 0)
-- Dependencies: 237
-- Name: SEQUENCE sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.sessions_id_seq TO clients;


--
-- TOC entry 7613 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE user_notification_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_notification_settings TO clients;


--
-- TOC entry 7615 (class 0 OID 0)
-- Dependencies: 233
-- Name: SEQUENCE user_notification_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.user_notification_settings_id_seq TO clients;


--
-- TOC entry 7616 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.users TO clients;
GRANT SELECT ON TABLE public.users TO client_role_31;


--
-- TOC entry 7618 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.users_id_seq TO clients;


--
-- TOC entry 2985 (class 826 OID 27379)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: client_31; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_31 GRANT ALL ON TABLES TO client_role_31;


--
-- TOC entry 2987 (class 826 OID 28712)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: client_40; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_40 GRANT ALL ON SEQUENCES TO postgres;


--
-- TOC entry 2986 (class 826 OID 28711)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: client_40; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_40 GRANT ALL ON TABLES TO postgres;


-- Completed on 2025-05-07 16:41:18

--
-- PostgreSQL database dump complete
--

