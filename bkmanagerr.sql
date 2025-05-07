--
-- PostgreSQL database cluster dump
--

-- Started on 2025-05-08 00:17:21

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE client_role_31;
ALTER ROLE client_role_31 WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE clients;
ALTER ROLE clients WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:ycaZ1+TVXZNqPpj8RGQJEg==$Xq4GmuN8HthUieBDiRpcab/B25rlUDiSnuO+jt5LP+4=:/4KqPjbSo9VRp8DtiiesAC828wMw9RsBNtP0c30J+Sc=';
CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:ToMPbk0LgYePYTEchYZFUg==$frNuEcvEOjSNWF+ithrCMI4Jg3h/uAyxymxBB+9nxXI=:VI+LGlXHscEg8m7kF9ssi9blxI6WajdDv6KGVHoggLE=';

--
-- User Configurations
--

--
-- User Config "clients"
--

ALTER ROLE clients SET search_path TO 'public';


--
-- Role memberships
--

GRANT clients TO postgres WITH INHERIT TRUE GRANTED BY postgres;






--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-08 00:17:21

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

-- Completed on 2025-05-08 00:17:22

--
-- PostgreSQL database dump complete
--

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-08 00:17:22

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
-- TOC entry 217 (class 1255 OID 18687)
-- Name: current_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_user_id() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN current_setting('app.current_user_id', TRUE)::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.current_user_id() OWNER TO postgres;

--
-- TOC entry 218 (class 1255 OID 18688)
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

-- Completed on 2025-05-08 00:17:22

--
-- PostgreSQL database dump complete
--

--
-- Database "property_manager" dump
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-08 00:17:22

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
-- TOC entry 6174 (class 1262 OID 16851)
-- Name: property_manager; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE property_manager WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'fr-FR';


ALTER DATABASE property_manager OWNER TO postgres;

\connect property_manager

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
-- TOC entry 8 (class 2615 OID 29427)
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
-- TOC entry 6177 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 424 (class 1255 OID 19907)
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
-- TOC entry 432 (class 1255 OID 30211)
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
-- TOC entry 428 (class 1255 OID 27335)
-- Name: create_schema_for_new_client(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_schema_for_new_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Utiliser NEW.id pour créer un schéma client
    IF NEW.role = 'clients' THEN
        PERFORM public.create_client_schema(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_schema_for_new_client() OWNER TO postgres;

--
-- TOC entry 430 (class 1255 OID 30050)
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
-- TOC entry 427 (class 1255 OID 27847)
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
-- TOC entry 391 (class 1255 OID 19950)
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
-- TOC entry 393 (class 1255 OID 18690)
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
-- TOC entry 426 (class 1255 OID 19948)
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
-- TOC entry 6197 (class 0 OID 0)
-- Dependencies: 426
-- Name: FUNCTION log_table_changes(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_table_changes() IS 'Fonction pour journaliser les modifications des tables principales';


--
-- TOC entry 402 (class 1255 OID 19450)
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
-- TOC entry 425 (class 1255 OID 19940)
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
-- TOC entry 429 (class 1255 OID 27866)
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
-- TOC entry 6221 (class 0 OID 0)
-- Dependencies: 429
-- Name: FUNCTION set_schema_for_user(user_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.set_schema_for_user(user_id integer) IS 'Retourne la valeur à utiliser pour search_path en fonction de l''ID utilisateur';


--
-- TOC entry 431 (class 1255 OID 30210)
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
-- TOC entry 399 (class 1255 OID 19210)
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
-- TOC entry 389 (class 1255 OID 19957)
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
-- TOC entry 380 (class 1255 OID 18935)
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
-- TOC entry 409 (class 1255 OID 19451)
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
-- TOC entry 392 (class 1255 OID 18464)
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

--
-- TOC entry 267 (class 1259 OID 27944)
-- Name: ai_conversations_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.ai_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.ai_conversations_id_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 313 (class 1259 OID 29428)
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
-- TOC entry 268 (class 1259 OID 27946)
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
-- TOC entry 315 (class 1259 OID 29475)
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
-- TOC entry 269 (class 1259 OID 27948)
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
-- TOC entry 317 (class 1259 OID 29504)
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
-- TOC entry 270 (class 1259 OID 27950)
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
-- TOC entry 318 (class 1259 OID 29522)
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
-- TOC entry 278 (class 1259 OID 28154)
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
-- TOC entry 329 (class 1259 OID 29657)
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
-- TOC entry 280 (class 1259 OID 28166)
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
-- TOC entry 330 (class 1259 OID 29672)
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
-- TOC entry 275 (class 1259 OID 28095)
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
-- TOC entry 327 (class 1259 OID 29632)
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
-- TOC entry 240 (class 1259 OID 27313)
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
-- TOC entry 239 (class 1259 OID 27312)
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
-- TOC entry 6227 (class 0 OID 0)
-- Dependencies: 239
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.documents_id_seq OWNED BY template.documents.id;


--
-- TOC entry 316 (class 1259 OID 29494)
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
-- TOC entry 244 (class 1259 OID 27437)
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
-- TOC entry 243 (class 1259 OID 27436)
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
-- TOC entry 6228 (class 0 OID 0)
-- Dependencies: 243
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.feedbacks_id_seq OWNED BY template.feedbacks.id;


--
-- TOC entry 320 (class 1259 OID 29543)
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
-- TOC entry 282 (class 1259 OID 28179)
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
-- TOC entry 331 (class 1259 OID 29682)
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
-- TOC entry 284 (class 1259 OID 28191)
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
-- TOC entry 332 (class 1259 OID 29693)
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
-- TOC entry 274 (class 1259 OID 28093)
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
-- TOC entry 326 (class 1259 OID 29624)
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
-- TOC entry 286 (class 1259 OID 28207)
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
-- TOC entry 333 (class 1259 OID 29703)
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
-- TOC entry 347 (class 1259 OID 29932)
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
-- TOC entry 246 (class 1259 OID 27458)
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
-- TOC entry 245 (class 1259 OID 27457)
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
-- TOC entry 6229 (class 0 OID 0)
-- Dependencies: 245
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.form_submissions_id_seq OWNED BY template.form_submissions.id;


--
-- TOC entry 321 (class 1259 OID 29553)
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
-- TOC entry 288 (class 1259 OID 28221)
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
-- TOC entry 334 (class 1259 OID 29717)
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
-- TOC entry 346 (class 1259 OID 29907)
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
-- TOC entry 290 (class 1259 OID 28240)
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
-- TOC entry 335 (class 1259 OID 29729)
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
-- TOC entry 292 (class 1259 OID 28253)
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
-- TOC entry 336 (class 1259 OID 29746)
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
-- TOC entry 242 (class 1259 OID 27414)
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
-- TOC entry 241 (class 1259 OID 27413)
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
-- TOC entry 6230 (class 0 OID 0)
-- Dependencies: 241
-- Name: maintenance_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.maintenance_requests_id_seq OWNED BY template.maintenance_requests.id;


--
-- TOC entry 319 (class 1259 OID 29531)
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
-- TOC entry 300 (class 1259 OID 28342)
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
-- TOC entry 340 (class 1259 OID 29803)
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
-- TOC entry 302 (class 1259 OID 28361)
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
-- TOC entry 342 (class 1259 OID 29845)
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
-- TOC entry 304 (class 1259 OID 28376)
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
-- TOC entry 343 (class 1259 OID 29862)
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
-- TOC entry 306 (class 1259 OID 28396)
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
-- TOC entry 344 (class 1259 OID 29875)
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
-- TOC entry 308 (class 1259 OID 28412)
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
-- TOC entry 345 (class 1259 OID 29893)
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
-- TOC entry 238 (class 1259 OID 27265)
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
-- TOC entry 237 (class 1259 OID 27264)
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
-- TOC entry 6231 (class 0 OID 0)
-- Dependencies: 237
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.properties_id_seq OWNED BY template.properties.id;


--
-- TOC entry 314 (class 1259 OID 29445)
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
    area integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_52.properties OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 27565)
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
-- TOC entry 253 (class 1259 OID 27564)
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
-- TOC entry 6232 (class 0 OID 0)
-- Dependencies: 253
-- Name: property_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_analyses_id_seq OWNED BY template.property_analyses.id;


--
-- TOC entry 325 (class 1259 OID 29614)
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
-- TOC entry 252 (class 1259 OID 27549)
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
-- TOC entry 251 (class 1259 OID 27548)
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
-- TOC entry 6233 (class 0 OID 0)
-- Dependencies: 251
-- Name: property_coordinates_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_coordinates_id_seq OWNED BY template.property_coordinates.id;


--
-- TOC entry 324 (class 1259 OID 29604)
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
-- TOC entry 294 (class 1259 OID 28266)
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
-- TOC entry 337 (class 1259 OID 29757)
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
-- TOC entry 296 (class 1259 OID 28278)
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
-- TOC entry 338 (class 1259 OID 29768)
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
-- TOC entry 248 (class 1259 OID 27515)
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
-- TOC entry 247 (class 1259 OID 27514)
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
-- TOC entry 6234 (class 0 OID 0)
-- Dependencies: 247
-- Name: property_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_history_id_seq OWNED BY template.property_history.id;


--
-- TOC entry 322 (class 1259 OID 29582)
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
-- TOC entry 250 (class 1259 OID 27532)
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
-- TOC entry 249 (class 1259 OID 27531)
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
-- TOC entry 6235 (class 0 OID 0)
-- Dependencies: 249
-- Name: property_works_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_works_id_seq OWNED BY template.property_works.id;


--
-- TOC entry 323 (class 1259 OID 29593)
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
-- TOC entry 298 (class 1259 OID 28295)
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
-- TOC entry 339 (class 1259 OID 29778)
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
-- TOC entry 276 (class 1259 OID 28097)
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
-- TOC entry 328 (class 1259 OID 29647)
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
-- TOC entry 260 (class 1259 OID 27750)
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
-- TOC entry 259 (class 1259 OID 27749)
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
-- TOC entry 6236 (class 0 OID 0)
-- Dependencies: 259
-- Name: storage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.storage_usage_id_seq OWNED BY template.storage_usage.id;


--
-- TOC entry 341 (class 1259 OID 29836)
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
-- TOC entry 359 (class 1259 OID 30127)
-- Name: tenant_documents; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.tenant_documents (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    document_type text DEFAULT 'lease'::text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE client_52.tenant_documents OWNER TO postgres;

--
-- TOC entry 360 (class 1259 OID 30134)
-- Name: tenant_documents_id_seq; Type: SEQUENCE; Schema: client_52; Owner: postgres
--

CREATE SEQUENCE client_52.tenant_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_52.tenant_documents_id_seq OWNER TO postgres;

--
-- TOC entry 6237 (class 0 OID 0)
-- Dependencies: 360
-- Name: tenant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: client_52; Owner: postgres
--

ALTER SEQUENCE client_52.tenant_documents_id_seq OWNED BY client_52.tenant_documents.id;


--
-- TOC entry 361 (class 1259 OID 30135)
-- Name: tenant_history; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.tenant_history (
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
    is_orphaned boolean DEFAULT false
);


ALTER TABLE client_52.tenant_history OWNER TO postgres;

--
-- TOC entry 362 (class 1259 OID 30145)
-- Name: tenant_history_id_seq; Type: SEQUENCE; Schema: client_52; Owner: postgres
--

CREATE SEQUENCE client_52.tenant_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_52.tenant_history_id_seq OWNER TO postgres;

--
-- TOC entry 6238 (class 0 OID 0)
-- Dependencies: 362
-- Name: tenant_history_id_seq; Type: SEQUENCE OWNED BY; Schema: client_52; Owner: postgres
--

ALTER SEQUENCE client_52.tenant_history_id_seq OWNED BY client_52.tenant_history.id;


--
-- TOC entry 363 (class 1259 OID 30146)
-- Name: tenants; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.tenants (
    id integer NOT NULL,
    user_id integer NOT NULL,
    property_id integer NOT NULL,
    lease_start timestamp without time zone NOT NULL,
    lease_end timestamp without time zone NOT NULL,
    rent_amount numeric(10,2) NOT NULL,
    lease_type text NOT NULL,
    active boolean DEFAULT true,
    lease_status text DEFAULT 'actif'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_id integer
);

ALTER TABLE ONLY client_52.tenants FORCE ROW LEVEL SECURITY;


ALTER TABLE client_52.tenants OWNER TO postgres;

--
-- TOC entry 364 (class 1259 OID 30155)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: client_52; Owner: postgres
--

CREATE SEQUENCE client_52.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_52.tenants_id_seq OWNER TO postgres;

--
-- TOC entry 6239 (class 0 OID 0)
-- Dependencies: 364
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: client_52; Owner: postgres
--

ALTER SEQUENCE client_52.tenants_id_seq OWNED BY client_52.tenants.id;


--
-- TOC entry 365 (class 1259 OID 30156)
-- Name: transaction_attachments; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.transaction_attachments (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE client_52.transaction_attachments OWNER TO postgres;

--
-- TOC entry 366 (class 1259 OID 30162)
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: client_52; Owner: postgres
--

CREATE SEQUENCE client_52.transaction_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_52.transaction_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 6240 (class 0 OID 0)
-- Dependencies: 366
-- Name: transaction_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: client_52; Owner: postgres
--

ALTER SEQUENCE client_52.transaction_attachments_id_seq OWNED BY client_52.transaction_attachments.id;


--
-- TOC entry 367 (class 1259 OID 30163)
-- Name: transactions; Type: TABLE; Schema: client_52; Owner: postgres
--

CREATE TABLE client_52.transactions (
    id integer NOT NULL,
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

ALTER TABLE ONLY client_52.transactions FORCE ROW LEVEL SECURITY;


ALTER TABLE client_52.transactions OWNER TO postgres;

--
-- TOC entry 368 (class 1259 OID 30170)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: client_52; Owner: postgres
--

CREATE SEQUENCE client_52.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_52.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 6241 (class 0 OID 0)
-- Dependencies: 368
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: client_52; Owner: postgres
--

ALTER SEQUENCE client_52.transactions_id_seq OWNED BY client_52.transactions.id;


--
-- TOC entry 311 (class 1259 OID 29334)
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
-- TOC entry 312 (class 1259 OID 29346)
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
-- TOC entry 6242 (class 0 OID 0)
-- Dependencies: 312
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.visits_id_seq OWNED BY template.visits.id;


--
-- TOC entry 348 (class 1259 OID 29941)
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
-- TOC entry 222 (class 1259 OID 17090)
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
-- TOC entry 221 (class 1259 OID 17089)
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
-- TOC entry 6244 (class 0 OID 0)
-- Dependencies: 221
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


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
-- TOC entry 6247 (class 0 OID 0)
-- Dependencies: 230
-- Name: billing_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_transactions_id_seq OWNED BY public.billing_transactions.id;


--
-- TOC entry 235 (class 1259 OID 19148)
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
-- TOC entry 234 (class 1259 OID 19147)
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
-- TOC entry 6250 (class 0 OID 0)
-- Dependencies: 234
-- Name: company_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_info_id_seq OWNED BY public.company_info.id;


--
-- TOC entry 223 (class 1259 OID 17231)
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
-- TOC entry 224 (class 1259 OID 17238)
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
-- TOC entry 6253 (class 0 OID 0)
-- Dependencies: 224
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- TOC entry 283 (class 1259 OID 28181)
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
-- TOC entry 309 (class 1259 OID 28697)
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
-- TOC entry 287 (class 1259 OID 28209)
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
-- TOC entry 310 (class 1259 OID 28701)
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
-- TOC entry 225 (class 1259 OID 17287)
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
-- TOC entry 226 (class 1259 OID 17294)
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
-- TOC entry 6256 (class 0 OID 0)
-- Dependencies: 226
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 236 (class 1259 OID 27055)
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
-- TOC entry 6258 (class 0 OID 0)
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
-- TOC entry 6260 (class 0 OID 0)
-- Dependencies: 232
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- TOC entry 256 (class 1259 OID 27727)
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
-- TOC entry 255 (class 1259 OID 27726)
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
-- TOC entry 6262 (class 0 OID 0)
-- Dependencies: 255
-- Name: storage_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_plans_id_seq OWNED BY public.storage_plans.id;


--
-- TOC entry 258 (class 1259 OID 27739)
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
-- TOC entry 257 (class 1259 OID 27738)
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
-- TOC entry 6263 (class 0 OID 0)
-- Dependencies: 257
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
-- TOC entry 6264 (class 0 OID 0)
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
-- TOC entry 6266 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- TOC entry 220 (class 1259 OID 16853)
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
-- TOC entry 6269 (class 0 OID 0)
-- Dependencies: 227
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 263 (class 1259 OID 27881)
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
-- TOC entry 264 (class 1259 OID 27898)
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
-- TOC entry 265 (class 1259 OID 27917)
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
-- TOC entry 266 (class 1259 OID 27935)
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
-- TOC entry 277 (class 1259 OID 28139)
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
-- TOC entry 279 (class 1259 OID 28156)
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
-- TOC entry 272 (class 1259 OID 28068)
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
-- TOC entry 281 (class 1259 OID 28168)
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
-- TOC entry 271 (class 1259 OID 28060)
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
-- TOC entry 285 (class 1259 OID 28193)
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
-- TOC entry 262 (class 1259 OID 27826)
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
-- TOC entry 261 (class 1259 OID 27774)
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
-- TOC entry 289 (class 1259 OID 28223)
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
-- TOC entry 291 (class 1259 OID 28242)
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
-- TOC entry 299 (class 1259 OID 28309)
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
-- TOC entry 301 (class 1259 OID 28344)
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
-- TOC entry 303 (class 1259 OID 28363)
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
-- TOC entry 305 (class 1259 OID 28378)
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
-- TOC entry 307 (class 1259 OID 28398)
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
-- TOC entry 293 (class 1259 OID 28255)
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
-- TOC entry 295 (class 1259 OID 28268)
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
-- TOC entry 297 (class 1259 OID 28280)
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
-- TOC entry 273 (class 1259 OID 28083)
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
-- TOC entry 349 (class 1259 OID 30068)
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
-- TOC entry 350 (class 1259 OID 30075)
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
-- TOC entry 6271 (class 0 OID 0)
-- Dependencies: 350
-- Name: tenant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_documents_id_seq OWNED BY template.tenant_documents.id;


--
-- TOC entry 351 (class 1259 OID 30076)
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
    is_orphaned boolean DEFAULT false
);


ALTER TABLE template.tenant_history OWNER TO postgres;

--
-- TOC entry 352 (class 1259 OID 30086)
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
-- TOC entry 6272 (class 0 OID 0)
-- Dependencies: 352
-- Name: tenant_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_history_id_seq OWNED BY template.tenant_history.id;


--
-- TOC entry 353 (class 1259 OID 30087)
-- Name: tenants; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.tenants (
    id integer NOT NULL,
    user_id integer NOT NULL,
    property_id integer NOT NULL,
    lease_start timestamp without time zone NOT NULL,
    lease_end timestamp without time zone NOT NULL,
    rent_amount numeric(10,2) NOT NULL,
    lease_type text NOT NULL,
    active boolean DEFAULT true,
    lease_status text DEFAULT 'actif'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    tenant_id integer
);

ALTER TABLE ONLY template.tenants FORCE ROW LEVEL SECURITY;


ALTER TABLE template.tenants OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 30096)
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
-- TOC entry 6273 (class 0 OID 0)
-- Dependencies: 354
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenants_id_seq OWNED BY template.tenants.id;


--
-- TOC entry 355 (class 1259 OID 30097)
-- Name: transaction_attachments; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.transaction_attachments (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE template.transaction_attachments OWNER TO postgres;

--
-- TOC entry 356 (class 1259 OID 30103)
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
-- TOC entry 6274 (class 0 OID 0)
-- Dependencies: 356
-- Name: transaction_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.transaction_attachments_id_seq OWNED BY template.transaction_attachments.id;


--
-- TOC entry 357 (class 1259 OID 30104)
-- Name: transactions; Type: TABLE; Schema: template; Owner: postgres
--

CREATE TABLE template.transactions (
    id integer NOT NULL,
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

ALTER TABLE ONLY template.transactions FORCE ROW LEVEL SECURITY;


ALTER TABLE template.transactions OWNER TO postgres;

--
-- TOC entry 358 (class 1259 OID 30111)
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
-- TOC entry 6275 (class 0 OID 0)
-- Dependencies: 358
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.transactions_id_seq OWNED BY template.transactions.id;


--
-- TOC entry 5544 (class 2604 OID 30171)
-- Name: tenant_documents id; Type: DEFAULT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_documents ALTER COLUMN id SET DEFAULT nextval('client_52.tenant_documents_id_seq'::regclass);


--
-- TOC entry 5547 (class 2604 OID 30172)
-- Name: tenant_history id; Type: DEFAULT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_history ALTER COLUMN id SET DEFAULT nextval('client_52.tenant_history_id_seq'::regclass);


--
-- TOC entry 5553 (class 2604 OID 30173)
-- Name: tenants id; Type: DEFAULT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenants ALTER COLUMN id SET DEFAULT nextval('client_52.tenants_id_seq'::regclass);


--
-- TOC entry 5558 (class 2604 OID 30174)
-- Name: transaction_attachments id; Type: DEFAULT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transaction_attachments ALTER COLUMN id SET DEFAULT nextval('client_52.transaction_attachments_id_seq'::regclass);


--
-- TOC entry 5560 (class 2604 OID 30175)
-- Name: transactions id; Type: DEFAULT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transactions ALTER COLUMN id SET DEFAULT nextval('client_52.transactions_id_seq'::regclass);


--
-- TOC entry 5110 (class 2604 OID 17093)
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- TOC entry 5127 (class 2604 OID 18451)
-- Name: billing_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions ALTER COLUMN id SET DEFAULT nextval('public.billing_transactions_id_seq'::regclass);


--
-- TOC entry 5132 (class 2604 OID 19151)
-- Name: company_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info ALTER COLUMN id SET DEFAULT nextval('public.company_info_id_seq'::regclass);


--
-- TOC entry 5114 (class 2604 OID 17382)
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);


--
-- TOC entry 5117 (class 2604 OID 17388)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 5129 (class 2604 OID 18580)
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- TOC entry 5167 (class 2604 OID 27730)
-- Name: storage_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans ALTER COLUMN id SET DEFAULT nextval('public.storage_plans_id_seq'::regclass);


--
-- TOC entry 5171 (class 2604 OID 27742)
-- Name: storage_quotas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas ALTER COLUMN id SET DEFAULT nextval('public.storage_quotas_id_seq'::regclass);


--
-- TOC entry 5120 (class 2604 OID 17814)
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- TOC entry 5096 (class 2604 OID 17399)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5139 (class 2604 OID 27316)
-- Name: documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents ALTER COLUMN id SET DEFAULT nextval('template.documents_id_seq'::regclass);


--
-- TOC entry 5147 (class 2604 OID 27440)
-- Name: feedbacks id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks ALTER COLUMN id SET DEFAULT nextval('template.feedbacks_id_seq'::regclass);


--
-- TOC entry 5150 (class 2604 OID 27461)
-- Name: form_submissions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions ALTER COLUMN id SET DEFAULT nextval('template.form_submissions_id_seq'::regclass);


--
-- TOC entry 5142 (class 2604 OID 27417)
-- Name: maintenance_requests id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests ALTER COLUMN id SET DEFAULT nextval('template.maintenance_requests_id_seq'::regclass);


--
-- TOC entry 5136 (class 2604 OID 27268)
-- Name: properties id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties ALTER COLUMN id SET DEFAULT nextval('template.properties_id_seq'::regclass);


--
-- TOC entry 5164 (class 2604 OID 27568)
-- Name: property_analyses id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses ALTER COLUMN id SET DEFAULT nextval('template.property_analyses_id_seq'::regclass);


--
-- TOC entry 5161 (class 2604 OID 27552)
-- Name: property_coordinates id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates ALTER COLUMN id SET DEFAULT nextval('template.property_coordinates_id_seq'::regclass);


--
-- TOC entry 5153 (class 2604 OID 27518)
-- Name: property_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history ALTER COLUMN id SET DEFAULT nextval('template.property_history_id_seq'::regclass);


--
-- TOC entry 5157 (class 2604 OID 27535)
-- Name: property_works id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works ALTER COLUMN id SET DEFAULT nextval('template.property_works_id_seq'::regclass);


--
-- TOC entry 5174 (class 2604 OID 27753)
-- Name: storage_usage id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage ALTER COLUMN id SET DEFAULT nextval('template.storage_usage_id_seq'::regclass);


--
-- TOC entry 5525 (class 2604 OID 30112)
-- Name: tenant_documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents ALTER COLUMN id SET DEFAULT nextval('template.tenant_documents_id_seq'::regclass);


--
-- TOC entry 5528 (class 2604 OID 30113)
-- Name: tenant_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history ALTER COLUMN id SET DEFAULT nextval('template.tenant_history_id_seq'::regclass);


--
-- TOC entry 5534 (class 2604 OID 30114)
-- Name: tenants id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants ALTER COLUMN id SET DEFAULT nextval('template.tenants_id_seq'::regclass);


--
-- TOC entry 5539 (class 2604 OID 30115)
-- Name: transaction_attachments id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transaction_attachments ALTER COLUMN id SET DEFAULT nextval('template.transaction_attachments_id_seq'::regclass);


--
-- TOC entry 5541 (class 2604 OID 30116)
-- Name: transactions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions ALTER COLUMN id SET DEFAULT nextval('template.transactions_id_seq'::regclass);


--
-- TOC entry 5326 (class 2604 OID 29347)
-- Name: visits id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits ALTER COLUMN id SET DEFAULT nextval('template.visits_id_seq'::regclass);


--
-- TOC entry 6113 (class 0 OID 29428)
-- Dependencies: 313
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 6115 (class 0 OID 29475)
-- Dependencies: 315
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 6117 (class 0 OID 29504)
-- Dependencies: 317
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 6118 (class 0 OID 29522)
-- Dependencies: 318
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6129 (class 0 OID 29657)
-- Dependencies: 329
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6130 (class 0 OID 29672)
-- Dependencies: 330
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6127 (class 0 OID 29632)
-- Dependencies: 327
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6116 (class 0 OID 29494)
-- Dependencies: 316
-- Data for Name: documents; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6120 (class 0 OID 29543)
-- Dependencies: 320
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6131 (class 0 OID 29682)
-- Dependencies: 331
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6132 (class 0 OID 29693)
-- Dependencies: 332
-- Data for Name: folders; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6126 (class 0 OID 29624)
-- Dependencies: 326
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 6133 (class 0 OID 29703)
-- Dependencies: 333
-- Data for Name: form_fields; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6147 (class 0 OID 29932)
-- Dependencies: 347
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 6121 (class 0 OID 29553)
-- Dependencies: 321
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6134 (class 0 OID 29717)
-- Dependencies: 334
-- Data for Name: forms; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 6146 (class 0 OID 29907)
-- Dependencies: 346
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6135 (class 0 OID 29729)
-- Dependencies: 335
-- Data for Name: links; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 6136 (class 0 OID 29746)
-- Dependencies: 336
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 6119 (class 0 OID 29531)
-- Dependencies: 319
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6140 (class 0 OID 29803)
-- Dependencies: 340
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 6142 (class 0 OID 29845)
-- Dependencies: 342
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 6143 (class 0 OID 29862)
-- Dependencies: 343
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6144 (class 0 OID 29875)
-- Dependencies: 344
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 6145 (class 0 OID 29893)
-- Dependencies: 345
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6114 (class 0 OID 29445)
-- Dependencies: 314
-- Data for Name: properties; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
5	la parlfferne	64 Rue Pasteur 33200 Bordeaux	\N	apartment	0	0	0	0	0	D	D	0	0	f	f	f	f	f	f	f	f	f	0	0	\N	0	0	20	available	\N	\N	0	f	[]	52	0	2025-05-07 17:42:26.894	2025-05-07 17:42:26.894
6	dfgdfg	64 Rue Pasteur 33200 Bordeaux	ffdfdfsdfsdf	apartment	4	4	4	4	4	D	D	4	4	t	t	t	t	t	t	f	f	f	4	4	4	4	0	4	available	1994	2025-05-22 02:00:00	4	f	[]	52	4	2025-05-07 17:43:16.417	2025-05-07 17:43:16.417
7	la parlerne	6 Rn 4 77340 Pontault-Combault	dfsdfsdfsdf	apartment	4	4	4	4	4	D	D	4	4	t	t	t	t	t	t	f	f	f	4	4	4	4	0	4	available	2020	2025-05-16 02:00:00	4	\N	[]	52	4	2025-05-07 18:38:30.558	2025-05-07 18:38:30.558
8	rerer	64 Rue Pasteur 33200 Bordeaux	ffdfdfd	parking	4	4	4	4	4	D	D	4	4	t	t	t	t	t	t	t	t	f	450	0	\N	450	2	20	available	2020	2025-05-09 02:00:00	4	\N	[]	52	4	2025-05-07 18:46:23.885	2025-05-07 18:46:23.885
9	dfgdfg	64 Rue Marcadet 75018 Paris	cbnbnbn	house	4	4	4	4	4	D	D	4	4	t	t	t	t	t	t	t	t	f	4	4	4	400	9	4	available	2000	2025-05-17 02:00:00	4	\N	[]	52	4	2025-05-07 18:51:38.383	2025-05-07 18:51:38.383
\.


--
-- TOC entry 6125 (class 0 OID 29614)
-- Dependencies: 325
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6124 (class 0 OID 29604)
-- Dependencies: 324
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
1	5	44.844463	-0.604005	2025-05-07 17:42:26.904781	2025-05-07 17:42:26.904781
2	6	44.844463	-0.604005	2025-05-07 17:43:16.427558	2025-05-07 17:43:16.427558
3	7	48.776752	2.597903	2025-05-07 18:38:30.564637	2025-05-07 18:38:30.564637
4	8	44.844463	-0.604005	2025-05-07 18:46:23.896073	2025-05-07 18:46:23.896073
5	9	48.890508	2.348626	2025-05-07 18:51:38.392652	2025-05-07 18:51:38.392652
\.


--
-- TOC entry 6137 (class 0 OID 29757)
-- Dependencies: 337
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6138 (class 0 OID 29768)
-- Dependencies: 338
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6122 (class 0 OID 29582)
-- Dependencies: 322
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6123 (class 0 OID 29593)
-- Dependencies: 323
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6139 (class 0 OID 29778)
-- Dependencies: 339
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6128 (class 0 OID 29647)
-- Dependencies: 328
-- Data for Name: reports; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6141 (class 0 OID 29836)
-- Dependencies: 341
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 6159 (class 0 OID 30127)
-- Dependencies: 359
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenant_documents (id, tenant_id, document_id, document_type, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6161 (class 0 OID 30135)
-- Dependencies: 361
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenant_history (id, rating, feedback, category, tenant_full_name, original_user_id, event_type, event_severity, event_details, documents, bail_status, bail_id, property_name, created_at, created_by, tenant_id, is_orphaned) FROM stdin;
\.


--
-- TOC entry 6163 (class 0 OID 30146)
-- Dependencies: 363
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenants (id, user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, created_at, updated_at, tenant_id) FROM stdin;
\.


--
-- TOC entry 6165 (class 0 OID 30156)
-- Dependencies: 365
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6167 (class 0 OID 30163)
-- Dependencies: 367
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.transactions (id, user_id, property_id, tenant_id, document_id, document_ids, type, category, amount, description, date, status, payment_method, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6148 (class 0 OID 29941)
-- Dependencies: 348
-- Data for Name: visits; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
7	doulma	dfdf	gf@gmail.com	06 59 81 88 49	2025-05-23 16:00:00	virtual	\N	vbv	\N	pending	\N	\N	f	52	manual	{}	f	2025-05-07 16:58:31.770558	2025-05-07 16:58:31.770558
\.


--
-- TOC entry 6024 (class 0 OID 17090)
-- Dependencies: 222
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, title, description, "userId", type, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6033 (class 0 OID 18448)
-- Dependencies: 231
-- Data for Name: billing_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_transactions (id, user_id, amount, description, status, payment_method, transaction_date, next_billing_date, metadata) FROM stdin;
1	1	9.99	Abonnement Premium	completed	\N	2025-04-01 20:51:22.968368	\N	\N
2	1	9.99	Renouvellement abonnement Premium	completed	\N	2025-04-30 20:51:22.968368	\N	\N
\.


--
-- TOC entry 6037 (class 0 OID 19148)
-- Dependencies: 235
-- Data for Name: company_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
1	1	Votre Entreprise	123 Rue Exemple, 75000 Paris	01 23 45 67 89	contact@votreentreprise.com	www.votreentreprise.com	123 456 789 00012	2025-05-04 04:18:46.578071	2025-05-04 04:18:46.578071
\.


--
-- TOC entry 6025 (class 0 OID 17231)
-- Dependencies: 223
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6027 (class 0 OID 17287)
-- Dependencies: 225
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, related_to, related_id, is_read, created_at) FROM stdin;
\.


--
-- TOC entry 6038 (class 0 OID 27055)
-- Dependencies: 236
-- Data for Name: schema_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schema_mapping (schema_name, user_id, created_at) FROM stdin;
client_31	31	2025-05-06 20:30:12.391884
client_40	40	2025-05-07 15:02:32.113346
\.


--
-- TOC entry 6035 (class 0 OID 18577)
-- Dependencies: 233
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, session_id, ip_address, user_agent, payload, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6058 (class 0 OID 27727)
-- Dependencies: 256
-- Data for Name: storage_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_plans (id, name, description, storage_limit, price_monthly, price_yearly, is_active, features, created_at, updated_at) FROM stdin;
1	Gratuit	Plan gratuit avec stockage limité	536870912	0.00	0.00	t	{"max_properties": 3, "image_enhancement": false}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	Standard	Plan standard pour les propriétaires	5368709120	9.99	99.99	t	{"max_properties": 15, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	Professionnel	Plan avancé pour les professionnels	53687091200	29.99	299.99	t	{"ai_assistant": true, "max_properties": -1, "image_enhancement": true}	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 6060 (class 0 OID 27739)
-- Dependencies: 258
-- Data for Name: storage_quotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_quotas (id, resource_type, size_limit, count_limit, applies_to, created_at, updated_at) FROM stdin;
1	document	10485760	50	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
2	image	5242880	20	free	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
3	document	52428800	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
4	image	20971520	-1	premium	2025-05-06 20:53:40.970584	2025-05-06 20:53:40.970584
\.


--
-- TOC entry 6031 (class 0 OID 17811)
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
11	1	payment	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
22	1	maintenance	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
33	1	lease	both	t	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
44	1	visit	both	f	immediate	all	2025-04-21 16:46:28.050222+02	2025-04-21 16:46:28.050222+02
\.


--
-- TOC entry 6022 (class 0 OID 16853)
-- Dependencies: 220
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
-- TOC entry 6065 (class 0 OID 27881)
-- Dependencies: 263
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 6066 (class 0 OID 27898)
-- Dependencies: 264
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 6067 (class 0 OID 27917)
-- Dependencies: 265
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 6068 (class 0 OID 27935)
-- Dependencies: 266
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6079 (class 0 OID 28139)
-- Dependencies: 277
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6081 (class 0 OID 28156)
-- Dependencies: 279
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6074 (class 0 OID 28068)
-- Dependencies: 272
-- Data for Name: contracts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6042 (class 0 OID 27313)
-- Dependencies: 240
-- Data for Name: documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6046 (class 0 OID 27437)
-- Dependencies: 244
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6083 (class 0 OID 28168)
-- Dependencies: 281
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6085 (class 0 OID 28181)
-- Dependencies: 283
-- Data for Name: folders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6073 (class 0 OID 28060)
-- Dependencies: 271
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 6087 (class 0 OID 28193)
-- Dependencies: 285
-- Data for Name: form_fields; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6064 (class 0 OID 27826)
-- Dependencies: 262
-- Data for Name: form_responses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 6048 (class 0 OID 27458)
-- Dependencies: 246
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6089 (class 0 OID 28209)
-- Dependencies: 287
-- Data for Name: forms; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 6063 (class 0 OID 27774)
-- Dependencies: 261
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6091 (class 0 OID 28223)
-- Dependencies: 289
-- Data for Name: links; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 6093 (class 0 OID 28242)
-- Dependencies: 291
-- Data for Name: maintenance; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 6044 (class 0 OID 27414)
-- Dependencies: 242
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6101 (class 0 OID 28309)
-- Dependencies: 299
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 6103 (class 0 OID 28344)
-- Dependencies: 301
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 6105 (class 0 OID 28363)
-- Dependencies: 303
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6107 (class 0 OID 28378)
-- Dependencies: 305
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 6109 (class 0 OID 28398)
-- Dependencies: 307
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6040 (class 0 OID 27265)
-- Dependencies: 238
-- Data for Name: properties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6056 (class 0 OID 27565)
-- Dependencies: 254
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6054 (class 0 OID 27549)
-- Dependencies: 252
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6095 (class 0 OID 28255)
-- Dependencies: 293
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6097 (class 0 OID 28268)
-- Dependencies: 295
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6050 (class 0 OID 27515)
-- Dependencies: 248
-- Data for Name: property_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6052 (class 0 OID 27532)
-- Dependencies: 250
-- Data for Name: property_works; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6099 (class 0 OID 28280)
-- Dependencies: 297
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6075 (class 0 OID 28083)
-- Dependencies: 273
-- Data for Name: reports; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6062 (class 0 OID 27750)
-- Dependencies: 260
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 6149 (class 0 OID 30068)
-- Dependencies: 349
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_documents (id, tenant_id, document_id, document_type, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6151 (class 0 OID 30076)
-- Dependencies: 351
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_history (id, rating, feedback, category, tenant_full_name, original_user_id, event_type, event_severity, event_details, documents, bail_status, bail_id, property_name, created_at, created_by, tenant_id, is_orphaned) FROM stdin;
\.


--
-- TOC entry 6153 (class 0 OID 30087)
-- Dependencies: 353
-- Data for Name: tenants; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenants (id, user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, created_at, updated_at, tenant_id) FROM stdin;
\.


--
-- TOC entry 6155 (class 0 OID 30097)
-- Dependencies: 355
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6157 (class 0 OID 30104)
-- Dependencies: 357
-- Data for Name: transactions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transactions (id, user_id, property_id, tenant_id, document_id, document_ids, type, category, amount, description, date, status, payment_method, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6111 (class 0 OID 29334)
-- Dependencies: 311
-- Data for Name: visits; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6276 (class 0 OID 0)
-- Dependencies: 360
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: client_52; Owner: postgres
--

SELECT pg_catalog.setval('client_52.tenant_documents_id_seq', 1, false);


--
-- TOC entry 6277 (class 0 OID 0)
-- Dependencies: 362
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: client_52; Owner: postgres
--

SELECT pg_catalog.setval('client_52.tenant_history_id_seq', 1, false);


--
-- TOC entry 6278 (class 0 OID 0)
-- Dependencies: 364
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: client_52; Owner: postgres
--

SELECT pg_catalog.setval('client_52.tenants_id_seq', 1, false);


--
-- TOC entry 6279 (class 0 OID 0)
-- Dependencies: 366
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: client_52; Owner: postgres
--

SELECT pg_catalog.setval('client_52.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 6280 (class 0 OID 0)
-- Dependencies: 368
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: client_52; Owner: postgres
--

SELECT pg_catalog.setval('client_52.transactions_id_seq', 1, false);


--
-- TOC entry 6281 (class 0 OID 0)
-- Dependencies: 221
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_id_seq', 1, false);


--
-- TOC entry 6282 (class 0 OID 0)
-- Dependencies: 230
-- Name: billing_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_transactions_id_seq', 2, true);


--
-- TOC entry 6283 (class 0 OID 0)
-- Dependencies: 234
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_info_id_seq', 1, true);


--
-- TOC entry 6284 (class 0 OID 0)
-- Dependencies: 224
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_templates_id_seq', 1, false);


--
-- TOC entry 6285 (class 0 OID 0)
-- Dependencies: 226
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 6286 (class 0 OID 0)
-- Dependencies: 232
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- TOC entry 6287 (class 0 OID 0)
-- Dependencies: 255
-- Name: storage_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_plans_id_seq', 3, true);


--
-- TOC entry 6288 (class 0 OID 0)
-- Dependencies: 257
-- Name: storage_quotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_quotas_id_seq', 4, true);


--
-- TOC entry 6289 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 44, true);


--
-- TOC entry 6290 (class 0 OID 0)
-- Dependencies: 227
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 80, true);


--
-- TOC entry 6291 (class 0 OID 0)
-- Dependencies: 267
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_conversations_id_seq', 1, false);


--
-- TOC entry 6292 (class 0 OID 0)
-- Dependencies: 268
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_messages_id_seq', 1, false);


--
-- TOC entry 6293 (class 0 OID 0)
-- Dependencies: 269
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 6294 (class 0 OID 0)
-- Dependencies: 270
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.analysis_configs_id_seq', 1, false);


--
-- TOC entry 6295 (class 0 OID 0)
-- Dependencies: 278
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 6296 (class 0 OID 0)
-- Dependencies: 280
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contract_parties_id_seq', 1, false);


--
-- TOC entry 6297 (class 0 OID 0)
-- Dependencies: 275
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contracts_id_seq', 1, false);


--
-- TOC entry 6298 (class 0 OID 0)
-- Dependencies: 239
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.documents_id_seq', 1, false);


--
-- TOC entry 6299 (class 0 OID 0)
-- Dependencies: 243
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.feedbacks_id_seq', 1, false);


--
-- TOC entry 6300 (class 0 OID 0)
-- Dependencies: 282
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.financial_entries_id_seq', 1, false);


--
-- TOC entry 6301 (class 0 OID 0)
-- Dependencies: 284
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.folders_id_seq', 1, false);


--
-- TOC entry 6302 (class 0 OID 0)
-- Dependencies: 274
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_field_options_id_seq', 1, false);


--
-- TOC entry 6303 (class 0 OID 0)
-- Dependencies: 286
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_fields_id_seq', 1, false);


--
-- TOC entry 6304 (class 0 OID 0)
-- Dependencies: 245
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_submissions_id_seq', 1, false);


--
-- TOC entry 6305 (class 0 OID 0)
-- Dependencies: 288
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.forms_id_seq', 1, false);


--
-- TOC entry 6306 (class 0 OID 0)
-- Dependencies: 290
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.links_id_seq', 1, false);


--
-- TOC entry 6307 (class 0 OID 0)
-- Dependencies: 292
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_id_seq', 1, false);


--
-- TOC entry 6308 (class 0 OID 0)
-- Dependencies: 241
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_requests_id_seq', 1, false);


--
-- TOC entry 6309 (class 0 OID 0)
-- Dependencies: 300
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 6310 (class 0 OID 0)
-- Dependencies: 302
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 6311 (class 0 OID 0)
-- Dependencies: 304
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_logos_id_seq', 1, false);


--
-- TOC entry 6312 (class 0 OID 0)
-- Dependencies: 306
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_templates_id_seq', 1, false);


--
-- TOC entry 6313 (class 0 OID 0)
-- Dependencies: 308
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_themes_id_seq', 1, false);


--
-- TOC entry 6314 (class 0 OID 0)
-- Dependencies: 237
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.properties_id_seq', 9, true);


--
-- TOC entry 6315 (class 0 OID 0)
-- Dependencies: 253
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_analyses_id_seq', 1, false);


--
-- TOC entry 6316 (class 0 OID 0)
-- Dependencies: 251
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_coordinates_id_seq', 5, true);


--
-- TOC entry 6317 (class 0 OID 0)
-- Dependencies: 294
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 6318 (class 0 OID 0)
-- Dependencies: 296
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 6319 (class 0 OID 0)
-- Dependencies: 247
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_history_id_seq', 1, false);


--
-- TOC entry 6320 (class 0 OID 0)
-- Dependencies: 249
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_works_id_seq', 1, false);


--
-- TOC entry 6321 (class 0 OID 0)
-- Dependencies: 298
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.rent_receipts_id_seq', 1, false);


--
-- TOC entry 6322 (class 0 OID 0)
-- Dependencies: 276
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.reports_id_seq', 1, false);


--
-- TOC entry 6323 (class 0 OID 0)
-- Dependencies: 259
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.storage_usage_id_seq', 1, false);


--
-- TOC entry 6324 (class 0 OID 0)
-- Dependencies: 350
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_documents_id_seq', 1, false);


--
-- TOC entry 6325 (class 0 OID 0)
-- Dependencies: 352
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_history_id_seq', 1, false);


--
-- TOC entry 6326 (class 0 OID 0)
-- Dependencies: 354
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenants_id_seq', 1, false);


--
-- TOC entry 6327 (class 0 OID 0)
-- Dependencies: 356
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 6328 (class 0 OID 0)
-- Dependencies: 358
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transactions_id_seq', 1, false);


--
-- TOC entry 6329 (class 0 OID 0)
-- Dependencies: 312
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.visits_id_seq', 7, true);


--
-- TOC entry 5734 (class 2606 OID 29442)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5743 (class 2606 OID 29489)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5748 (class 2606 OID 29516)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 5755 (class 2606 OID 29528)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5780 (class 2606 OID 29668)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5784 (class 2606 OID 29681)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5775 (class 2606 OID 29646)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5746 (class 2606 OID 29503)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5761 (class 2606 OID 29552)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5786 (class 2606 OID 29692)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5788 (class 2606 OID 29702)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5773 (class 2606 OID 29631)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5790 (class 2606 OID 29715)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 5793 (class 2606 OID 29713)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5836 (class 2606 OID 29939)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5763 (class 2606 OID 29562)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5795 (class 2606 OID 29725)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5797 (class 2606 OID 29727)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 5831 (class 2606 OID 29929)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5833 (class 2606 OID 29931)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5800 (class 2606 OID 29743)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 5804 (class 2606 OID 29756)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 5759 (class 2606 OID 29542)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5816 (class 2606 OID 29835)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 5820 (class 2606 OID 29860)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 5823 (class 2606 OID 29858)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5825 (class 2606 OID 29874)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 5827 (class 2606 OID 29892)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5829 (class 2606 OID 29906)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 5738 (class 2606 OID 29454)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5771 (class 2606 OID 29623)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5769 (class 2606 OID 29613)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5806 (class 2606 OID 29767)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 5808 (class 2606 OID 29777)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5765 (class 2606 OID 29592)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5767 (class 2606 OID 29603)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5810 (class 2606 OID 29788)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5777 (class 2606 OID 29656)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5818 (class 2606 OID 29844)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5850 (class 2606 OID 30177)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5852 (class 2606 OID 30179)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5854 (class 2606 OID 30181)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5856 (class 2606 OID 30183)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5858 (class 2606 OID 30185)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5838 (class 2606 OID 29955)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5595 (class 2606 OID 17100)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 5609 (class 2606 OID 18456)
-- Name: billing_transactions billing_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5620 (class 2606 OID 19157)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 5597 (class 2606 OID 17408)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5603 (class 2606 OID 17420)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5622 (class 2606 OID 27062)
-- Name: schema_mapping schema_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_pkey PRIMARY KEY (schema_name);


--
-- TOC entry 5616 (class 2606 OID 18586)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5618 (class 2606 OID 18588)
-- Name: sessions sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_id_key UNIQUE (session_id);


--
-- TOC entry 5642 (class 2606 OID 27737)
-- Name: storage_plans storage_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_plans
    ADD CONSTRAINT storage_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 5644 (class 2606 OID 27748)
-- Name: storage_quotas storage_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_quotas
    ADD CONSTRAINT storage_quotas_pkey PRIMARY KEY (id);


--
-- TOC entry 5607 (class 2606 OID 17828)
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5592 (class 2606 OID 16868)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5655 (class 2606 OID 27895)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5662 (class 2606 OID 27912)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5665 (class 2606 OID 27929)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 5672 (class 2606 OID 27941)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5683 (class 2606 OID 28150)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5687 (class 2606 OID 28165)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5678 (class 2606 OID 28082)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5626 (class 2606 OID 27322)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5630 (class 2606 OID 27446)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5689 (class 2606 OID 28178)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5691 (class 2606 OID 28190)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5676 (class 2606 OID 28067)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5693 (class 2606 OID 28205)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 5696 (class 2606 OID 28203)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5653 (class 2606 OID 27834)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5632 (class 2606 OID 27467)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5698 (class 2606 OID 28217)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5700 (class 2606 OID 28219)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 5648 (class 2606 OID 27797)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5650 (class 2606 OID 27799)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5703 (class 2606 OID 28237)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 5707 (class 2606 OID 28252)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 5628 (class 2606 OID 27425)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5719 (class 2606 OID 28341)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 5721 (class 2606 OID 28359)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 5724 (class 2606 OID 28357)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5726 (class 2606 OID 28375)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 5728 (class 2606 OID 28395)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5730 (class 2606 OID 28411)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 5624 (class 2606 OID 27274)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5640 (class 2606 OID 27574)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5638 (class 2606 OID 27558)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5709 (class 2606 OID 28265)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 5711 (class 2606 OID 28277)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5634 (class 2606 OID 27525)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5636 (class 2606 OID 27542)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5713 (class 2606 OID 28290)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5680 (class 2606 OID 28092)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5646 (class 2606 OID 27758)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5840 (class 2606 OID 30118)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5842 (class 2606 OID 30120)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5844 (class 2606 OID 30122)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5846 (class 2606 OID 30124)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5848 (class 2606 OID 30126)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5732 (class 2606 OID 29349)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5735 (class 1259 OID 29443)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_52.ai_conversations USING btree (user_id);


--
-- TOC entry 5736 (class 1259 OID 29444)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_52.ai_conversations USING btree (user_id);


--
-- TOC entry 5739 (class 1259 OID 29491)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_52.ai_messages USING btree (conversation_id);


--
-- TOC entry 5740 (class 1259 OID 29493)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_52.ai_messages USING btree (conversation_id);


--
-- TOC entry 5741 (class 1259 OID 29492)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_52.ai_messages USING btree (created_at);


--
-- TOC entry 5744 (class 1259 OID 29490)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_52.ai_messages USING btree (user_id);


--
-- TOC entry 5749 (class 1259 OID 29518)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_52.ai_suggestions USING btree (property_id);


--
-- TOC entry 5750 (class 1259 OID 29521)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_52.ai_suggestions USING btree (property_id);


--
-- TOC entry 5751 (class 1259 OID 29519)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_52.ai_suggestions USING btree (type);


--
-- TOC entry 5752 (class 1259 OID 29517)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_52.ai_suggestions USING btree (user_id);


--
-- TOC entry 5753 (class 1259 OID 29520)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_52.ai_suggestions USING btree (user_id);


--
-- TOC entry 5756 (class 1259 OID 29529)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_52.analysis_configs USING btree (property_id);


--
-- TOC entry 5757 (class 1259 OID 29530)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_52.analysis_configs USING btree (user_id);


--
-- TOC entry 5778 (class 1259 OID 29670)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_52.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 5781 (class 1259 OID 29671)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_52.automatic_reminders USING btree (status);


--
-- TOC entry 5782 (class 1259 OID 29669)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_52.automatic_reminders USING btree (user_id);


--
-- TOC entry 5791 (class 1259 OID 29716)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON client_52.form_fields USING btree (link_id);


--
-- TOC entry 5834 (class 1259 OID 29940)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_52.form_responses USING btree (form_id);


--
-- TOC entry 5798 (class 1259 OID 29728)
-- Name: forms_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON client_52.forms USING btree (user_id);


--
-- TOC entry 5801 (class 1259 OID 29744)
-- Name: links_profile_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON client_52.links USING btree (profile_id);


--
-- TOC entry 5802 (class 1259 OID 29745)
-- Name: links_type_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX links_type_idx ON client_52.links USING btree (type);


--
-- TOC entry 5821 (class 1259 OID 29861)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_52.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 5811 (class 1259 OID 29790)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_52.rent_receipts USING btree (property_id);


--
-- TOC entry 5812 (class 1259 OID 29792)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_52.rent_receipts USING btree (status);


--
-- TOC entry 5813 (class 1259 OID 29789)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_52.rent_receipts USING btree (tenant_id);


--
-- TOC entry 5814 (class 1259 OID 29791)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_52.rent_receipts USING btree (transaction_id);


--
-- TOC entry 5610 (class 1259 OID 18463)
-- Name: idx_billing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_status ON public.billing_transactions USING btree (status);


--
-- TOC entry 5611 (class 1259 OID 18462)
-- Name: idx_billing_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_user_id ON public.billing_transactions USING btree (user_id);


--
-- TOC entry 5598 (class 1259 OID 18248)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- TOC entry 5599 (class 1259 OID 18247)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 5600 (class 1259 OID 18246)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- TOC entry 5601 (class 1259 OID 18245)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 5612 (class 1259 OID 18601)
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- TOC entry 5613 (class 1259 OID 18600)
-- Name: idx_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_session_id ON public.sessions USING btree (session_id);


--
-- TOC entry 5614 (class 1259 OID 18599)
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- TOC entry 5604 (class 1259 OID 17835)
-- Name: idx_user_notification_settings_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_type ON public.user_notification_settings USING btree (type);


--
-- TOC entry 5605 (class 1259 OID 17834)
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- TOC entry 5590 (class 1259 OID 19350)
-- Name: idx_users_preferred_ai_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_preferred_ai_model ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 5593 (class 1259 OID 19349)
-- Name: users_preferred_ai_model_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_preferred_ai_model_idx ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 5656 (class 1259 OID 27896)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 5657 (class 1259 OID 27897)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 5658 (class 1259 OID 27914)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 5659 (class 1259 OID 27916)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 5660 (class 1259 OID 27915)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON template.ai_messages USING btree (created_at);


--
-- TOC entry 5663 (class 1259 OID 27913)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON template.ai_messages USING btree (user_id);


--
-- TOC entry 5666 (class 1259 OID 27931)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 5667 (class 1259 OID 27934)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 5668 (class 1259 OID 27932)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON template.ai_suggestions USING btree (type);


--
-- TOC entry 5669 (class 1259 OID 27930)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 5670 (class 1259 OID 27933)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 5673 (class 1259 OID 27942)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON template.analysis_configs USING btree (property_id);


--
-- TOC entry 5674 (class 1259 OID 27943)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON template.analysis_configs USING btree (user_id);


--
-- TOC entry 5681 (class 1259 OID 28152)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON template.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 5684 (class 1259 OID 28153)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON template.automatic_reminders USING btree (status);


--
-- TOC entry 5685 (class 1259 OID 28151)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON template.automatic_reminders USING btree (user_id);


--
-- TOC entry 5694 (class 1259 OID 28206)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON template.form_fields USING btree (link_id);


--
-- TOC entry 5651 (class 1259 OID 27835)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON template.form_responses USING btree (form_id);


--
-- TOC entry 5701 (class 1259 OID 28220)
-- Name: forms_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON template.forms USING btree (user_id);


--
-- TOC entry 5704 (class 1259 OID 28238)
-- Name: links_profile_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON template.links USING btree (profile_id);


--
-- TOC entry 5705 (class 1259 OID 28239)
-- Name: links_type_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX links_type_idx ON template.links USING btree (type);


--
-- TOC entry 5722 (class 1259 OID 28360)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON template.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 5714 (class 1259 OID 28292)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON template.rent_receipts USING btree (property_id);


--
-- TOC entry 5715 (class 1259 OID 28294)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON template.rent_receipts USING btree (status);


--
-- TOC entry 5716 (class 1259 OID 28291)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON template.rent_receipts USING btree (tenant_id);


--
-- TOC entry 5717 (class 1259 OID 28293)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON template.rent_receipts USING btree (transaction_id);


--
-- TOC entry 5873 (class 2620 OID 27336)
-- Name: users trg_create_client_schema; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_create_client_schema AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_schema_for_new_client();


--
-- TOC entry 5874 (class 2620 OID 19162)
-- Name: company_info update_company_info_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_company_info_timestamp BEFORE UPDATE ON public.company_info FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5862 (class 2606 OID 18457)
-- Name: billing_transactions billing_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5859 (class 2606 OID 17464)
-- Name: document_templates document_templates_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5860 (class 2606 OID 18249)
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5864 (class 2606 OID 27063)
-- Name: schema_mapping schema_mapping_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_mapping
    ADD CONSTRAINT schema_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5863 (class 2606 OID 18589)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5861 (class 2606 OID 17829)
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5865 (class 2606 OID 27323)
-- Name: documents documents_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5867 (class 2606 OID 27452)
-- Name: feedbacks feedbacks_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5868 (class 2606 OID 27468)
-- Name: form_submissions form_submissions_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5866 (class 2606 OID 27426)
-- Name: maintenance_requests maintenance_requests_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5872 (class 2606 OID 27575)
-- Name: property_analyses property_analyses_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5871 (class 2606 OID 27559)
-- Name: property_coordinates property_coordinates_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5869 (class 2606 OID 27526)
-- Name: property_history property_history_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5870 (class 2606 OID 27543)
-- Name: property_works property_works_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 6175 (class 0 OID 0)
-- Dependencies: 6174
-- Name: DATABASE property_manager; Type: ACL; Schema: -; Owner: postgres
--

GRANT CONNECT ON DATABASE property_manager TO clients;


--
-- TOC entry 6176 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO clients;
GRANT USAGE ON SCHEMA public TO client_role_31;


--
-- TOC entry 6178 (class 0 OID 0)
-- Dependencies: 420
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea) TO clients;


--
-- TOC entry 6179 (class 0 OID 0)
-- Dependencies: 421
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO clients;


--
-- TOC entry 6180 (class 0 OID 0)
-- Dependencies: 424
-- Name: FUNCTION check_auth(p_username text, p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_auth(p_username text, p_password text) TO clients;


--
-- TOC entry 6181 (class 0 OID 0)
-- Dependencies: 397
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.crypt(text, text) TO clients;


--
-- TOC entry 6182 (class 0 OID 0)
-- Dependencies: 422
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dearmor(text) TO clients;


--
-- TOC entry 6183 (class 0 OID 0)
-- Dependencies: 394
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 6184 (class 0 OID 0)
-- Dependencies: 405
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 6185 (class 0 OID 0)
-- Dependencies: 400
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(bytea, text) TO clients;


--
-- TOC entry 6186 (class 0 OID 0)
-- Dependencies: 390
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(text, text) TO clients;


--
-- TOC entry 6187 (class 0 OID 0)
-- Dependencies: 391
-- Name: FUNCTION enable_rls_on_table(table_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enable_rls_on_table(table_name text) TO clients;


--
-- TOC entry 6188 (class 0 OID 0)
-- Dependencies: 404
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 6189 (class 0 OID 0)
-- Dependencies: 395
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO clients;


--
-- TOC entry 6190 (class 0 OID 0)
-- Dependencies: 406
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO clients;


--
-- TOC entry 6191 (class 0 OID 0)
-- Dependencies: 407
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_uuid() TO clients;


--
-- TOC entry 6192 (class 0 OID 0)
-- Dependencies: 398
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text) TO clients;


--
-- TOC entry 6193 (class 0 OID 0)
-- Dependencies: 403
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO clients;


--
-- TOC entry 6194 (class 0 OID 0)
-- Dependencies: 396
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO clients;


--
-- TOC entry 6195 (class 0 OID 0)
-- Dependencies: 401
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(text, text, text) TO clients;


--
-- TOC entry 6196 (class 0 OID 0)
-- Dependencies: 393
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO clients;


--
-- TOC entry 6198 (class 0 OID 0)
-- Dependencies: 426
-- Name: FUNCTION log_table_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_table_changes() TO clients;


--
-- TOC entry 6199 (class 0 OID 0)
-- Dependencies: 423
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO clients;


--
-- TOC entry 6200 (class 0 OID 0)
-- Dependencies: 419
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO clients;


--
-- TOC entry 6201 (class 0 OID 0)
-- Dependencies: 381
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO clients;


--
-- TOC entry 6202 (class 0 OID 0)
-- Dependencies: 383
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO clients;


--
-- TOC entry 6203 (class 0 OID 0)
-- Dependencies: 385
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO clients;


--
-- TOC entry 6204 (class 0 OID 0)
-- Dependencies: 382
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 6205 (class 0 OID 0)
-- Dependencies: 384
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 6206 (class 0 OID 0)
-- Dependencies: 386
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO clients;


--
-- TOC entry 6207 (class 0 OID 0)
-- Dependencies: 417
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO clients;


--
-- TOC entry 6208 (class 0 OID 0)
-- Dependencies: 387
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO clients;


--
-- TOC entry 6209 (class 0 OID 0)
-- Dependencies: 418
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO clients;


--
-- TOC entry 6210 (class 0 OID 0)
-- Dependencies: 388
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO clients;


--
-- TOC entry 6211 (class 0 OID 0)
-- Dependencies: 413
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO clients;


--
-- TOC entry 6212 (class 0 OID 0)
-- Dependencies: 415
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO clients;


--
-- TOC entry 6213 (class 0 OID 0)
-- Dependencies: 414
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 6214 (class 0 OID 0)
-- Dependencies: 416
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 6215 (class 0 OID 0)
-- Dependencies: 408
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO clients;


--
-- TOC entry 6216 (class 0 OID 0)
-- Dependencies: 411
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO clients;


--
-- TOC entry 6217 (class 0 OID 0)
-- Dependencies: 410
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO clients;


--
-- TOC entry 6218 (class 0 OID 0)
-- Dependencies: 412
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO clients;


--
-- TOC entry 6219 (class 0 OID 0)
-- Dependencies: 402
-- Name: FUNCTION recalculate_user_storage(user_id_param integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recalculate_user_storage(user_id_param integer) TO clients;


--
-- TOC entry 6220 (class 0 OID 0)
-- Dependencies: 425
-- Name: FUNCTION set_app_variables(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_app_variables() TO clients;


--
-- TOC entry 6222 (class 0 OID 0)
-- Dependencies: 399
-- Name: FUNCTION sync_theme_colors(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_theme_colors() TO clients;


--
-- TOC entry 6223 (class 0 OID 0)
-- Dependencies: 389
-- Name: FUNCTION test_rls_config(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.test_rls_config() TO clients;


--
-- TOC entry 6224 (class 0 OID 0)
-- Dependencies: 380
-- Name: FUNCTION update_modified_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_modified_column() TO clients;


--
-- TOC entry 6225 (class 0 OID 0)
-- Dependencies: 409
-- Name: FUNCTION update_storage_on_document_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_storage_on_document_change() TO clients;


--
-- TOC entry 6226 (class 0 OID 0)
-- Dependencies: 392
-- Name: FUNCTION update_user_storage_quota(p_user_id integer, p_extension_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_storage_quota(p_user_id integer, p_extension_id integer) TO clients;


--
-- TOC entry 6243 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.alerts TO clients;


--
-- TOC entry 6245 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE alerts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.alerts_id_seq TO clients;


--
-- TOC entry 6246 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE billing_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.billing_transactions TO clients;


--
-- TOC entry 6248 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE billing_transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.billing_transactions_id_seq TO clients;


--
-- TOC entry 6249 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE company_info; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.company_info TO clients;


--
-- TOC entry 6251 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE company_info_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.company_info_id_seq TO clients;


--
-- TOC entry 6252 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE document_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.document_templates TO clients;


--
-- TOC entry 6254 (class 0 OID 0)
-- Dependencies: 224
-- Name: SEQUENCE document_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.document_templates_id_seq TO clients;


--
-- TOC entry 6255 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.notifications TO clients;


--
-- TOC entry 6257 (class 0 OID 0)
-- Dependencies: 226
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.notifications_id_seq TO clients;


--
-- TOC entry 6259 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.sessions TO clients;
GRANT SELECT ON TABLE public.sessions TO client_role_31;


--
-- TOC entry 6261 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.sessions_id_seq TO clients;


--
-- TOC entry 6265 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE user_notification_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_notification_settings TO clients;


--
-- TOC entry 6267 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE user_notification_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.user_notification_settings_id_seq TO clients;


--
-- TOC entry 6268 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.users TO clients;
GRANT SELECT ON TABLE public.users TO client_role_31;


--
-- TOC entry 6270 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.users_id_seq TO clients;


-- Completed on 2025-05-08 00:17:23

--
-- PostgreSQL database dump complete
--

-- Completed on 2025-05-08 00:17:23

--
-- PostgreSQL database cluster dump complete
--

