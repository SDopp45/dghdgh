--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-07 03:06:25

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
-- TOC entry 10 (class 2615 OID 27849)
-- Name: client_22; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_22;


ALTER SCHEMA client_22 OWNER TO postgres;

--
-- TOC entry 8 (class 2615 OID 27337)
-- Name: client_31; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_31;


ALTER SCHEMA client_31 OWNER TO postgres;

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
-- TOC entry 5898 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 410 (class 1255 OID 19907)
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
-- TOC entry 416 (class 1255 OID 27334)
-- Name: create_client_schema(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_client_schema(p_user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    schema_name TEXT := 'client_' || p_user_id;
    role_name TEXT := 'client_role_' || p_user_id;
    table_record RECORD;
BEGIN
    -- Créer le schéma client
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || schema_name;
    
    -- Créer toutes les tables dans le schéma client (copier depuis template)
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'template' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'CREATE TABLE ' || schema_name || '.' || table_record.table_name || 
                ' (LIKE template.' || table_record.table_name || ' INCLUDING ALL)';
    END LOOP;
    
    -- Créer un rôle PostgreSQL pour le client s'il n'existe pas
    BEGIN
        EXECUTE format('CREATE ROLE %I', role_name);
    EXCEPTION 
        WHEN duplicate_object THEN 
            -- Le rôle existe déjà, ignorer l'erreur
    END;
    
    -- Configurer les permissions sur le schéma client
    EXECUTE 'GRANT USAGE ON SCHEMA ' || schema_name || ' TO ' || role_name;
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ' || schema_name || ' TO ' || role_name;
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA ' || schema_name || 
            ' GRANT ALL PRIVILEGES ON TABLES TO ' || role_name;
    
    -- Configurer les permissions sur le schéma public pour les tables partagées
    EXECUTE 'GRANT USAGE ON SCHEMA public TO ' || role_name;
    EXECUTE 'GRANT SELECT ON public.users TO ' || role_name;
    EXECUTE 'GRANT SELECT ON public.sessions TO ' || role_name;
    
    -- Mettre à jour l'utilisateur avec son rôle PostgreSQL
    EXECUTE 'UPDATE public.users SET settings = 
             jsonb_set(COALESCE(settings, ''{}''::jsonb), ''{postgres_role}'', ''"' || role_name || '"'')
             WHERE id = ' || p_user_id;
    
    -- Créer une vue dans admin_views pour cette table
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = schema_name
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'CREATE OR REPLACE VIEW admin_views.' || table_record.table_name || '_' || p_user_id || 
                ' AS SELECT *, ''' || schema_name || ''' as _schema_name FROM ' || 
                schema_name || '.' || table_record.table_name;
    END LOOP;
END;
$$;


ALTER FUNCTION public.create_client_schema(p_user_id integer) OWNER TO postgres;

--
-- TOC entry 414 (class 1255 OID 27335)
-- Name: create_schema_for_new_client(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_schema_for_new_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.role = 'clients' THEN
        PERFORM public.create_client_schema(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_schema_for_new_client() OWNER TO postgres;

--
-- TOC entry 415 (class 1255 OID 27847)
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
-- TOC entry 377 (class 1255 OID 19950)
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
-- TOC entry 379 (class 1255 OID 18690)
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
-- TOC entry 412 (class 1255 OID 19948)
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
-- TOC entry 5918 (class 0 OID 0)
-- Dependencies: 412
-- Name: FUNCTION log_table_changes(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_table_changes() IS 'Fonction pour journaliser les modifications des tables principales';


--
-- TOC entry 388 (class 1255 OID 19450)
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
-- TOC entry 411 (class 1255 OID 19940)
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
-- TOC entry 413 (class 1255 OID 20040)
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
          RETURN 'public, admin_views';
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
-- TOC entry 385 (class 1255 OID 19210)
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
-- TOC entry 375 (class 1255 OID 19957)
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
-- TOC entry 366 (class 1255 OID 18935)
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
-- TOC entry 395 (class 1255 OID 19451)
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
-- TOC entry 378 (class 1255 OID 18464)
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
-- TOC entry 294 (class 1259 OID 27313)
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
-- TOC entry 293 (class 1259 OID 27312)
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
-- TOC entry 5947 (class 0 OID 0)
-- Dependencies: 293
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.documents_id_seq OWNED BY template.documents.id;


--
-- TOC entry 298 (class 1259 OID 27368)
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
-- TOC entry 302 (class 1259 OID 27393)
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
-- TOC entry 308 (class 1259 OID 27437)
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
-- TOC entry 307 (class 1259 OID 27436)
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
-- TOC entry 5949 (class 0 OID 0)
-- Dependencies: 307
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.feedbacks_id_seq OWNED BY template.feedbacks.id;


--
-- TOC entry 325 (class 1259 OID 27602)
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
-- TOC entry 335 (class 1259 OID 27691)
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
-- TOC entry 310 (class 1259 OID 27458)
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
-- TOC entry 309 (class 1259 OID 27457)
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
-- TOC entry 5951 (class 0 OID 0)
-- Dependencies: 309
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.form_submissions_id_seq OWNED BY template.form_submissions.id;


--
-- TOC entry 326 (class 1259 OID 27612)
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
-- TOC entry 336 (class 1259 OID 27695)
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
-- TOC entry 306 (class 1259 OID 27414)
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
-- TOC entry 305 (class 1259 OID 27413)
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
-- TOC entry 5953 (class 0 OID 0)
-- Dependencies: 305
-- Name: maintenance_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.maintenance_requests_id_seq OWNED BY template.maintenance_requests.id;


--
-- TOC entry 324 (class 1259 OID 27590)
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
-- TOC entry 334 (class 1259 OID 27687)
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
-- TOC entry 288 (class 1259 OID 27265)
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
-- TOC entry 287 (class 1259 OID 27264)
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
-- TOC entry 5955 (class 0 OID 0)
-- Dependencies: 287
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.properties_id_seq OWNED BY template.properties.id;


--
-- TOC entry 295 (class 1259 OID 27338)
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
-- TOC entry 299 (class 1259 OID 27380)
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
-- TOC entry 322 (class 1259 OID 27565)
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
-- TOC entry 321 (class 1259 OID 27564)
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
-- TOC entry 5957 (class 0 OID 0)
-- Dependencies: 321
-- Name: property_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_analyses_id_seq OWNED BY template.property_analyses.id;


--
-- TOC entry 332 (class 1259 OID 27673)
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
-- TOC entry 342 (class 1259 OID 27719)
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
-- TOC entry 320 (class 1259 OID 27549)
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
-- TOC entry 319 (class 1259 OID 27548)
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
-- TOC entry 5959 (class 0 OID 0)
-- Dependencies: 319
-- Name: property_coordinates_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_coordinates_id_seq OWNED BY template.property_coordinates.id;


--
-- TOC entry 331 (class 1259 OID 27663)
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
-- TOC entry 341 (class 1259 OID 27715)
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
-- TOC entry 316 (class 1259 OID 27515)
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
-- TOC entry 315 (class 1259 OID 27514)
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
-- TOC entry 5961 (class 0 OID 0)
-- Dependencies: 315
-- Name: property_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_history_id_seq OWNED BY template.property_history.id;


--
-- TOC entry 329 (class 1259 OID 27641)
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
-- TOC entry 339 (class 1259 OID 27707)
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
-- TOC entry 318 (class 1259 OID 27532)
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
-- TOC entry 317 (class 1259 OID 27531)
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
-- TOC entry 5963 (class 0 OID 0)
-- Dependencies: 317
-- Name: property_works_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_works_id_seq OWNED BY template.property_works.id;


--
-- TOC entry 330 (class 1259 OID 27652)
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
-- TOC entry 340 (class 1259 OID 27711)
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
-- TOC entry 348 (class 1259 OID 27750)
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
-- TOC entry 347 (class 1259 OID 27749)
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
-- TOC entry 5965 (class 0 OID 0)
-- Dependencies: 347
-- Name: storage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.storage_usage_id_seq OWNED BY template.storage_usage.id;


--
-- TOC entry 349 (class 1259 OID 27759)
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
-- TOC entry 350 (class 1259 OID 27768)
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
-- TOC entry 312 (class 1259 OID 27479)
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
-- TOC entry 311 (class 1259 OID 27478)
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
-- TOC entry 5967 (class 0 OID 0)
-- Dependencies: 311
-- Name: tenant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_documents_id_seq OWNED BY template.tenant_documents.id;


--
-- TOC entry 327 (class 1259 OID 27622)
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
-- TOC entry 337 (class 1259 OID 27699)
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
-- TOC entry 314 (class 1259 OID 27498)
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
-- TOC entry 313 (class 1259 OID 27497)
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
-- TOC entry 5969 (class 0 OID 0)
-- Dependencies: 313
-- Name: tenant_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_history_id_seq OWNED BY template.tenant_history.id;


--
-- TOC entry 328 (class 1259 OID 27630)
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
-- TOC entry 338 (class 1259 OID 27703)
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
-- TOC entry 290 (class 1259 OID 27276)
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
-- TOC entry 289 (class 1259 OID 27275)
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
-- TOC entry 5971 (class 0 OID 0)
-- Dependencies: 289
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenants_id_seq OWNED BY template.tenants.id;


--
-- TOC entry 296 (class 1259 OID 27348)
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
-- TOC entry 300 (class 1259 OID 27385)
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
-- TOC entry 292 (class 1259 OID 27292)
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
-- TOC entry 291 (class 1259 OID 27291)
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
-- TOC entry 5973 (class 0 OID 0)
-- Dependencies: 291
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.transactions_id_seq OWNED BY template.transactions.id;


--
-- TOC entry 297 (class 1259 OID 27358)
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
-- TOC entry 301 (class 1259 OID 27389)
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
-- TOC entry 304 (class 1259 OID 27398)
-- Name: visits; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.visits (
    id integer NOT NULL,
    property_id integer,
    visitor_name text NOT NULL,
    visitor_email text,
    visitor_phone text,
    visit_date timestamp without time zone NOT NULL,
    status text,
    notes text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE template.visits OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 27397)
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
-- TOC entry 5975 (class 0 OID 0)
-- Dependencies: 303
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.visits_id_seq OWNED BY template.visits.id;


--
-- TOC entry 323 (class 1259 OID 27580)
-- Name: visits; Type: TABLE; Schema: client_31; Owner: postgres
--

CREATE TABLE client_31.visits (
    id integer DEFAULT nextval('template.visits_id_seq'::regclass) NOT NULL,
    property_id integer,
    visitor_name text NOT NULL,
    visitor_email text,
    visitor_phone text,
    visit_date timestamp without time zone NOT NULL,
    status text,
    notes text,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_31.visits OWNER TO postgres;

--
-- TOC entry 333 (class 1259 OID 27683)
-- Name: visits_31; Type: VIEW; Schema: admin_views; Owner: postgres
--

CREATE VIEW admin_views.visits_31 AS
 SELECT id,
    property_id,
    visitor_name,
    visitor_email,
    visitor_phone,
    visit_date,
    status,
    notes,
    user_id,
    created_at,
    updated_at,
    'client_31'::text AS _schema_name
   FROM client_31.visits;


ALTER VIEW admin_views.visits_31 OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 27836)
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
-- TOC entry 352 (class 1259 OID 27800)
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
-- TOC entry 281 (class 1259 OID 19261)
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_conversations (
    id integer NOT NULL,
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


ALTER TABLE public.ai_conversations OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 19260)
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_conversations_id_seq OWNER TO postgres;

--
-- TOC entry 5980 (class 0 OID 0)
-- Dependencies: 280
-- Name: ai_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_conversations_id_seq OWNED BY public.ai_conversations.id;


--
-- TOC entry 283 (class 1259 OID 19283)
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_messages (
    id integer NOT NULL,
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


ALTER TABLE public.ai_messages OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 19282)
-- Name: ai_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_messages_id_seq OWNER TO postgres;

--
-- TOC entry 5983 (class 0 OID 0)
-- Dependencies: 282
-- Name: ai_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_messages_id_seq OWNED BY public.ai_messages.id;


--
-- TOC entry 285 (class 1259 OID 19312)
-- Name: ai_suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_suggestions (
    id integer NOT NULL,
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


ALTER TABLE public.ai_suggestions OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 19311)
-- Name: ai_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_suggestions_id_seq OWNER TO postgres;

--
-- TOC entry 5986 (class 0 OID 0)
-- Dependencies: 284
-- Name: ai_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_suggestions_id_seq OWNED BY public.ai_suggestions.id;


--
-- TOC entry 226 (class 1259 OID 17090)
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
-- TOC entry 225 (class 1259 OID 17089)
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
-- TOC entry 5989 (class 0 OID 0)
-- Dependencies: 225
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- TOC entry 251 (class 1259 OID 17776)
-- Name: analysis_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analysis_configs (
    id integer NOT NULL,
    property_id integer,
    user_id integer,
    name character varying(255) NOT NULL,
    period_type character varying(50) NOT NULL,
    period_value integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE public.analysis_configs OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 17775)
-- Name: analysis_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analysis_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analysis_configs_id_seq OWNER TO postgres;

--
-- TOC entry 5992 (class 0 OID 0)
-- Dependencies: 250
-- Name: analysis_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analysis_configs_id_seq OWNED BY public.analysis_configs.id;


--
-- TOC entry 245 (class 1259 OID 17609)
-- Name: automatic_reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automatic_reminders (
    id integer NOT NULL,
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


ALTER TABLE public.automatic_reminders OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 17608)
-- Name: automatic_reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.automatic_reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automatic_reminders_id_seq OWNER TO postgres;

--
-- TOC entry 5995 (class 0 OID 0)
-- Dependencies: 244
-- Name: automatic_reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automatic_reminders_id_seq OWNED BY public.automatic_reminders.id;


--
-- TOC entry 265 (class 1259 OID 18448)
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
-- TOC entry 264 (class 1259 OID 18447)
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
-- TOC entry 5998 (class 0 OID 0)
-- Dependencies: 264
-- Name: billing_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_transactions_id_seq OWNED BY public.billing_transactions.id;


--
-- TOC entry 277 (class 1259 OID 19148)
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
-- TOC entry 276 (class 1259 OID 19147)
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
-- TOC entry 6001 (class 0 OID 0)
-- Dependencies: 276
-- Name: company_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_info_id_seq OWNED BY public.company_info.id;


--
-- TOC entry 249 (class 1259 OID 17727)
-- Name: contract_parties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_parties (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    party_id integer NOT NULL,
    party_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_parties_party_type_check CHECK ((party_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'manager'::text, 'other'::text])))
);


ALTER TABLE public.contract_parties OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 17726)
-- Name: contract_parties_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contract_parties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contract_parties_id_seq OWNER TO postgres;

--
-- TOC entry 6004 (class 0 OID 0)
-- Dependencies: 248
-- Name: contract_parties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contract_parties_id_seq OWNED BY public.contract_parties.id;


--
-- TOC entry 247 (class 1259 OID 17701)
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
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


ALTER TABLE public.contracts OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 17700)
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contracts_id_seq OWNER TO postgres;

--
-- TOC entry 6007 (class 0 OID 0)
-- Dependencies: 246
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- TOC entry 229 (class 1259 OID 17231)
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
-- TOC entry 230 (class 1259 OID 17238)
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
-- TOC entry 6010 (class 0 OID 0)
-- Dependencies: 230
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- TOC entry 231 (class 1259 OID 17259)
-- Name: financial_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_entries (
    id integer NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.financial_entries OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 17267)
-- Name: financial_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.financial_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.financial_entries_id_seq OWNER TO postgres;

--
-- TOC entry 6013 (class 0 OID 0)
-- Dependencies: 232
-- Name: financial_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.financial_entries_id_seq OWNED BY public.financial_entries.id;


--
-- TOC entry 233 (class 1259 OID 17268)
-- Name: folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folders (
    id integer NOT NULL,
    name text NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.folders OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 17275)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.folders_id_seq OWNER TO postgres;

--
-- TOC entry 6016 (class 0 OID 0)
-- Dependencies: 234
-- Name: folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folders_id_seq OWNED BY public.folders.id;


--
-- TOC entry 261 (class 1259 OID 18206)
-- Name: form_field_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_field_options (
    id integer NOT NULL,
    form_field_id integer NOT NULL,
    value character varying(255) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.form_field_options OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 18205)
-- Name: form_field_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_field_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_field_options_id_seq OWNER TO postgres;

--
-- TOC entry 6019 (class 0 OID 0)
-- Dependencies: 260
-- Name: form_field_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_field_options_id_seq OWNED BY public.form_field_options.id;


--
-- TOC entry 259 (class 1259 OID 18187)
-- Name: form_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_fields (
    id integer NOT NULL,
    link_id integer NOT NULL,
    field_id character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    label character varying(255) NOT NULL,
    required boolean DEFAULT false,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT form_fields_type_check CHECK (((type)::text = ANY ((ARRAY['text'::character varying, 'textarea'::character varying, 'email'::character varying, 'number'::character varying, 'checkbox'::character varying, 'select'::character varying])::text[])))
);


ALTER TABLE public.form_fields OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 18186)
-- Name: form_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_fields_id_seq OWNER TO postgres;

--
-- TOC entry 6022 (class 0 OID 0)
-- Dependencies: 258
-- Name: form_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_fields_id_seq OWNED BY public.form_fields.id;


--
-- TOC entry 255 (class 1259 OID 18013)
-- Name: forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forms (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.forms OWNER TO postgres;

--
-- TOC entry 6024 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE forms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.forms IS 'Formulaires créés par les utilisateurs';


--
-- TOC entry 254 (class 1259 OID 18012)
-- Name: forms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.forms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.forms_id_seq OWNER TO postgres;

--
-- TOC entry 6026 (class 0 OID 0)
-- Dependencies: 254
-- Name: forms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.forms_id_seq OWNED BY public.forms.id;


--
-- TOC entry 257 (class 1259 OID 18144)
-- Name: links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.links (
    id integer NOT NULL,
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
    button_style character varying(20)
);


ALTER TABLE public.links OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 18143)
-- Name: links_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.links_id_seq OWNER TO postgres;

--
-- TOC entry 6029 (class 0 OID 0)
-- Dependencies: 256
-- Name: links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.links_id_seq OWNED BY public.links.id;


--
-- TOC entry 224 (class 1259 OID 17055)
-- Name: maintenance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    "propertyId" integer NOT NULL,
    status text DEFAULT 'pending'::text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17054)
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_id_seq OWNER TO postgres;

--
-- TOC entry 6032 (class 0 OID 0)
-- Dependencies: 223
-- Name: maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_id_seq OWNED BY public.maintenance.id;


--
-- TOC entry 235 (class 1259 OID 17287)
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
-- TOC entry 236 (class 1259 OID 17294)
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
-- TOC entry 6035 (class 0 OID 0)
-- Dependencies: 236
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 271 (class 1259 OID 19102)
-- Name: pdf_configuration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdf_configuration (
    id integer NOT NULL,
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


ALTER TABLE public.pdf_configuration OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 19101)
-- Name: pdf_configuration_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdf_configuration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdf_configuration_id_seq OWNER TO postgres;

--
-- TOC entry 6038 (class 0 OID 0)
-- Dependencies: 270
-- Name: pdf_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_configuration_id_seq OWNED BY public.pdf_configuration.id;


--
-- TOC entry 269 (class 1259 OID 19002)
-- Name: pdf_document_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdf_document_preferences (
    id integer NOT NULL,
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
    CONSTRAINT pdf_document_preferences_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['visits'::character varying, 'tenants'::character varying, 'maintenance'::character varying, 'transactions'::character varying])::text[])))
);


ALTER TABLE public.pdf_document_preferences OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 19001)
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdf_document_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdf_document_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 6041 (class 0 OID 0)
-- Dependencies: 268
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_document_preferences_id_seq OWNED BY public.pdf_document_preferences.id;


--
-- TOC entry 273 (class 1259 OID 19122)
-- Name: pdf_logos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdf_logos (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    image_data text NOT NULL,
    width integer DEFAULT 100,
    height integer DEFAULT 100,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pdf_logos OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 19121)
-- Name: pdf_logos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdf_logos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdf_logos_id_seq OWNER TO postgres;

--
-- TOC entry 6044 (class 0 OID 0)
-- Dependencies: 272
-- Name: pdf_logos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_logos_id_seq OWNED BY public.pdf_logos.id;


--
-- TOC entry 275 (class 1259 OID 19136)
-- Name: pdf_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdf_templates (
    id integer NOT NULL,
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
    cell_alignment character varying(20) DEFAULT 'left'::character varying
);


ALTER TABLE public.pdf_templates OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 19135)
-- Name: pdf_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdf_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdf_templates_id_seq OWNER TO postgres;

--
-- TOC entry 6047 (class 0 OID 0)
-- Dependencies: 274
-- Name: pdf_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_templates_id_seq OWNED BY public.pdf_templates.id;


--
-- TOC entry 279 (class 1259 OID 19190)
-- Name: pdf_themes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdf_themes (
    id integer NOT NULL,
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pdf_themes OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 19189)
-- Name: pdf_themes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdf_themes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdf_themes_id_seq OWNER TO postgres;

--
-- TOC entry 6050 (class 0 OID 0)
-- Dependencies: 278
-- Name: pdf_themes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_themes_id_seq OWNED BY public.pdf_themes.id;


--
-- TOC entry 237 (class 1259 OID 17301)
-- Name: property_financial_goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_financial_goals (
    id integer NOT NULL,
    property_id integer NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    target_value numeric(10,2) NOT NULL,
    current_value numeric(10,2),
    deadline date,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.property_financial_goals OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 17309)
-- Name: property_financial_goals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_financial_goals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_financial_goals_id_seq OWNER TO postgres;

--
-- TOC entry 6053 (class 0 OID 0)
-- Dependencies: 238
-- Name: property_financial_goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_financial_goals_id_seq OWNED BY public.property_financial_goals.id;


--
-- TOC entry 239 (class 1259 OID 17310)
-- Name: property_financial_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_financial_snapshots (
    id integer NOT NULL,
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
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.property_financial_snapshots OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 17317)
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_financial_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_financial_snapshots_id_seq OWNER TO postgres;

--
-- TOC entry 6056 (class 0 OID 0)
-- Dependencies: 240
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_financial_snapshots_id_seq OWNED BY public.property_financial_snapshots.id;


--
-- TOC entry 243 (class 1259 OID 17597)
-- Name: rent_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rent_receipts (
    id integer NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rent_receipts OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 17596)
-- Name: rent_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rent_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rent_receipts_id_seq OWNER TO postgres;

--
-- TOC entry 6059 (class 0 OID 0)
-- Dependencies: 242
-- Name: rent_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rent_receipts_id_seq OWNED BY public.rent_receipts.id;


--
-- TOC entry 228 (class 1259 OID 17102)
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    "reportType" text,
    "fileUrl" text,
    "userId" integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17101)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- TOC entry 6062 (class 0 OID 0)
-- Dependencies: 227
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- TOC entry 286 (class 1259 OID 27055)
-- Name: schema_mapping; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_mapping (
    schema_name text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.schema_mapping OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 18577)
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
-- TOC entry 6064 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sessions IS 'Stocke les sessions d''authentification des utilisateurs';


--
-- TOC entry 266 (class 1259 OID 18576)
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
-- TOC entry 6066 (class 0 OID 0)
-- Dependencies: 266
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- TOC entry 344 (class 1259 OID 27727)
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
-- TOC entry 343 (class 1259 OID 27726)
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
-- TOC entry 6068 (class 0 OID 0)
-- Dependencies: 343
-- Name: storage_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_plans_id_seq OWNED BY public.storage_plans.id;


--
-- TOC entry 346 (class 1259 OID 27739)
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
-- TOC entry 345 (class 1259 OID 27738)
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
-- TOC entry 6069 (class 0 OID 0)
-- Dependencies: 345
-- Name: storage_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_quotas_id_seq OWNED BY public.storage_quotas.id;


--
-- TOC entry 263 (class 1259 OID 18224)
-- Name: transaction_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_attachments (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transaction_attachments OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 18223)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transaction_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 6071 (class 0 OID 0)
-- Dependencies: 262
-- Name: transaction_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_attachments_id_seq OWNED BY public.transaction_attachments.id;


--
-- TOC entry 253 (class 1259 OID 17811)
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
-- TOC entry 6073 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE user_notification_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_notification_settings IS 'Stores user preferences for notification deliveries';


--
-- TOC entry 252 (class 1259 OID 17810)
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
-- TOC entry 6075 (class 0 OID 0)
-- Dependencies: 252
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- TOC entry 222 (class 1259 OID 16853)
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
-- TOC entry 241 (class 1259 OID 17365)
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
-- TOC entry 6078 (class 0 OID 0)
-- Dependencies: 241
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 353 (class 1259 OID 27826)
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
-- TOC entry 351 (class 1259 OID 27774)
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
-- TOC entry 5205 (class 2604 OID 19264)
-- Name: ai_conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations ALTER COLUMN id SET DEFAULT nextval('public.ai_conversations_id_seq'::regclass);


--
-- TOC entry 5211 (class 2604 OID 19286)
-- Name: ai_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages ALTER COLUMN id SET DEFAULT nextval('public.ai_messages_id_seq'::regclass);


--
-- TOC entry 5218 (class 2604 OID 19315)
-- Name: ai_suggestions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions ALTER COLUMN id SET DEFAULT nextval('public.ai_suggestions_id_seq'::regclass);


--
-- TOC entry 5066 (class 2604 OID 17093)
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- TOC entry 5110 (class 2604 OID 17779)
-- Name: analysis_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_configs ALTER COLUMN id SET DEFAULT nextval('public.analysis_configs_id_seq'::regclass);


--
-- TOC entry 5097 (class 2604 OID 17612)
-- Name: automatic_reminders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automatic_reminders ALTER COLUMN id SET DEFAULT nextval('public.automatic_reminders_id_seq'::regclass);


--
-- TOC entry 5139 (class 2604 OID 18451)
-- Name: billing_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions ALTER COLUMN id SET DEFAULT nextval('public.billing_transactions_id_seq'::regclass);


--
-- TOC entry 5193 (class 2604 OID 19151)
-- Name: company_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info ALTER COLUMN id SET DEFAULT nextval('public.company_info_id_seq'::regclass);


--
-- TOC entry 5108 (class 2604 OID 17730)
-- Name: contract_parties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_parties ALTER COLUMN id SET DEFAULT nextval('public.contract_parties_id_seq'::regclass);


--
-- TOC entry 5102 (class 2604 OID 17704)
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- TOC entry 5073 (class 2604 OID 17382)
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);


--
-- TOC entry 5076 (class 2604 OID 17385)
-- Name: financial_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_entries ALTER COLUMN id SET DEFAULT nextval('public.financial_entries_id_seq'::regclass);


--
-- TOC entry 5080 (class 2604 OID 17386)
-- Name: folders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders ALTER COLUMN id SET DEFAULT nextval('public.folders_id_seq'::regclass);


--
-- TOC entry 5134 (class 2604 OID 18209)
-- Name: form_field_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_field_options ALTER COLUMN id SET DEFAULT nextval('public.form_field_options_id_seq'::regclass);


--
-- TOC entry 5129 (class 2604 OID 18190)
-- Name: form_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields ALTER COLUMN id SET DEFAULT nextval('public.form_fields_id_seq'::regclass);


--
-- TOC entry 5119 (class 2604 OID 18016)
-- Name: forms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms ALTER COLUMN id SET DEFAULT nextval('public.forms_id_seq'::regclass);


--
-- TOC entry 5121 (class 2604 OID 18147)
-- Name: links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.links ALTER COLUMN id SET DEFAULT nextval('public.links_id_seq'::regclass);


--
-- TOC entry 5062 (class 2604 OID 17058)
-- Name: maintenance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance ALTER COLUMN id SET DEFAULT nextval('public.maintenance_id_seq'::regclass);


--
-- TOC entry 5083 (class 2604 OID 17388)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 5150 (class 2604 OID 19105)
-- Name: pdf_configuration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_configuration ALTER COLUMN id SET DEFAULT nextval('public.pdf_configuration_id_seq'::regclass);


--
-- TOC entry 5144 (class 2604 OID 19005)
-- Name: pdf_document_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_document_preferences ALTER COLUMN id SET DEFAULT nextval('public.pdf_document_preferences_id_seq'::regclass);


--
-- TOC entry 5176 (class 2604 OID 19125)
-- Name: pdf_logos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_logos ALTER COLUMN id SET DEFAULT nextval('public.pdf_logos_id_seq'::regclass);


--
-- TOC entry 5182 (class 2604 OID 19139)
-- Name: pdf_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates ALTER COLUMN id SET DEFAULT nextval('public.pdf_templates_id_seq'::regclass);


--
-- TOC entry 5196 (class 2604 OID 19193)
-- Name: pdf_themes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_themes ALTER COLUMN id SET DEFAULT nextval('public.pdf_themes_id_seq'::regclass);


--
-- TOC entry 5086 (class 2604 OID 17391)
-- Name: property_financial_goals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_goals ALTER COLUMN id SET DEFAULT nextval('public.property_financial_goals_id_seq'::regclass);


--
-- TOC entry 5090 (class 2604 OID 17392)
-- Name: property_financial_snapshots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_snapshots ALTER COLUMN id SET DEFAULT nextval('public.property_financial_snapshots_id_seq'::regclass);


--
-- TOC entry 5093 (class 2604 OID 17600)
-- Name: rent_receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts ALTER COLUMN id SET DEFAULT nextval('public.rent_receipts_id_seq'::regclass);


--
-- TOC entry 5070 (class 2604 OID 17105)
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- TOC entry 5141 (class 2604 OID 18580)
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- TOC entry 5317 (class 2604 OID 27730)
-- Name: storage_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans ALTER COLUMN id SET DEFAULT nextval('public.storage_plans_id_seq'::regclass);


--
-- TOC entry 5321 (class 2604 OID 27742)
-- Name: storage_quotas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas ALTER COLUMN id SET DEFAULT nextval('public.storage_quotas_id_seq'::regclass);


--
-- TOC entry 5137 (class 2604 OID 18227)
-- Name: transaction_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_attachments ALTER COLUMN id SET DEFAULT nextval('public.transaction_attachments_id_seq'::regclass);


--
-- TOC entry 5112 (class 2604 OID 17814)
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- TOC entry 5048 (class 2604 OID 17399)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5232 (class 2604 OID 27316)
-- Name: documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents ALTER COLUMN id SET DEFAULT nextval('template.documents_id_seq'::regclass);


--
-- TOC entry 5255 (class 2604 OID 27440)
-- Name: feedbacks id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks ALTER COLUMN id SET DEFAULT nextval('template.feedbacks_id_seq'::regclass);


--
-- TOC entry 5258 (class 2604 OID 27461)
-- Name: form_submissions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions ALTER COLUMN id SET DEFAULT nextval('template.form_submissions_id_seq'::regclass);


--
-- TOC entry 5250 (class 2604 OID 27417)
-- Name: maintenance_requests id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests ALTER COLUMN id SET DEFAULT nextval('template.maintenance_requests_id_seq'::regclass);


--
-- TOC entry 5223 (class 2604 OID 27268)
-- Name: properties id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties ALTER COLUMN id SET DEFAULT nextval('template.properties_id_seq'::regclass);


--
-- TOC entry 5279 (class 2604 OID 27568)
-- Name: property_analyses id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses ALTER COLUMN id SET DEFAULT nextval('template.property_analyses_id_seq'::regclass);


--
-- TOC entry 5276 (class 2604 OID 27552)
-- Name: property_coordinates id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates ALTER COLUMN id SET DEFAULT nextval('template.property_coordinates_id_seq'::regclass);


--
-- TOC entry 5268 (class 2604 OID 27518)
-- Name: property_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history ALTER COLUMN id SET DEFAULT nextval('template.property_history_id_seq'::regclass);


--
-- TOC entry 5272 (class 2604 OID 27535)
-- Name: property_works id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works ALTER COLUMN id SET DEFAULT nextval('template.property_works_id_seq'::regclass);


--
-- TOC entry 5324 (class 2604 OID 27753)
-- Name: storage_usage id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage ALTER COLUMN id SET DEFAULT nextval('template.storage_usage_id_seq'::regclass);


--
-- TOC entry 5261 (class 2604 OID 27482)
-- Name: tenant_documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents ALTER COLUMN id SET DEFAULT nextval('template.tenant_documents_id_seq'::regclass);


--
-- TOC entry 5264 (class 2604 OID 27501)
-- Name: tenant_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history ALTER COLUMN id SET DEFAULT nextval('template.tenant_history_id_seq'::regclass);


--
-- TOC entry 5226 (class 2604 OID 27279)
-- Name: tenants id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants ALTER COLUMN id SET DEFAULT nextval('template.tenants_id_seq'::regclass);


--
-- TOC entry 5229 (class 2604 OID 27295)
-- Name: transactions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions ALTER COLUMN id SET DEFAULT nextval('template.transactions_id_seq'::regclass);


--
-- TOC entry 5247 (class 2604 OID 27401)
-- Name: visits id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits ALTER COLUMN id SET DEFAULT nextval('template.visits_id_seq'::regclass);


--
-- TOC entry 5849 (class 0 OID 27368)
-- Dependencies: 298
-- Data for Name: documents; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5872 (class 0 OID 27602)
-- Dependencies: 325
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5890 (class 0 OID 27836)
-- Dependencies: 354
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 5873 (class 0 OID 27612)
-- Dependencies: 326
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5888 (class 0 OID 27800)
-- Dependencies: 352
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5871 (class 0 OID 27590)
-- Dependencies: 324
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5846 (class 0 OID 27338)
-- Dependencies: 295
-- Data for Name: properties; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5879 (class 0 OID 27673)
-- Dependencies: 332
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5878 (class 0 OID 27663)
-- Dependencies: 331
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
-- TOC entry 5876 (class 0 OID 27641)
-- Dependencies: 329
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5877 (class 0 OID 27652)
-- Dependencies: 330
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5886 (class 0 OID 27759)
-- Dependencies: 349
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 5874 (class 0 OID 27622)
-- Dependencies: 327
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5875 (class 0 OID 27630)
-- Dependencies: 328
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5847 (class 0 OID 27348)
-- Dependencies: 296
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5848 (class 0 OID 27358)
-- Dependencies: 297
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5870 (class 0 OID 27580)
-- Dependencies: 323
-- Data for Name: visits; Type: TABLE DATA; Schema: client_31; Owner: postgres
--

COPY client_31.visits (id, property_id, visitor_name, visitor_email, visitor_phone, visit_date, status, notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5832 (class 0 OID 19261)
-- Dependencies: 281
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
1	1	Quel est le prix au m² à Villemandeu	2025-05-04 20:57:42.689419	2025-05-04 20:57:42.689419	active	general	{}
2	1	Comment calculer un préavis de départ pour un loca...	2025-05-04 22:39:16.001289	2025-05-04 20:39:16.016	active	general	{}
3	1	gfg	2025-05-05 02:04:18.350112	2025-05-05 00:04:18.368	active	general	{}
\.


--
-- TOC entry 5834 (class 0 OID 19283)
-- Dependencies: 283
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
1	1	user	Comment calculer un préavis de départ pour un locataire ?	{}	2	2025-05-04 22:39:16.009931	f	huggingface	huggingface
2	1	assistant	La gestion des locataires est facilitée par notre plateforme. Vous pouvez consulter les profils des locataires, accéder à leurs informations de contact et à l'historique des communications dans l'onglet 'Locataires'.	{}	2	2025-05-04 22:39:16.319889	f	huggingface	huggingface
3	1	user	gfg	{}	3	2025-05-05 02:04:18.362823	f	huggingface	huggingface
4	1	assistant	Une erreur s'est produite lors de la génération de la réponse. Veuillez réessayer plus tard.	{}	3	2025-05-05 02:04:18.980344	f	huggingface	huggingface
\.


--
-- TOC entry 5836 (class 0 OID 19312)
-- Dependencies: 285
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 5777 (class 0 OID 17090)
-- Dependencies: 226
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, title, description, "userId", type, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5802 (class 0 OID 17776)
-- Dependencies: 251
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5796 (class 0 OID 17609)
-- Dependencies: 245
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5816 (class 0 OID 18448)
-- Dependencies: 265
-- Data for Name: billing_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_transactions (id, user_id, amount, description, status, payment_method, transaction_date, next_billing_date, metadata) FROM stdin;
1	1	9.99	Abonnement Premium	completed	\N	2025-04-01 20:51:22.968368	\N	\N
2	1	9.99	Renouvellement abonnement Premium	completed	\N	2025-04-30 20:51:22.968368	\N	\N
\.


--
-- TOC entry 5828 (class 0 OID 19148)
-- Dependencies: 277
-- Data for Name: company_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
1	1	Votre Entreprise	123 Rue Exemple, 75000 Paris	01 23 45 67 89	contact@votreentreprise.com	www.votreentreprise.com	123 456 789 00012	2025-05-04 04:18:46.578071	2025-05-04 04:18:46.578071
\.


--
-- TOC entry 5800 (class 0 OID 17727)
-- Dependencies: 249
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_parties (id, contract_id, party_id, party_type, created_at) FROM stdin;
1	6	8	tenant	2025-04-09 16:38:17.199
\.


--
-- TOC entry 5798 (class 0 OID 17701)
-- Dependencies: 247
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
6	la parlerne	rental	draft	2025-04-11 22:00:00	2025-04-17 22:00:00	1	\N	t	t	\N	\N	2025-04-09 16:38:17.184	2025-04-09 16:38:17.184
\.


--
-- TOC entry 5780 (class 0 OID 17231)
-- Dependencies: 229
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5782 (class 0 OID 17259)
-- Dependencies: 231
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5784 (class 0 OID 17268)
-- Dependencies: 233
-- Data for Name: folders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
1	vbnbnbn	\N	2	2025-04-03 20:59:06.646	2025-04-03 20:59:06.646
\.


--
-- TOC entry 5812 (class 0 OID 18206)
-- Dependencies: 261
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 5810 (class 0 OID 18187)
-- Dependencies: 259
-- Data for Name: form_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at) FROM stdin;
1	2	test_field	text	Champ de Test	t	0	2025-04-28 02:18:20.822962	2025-04-28 02:18:20.822962
2	3	test_field	text	Champ de Test	t	0	2025-04-28 02:18:20.822962	2025-04-28 02:18:20.822962
\.


--
-- TOC entry 5806 (class 0 OID 18013)
-- Dependencies: 255
-- Data for Name: forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 5808 (class 0 OID 18144)
-- Dependencies: 257
-- Data for Name: links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style) FROM stdin;
6	3	tdfgdfg		\N	t	5	1	f	\N	\N	\N	form	[{"id": "1746029730247", "type": "text", "label": "dfgdfg", "options": [], "required": false}]	2025-04-30 16:15:35.545	2025-05-04 12:16:27.696	\N
5	3	dfdf		\N	t	13	0	f	\N	\N	\N	form	[{"id": "1745968701599", "type": "text", "label": "fdf", "options": [], "required": false}]	2025-04-29 23:18:36.86	2025-05-04 12:18:42.853	\N
3	1	bn,bn,		\N	t	1	1	f	\N	\N	\N	form	[{"id": "1745788013405", "type": "text", "label": "bn,bn,", "options": [], "required": false}]	2025-04-27 21:07:00.216	2025-04-28 11:18:03.335	\N
4	1	Nouvelle maison 120 m2	https://facebook.com	\N	t	1	2	f	\N	\N	\N	link	\N	2025-04-28 11:01:01.514	2025-04-28 11:18:19.807	\N
2	1	teste		\N	t	16	0	f	\N	\N	\N	form	[{"id": "1745781530029", "type": "text", "label": "t", "required": false}, {"id": "1745781531297", "type": "text", "label": "e", "required": false}, {"id": "1745781531567", "type": "text", "label": "z", "required": false}]	2025-04-27 19:19:05.843	2025-04-28 11:18:30.948	\N
\.


--
-- TOC entry 5775 (class 0 OID 17055)
-- Dependencies: 224
-- Data for Name: maintenance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5786 (class 0 OID 17287)
-- Dependencies: 235
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, related_to, related_id, is_read, created_at) FROM stdin;
\.


--
-- TOC entry 5822 (class 0 OID 19102)
-- Dependencies: 271
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
1	1	Configuration standard	portrait	A4	20	10	20	10	t	t	t	t	t	2025-05-04 04:18:46.578071	2025-05-04 04:41:10.008351	#f3f4f6	#f9fafb	25	Rapport	Helvetica	10	1	#4f46e5	\N	0.1	t	\N	t	1	t	30	20
\.


--
-- TOC entry 5820 (class 0 OID 19002)
-- Dependencies: 269
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page) FROM stdin;
13	3	visits	t	0	2025-05-04 02:47:35.221994	2025-05-04 02:47:35.221994	{visitor,datetime,type,property,status,email,phone}	Liste des visites	#4B70E2	#000000	#F5F5FF	10
14	3	tenants	t	0	2025-05-04 02:47:35.221994	2025-05-04 02:47:35.221994	{name,property,lease_type,lease_start,lease_end,rent,status,email,phone}	Liste des locataires	#4B70E2	#000000	#F5F5FF	10
15	3	maintenance	t	0	2025-05-04 02:47:35.221994	2025-05-04 02:47:35.221994	{date,property,title,description,reporter,cost,priority,status}	Suivi de maintenance	#4B70E2	#000000	#F5F5FF	10
16	3	transactions	t	0	2025-05-04 02:47:35.221994	2025-05-04 02:47:35.221994	{date,property,description,category,type,method,amount}	Transactions financières	#4B70E2	#000000	#F5F5FF	10
17	2	visits	t	0	2025-05-04 02:47:51.725644	2025-05-04 02:47:51.725644	{visitor,datetime,type,property,status,email,phone}	Liste des visites	#4B70E2	#000000	#F5F5FF	10
18	2	tenants	t	0	2025-05-04 02:47:51.725644	2025-05-04 02:47:51.725644	{name,property,lease_type,lease_start,lease_end,rent,status,email,phone}	Liste des locataires	#4B70E2	#000000	#F5F5FF	10
19	2	maintenance	t	0	2025-05-04 02:47:51.725644	2025-05-04 02:47:51.725644	{date,property,title,description,reporter,cost,priority,status}	Suivi de maintenance	#4B70E2	#000000	#F5F5FF	10
20	2	transactions	t	0	2025-05-04 02:47:51.725644	2025-05-04 02:47:51.725644	{date,property,description,category,type,method,amount}	Transactions financières	#4B70E2	#000000	#F5F5FF	10
22	4	visits	t	0	2025-05-04 03:37:35.741198	2025-05-04 03:37:35.741198	{visitor,datetime,type,property,status,email,phone}	Liste des visites	#4B70E2	#000000	#F5F5FF	10
23	4	tenants	t	0	2025-05-04 03:37:35.741198	2025-05-04 03:37:35.741198	{name,property,lease_type,lease_start,lease_end,rent,status,email,phone}	Liste des locataires	#4B70E2	#000000	#F5F5FF	10
24	4	maintenance	t	0	2025-05-04 03:37:35.741198	2025-05-04 03:37:35.741198	{date,property,title,description,reporter,cost,priority,status}	Suivi de maintenance	#4B70E2	#000000	#F5F5FF	10
25	4	transactions	t	0	2025-05-04 03:37:35.741198	2025-05-04 03:37:35.741198	{date,property,description,category,type,method,amount}	Transactions financières	#4B70E2	#000000	#F5F5FF	10
\.


--
-- TOC entry 5824 (class 0 OID 19122)
-- Dependencies: 273
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
1	1	Logo principal	data:image/png;base64,VOTRE_IMAGE_EN_BASE64	120	80	t	2025-05-04 04:18:46.578071	2025-05-04 04:18:46.578071
\.


--
-- TOC entry 5826 (class 0 OID 19136)
-- Dependencies: 275
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment) FROM stdin;
1	Template visites standard	visite	[{"key": "visitor", "label": "Visiteur"}, {"key": "datetime", "label": "Date et heure"}, {"key": "property", "label": "Propriété"}, {"key": "contact", "label": "Contact"}, {"key": "type", "label": "Type"}, {"key": "status", "label": "Statut"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des visite	solid	1	8	left
2	Template locataires standard	locataires	[{"key": "fullName", "label": "Nom complet"}, {"key": "property", "label": "Propriété"}, {"key": "leaseStart", "label": "Début du bail"}, {"key": "leaseEnd", "label": "Fin du bail"}, {"key": "rentAmount", "label": "Montant du loyer"}, {"key": "status", "label": "Statut"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des locataires	solid	1	8	left
3	Template maintenance standard	maintenance	[{"key": "title", "label": "Problème"}, {"key": "property", "label": "Propriété"}, {"key": "reportedDate", "label": "Date signalée"}, {"key": "priority", "label": "Priorité"}, {"key": "status", "label": "Statut"}, {"key": "cost", "label": "Coût"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des maintenance	solid	1	8	left
4	Template transactions standard	transactions	[{"key": "date", "label": "Date"}, {"key": "property", "label": "Propriété"}, {"key": "description", "label": "Description"}, {"key": "amount", "label": "Montant"}, {"key": "category", "label": "Catégorie"}, {"key": "type", "label": "Type"}, {"key": "status", "label": "Statut"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des transactions	solid	1	8	left
\.


--
-- TOC entry 5830 (class 0 OID 19190)
-- Dependencies: 279
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at) FROM stdin;
1	Classique Bleu	#e6f0ff	#f8fafc	#333333	#cbd5e1	#4f46e5	#ffffff	Helvetica	t	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
2	Moderne Sombre	#1e293b	#334155	#f8fafc	#475569	#06b6d4	#ffffff	Helvetica	f	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
3	Minimaliste	#f9fafb	#ffffff	#111827	#e5e7eb	#4b5563	#ffffff	Helvetica	f	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
4	Coloré	#fef3c7	#fef9e7	#1e293b	#fde68a	#ea580c	#ffffff	Helvetica	f	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
\.


--
-- TOC entry 5788 (class 0 OID 17301)
-- Dependencies: 237
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5790 (class 0 OID 17310)
-- Dependencies: 239
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 5794 (class 0 OID 17597)
-- Dependencies: 243
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5779 (class 0 OID 17102)
-- Dependencies: 228
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5837 (class 0 OID 27055)
-- Dependencies: 286
-- Data for Name: schema_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_mapping (schema_name, user_id, created_at) FROM stdin;
client_31	31	2025-05-06 20:30:12.391884
\.


--
-- TOC entry 5818 (class 0 OID 18577)
-- Dependencies: 267
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, session_id, ip_address, user_agent, payload, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5881 (class 0 OID 27727)
-- Dependencies: 344
-- Data for Name: storage_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_plans (id, name, description, storage_limit, price_monthly, price_yearly, is_active, features, created_at, updated_at) FROM stdin;
1	Gratuit	Plan gratuit avec stockage limité	536870912	0.00	0.00	t	{"max_properties": 3, "image_enhancement": false}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	Standard	Plan standard pour les propriétaires	5368709120	9.99	99.99	t	{"max_properties": 15, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	Professionnel	Plan avancé pour les professionnels	53687091200	29.99	299.99	t	{"ai_assistant": true, "max_properties": -1, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 5883 (class 0 OID 27739)
-- Dependencies: 346
-- Data for Name: storage_quotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_quotas (id, resource_type, size_limit, count_limit, applies_to, created_at, updated_at) FROM stdin;
1	document	10485760	50	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	image	5242880	20	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	document	52428800	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
4	image	20971520	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 5814 (class 0 OID 18224)
-- Dependencies: 263
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 5804 (class 0 OID 17811)
-- Dependencies: 253
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
-- TOC entry 5773 (class 0 OID 16853)
-- Dependencies: 222
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, full_name, email, phone_number, role, profile_image, archived, account_type, parent_account_id, settings, created_at, updated_at, is_premium, request_count, request_limit, preferred_ai_model, storage_used, storage_limit, storage_tier) FROM stdin;
31	testclient	b4bff05682eb0cb5620366a1f7463287963d83bc67599fc803993e819bcc76594e21458d5fd655e0506f3c10eb09eae58e3e57c89004523c8c49e94462849be1.80071a1f1e613d6245b18977fe0c7815	Test Client	testclient@example.com	\N	clients	\N	f	individual	\N	{"postgres_role": "client_role_31"}	2025-05-06 19:32:14.823485	2025-05-06 19:32:14.823485	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
1	testuser	b4bff05682eb0cb5620366a1f7463287963d83bc67599fc803993e819bcc76594e21458d5fd655e0506f3c10eb09eae58e3e57c89004523c8c49e94462849be1.80071a1f1e613d6245b18977fe0c7815	Utilisateur Test	test@example.com	\N	admin	\N	f	individual	\N	{}	2025-04-01 17:13:46.736	2025-05-05 21:18:52.353256	f	0	100	openai-gpt-4o	0.00	5368709120.00	basic
22	admin	$2a$10$EWF7KifLiKnaVLY2FvB/nudA93JYtinqdXFmUDlQNSm6VH0uZ.s9S	Administrateur	admin@example.com	\N	admin	\N	f	individual	\N	{}	2025-04-29 01:22:34.079632	2025-05-05 21:18:52.21245	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
\.


--
-- TOC entry 5845 (class 0 OID 27313)
-- Dependencies: 294
-- Data for Name: documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5855 (class 0 OID 27437)
-- Dependencies: 308
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5889 (class 0 OID 27826)
-- Dependencies: 353
-- Data for Name: form_responses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 5857 (class 0 OID 27458)
-- Dependencies: 310
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5887 (class 0 OID 27774)
-- Dependencies: 351
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5853 (class 0 OID 27414)
-- Dependencies: 306
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5839 (class 0 OID 27265)
-- Dependencies: 288
-- Data for Name: properties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5869 (class 0 OID 27565)
-- Dependencies: 322
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5867 (class 0 OID 27549)
-- Dependencies: 320
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5863 (class 0 OID 27515)
-- Dependencies: 316
-- Data for Name: property_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5865 (class 0 OID 27532)
-- Dependencies: 318
-- Data for Name: property_works; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5885 (class 0 OID 27750)
-- Dependencies: 348
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 5859 (class 0 OID 27479)
-- Dependencies: 312
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5861 (class 0 OID 27498)
-- Dependencies: 314
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5841 (class 0 OID 27276)
-- Dependencies: 290
-- Data for Name: tenants; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5843 (class 0 OID 27292)
-- Dependencies: 292
-- Data for Name: transactions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5851 (class 0 OID 27398)
-- Dependencies: 304
-- Data for Name: visits; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.visits (id, property_id, visitor_name, visitor_email, visitor_phone, visit_date, status, notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6080 (class 0 OID 0)
-- Dependencies: 280
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_conversations_id_seq', 3, true);


--
-- TOC entry 6081 (class 0 OID 0)
-- Dependencies: 282
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_messages_id_seq', 4, true);


--
-- TOC entry 6082 (class 0 OID 0)
-- Dependencies: 284
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 6083 (class 0 OID 0)
-- Dependencies: 225
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_id_seq', 1, false);


--
-- TOC entry 6084 (class 0 OID 0)
-- Dependencies: 250
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.analysis_configs_id_seq', 1, false);


--
-- TOC entry 6085 (class 0 OID 0)
-- Dependencies: 244
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 6086 (class 0 OID 0)
-- Dependencies: 264
-- Name: billing_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_transactions_id_seq', 2, true);


--
-- TOC entry 6087 (class 0 OID 0)
-- Dependencies: 276
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_info_id_seq', 1, true);


--
-- TOC entry 6088 (class 0 OID 0)
-- Dependencies: 248
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contract_parties_id_seq', 1, true);


--
-- TOC entry 6089 (class 0 OID 0)
-- Dependencies: 246
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contracts_id_seq', 6, true);


--
-- TOC entry 6090 (class 0 OID 0)
-- Dependencies: 230
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_templates_id_seq', 1, false);


--
-- TOC entry 6091 (class 0 OID 0)
-- Dependencies: 232
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.financial_entries_id_seq', 1, false);


--
-- TOC entry 6092 (class 0 OID 0)
-- Dependencies: 234
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.folders_id_seq', 1, true);


--
-- TOC entry 6093 (class 0 OID 0)
-- Dependencies: 260
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_field_options_id_seq', 1, false);


--
-- TOC entry 6094 (class 0 OID 0)
-- Dependencies: 258
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_fields_id_seq', 2, true);


--
-- TOC entry 6095 (class 0 OID 0)
-- Dependencies: 254
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.forms_id_seq', 1, false);


--
-- TOC entry 6096 (class 0 OID 0)
-- Dependencies: 256
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.links_id_seq', 6, true);


--
-- TOC entry 6097 (class 0 OID 0)
-- Dependencies: 223
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_id_seq', 1, false);


--
-- TOC entry 6098 (class 0 OID 0)
-- Dependencies: 236
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 6099 (class 0 OID 0)
-- Dependencies: 270
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_configuration_id_seq', 1, true);


--
-- TOC entry 6100 (class 0 OID 0)
-- Dependencies: 268
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_document_preferences_id_seq', 25, true);


--
-- TOC entry 6101 (class 0 OID 0)
-- Dependencies: 272
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_logos_id_seq', 1, true);


--
-- TOC entry 6102 (class 0 OID 0)
-- Dependencies: 274
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_templates_id_seq', 4, true);


--
-- TOC entry 6103 (class 0 OID 0)
-- Dependencies: 278
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_themes_id_seq', 4, true);


--
-- TOC entry 6104 (class 0 OID 0)
-- Dependencies: 238
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 6105 (class 0 OID 0)
-- Dependencies: 240
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 6106 (class 0 OID 0)
-- Dependencies: 242
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rent_receipts_id_seq', 1, false);


--
-- TOC entry 6107 (class 0 OID 0)
-- Dependencies: 227
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- TOC entry 6108 (class 0 OID 0)
-- Dependencies: 266
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- TOC entry 6109 (class 0 OID 0)
-- Dependencies: 343
-- Name: storage_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_plans_id_seq', 3, true);


--
-- TOC entry 6110 (class 0 OID 0)
-- Dependencies: 345
-- Name: storage_quotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_quotas_id_seq', 4, true);


--
-- TOC entry 6111 (class 0 OID 0)
-- Dependencies: 262
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 6112 (class 0 OID 0)
-- Dependencies: 252
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 44, true);


--
-- TOC entry 6113 (class 0 OID 0)
-- Dependencies: 241
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 31, true);


--
-- TOC entry 6114 (class 0 OID 0)
-- Dependencies: 293
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.documents_id_seq', 1, false);


--
-- TOC entry 6115 (class 0 OID 0)
-- Dependencies: 307
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.feedbacks_id_seq', 1, false);


--
-- TOC entry 6116 (class 0 OID 0)
-- Dependencies: 309
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_submissions_id_seq', 1, false);


--
-- TOC entry 6117 (class 0 OID 0)
-- Dependencies: 305
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_requests_id_seq', 1, false);


--
-- TOC entry 6118 (class 0 OID 0)
-- Dependencies: 287
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.properties_id_seq', 1, false);


--
-- TOC entry 6119 (class 0 OID 0)
-- Dependencies: 321
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_analyses_id_seq', 1, false);


--
-- TOC entry 6120 (class 0 OID 0)
-- Dependencies: 319
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_coordinates_id_seq', 1, false);


--
-- TOC entry 6121 (class 0 OID 0)
-- Dependencies: 315
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_history_id_seq', 1, false);


--
-- TOC entry 6122 (class 0 OID 0)
-- Dependencies: 317
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_works_id_seq', 1, false);


--
-- TOC entry 6123 (class 0 OID 0)
-- Dependencies: 347
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.storage_usage_id_seq', 1, false);


--
-- TOC entry 6124 (class 0 OID 0)
-- Dependencies: 311
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_documents_id_seq', 1, false);


--
-- TOC entry 6125 (class 0 OID 0)
-- Dependencies: 313
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_history_id_seq', 1, false);


--
-- TOC entry 6126 (class 0 OID 0)
-- Dependencies: 289
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenants_id_seq', 1, false);


--
-- TOC entry 6127 (class 0 OID 0)
-- Dependencies: 291
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transactions_id_seq', 1, false);


--
-- TOC entry 6128 (class 0 OID 0)
-- Dependencies: 303
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.visits_id_seq', 1, false);


--
-- TOC entry 5507 (class 2606 OID 27377)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5533 (class 2606 OID 27611)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5569 (class 2606 OID 27844)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5535 (class 2606 OID 27621)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5561 (class 2606 OID 27823)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5563 (class 2606 OID 27825)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5531 (class 2606 OID 27601)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5501 (class 2606 OID 27347)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5547 (class 2606 OID 27682)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5545 (class 2606 OID 27672)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5541 (class 2606 OID 27651)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5543 (class 2606 OID 27662)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5555 (class 2606 OID 27767)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5537 (class 2606 OID 27629)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5539 (class 2606 OID 27640)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5503 (class 2606 OID 27357)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5505 (class 2606 OID 27367)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5529 (class 2606 OID 27589)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_31; Owner: postgres
--

ALTER TABLE ONLY client_31.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5474 (class 2606 OID 19275)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5479 (class 2606 OID 19297)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5484 (class 2606 OID 19324)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 5386 (class 2606 OID 17100)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 5421 (class 2606 OID 17782)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5413 (class 2606 OID 17620)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5448 (class 2606 OID 18456)
-- Name: billing_transactions billing_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5470 (class 2606 OID 19157)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 5419 (class 2606 OID 17736)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5417 (class 2606 OID 17715)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5390 (class 2606 OID 17408)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5392 (class 2606 OID 17414)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5394 (class 2606 OID 17416)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5443 (class 2606 OID 18213)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5438 (class 2606 OID 18199)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 5440 (class 2606 OID 18197)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5429 (class 2606 OID 18021)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5431 (class 2606 OID 18023)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 5436 (class 2606 OID 18158)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 5384 (class 2606 OID 17065)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 5400 (class 2606 OID 17420)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5464 (class 2606 OID 19120)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 5460 (class 2606 OID 19014)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 5462 (class 2606 OID 19012)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5466 (class 2606 OID 19134)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 5468 (class 2606 OID 19146)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5472 (class 2606 OID 19203)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 5402 (class 2606 OID 17424)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 5404 (class 2606 OID 17426)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5406 (class 2606 OID 17607)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5388 (class 2606 OID 17111)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5491 (class 2606 OID 27062)
-- Name: schema_mapping schema_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_pkey PRIMARY KEY (schema_name);


--
-- TOC entry 5455 (class 2606 OID 18586)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5457 (class 2606 OID 18588)
-- Name: sessions sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_id_key UNIQUE (session_id);


--
-- TOC entry 5549 (class 2606 OID 27737)
-- Name: storage_plans storage_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans
    ADD CONSTRAINT storage_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 5551 (class 2606 OID 27748)
-- Name: storage_quotas storage_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas
    ADD CONSTRAINT storage_quotas_pkey PRIMARY KEY (id);


--
-- TOC entry 5446 (class 2606 OID 18232)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5427 (class 2606 OID 17828)
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5381 (class 2606 OID 16868)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5499 (class 2606 OID 27322)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5513 (class 2606 OID 27446)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5566 (class 2606 OID 27834)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5515 (class 2606 OID 27467)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5557 (class 2606 OID 27797)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5559 (class 2606 OID 27799)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5511 (class 2606 OID 27425)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5493 (class 2606 OID 27274)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5527 (class 2606 OID 27574)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5525 (class 2606 OID 27558)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5521 (class 2606 OID 27525)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5523 (class 2606 OID 27542)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5553 (class 2606 OID 27758)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5517 (class 2606 OID 27486)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5519 (class 2606 OID 27508)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5495 (class 2606 OID 27285)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5497 (class 2606 OID 27301)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5509 (class 2606 OID 27407)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5567 (class 1259 OID 27845)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_31; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_31.form_responses USING btree (form_id);


--
-- TOC entry 5475 (class 1259 OID 19346)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON public.ai_conversations USING btree (user_id);


--
-- TOC entry 5477 (class 1259 OID 19345)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON public.ai_messages USING btree (conversation_id);


--
-- TOC entry 5485 (class 1259 OID 19348)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON public.ai_suggestions USING btree (property_id);


--
-- TOC entry 5486 (class 1259 OID 19347)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON public.ai_suggestions USING btree (user_id);


--
-- TOC entry 5411 (class 1259 OID 17651)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON public.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 5414 (class 1259 OID 17652)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON public.automatic_reminders USING btree (status);


--
-- TOC entry 5415 (class 1259 OID 17650)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON public.automatic_reminders USING btree (user_id);


--
-- TOC entry 5476 (class 1259 OID 19281)
-- Name: idx_ai_conversations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations USING btree (user_id);


--
-- TOC entry 5480 (class 1259 OID 19309)
-- Name: idx_ai_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id);


--
-- TOC entry 5481 (class 1259 OID 19310)
-- Name: idx_ai_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_messages_created_at ON public.ai_messages USING btree (created_at);


--
-- TOC entry 5482 (class 1259 OID 19308)
-- Name: idx_ai_messages_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_messages_user_id ON public.ai_messages USING btree (user_id);


--
-- TOC entry 5487 (class 1259 OID 19336)
-- Name: idx_ai_suggestions_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_suggestions_property_id ON public.ai_suggestions USING btree (property_id);


--
-- TOC entry 5488 (class 1259 OID 19337)
-- Name: idx_ai_suggestions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_suggestions_type ON public.ai_suggestions USING btree (type);


--
-- TOC entry 5489 (class 1259 OID 19335)
-- Name: idx_ai_suggestions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions USING btree (user_id);


--
-- TOC entry 5422 (class 1259 OID 17795)
-- Name: idx_analysis_configs_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analysis_configs_property_id ON public.analysis_configs USING btree (property_id);


--
-- TOC entry 5423 (class 1259 OID 17796)
-- Name: idx_analysis_configs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analysis_configs_user_id ON public.analysis_configs USING btree (user_id);


--
-- TOC entry 5449 (class 1259 OID 18463)
-- Name: idx_billing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_status ON public.billing_transactions USING btree (status);


--
-- TOC entry 5450 (class 1259 OID 18462)
-- Name: idx_billing_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_user_id ON public.billing_transactions USING btree (user_id);


--
-- TOC entry 5441 (class 1259 OID 18219)
-- Name: idx_form_fields_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_fields_link_id ON public.form_fields USING btree (link_id);


--
-- TOC entry 5432 (class 1259 OID 18039)
-- Name: idx_forms_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forms_user_id ON public.forms USING btree (user_id);


--
-- TOC entry 5433 (class 1259 OID 18179)
-- Name: idx_links_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_links_profile_id ON public.links USING btree (profile_id);


--
-- TOC entry 5434 (class 1259 OID 18180)
-- Name: idx_links_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_links_type ON public.links USING btree (type);


--
-- TOC entry 5395 (class 1259 OID 18248)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- TOC entry 5396 (class 1259 OID 18247)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 5397 (class 1259 OID 18246)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- TOC entry 5398 (class 1259 OID 18245)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 5458 (class 1259 OID 19020)
-- Name: idx_pdf_document_prefs_config_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pdf_document_prefs_config_id ON public.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 5451 (class 1259 OID 18601)
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- TOC entry 5452 (class 1259 OID 18600)
-- Name: idx_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_session_id ON public.sessions USING btree (session_id);


--
-- TOC entry 5453 (class 1259 OID 18599)
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- TOC entry 5444 (class 1259 OID 18243)
-- Name: idx_transaction_attachments_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_attachments_transaction_id ON public.transaction_attachments USING btree (transaction_id);


--
-- TOC entry 5424 (class 1259 OID 17835)
-- Name: idx_user_notification_settings_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_type ON public.user_notification_settings USING btree (type);


--
-- TOC entry 5425 (class 1259 OID 17834)
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- TOC entry 5379 (class 1259 OID 19350)
-- Name: idx_users_preferred_ai_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_preferred_ai_model ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 5407 (class 1259 OID 17647)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON public.rent_receipts USING btree (property_id);


--
-- TOC entry 5408 (class 1259 OID 17649)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON public.rent_receipts USING btree (status);


--
-- TOC entry 5409 (class 1259 OID 17646)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON public.rent_receipts USING btree (tenant_id);


--
-- TOC entry 5410 (class 1259 OID 17648)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON public.rent_receipts USING btree (transaction_id);


--
-- TOC entry 5382 (class 1259 OID 19349)
-- Name: users_preferred_ai_model_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_preferred_ai_model_idx ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 5564 (class 1259 OID 27835)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON template.form_responses USING btree (form_id);


--
-- TOC entry 5607 (class 2620 OID 19211)
-- Name: pdf_configuration sync_theme_on_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_theme_on_update BEFORE UPDATE ON public.pdf_configuration FOR EACH ROW WHEN ((new.theme_id IS DISTINCT FROM old.theme_id)) EXECUTE FUNCTION public.sync_theme_colors();


--
-- TOC entry 5605 (class 2620 OID 27336)
-- Name: users trg_create_client_schema; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_create_client_schema AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_schema_for_new_client();


--
-- TOC entry 5611 (class 2620 OID 19162)
-- Name: company_info update_company_info_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_company_info_timestamp BEFORE UPDATE ON public.company_info FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5608 (class 2620 OID 19159)
-- Name: pdf_configuration update_pdf_configuration_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_configuration_timestamp BEFORE UPDATE ON public.pdf_configuration FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5606 (class 2620 OID 19021)
-- Name: pdf_document_preferences update_pdf_document_preferences_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_document_preferences_timestamp BEFORE UPDATE ON public.pdf_document_preferences FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5609 (class 2620 OID 19160)
-- Name: pdf_logos update_pdf_logos_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_logos_timestamp BEFORE UPDATE ON public.pdf_logos FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5610 (class 2620 OID 19161)
-- Name: pdf_templates update_pdf_templates_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_templates_timestamp BEFORE UPDATE ON public.pdf_templates FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5612 (class 2620 OID 19204)
-- Name: pdf_themes update_pdf_themes_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_themes_timestamp BEFORE UPDATE ON public.pdf_themes FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5581 (class 2606 OID 19276)
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5582 (class 2606 OID 19303)
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5583 (class 2606 OID 19298)
-- Name: ai_messages ai_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5584 (class 2606 OID 19325)
-- Name: ai_suggestions ai_suggestions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions
    ADD CONSTRAINT ai_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5574 (class 2606 OID 17788)
-- Name: analysis_configs analysis_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_configs
    ADD CONSTRAINT analysis_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5572 (class 2606 OID 17641)
-- Name: automatic_reminders automatic_reminders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automatic_reminders
    ADD CONSTRAINT automatic_reminders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5578 (class 2606 OID 18457)
-- Name: billing_transactions billing_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5573 (class 2606 OID 17737)
-- Name: contract_parties contract_parties_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_parties
    ADD CONSTRAINT contract_parties_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 5570 (class 2606 OID 17464)
-- Name: document_templates document_templates_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5571 (class 2606 OID 18249)
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5580 (class 2606 OID 19205)
-- Name: pdf_configuration fk_theme; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_configuration
    ADD CONSTRAINT fk_theme FOREIGN KEY (theme_id) REFERENCES public.pdf_themes(id);


--
-- TOC entry 5577 (class 2606 OID 18214)
-- Name: form_field_options form_field_options_form_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_field_options
    ADD CONSTRAINT form_field_options_form_field_id_fkey FOREIGN KEY (form_field_id) REFERENCES public.form_fields(id) ON DELETE CASCADE;


--
-- TOC entry 5576 (class 2606 OID 18200)
-- Name: form_fields form_fields_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;


--
-- TOC entry 5585 (class 2606 OID 27063)
-- Name: schema_mapping schema_mapping_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5579 (class 2606 OID 18589)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5575 (class 2606 OID 17829)
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5589 (class 2606 OID 27323)
-- Name: documents documents_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5590 (class 2606 OID 27328)
-- Name: documents documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5594 (class 2606 OID 27452)
-- Name: feedbacks feedbacks_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5595 (class 2606 OID 27447)
-- Name: feedbacks feedbacks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5596 (class 2606 OID 27468)
-- Name: form_submissions form_submissions_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5597 (class 2606 OID 27473)
-- Name: form_submissions form_submissions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5592 (class 2606 OID 27426)
-- Name: maintenance_requests maintenance_requests_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5593 (class 2606 OID 27431)
-- Name: maintenance_requests maintenance_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5604 (class 2606 OID 27575)
-- Name: property_analyses property_analyses_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5603 (class 2606 OID 27559)
-- Name: property_coordinates property_coordinates_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5601 (class 2606 OID 27526)
-- Name: property_history property_history_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5602 (class 2606 OID 27543)
-- Name: property_works property_works_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5598 (class 2606 OID 27492)
-- Name: tenant_documents tenant_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES template.documents(id);


--
-- TOC entry 5599 (class 2606 OID 27487)
-- Name: tenant_documents tenant_documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5600 (class 2606 OID 27509)
-- Name: tenant_history tenant_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5586 (class 2606 OID 27286)
-- Name: tenants tenants_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5587 (class 2606 OID 27302)
-- Name: transactions transactions_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5588 (class 2606 OID 27307)
-- Name: transactions transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5591 (class 2606 OID 27408)
-- Name: visits visits_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits
    ADD CONSTRAINT visits_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5896 (class 0 OID 0)
-- Dependencies: 8
-- Name: SCHEMA client_31; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA client_31 TO client_role_31;


--
-- TOC entry 5897 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO clients;
GRANT USAGE ON SCHEMA public TO client_role_31;


--
-- TOC entry 5899 (class 0 OID 0)
-- Dependencies: 406
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea) TO clients;


--
-- TOC entry 5900 (class 0 OID 0)
-- Dependencies: 407
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO clients;


--
-- TOC entry 5901 (class 0 OID 0)
-- Dependencies: 410
-- Name: FUNCTION check_auth(p_username text, p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_auth(p_username text, p_password text) TO clients;


--
-- TOC entry 5902 (class 0 OID 0)
-- Dependencies: 383
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.crypt(text, text) TO clients;


--
-- TOC entry 5903 (class 0 OID 0)
-- Dependencies: 408
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dearmor(text) TO clients;


--
-- TOC entry 5904 (class 0 OID 0)
-- Dependencies: 380
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 5905 (class 0 OID 0)
-- Dependencies: 391
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 5906 (class 0 OID 0)
-- Dependencies: 386
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(bytea, text) TO clients;


--
-- TOC entry 5907 (class 0 OID 0)
-- Dependencies: 376
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(text, text) TO clients;


--
-- TOC entry 5908 (class 0 OID 0)
-- Dependencies: 377
-- Name: FUNCTION enable_rls_on_table(table_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enable_rls_on_table(table_name text) TO clients;


--
-- TOC entry 5909 (class 0 OID 0)
-- Dependencies: 390
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 5910 (class 0 OID 0)
-- Dependencies: 381
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 5911 (class 0 OID 0)
-- Dependencies: 392
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO clients;


--
-- TOC entry 5912 (class 0 OID 0)
-- Dependencies: 393
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_uuid() TO clients;


--
-- TOC entry 5913 (class 0 OID 0)
-- Dependencies: 384
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text) TO clients;


--
-- TOC entry 5914 (class 0 OID 0)
-- Dependencies: 389
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO clients;


--
-- TOC entry 5915 (class 0 OID 0)
-- Dependencies: 382
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO clients;


--
-- TOC entry 5916 (class 0 OID 0)
-- Dependencies: 387
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(text, text, text) TO clients;


--
-- TOC entry 5917 (class 0 OID 0)
-- Dependencies: 379
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO clients;


--
-- TOC entry 5919 (class 0 OID 0)
-- Dependencies: 412
-- Name: FUNCTION log_table_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_table_changes() TO clients;


--
-- TOC entry 5920 (class 0 OID 0)
-- Dependencies: 409
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO clients;


--
-- TOC entry 5921 (class 0 OID 0)
-- Dependencies: 405
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO clients;


--
-- TOC entry 5922 (class 0 OID 0)
-- Dependencies: 367
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO clients;


--
-- TOC entry 5923 (class 0 OID 0)
-- Dependencies: 369
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 5924 (class 0 OID 0)
-- Dependencies: 371
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO clients;


--
-- TOC entry 5925 (class 0 OID 0)
-- Dependencies: 368
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 5926 (class 0 OID 0)
-- Dependencies: 370
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 5927 (class 0 OID 0)
-- Dependencies: 372
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO clients;


--
-- TOC entry 5928 (class 0 OID 0)
-- Dependencies: 403
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO clients;


--
-- TOC entry 5929 (class 0 OID 0)
-- Dependencies: 373
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO clients;


--
-- TOC entry 5930 (class 0 OID 0)
-- Dependencies: 404
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 5931 (class 0 OID 0)
-- Dependencies: 374
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 5932 (class 0 OID 0)
-- Dependencies: 399
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO clients;


--
-- TOC entry 5933 (class 0 OID 0)
-- Dependencies: 401
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO clients;


--
-- TOC entry 5934 (class 0 OID 0)
-- Dependencies: 400
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 5935 (class 0 OID 0)
-- Dependencies: 402
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 5936 (class 0 OID 0)
-- Dependencies: 394
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO clients;


--
-- TOC entry 5937 (class 0 OID 0)
-- Dependencies: 397
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO clients;


--
-- TOC entry 5938 (class 0 OID 0)
-- Dependencies: 396
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 5939 (class 0 OID 0)
-- Dependencies: 398
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 5940 (class 0 OID 0)
-- Dependencies: 388
-- Name: FUNCTION recalculate_user_storage(user_id_param integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recalculate_user_storage(user_id_param integer) TO clients;


--
-- TOC entry 5941 (class 0 OID 0)
-- Dependencies: 411
-- Name: FUNCTION set_app_variables(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_app_variables() TO clients;


--
-- TOC entry 5942 (class 0 OID 0)
-- Dependencies: 385
-- Name: FUNCTION sync_theme_colors(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_theme_colors() TO clients;


--
-- TOC entry 5943 (class 0 OID 0)
-- Dependencies: 375
-- Name: FUNCTION test_rls_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.test_rls_config() TO clients;


--
-- TOC entry 5944 (class 0 OID 0)
-- Dependencies: 366
-- Name: FUNCTION update_modified_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_modified_column() TO clients;


--
-- TOC entry 5945 (class 0 OID 0)
-- Dependencies: 395
-- Name: FUNCTION update_storage_on_document_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_storage_on_document_change() TO clients;


--
-- TOC entry 5946 (class 0 OID 0)
-- Dependencies: 378
-- Name: FUNCTION update_user_storage_quota(p_user_id integer, p_extension_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_storage_quota(p_user_id integer, p_extension_id integer) TO clients;


--
-- TOC entry 5948 (class 0 OID 0)
-- Dependencies: 298
-- Name: TABLE documents; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.documents TO client_role_31;


--
-- TOC entry 5950 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE feedbacks; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.feedbacks TO client_role_31;


--
-- TOC entry 5952 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE form_submissions; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.form_submissions TO client_role_31;


--
-- TOC entry 5954 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE maintenance_requests; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.maintenance_requests TO client_role_31;


--
-- TOC entry 5956 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE properties; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.properties TO client_role_31;


--
-- TOC entry 5958 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE property_analyses; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_analyses TO client_role_31;


--
-- TOC entry 5960 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE property_coordinates; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_coordinates TO client_role_31;


--
-- TOC entry 5962 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE property_history; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_history TO client_role_31;


--
-- TOC entry 5964 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE property_works; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.property_works TO client_role_31;


--
-- TOC entry 5966 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE storage_usage; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.storage_usage TO client_role_31;


--
-- TOC entry 5968 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE tenant_documents; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.tenant_documents TO client_role_31;


--
-- TOC entry 5970 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE tenant_history; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.tenant_history TO client_role_31;


--
-- TOC entry 5972 (class 0 OID 0)
-- Dependencies: 296
-- Name: TABLE tenants; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.tenants TO client_role_31;


--
-- TOC entry 5974 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE transactions; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.transactions TO client_role_31;


--
-- TOC entry 5976 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE visits; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.visits TO client_role_31;


--
-- TOC entry 5977 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE form_responses; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.form_responses TO client_role_31;


--
-- TOC entry 5978 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE link_profiles; Type: ACL; Schema: client_31; Owner: postgres
--

GRANT ALL ON TABLE client_31.link_profiles TO client_role_31;


--
-- TOC entry 5979 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE ai_conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_conversations TO clients;


--
-- TOC entry 5981 (class 0 OID 0)
-- Dependencies: 280
-- Name: SEQUENCE ai_conversations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.ai_conversations_id_seq TO clients;


--
-- TOC entry 5982 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE ai_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_messages TO clients;


--
-- TOC entry 5984 (class 0 OID 0)
-- Dependencies: 282
-- Name: SEQUENCE ai_messages_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.ai_messages_id_seq TO clients;


--
-- TOC entry 5985 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE ai_suggestions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_suggestions TO clients;


--
-- TOC entry 5987 (class 0 OID 0)
-- Dependencies: 284
-- Name: SEQUENCE ai_suggestions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.ai_suggestions_id_seq TO clients;


--
-- TOC entry 5988 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.alerts TO clients;


--
-- TOC entry 5990 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE alerts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.alerts_id_seq TO clients;


--
-- TOC entry 5991 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE analysis_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.analysis_configs TO clients;


--
-- TOC entry 5993 (class 0 OID 0)
-- Dependencies: 250
-- Name: SEQUENCE analysis_configs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.analysis_configs_id_seq TO clients;


--
-- TOC entry 5994 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE automatic_reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.automatic_reminders TO clients;


--
-- TOC entry 5996 (class 0 OID 0)
-- Dependencies: 244
-- Name: SEQUENCE automatic_reminders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.automatic_reminders_id_seq TO clients;


--
-- TOC entry 5997 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE billing_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.billing_transactions TO clients;


--
-- TOC entry 5999 (class 0 OID 0)
-- Dependencies: 264
-- Name: SEQUENCE billing_transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.billing_transactions_id_seq TO clients;


--
-- TOC entry 6000 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE company_info; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.company_info TO clients;


--
-- TOC entry 6002 (class 0 OID 0)
-- Dependencies: 276
-- Name: SEQUENCE company_info_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.company_info_id_seq TO clients;


--
-- TOC entry 6003 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE contract_parties; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.contract_parties TO clients;


--
-- TOC entry 6005 (class 0 OID 0)
-- Dependencies: 248
-- Name: SEQUENCE contract_parties_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.contract_parties_id_seq TO clients;


--
-- TOC entry 6006 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE contracts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.contracts TO clients;


--
-- TOC entry 6008 (class 0 OID 0)
-- Dependencies: 246
-- Name: SEQUENCE contracts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.contracts_id_seq TO clients;


--
-- TOC entry 6009 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE document_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.document_templates TO clients;


--
-- TOC entry 6011 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE document_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.document_templates_id_seq TO clients;


--
-- TOC entry 6012 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE financial_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.financial_entries TO clients;


--
-- TOC entry 6014 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE financial_entries_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.financial_entries_id_seq TO clients;


--
-- TOC entry 6015 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE folders; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.folders TO clients;


--
-- TOC entry 6017 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE folders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.folders_id_seq TO clients;


--
-- TOC entry 6018 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE form_field_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.form_field_options TO clients;


--
-- TOC entry 6020 (class 0 OID 0)
-- Dependencies: 260
-- Name: SEQUENCE form_field_options_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.form_field_options_id_seq TO clients;


--
-- TOC entry 6021 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE form_fields; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.form_fields TO clients;


--
-- TOC entry 6023 (class 0 OID 0)
-- Dependencies: 258
-- Name: SEQUENCE form_fields_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.form_fields_id_seq TO clients;


--
-- TOC entry 6025 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE forms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.forms TO clients;


--
-- TOC entry 6027 (class 0 OID 0)
-- Dependencies: 254
-- Name: SEQUENCE forms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.forms_id_seq TO clients;


--
-- TOC entry 6028 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE links; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.links TO clients;


--
-- TOC entry 6030 (class 0 OID 0)
-- Dependencies: 256
-- Name: SEQUENCE links_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.links_id_seq TO clients;


--
-- TOC entry 6031 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE maintenance; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.maintenance TO clients;


--
-- TOC entry 6033 (class 0 OID 0)
-- Dependencies: 223
-- Name: SEQUENCE maintenance_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.maintenance_id_seq TO clients;


--
-- TOC entry 6034 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.notifications TO clients;


--
-- TOC entry 6036 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.notifications_id_seq TO clients;


--
-- TOC entry 6037 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE pdf_configuration; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.pdf_configuration TO clients;


--
-- TOC entry 6039 (class 0 OID 0)
-- Dependencies: 270
-- Name: SEQUENCE pdf_configuration_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pdf_configuration_id_seq TO clients;


--
-- TOC entry 6040 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE pdf_document_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.pdf_document_preferences TO clients;


--
-- TOC entry 6042 (class 0 OID 0)
-- Dependencies: 268
-- Name: SEQUENCE pdf_document_preferences_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pdf_document_preferences_id_seq TO clients;


--
-- TOC entry 6043 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE pdf_logos; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.pdf_logos TO clients;


--
-- TOC entry 6045 (class 0 OID 0)
-- Dependencies: 272
-- Name: SEQUENCE pdf_logos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pdf_logos_id_seq TO clients;


--
-- TOC entry 6046 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE pdf_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.pdf_templates TO clients;


--
-- TOC entry 6048 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE pdf_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pdf_templates_id_seq TO clients;


--
-- TOC entry 6049 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE pdf_themes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.pdf_themes TO clients;


--
-- TOC entry 6051 (class 0 OID 0)
-- Dependencies: 278
-- Name: SEQUENCE pdf_themes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pdf_themes_id_seq TO clients;


--
-- TOC entry 6052 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE property_financial_goals; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.property_financial_goals TO clients;


--
-- TOC entry 6054 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE property_financial_goals_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.property_financial_goals_id_seq TO clients;


--
-- TOC entry 6055 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE property_financial_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.property_financial_snapshots TO clients;


--
-- TOC entry 6057 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE property_financial_snapshots_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.property_financial_snapshots_id_seq TO clients;


--
-- TOC entry 6058 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE rent_receipts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.rent_receipts TO clients;


--
-- TOC entry 6060 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE rent_receipts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.rent_receipts_id_seq TO clients;


--
-- TOC entry 6061 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.reports TO clients;


--
-- TOC entry 6063 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE reports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.reports_id_seq TO clients;


--
-- TOC entry 6065 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.sessions TO clients;
GRANT SELECT ON TABLE public.sessions TO client_role_31;


--
-- TOC entry 6067 (class 0 OID 0)
-- Dependencies: 266
-- Name: SEQUENCE sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.sessions_id_seq TO clients;


--
-- TOC entry 6070 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE transaction_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.transaction_attachments TO clients;


--
-- TOC entry 6072 (class 0 OID 0)
-- Dependencies: 262
-- Name: SEQUENCE transaction_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.transaction_attachments_id_seq TO clients;


--
-- TOC entry 6074 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE user_notification_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_notification_settings TO clients;


--
-- TOC entry 6076 (class 0 OID 0)
-- Dependencies: 252
-- Name: SEQUENCE user_notification_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.user_notification_settings_id_seq TO clients;


--
-- TOC entry 6077 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.users TO clients;
GRANT SELECT ON TABLE public.users TO client_role_31;


--
-- TOC entry 6079 (class 0 OID 0)
-- Dependencies: 241
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.users_id_seq TO clients;


--
-- TOC entry 2480 (class 826 OID 27379)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: client_31; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_31 GRANT ALL ON TABLES TO client_role_31;


-- Completed on 2025-05-07 03:06:26

--
-- PostgreSQL database dump complete
--

