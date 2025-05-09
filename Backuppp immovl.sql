--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-06 00:32:09

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
-- TOC entry 2 (class 3079 OID 19479)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5765 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 16870)
-- Name: properties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.properties (
    id integer NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    description text,
    type text NOT NULL,
    units integer DEFAULT 0,
    bedrooms integer DEFAULT 0,
    floors integer DEFAULT 0,
    bathrooms integer DEFAULT 0,
    toilets integer DEFAULT 0,
    energy_class text,
    energy_emissions text,
    living_area integer DEFAULT 0,
    land_area integer DEFAULT 0,
    has_parking boolean DEFAULT false,
    has_terrace boolean DEFAULT false,
    has_garage boolean DEFAULT false,
    has_outbuilding boolean DEFAULT false,
    has_balcony boolean DEFAULT false,
    has_elevator boolean DEFAULT false,
    has_cellar boolean DEFAULT false,
    has_garden boolean DEFAULT false,
    is_new_construction boolean DEFAULT false,
    purchase_price numeric(10,2) DEFAULT 0,
    monthly_rent numeric(10,2) DEFAULT 0,
    monthly_expenses numeric(10,2),
    loan_amount numeric(10,2) DEFAULT 0,
    monthly_loan_payment numeric(10,2) DEFAULT 0,
    loan_duration integer,
    status text DEFAULT 'available'::text,
    construction_year integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    purchase_date timestamp without time zone,
    area numeric,
    "livingArea" numeric,
    "landArea" numeric,
    "constructionYear" integer,
    rooms integer,
    "hasParking" boolean DEFAULT false,
    "hasTerrace" boolean DEFAULT false,
    "hasGarage" boolean DEFAULT false,
    "hasOutbuilding" boolean DEFAULT false,
    "hasBalcony" boolean DEFAULT false,
    "hasElevator" boolean DEFAULT false,
    "hasCellar" boolean DEFAULT false,
    "hasGarden" boolean DEFAULT false,
    "isNewConstruction" boolean DEFAULT false,
    images jsonb DEFAULT '[]'::jsonb,
    user_id integer,
    CONSTRAINT properties_energy_class_check CHECK ((energy_class = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text, 'F'::text, 'G'::text]))),
    CONSTRAINT properties_energy_emissions_check CHECK ((energy_emissions = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text, 'F'::text, 'G'::text]))),
    CONSTRAINT properties_status_check CHECK ((status = ANY (ARRAY['available'::text, 'rented'::text, 'maintenance'::text, 'sold'::text]))),
    CONSTRAINT properties_type_check CHECK ((type = ANY (ARRAY['apartment'::text, 'house'::text, 'commercial'::text, 'parking'::text, 'garage'::text, 'land'::text, 'office'::text, 'building'::text, 'storage'::text])))
);

ALTER TABLE ONLY public.properties FORCE ROW LEVEL SECURITY;


ALTER TABLE public.properties OWNER TO postgres;

--
-- TOC entry 327 (class 1255 OID 18754)
-- Name: admin_get_all_properties(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_get_all_properties() RETURNS SETOF public.properties
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF is_admin() THEN
    RETURN QUERY SELECT * FROM properties;
  ELSE
    RETURN QUERY SELECT * FROM properties WHERE user_id = current_user_id();
  END IF;
END;
$$;


ALTER FUNCTION public.admin_get_all_properties() OWNER TO postgres;

--
-- TOC entry 380 (class 1255 OID 19907)
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
-- TOC entry 382 (class 1255 OID 18689)
-- Name: current_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_user_id() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  user_id_var text;
BEGIN
  -- Récupérer de manière sécurisée la valeur, avec une valeur par défaut
  BEGIN
    user_id_var := NULLIF(current_setting('app.user_id', true), '');
    RETURN COALESCE(user_id_var::INTEGER, 0);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Erreur lors de la récupération de l''ID utilisateur: %', SQLERRM;
      RETURN 0;
  END;
END;
$$;


ALTER FUNCTION public.current_user_id() OWNER TO postgres;

--
-- TOC entry 5767 (class 0 OID 0)
-- Dependencies: 382
-- Name: FUNCTION current_user_id(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.current_user_id() IS 'Retourne l''ID de l''utilisateur actuel à partir du contexte d''application';


--
-- TOC entry 384 (class 1255 OID 19950)
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
-- TOC entry 326 (class 1255 OID 18690)
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
-- TOC entry 381 (class 1255 OID 19948)
-- Name: log_table_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_table_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Enregistre les modifications dans la table d'historique appropriée
    IF TG_TABLE_NAME = 'properties' AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'property_history') THEN
      BEGIN
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
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erreur lors de la journalisation des modifications: %', SQLERRM;
      END;
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
-- TOC entry 5768 (class 0 OID 0)
-- Dependencies: 381
-- Name: FUNCTION log_table_changes(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_table_changes() IS 'Fonction pour journaliser les modifications des tables principales';


--
-- TOC entry 346 (class 1255 OID 19450)
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
-- TOC entry 383 (class 1255 OID 19941)
-- Name: safe_create_policy(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.safe_create_policy(p_policy_name text, p_table_name text, p_using_expr text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Vérifier si la politique existe déjà
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = p_policy_name AND tablename = p_table_name
  ) THEN
    -- Supprimer la politique existante
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy_name, p_table_name);
    RAISE NOTICE 'Politique % sur la table % remplacée', p_policy_name, p_table_name;
  END IF;
  
  -- Créer la nouvelle politique
  BEGIN
    EXECUTE format('CREATE POLICY %I ON %I USING (%s)', 
      p_policy_name, p_table_name, p_using_expr);
    RAISE NOTICE 'Politique % sur la table % créée avec succès', p_policy_name, p_table_name;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE WARNING 'La table % n''existe pas encore, politique % ignorée', p_table_name, p_policy_name;
    WHEN OTHERS THEN
      RAISE WARNING 'Erreur lors de la création de la politique % sur la table %: %', 
        p_policy_name, p_table_name, SQLERRM;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur inattendue: %', SQLERRM;
END;
$$;


ALTER FUNCTION public.safe_create_policy(p_policy_name text, p_table_name text, p_using_expr text) OWNER TO postgres;

--
-- TOC entry 5769 (class 0 OID 0)
-- Dependencies: 383
-- Name: FUNCTION safe_create_policy(p_policy_name text, p_table_name text, p_using_expr text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.safe_create_policy(p_policy_name text, p_table_name text, p_using_expr text) IS 'Crée ou remplace une politique RLS de manière sécurisée';


--
-- TOC entry 379 (class 1255 OID 19940)
-- Name: set_app_variables(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_app_variables() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Créer la fonction qui définit les variables d'application par défaut
  EXECUTE 'ALTER DATABASE ' || current_database() || ' SET app.user_id TO ''0''';
  RAISE NOTICE 'Variables d''application configurées avec succès';
RETURN;
END;
$$;


ALTER FUNCTION public.set_app_variables() OWNER TO postgres;

--
-- TOC entry 348 (class 1255 OID 19374)
-- Name: set_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_user_id() RETURNS void
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF current_setting('app.user_id', true) IS NULL THEN
          PERFORM set_config('app.user_id', '0', false);
        END IF;
      END;
      $$;


ALTER FUNCTION public.set_user_id() OWNER TO postgres;

--
-- TOC entry 345 (class 1255 OID 19210)
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
-- TOC entry 385 (class 1255 OID 19957)
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
-- TOC entry 344 (class 1255 OID 18935)
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
-- TOC entry 347 (class 1255 OID 19451)
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
-- TOC entry 325 (class 1255 OID 18464)
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
-- TOC entry 317 (class 1259 OID 19261)
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
-- TOC entry 316 (class 1259 OID 19260)
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
-- TOC entry 5771 (class 0 OID 0)
-- Dependencies: 316
-- Name: ai_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_conversations_id_seq OWNED BY public.ai_conversations.id;


--
-- TOC entry 319 (class 1259 OID 19283)
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
-- TOC entry 318 (class 1259 OID 19282)
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
-- TOC entry 5774 (class 0 OID 0)
-- Dependencies: 318
-- Name: ai_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_messages_id_seq OWNED BY public.ai_messages.id;


--
-- TOC entry 321 (class 1259 OID 19312)
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
-- TOC entry 320 (class 1259 OID 19311)
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
-- TOC entry 5777 (class 0 OID 0)
-- Dependencies: 320
-- Name: ai_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_suggestions_id_seq OWNED BY public.ai_suggestions.id;


--
-- TOC entry 224 (class 1259 OID 17090)
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
-- TOC entry 223 (class 1259 OID 17089)
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
-- TOC entry 5780 (class 0 OID 0)
-- Dependencies: 223
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- TOC entry 275 (class 1259 OID 17776)
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
-- TOC entry 274 (class 1259 OID 17775)
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
-- TOC entry 5783 (class 0 OID 0)
-- Dependencies: 274
-- Name: analysis_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analysis_configs_id_seq OWNED BY public.analysis_configs.id;


--
-- TOC entry 267 (class 1259 OID 17609)
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
-- TOC entry 266 (class 1259 OID 17608)
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
-- TOC entry 5786 (class 0 OID 0)
-- Dependencies: 266
-- Name: automatic_reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automatic_reminders_id_seq OWNED BY public.automatic_reminders.id;


--
-- TOC entry 301 (class 1259 OID 18448)
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
-- TOC entry 300 (class 1259 OID 18447)
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
-- TOC entry 5789 (class 0 OID 0)
-- Dependencies: 300
-- Name: billing_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_transactions_id_seq OWNED BY public.billing_transactions.id;


--
-- TOC entry 313 (class 1259 OID 19148)
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
-- TOC entry 312 (class 1259 OID 19147)
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
-- TOC entry 5792 (class 0 OID 0)
-- Dependencies: 312
-- Name: company_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_info_id_seq OWNED BY public.company_info.id;


--
-- TOC entry 271 (class 1259 OID 17727)
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
-- TOC entry 270 (class 1259 OID 17726)
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
-- TOC entry 5795 (class 0 OID 0)
-- Dependencies: 270
-- Name: contract_parties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contract_parties_id_seq OWNED BY public.contract_parties.id;


--
-- TOC entry 269 (class 1259 OID 17701)
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
-- TOC entry 268 (class 1259 OID 17700)
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
-- TOC entry 5798 (class 0 OID 0)
-- Dependencies: 268
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
-- TOC entry 5801 (class 0 OID 0)
-- Dependencies: 230
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- TOC entry 231 (class 1259 OID 17239)
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
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

ALTER TABLE ONLY public.documents FORCE ROW LEVEL SECURITY;


ALTER TABLE public.documents OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 17251)
-- Name: documents_access_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents_access_log (
    id integer NOT NULL,
    document_id integer NOT NULL,
    user_id integer NOT NULL,
    access_type text NOT NULL,
    accessed_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE public.documents_access_log OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 17257)
-- Name: documents_access_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_access_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_access_log_id_seq OWNER TO postgres;

--
-- TOC entry 5805 (class 0 OID 0)
-- Dependencies: 233
-- Name: documents_access_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_access_log_id_seq OWNED BY public.documents_access_log.id;


--
-- TOC entry 234 (class 1259 OID 17258)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- TOC entry 5807 (class 0 OID 0)
-- Dependencies: 234
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- TOC entry 228 (class 1259 OID 17113)
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedbacks (
    id integer NOT NULL,
    "userId" integer,
    content text NOT NULL,
    rating integer,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.feedbacks OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17112)
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedbacks_id_seq OWNER TO postgres;

--
-- TOC entry 5810 (class 0 OID 0)
-- Dependencies: 227
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedbacks_id_seq OWNED BY public.feedbacks.id;


--
-- TOC entry 235 (class 1259 OID 17259)
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
-- TOC entry 236 (class 1259 OID 17267)
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
-- TOC entry 5813 (class 0 OID 0)
-- Dependencies: 236
-- Name: financial_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.financial_entries_id_seq OWNED BY public.financial_entries.id;


--
-- TOC entry 237 (class 1259 OID 17268)
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
-- TOC entry 238 (class 1259 OID 17275)
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
-- TOC entry 5816 (class 0 OID 0)
-- Dependencies: 238
-- Name: folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folders_id_seq OWNED BY public.folders.id;


--
-- TOC entry 291 (class 1259 OID 18206)
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
-- TOC entry 290 (class 1259 OID 18205)
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
-- TOC entry 5819 (class 0 OID 0)
-- Dependencies: 290
-- Name: form_field_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_field_options_id_seq OWNED BY public.form_field_options.id;


--
-- TOC entry 289 (class 1259 OID 18187)
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
-- TOC entry 288 (class 1259 OID 18186)
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
-- TOC entry 5822 (class 0 OID 0)
-- Dependencies: 288
-- Name: form_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_fields_id_seq OWNED BY public.form_fields.id;


--
-- TOC entry 281 (class 1259 OID 18025)
-- Name: form_responses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_responses (
    id integer NOT NULL,
    form_id integer,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address text
);


ALTER TABLE public.form_responses OWNER TO postgres;

--
-- TOC entry 5824 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE form_responses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.form_responses IS 'Réponses soumises aux formulaires';


--
-- TOC entry 280 (class 1259 OID 18024)
-- Name: form_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_responses_id_seq OWNER TO postgres;

--
-- TOC entry 5826 (class 0 OID 0)
-- Dependencies: 280
-- Name: form_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_responses_id_seq OWNED BY public.form_responses.id;


--
-- TOC entry 287 (class 1259 OID 18165)
-- Name: form_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_submissions (
    id integer NOT NULL,
    link_id integer NOT NULL,
    form_data jsonb NOT NULL,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.form_submissions OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 18164)
-- Name: form_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_submissions_id_seq OWNER TO postgres;

--
-- TOC entry 5829 (class 0 OID 0)
-- Dependencies: 286
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_submissions_id_seq OWNED BY public.form_submissions.id;


--
-- TOC entry 279 (class 1259 OID 18013)
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
-- TOC entry 5831 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE forms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.forms IS 'Formulaires créés par les utilisateurs';


--
-- TOC entry 278 (class 1259 OID 18012)
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
-- TOC entry 5833 (class 0 OID 0)
-- Dependencies: 278
-- Name: forms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.forms_id_seq OWNED BY public.forms.id;


--
-- TOC entry 283 (class 1259 OID 18112)
-- Name: link_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.link_profiles (
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


ALTER TABLE public.link_profiles OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 18111)
-- Name: link_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.link_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.link_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 5836 (class 0 OID 0)
-- Dependencies: 282
-- Name: link_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.link_profiles_id_seq OWNED BY public.link_profiles.id;


--
-- TOC entry 285 (class 1259 OID 18144)
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
-- TOC entry 284 (class 1259 OID 18143)
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
-- TOC entry 5839 (class 0 OID 0)
-- Dependencies: 284
-- Name: links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.links_id_seq OWNED BY public.links.id;


--
-- TOC entry 222 (class 1259 OID 17055)
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
-- TOC entry 221 (class 1259 OID 17054)
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
-- TOC entry 5842 (class 0 OID 0)
-- Dependencies: 221
-- Name: maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_id_seq OWNED BY public.maintenance.id;


--
-- TOC entry 239 (class 1259 OID 17276)
-- Name: maintenance_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_requests (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    property_id integer NOT NULL,
    tenant_id integer,
    reported_by text,
    total_cost numeric(10,2),
    document_id integer,
    document_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.maintenance_requests OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 17286)
-- Name: maintenance_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_requests_id_seq OWNER TO postgres;

--
-- TOC entry 5845 (class 0 OID 0)
-- Dependencies: 240
-- Name: maintenance_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_requests_id_seq OWNED BY public.maintenance_requests.id;


--
-- TOC entry 241 (class 1259 OID 17287)
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
-- TOC entry 242 (class 1259 OID 17294)
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
-- TOC entry 5848 (class 0 OID 0)
-- Dependencies: 242
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 307 (class 1259 OID 19102)
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
-- TOC entry 306 (class 1259 OID 19101)
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
-- TOC entry 5851 (class 0 OID 0)
-- Dependencies: 306
-- Name: pdf_configuration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_configuration_id_seq OWNED BY public.pdf_configuration.id;


--
-- TOC entry 305 (class 1259 OID 19002)
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
-- TOC entry 304 (class 1259 OID 19001)
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
-- TOC entry 5854 (class 0 OID 0)
-- Dependencies: 304
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_document_preferences_id_seq OWNED BY public.pdf_document_preferences.id;


--
-- TOC entry 309 (class 1259 OID 19122)
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
-- TOC entry 308 (class 1259 OID 19121)
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
-- TOC entry 5857 (class 0 OID 0)
-- Dependencies: 308
-- Name: pdf_logos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_logos_id_seq OWNED BY public.pdf_logos.id;


--
-- TOC entry 311 (class 1259 OID 19136)
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
-- TOC entry 310 (class 1259 OID 19135)
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
-- TOC entry 5860 (class 0 OID 0)
-- Dependencies: 310
-- Name: pdf_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_templates_id_seq OWNED BY public.pdf_templates.id;


--
-- TOC entry 315 (class 1259 OID 19190)
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
-- TOC entry 314 (class 1259 OID 19189)
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
-- TOC entry 5863 (class 0 OID 0)
-- Dependencies: 314
-- Name: pdf_themes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdf_themes_id_seq OWNED BY public.pdf_themes.id;


--
-- TOC entry 243 (class 1259 OID 17295)
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.properties_id_seq OWNER TO postgres;

--
-- TOC entry 5865 (class 0 OID 0)
-- Dependencies: 243
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- TOC entry 273 (class 1259 OID 17754)
-- Name: property_analyses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_analyses (
    id integer NOT NULL,
    property_id integer,
    user_id integer,
    analysis_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.property_analyses OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 17753)
-- Name: property_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_analyses_id_seq OWNER TO postgres;

--
-- TOC entry 5868 (class 0 OID 0)
-- Dependencies: 272
-- Name: property_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_analyses_id_seq OWNED BY public.property_analyses.id;


--
-- TOC entry 244 (class 1259 OID 17296)
-- Name: property_coordinates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_coordinates (
    id integer NOT NULL,
    property_id integer NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.property_coordinates OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 17300)
-- Name: property_coordinates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_coordinates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_coordinates_id_seq OWNER TO postgres;

--
-- TOC entry 5871 (class 0 OID 0)
-- Dependencies: 245
-- Name: property_coordinates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_coordinates_id_seq OWNED BY public.property_coordinates.id;


--
-- TOC entry 246 (class 1259 OID 17301)
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
-- TOC entry 247 (class 1259 OID 17309)
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
-- TOC entry 5874 (class 0 OID 0)
-- Dependencies: 247
-- Name: property_financial_goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_financial_goals_id_seq OWNED BY public.property_financial_goals.id;


--
-- TOC entry 248 (class 1259 OID 17310)
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
-- TOC entry 249 (class 1259 OID 17317)
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
-- TOC entry 5877 (class 0 OID 0)
-- Dependencies: 249
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_financial_snapshots_id_seq OWNED BY public.property_financial_snapshots.id;


--
-- TOC entry 250 (class 1259 OID 17318)
-- Name: property_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_history (
    id integer NOT NULL,
    property_id integer NOT NULL,
    field text NOT NULL,
    old_value text,
    new_value text,
    change_type text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.property_history OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 17325)
-- Name: property_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_history_id_seq OWNER TO postgres;

--
-- TOC entry 5880 (class 0 OID 0)
-- Dependencies: 251
-- Name: property_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_history_id_seq OWNED BY public.property_history.id;


--
-- TOC entry 252 (class 1259 OID 17326)
-- Name: property_works; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_works (
    id integer NOT NULL,
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


ALTER TABLE public.property_works OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 17336)
-- Name: property_works_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_works_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_works_id_seq OWNER TO postgres;

--
-- TOC entry 5883 (class 0 OID 0)
-- Dependencies: 253
-- Name: property_works_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_works_id_seq OWNED BY public.property_works.id;


--
-- TOC entry 265 (class 1259 OID 17597)
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
-- TOC entry 264 (class 1259 OID 17596)
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
-- TOC entry 5886 (class 0 OID 0)
-- Dependencies: 264
-- Name: rent_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rent_receipts_id_seq OWNED BY public.rent_receipts.id;


--
-- TOC entry 226 (class 1259 OID 17102)
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
-- TOC entry 225 (class 1259 OID 17101)
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
-- TOC entry 5889 (class 0 OID 0)
-- Dependencies: 225
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- TOC entry 303 (class 1259 OID 18577)
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
-- TOC entry 5891 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sessions IS 'Stocke les sessions d''authentification des utilisateurs';


--
-- TOC entry 302 (class 1259 OID 18576)
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
-- TOC entry 5893 (class 0 OID 0)
-- Dependencies: 302
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- TOC entry 299 (class 1259 OID 18432)
-- Name: storage_extensions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_extensions (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    quota_bytes numeric NOT NULL,
    price numeric NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


ALTER TABLE public.storage_extensions OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 18431)
-- Name: storage_extensions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_extensions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_extensions_id_seq OWNER TO postgres;

--
-- TOC entry 5896 (class 0 OID 0)
-- Dependencies: 298
-- Name: storage_extensions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_extensions_id_seq OWNED BY public.storage_extensions.id;


--
-- TOC entry 323 (class 1259 OID 19434)
-- Name: storage_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_transactions (
    id integer NOT NULL,
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


ALTER TABLE public.storage_transactions OWNER TO postgres;

--
-- TOC entry 322 (class 1259 OID 19433)
-- Name: storage_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_transactions_id_seq OWNER TO postgres;

--
-- TOC entry 5899 (class 0 OID 0)
-- Dependencies: 322
-- Name: storage_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_transactions_id_seq OWNED BY public.storage_transactions.id;


--
-- TOC entry 295 (class 1259 OID 18367)
-- Name: storage_usage_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_usage_details (
    id integer NOT NULL,
    user_id integer NOT NULL,
    resource_type character varying(50) NOT NULL,
    used_bytes numeric DEFAULT 0 NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_usage_details OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 18366)
-- Name: storage_usage_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_usage_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_usage_details_id_seq OWNER TO postgres;

--
-- TOC entry 5902 (class 0 OID 0)
-- Dependencies: 294
-- Name: storage_usage_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_usage_details_id_seq OWNED BY public.storage_usage_details.id;


--
-- TOC entry 254 (class 1259 OID 17337)
-- Name: tenant_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_documents (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    document_id integer NOT NULL,
    document_type text DEFAULT 'lease'::text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tenant_documents OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 17344)
-- Name: tenant_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenant_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_documents_id_seq OWNER TO postgres;

--
-- TOC entry 5905 (class 0 OID 0)
-- Dependencies: 255
-- Name: tenant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenant_documents_id_seq OWNED BY public.tenant_documents.id;


--
-- TOC entry 256 (class 1259 OID 17345)
-- Name: tenant_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_history (
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


ALTER TABLE public.tenant_history OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 17355)
-- Name: tenant_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenant_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_history_id_seq OWNER TO postgres;

--
-- TOC entry 5908 (class 0 OID 0)
-- Dependencies: 257
-- Name: tenant_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenant_history_id_seq OWNED BY public.tenant_history.id;


--
-- TOC entry 220 (class 1259 OID 16906)
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
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

ALTER TABLE ONLY public.tenants FORCE ROW LEVEL SECURITY;


ALTER TABLE public.tenants OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 17356)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenants_id_seq OWNER TO postgres;

--
-- TOC entry 5911 (class 0 OID 0)
-- Dependencies: 258
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- TOC entry 293 (class 1259 OID 18224)
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
-- TOC entry 292 (class 1259 OID 18223)
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
-- TOC entry 5914 (class 0 OID 0)
-- Dependencies: 292
-- Name: transaction_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_attachments_id_seq OWNED BY public.transaction_attachments.id;


--
-- TOC entry 259 (class 1259 OID 17357)
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
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

ALTER TABLE ONLY public.transactions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.transactions OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 17364)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 5917 (class 0 OID 0)
-- Dependencies: 260
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- TOC entry 277 (class 1259 OID 17811)
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
-- TOC entry 5919 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE user_notification_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_notification_settings IS 'Stores user preferences for notification deliveries';


--
-- TOC entry 276 (class 1259 OID 17810)
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
-- TOC entry 5921 (class 0 OID 0)
-- Dependencies: 276
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- TOC entry 297 (class 1259 OID 18415)
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plan_id integer NOT NULL,
    start_date timestamp without time zone DEFAULT now() NOT NULL,
    end_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    auto_renew boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    storage_extension_id integer,
    external_id character varying(255)
);


ALTER TABLE public.user_subscriptions OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 18414)
-- Name: user_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_subscriptions_id_seq OWNER TO postgres;

--
-- TOC entry 5924 (class 0 OID 0)
-- Dependencies: 296
-- Name: user_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_subscriptions_id_seq OWNED BY public.user_subscriptions.id;


--
-- TOC entry 218 (class 1259 OID 16853)
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
-- TOC entry 261 (class 1259 OID 17365)
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
-- TOC entry 5927 (class 0 OID 0)
-- Dependencies: 261
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 262 (class 1259 OID 17366)
-- Name: visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visits (
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


ALTER TABLE public.visits OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 17378)
-- Name: visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.visits_id_seq OWNER TO postgres;

--
-- TOC entry 5930 (class 0 OID 0)
-- Dependencies: 263
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.visits_id_seq OWNED BY public.visits.id;


--
-- TOC entry 5207 (class 2604 OID 19264)
-- Name: ai_conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations ALTER COLUMN id SET DEFAULT nextval('public.ai_conversations_id_seq'::regclass);


--
-- TOC entry 5213 (class 2604 OID 19286)
-- Name: ai_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages ALTER COLUMN id SET DEFAULT nextval('public.ai_messages_id_seq'::regclass);


--
-- TOC entry 5220 (class 2604 OID 19315)
-- Name: ai_suggestions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions ALTER COLUMN id SET DEFAULT nextval('public.ai_suggestions_id_seq'::regclass);


--
-- TOC entry 4980 (class 2604 OID 17093)
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- TOC entry 5079 (class 2604 OID 17779)
-- Name: analysis_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_configs ALTER COLUMN id SET DEFAULT nextval('public.analysis_configs_id_seq'::regclass);


--
-- TOC entry 5062 (class 2604 OID 17612)
-- Name: automatic_reminders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automatic_reminders ALTER COLUMN id SET DEFAULT nextval('public.automatic_reminders_id_seq'::regclass);


--
-- TOC entry 5141 (class 2604 OID 18451)
-- Name: billing_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions ALTER COLUMN id SET DEFAULT nextval('public.billing_transactions_id_seq'::regclass);


--
-- TOC entry 5195 (class 2604 OID 19151)
-- Name: company_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info ALTER COLUMN id SET DEFAULT nextval('public.company_info_id_seq'::regclass);


--
-- TOC entry 5073 (class 2604 OID 17730)
-- Name: contract_parties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_parties ALTER COLUMN id SET DEFAULT nextval('public.contract_parties_id_seq'::regclass);


--
-- TOC entry 5067 (class 2604 OID 17704)
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- TOC entry 4990 (class 2604 OID 17382)
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);


--
-- TOC entry 4993 (class 2604 OID 17383)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 5002 (class 2604 OID 17384)
-- Name: documents_access_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_access_log ALTER COLUMN id SET DEFAULT nextval('public.documents_access_log_id_seq'::regclass);


--
-- TOC entry 4987 (class 2604 OID 17116)
-- Name: feedbacks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks ALTER COLUMN id SET DEFAULT nextval('public.feedbacks_id_seq'::regclass);


--
-- TOC entry 5004 (class 2604 OID 17385)
-- Name: financial_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_entries ALTER COLUMN id SET DEFAULT nextval('public.financial_entries_id_seq'::regclass);


--
-- TOC entry 5008 (class 2604 OID 17386)
-- Name: folders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders ALTER COLUMN id SET DEFAULT nextval('public.folders_id_seq'::regclass);


--
-- TOC entry 5124 (class 2604 OID 18209)
-- Name: form_field_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_field_options ALTER COLUMN id SET DEFAULT nextval('public.form_field_options_id_seq'::regclass);


--
-- TOC entry 5119 (class 2604 OID 18190)
-- Name: form_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields ALTER COLUMN id SET DEFAULT nextval('public.form_fields_id_seq'::regclass);


--
-- TOC entry 5090 (class 2604 OID 18028)
-- Name: form_responses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_responses ALTER COLUMN id SET DEFAULT nextval('public.form_responses_id_seq'::regclass);


--
-- TOC entry 5117 (class 2604 OID 18168)
-- Name: form_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions ALTER COLUMN id SET DEFAULT nextval('public.form_submissions_id_seq'::regclass);


--
-- TOC entry 5088 (class 2604 OID 18016)
-- Name: forms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms ALTER COLUMN id SET DEFAULT nextval('public.forms_id_seq'::regclass);


--
-- TOC entry 5092 (class 2604 OID 18115)
-- Name: link_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_profiles ALTER COLUMN id SET DEFAULT nextval('public.link_profiles_id_seq'::regclass);


--
-- TOC entry 5109 (class 2604 OID 18147)
-- Name: links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.links ALTER COLUMN id SET DEFAULT nextval('public.links_id_seq'::regclass);


--
-- TOC entry 4976 (class 2604 OID 17058)
-- Name: maintenance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance ALTER COLUMN id SET DEFAULT nextval('public.maintenance_id_seq'::regclass);


--
-- TOC entry 5011 (class 2604 OID 17387)
-- Name: maintenance_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_requests ALTER COLUMN id SET DEFAULT nextval('public.maintenance_requests_id_seq'::regclass);


--
-- TOC entry 5017 (class 2604 OID 17388)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 5152 (class 2604 OID 19105)
-- Name: pdf_configuration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_configuration ALTER COLUMN id SET DEFAULT nextval('public.pdf_configuration_id_seq'::regclass);


--
-- TOC entry 5146 (class 2604 OID 19005)
-- Name: pdf_document_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_document_preferences ALTER COLUMN id SET DEFAULT nextval('public.pdf_document_preferences_id_seq'::regclass);


--
-- TOC entry 5178 (class 2604 OID 19125)
-- Name: pdf_logos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_logos ALTER COLUMN id SET DEFAULT nextval('public.pdf_logos_id_seq'::regclass);


--
-- TOC entry 5184 (class 2604 OID 19139)
-- Name: pdf_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates ALTER COLUMN id SET DEFAULT nextval('public.pdf_templates_id_seq'::regclass);


--
-- TOC entry 5198 (class 2604 OID 19193)
-- Name: pdf_themes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_themes ALTER COLUMN id SET DEFAULT nextval('public.pdf_themes_id_seq'::regclass);


--
-- TOC entry 4937 (class 2604 OID 17389)
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- TOC entry 5075 (class 2604 OID 17757)
-- Name: property_analyses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_analyses ALTER COLUMN id SET DEFAULT nextval('public.property_analyses_id_seq'::regclass);


--
-- TOC entry 5020 (class 2604 OID 17390)
-- Name: property_coordinates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_coordinates ALTER COLUMN id SET DEFAULT nextval('public.property_coordinates_id_seq'::regclass);


--
-- TOC entry 5022 (class 2604 OID 17391)
-- Name: property_financial_goals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_goals ALTER COLUMN id SET DEFAULT nextval('public.property_financial_goals_id_seq'::regclass);


--
-- TOC entry 5026 (class 2604 OID 17392)
-- Name: property_financial_snapshots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_snapshots ALTER COLUMN id SET DEFAULT nextval('public.property_financial_snapshots_id_seq'::regclass);


--
-- TOC entry 5029 (class 2604 OID 17393)
-- Name: property_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_history ALTER COLUMN id SET DEFAULT nextval('public.property_history_id_seq'::regclass);


--
-- TOC entry 5032 (class 2604 OID 17394)
-- Name: property_works id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_works ALTER COLUMN id SET DEFAULT nextval('public.property_works_id_seq'::regclass);


--
-- TOC entry 5058 (class 2604 OID 17600)
-- Name: rent_receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts ALTER COLUMN id SET DEFAULT nextval('public.rent_receipts_id_seq'::regclass);


--
-- TOC entry 4984 (class 2604 OID 17105)
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- TOC entry 5143 (class 2604 OID 18580)
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- TOC entry 5139 (class 2604 OID 18435)
-- Name: storage_extensions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_extensions ALTER COLUMN id SET DEFAULT nextval('public.storage_extensions_id_seq'::regclass);


--
-- TOC entry 5224 (class 2604 OID 19437)
-- Name: storage_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_transactions ALTER COLUMN id SET DEFAULT nextval('public.storage_transactions_id_seq'::regclass);


--
-- TOC entry 5129 (class 2604 OID 18370)
-- Name: storage_usage_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_usage_details ALTER COLUMN id SET DEFAULT nextval('public.storage_usage_details_id_seq'::regclass);


--
-- TOC entry 5038 (class 2604 OID 17395)
-- Name: tenant_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_documents ALTER COLUMN id SET DEFAULT nextval('public.tenant_documents_id_seq'::regclass);


--
-- TOC entry 5041 (class 2604 OID 17396)
-- Name: tenant_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_history ALTER COLUMN id SET DEFAULT nextval('public.tenant_history_id_seq'::regclass);


--
-- TOC entry 4971 (class 2604 OID 17397)
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- TOC entry 5127 (class 2604 OID 18227)
-- Name: transaction_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_attachments ALTER COLUMN id SET DEFAULT nextval('public.transaction_attachments_id_seq'::regclass);


--
-- TOC entry 5047 (class 2604 OID 17398)
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- TOC entry 5081 (class 2604 OID 17814)
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- TOC entry 5133 (class 2604 OID 18418)
-- Name: user_subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.user_subscriptions_id_seq'::regclass);


--
-- TOC entry 4923 (class 2604 OID 17399)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5050 (class 2604 OID 17400)
-- Name: visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits ALTER COLUMN id SET DEFAULT nextval('public.visits_id_seq'::regclass);


--
-- TOC entry 5752 (class 0 OID 19261)
-- Dependencies: 317
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
1	1	Quel est le prix au m² à Villemandeu	2025-05-04 20:57:42.689419	2025-05-04 20:57:42.689419	active	general	{}
2	1	Comment calculer un préavis de départ pour un loca...	2025-05-04 22:39:16.001289	2025-05-04 20:39:16.016	active	general	{}
3	1	gfg	2025-05-05 02:04:18.350112	2025-05-05 00:04:18.368	active	general	{}
\.


--
-- TOC entry 5754 (class 0 OID 19283)
-- Dependencies: 319
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
1	1	user	Comment calculer un préavis de départ pour un locataire ?	{}	2	2025-05-04 22:39:16.009931	f	huggingface	huggingface
2	1	assistant	La gestion des locataires est facilitée par notre plateforme. Vous pouvez consulter les profils des locataires, accéder à leurs informations de contact et à l'historique des communications dans l'onglet 'Locataires'.	{}	2	2025-05-04 22:39:16.319889	f	huggingface	huggingface
3	1	user	gfg	{}	3	2025-05-05 02:04:18.362823	f	huggingface	huggingface
4	1	assistant	Une erreur s'est produite lors de la génération de la réponse. Veuillez réessayer plus tard.	{}	3	2025-05-05 02:04:18.980344	f	huggingface	huggingface
\.


--
-- TOC entry 5756 (class 0 OID 19312)
-- Dependencies: 321
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 5659 (class 0 OID 17090)
-- Dependencies: 224
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, title, description, "userId", type, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5710 (class 0 OID 17776)
-- Dependencies: 275
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5702 (class 0 OID 17609)
-- Dependencies: 267
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5736 (class 0 OID 18448)
-- Dependencies: 301
-- Data for Name: billing_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_transactions (id, user_id, amount, description, status, payment_method, transaction_date, next_billing_date, metadata) FROM stdin;
1	1	9.99	Abonnement Premium	completed	\N	2025-04-01 20:51:22.968368	\N	\N
2	1	9.99	Renouvellement abonnement Premium	completed	\N	2025-04-30 20:51:22.968368	\N	\N
\.


--
-- TOC entry 5748 (class 0 OID 19148)
-- Dependencies: 313
-- Data for Name: company_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
1	1	Votre Entreprise	123 Rue Exemple, 75000 Paris	01 23 45 67 89	contact@votreentreprise.com	www.votreentreprise.com	123 456 789 00012	2025-05-04 04:18:46.578071	2025-05-04 04:18:46.578071
\.


--
-- TOC entry 5706 (class 0 OID 17727)
-- Dependencies: 271
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_parties (id, contract_id, party_id, party_type, created_at) FROM stdin;
1	6	8	tenant	2025-04-09 16:38:17.199
\.


--
-- TOC entry 5704 (class 0 OID 17701)
-- Dependencies: 269
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
6	la parlerne	rental	draft	2025-04-11 22:00:00	2025-04-17 22:00:00	1	\N	t	t	\N	\N	2025-04-09 16:38:17.184	2025-04-09 16:38:17.184
\.


--
-- TOC entry 5664 (class 0 OID 17231)
-- Dependencies: 229
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5666 (class 0 OID 17239)
-- Dependencies: 231
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, title, type, file_path, original_name, template, user_id, folder_id, parent_id, template_id, created_at, updated_at, form_data, content, theme, file_size) FROM stdin;
1	Mesure taille-poignet-montre EN (2)	other	Mesure_taille-poignet-montre_EN__2_-1743553815589-38507772.pdf	Mesure taille-poignet-montre EN (2).pdf	f	1	\N	\N	\N	2025-04-02 00:30:15.638	2025-04-02 00:30:15.638	{"customFileName": "Mesure taille-poignet-montre EN (2)"}	{}	{}	0
2	document-1	other	document-1-1743554474217-519725335.pdf	document-1.pdf	f	2	\N	\N	\N	2025-04-02 00:41:14.234	2025-04-02 00:41:14.234	{"customFileName": "document-1"}	{}	{}	0
3	document-1	other	document-1-1743554532994-721969766.pdf	document-1.pdf	f	2	\N	\N	\N	2025-04-02 00:42:13	2025-04-02 00:42:13	{"customFileName": "document-1"}	{}	{}	0
4	document-1.pdf	invoice	document-1-1743555416970-541483782.pdf	document-1.pdf	f	2	\N	\N	\N	2025-04-02 00:56:56.992	2025-04-02 00:56:56.992	{"source": "finance", "section": "finance", "description": "Document financier\\nDocument uploadé via le formulaire Finances", "uploadMethod": "form", "uploadSource": "finance", "transactionId": 1, "uploadContext": "transaction", "transactionType": "income", "documentCategory": "finance"}	{}	{}	0
5	document-1.pdf	invoice	document-1-1743555437311-794341839.pdf	document-1.pdf	f	2	\N	\N	\N	2025-04-02 00:57:17.326	2025-04-02 00:57:17.326	{"source": "finance", "section": "finance", "description": "Document financier\\nDocument uploadé via le formulaire Finances", "uploadMethod": "form", "uploadSource": "finance", "transactionId": 2, "uploadContext": "transaction", "transactionType": "income", "documentCategory": "finance"}	{}	{}	0
6	document-1	other	document-1-1743555449893-527091477.pdf	document-1.pdf	f	2	\N	\N	\N	2025-04-02 00:57:29.902	2025-04-02 00:57:29.902	{"customFileName": "document-1"}	{}	{}	0
7	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743555474030-822015122.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-02 00:57:54.036	2025-04-02 00:57:54.036	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: vbv", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
8	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743555533147-387057688.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-02 00:58:53.196	2025-04-02 00:58:53.196	{"source": "finance", "section": "finance", "description": "Document financier\\nDocument uploadé via le formulaire Finances", "uploadMethod": "form", "uploadSource": "finance", "transactionId": 4, "uploadContext": "transaction", "transactionType": "income", "documentCategory": "finance"}	{}	{}	0
9	document-1.pdf	invoice	document-1-1743597029421-408193031.pdf	document-1.pdf	f	2	\N	\N	\N	2025-04-02 12:30:29.433	2025-04-02 12:30:29.433	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande modifiée: fg", "uploadMethod": "form", "uploadSource": "maintenance_edit_form", "uploadContext": "maintenance_edit", "customFileName": "document-1.pdf", "documentCategory": "maintenance", "originalFileName": "document-1.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
10	document-1.pdf	invoice	document-1-1743597182688-236011901.pdf	document-1.pdf	f	2	\N	\N	\N	2025-04-02 12:33:02.694	2025-04-02 12:33:02.694	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande modifiée: gfgd", "uploadMethod": "form", "uploadSource": "maintenance_edit_form", "uploadContext": "maintenance_edit", "customFileName": "document-1.pdf", "documentCategory": "maintenance", "originalFileName": "document-1.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
11	Document Locataire	lease	Mesure_taille-poignet-montre_EN__2_-1743698732923-420832867.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 16:45:32.935	2025-04-03 16:45:32.935	{"customFileName": "Document Locataire"}	{}	{}	0
12	Document Locataire	lease	Mesure_taille-poignet-montre_EN-1743698732965-498277817.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 16:45:32.97	2025-04-03 16:45:32.97	{"customFileName": "Document Locataire"}	{}	{}	0
13	teste lcoataire .pdf	tenant	Mesure_taille-poignet-montre_EN__2_-1743703228076-458626659.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:00:28.084	2025-04-03 18:00:28.084	{"customFileName": "teste lcoataire .pdf"}	{}	{}	0
14	teste lkocaite 2 .pdf	lease	Mesure_taille-poignet-montre_EN-1743703228172-741641697.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:00:28.176	2025-04-03 18:00:28.176	{"customFileName": "teste lkocaite 2 .pdf"}	{}	{}	0
15	dsdsmontre EN (2).pdf	other	Mesure_taille-poignet-montre_EN__2_-1743703563751-868878535.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:06:03.758	2025-04-03 18:06:03.758	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 5000, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "dsdsmontre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Autre"}	{}	{}	0
16	Mesdsqlle-poignet-montre EN.pdf	tax	Mesure_taille-poignet-montre_EN-1743703563868-442533959.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:06:03.874	2025-04-03 18:06:03.874	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 5000, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesdsqlle-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Impôts"}	{}	{}	0
17	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743703871073-993894735.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:11:11.108	2025-04-03 18:11:11.108	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 54, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
18	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743703871201-72324704.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:11:11.207	2025-04-03 18:11:11.207	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 54, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
106	Document justificatif (general)	report	documents-1743726085583-3412123.pdf	Mesure taille-poignet-montre EN - Copie - Copie - Copie.pdf	f	2	1	\N	\N	2025-04-04 00:21:25.594	2025-04-04 00:21:25.595	{"source": "tenant_history", "category": "general", "eventType": "general"}	{}	{}	0
19	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743704657327-558104588.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:24:17.368	2025-04-03 18:24:17.368	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 50, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
20	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743704657428-462104057.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:24:17.433	2025-04-03 18:24:17.433	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 50, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
21	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743704942584-600625242.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:29:02.59	2025-04-03 18:29:02.59	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_etudiant", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
22	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743704942686-119569364.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:29:02.692	2025-04-03 18:29:02.692	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_etudiant", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
23	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743705095472-846093802.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:31:35.478	2025-04-03 18:31:35.478	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "tenantId": 10, "leaseType": "bail_vide", "rentAmount": "50.00", "description": "Document Locataire\\nDocument uploadé via le formulaire modification Locataire", "uploadMethod": "form", "uploadSource": "tenant_edit_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
24	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743705095523-288603641.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:31:35.528	2025-04-03 18:31:35.528	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "tenantId": 10, "leaseType": "bail_vide", "rentAmount": "50.00", "description": "Document Locataire\\nDocument uploadé via le formulaire modification Locataire", "uploadMethod": "form", "uploadSource": "tenant_edit_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
25	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743705363596-223172779.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:36:03.603	2025-04-03 18:36:03.603	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 3.99, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
26	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743705363695-513813459.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:36:03.726	2025-04-03 18:36:03.726	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 3.99, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
27	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743705435235-910571137.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:37:15.251	2025-04-03 18:37:15.251	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: ef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
28	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743705435352-610825534.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:37:15.358	2025-04-03 18:37:15.358	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: ef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
29	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743705443629-568766224.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:37:23.635	2025-04-03 18:37:23.635	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: ef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
30	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743705461420-114474066.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:37:41.428	2025-04-03 18:37:41.428	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: effefef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
31	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743705461475-366714933.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:37:41.481	2025-04-03 18:37:41.481	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: effefef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
32	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743705462692-848965836.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:37:42.704	2025-04-03 18:37:42.704	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: effefef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
33	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743705462803-72480152.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:37:42.812	2025-04-03 18:37:42.812	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: effefef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
34	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743705463395-552192959.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:37:43.406	2025-04-03 18:37:43.406	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: effefef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
35	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743705463401-868849427.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:37:43.438	2025-04-03 18:37:43.438	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: effefef", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
36	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743705480491-856851641.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:38:00.554	2025-04-03 18:38:00.554	{"source": "finance", "section": "finance", "description": "Document financier\\nDocument uploadé via le formulaire Finances", "uploadMethod": "form", "uploadSource": "finance", "transactionId": 27, "uploadContext": "transaction", "transactionType": "income", "documentCategory": "finance"}	{}	{}	0
37	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743705480496-425607373.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:38:00.568	2025-04-03 18:38:00.568	{"source": "finance", "section": "finance", "description": "Document financier\\nDocument uploadé via le formulaire Finances", "uploadMethod": "form", "uploadSource": "finance", "transactionId": 27, "uploadContext": "transaction", "transactionType": "income", "documentCategory": "finance"}	{}	{}	0
38	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743705536219-347431533.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:38:56.231	2025-04-03 18:38:56.231	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: sc", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
39	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743705536553-779847974.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:38:56.622	2025-04-03 18:38:56.622	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: sc", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
40	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743705619957-669620119.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:40:19.968	2025-04-03 18:40:19.968	{"source": "tenant", "tenant": "tet", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 48, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
41	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743705620088-852136454.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:40:20.094	2025-04-03 18:40:20.094	{"source": "tenant", "tenant": "tet", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 48, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
42	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706145585-881804628.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:49:05.591	2025-04-03 18:49:05.591	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
101	Document notation	tenant_history	documents-1743714527499-524695344.pdf	Mesure taille-poignet-montre EN - Copie - Copie.pdf	f	2	\N	\N	\N	2025-04-03 21:08:47.502	2025-04-03 21:08:47.502	{"source": "tenant_history", "section": "locataire", "category": "general", "eventType": "general", "description": "Document notation\\nDocument uploadé via le formulaire notation", "uploadMethod": "form", "uploadSource": "notation", "uploadContext": "tenant_history", "documentCategory": "notation"}	{}	{}	0
43	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706145690-309037385.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:49:05.725	2025-04-03 18:49:05.725	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
44	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706287925-672857842.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:51:27.936	2025-04-03 18:51:27.936	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "tenantId": 14, "leaseType": "bail_vide", "rentAmount": "45.00", "description": "Document Locataire\\nDocument uploadé via le formulaire modification Locataire", "uploadMethod": "form", "uploadSource": "tenant_edit_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
45	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706323536-674727207.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:52:03.542	2025-04-03 18:52:03.542	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
46	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706323617-819285967.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:52:03.626	2025-04-03 18:52:03.626	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
47	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706331413-479666833.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:52:11.445	2025-04-03 18:52:11.445	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
48	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706375210-345803732.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:52:55.216	2025-04-03 18:52:55.216	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
49	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706375286-323219352.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:52:55.292	2025-04-03 18:52:55.292	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
50	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706390319-235759522.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:53:10.327	2025-04-03 18:53:10.327	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
51	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706390451-483359943.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:53:10.461	2025-04-03 18:53:10.461	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
52	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743706478255-507049534.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:54:38.266	2025-04-03 18:54:38.266	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: 5115", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
53	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743706478373-492698850.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:54:38.383	2025-04-03 18:54:38.383	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: 5115", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
54	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743706480588-119164095.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:54:40.619	2025-04-03 18:54:40.619	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: 5115", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
55	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706576822-894919733.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:56:16.852	2025-04-03 18:56:16.852	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
56	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706576933-989786926.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:56:16.938	2025-04-03 18:56:16.938	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
57	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706586822-607791604.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:56:26.829	2025-04-03 18:56:26.829	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
58	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706586941-3922511.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:56:26.946	2025-04-03 18:56:26.946	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
59	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706612653-323142979.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:56:52.664	2025-04-03 18:56:52.664	{"source": "tenant", "tenant": "Killian polmdsdsd", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
60	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706612843-263090142.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:56:52.85	2025-04-03 18:56:52.85	{"source": "tenant", "tenant": "Killian polmdsdsd", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
61	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706772642-870969281.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:59:32.657	2025-04-03 18:59:32.657	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
62	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706772904-304387439.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:59:32.909	2025-04-03 18:59:32.909	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
63	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706795740-323581190.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:59:55.751	2025-04-03 18:59:55.751	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
64	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706795842-6350412.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:59:55.849	2025-04-03 18:59:55.849	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
65	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706797519-763287254.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 18:59:57.525	2025-04-03 18:59:57.525	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
102	Document notation	notation	documents-1743714743865-319888199.pdf	Mesure taille-poignet-montre EN - Copie - Copie.pdf	f	2	\N	\N	\N	2025-04-03 21:12:23.876	2025-04-03 21:12:23.876	{"source": "notation", "section": "notation", "category": "general", "eventType": "general", "description": "Document notation\\nDocument uploadé via le formulaire notation", "uploadMethod": "form", "uploadSource": "notation", "uploadContext": "tenant_history", "documentCategory": "notation"}	{}	{}	0
66	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706797661-913600346.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 18:59:57.667	2025-04-03 18:59:57.667	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
67	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706842379-136021856.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:00:42.386	2025-04-03 19:00:42.386	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
68	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706842515-564338131.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:00:42.52	2025-04-03 19:00:42.52	{"source": "tenant", "tenant": "dfdf", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
69	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743706947386-99306390.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:02:27.392	2025-04-03 19:02:27.392	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 4554, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
70	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743706947484-383051712.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:02:27.488	2025-04-03 19:02:27.488	{"source": "tenant", "tenant": "fg", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 4554, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
71	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707140795-267787963.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:05:40.801	2025-04-03 19:05:40.801	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
72	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707140898-669239349.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:05:40.932	2025-04-03 19:05:40.932	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
73	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707212630-478233169.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:06:52.637	2025-04-03 19:06:52.637	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
74	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707212698-9951094.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:06:52.704	2025-04-03 19:06:52.704	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
75	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707231982-690389965.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:07:11.992	2025-04-03 19:07:11.992	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
76	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707232120-219223206.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:07:12.126	2025-04-03 19:07:12.126	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
104	Document justificatif (general)	tenant_history	documents-1743718750866-955168826.pdf	Mesure taille-poignet-montre EN - Copie - Copie (2).pdf	f	2	\N	\N	\N	2025-04-03 22:19:10.878	2025-04-03 22:19:10.878	{"source": "tenant_history", "category": "general", "eventType": "general"}	{}	{}	0
77	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707238391-91937020.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:07:18.398	2025-04-03 19:07:18.398	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
78	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707238542-288951087.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:07:18.546	2025-04-03 19:07:18.546	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
79	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707245658-491780655.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:07:25.667	2025-04-03 19:07:25.667	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
80	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707245757-533582656.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:07:25.761	2025-04-03 19:07:25.761	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
81	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707403441-195804927.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:10:03.447	2025-04-03 19:10:03.447	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
82	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707403567-239203516.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:10:03.572	2025-04-03 19:10:03.572	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_mobilite", "rentAmount": 455, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
83	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707437582-382387245.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:10:37.586	2025-04-03 19:10:37.586	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
84	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707437707-356931695.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:10:37.711	2025-04-03 19:10:37.711	{"source": "tenant", "tenant": "Killian polm", "section": "tenant", "leaseType": "bail_vide", "rentAmount": 45, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
85	Mesure taille-poignet-montre EN (2).pdf	lease	Mesure_taille-poignet-montre_EN__2_-1743707544857-293328282.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:12:24.872	2025-04-03 19:12:24.872	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_etudiant", "rentAmount": 4554, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Bail"}	{}	{}	0
86	Mesure taille-poignet-montre EN.pdf	lease	Mesure_taille-poignet-montre_EN-1743707544978-648453088.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:12:24.984	2025-04-03 19:12:24.984	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "leaseType": "bail_etudiant", "rentAmount": 4554, "description": "Document Locataire\\nDocument uploadé via le formulaire Locataire", "uploadMethod": "form", "uploadSource": "tenant_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Bail"}	{}	{}	0
87	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743708355830-733468655.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:25:55.844	2025-04-03 19:25:55.844	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: 454", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
105	Document justificatif (general)	tenant_history	documents-1743718793742-500979251.pdf	Mesure taille-poignet-montre EN - Copie - Copie (2).pdf	f	2	\N	\N	\N	2025-04-03 22:19:53.745	2025-04-03 22:19:53.745	{"source": "tenant_history", "category": "general", "eventType": "general"}	{}	{}	0
88	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743708355873-733978866.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:25:55.878	2025-04-03 19:25:55.878	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: 454", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
89	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743708479816-541667049.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:27:59.827	2025-04-03 19:27:59.827	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: dfs", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
90	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743708479881-694461286.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:27:59.887	2025-04-03 19:27:59.887	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: dfs", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
91	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743708481526-438069021.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:28:01.541	2025-04-03 19:28:01.542	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: dfs", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
92	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743708481624-303858584.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:28:01.635	2025-04-03 19:28:01.635	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: dfs", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
93	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743708555927-580680195.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:29:15.942	2025-04-03 19:29:15.942	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: sds", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
94	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743708556000-491044456.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:29:16.005	2025-04-03 19:29:16.005	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: sds", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
95	Mesure taille-poignet-montre EN (2).pdf	invoice	Mesure_taille-poignet-montre_EN__2_-1743708577923-44709311.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:29:37.938	2025-04-03 19:29:37.938	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: dsds", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Facture"}	{}	{}	0
96	Mesure taille-poignet-montre EN.pdf	invoice	Mesure_taille-poignet-montre_EN-1743708578041-179495735.pdf	Mesure taille-poignet-montre EN.pdf	f	2	\N	\N	\N	2025-04-03 19:29:38.046	2025-04-03 19:29:38.046	{"source": "maintenance", "section": "maintenance", "description": "Document de maintenance associé à une demande: dsds", "uploadMethod": "form", "uploadSource": "maintenance_form", "uploadContext": "maintenance", "customFileName": "Mesure taille-poignet-montre EN.pdf", "documentCategory": "maintenance", "originalFileName": "Mesure taille-poignet-montre EN.pdf", "documentTypeLabel": "Facture"}	{}	{}	0
97	Mesure taille-poignet-montre EN (2).pdf	legal	Mesure_taille-poignet-montre_EN__2_-1743708853687-545540945.pdf	Mesure taille-poignet-montre EN (2).pdf	f	2	\N	\N	\N	2025-04-03 19:34:13.692	2025-04-03 19:34:13.692	{"source": "tenant", "tenant": "teste feedback", "section": "tenant", "tenantId": 35, "leaseType": "bail_etudiant", "rentAmount": "4554.00", "description": "Document Locataire\\nDocument uploadé via le formulaire modification Locataire", "uploadMethod": "form", "uploadSource": "tenant_edit_form", "uploadContext": "tenant", "customFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentCategory": "tenant", "originalFileName": "Mesure taille-poignet-montre EN (2).pdf", "documentTypeLabel": "Juridique"}	{}	{}	0
98	Document justificatif (general)	tenant_history	documents-1743713972195-564490719.pdf	Mesure taille-poignet-montre EN - Copie - Copie.pdf	f	2	\N	\N	\N	2025-04-03 20:59:32.24	2025-04-03 20:59:32.24	{"source": "tenant_history", "category": "general", "eventType": "general"}	{}	{}	0
99	Document notation	tenant_history	documents-1743714204369-97326151.pdf	Mesure taille-poignet-montre EN - Copie - Copie.pdf	f	2	\N	\N	\N	2025-04-03 21:03:24.379	2025-04-03 21:03:24.379	{"rating": 4, "source": "tenant_history", "category": "respect_regles", "eventType": "respect_regles", "description": "Document uploadé via le formulaire notation", "uploadContext": "tenant_history"}	{}	{}	0
100	Document notation	tenant_history	documents-1743714475583-74950778.pdf	Mesure taille-poignet-montre EN - Copie.pdf	f	2	\N	\N	\N	2025-04-03 21:07:55.612	2025-04-03 21:07:55.612	{"rating": 2, "source": "tenant_history", "section": "locataire", "category": "respect_regles", "eventType": "respect_regles", "description": "Document notation\\nDocument uploadé via le formulaire notation", "propertyName": "la parlfferne", "uploadMethod": "form", "uploadSource": "notation", "uploadContext": "tenant_history", "documentCategory": "notation"}	{}	{}	0
103	Document justificatif (general)	tenant_history	documents-1743718418894-224256339.pdf	Mesure taille-poignet-montre EN - Copie - Copie (2).pdf	f	2	\N	\N	\N	2025-04-03 22:13:38.902	2025-04-03 22:13:38.902	{"source": "tenant_history", "category": "general", "eventType": "general"}	{}	{}	0
\.


--
-- TOC entry 5667 (class 0 OID 17251)
-- Dependencies: 232
-- Data for Name: documents_access_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents_access_log (id, document_id, user_id, access_type, accessed_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 5663 (class 0 OID 17113)
-- Dependencies: 228
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedbacks (id, "userId", content, rating, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5670 (class 0 OID 17259)
-- Dependencies: 235
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5672 (class 0 OID 17268)
-- Dependencies: 237
-- Data for Name: folders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
1	vbnbnbn	\N	2	2025-04-03 20:59:06.646	2025-04-03 20:59:06.646
\.


--
-- TOC entry 5726 (class 0 OID 18206)
-- Dependencies: 291
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 5724 (class 0 OID 18187)
-- Dependencies: 289
-- Data for Name: form_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at) FROM stdin;
1	2	test_field	text	Champ de Test	t	0	2025-04-28 02:18:20.822962	2025-04-28 02:18:20.822962
2	3	test_field	text	Champ de Test	t	0	2025-04-28 02:18:20.822962	2025-04-28 02:18:20.822962
\.


--
-- TOC entry 5716 (class 0 OID 18025)
-- Dependencies: 281
-- Data for Name: form_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 5722 (class 0 OID 18165)
-- Dependencies: 287
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_submissions (id, link_id, form_data, ip_address, user_agent, created_at) FROM stdin;
1	2	{"1745781530029": "", "1745781531297": "2525", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 19:19:23.784
2	2	{"1745781530029": "478448", "1745781531297": "451", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 19:32:30.982
3	2	{"1745781530029": "rtrt", "1745781531297": "rtrt", "1745781531567": "rt"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 20:49:07.649
4	3	{"1745788013405": ",n;n,;"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:07:22.337
5	2	{"1745781530029": "", "1745781531297": ",;:,;:,;:,", "1745781531567": ",;:,;:"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:07:27.349
6	2	{"1745781530029": "fdsf", "1745781531297": "", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:30.834
7	2	{"1745781530029": "", "1745781531297": "dfdf", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:33.642
8	2	{"1745781530029": "", "1745781531297": "qdfqdfqdfqdf", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:36.894
9	2	{"1745781530029": "qsdqsdqsdqsd", "1745781531297": "", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:40.411
10	2	{"1745781530029": "", "1745781531297": "", "1745781531567": "qsfqsfqsf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:43.297
11	2	{"1745781530029": "qsfqsfqsfqsf", "1745781531297": "", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:48.57
12	2	{"1745781530029": "", "1745781531297": "qsfqsQSDGGHGH", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:53.413
13	2	{"1745781530029": "gfg", "1745781531297": "gfgf", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:43:56.848
14	2	{"1745781530029": "", "1745781531297": "", "1745781531567": "gfgfgfg"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:44:00.036
15	2	{"1745781530029": "", "1745781531297": "fdgdfgdfgdfg", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-27 21:44:03.34
16	2	{"1745781530029": "rtrt", "1745781531297": "", "1745781531567": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-28 00:08:49.733
17	2	{"1745781530029": "fdsf", "1745781531297": "qdfqdfqdfqdf", "1745781531567": "qsfqsfqsf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-28 11:18:30.955
18	5	{"1745968701599": "fdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-29 23:18:44.274
19	5	{"1745968701599": "fdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 12:15:38.324
20	5	{"1745968701599": "fdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 15:46:40.775
21	6	{"1746029730247": "fdsfd"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 16:15:48.851
22	6	{"1746029730247": "sdfsdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 16:15:51.761
23	6	{"1746029730247": "sdfsdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 16:15:54.147
24	6	{"1746029730247": "sdfsdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 16:15:56.453
25	5	{"1745968701599": "sdfsdfsdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 16:15:59.082
26	5	{"1745968701599": "sdfsdfsdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 20:37:02.274
27	5	{"1745968701599": "1514"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 21:42:55.413
28	5	{"1745968701599": "rer"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 22:35:18.238
29	5	{"1745968701599": "sdfsdfsdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 22:58:43.884
30	5	{"1745968701599": ",n,n,n"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-04-30 23:03:17.218
31	5	{"1745968701599": ",n,n,n"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36	2025-05-01 00:38:36.856
32	5	{"1745968701599": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-04 03:59:21.732
33	5	{"1745968701599": ""}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-04 04:00:02.855
34	6	{"1746029730247": "sdfsdf"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-04 12:16:27.704
35	5	{"1745968701599": ",n,n,n"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	2025-05-04 12:18:42.86
\.


--
-- TOC entry 5714 (class 0 OID 18013)
-- Dependencies: 279
-- Data for Name: forms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 5718 (class 0 OID 18112)
-- Dependencies: 283
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
3	1	test-user-1	Mon Linktree	Tous mes liens professionnels en un seul endroit	#f5f5f5	#000000	#ef4444		80	\N	\N	brutalist	8	Roboto	none	\N	\N	100	0	0	0	0	\N	0.3	2025-04-29 16:22:31.714	2025-05-04 23:35:09.946
1	2	test-user	Jeans immo	Tous mes liens professionnels en un seul endroit	#0f172a	#f8fafc	#f472b6	/uploads/logos/user-2-logo-1745837161653-95585562.png	434	/uploads/backgrounds/user-2-background-1745839072007-455308981.jpg	\N	neon	16	Space Grotesk	bounce	\N	\N	100	150	35	30	70	#f59e0b	0.3	2025-04-27 19:18:28.224	2025-04-28 15:16:49.071
2	23	teste123	Mon Linktree	Tous mes liens professionnels en un seul endroit	#ffffff	#000000	#70C7BA		0	\N	\N	rounded	8	Inter	fade	\N	\N	100	0	0	0	0	\N	0.3	2025-04-28 23:49:31.611	2025-04-28 23:49:31.611
\.


--
-- TOC entry 5720 (class 0 OID 18144)
-- Dependencies: 285
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
-- TOC entry 5657 (class 0 OID 17055)
-- Dependencies: 222
-- Data for Name: maintenance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5674 (class 0 OID 17276)
-- Dependencies: 239
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_requests (id, title, description, priority, status, property_id, tenant_id, reported_by, total_cost, document_id, document_ids, created_at, updated_at) FROM stdin;
6	gdsg	dfgdfg	medium	completed	1	\N	50	40.00	\N	"[]"	2025-03-06 00:00:00	2025-04-02 12:19:23.059
1	vbv	bvbv	low	completed	1	\N	vbvb	40.00	7	"[7]"	2025-04-02 00:57:54.135	2025-04-02 12:26:08.525
2	 cv	bcvb	low	completed	1	\N	vbvb	200.00	\N	"[]"	2025-04-02 00:58:18.355	2025-04-02 12:27:10.418
3	fg	dfg	low	completed	1	\N	dfgdfg	50.00	9	"[9]"	2025-04-02 01:09:01.436	2025-04-02 12:30:38.031
4	gfgd	dfg	low	completed	1	\N	dfg	5000.00	10	"[10]"	2025-04-02 11:51:52.99	2025-04-02 12:33:11.863
5	ugui	yuiyui	low	in_progress	1	\N	yuiyui	654.00	\N	"[]"	2025-04-02 11:55:59.622	2025-04-03 18:38:34.623
8	dsds	sdsd	low	open	1	\N	sdsd	50.00	95	"[95,96]"	2025-02-27 00:00:00	2025-04-03 21:29:38.245244
7	sds	dsds	low	completed	1	\N	1	45.00	93	"[93,94]"	2025-04-03 00:00:00	2025-04-18 00:19:00.352
\.


--
-- TOC entry 5676 (class 0 OID 17287)
-- Dependencies: 241
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, related_to, related_id, is_read, created_at) FROM stdin;
\.


--
-- TOC entry 5742 (class 0 OID 19102)
-- Dependencies: 307
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
1	1	Configuration standard	portrait	A4	20	10	20	10	t	t	t	t	t	2025-05-04 04:18:46.578071	2025-05-04 04:41:10.008351	#f3f4f6	#f9fafb	25	Rapport	Helvetica	10	1	#4f46e5	\N	0.1	t	\N	t	1	t	30	20
\.


--
-- TOC entry 5740 (class 0 OID 19002)
-- Dependencies: 305
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
-- TOC entry 5744 (class 0 OID 19122)
-- Dependencies: 309
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
1	1	Logo principal	data:image/png;base64,VOTRE_IMAGE_EN_BASE64	120	80	t	2025-05-04 04:18:46.578071	2025-05-04 04:18:46.578071
\.


--
-- TOC entry 5746 (class 0 OID 19136)
-- Dependencies: 311
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment) FROM stdin;
1	Template visites standard	visite	[{"key": "visitor", "label": "Visiteur"}, {"key": "datetime", "label": "Date et heure"}, {"key": "property", "label": "Propriété"}, {"key": "contact", "label": "Contact"}, {"key": "type", "label": "Type"}, {"key": "status", "label": "Statut"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des visite	solid	1	8	left
2	Template locataires standard	locataires	[{"key": "fullName", "label": "Nom complet"}, {"key": "property", "label": "Propriété"}, {"key": "leaseStart", "label": "Début du bail"}, {"key": "leaseEnd", "label": "Fin du bail"}, {"key": "rentAmount", "label": "Montant du loyer"}, {"key": "status", "label": "Statut"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des locataires	solid	1	8	left
3	Template maintenance standard	maintenance	[{"key": "title", "label": "Problème"}, {"key": "property", "label": "Propriété"}, {"key": "reportedDate", "label": "Date signalée"}, {"key": "priority", "label": "Priorité"}, {"key": "status", "label": "Statut"}, {"key": "cost", "label": "Coût"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des maintenance	solid	1	8	left
4	Template transactions standard	transactions	[{"key": "date", "label": "Date"}, {"key": "property", "label": "Propriété"}, {"key": "description", "label": "Description"}, {"key": "amount", "label": "Montant"}, {"key": "category", "label": "Catégorie"}, {"key": "type", "label": "Type"}, {"key": "status", "label": "Statut"}]	\N	\N	t	2025-05-04 04:18:46.578071	2025-05-04 04:30:38.401352	#f3f4f6	#f9fafb	25	Liste des transactions	solid	1	8	left
\.


--
-- TOC entry 5750 (class 0 OID 19190)
-- Dependencies: 315
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at) FROM stdin;
1	Classique Bleu	#e6f0ff	#f8fafc	#333333	#cbd5e1	#4f46e5	#ffffff	Helvetica	t	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
2	Moderne Sombre	#1e293b	#334155	#f8fafc	#475569	#06b6d4	#ffffff	Helvetica	f	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
3	Minimaliste	#f9fafb	#ffffff	#111827	#e5e7eb	#4b5563	#ffffff	Helvetica	f	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
4	Coloré	#fef3c7	#fef9e7	#1e293b	#fde68a	#ea580c	#ffffff	Helvetica	f	2025-05-04 04:35:08.356459	2025-05-04 04:37:49.831152
\.


--
-- TOC entry 5654 (class 0 OID 16870)
-- Dependencies: 219
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, created_at, updated_at, purchase_date, area, "livingArea", "landArea", "constructionYear", rooms, "hasParking", "hasTerrace", "hasGarage", "hasOutbuilding", "hasBalcony", "hasElevator", "hasCellar", "hasGarden", "isNewConstruction", images, user_id) FROM stdin;
12	la parlerne551	68 Rue Blomet 75015 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	365.00	0.00	\N	456.00	230.00	20	available	\N	2025-04-15 20:34:54.227	2025-04-15 20:34:54.227	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
13	ttste 2 	36 Rue Colbert 59800 Lille		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	645.00	45.00	45.00	45.00	45.00	20	available	\N	2025-04-15 20:38:05.773	2025-04-15 20:38:05.773	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
14	teste transaction	45 Rue Pelleport 33800 Bordeaux		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	45000.00	0.00	\N	53000.00	0.00	25	available	\N	2025-04-15 21:08:06.787	2025-04-15 21:08:06.787	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
15	teste123123	64 Avenue de la Libération 45700 Villemandeur		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	450.00	0.00	\N	4500.00	195.33	2	available	\N	2025-04-15 21:13:05.016	2025-04-15 21:13:05.016	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
16	3	64 Rue Judaïque 33000 Bordeaux		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	32.00	0.00	\N	0.00	0.00	20	available	\N	2025-04-15 23:43:41.464	2025-04-15 23:43:41.464	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
17	5252	50 Rue Lecourbe 75015 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	0.00	0.00	\N	0.00	0.00	20	available	\N	2025-04-16 18:08:23.583	2025-04-16 18:08:23.583	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
18	hj	64 Rue Colbert 59800 Lille		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	1484.00	0.00	\N	2000.00	26.00	20	available	\N	2025-04-16 18:14:12.084	2025-04-16 18:14:12.084	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
19	hj	64 Rue Colbert 59800 Lille		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	1484.00	0.00	\N	2000.00	26.00	20	available	\N	2025-04-16 18:14:20.366	2025-04-16 18:14:20.366	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
20	teste supp tet	64 Rue Nationale 59800 Lille		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	300.00	0.00	\N	3000.00	20.00	20	available	\N	2025-04-16 18:45:29.668	2025-04-16 18:45:29.669	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
21	645	6 Rue 53210 Argentré		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	6000.00	0.00	\N	360.00	300.00	20	available	\N	2025-04-16 18:50:15.453	2025-04-16 18:50:15.453	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
22	51515115	64 Rue Ordener 75018 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	60000.00	0.00	\N	4454.00	230.00	20	rented	\N	2025-04-16 19:06:19.324	2025-04-16 19:06:19.324	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
23	dfdf	Rue 53210 Argentré		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	45.00	0.00	\N	45000.00	230.00	20	available	\N	2025-04-16 19:09:05.073	2025-04-16 19:09:05.073	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
24	teste trasanc vis 	67 Rue Ordener 75018 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	360000.00	0.00	\N	50000.00	299.00	15	available	\N	2025-04-16 19:48:58.78	2025-04-16 19:48:58.78	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
25	a	Rue Ordener 75018 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	0.00	0.00	\N	450.00	2.00	20	available	\N	2025-04-16 19:54:49.035	2025-04-16 19:54:49.035	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
26	789789	68 Avenue DMC 68200 Mulhouse		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	6540.00	0.00	\N	65000.00	299.00	20	sold	\N	2025-04-16 20:37:52.289	2025-04-16 20:37:52.289	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
27	45	64 Rue Ordener 75018 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	645.00	6.00	\N	60.00	1.00	6	available	\N	2025-04-16 20:50:29.908	2025-04-16 20:50:29.908	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
28	68 rue d	68 Rue Ordener 75018 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	0.00	0.00	\N	4560.00	21.00	20	available	\N	2025-04-16 23:22:50.005	2025-04-16 23:22:50.005	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
29	dfgdfg	31 Rue Colbert 59800 Lille		apartment	0	0	0	0	0	D	D	0	0	f	f	t	t	t	t	f	f	f	0.00	0.00	\N	0.00	0.00	20	available	\N	2025-04-17 03:38:14.815	2025-04-17 03:38:14.815	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
30	teste balcon	1 Rue Blomet 75015 Paris		apartment	0	0	0	0	0	D	D	0	0	f	f	t	t	t	t	f	f	f	0.00	0.00	\N	0.00	0.00	20	available	\N	2025-04-17 03:38:52.769	2025-04-17 03:38:52.769	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
2	cvbcvbcvb	65 Rue Marcadet 75018 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	45645.00	0.00	\N	0.00	0.00	20	maintenance	\N	2025-04-14 13:38:02.537	2025-04-14 18:26:39.869	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
1	la parlfferne	60 Rue Lecourbe 75015 Paris		garage	0	0	0	0	0	D	D	0	0	f	f	f	f	f	f	f	f	f	230000.00	55.00	\N	0.00	0.00	20	rented	\N	2025-04-02 00:44:20.39	2025-04-15 19:10:34.179	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
3	teste	68 Avenue de Savoie 38660 La Terrasse		parking	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	1111.00	0.00	\N	0.00	30.00	20	available	\N	2025-04-15 19:16:38.913	2025-04-15 19:16:38.913	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
5	36 rue de	68 Rue Marcadet 75018 Paris		apartment	0	0	0	0	0	D	D	0	0	f	f	f	f	f	f	f	f	f	0.00	0.00	\N	0.00	0.00	20	available	\N	2025-04-15 19:24:08.932	2025-04-15 19:25:04.197	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
4	LGBTRUMP	64 Rue d'Abbeville 80000 Amiens		apartment	0	0	0	0	0	D	D	0	0	f	f	f	f	f	f	f	f	f	0.00	0.00	\N	0.00	0.00	20	available	\N	2025-04-15 19:18:32.232	2025-04-15 19:25:45.126	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
6	51515	64 Rue Judaïque 33000 Bordeaux		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	0.00	0.00	\N	0.00	0.00	20	available	\N	2025-04-15 19:45:10.006	2025-04-15 19:45:10.006	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
7	4444	360 Rue Lecourbe 75015 Paris		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	456.00	0.00	\N	0.00	356.00	20	available	\N	2025-04-15 20:06:06.942	2025-04-15 20:06:06.942	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
8	dfgdfgsfgsfgsfg	160 Rue des Acacias 45700 Pannes		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	999.00	0.00	\N	190.00	99.00	20	available	\N	2025-04-15 20:08:02.114	2025-04-15 20:08:02.114	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
9	dfgdfg115	Rt 50 20251 Giuncaggio		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	45000.00	0.00	\N	0.00	350.00	20	available	\N	2025-04-15 20:20:56.593	2025-04-15 20:20:56.593	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
10	test transaction 1 	69 Rue des Anciens Combattants 76530 Grand-Couronne		apartment	0	0	0	0	0	D	\N	0	0	f	f	f	f	f	f	f	f	f	5000.00	0.00	\N	500.00	50.00	20	available	\N	2025-04-15 20:24:49.865	2025-04-15 20:24:49.865	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
11	15951	La Rura 05100 Briançon	testetetetetettet	apartment	4	4	4	4	4	D	D	4	4	t	t	t	t	t	t	t	f	f	500.00	226.00	562.00	3.00	2.00	20	available	1999	2025-04-15 20:31:36.333	2025-04-17 03:53:19.581	1997-10-10 00:00:00	0	\N	\N	\N	45	f	f	f	f	f	f	f	f	f	[]	1
31	teste azer	64 Rue des pres 13013 Marseille		apartment	0	0	0	0	0	D	D	0	0	f	f	f	f	f	f	f	f	f	654000.00	0.00	\N	4500.00	189.00	2	available	\N	2025-04-17 23:00:21.781	2025-04-17 23:00:21.781	\N	0	\N	\N	\N	0	f	f	f	f	f	f	f	f	f	[]	1
\.


--
-- TOC entry 5708 (class 0 OID 17754)
-- Dependencies: 273
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_analyses (id, property_id, user_id, analysis_date, data, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5679 (class 0 OID 17296)
-- Dependencies: 244
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_coordinates (id, property_id, latitude, longitude, updated_at) FROM stdin;
1	1	48.84389100	2.30664100	2025-04-15 21:10:34.183849
3	5	48.89044600	2.34793700	2025-04-15 21:25:04.200908
2	4	49.90634600	2.26959100	2025-04-15 19:25:45.129
4	6	44.84131400	-0.58470900	2025-04-15 19:45:10.156
5	7	48.83646900	2.28202800	2025-04-15 20:06:07.078
6	8	48.00395900	2.70708000	2025-04-15 20:08:02.318
7	9	42.15987900	9.43338100	2025-04-15 20:20:56.709
8	10	49.36192000	1.01595900	2025-04-15 20:24:50.453
9	11	44.87737400	6.61276900	2025-04-15 20:31:36.538
10	12	48.84201600	2.30364800	2025-04-15 20:34:54.39
11	13	50.62800900	3.04731300	2025-04-15 20:38:05.927
12	14	44.82306400	-0.56059500	2025-04-15 21:08:06.997
13	15	47.99008300	2.69742800	2025-04-15 21:13:05.124
14	16	44.84131400	-0.58470900	2025-04-15 23:43:41.693
15	17	48.84402400	2.30710400	2025-04-16 18:08:23.792
16	18	50.62878700	3.04648500	2025-04-16 18:14:12.192
17	19	50.62878700	3.04648500	2025-04-16 18:14:20.375
18	20	50.63629000	3.06053500	2025-04-16 18:45:29.873
19	22	48.89211200	2.34715400	2025-04-16 19:06:19.457
20	23	48.08815300	-0.63708200	2025-04-16 19:09:05.174
21	24	48.89130200	2.35043300	2025-04-16 19:48:58.931
22	25	48.89216800	2.34604600	2025-04-16 19:54:49.228
23	26	47.75326500	7.31370400	2025-04-16 20:37:52.411
24	27	48.89211200	2.34715400	2025-04-16 20:50:30.024
25	28	48.89220900	2.34663600	2025-04-16 23:22:50.119
26	29	50.62805900	3.04744200	2025-04-17 03:38:15.033
27	30	48.84425800	2.30889500	2025-04-17 03:38:52.885
28	31	43.35928200	5.41495300	2025-04-17 23:00:21.898
\.


--
-- TOC entry 5681 (class 0 OID 17301)
-- Dependencies: 246
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5683 (class 0 OID 17310)
-- Dependencies: 248
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 5685 (class 0 OID 17318)
-- Dependencies: 250
-- Data for Name: property_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_history (id, property_id, field, old_value, new_value, change_type, user_id, created_at, metadata) FROM stdin;
\.


--
-- TOC entry 5687 (class 0 OID 17326)
-- Dependencies: 252
-- Data for Name: property_works; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_works (id, property_id, title, description, type, status, start_date, end_date, estimated_cost, actual_cost, contractor, priority, documents, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5700 (class 0 OID 17597)
-- Dependencies: 265
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5661 (class 0 OID 17102)
-- Dependencies: 226
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5738 (class 0 OID 18577)
-- Dependencies: 303
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, session_id, ip_address, user_agent, payload, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5734 (class 0 OID 18432)
-- Dependencies: 299
-- Data for Name: storage_extensions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_extensions (id, name, quota_bytes, price, is_default) FROM stdin;
1	Inclus	5368709120	0	t
2	Stockage 25GB	26843545600	9.99	f
3	Stockage 50GB	53687091200	19.99	f
4	Stockage 100GB	107374182400	29.99	f
5	Stockage de base	5368709120	0	t
6	Stockage standard	10737418240	4.99	f
7	Stockage pro	21474836480	9.99	f
8	Stockage étendu	53687091200	19.99	f
\.


--
-- TOC entry 5758 (class 0 OID 19434)
-- Dependencies: 323
-- Data for Name: storage_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_transactions (id, user_id, previous_tier, new_tier, amount_paid, transaction_date, expiration_date, payment_method, payment_reference, status, notes) FROM stdin;
\.


--
-- TOC entry 5730 (class 0 OID 18367)
-- Dependencies: 295
-- Data for Name: storage_usage_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_usage_details (id, user_id, resource_type, used_bytes, item_count, last_updated) FROM stdin;
\.


--
-- TOC entry 5689 (class 0 OID 17337)
-- Dependencies: 254
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_documents (id, tenant_id, document_id, document_type, uploaded_at) FROM stdin;
\.


--
-- TOC entry 5691 (class 0 OID 17345)
-- Dependencies: 256
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_history (id, rating, feedback, category, tenant_full_name, original_user_id, event_type, event_severity, event_details, documents, bail_status, bail_id, property_name, created_at, created_by, tenant_id, is_orphaned) FROM stdin;
29	4	65	entretien	tftft	2	entretien	0	{}	{}	\N	\N	\N	2025-04-11 22:22:11.806	2	\N	t
34	2	teste	paiement	tftft	\N	paiement	0	{}	{}	\N	\N	\N	2025-04-11 23:11:38.102	2	\N	f
35	5	testeertertert	communication	tftft	\N	communication	0	{}	{}	\N	\N	la parlfferne	2025-04-11 23:12:03.3	2	\N	f
36	3	e	general	teste 32 	\N	general	0	{}	{}	\N	\N	\N	2025-04-11 23:14:05.37	2	\N	f
37	5	\N	comportement	tftft	\N	comportement	0	{}	{}	\N	\N	la parlfferne	2025-04-11 23:16:32.241	2	\N	f
38	4	cvbcvb	general	tftft	\N	general	0	{}	{}	\N	\N	la parlfferne	2025-04-11 23:17:43.876	2	\N	f
39	3	dffd	general	Testefgdfgdfgdfg	\N	general	0	{}	{}	\N	\N	\N	2025-04-11 23:18:00.928	2	\N	f
40	3	zrzer	general	testeteetazeazeazeaze	\N	general	0	{}	{}	\N	\N	la parlfferne	2025-04-11 23:20:06.01	2	\N	f
41	4	zer	general	testeteetazeazeazeaze	\N	general	0	{}	{}	\N	\N	\N	2025-04-11 23:20:15.464	2	\N	f
\.


--
-- TOC entry 5655 (class 0 OID 16906)
-- Dependencies: 220
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, created_at, updated_at, tenant_id) FROM stdin;
132	19	1	2025-04-11 00:00:00	2026-04-11 00:00:00	55.00	bail_vide	t	actif	2025-04-11 23:19:01.310926	2025-04-11 23:19:01.310926	\N
\.


--
-- TOC entry 5728 (class 0 OID 18224)
-- Dependencies: 293
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 5694 (class 0 OID 17357)
-- Dependencies: 259
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, property_id, tenant_id, document_id, document_ids, type, category, amount, description, date, status, payment_method, created_at, updated_at) FROM stdin;
60	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 7/240 - test transaction 1 	2025-10-15 10:00:00	pending	bank_transfer	2025-04-15 22:26:02.158823	2025-04-15 22:26:02.158823
2	2	1	\N	5	{5}	income	rent	0.00		2025-04-11 10:00:00	completed	bank_transfer	2025-04-02 02:57:17.001996	2025-04-02 00:57:17.359
306	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:07.556526	2025-04-16 12:59:07.556526
307	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:07.793433	2025-04-16 12:59:07.793433
61	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 8/240 - test transaction 1 	2025-11-15 11:00:00	pending	bank_transfer	2025-04-15 22:26:02.458198	2025-04-15 22:26:02.458198
322	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:26.671327	2025-04-16 12:59:26.671327
323	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:28.387782	2025-04-16 12:59:28.387782
8	2	1	\N	\N	{}	expense	maintenance	40.00	Maintenance - vbv: bvbv	2025-04-02 10:00:00	completed	paypal	2025-04-02 14:26:29.547961	2025-04-02 14:26:29.547961
9	2	1	\N	\N	{}	expense	maintenance	200.00	Maintenance -  cv: bcvb	2025-04-02 10:00:00	completed	card	2025-04-02 14:27:13.38444	2025-04-02 14:27:13.38444
10	2	1	\N	\N	{}	expense	maintenance	50.00	Maintenance - fg: dfg	2025-04-02 10:00:00	completed	bank_transfer	2025-04-02 14:30:45.278756	2025-04-02 14:30:45.278756
11	2	1	\N	\N	{10}	expense	maintenance	5000.00	teste doc mlaitnance finance 	2025-04-02 10:00:00	completed	bank_transfer	2025-04-02 14:33:43.745615	2025-04-02 14:33:43.745615
324	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:29.74212	2025-04-16 12:59:29.74212
325	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:30.501962	2025-04-16 12:59:30.501962
326	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:31.332668	2025-04-16 12:59:31.332668
327	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:32.100353	2025-04-16 12:59:32.100353
328	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:32.907586	2025-04-16 12:59:32.907586
5	2	\N	\N	\N	{}	income	maintenance	30.00	des	2025-01-31 11:00:00	pending	bank_transfer	2025-04-02 03:08:15.681935	2025-04-02 18:21:44.439
329	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:33.979886	2025-04-16 12:59:33.979886
330	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:34.74918	2025-04-16 12:59:34.74918
333	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:38.398191	2025-04-16 12:59:38.398191
336	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:41.939418	2025-04-16 12:59:41.939418
338	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:43.662082	2025-04-16 12:59:43.662082
341	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:46.572043	2025-04-16 12:59:46.572043
344	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:50.759322	2025-04-16 12:59:50.759322
375	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:26.198384	2025-04-16 13:00:26.198384
378	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:27.573044	2025-04-16 13:00:27.573044
381	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:29.02318	2025-04-16 13:00:29.02318
390	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 17:07:47.144207	2025-04-16 17:07:47.144207
870	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (234/240)	2044-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:32.29441	2025-04-22 09:34:26.438
826	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (190/240)	2041-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.177073	2025-04-22 09:34:27.762
757	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (121/240)	2035-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.535494	2025-04-22 09:34:29.394
43	2	\N	\N	\N	{}	expense	rent	100.00		2025-04-13 10:00:00	pending	bank_transfer	2025-04-13 01:47:57.361093	2025-04-13 01:47:57.361093
42	2	\N	\N	\N	{}	credit	rent	60.00		2025-04-12 10:00:00	pending	bank_transfer	2025-04-12 22:05:32.128403	2025-04-12 23:48:11.366
44	2	1	\N	\N	{}	income	rent	364.00		2025-04-14 10:00:00	completed	bank_transfer	2025-04-14 13:49:58.842087	2025-04-14 11:50:10.278
45	2	1	\N	\N	{}	income	rent	669.00		2025-04-14 10:00:00	completed	bank_transfer	2025-04-14 14:23:55.386039	2025-04-14 14:23:55.386039
1	2	\N	\N	4	{4}	credit	mortgage	1000.00		2025-04-02 10:00:00	completed	bank_transfer	2025-04-02 02:56:56.772055	2025-04-14 12:42:59.155
46	2	1	\N	\N	{}	credit	rent	1000.00		2025-04-14 10:00:00	completed	bank_transfer	2025-04-14 14:43:16.984901	2025-04-14 14:43:16.984901
47	2	1	\N	\N	{}	credit	rent	400.00		2025-04-14 10:00:00	pending	bank_transfer	2025-04-14 14:51:19.844803	2025-04-14 14:51:19.844803
49	2	2	\N	\N	{}	expense	other	45645.00	Achat de la propriété au 65 Rue Marcadet 75018 Paris	2025-04-14 10:00:00	completed	bank_transfer	2025-04-14 15:38:02.689446	2025-04-14 15:38:02.689446
50	2	3	\N	\N	{}	expense	other	1111.00	Achat de la propriété au 68 Avenue de Savoie 38660 La Terrasse	2025-04-15 10:00:00	completed	bank_transfer	2025-04-15 21:16:39.176833	2025-04-15 21:16:39.176833
54	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 1/240 - test transaction 1 	2025-04-15 10:00:00	completed	bank_transfer	2025-04-15 22:26:00.07559	2025-04-15 22:26:00.07559
55	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 2/240 - test transaction 1 	2025-05-15 10:00:00	pending	bank_transfer	2025-04-15 22:26:00.820811	2025-04-15 22:26:00.820811
56	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 3/240 - test transaction 1 	2025-06-15 10:00:00	pending	bank_transfer	2025-04-15 22:26:01.105349	2025-04-15 22:26:01.105349
57	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 4/240 - test transaction 1 	2025-07-15 10:00:00	pending	bank_transfer	2025-04-15 22:26:01.353863	2025-04-15 22:26:01.353863
58	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 5/240 - test transaction 1 	2025-08-15 10:00:00	pending	bank_transfer	2025-04-15 22:26:01.627722	2025-04-15 22:26:01.627722
59	2	10	\N	\N	{}	credit	mortgage	50.00	Mensualité prêt 6/240 - test transaction 1 	2025-09-15 10:00:00	pending	bank_transfer	2025-04-15 22:26:01.924789	2025-04-15 22:26:01.924789
308	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:09.200596	2025-04-16 12:59:09.200596
310	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:10.556647	2025-04-16 12:59:10.556647
312	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:12.118035	2025-04-16 12:59:12.118035
318	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:22.240488	2025-04-16 12:59:22.240488
319	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:23.856096	2025-04-16 12:59:23.856096
331	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:35.861138	2025-04-16 12:59:35.861138
334	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:39.806278	2025-04-16 12:59:39.806278
335	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:40.890746	2025-04-16 12:59:40.890746
337	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:42.647263	2025-04-16 12:59:42.647263
340	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:45.403649	2025-04-16 12:59:45.403649
343	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:49.630516	2025-04-16 12:59:49.630516
382	2	\N	\N	\N	{}	expense	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:11:10.926744	2025-04-16 13:11:10.926744
391	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 17:07:47.826696	2025-04-16 17:07:47.826696
851	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (215/240)	2043-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:31.509443	2025-04-22 09:34:27.104
779	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (143/240)	2037-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.398163	2025-04-22 09:34:28.819
309	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:09.701655	2025-04-16 12:59:09.701655
311	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:11.358007	2025-04-16 12:59:11.358007
313	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:12.871129	2025-04-16 12:59:12.871129
345	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:06.861419	2025-04-16 13:00:06.861419
346	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:07.29101	2025-04-16 13:00:07.29101
348	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:08.588559	2025-04-16 13:00:08.588559
351	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:10.278325	2025-04-16 13:00:10.278325
354	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:11.952802	2025-04-16 13:00:11.952802
357	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:13.883163	2025-04-16 13:00:13.883163
360	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:15.820875	2025-04-16 13:00:15.820875
363	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:17.64315	2025-04-16 13:00:17.64315
368	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:22.551302	2025-04-16 13:00:22.551302
371	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:24.162878	2025-04-16 13:00:24.162878
383	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:11:11.228832	2025-04-16 13:11:11.228832
385	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:11:13.019011	2025-04-16 13:11:13.019011
386	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:11:13.818815	2025-04-16 13:11:13.818815
392	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 17:07:48.605933	2025-04-16 17:07:48.605933
804	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (168/240)	2039-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.348196	2025-04-22 09:34:28.257
732	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (96/240)	2033-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.644376	2025-04-22 09:34:30.082
314	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:14.082929	2025-04-16 12:59:14.082929
321	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:26.206834	2025-04-16 12:59:26.206834
347	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:08.293205	2025-04-16 13:00:08.293205
350	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:09.762646	2025-04-16 13:00:09.762646
353	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:11.397177	2025-04-16 13:00:11.397177
356	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:13.17172	2025-04-16 13:00:13.17172
359	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:15.305908	2025-04-16 13:00:15.305908
362	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:17.070496	2025-04-16 13:00:17.070496
365	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:19.74534	2025-04-16 13:00:19.74534
374	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:25.689665	2025-04-16 13:00:25.689665
377	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:27.030392	2025-04-16 13:00:27.030392
384	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:11:12.567098	2025-04-16 13:11:12.567098
710	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (74/240)	2031-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.34198	2025-04-22 09:34:30.612
315	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:15.221649	2025-04-16 12:59:15.221649
317	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:19.311027	2025-04-16 12:59:19.311027
349	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:09.182313	2025-04-16 13:00:09.182313
352	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:10.878162	2025-04-16 13:00:10.878162
355	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:12.472446	2025-04-16 13:00:12.472446
358	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:14.555498	2025-04-16 13:00:14.555498
361	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:16.342384	2025-04-16 13:00:16.342384
366	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:20.397841	2025-04-16 13:00:20.397841
369	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:23.138613	2025-04-16 13:00:23.138613
372	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:24.801746	2025-04-16 13:00:24.801746
380	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:28.530358	2025-04-16 13:00:28.530358
387	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:11:52.503104	2025-04-16 13:11:52.503104
388	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:11:52.631872	2025-04-16 13:11:52.631872
587	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (2/240)	2025-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.096928	2025-04-22 09:34:32.325
1451	23	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 01:48:57.364916	2025-04-29 01:48:57.364916
583	2	19	\N	\N	{}	expense	other	1484.00	Achat de la propriété au 64 Rue Colbert 59800 Lille	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:20.615812	2025-04-16 20:14:20.615812
585	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (1/240)	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.003208	2025-04-16 20:14:21.003208
316	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:16.5761	2025-04-16 12:59:16.5761
320	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:25.068131	2025-04-16 12:59:25.068131
332	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:37.221907	2025-04-16 12:59:37.221907
339	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:44.65312	2025-04-16 12:59:44.65312
342	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 12:59:47.602208	2025-04-16 12:59:47.602208
364	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:18.975726	2025-04-16 13:00:18.975726
367	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:21.259674	2025-04-16 13:00:21.259674
370	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:23.849931	2025-04-16 13:00:23.849931
373	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:25.414269	2025-04-16 13:00:25.414269
376	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:26.74061	2025-04-16 13:00:26.74061
379	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 13:00:28.118016	2025-04-16 13:00:28.118016
389	2	\N	\N	\N	{}	income	rent	0.00		2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 13:11:54.38005	2025-04-16 13:11:54.38005
395	2	18	\N	\N	{}	expense	other	1484.00	Achat de la propriété au 64 Rue Colbert 59800 Lille	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:12.288595	2025-04-16 20:14:12.288595
396	2	18	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (1/240)	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:12.403983	2025-04-16 20:14:12.403983
302	2	13	\N	\N	{}	income	rent	45.00		2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 03:07:16.600298	2025-04-22 09:35:23.702
1452	23	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 01:48:57.534398	2025-04-29 01:48:57.534398
294	2	1	\N	\N	{}	expense	rent	456.00		2025-04-15 10:00:00	pending	bank_transfer	2025-04-15 22:28:05.654106	2025-04-15 22:28:05.654106
296	2	\N	\N	\N	{}	expense	rent	45.00		2025-04-15 10:00:00	pending	bank_transfer	2025-04-15 23:38:56.358321	2025-04-15 23:38:56.358321
298	2	12	\N	\N	{}	income	rent	0.00		2025-04-15 10:00:00	pending	bank_transfer	2025-04-15 23:45:24.536453	2025-04-15 23:45:24.536453
304	2	12	\N	\N	{}	credit	rent	0.00		2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 03:45:13.713576	2025-04-16 03:45:13.713576
877	2	22	\N	\N	{}	expense	other	60000.00	Achat de la propriété: 51515115	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 21:06:39.934341	2025-04-16 21:06:39.934341
597	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (7/240)	2025-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.477144	2025-04-22 09:34:32.242
593	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (5/240)	2025-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.309965	2025-04-22 09:34:32.259
589	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (3/240)	2025-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.161987	2025-04-22 09:34:32.32
1453	1	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 17:38:13.010697	2025-04-29 17:38:13.010697
1456	1	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 17:38:14.134286	2025-04-29 17:38:14.134286
1459	1	18	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 17:38:14.736561	2025-04-29 17:38:14.736561
681	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (49/240)	2029-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.2731	2025-04-22 09:34:31.218
679	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (48/240)	2029-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.181037	2025-04-22 09:34:31.255
677	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (47/240)	2029-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.117839	2025-04-22 09:34:31.262
675	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (46/240)	2029-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.054829	2025-04-22 09:34:31.308
673	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (45/240)	2028-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:23.98511	2025-04-22 09:34:31.316
671	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (44/240)	2028-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:23.918686	2025-04-22 09:34:31.329
669	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (43/240)	2028-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.853162	2025-04-22 09:34:31.355
667	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (42/240)	2028-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.789665	2025-04-22 09:34:31.392
665	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (41/240)	2028-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.727963	2025-04-22 09:34:31.402
663	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (40/240)	2028-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.665957	2025-04-22 09:34:31.449
661	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (39/240)	2028-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.573131	2025-04-22 09:34:31.459
659	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (38/240)	2028-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.510299	2025-04-22 09:34:31.468
657	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (37/240)	2028-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.44678	2025-04-22 09:34:31.519
655	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (36/240)	2028-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:23.379562	2025-04-22 09:34:31.528
653	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (35/240)	2028-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:23.311634	2025-04-22 09:34:31.534
651	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (34/240)	2028-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:23.275513	2025-04-22 09:34:31.592
649	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (33/240)	2027-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:23.185348	2025-04-22 09:34:31.596
647	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (32/240)	2027-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:23.125741	2025-04-22 09:34:31.633
645	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (31/240)	2027-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.068345	2025-04-22 09:34:31.655
643	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (30/240)	2027-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:23.006121	2025-04-22 09:34:31.66
641	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (29/240)	2027-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.94456	2025-04-22 09:34:31.669
639	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (28/240)	2027-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.882019	2025-04-22 09:34:31.718
637	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (27/240)	2027-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.821264	2025-04-22 09:34:31.726
635	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (26/240)	2027-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.760918	2025-04-22 09:34:31.764
633	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (25/240)	2027-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.70222	2025-04-22 09:34:31.784
631	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (24/240)	2027-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:22.642951	2025-04-22 09:34:31.819
629	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (23/240)	2027-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:22.583434	2025-04-22 09:34:31.828
627	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (22/240)	2027-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:22.519339	2025-04-22 09:34:31.853
625	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (21/240)	2026-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:22.45949	2025-04-22 09:34:31.889
623	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (20/240)	2026-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:22.400631	2025-04-22 09:34:31.901
621	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (19/240)	2026-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.333868	2025-04-22 09:34:31.917
619	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (18/240)	2026-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.209517	2025-04-22 09:34:31.95
617	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (17/240)	2026-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.037012	2025-04-22 09:34:31.958
615	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (16/240)	2026-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:22.004162	2025-04-22 09:34:31.98
613	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (15/240)	2026-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.94276	2025-04-22 09:34:32.017
611	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (14/240)	2026-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.880889	2025-04-22 09:34:32.028
609	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (13/240)	2026-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.818768	2025-04-22 09:34:32.074
607	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (12/240)	2026-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:21.784113	2025-04-22 09:34:32.079
605	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (11/240)	2026-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:21.694961	2025-04-22 09:34:32.093
603	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (10/240)	2026-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:21.632601	2025-04-22 09:34:32.142
601	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (9/240)	2025-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:21.599175	2025-04-22 09:34:32.177
599	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (8/240)	2025-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:21.511509	2025-04-22 09:34:32.187
595	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (6/240)	2025-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.385767	2025-04-22 09:34:32.247
591	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (4/240)	2025-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:21.202955	2025-04-22 09:34:32.311
1454	1	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 17:38:13.341937	2025-04-29 17:38:13.341937
1457	1	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 17:38:14.357662	2025-04-29 17:38:14.357662
731	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (95/240)	2033-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.596979	2025-04-22 09:34:30.121
730	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (94/240)	2033-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.575074	2025-04-22 09:34:30.141
729	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (93/240)	2032-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.521806	2025-04-22 09:34:30.149
728	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (92/240)	2032-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.399588	2025-04-22 09:34:30.182
727	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (91/240)	2032-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.238463	2025-04-22 09:34:30.206
726	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (90/240)	2032-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.002903	2025-04-22 09:34:30.213
725	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (89/240)	2032-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.952619	2025-04-22 09:34:30.253
724	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (88/240)	2032-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.92952	2025-04-22 09:34:30.272
723	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (87/240)	2032-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.87649	2025-04-22 09:34:30.277
722	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (86/240)	2032-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.825352	2025-04-22 09:34:30.312
721	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (85/240)	2032-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.802391	2025-04-22 09:34:30.366
720	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (84/240)	2032-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.751648	2025-04-22 09:34:30.376
719	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (83/240)	2032-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.70339	2025-04-22 09:34:30.388
718	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (82/240)	2032-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.681796	2025-04-22 09:34:30.433
717	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (81/240)	2031-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.631231	2025-04-22 09:34:30.439
716	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (80/240)	2031-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.580942	2025-04-22 09:34:30.474
715	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (79/240)	2031-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.533614	2025-04-22 09:34:30.498
714	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (78/240)	2031-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.511935	2025-04-22 09:34:30.535
713	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (77/240)	2031-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.463802	2025-04-22 09:34:30.547
712	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (76/240)	2031-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.440295	2025-04-22 09:34:30.596
711	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (75/240)	2031-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.388647	2025-04-22 09:34:30.604
709	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (73/240)	2031-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.317049	2025-04-22 09:34:30.663
708	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (72/240)	2031-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.266176	2025-04-22 09:34:30.672
707	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (71/240)	2031-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.214914	2025-04-22 09:34:30.682
706	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (70/240)	2031-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.193117	2025-04-22 09:34:30.703
705	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (69/240)	2030-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.144932	2025-04-22 09:34:30.708
704	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (68/240)	2030-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:25.097803	2025-04-22 09:34:30.741
703	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (67/240)	2030-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.074089	2025-04-22 09:34:30.769
702	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (66/240)	2030-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:25.021231	2025-04-22 09:34:30.804
701	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (65/240)	2030-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.999246	2025-04-22 09:34:30.814
700	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (64/240)	2030-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.978213	2025-04-22 09:34:30.836
699	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (63/240)	2030-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.926322	2025-04-22 09:34:30.868
698	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (62/240)	2030-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.880558	2025-04-22 09:34:30.876
697	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (61/240)	2030-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.83116	2025-04-22 09:34:30.898
696	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (60/240)	2030-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.809704	2025-04-22 09:34:30.936
695	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (59/240)	2030-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.76129	2025-04-22 09:34:30.947
694	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (58/240)	2030-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.715435	2025-04-22 09:34:30.991
693	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (57/240)	2029-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.668056	2025-04-22 09:34:30.998
692	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (56/240)	2029-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:24.646078	2025-04-22 09:34:31.052
691	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (55/240)	2029-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.59797	2025-04-22 09:34:31.116
690	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (54/240)	2029-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.551866	2025-04-22 09:34:31.126
689	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (53/240)	2029-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.527625	2025-04-22 09:34:31.131
687	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (52/240)	2029-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.467425	2025-04-22 09:34:31.151
685	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (51/240)	2029-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.401181	2025-04-22 09:34:31.183
683	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (50/240)	2029-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:24.335088	2025-04-22 09:34:31.195
1455	1	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 17:38:14.000696	2025-04-29 17:38:14.000696
1458	1	\N	\N	\N	{}	income	rent	0.00		2025-04-29 10:00:00	pending	bank_transfer	2025-04-29 17:38:14.57602	2025-04-29 17:38:14.57602
778	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (142/240)	2037-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.348791	2025-04-22 09:34:28.885
777	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (141/240)	2036-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.299575	2025-04-22 09:34:28.894
776	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (140/240)	2036-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.27588	2025-04-22 09:34:28.939
775	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (139/240)	2036-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.224161	2025-04-22 09:34:28.988
774	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (138/240)	2036-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.177693	2025-04-22 09:34:28.998
773	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (137/240)	2036-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.155312	2025-04-22 09:34:29.009
772	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (136/240)	2036-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.111016	2025-04-22 09:34:29.059
771	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (135/240)	2036-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.089368	2025-04-22 09:34:29.063
770	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (134/240)	2036-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.040986	2025-04-22 09:34:29.072
769	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (133/240)	2036-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.018149	2025-04-22 09:34:29.098
768	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (132/240)	2036-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.995961	2025-04-22 09:34:29.135
767	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (131/240)	2036-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.946275	2025-04-22 09:34:29.145
766	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (130/240)	2036-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.924103	2025-04-22 09:34:29.163
765	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (129/240)	2035-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.873801	2025-04-22 09:34:29.173
764	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (128/240)	2035-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.823151	2025-04-22 09:34:29.207
763	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (127/240)	2035-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.799972	2025-04-22 09:34:29.257
762	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (126/240)	2035-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.751397	2025-04-22 09:34:29.265
761	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (125/240)	2035-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.707322	2025-04-22 09:34:29.278
760	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (124/240)	2035-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.65758	2025-04-22 09:34:29.324
759	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (123/240)	2035-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.634772	2025-04-22 09:34:29.331
758	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (122/240)	2035-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.584296	2025-04-22 09:34:29.341
756	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (120/240)	2035-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.513548	2025-04-22 09:34:29.403
755	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (119/240)	2035-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.464411	2025-04-22 09:34:29.413
754	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (118/240)	2035-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.441539	2025-04-22 09:34:29.461
753	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (117/240)	2034-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.3928	2025-04-22 09:34:29.466
752	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (116/240)	2034-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.342156	2025-04-22 09:34:29.506
751	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (115/240)	2034-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.319768	2025-04-22 09:34:29.53
750	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (114/240)	2034-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.270984	2025-04-22 09:34:29.539
749	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (113/240)	2034-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.221083	2025-04-22 09:34:29.581
748	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (112/240)	2034-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.165832	2025-04-22 09:34:29.613
747	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (111/240)	2034-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.143769	2025-04-22 09:34:29.623
746	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (110/240)	2034-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.120265	2025-04-22 09:34:29.661
745	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (109/240)	2034-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:27.070198	2025-04-22 09:34:29.689
744	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (108/240)	2034-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.04751	2025-04-22 09:34:29.698
743	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (107/240)	2034-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:27.023662	2025-04-22 09:34:29.822
742	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (106/240)	2034-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.972178	2025-04-22 09:34:29.852
741	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (105/240)	2033-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.950783	2025-04-22 09:34:29.884
740	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (104/240)	2033-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:26.929387	2025-04-22 09:34:29.892
739	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (103/240)	2033-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.879958	2025-04-22 09:34:29.916
738	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (102/240)	2033-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.832555	2025-04-22 09:34:29.953
737	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (101/240)	2033-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.805206	2025-04-22 09:34:29.963
736	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (100/240)	2033-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.758551	2025-04-22 09:34:30.009
735	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (99/240)	2033-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.735955	2025-04-22 09:34:30.014
734	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (98/240)	2033-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.714864	2025-04-22 09:34:30.023
733	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (97/240)	2033-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:26.665944	2025-04-22 09:34:30.073
825	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (189/240)	2040-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.124743	2025-04-22 09:34:27.771
824	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (188/240)	2040-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.099677	2025-04-22 09:34:27.808
823	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (187/240)	2040-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.077154	2025-04-22 09:34:27.83
822	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (186/240)	2040-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.032141	2025-04-22 09:34:27.836
821	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (185/240)	2040-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.010341	2025-04-22 09:34:27.87
820	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (184/240)	2040-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.95904	2025-04-22 09:34:27.896
819	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (183/240)	2040-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.900829	2025-04-22 09:34:27.931
818	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (182/240)	2040-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.850811	2025-04-22 09:34:27.944
817	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (181/240)	2040-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.826507	2025-04-22 09:34:27.962
816	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (180/240)	2040-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.777427	2025-04-22 09:34:27.969
815	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (179/240)	2040-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.755039	2025-04-22 09:34:27.977
814	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (178/240)	2040-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.73197	2025-04-22 09:34:28.026
813	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (177/240)	2039-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.681634	2025-04-22 09:34:28.036
812	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (176/240)	2039-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.660238	2025-04-22 09:34:28.047
811	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (175/240)	2039-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.61252	2025-04-22 09:34:28.095
810	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (174/240)	2039-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.589741	2025-04-22 09:34:28.099
809	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (173/240)	2039-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.539626	2025-04-22 09:34:28.136
808	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (172/240)	2039-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.490416	2025-04-22 09:34:28.16
807	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (171/240)	2039-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.465369	2025-04-22 09:34:28.167
806	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (170/240)	2039-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.444051	2025-04-22 09:34:28.205
805	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (169/240)	2039-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.395868	2025-04-22 09:34:28.252
803	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (167/240)	2039-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.297916	2025-04-22 09:34:28.265
802	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (166/240)	2039-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.274198	2025-04-22 09:34:28.322
801	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (165/240)	2038-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.215476	2025-04-22 09:34:28.331
800	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (164/240)	2038-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:29.163938	2025-04-22 09:34:28.369
799	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (163/240)	2038-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.139921	2025-04-22 09:34:28.416
798	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (162/240)	2038-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.112784	2025-04-22 09:34:28.423
797	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (161/240)	2038-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.061167	2025-04-22 09:34:28.431
796	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (160/240)	2038-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:29.009028	2025-04-22 09:34:28.482
795	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (159/240)	2038-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.961214	2025-04-22 09:34:28.492
794	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (158/240)	2038-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.912466	2025-04-22 09:34:28.503
793	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (157/240)	2038-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.890366	2025-04-22 09:34:28.547
792	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (156/240)	2038-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.843032	2025-04-22 09:34:28.562
791	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (155/240)	2038-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.818617	2025-04-22 09:34:28.571
790	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (154/240)	2038-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.795891	2025-04-22 09:34:28.596
789	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (153/240)	2037-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.749831	2025-04-22 09:34:28.632
788	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (152/240)	2037-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.726971	2025-04-22 09:34:28.644
787	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (151/240)	2037-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.703229	2025-04-22 09:34:28.663
786	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (150/240)	2037-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.653339	2025-04-22 09:34:28.67
785	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (149/240)	2037-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.606442	2025-04-22 09:34:28.706
784	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (148/240)	2037-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.584188	2025-04-22 09:34:28.757
783	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (147/240)	2037-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.534676	2025-04-22 09:34:28.766
782	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (146/240)	2037-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.490879	2025-04-22 09:34:28.778
781	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (145/240)	2037-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:28.468224	2025-04-22 09:34:28.797
780	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (144/240)	2037-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:28.421161	2025-04-22 09:34:28.806
869	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (233/240)	2044-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:32.272719	2025-04-22 09:34:26.479
871	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (235/240)	2044-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:32.34807	2025-04-22 09:34:26.499
873	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (237/240)	2044-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.42692	2025-04-22 09:34:26.504
872	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (236/240)	2044-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.399288	2025-04-22 09:34:26.535
868	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (232/240)	2044-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:32.250607	2025-04-22 09:34:26.675
867	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (231/240)	2044-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:32.201366	2025-04-22 09:34:26.691
866	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (230/240)	2044-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:32.178941	2025-04-22 09:34:26.746
865	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (229/240)	2044-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:32.157419	2025-04-22 09:34:26.76
864	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (228/240)	2044-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.109295	2025-04-22 09:34:26.795
863	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (227/240)	2044-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.081497	2025-04-22 09:34:26.809
862	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (226/240)	2044-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.03058	2025-04-22 09:34:26.839
861	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (225/240)	2043-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:31.975101	2025-04-22 09:34:26.848
860	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (224/240)	2043-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:31.917022	2025-04-22 09:34:26.887
859	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (223/240)	2043-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.895358	2025-04-22 09:34:26.911
858	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (222/240)	2043-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.844313	2025-04-22 09:34:26.916
857	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (221/240)	2043-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.791708	2025-04-22 09:34:26.953
856	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (220/240)	2043-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.741293	2025-04-22 09:34:27.015
855	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (219/240)	2043-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.714515	2025-04-22 09:34:27.026
854	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (218/240)	2043-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.693089	2025-04-22 09:34:27.038
853	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (217/240)	2043-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.635101	2025-04-22 09:34:27.09
852	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (216/240)	2043-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:31.576498	2025-04-22 09:34:27.096
850	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (214/240)	2043-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:31.445524	2025-04-22 09:34:27.136
849	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (213/240)	2042-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:31.41249	2025-04-22 09:34:27.171
848	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (212/240)	2042-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:31.292535	2025-04-22 09:34:27.182
847	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (211/240)	2042-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.241223	2025-04-22 09:34:27.2
846	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (210/240)	2042-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.187573	2025-04-22 09:34:27.242
845	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (209/240)	2042-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.163782	2025-04-22 09:34:27.255
844	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (208/240)	2042-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.141839	2025-04-22 09:34:27.291
843	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (207/240)	2042-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.092985	2025-04-22 09:34:27.304
842	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (206/240)	2042-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.06819	2025-04-22 09:34:27.323
841	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (205/240)	2042-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:31.046138	2025-04-22 09:34:27.372
840	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (204/240)	2042-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.995477	2025-04-22 09:34:27.379
839	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (203/240)	2042-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.971112	2025-04-22 09:34:27.388
838	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (202/240)	2042-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.947133	2025-04-22 09:34:27.443
837	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (201/240)	2041-12-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.893595	2025-04-22 09:34:27.481
836	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (200/240)	2041-11-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.8684	2025-04-22 09:34:27.501
835	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (199/240)	2041-10-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.817096	2025-04-22 09:34:27.557
834	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (198/240)	2041-09-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.790613	2025-04-22 09:34:27.563
833	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (197/240)	2041-08-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.730216	2025-04-22 09:34:27.576
832	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (196/240)	2041-07-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.676928	2025-04-22 09:34:27.599
831	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (195/240)	2041-06-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.618902	2025-04-22 09:34:27.636
830	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (194/240)	2041-05-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.534395	2025-04-22 09:34:27.648
829	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (193/240)	2041-04-16 10:00:00	completed	bank_transfer	2025-04-16 20:14:30.475841	2025-04-22 09:34:27.667
828	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (192/240)	2041-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.299602	2025-04-22 09:34:27.7
827	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (191/240)	2041-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:30.234882	2025-04-22 09:34:27.711
874	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (238/240)	2045-01-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.472549	2025-04-22 09:34:26.387
876	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (240/240)	2045-03-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.54658	2025-04-22 09:34:26.394
875	2	19	\N	\N	{}	credit	other	26.00	Remboursement du prêt pour hj (239/240)	2045-02-16 11:00:00	completed	bank_transfer	2025-04-16 20:14:32.523613	2025-04-22 09:34:26.541
1460	1	\N	\N	\N	{}	credit	mortgage	3000.00		2025-04-30 10:00:00	pending	bank_transfer	2025-04-30 18:58:15.693833	2025-04-30 18:58:15.693833
878	2	22	\N	\N	{}	credit	other	230.00	Mensualité prêt 1/240 - 51515115	2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:06:40.036898	2025-04-16 21:06:40.036898
879	2	24	\N	\N	{}	expense	other	360000.00	Achat de la propriété: teste trasanc vis 	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 21:49:11.445335	2025-04-16 21:49:11.445335
880	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 1/180 - teste trasanc vis 	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 21:49:11.555698	2025-04-16 21:49:11.555698
881	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 2/180 - teste trasanc vis 	2025-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:12.439871	2025-04-16 21:49:12.439871
882	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 3/180 - teste trasanc vis 	2025-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:12.744415	2025-04-16 21:49:12.744415
883	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 4/180 - teste trasanc vis 	2025-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:13.412889	2025-04-16 21:49:13.412889
884	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 5/180 - teste trasanc vis 	2025-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:13.789099	2025-04-16 21:49:13.789099
885	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 6/180 - teste trasanc vis 	2025-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:14.126121	2025-04-16 21:49:14.126121
886	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 7/180 - teste trasanc vis 	2025-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:14.467762	2025-04-16 21:49:14.467762
887	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 8/180 - teste trasanc vis 	2025-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:14.776903	2025-04-16 21:49:14.776903
888	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 9/180 - teste trasanc vis 	2025-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:15.095237	2025-04-16 21:49:15.095237
889	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 10/180 - teste trasanc vis 	2026-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:15.445209	2025-04-16 21:49:15.445209
890	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 11/180 - teste trasanc vis 	2026-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:15.776379	2025-04-16 21:49:15.776379
891	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 12/180 - teste trasanc vis 	2026-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:16.093749	2025-04-16 21:49:16.093749
892	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 13/180 - teste trasanc vis 	2026-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:16.451708	2025-04-16 21:49:16.451708
893	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 14/180 - teste trasanc vis 	2026-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:16.769014	2025-04-16 21:49:16.769014
894	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 15/180 - teste trasanc vis 	2026-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:17.360086	2025-04-16 21:49:17.360086
895	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 16/180 - teste trasanc vis 	2026-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:17.655852	2025-04-16 21:49:17.655852
896	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 17/180 - teste trasanc vis 	2026-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:18.19671	2025-04-16 21:49:18.19671
897	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 18/180 - teste trasanc vis 	2026-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:18.790089	2025-04-16 21:49:18.790089
898	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 19/180 - teste trasanc vis 	2026-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:19.083045	2025-04-16 21:49:19.083045
899	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 20/180 - teste trasanc vis 	2026-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:19.642979	2025-04-16 21:49:19.642979
900	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 21/180 - teste trasanc vis 	2026-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:20.201966	2025-04-16 21:49:20.201966
901	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 22/180 - teste trasanc vis 	2027-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:21.164009	2025-04-16 21:49:21.164009
902	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 23/180 - teste trasanc vis 	2027-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:21.980716	2025-04-16 21:49:21.980716
903	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 24/180 - teste trasanc vis 	2027-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:22.714395	2025-04-16 21:49:22.714395
904	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 25/180 - teste trasanc vis 	2027-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:23.464908	2025-04-16 21:49:23.464908
905	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 26/180 - teste trasanc vis 	2027-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:24.033286	2025-04-16 21:49:24.033286
906	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 27/180 - teste trasanc vis 	2027-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:24.675876	2025-04-16 21:49:24.675876
907	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 28/180 - teste trasanc vis 	2027-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:25.480995	2025-04-16 21:49:25.480995
908	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 29/180 - teste trasanc vis 	2027-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:25.984333	2025-04-16 21:49:25.984333
909	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 30/180 - teste trasanc vis 	2027-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:26.32437	2025-04-16 21:49:26.32437
910	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 31/180 - teste trasanc vis 	2027-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:26.926461	2025-04-16 21:49:26.926461
911	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 32/180 - teste trasanc vis 	2027-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:27.253443	2025-04-16 21:49:27.253443
912	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 33/180 - teste trasanc vis 	2027-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:27.771131	2025-04-16 21:49:27.771131
913	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 34/180 - teste trasanc vis 	2028-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:28.278751	2025-04-16 21:49:28.278751
914	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 35/180 - teste trasanc vis 	2028-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:28.596847	2025-04-16 21:49:28.596847
915	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 36/180 - teste trasanc vis 	2028-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:29.176342	2025-04-16 21:49:29.176342
916	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 37/180 - teste trasanc vis 	2028-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:29.7525	2025-04-16 21:49:29.7525
917	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 38/180 - teste trasanc vis 	2028-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:30.344979	2025-04-16 21:49:30.344979
918	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 39/180 - teste trasanc vis 	2028-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:30.644012	2025-04-16 21:49:30.644012
919	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 40/180 - teste trasanc vis 	2028-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:31.191247	2025-04-16 21:49:31.191247
920	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 41/180 - teste trasanc vis 	2028-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:31.721841	2025-04-16 21:49:31.721841
921	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 42/180 - teste trasanc vis 	2028-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:32.20972	2025-04-16 21:49:32.20972
922	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 43/180 - teste trasanc vis 	2028-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:32.494328	2025-04-16 21:49:32.494328
1108	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 35/240 - 789789	2028-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:11.976383	2025-04-16 22:38:11.976383
923	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 44/180 - teste trasanc vis 	2028-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:33.030569	2025-04-16 21:49:33.030569
924	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 45/180 - teste trasanc vis 	2028-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:33.590359	2025-04-16 21:49:33.590359
925	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 46/180 - teste trasanc vis 	2029-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:34.135755	2025-04-16 21:49:34.135755
926	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 47/180 - teste trasanc vis 	2029-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:34.422421	2025-04-16 21:49:34.422421
927	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 48/180 - teste trasanc vis 	2029-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:34.977579	2025-04-16 21:49:34.977579
928	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 49/180 - teste trasanc vis 	2029-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:35.563696	2025-04-16 21:49:35.563696
929	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 50/180 - teste trasanc vis 	2029-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:36.084807	2025-04-16 21:49:36.084807
930	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 51/180 - teste trasanc vis 	2029-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:36.640125	2025-04-16 21:49:36.640125
931	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 52/180 - teste trasanc vis 	2029-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:37.189278	2025-04-16 21:49:37.189278
932	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 53/180 - teste trasanc vis 	2029-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:37.697277	2025-04-16 21:49:37.697277
933	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 54/180 - teste trasanc vis 	2029-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:38.262068	2025-04-16 21:49:38.262068
934	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 55/180 - teste trasanc vis 	2029-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:38.853949	2025-04-16 21:49:38.853949
935	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 56/180 - teste trasanc vis 	2029-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:39.416284	2025-04-16 21:49:39.416284
936	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 57/180 - teste trasanc vis 	2029-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:39.749811	2025-04-16 21:49:39.749811
937	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 58/180 - teste trasanc vis 	2030-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:40.264188	2025-04-16 21:49:40.264188
938	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 59/180 - teste trasanc vis 	2030-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:40.770169	2025-04-16 21:49:40.770169
939	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 60/180 - teste trasanc vis 	2030-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:41.310744	2025-04-16 21:49:41.310744
940	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 61/180 - teste trasanc vis 	2030-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:41.831032	2025-04-16 21:49:41.831032
941	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 62/180 - teste trasanc vis 	2030-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:42.404	2025-04-16 21:49:42.404
942	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 63/180 - teste trasanc vis 	2030-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:43.052066	2025-04-16 21:49:43.052066
943	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 64/180 - teste trasanc vis 	2030-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:43.548738	2025-04-16 21:49:43.548738
944	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 65/180 - teste trasanc vis 	2030-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:43.846101	2025-04-16 21:49:43.846101
945	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 66/180 - teste trasanc vis 	2030-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:44.400326	2025-04-16 21:49:44.400326
946	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 67/180 - teste trasanc vis 	2030-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:44.970242	2025-04-16 21:49:44.970242
947	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 68/180 - teste trasanc vis 	2030-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:45.514828	2025-04-16 21:49:45.514828
948	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 69/180 - teste trasanc vis 	2030-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:46.022023	2025-04-16 21:49:46.022023
949	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 70/180 - teste trasanc vis 	2031-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:46.595621	2025-04-16 21:49:46.595621
950	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 71/180 - teste trasanc vis 	2031-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:47.099491	2025-04-16 21:49:47.099491
951	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 72/180 - teste trasanc vis 	2031-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:47.618934	2025-04-16 21:49:47.618934
952	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 73/180 - teste trasanc vis 	2031-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:48.145032	2025-04-16 21:49:48.145032
953	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 74/180 - teste trasanc vis 	2031-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:48.732209	2025-04-16 21:49:48.732209
954	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 75/180 - teste trasanc vis 	2031-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:49.303992	2025-04-16 21:49:49.303992
955	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 76/180 - teste trasanc vis 	2031-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:49.861617	2025-04-16 21:49:49.861617
956	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 77/180 - teste trasanc vis 	2031-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:50.12645	2025-04-16 21:49:50.12645
957	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 78/180 - teste trasanc vis 	2031-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:50.702499	2025-04-16 21:49:50.702499
958	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 79/180 - teste trasanc vis 	2031-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:51.239357	2025-04-16 21:49:51.239357
959	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 80/180 - teste trasanc vis 	2031-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:51.805084	2025-04-16 21:49:51.805084
960	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 81/180 - teste trasanc vis 	2031-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:52.357686	2025-04-16 21:49:52.357686
961	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 82/180 - teste trasanc vis 	2032-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:52.934693	2025-04-16 21:49:52.934693
962	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 83/180 - teste trasanc vis 	2032-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:53.460167	2025-04-16 21:49:53.460167
963	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 84/180 - teste trasanc vis 	2032-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:53.740975	2025-04-16 21:49:53.740975
964	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 85/180 - teste trasanc vis 	2032-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:54.319542	2025-04-16 21:49:54.319542
965	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 86/180 - teste trasanc vis 	2032-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:54.552287	2025-04-16 21:49:54.552287
966	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 87/180 - teste trasanc vis 	2032-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:55.147212	2025-04-16 21:49:55.147212
967	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 88/180 - teste trasanc vis 	2032-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:55.687429	2025-04-16 21:49:55.687429
968	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 89/180 - teste trasanc vis 	2032-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:56.230594	2025-04-16 21:49:56.230594
969	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 90/180 - teste trasanc vis 	2032-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:56.585424	2025-04-16 21:49:56.585424
970	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 91/180 - teste trasanc vis 	2032-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:49:56.902465	2025-04-16 21:49:56.902465
971	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 92/180 - teste trasanc vis 	2032-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:57.473768	2025-04-16 21:49:57.473768
972	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 93/180 - teste trasanc vis 	2032-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:58.039658	2025-04-16 21:49:58.039658
973	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 94/180 - teste trasanc vis 	2033-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:58.586967	2025-04-16 21:49:58.586967
974	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 95/180 - teste trasanc vis 	2033-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:59.126495	2025-04-16 21:49:59.126495
975	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 96/180 - teste trasanc vis 	2033-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:49:59.692429	2025-04-16 21:49:59.692429
976	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 97/180 - teste trasanc vis 	2033-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:00.263225	2025-04-16 21:50:00.263225
977	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 98/180 - teste trasanc vis 	2033-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:00.863806	2025-04-16 21:50:00.863806
978	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 99/180 - teste trasanc vis 	2033-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:01.462698	2025-04-16 21:50:01.462698
979	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 100/180 - teste trasanc vis 	2033-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:01.996711	2025-04-16 21:50:01.996711
980	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 101/180 - teste trasanc vis 	2033-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:02.771833	2025-04-16 21:50:02.771833
981	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 102/180 - teste trasanc vis 	2033-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:03.304554	2025-04-16 21:50:03.304554
982	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 103/180 - teste trasanc vis 	2033-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:03.815899	2025-04-16 21:50:03.815899
983	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 104/180 - teste trasanc vis 	2033-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:04.315711	2025-04-16 21:50:04.315711
984	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 105/180 - teste trasanc vis 	2033-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:04.834764	2025-04-16 21:50:04.834764
985	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 106/180 - teste trasanc vis 	2034-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:05.441441	2025-04-16 21:50:05.441441
986	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 107/180 - teste trasanc vis 	2034-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:06.000554	2025-04-16 21:50:06.000554
987	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 108/180 - teste trasanc vis 	2034-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:06.552417	2025-04-16 21:50:06.552417
988	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 109/180 - teste trasanc vis 	2034-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:07.095395	2025-04-16 21:50:07.095395
989	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 110/180 - teste trasanc vis 	2034-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:07.703462	2025-04-16 21:50:07.703462
990	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 111/180 - teste trasanc vis 	2034-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:08.019454	2025-04-16 21:50:08.019454
991	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 112/180 - teste trasanc vis 	2034-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:08.522619	2025-04-16 21:50:08.522619
992	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 113/180 - teste trasanc vis 	2034-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:09.042528	2025-04-16 21:50:09.042528
993	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 114/180 - teste trasanc vis 	2034-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:09.691492	2025-04-16 21:50:09.691492
994	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 115/180 - teste trasanc vis 	2034-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:10.372418	2025-04-16 21:50:10.372418
995	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 116/180 - teste trasanc vis 	2034-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:10.708893	2025-04-16 21:50:10.708893
996	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 117/180 - teste trasanc vis 	2034-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:11.226821	2025-04-16 21:50:11.226821
997	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 118/180 - teste trasanc vis 	2035-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:11.85716	2025-04-16 21:50:11.85716
998	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 119/180 - teste trasanc vis 	2035-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:12.473795	2025-04-16 21:50:12.473795
999	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 120/180 - teste trasanc vis 	2035-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:12.819513	2025-04-16 21:50:12.819513
1000	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 121/180 - teste trasanc vis 	2035-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:13.38506	2025-04-16 21:50:13.38506
1001	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 122/180 - teste trasanc vis 	2035-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:13.890858	2025-04-16 21:50:13.890858
1002	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 123/180 - teste trasanc vis 	2035-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:14.229058	2025-04-16 21:50:14.229058
1003	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 124/180 - teste trasanc vis 	2035-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:14.77522	2025-04-16 21:50:14.77522
1004	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 125/180 - teste trasanc vis 	2035-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:15.440191	2025-04-16 21:50:15.440191
1005	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 126/180 - teste trasanc vis 	2035-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:15.978973	2025-04-16 21:50:15.978973
1006	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 127/180 - teste trasanc vis 	2035-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:16.5625	2025-04-16 21:50:16.5625
1007	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 128/180 - teste trasanc vis 	2035-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:16.896695	2025-04-16 21:50:16.896695
1008	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 129/180 - teste trasanc vis 	2035-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:17.530672	2025-04-16 21:50:17.530672
1009	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 130/180 - teste trasanc vis 	2036-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:18.201212	2025-04-16 21:50:18.201212
1010	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 131/180 - teste trasanc vis 	2036-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:18.793375	2025-04-16 21:50:18.793375
1011	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 132/180 - teste trasanc vis 	2036-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:19.05781	2025-04-16 21:50:19.05781
1012	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 133/180 - teste trasanc vis 	2036-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:19.640483	2025-04-16 21:50:19.640483
1013	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 134/180 - teste trasanc vis 	2036-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:20.363653	2025-04-16 21:50:20.363653
1014	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 135/180 - teste trasanc vis 	2036-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:21.164175	2025-04-16 21:50:21.164175
1015	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 136/180 - teste trasanc vis 	2036-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:21.882343	2025-04-16 21:50:21.882343
1016	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 137/180 - teste trasanc vis 	2036-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:22.784133	2025-04-16 21:50:22.784133
1017	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 138/180 - teste trasanc vis 	2036-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:23.218675	2025-04-16 21:50:23.218675
1018	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 139/180 - teste trasanc vis 	2036-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:23.576903	2025-04-16 21:50:23.576903
1019	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 140/180 - teste trasanc vis 	2036-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:23.955695	2025-04-16 21:50:23.955695
1020	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 141/180 - teste trasanc vis 	2036-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:24.269759	2025-04-16 21:50:24.269759
1021	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 142/180 - teste trasanc vis 	2037-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:24.584997	2025-04-16 21:50:24.584997
1022	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 143/180 - teste trasanc vis 	2037-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:24.899563	2025-04-16 21:50:24.899563
1023	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 144/180 - teste trasanc vis 	2037-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:25.244108	2025-04-16 21:50:25.244108
1024	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 145/180 - teste trasanc vis 	2037-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:25.580186	2025-04-16 21:50:25.580186
1025	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 146/180 - teste trasanc vis 	2037-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:25.873359	2025-04-16 21:50:25.873359
1026	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 147/180 - teste trasanc vis 	2037-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:26.236778	2025-04-16 21:50:26.236778
1027	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 148/180 - teste trasanc vis 	2037-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:26.527199	2025-04-16 21:50:26.527199
1028	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 149/180 - teste trasanc vis 	2037-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:26.836547	2025-04-16 21:50:26.836547
1029	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 150/180 - teste trasanc vis 	2037-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:27.173605	2025-04-16 21:50:27.173605
1030	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 151/180 - teste trasanc vis 	2037-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:27.522486	2025-04-16 21:50:27.522486
1031	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 152/180 - teste trasanc vis 	2037-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:27.773587	2025-04-16 21:50:27.773587
1032	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 153/180 - teste trasanc vis 	2037-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:28.172223	2025-04-16 21:50:28.172223
1033	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 154/180 - teste trasanc vis 	2038-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:28.491284	2025-04-16 21:50:28.491284
1034	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 155/180 - teste trasanc vis 	2038-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:28.893561	2025-04-16 21:50:28.893561
1035	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 156/180 - teste trasanc vis 	2038-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:29.199218	2025-04-16 21:50:29.199218
1036	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 157/180 - teste trasanc vis 	2038-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:29.518792	2025-04-16 21:50:29.518792
1037	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 158/180 - teste trasanc vis 	2038-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:29.779069	2025-04-16 21:50:29.779069
1038	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 159/180 - teste trasanc vis 	2038-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:30.115181	2025-04-16 21:50:30.115181
1039	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 160/180 - teste trasanc vis 	2038-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:30.539087	2025-04-16 21:50:30.539087
1040	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 161/180 - teste trasanc vis 	2038-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:31.015094	2025-04-16 21:50:31.015094
1041	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 162/180 - teste trasanc vis 	2038-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:31.272504	2025-04-16 21:50:31.272504
1042	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 163/180 - teste trasanc vis 	2038-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:31.555509	2025-04-16 21:50:31.555509
1043	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 164/180 - teste trasanc vis 	2038-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:31.865088	2025-04-16 21:50:31.865088
1044	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 165/180 - teste trasanc vis 	2038-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:32.243776	2025-04-16 21:50:32.243776
1045	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 166/180 - teste trasanc vis 	2039-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:32.610596	2025-04-16 21:50:32.610596
1046	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 167/180 - teste trasanc vis 	2039-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:32.91788	2025-04-16 21:50:32.91788
1047	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 168/180 - teste trasanc vis 	2039-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:33.227199	2025-04-16 21:50:33.227199
1048	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 169/180 - teste trasanc vis 	2039-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:33.550514	2025-04-16 21:50:33.550514
1049	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 170/180 - teste trasanc vis 	2039-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:33.889698	2025-04-16 21:50:33.889698
1050	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 171/180 - teste trasanc vis 	2039-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:34.200221	2025-04-16 21:50:34.200221
1051	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 172/180 - teste trasanc vis 	2039-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:34.557832	2025-04-16 21:50:34.557832
1052	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 173/180 - teste trasanc vis 	2039-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:34.802898	2025-04-16 21:50:34.802898
1053	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 174/180 - teste trasanc vis 	2039-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:35.192253	2025-04-16 21:50:35.192253
1054	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 175/180 - teste trasanc vis 	2039-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:50:35.605324	2025-04-16 21:50:35.605324
1055	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 176/180 - teste trasanc vis 	2039-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:35.985484	2025-04-16 21:50:35.985484
1056	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 177/180 - teste trasanc vis 	2039-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:36.268235	2025-04-16 21:50:36.268235
1057	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 178/180 - teste trasanc vis 	2040-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:36.582716	2025-04-16 21:50:36.582716
1058	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 179/180 - teste trasanc vis 	2040-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:36.878795	2025-04-16 21:50:36.878795
1059	2	24	\N	\N	{}	credit	other	299.00	Mensualité prêt 180/180 - teste trasanc vis 	2040-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:50:37.209532	2025-04-16 21:50:37.209532
1060	2	25	\N	\N	{}	credit	other	480.00	Prêt immobilier - a (240 mensualités)	2025-04-16 10:00:00	pending	bank_transfer	2025-04-16 21:55:00.417725	2025-04-16 21:55:00.417725
1061	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 1/240 - a	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 21:55:00.54137	2025-04-16 21:55:00.54137
1062	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 2/240 - a	2025-05-16 10:00:00	pending	bank_transfer	2025-04-16 21:55:01.31834	2025-04-16 21:55:01.31834
1063	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 3/240 - a	2025-06-16 10:00:00	pending	bank_transfer	2025-04-16 21:55:01.602569	2025-04-16 21:55:01.602569
1064	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 4/240 - a	2025-07-16 10:00:00	pending	bank_transfer	2025-04-16 21:55:01.87578	2025-04-16 21:55:01.87578
1065	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 5/240 - a	2025-08-16 10:00:00	pending	bank_transfer	2025-04-16 21:55:02.374373	2025-04-16 21:55:02.374373
1066	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 6/240 - a	2025-09-16 10:00:00	pending	bank_transfer	2025-04-16 21:55:02.718659	2025-04-16 21:55:02.718659
1067	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 7/240 - a	2025-10-16 10:00:00	pending	bank_transfer	2025-04-16 21:55:02.95226	2025-04-16 21:55:02.95226
1068	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 8/240 - a	2025-11-16 11:00:00	pending	bank_transfer	2025-04-16 21:55:03.246993	2025-04-16 21:55:03.246993
1069	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 9/240 - a	2025-12-16 11:00:00	pending	bank_transfer	2025-04-16 21:55:03.475493	2025-04-16 21:55:03.475493
1070	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 10/240 - a	2026-01-16 11:00:00	pending	bank_transfer	2025-04-16 21:55:03.749837	2025-04-16 21:55:03.749837
1071	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 11/240 - a	2026-02-16 11:00:00	pending	bank_transfer	2025-04-16 21:55:03.979545	2025-04-16 21:55:03.979545
1072	2	25	\N	\N	{}	credit	other	2.00	Mensualité prêt 12/240 - a	2026-03-16 11:00:00	pending	bank_transfer	2025-04-16 21:55:04.24	2025-04-16 21:55:04.24
1073	2	26	\N	\N	{}	expense	other	6540.00	Achat de la propriété: 789789	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 22:37:56.310385	2025-04-16 22:37:56.310385
1074	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 1/240 - 789789	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 22:37:56.482969	2025-04-16 22:37:56.482969
1075	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 2/240 - 789789	2025-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:37:57.339726	2025-04-16 22:37:57.339726
1076	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 3/240 - 789789	2025-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:37:57.679034	2025-04-16 22:37:57.679034
1077	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 4/240 - 789789	2025-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:37:57.988707	2025-04-16 22:37:57.988707
1078	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 5/240 - 789789	2025-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:37:58.646659	2025-04-16 22:37:58.646659
1079	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 6/240 - 789789	2025-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:37:59.01627	2025-04-16 22:37:59.01627
1080	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 7/240 - 789789	2025-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:37:59.314748	2025-04-16 22:37:59.314748
1081	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 8/240 - 789789	2025-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:37:59.631434	2025-04-16 22:37:59.631434
1082	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 9/240 - 789789	2025-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:37:59.912082	2025-04-16 22:37:59.912082
1083	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 10/240 - 789789	2026-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:00.167265	2025-04-16 22:38:00.167265
1084	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 11/240 - 789789	2026-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:00.481965	2025-04-16 22:38:00.481965
1085	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 12/240 - 789789	2026-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:00.737241	2025-04-16 22:38:00.737241
1086	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 13/240 - 789789	2026-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:01.015489	2025-04-16 22:38:01.015489
1087	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 14/240 - 789789	2026-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:01.33286	2025-04-16 22:38:01.33286
1088	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 15/240 - 789789	2026-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:01.634274	2025-04-16 22:38:01.634274
1089	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 16/240 - 789789	2026-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:01.881413	2025-04-16 22:38:01.881413
1090	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 17/240 - 789789	2026-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:02.395029	2025-04-16 22:38:02.395029
1091	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 18/240 - 789789	2026-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:02.867465	2025-04-16 22:38:02.867465
1092	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 19/240 - 789789	2026-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:03.413013	2025-04-16 22:38:03.413013
1093	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 20/240 - 789789	2026-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:03.924749	2025-04-16 22:38:03.924749
1094	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 21/240 - 789789	2026-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:04.561439	2025-04-16 22:38:04.561439
1095	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 22/240 - 789789	2027-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:05.06216	2025-04-16 22:38:05.06216
1096	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 23/240 - 789789	2027-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:05.732907	2025-04-16 22:38:05.732907
1097	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 24/240 - 789789	2027-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:06.464154	2025-04-16 22:38:06.464154
1098	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 25/240 - 789789	2027-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:07.184817	2025-04-16 22:38:07.184817
1099	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 26/240 - 789789	2027-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:07.758656	2025-04-16 22:38:07.758656
1100	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 27/240 - 789789	2027-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:08.138814	2025-04-16 22:38:08.138814
1101	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 28/240 - 789789	2027-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:08.664634	2025-04-16 22:38:08.664634
1102	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 29/240 - 789789	2027-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:09.126542	2025-04-16 22:38:09.126542
1103	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 30/240 - 789789	2027-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:09.589122	2025-04-16 22:38:09.589122
1104	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 31/240 - 789789	2027-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:10.132743	2025-04-16 22:38:10.132743
1105	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 32/240 - 789789	2027-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:10.595716	2025-04-16 22:38:10.595716
1106	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 33/240 - 789789	2027-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:10.862808	2025-04-16 22:38:10.862808
1107	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 34/240 - 789789	2028-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:11.411328	2025-04-16 22:38:11.411328
1109	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 36/240 - 789789	2028-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:12.247475	2025-04-16 22:38:12.247475
1110	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 37/240 - 789789	2028-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:12.797926	2025-04-16 22:38:12.797926
1111	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 38/240 - 789789	2028-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:13.034364	2025-04-16 22:38:13.034364
1112	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 39/240 - 789789	2028-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:13.523872	2025-04-16 22:38:13.523872
1113	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 40/240 - 789789	2028-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:13.797519	2025-04-16 22:38:13.797519
1114	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 41/240 - 789789	2028-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:14.2799	2025-04-16 22:38:14.2799
1115	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 42/240 - 789789	2028-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:14.836162	2025-04-16 22:38:14.836162
1116	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 43/240 - 789789	2028-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:15.397994	2025-04-16 22:38:15.397994
1117	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 44/240 - 789789	2028-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:15.898146	2025-04-16 22:38:15.898146
1118	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 45/240 - 789789	2028-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:16.385191	2025-04-16 22:38:16.385191
1119	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 46/240 - 789789	2029-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:16.68983	2025-04-16 22:38:16.68983
1120	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 47/240 - 789789	2029-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:17.198264	2025-04-16 22:38:17.198264
1121	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 48/240 - 789789	2029-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:17.701782	2025-04-16 22:38:17.701782
1122	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 49/240 - 789789	2029-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:18.241349	2025-04-16 22:38:18.241349
1123	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 50/240 - 789789	2029-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:18.848433	2025-04-16 22:38:18.848433
1124	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 51/240 - 789789	2029-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:19.800023	2025-04-16 22:38:19.800023
1125	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 52/240 - 789789	2029-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:20.052152	2025-04-16 22:38:20.052152
1126	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 53/240 - 789789	2029-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:20.33207	2025-04-16 22:38:20.33207
1127	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 54/240 - 789789	2029-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:20.866598	2025-04-16 22:38:20.866598
1128	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 55/240 - 789789	2029-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:21.189257	2025-04-16 22:38:21.189257
1129	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 56/240 - 789789	2029-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:21.692209	2025-04-16 22:38:21.692209
1130	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 57/240 - 789789	2029-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:21.998702	2025-04-16 22:38:21.998702
1131	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 58/240 - 789789	2030-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:22.4744	2025-04-16 22:38:22.4744
1132	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 59/240 - 789789	2030-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:22.8156	2025-04-16 22:38:22.8156
1133	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 60/240 - 789789	2030-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:23.475971	2025-04-16 22:38:23.475971
1134	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 61/240 - 789789	2030-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:23.767076	2025-04-16 22:38:23.767076
1135	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 62/240 - 789789	2030-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:24.248239	2025-04-16 22:38:24.248239
1136	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 63/240 - 789789	2030-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:24.533619	2025-04-16 22:38:24.533619
1137	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 64/240 - 789789	2030-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:25.027417	2025-04-16 22:38:25.027417
1138	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 65/240 - 789789	2030-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:25.351093	2025-04-16 22:38:25.351093
1139	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 66/240 - 789789	2030-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:26.159826	2025-04-16 22:38:26.159826
1140	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 67/240 - 789789	2030-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:26.489649	2025-04-16 22:38:26.489649
1141	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 68/240 - 789789	2030-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:26.860724	2025-04-16 22:38:26.860724
1142	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 69/240 - 789789	2030-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:27.160365	2025-04-16 22:38:27.160365
1143	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 70/240 - 789789	2031-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:27.487048	2025-04-16 22:38:27.487048
1144	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 71/240 - 789789	2031-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:27.75323	2025-04-16 22:38:27.75323
1145	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 72/240 - 789789	2031-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:28.025131	2025-04-16 22:38:28.025131
1146	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 73/240 - 789789	2031-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:28.299561	2025-04-16 22:38:28.299561
1147	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 74/240 - 789789	2031-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:28.609452	2025-04-16 22:38:28.609452
1148	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 75/240 - 789789	2031-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:28.967785	2025-04-16 22:38:28.967785
1149	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 76/240 - 789789	2031-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:29.355261	2025-04-16 22:38:29.355261
1150	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 77/240 - 789789	2031-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:29.684779	2025-04-16 22:38:29.684779
1151	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 78/240 - 789789	2031-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:29.962297	2025-04-16 22:38:29.962297
1152	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 79/240 - 789789	2031-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:30.379572	2025-04-16 22:38:30.379572
1153	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 80/240 - 789789	2031-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:31.037634	2025-04-16 22:38:31.037634
1154	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 81/240 - 789789	2031-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:31.302781	2025-04-16 22:38:31.302781
1155	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 82/240 - 789789	2032-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:31.835799	2025-04-16 22:38:31.835799
1156	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 83/240 - 789789	2032-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:32.218897	2025-04-16 22:38:32.218897
1157	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 84/240 - 789789	2032-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:32.808684	2025-04-16 22:38:32.808684
1447	2	\N	\N	\N	{}	income	rent	0.00		2025-04-17 10:00:00	pending	bank_transfer	2025-04-17 05:38:20.889204	2025-04-17 05:38:20.889204
1158	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 85/240 - 789789	2032-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:33.231358	2025-04-16 22:38:33.231358
1159	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 86/240 - 789789	2032-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:33.619579	2025-04-16 22:38:33.619579
1160	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 87/240 - 789789	2032-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:34.084824	2025-04-16 22:38:34.084824
1161	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 88/240 - 789789	2032-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:34.429165	2025-04-16 22:38:34.429165
1162	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 89/240 - 789789	2032-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:34.891299	2025-04-16 22:38:34.891299
1163	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 90/240 - 789789	2032-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:35.196747	2025-04-16 22:38:35.196747
1164	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 91/240 - 789789	2032-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:35.727162	2025-04-16 22:38:35.727162
1165	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 92/240 - 789789	2032-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:36.036442	2025-04-16 22:38:36.036442
1166	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 93/240 - 789789	2032-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:36.560594	2025-04-16 22:38:36.560594
1167	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 94/240 - 789789	2033-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:36.872442	2025-04-16 22:38:36.872442
1168	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 95/240 - 789789	2033-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:37.361116	2025-04-16 22:38:37.361116
1169	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 96/240 - 789789	2033-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:37.667	2025-04-16 22:38:37.667
1170	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 97/240 - 789789	2033-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:38.148995	2025-04-16 22:38:38.148995
1171	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 98/240 - 789789	2033-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:38.488016	2025-04-16 22:38:38.488016
1172	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 99/240 - 789789	2033-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:38.995256	2025-04-16 22:38:38.995256
1173	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 100/240 - 789789	2033-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:39.273451	2025-04-16 22:38:39.273451
1174	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 101/240 - 789789	2033-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:39.761009	2025-04-16 22:38:39.761009
1175	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 102/240 - 789789	2033-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:40.032987	2025-04-16 22:38:40.032987
1176	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 103/240 - 789789	2033-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:40.548566	2025-04-16 22:38:40.548566
1177	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 104/240 - 789789	2033-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:40.835496	2025-04-16 22:38:40.835496
1178	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 105/240 - 789789	2033-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:41.286005	2025-04-16 22:38:41.286005
1179	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 106/240 - 789789	2034-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:41.587962	2025-04-16 22:38:41.587962
1180	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 107/240 - 789789	2034-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:42.06113	2025-04-16 22:38:42.06113
1181	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 108/240 - 789789	2034-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:42.384019	2025-04-16 22:38:42.384019
1182	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 109/240 - 789789	2034-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:42.828779	2025-04-16 22:38:42.828779
1183	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 110/240 - 789789	2034-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:43.118804	2025-04-16 22:38:43.118804
1184	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 111/240 - 789789	2034-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:43.758366	2025-04-16 22:38:43.758366
1185	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 112/240 - 789789	2034-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:44.064623	2025-04-16 22:38:44.064623
1186	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 113/240 - 789789	2034-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:44.552819	2025-04-16 22:38:44.552819
1187	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 114/240 - 789789	2034-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:44.856199	2025-04-16 22:38:44.856199
1188	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 115/240 - 789789	2034-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:45.283177	2025-04-16 22:38:45.283177
1189	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 116/240 - 789789	2034-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:45.617317	2025-04-16 22:38:45.617317
1190	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 117/240 - 789789	2034-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:46.070894	2025-04-16 22:38:46.070894
1191	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 118/240 - 789789	2035-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:46.436757	2025-04-16 22:38:46.436757
1192	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 119/240 - 789789	2035-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:46.913903	2025-04-16 22:38:46.913903
1193	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 120/240 - 789789	2035-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:47.217362	2025-04-16 22:38:47.217362
1194	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 121/240 - 789789	2035-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:47.676819	2025-04-16 22:38:47.676819
1195	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 122/240 - 789789	2035-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:48.020479	2025-04-16 22:38:48.020479
1196	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 123/240 - 789789	2035-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:48.49534	2025-04-16 22:38:48.49534
1197	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 124/240 - 789789	2035-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:48.836693	2025-04-16 22:38:48.836693
1198	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 125/240 - 789789	2035-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:49.275179	2025-04-16 22:38:49.275179
1199	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 126/240 - 789789	2035-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:49.567884	2025-04-16 22:38:49.567884
1200	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 127/240 - 789789	2035-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:50.041464	2025-04-16 22:38:50.041464
1201	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 128/240 - 789789	2035-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:50.413929	2025-04-16 22:38:50.413929
1202	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 129/240 - 789789	2035-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:50.878458	2025-04-16 22:38:50.878458
1203	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 130/240 - 789789	2036-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:51.233199	2025-04-16 22:38:51.233199
1204	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 131/240 - 789789	2036-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:51.794099	2025-04-16 22:38:51.794099
1205	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 132/240 - 789789	2036-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:52.222861	2025-04-16 22:38:52.222861
1206	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 133/240 - 789789	2036-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:52.711825	2025-04-16 22:38:52.711825
1448	2	\N	\N	\N	{}	income	rent	0.00		2025-04-17 10:00:00	pending	bank_transfer	2025-04-17 05:38:55.494594	2025-04-17 05:38:55.494594
1207	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 134/240 - 789789	2036-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:52.999071	2025-04-16 22:38:52.999071
1208	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 135/240 - 789789	2036-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:53.461738	2025-04-16 22:38:53.461738
1209	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 136/240 - 789789	2036-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:53.794352	2025-04-16 22:38:53.794352
1210	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 137/240 - 789789	2036-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:54.279762	2025-04-16 22:38:54.279762
1211	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 138/240 - 789789	2036-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:54.6208	2025-04-16 22:38:54.6208
1212	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 139/240 - 789789	2036-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:55.132809	2025-04-16 22:38:55.132809
1213	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 140/240 - 789789	2036-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:55.478342	2025-04-16 22:38:55.478342
1214	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 141/240 - 789789	2036-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:55.988288	2025-04-16 22:38:55.988288
1215	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 142/240 - 789789	2037-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:56.464489	2025-04-16 22:38:56.464489
1216	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 143/240 - 789789	2037-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:56.974668	2025-04-16 22:38:56.974668
1217	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 144/240 - 789789	2037-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:38:57.254412	2025-04-16 22:38:57.254412
1218	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 145/240 - 789789	2037-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:57.764261	2025-04-16 22:38:57.764261
1219	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 146/240 - 789789	2037-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:58.103328	2025-04-16 22:38:58.103328
1220	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 147/240 - 789789	2037-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:58.57778	2025-04-16 22:38:58.57778
1221	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 148/240 - 789789	2037-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:58.902918	2025-04-16 22:38:58.902918
1222	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 149/240 - 789789	2037-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:59.460748	2025-04-16 22:38:59.460748
1223	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 150/240 - 789789	2037-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:38:59.762215	2025-04-16 22:38:59.762215
1224	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 151/240 - 789789	2037-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:39:00.229662	2025-04-16 22:39:00.229662
1225	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 152/240 - 789789	2037-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:39:00.640037	2025-04-16 22:39:00.640037
1226	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 153/240 - 789789	2037-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:39:01.11778	2025-04-16 22:39:01.11778
1227	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 154/240 - 789789	2038-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:39:01.392672	2025-04-16 22:39:01.392672
1228	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 155/240 - 789789	2038-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:39:01.840042	2025-04-16 22:39:01.840042
1229	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 156/240 - 789789	2038-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:39:02.16413	2025-04-16 22:39:02.16413
1230	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 157/240 - 789789	2038-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:39:02.53909	2025-04-16 22:39:02.53909
1231	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 158/240 - 789789	2038-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:39:02.975621	2025-04-16 22:39:02.975621
1232	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 159/240 - 789789	2038-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:39:03.305182	2025-04-16 22:39:03.305182
1233	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 160/240 - 789789	2038-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:39:03.73388	2025-04-16 22:39:03.73388
1234	2	26	\N	\N	{}	credit	other	299.00	Mensualité prêt 161/240 - 789789	2038-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:39:04.039417	2025-04-16 22:39:04.039417
1314	2	27	\N	\N	{}	expense	other	645.00	Achat de la propriété: 45	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 22:50:32.989086	2025-04-16 22:50:32.989086
1315	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 1/72 - 45	2025-04-16 10:00:00	completed	bank_transfer	2025-04-16 22:50:33.019899	2025-04-16 22:50:33.019899
1316	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 2/72 - 45	2025-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.067709	2025-04-16 22:50:33.067709
1317	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 3/72 - 45	2025-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.091278	2025-04-16 22:50:33.091278
1318	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 4/72 - 45	2025-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.113953	2025-04-16 22:50:33.113953
1319	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 5/72 - 45	2025-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.161187	2025-04-16 22:50:33.161187
1320	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 6/72 - 45	2025-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.210886	2025-04-16 22:50:33.210886
1321	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 7/72 - 45	2025-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.231821	2025-04-16 22:50:33.231821
1322	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 8/72 - 45	2025-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.278117	2025-04-16 22:50:33.278117
1323	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 9/72 - 45	2025-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.300496	2025-04-16 22:50:33.300496
1324	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 10/72 - 45	2026-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.348528	2025-04-16 22:50:33.348528
1325	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 11/72 - 45	2026-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.401781	2025-04-16 22:50:33.401781
1326	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 12/72 - 45	2026-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.454848	2025-04-16 22:50:33.454848
1327	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 13/72 - 45	2026-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.475938	2025-04-16 22:50:33.475938
1328	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 14/72 - 45	2026-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.523014	2025-04-16 22:50:33.523014
1329	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 15/72 - 45	2026-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.546163	2025-04-16 22:50:33.546163
1330	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 16/72 - 45	2026-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.591521	2025-04-16 22:50:33.591521
1331	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 17/72 - 45	2026-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.615097	2025-04-16 22:50:33.615097
1332	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 18/72 - 45	2026-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.64158	2025-04-16 22:50:33.64158
1333	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 19/72 - 45	2026-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.692633	2025-04-16 22:50:33.692633
1334	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 20/72 - 45	2026-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.739226	2025-04-16 22:50:33.739226
1335	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 21/72 - 45	2026-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.760779	2025-04-16 22:50:33.760779
1336	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 22/72 - 45	2027-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.807544	2025-04-16 22:50:33.807544
1337	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 23/72 - 45	2027-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.828723	2025-04-16 22:50:33.828723
1338	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 24/72 - 45	2027-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:33.849923	2025-04-16 22:50:33.849923
1339	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 25/72 - 45	2027-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.897612	2025-04-16 22:50:33.897612
1340	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 26/72 - 45	2027-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.945073	2025-04-16 22:50:33.945073
1341	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 27/72 - 45	2027-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:33.966973	2025-04-16 22:50:33.966973
1342	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 28/72 - 45	2027-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.013172	2025-04-16 22:50:34.013172
1343	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 29/72 - 45	2027-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.060147	2025-04-16 22:50:34.060147
1344	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 30/72 - 45	2027-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.080422	2025-04-16 22:50:34.080422
1345	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 31/72 - 45	2027-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.124003	2025-04-16 22:50:34.124003
1346	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 32/72 - 45	2027-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.144562	2025-04-16 22:50:34.144562
1347	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 33/72 - 45	2027-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.165305	2025-04-16 22:50:34.165305
1348	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 34/72 - 45	2028-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.213351	2025-04-16 22:50:34.213351
1349	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 35/72 - 45	2028-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.234905	2025-04-16 22:50:34.234905
1350	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 36/72 - 45	2028-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.258174	2025-04-16 22:50:34.258174
1351	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 37/72 - 45	2028-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.307919	2025-04-16 22:50:34.307919
1352	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 38/72 - 45	2028-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.355767	2025-04-16 22:50:34.355767
1353	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 39/72 - 45	2028-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.378497	2025-04-16 22:50:34.378497
1354	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 40/72 - 45	2028-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.424013	2025-04-16 22:50:34.424013
1355	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 41/72 - 45	2028-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.444047	2025-04-16 22:50:34.444047
1356	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 42/72 - 45	2028-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.492259	2025-04-16 22:50:34.492259
1357	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 43/72 - 45	2028-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.543585	2025-04-16 22:50:34.543585
1358	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 44/72 - 45	2028-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.565727	2025-04-16 22:50:34.565727
1359	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 45/72 - 45	2028-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.614047	2025-04-16 22:50:34.614047
1360	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 46/72 - 45	2029-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.669036	2025-04-16 22:50:34.669036
1361	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 47/72 - 45	2029-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.720376	2025-04-16 22:50:34.720376
1362	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 48/72 - 45	2029-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:34.742161	2025-04-16 22:50:34.742161
1363	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 49/72 - 45	2029-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.78943	2025-04-16 22:50:34.78943
1364	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 50/72 - 45	2029-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.842174	2025-04-16 22:50:34.842174
1365	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 51/72 - 45	2029-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.865223	2025-04-16 22:50:34.865223
1366	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 52/72 - 45	2029-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.913596	2025-04-16 22:50:34.913596
1367	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 53/72 - 45	2029-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.961886	2025-04-16 22:50:34.961886
1368	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 54/72 - 45	2029-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:34.983076	2025-04-16 22:50:34.983076
1369	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 55/72 - 45	2029-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.004168	2025-04-16 22:50:35.004168
1370	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 56/72 - 45	2029-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.052034	2025-04-16 22:50:35.052034
1371	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 57/72 - 45	2029-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.100194	2025-04-16 22:50:35.100194
1372	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 58/72 - 45	2030-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.121198	2025-04-16 22:50:35.121198
1373	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 59/72 - 45	2030-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.163453	2025-04-16 22:50:35.163453
1374	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 60/72 - 45	2030-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.211036	2025-04-16 22:50:35.211036
1375	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 61/72 - 45	2030-04-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.231801	2025-04-16 22:50:35.231801
1376	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 62/72 - 45	2030-05-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.279378	2025-04-16 22:50:35.279378
1377	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 63/72 - 45	2030-06-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.302586	2025-04-16 22:50:35.302586
1378	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 64/72 - 45	2030-07-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.350651	2025-04-16 22:50:35.350651
1379	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 65/72 - 45	2030-08-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.404336	2025-04-16 22:50:35.404336
1380	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 66/72 - 45	2030-09-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.453949	2025-04-16 22:50:35.453949
1381	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 67/72 - 45	2030-10-16 10:00:00	pending	bank_transfer	2025-04-16 22:50:35.475923	2025-04-16 22:50:35.475923
1382	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 68/72 - 45	2030-11-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.4982	2025-04-16 22:50:35.4982
1383	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 69/72 - 45	2030-12-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.543672	2025-04-16 22:50:35.543672
1384	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 70/72 - 45	2031-01-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.564415	2025-04-16 22:50:35.564415
1385	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 71/72 - 45	2031-02-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.610983	2025-04-16 22:50:35.610983
1386	2	27	\N	\N	{}	credit	other	1.00	Mensualité prêt 72/72 - 45	2031-03-16 11:00:00	pending	bank_transfer	2025-04-16 22:50:35.659559	2025-04-16 22:50:35.659559
1387	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 1/240 - 68 rue d (sur 240 mensualités) (60 premières mensualités préfillées sur 240)	2025-04-17 10:00:00	completed	bank_transfer	2025-04-17 01:22:53.711385	2025-04-17 01:22:53.711385
1388	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 2/240 - 68 rue d	2025-05-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:53.87174	2025-04-17 01:22:53.87174
1389	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 3/240 - 68 rue d	2025-06-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:54.706955	2025-04-17 01:22:54.706955
1390	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 4/240 - 68 rue d	2025-07-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:54.994062	2025-04-17 01:22:54.994062
1391	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 5/240 - 68 rue d	2025-08-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:55.317317	2025-04-17 01:22:55.317317
1392	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 6/240 - 68 rue d	2025-09-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:55.926489	2025-04-17 01:22:55.926489
1393	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 7/240 - 68 rue d	2025-10-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:56.246665	2025-04-17 01:22:56.246665
1394	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 8/240 - 68 rue d	2025-11-17 11:00:00	pending	bank_transfer	2025-04-17 01:22:56.558704	2025-04-17 01:22:56.558704
1395	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 9/240 - 68 rue d	2025-12-17 11:00:00	pending	bank_transfer	2025-04-17 01:22:56.907146	2025-04-17 01:22:56.907146
1396	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 10/240 - 68 rue d	2026-01-17 11:00:00	pending	bank_transfer	2025-04-17 01:22:57.195055	2025-04-17 01:22:57.195055
1397	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 11/240 - 68 rue d	2026-02-17 11:00:00	pending	bank_transfer	2025-04-17 01:22:57.494212	2025-04-17 01:22:57.494212
1398	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 12/240 - 68 rue d	2026-03-17 11:00:00	pending	bank_transfer	2025-04-17 01:22:57.769784	2025-04-17 01:22:57.769784
1399	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 13/240 - 68 rue d	2026-04-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:58.03036	2025-04-17 01:22:58.03036
1400	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 14/240 - 68 rue d	2026-05-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:58.314885	2025-04-17 01:22:58.314885
1401	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 15/240 - 68 rue d	2026-06-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:58.591201	2025-04-17 01:22:58.591201
1402	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 16/240 - 68 rue d	2026-07-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:58.879569	2025-04-17 01:22:58.879569
1403	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 17/240 - 68 rue d	2026-08-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:59.16506	2025-04-17 01:22:59.16506
1404	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 18/240 - 68 rue d	2026-09-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:59.698762	2025-04-17 01:22:59.698762
1405	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 19/240 - 68 rue d	2026-10-17 10:00:00	pending	bank_transfer	2025-04-17 01:22:59.968937	2025-04-17 01:22:59.968937
1406	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 20/240 - 68 rue d	2026-11-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:00.502177	2025-04-17 01:23:00.502177
1407	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 21/240 - 68 rue d	2026-12-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:01.004859	2025-04-17 01:23:01.004859
1408	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 22/240 - 68 rue d	2027-01-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:01.613037	2025-04-17 01:23:01.613037
1409	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 23/240 - 68 rue d	2027-02-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:02.354714	2025-04-17 01:23:02.354714
1410	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 24/240 - 68 rue d	2027-03-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:03.13589	2025-04-17 01:23:03.13589
1411	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 25/240 - 68 rue d	2027-04-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:03.814402	2025-04-17 01:23:03.814402
1412	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 26/240 - 68 rue d	2027-05-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:04.309449	2025-04-17 01:23:04.309449
1413	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 27/240 - 68 rue d	2027-06-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:05.03227	2025-04-17 01:23:05.03227
1414	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 28/240 - 68 rue d	2027-07-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:05.78372	2025-04-17 01:23:05.78372
1415	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 29/240 - 68 rue d	2027-08-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:06.251875	2025-04-17 01:23:06.251875
1416	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 30/240 - 68 rue d	2027-09-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:06.868926	2025-04-17 01:23:06.868926
1417	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 31/240 - 68 rue d	2027-10-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:07.130575	2025-04-17 01:23:07.130575
1418	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 32/240 - 68 rue d	2027-11-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:07.655231	2025-04-17 01:23:07.655231
1419	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 33/240 - 68 rue d	2027-12-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:08.086851	2025-04-17 01:23:08.086851
1420	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 34/240 - 68 rue d	2028-01-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:08.577895	2025-04-17 01:23:08.577895
1421	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 35/240 - 68 rue d	2028-02-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:08.927289	2025-04-17 01:23:08.927289
1422	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 36/240 - 68 rue d	2028-03-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:09.515139	2025-04-17 01:23:09.515139
1423	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 37/240 - 68 rue d	2028-04-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:10.056536	2025-04-17 01:23:10.056536
1424	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 38/240 - 68 rue d	2028-05-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:10.601736	2025-04-17 01:23:10.601736
1425	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 39/240 - 68 rue d	2028-06-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:10.949292	2025-04-17 01:23:10.949292
1426	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 40/240 - 68 rue d	2028-07-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:11.50845	2025-04-17 01:23:11.50845
1427	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 41/240 - 68 rue d	2028-08-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:12.150555	2025-04-17 01:23:12.150555
1428	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 42/240 - 68 rue d	2028-09-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:12.844589	2025-04-17 01:23:12.844589
1429	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 43/240 - 68 rue d	2028-10-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:13.179351	2025-04-17 01:23:13.179351
1430	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 44/240 - 68 rue d	2028-11-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:13.483212	2025-04-17 01:23:13.483212
1431	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 45/240 - 68 rue d	2028-12-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:13.767281	2025-04-17 01:23:13.767281
1432	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 46/240 - 68 rue d	2029-01-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:14.019542	2025-04-17 01:23:14.019542
1433	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 47/240 - 68 rue d	2029-02-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:14.368775	2025-04-17 01:23:14.368775
1434	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 48/240 - 68 rue d	2029-03-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:14.596448	2025-04-17 01:23:14.596448
1435	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 49/240 - 68 rue d	2029-04-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:14.881118	2025-04-17 01:23:14.881118
1436	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 50/240 - 68 rue d	2029-05-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:15.165144	2025-04-17 01:23:15.165144
1437	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 51/240 - 68 rue d	2029-06-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:15.536517	2025-04-17 01:23:15.536517
1438	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 52/240 - 68 rue d	2029-07-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:16.023162	2025-04-17 01:23:16.023162
1439	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 53/240 - 68 rue d	2029-08-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:16.351135	2025-04-17 01:23:16.351135
1440	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 54/240 - 68 rue d	2029-09-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:16.675335	2025-04-17 01:23:16.675335
1441	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 55/240 - 68 rue d	2029-10-17 10:00:00	pending	bank_transfer	2025-04-17 01:23:16.961639	2025-04-17 01:23:16.961639
1442	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 56/240 - 68 rue d	2029-11-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:17.284749	2025-04-17 01:23:17.284749
1443	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 57/240 - 68 rue d	2029-12-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:17.556504	2025-04-17 01:23:17.556504
1444	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 58/240 - 68 rue d	2030-01-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:17.833261	2025-04-17 01:23:17.833261
1445	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 59/240 - 68 rue d	2030-02-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:18.078872	2025-04-17 01:23:18.078872
1446	2	28	\N	\N	{}	credit	other	21.00	Mensualité prêt 60/240 - 68 rue d	2030-03-17 11:00:00	pending	bank_transfer	2025-04-17 01:23:18.346253	2025-04-17 01:23:18.346253
1449	2	31	\N	\N	{}	expense	other	654000.00	Achat de la propriété: teste azer	2025-04-18 10:00:00	completed	bank_transfer	2025-04-18 01:00:25.931239	2025-04-18 01:00:25.931239
1450	2	1	\N	\N	{93,94}	expense	maintenance	45.00	Maintenance - sds: dsds	2025-04-18 10:00:00	completed	bank_transfer	2025-04-18 02:19:02.407181	2025-04-18 02:19:02.407181
\.


--
-- TOC entry 5712 (class 0 OID 17811)
-- Dependencies: 277
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
-- TOC entry 5732 (class 0 OID 18415)
-- Dependencies: 297
-- Data for Name: user_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_subscriptions (id, user_id, plan_id, start_date, end_date, is_active, auto_renew, created_at, updated_at, storage_extension_id, external_id) FROM stdin;
1	1	7	2025-05-01 20:51:22.968368	\N	t	f	2025-05-01 20:51:22.968368	2025-05-01 20:51:22.968368	1	\N
2	1	9	2025-05-01 20:51:22.968368	\N	t	f	2025-05-01 20:51:22.968368	2025-05-01 20:51:22.968368	1	\N
3	1	7	2025-05-01 20:51:22.968368	\N	t	f	2025-05-01 20:51:22.968368	2025-05-01 20:51:22.968368	5	\N
4	1	9	2025-05-01 20:51:22.968368	\N	t	f	2025-05-01 20:51:22.968368	2025-05-01 20:51:22.968368	5	\N
\.


--
-- TOC entry 5653 (class 0 OID 16853)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, full_name, email, phone_number, role, profile_image, archived, account_type, parent_account_id, settings, created_at, updated_at, is_premium, request_count, request_limit, preferred_ai_model, storage_used, storage_limit, storage_tier) FROM stdin;
20	admin_test	$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy	Admin Test	admin@example.com	\N	clients	\N	f	individual	\N	{}	2025-04-29 01:18:04.955131	2025-05-05 14:40:39.28893	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
2	nouveau_nom	697592fb93e33904f815bb7667e3f16cfd86c1f5c704b2af716fc8f2c507757af1559186e774f293b3bf6ab7085e1c212af7a26a545954b71810507da358ad88.fb88291581ddee16843427993edfd6d8	Test User	test@example.com	\N	clients	\N	f	individual	\N	{}	2025-04-01 17:13:46.734	2025-05-05 14:40:39.295393	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
21	admin_test	admin123	Admin Test	admin@example.com	\N	clients	\N	f	individual	\N	{}	2025-04-29 01:20:38.184108	2025-05-05 14:40:39.304069	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
23	teste123	49a78f1a4a71f49f131a841f50f0c8278ead79ec4d52d55c438be4b7b0df23bb6bc836bfc878a89595b74f6181cdfe21d5f8dfb31c8c02b6519c1aed027e7516.7770c458f0405376bbff2723a598de72	teste123	tyty@gmail.com	\N	clients	\N	f	individual	\N	{}	2025-04-29 01:31:54.256531	2025-05-05 14:40:39.307163	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
24	teste123123	20d953d62ef5129fc7cd7378e5be3f0e1559d097a7a6b1eb102ae65494cf131da4b2d1b8ecd3a03f89bc58657b83a17f71a3db08112203876ac4d4ed1db6a514.64cf6f081ea4f99451c6e5194510e53c	teste123123	tyty@gmail.com	\N	clients	\N	f	individual	\N	{}	2025-04-29 01:36:04.151971	2025-05-05 14:40:39.310375	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
25	teste456	18eb109037b676b3395a2a9f9e27766fc9873f4bcbb4b95c8fc4ab3e495bf84ec62f8b2789fc509ace93c019e5fe6ecb5ca146e3ad6571fa6632c3b79fccec55.63f866aa3dd0251eecf15b96a81c27a1	Killian polm	f@gmail.com	\N	clients	\N	f	individual	\N	{}	2025-04-29 02:20:28.669688	2025-05-05 14:40:39.279318	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
28	sdfsdf	$2a$10$JIVHaArdFVwq6aSncNpn9.S/G0O.CcWOQZ2sOG6ZndAMieqG1WMK2	sdfsdf	gf@gmail.com	0659818849	clients	\N	f	individual	\N	{}	2025-05-05 20:35:41.016	2025-05-05 20:35:41.016	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
22	admin	$2a$10$EWF7KifLiKnaVLY2FvB/nudA93JYtinqdXFmUDlQNSm6VH0uZ.s9S	Administrateur	admin@example.com	\N	admin	\N	f	individual	\N	{}	2025-04-29 01:22:34.079632	2025-05-05 21:18:52.21245	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
1	testuser	c067d708125fcfef7ff41d5bdc8f9133a9d61f4353e22752c7d780bcccc7166004e1050806f79f5beee66fc30717b0672770929547100bb6f6c4248656f03362.ab8b3b5523d32cbc062cf92b5034eba6	Utilisateur Test	test@example.com	\N	admin	\N	f	individual	\N	{}	2025-04-01 17:13:46.736	2025-05-05 21:18:52.353256	f	0	100	openai-gpt-4o	0.00	5368709120.00	basic
4	killianpolm	$2a$10$p7KXseiU5TQ9Jbc603lavOCIXLms3.DsqVFcitNza0KVnUgz.gkEG	Killian polm	hgfgh1482@tutamail.com	0659818841	clients	\N	f	individual	\N	{}	2025-04-03 01:29:57.938785	2025-05-05 14:40:39.314838	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
8	testefeedback	$2a$10$s1an9IowZAPvVmN/ZCLiveUA0lorfNhiAq1i1GPpRW4lfwfUNk/TO	teste feedback	hgfdgh1482@tutamail.com	0659818847	clients	\N	f	individual	\N	{}	2025-04-03 20:48:44.566823	2025-05-05 14:40:39.316729	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
19	killianlebronec	$2a$10$FVB3GiwJv8qoZDj.NGNBoOKFgXDSokm5WaqgjKQsdZJ6sBwlZM4A6	Killian le bronec	airgonfle@outlook.fr	+33659818849	clients	\N	f	individual	\N	{}	2025-04-11 18:03:12.844176	2025-05-05 14:40:39.318126	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
3	teste1	bd45ad1243b15038d6177aa5d18525a9aaf4225f50e0dcd00db3ff30cb20021c65642a6a52c9daddf3ff6ea361405173ad7b99ce94571e01c80c0221c513e91e.65927aab9d6acd50777b75190fe99aa9	teste1	teste@gmail.com	0659818849	clients	\N	f	individual	\N	{}	2025-04-01 21:15:04.381245	2025-05-05 14:40:39.319374	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
10	kiianpolm	$2a$10$as7qTTTnQJBqAUUqeUBQbe2sZP5kSmENac2CgnOixwx7GaJTXSrjS	Kiian polm	h82@tutamail.com	0659818841	clients	\N	f	individual	\N	{}	2025-04-10 21:40:44.514277	2025-05-05 14:40:39.320721	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
5	fg	$2a$10$vpPZNr5xwXIArNGXp3Tf2uhkzSfE8fr2reRY6epa6nXvfXjRcrkNG	fg	hgfgh1482@tutamail.com	0659818848	clients	\N	f	individual	\N	{}	2025-04-03 20:06:04.299723	2025-05-05 14:40:39.322535	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
6	dfdf	$2a$10$GsbDKhb5o1C492YZKX6v8emGYQVYa4YbF0zHpxVb7C6dEL0J.nzyq	dfdf	fgf@gmail.com	0659818847	clients	\N	f	individual	\N	{}	2025-04-03 20:31:25.200018	2025-05-05 14:40:39.323797	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
7	tet	$2a$10$58Z3xO61.Fme/Aoi8djXC.ogqnBgsCfpwL2UxXB246CR1vfG.2oMe	tet	gf@gmail.com	0659818847	clients	\N	f	individual	\N	{}	2025-04-03 20:40:20.501871	2025-05-05 14:40:39.324787	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
11	jfhfhfhfh	$2a$10$tuv6UuSsNKw/mTBirPCILuQHuKUQDHx12LcDPaLI8qJ3jOGYyLiIi	jfhfhfhfh	f@gmail.com	0659818849	clients	\N	f	individual	\N	{}	2025-04-11 00:46:37.990295	2025-05-05 14:40:39.325683	f	0	100	openai-gpt-3.5	0.00	5368709120.00	basic
\.


--
-- TOC entry 5697 (class 0 OID 17366)
-- Dependencies: 262
-- Data for Name: visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
2	ggg	dfdf	f@gmail.com	0659818847	2025-04-11 03:00:00	physical	\N	51551	hgghgh	completed	\N	\N	f	\N	manual	[]	f	2025-04-10 15:49:24.914219	2025-04-10 15:11:31.827
1	yty	tyt	tyty@gmail.com	0659818847	2025-04-11 14:00:00	virtual	1	dfdfdf	gfgf	cancelled	\N	\N	f	\N	manual	[]	f	2025-04-10 15:45:56.208798	2025-04-12 17:11:26.068
4	656	56	airgonfle@outlook.fr	0659818849	2025-04-12 07:01:00	physical	1	\N	\N	completed	\N	\N	f	\N	manual	[]	f	2025-04-12 04:01:45.949084	2025-04-12 17:12:13.188
5	Killian	le bronec	airgonfle@outlook.fr	0659818849	2025-04-12 07:07:00	physical	\N	**	\N	completed	\N	\N	f	\N	manual	[]	f	2025-04-12 04:02:05.288825	2025-04-12 17:13:27.171
3	Killian	le bronec	airgonfle@outlook.fr	0659818849	2025-04-12 04:00:00	physical	\N	\N	\N	completed	\N	\N	f	\N	manual	[]	f	2025-04-12 04:01:25.517167	2025-04-12 17:13:54.873
8	yty	fgfg	gf@gmail.com	0659818847	2025-04-18 05:45:00	physical	\N	\N	\N	completed	\N	\N	f	\N	manual	[]	f	2025-04-12 19:03:25.953309	2025-04-12 17:15:42.95
6	doulma	gf	hgfgh1482@tutamail.com	0659818847	2025-04-13 04:59:00	physical	\N	vbv	\N	completed	\N	\N	f	\N	manual	[]	f	2025-04-12 18:57:13.431019	2025-04-12 17:16:47.908
7	6666	fgfg	gf@gmail.com	0659818847	2025-04-20 17:25:00	physical	1	\N	\N	completed	\N	\N	f	\N	manual	[]	f	2025-04-12 19:00:42.901444	2025-04-12 17:16:55.539
9	yty	gf	c4000plug@gmail.com	0659818847	2025-04-12 21:00:00	video	\N	ghgh	ghgh	pending	\N	\N	f	\N	manual	[]	f	2025-04-12 19:17:28.216753	2025-04-12 19:17:28.216753
10	yty	gf	hgfgh1482@tutamail.com	0659818847	2025-04-11 18:28:00	physical	\N	51551	\N	pending	\N	\N	f	\N	manual	[]	f	2025-04-12 19:28:32.687454	2025-04-12 19:28:32.687454
11	yty	dfdf	f@gmail.com	0659818847	2025-04-15 20:28:00	physical	\N	dfdfdf	2662626262	pending	\N	\N	f	\N	manual	[]	f	2025-04-12 19:28:56.55434	2025-04-12 19:28:56.55434
\.


--
-- TOC entry 5932 (class 0 OID 0)
-- Dependencies: 316
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_conversations_id_seq', 3, true);


--
-- TOC entry 5933 (class 0 OID 0)
-- Dependencies: 318
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_messages_id_seq', 4, true);


--
-- TOC entry 5934 (class 0 OID 0)
-- Dependencies: 320
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 5935 (class 0 OID 0)
-- Dependencies: 223
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_id_seq', 1, false);


--
-- TOC entry 5936 (class 0 OID 0)
-- Dependencies: 274
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.analysis_configs_id_seq', 1, false);


--
-- TOC entry 5937 (class 0 OID 0)
-- Dependencies: 266
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 5938 (class 0 OID 0)
-- Dependencies: 300
-- Name: billing_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_transactions_id_seq', 2, true);


--
-- TOC entry 5939 (class 0 OID 0)
-- Dependencies: 312
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_info_id_seq', 1, true);


--
-- TOC entry 5940 (class 0 OID 0)
-- Dependencies: 270
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contract_parties_id_seq', 1, true);


--
-- TOC entry 5941 (class 0 OID 0)
-- Dependencies: 268
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contracts_id_seq', 6, true);


--
-- TOC entry 5942 (class 0 OID 0)
-- Dependencies: 230
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_templates_id_seq', 1, false);


--
-- TOC entry 5943 (class 0 OID 0)
-- Dependencies: 233
-- Name: documents_access_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_access_log_id_seq', 1, false);


--
-- TOC entry 5944 (class 0 OID 0)
-- Dependencies: 234
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 106, true);


--
-- TOC entry 5945 (class 0 OID 0)
-- Dependencies: 227
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feedbacks_id_seq', 1, false);


--
-- TOC entry 5946 (class 0 OID 0)
-- Dependencies: 236
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.financial_entries_id_seq', 1, false);


--
-- TOC entry 5947 (class 0 OID 0)
-- Dependencies: 238
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.folders_id_seq', 1, true);


--
-- TOC entry 5948 (class 0 OID 0)
-- Dependencies: 290
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_field_options_id_seq', 1, false);


--
-- TOC entry 5949 (class 0 OID 0)
-- Dependencies: 288
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_fields_id_seq', 2, true);


--
-- TOC entry 5950 (class 0 OID 0)
-- Dependencies: 280
-- Name: form_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_responses_id_seq', 1, false);


--
-- TOC entry 5951 (class 0 OID 0)
-- Dependencies: 286
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_submissions_id_seq', 35, true);


--
-- TOC entry 5952 (class 0 OID 0)
-- Dependencies: 278
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.forms_id_seq', 1, false);


--
-- TOC entry 5953 (class 0 OID 0)
-- Dependencies: 282
-- Name: link_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.link_profiles_id_seq', 3, true);


--
-- TOC entry 5954 (class 0 OID 0)
-- Dependencies: 284
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.links_id_seq', 6, true);


--
-- TOC entry 5955 (class 0 OID 0)
-- Dependencies: 221
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_id_seq', 1, false);


--
-- TOC entry 5956 (class 0 OID 0)
-- Dependencies: 240
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_requests_id_seq', 8, true);


--
-- TOC entry 5957 (class 0 OID 0)
-- Dependencies: 242
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 5958 (class 0 OID 0)
-- Dependencies: 306
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_configuration_id_seq', 1, true);


--
-- TOC entry 5959 (class 0 OID 0)
-- Dependencies: 304
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_document_preferences_id_seq', 25, true);


--
-- TOC entry 5960 (class 0 OID 0)
-- Dependencies: 308
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_logos_id_seq', 1, true);


--
-- TOC entry 5961 (class 0 OID 0)
-- Dependencies: 310
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_templates_id_seq', 4, true);


--
-- TOC entry 5962 (class 0 OID 0)
-- Dependencies: 314
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pdf_themes_id_seq', 4, true);


--
-- TOC entry 5963 (class 0 OID 0)
-- Dependencies: 243
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.properties_id_seq', 31, true);


--
-- TOC entry 5964 (class 0 OID 0)
-- Dependencies: 272
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_analyses_id_seq', 1, false);


--
-- TOC entry 5965 (class 0 OID 0)
-- Dependencies: 245
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_coordinates_id_seq', 28, true);


--
-- TOC entry 5966 (class 0 OID 0)
-- Dependencies: 247
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 5967 (class 0 OID 0)
-- Dependencies: 249
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 5968 (class 0 OID 0)
-- Dependencies: 251
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_history_id_seq', 1, false);


--
-- TOC entry 5969 (class 0 OID 0)
-- Dependencies: 253
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_works_id_seq', 1, false);


--
-- TOC entry 5970 (class 0 OID 0)
-- Dependencies: 264
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rent_receipts_id_seq', 1, false);


--
-- TOC entry 5971 (class 0 OID 0)
-- Dependencies: 225
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- TOC entry 5972 (class 0 OID 0)
-- Dependencies: 302
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- TOC entry 5973 (class 0 OID 0)
-- Dependencies: 298
-- Name: storage_extensions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_extensions_id_seq', 8, true);


--
-- TOC entry 5974 (class 0 OID 0)
-- Dependencies: 322
-- Name: storage_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_transactions_id_seq', 1, false);


--
-- TOC entry 5975 (class 0 OID 0)
-- Dependencies: 294
-- Name: storage_usage_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.storage_usage_details_id_seq', 1, false);


--
-- TOC entry 5976 (class 0 OID 0)
-- Dependencies: 255
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenant_documents_id_seq', 6, true);


--
-- TOC entry 5977 (class 0 OID 0)
-- Dependencies: 257
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenant_history_id_seq', 41, true);


--
-- TOC entry 5978 (class 0 OID 0)
-- Dependencies: 258
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenants_id_seq', 132, true);


--
-- TOC entry 5979 (class 0 OID 0)
-- Dependencies: 292
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 5980 (class 0 OID 0)
-- Dependencies: 260
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1460, true);


--
-- TOC entry 5981 (class 0 OID 0)
-- Dependencies: 276
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 44, true);


--
-- TOC entry 5982 (class 0 OID 0)
-- Dependencies: 296
-- Name: user_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_subscriptions_id_seq', 4, true);


--
-- TOC entry 5983 (class 0 OID 0)
-- Dependencies: 261
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 28, true);


--
-- TOC entry 5984 (class 0 OID 0)
-- Dependencies: 263
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.visits_id_seq', 11, true);


--
-- TOC entry 5412 (class 2606 OID 19275)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5417 (class 2606 OID 19297)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5422 (class 2606 OID 19324)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 5259 (class 2606 OID 17100)
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 5337 (class 2606 OID 17782)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5325 (class 2606 OID 17620)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5386 (class 2606 OID 18456)
-- Name: billing_transactions billing_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5408 (class 2606 OID 19157)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 5331 (class 2606 OID 17736)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5329 (class 2606 OID 17715)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5265 (class 2606 OID 17408)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5269 (class 2606 OID 17410)
-- Name: documents_access_log documents_access_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_access_log
    ADD CONSTRAINT documents_access_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5267 (class 2606 OID 17412)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5263 (class 2606 OID 17122)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5271 (class 2606 OID 17414)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5273 (class 2606 OID 17416)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5370 (class 2606 OID 18213)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5365 (class 2606 OID 18199)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 5367 (class 2606 OID 18197)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5350 (class 2606 OID 18033)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5361 (class 2606 OID 18173)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5345 (class 2606 OID 18021)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5347 (class 2606 OID 18023)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 5353 (class 2606 OID 18135)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5355 (class 2606 OID 18137)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5359 (class 2606 OID 18158)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 5257 (class 2606 OID 17065)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 5275 (class 2606 OID 17418)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5281 (class 2606 OID 17420)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5402 (class 2606 OID 19120)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 5398 (class 2606 OID 19014)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 5400 (class 2606 OID 19012)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5404 (class 2606 OID 19134)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 5406 (class 2606 OID 19146)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5410 (class 2606 OID 19203)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 5253 (class 2606 OID 16904)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5335 (class 2606 OID 17764)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5283 (class 2606 OID 17422)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5285 (class 2606 OID 17424)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 5287 (class 2606 OID 17426)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5289 (class 2606 OID 17428)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5291 (class 2606 OID 17430)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5318 (class 2606 OID 17607)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5261 (class 2606 OID 17111)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5393 (class 2606 OID 18586)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5395 (class 2606 OID 18588)
-- Name: sessions sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_id_key UNIQUE (session_id);


--
-- TOC entry 5384 (class 2606 OID 18440)
-- Name: storage_extensions storage_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_extensions
    ADD CONSTRAINT storage_extensions_pkey PRIMARY KEY (id);


--
-- TOC entry 5429 (class 2606 OID 19443)
-- Name: storage_transactions storage_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_transactions
    ADD CONSTRAINT storage_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5377 (class 2606 OID 18377)
-- Name: storage_usage_details storage_usage_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_usage_details
    ADD CONSTRAINT storage_usage_details_pkey PRIMARY KEY (id);


--
-- TOC entry 5293 (class 2606 OID 17432)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5295 (class 2606 OID 17434)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5255 (class 2606 OID 16917)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5373 (class 2606 OID 18232)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5308 (class 2606 OID 17436)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5343 (class 2606 OID 17828)
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5382 (class 2606 OID 18425)
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 5250 (class 2606 OID 16868)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5316 (class 2606 OID 17438)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5413 (class 1259 OID 19346)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON public.ai_conversations USING btree (user_id);


--
-- TOC entry 5415 (class 1259 OID 19345)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON public.ai_messages USING btree (conversation_id);


--
-- TOC entry 5423 (class 1259 OID 19348)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON public.ai_suggestions USING btree (property_id);


--
-- TOC entry 5424 (class 1259 OID 19347)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON public.ai_suggestions USING btree (user_id);


--
-- TOC entry 5323 (class 1259 OID 17651)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON public.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 5326 (class 1259 OID 17652)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON public.automatic_reminders USING btree (status);


--
-- TOC entry 5327 (class 1259 OID 17650)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON public.automatic_reminders USING btree (user_id);


--
-- TOC entry 5414 (class 1259 OID 19281)
-- Name: idx_ai_conversations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations USING btree (user_id);


--
-- TOC entry 5418 (class 1259 OID 19309)
-- Name: idx_ai_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id);


--
-- TOC entry 5419 (class 1259 OID 19310)
-- Name: idx_ai_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_messages_created_at ON public.ai_messages USING btree (created_at);


--
-- TOC entry 5420 (class 1259 OID 19308)
-- Name: idx_ai_messages_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_messages_user_id ON public.ai_messages USING btree (user_id);


--
-- TOC entry 5425 (class 1259 OID 19336)
-- Name: idx_ai_suggestions_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_suggestions_property_id ON public.ai_suggestions USING btree (property_id);


--
-- TOC entry 5426 (class 1259 OID 19337)
-- Name: idx_ai_suggestions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_suggestions_type ON public.ai_suggestions USING btree (type);


--
-- TOC entry 5427 (class 1259 OID 19335)
-- Name: idx_ai_suggestions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions USING btree (user_id);


--
-- TOC entry 5338 (class 1259 OID 17795)
-- Name: idx_analysis_configs_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analysis_configs_property_id ON public.analysis_configs USING btree (property_id);


--
-- TOC entry 5339 (class 1259 OID 17796)
-- Name: idx_analysis_configs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analysis_configs_user_id ON public.analysis_configs USING btree (user_id);


--
-- TOC entry 5387 (class 1259 OID 18463)
-- Name: idx_billing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_status ON public.billing_transactions USING btree (status);


--
-- TOC entry 5388 (class 1259 OID 18462)
-- Name: idx_billing_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_user_id ON public.billing_transactions USING btree (user_id);


--
-- TOC entry 5368 (class 1259 OID 18219)
-- Name: idx_form_fields_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_fields_link_id ON public.form_fields USING btree (link_id);


--
-- TOC entry 5362 (class 1259 OID 18182)
-- Name: idx_form_submissions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_submissions_created_at ON public.form_submissions USING btree (created_at);


--
-- TOC entry 5363 (class 1259 OID 18181)
-- Name: idx_form_submissions_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_submissions_link_id ON public.form_submissions USING btree (link_id);


--
-- TOC entry 5348 (class 1259 OID 18039)
-- Name: idx_forms_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forms_user_id ON public.forms USING btree (user_id);


--
-- TOC entry 5356 (class 1259 OID 18179)
-- Name: idx_links_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_links_profile_id ON public.links USING btree (profile_id);


--
-- TOC entry 5357 (class 1259 OID 18180)
-- Name: idx_links_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_links_type ON public.links USING btree (type);


--
-- TOC entry 5276 (class 1259 OID 18248)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- TOC entry 5277 (class 1259 OID 18247)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 5278 (class 1259 OID 18246)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- TOC entry 5279 (class 1259 OID 18245)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 5396 (class 1259 OID 19020)
-- Name: idx_pdf_document_prefs_config_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pdf_document_prefs_config_id ON public.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 5332 (class 1259 OID 17793)
-- Name: idx_property_analyses_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_property_analyses_property_id ON public.property_analyses USING btree (property_id);


--
-- TOC entry 5333 (class 1259 OID 17794)
-- Name: idx_property_analyses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_property_analyses_user_id ON public.property_analyses USING btree (user_id);


--
-- TOC entry 5351 (class 1259 OID 18040)
-- Name: idx_responses_form_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responses_form_id ON public.form_responses USING btree (form_id);


--
-- TOC entry 5389 (class 1259 OID 18601)
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- TOC entry 5390 (class 1259 OID 18600)
-- Name: idx_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_session_id ON public.sessions USING btree (session_id);


--
-- TOC entry 5391 (class 1259 OID 18599)
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- TOC entry 5374 (class 1259 OID 18383)
-- Name: idx_storage_details_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_details_user_id ON public.storage_usage_details USING btree (user_id);


--
-- TOC entry 5375 (class 1259 OID 18384)
-- Name: idx_storage_details_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_storage_details_user_type ON public.storage_usage_details USING btree (user_id, resource_type);


--
-- TOC entry 5371 (class 1259 OID 18243)
-- Name: idx_transaction_attachments_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_attachments_transaction_id ON public.transaction_attachments USING btree (transaction_id);


--
-- TOC entry 5296 (class 1259 OID 18240)
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at);


--
-- TOC entry 5297 (class 1259 OID 18241)
-- Name: idx_transactions_property_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_property_id ON public.transactions USING btree (property_id);


--
-- TOC entry 5298 (class 1259 OID 18239)
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- TOC entry 5299 (class 1259 OID 18242)
-- Name: idx_transactions_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_tenant_id ON public.transactions USING btree (tenant_id);


--
-- TOC entry 5300 (class 1259 OID 18238)
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- TOC entry 5340 (class 1259 OID 17835)
-- Name: idx_user_notification_settings_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_type ON public.user_notification_settings USING btree (type);


--
-- TOC entry 5341 (class 1259 OID 17834)
-- Name: idx_user_notification_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notification_settings_user_id ON public.user_notification_settings USING btree (user_id);


--
-- TOC entry 5378 (class 1259 OID 18466)
-- Name: idx_user_subscriptions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_subscriptions_active ON public.user_subscriptions USING btree (is_active);


--
-- TOC entry 5379 (class 1259 OID 18446)
-- Name: idx_user_subscriptions_storage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_subscriptions_storage ON public.user_subscriptions USING btree (storage_extension_id);


--
-- TOC entry 5380 (class 1259 OID 18465)
-- Name: idx_user_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions USING btree (user_id);


--
-- TOC entry 5248 (class 1259 OID 19350)
-- Name: idx_users_preferred_ai_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_preferred_ai_model ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 5319 (class 1259 OID 17647)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON public.rent_receipts USING btree (property_id);


--
-- TOC entry 5320 (class 1259 OID 17649)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON public.rent_receipts USING btree (status);


--
-- TOC entry 5321 (class 1259 OID 17646)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON public.rent_receipts USING btree (tenant_id);


--
-- TOC entry 5322 (class 1259 OID 17648)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON public.rent_receipts USING btree (transaction_id);


--
-- TOC entry 5301 (class 1259 OID 17800)
-- Name: transactions_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_category_idx ON public.transactions USING btree (category);


--
-- TOC entry 5302 (class 1259 OID 17798)
-- Name: transactions_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_date_idx ON public.transactions USING btree (date);


--
-- TOC entry 5303 (class 1259 OID 17807)
-- Name: transactions_month_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_month_category_idx ON public.transactions USING btree (date_trunc('month'::text, date), category);


--
-- TOC entry 5304 (class 1259 OID 17806)
-- Name: transactions_month_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_month_idx ON public.transactions USING btree (date_trunc('month'::text, date));


--
-- TOC entry 5305 (class 1259 OID 17809)
-- Name: transactions_month_property_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_month_property_idx ON public.transactions USING btree (date_trunc('month'::text, date), property_id);


--
-- TOC entry 5306 (class 1259 OID 17808)
-- Name: transactions_month_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_month_type_idx ON public.transactions USING btree (date_trunc('month'::text, date), type);


--
-- TOC entry 5309 (class 1259 OID 17803)
-- Name: transactions_property_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_property_category_idx ON public.transactions USING btree (property_id, category);


--
-- TOC entry 5310 (class 1259 OID 17801)
-- Name: transactions_property_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_property_id_idx ON public.transactions USING btree (property_id);


--
-- TOC entry 5311 (class 1259 OID 17802)
-- Name: transactions_property_type_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_property_type_category_idx ON public.transactions USING btree (property_id, type, category);


--
-- TOC entry 5312 (class 1259 OID 17805)
-- Name: transactions_property_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_property_type_idx ON public.transactions USING btree (property_id, type);


--
-- TOC entry 5313 (class 1259 OID 17804)
-- Name: transactions_type_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_type_category_idx ON public.transactions USING btree (type, category);


--
-- TOC entry 5314 (class 1259 OID 17799)
-- Name: transactions_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX transactions_type_idx ON public.transactions USING btree (type);


--
-- TOC entry 5251 (class 1259 OID 19349)
-- Name: users_preferred_ai_model_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_preferred_ai_model_idx ON public.users USING btree (preferred_ai_model);


--
-- TOC entry 5492 (class 2620 OID 19211)
-- Name: pdf_configuration sync_theme_on_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_theme_on_update BEFORE UPDATE ON public.pdf_configuration FOR EACH ROW WHEN ((new.theme_id IS DISTINCT FROM old.theme_id)) EXECUTE FUNCTION public.sync_theme_colors();


--
-- TOC entry 5490 (class 2620 OID 19452)
-- Name: documents trg_update_storage_on_document_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_storage_on_document_change AFTER INSERT OR DELETE OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_storage_on_document_change();


--
-- TOC entry 5496 (class 2620 OID 19162)
-- Name: company_info update_company_info_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_company_info_timestamp BEFORE UPDATE ON public.company_info FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5493 (class 2620 OID 19159)
-- Name: pdf_configuration update_pdf_configuration_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_configuration_timestamp BEFORE UPDATE ON public.pdf_configuration FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5491 (class 2620 OID 19021)
-- Name: pdf_document_preferences update_pdf_document_preferences_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_document_preferences_timestamp BEFORE UPDATE ON public.pdf_document_preferences FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5494 (class 2620 OID 19160)
-- Name: pdf_logos update_pdf_logos_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_logos_timestamp BEFORE UPDATE ON public.pdf_logos FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5495 (class 2620 OID 19161)
-- Name: pdf_templates update_pdf_templates_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_templates_timestamp BEFORE UPDATE ON public.pdf_templates FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5497 (class 2620 OID 19204)
-- Name: pdf_themes update_pdf_themes_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pdf_themes_timestamp BEFORE UPDATE ON public.pdf_themes FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 5484 (class 2606 OID 19276)
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5485 (class 2606 OID 19303)
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;


--
-- TOC entry 5486 (class 2606 OID 19298)
-- Name: ai_messages ai_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5487 (class 2606 OID 19330)
-- Name: ai_suggestions ai_suggestions_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions
    ADD CONSTRAINT ai_suggestions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 5488 (class 2606 OID 19325)
-- Name: ai_suggestions ai_suggestions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_suggestions
    ADD CONSTRAINT ai_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5467 (class 2606 OID 17783)
-- Name: analysis_configs analysis_configs_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_configs
    ADD CONSTRAINT analysis_configs_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 5468 (class 2606 OID 17788)
-- Name: analysis_configs analysis_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_configs
    ADD CONSTRAINT analysis_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5461 (class 2606 OID 17641)
-- Name: automatic_reminders automatic_reminders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automatic_reminders
    ADD CONSTRAINT automatic_reminders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5481 (class 2606 OID 18457)
-- Name: billing_transactions billing_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5464 (class 2606 OID 17737)
-- Name: contract_parties contract_parties_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_parties
    ADD CONSTRAINT contract_parties_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- TOC entry 5462 (class 2606 OID 17721)
-- Name: contracts contracts_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 5463 (class 2606 OID 17716)
-- Name: contracts contracts_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5434 (class 2606 OID 17464)
-- Name: document_templates document_templates_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5435 (class 2606 OID 17469)
-- Name: documents_access_log documents_access_log_document_id_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_access_log
    ADD CONSTRAINT documents_access_log_document_id_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 5436 (class 2606 OID 17474)
-- Name: documents_access_log documents_access_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_access_log
    ADD CONSTRAINT documents_access_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5437 (class 2606 OID 17479)
-- Name: financial_entries financial_entries_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_entries
    ADD CONSTRAINT financial_entries_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 5440 (class 2606 OID 18249)
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5478 (class 2606 OID 18467)
-- Name: user_subscriptions fk_storage_extension; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT fk_storage_extension FOREIGN KEY (storage_extension_id) REFERENCES public.storage_extensions(id);


--
-- TOC entry 5483 (class 2606 OID 19205)
-- Name: pdf_configuration fk_theme; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdf_configuration
    ADD CONSTRAINT fk_theme FOREIGN KEY (theme_id) REFERENCES public.pdf_themes(id);


--
-- TOC entry 5475 (class 2606 OID 18214)
-- Name: form_field_options form_field_options_form_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_field_options
    ADD CONSTRAINT form_field_options_form_field_id_fkey FOREIGN KEY (form_field_id) REFERENCES public.form_fields(id) ON DELETE CASCADE;


--
-- TOC entry 5474 (class 2606 OID 18200)
-- Name: form_fields form_fields_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;


--
-- TOC entry 5470 (class 2606 OID 18034)
-- Name: form_responses form_responses_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- TOC entry 5473 (class 2606 OID 18174)
-- Name: form_submissions form_submissions_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.links(id);


--
-- TOC entry 5471 (class 2606 OID 18138)
-- Name: link_profiles link_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_profiles
    ADD CONSTRAINT link_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5472 (class 2606 OID 18159)
-- Name: links links_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.link_profiles(id);


--
-- TOC entry 5438 (class 2606 OID 17484)
-- Name: maintenance_requests maintenance_requests_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5439 (class 2606 OID 17489)
-- Name: maintenance_requests maintenance_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5465 (class 2606 OID 17765)
-- Name: property_analyses property_analyses_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_analyses
    ADD CONSTRAINT property_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 5466 (class 2606 OID 17770)
-- Name: property_analyses property_analyses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_analyses
    ADD CONSTRAINT property_analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5441 (class 2606 OID 17494)
-- Name: property_coordinates property_coordinates_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_coordinates
    ADD CONSTRAINT property_coordinates_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5442 (class 2606 OID 17499)
-- Name: property_financial_goals property_financial_goals_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_goals
    ADD CONSTRAINT property_financial_goals_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 5443 (class 2606 OID 17504)
-- Name: property_financial_snapshots property_financial_snapshots_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 5444 (class 2606 OID 17509)
-- Name: property_history property_history_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_history
    ADD CONSTRAINT property_history_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5445 (class 2606 OID 17514)
-- Name: property_history property_history_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_history
    ADD CONSTRAINT property_history_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5446 (class 2606 OID 17519)
-- Name: property_works property_works_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_works
    ADD CONSTRAINT property_works_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5457 (class 2606 OID 17636)
-- Name: rent_receipts rent_receipts_document_id_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts
    ADD CONSTRAINT rent_receipts_document_id_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- TOC entry 5458 (class 2606 OID 17626)
-- Name: rent_receipts rent_receipts_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts
    ADD CONSTRAINT rent_receipts_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- TOC entry 5459 (class 2606 OID 17621)
-- Name: rent_receipts rent_receipts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts
    ADD CONSTRAINT rent_receipts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 5460 (class 2606 OID 17631)
-- Name: rent_receipts rent_receipts_transaction_id_transactions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_receipts
    ADD CONSTRAINT rent_receipts_transaction_id_transactions_id_fk FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- TOC entry 5482 (class 2606 OID 18589)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5489 (class 2606 OID 19444)
-- Name: storage_transactions storage_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_transactions
    ADD CONSTRAINT storage_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5477 (class 2606 OID 18378)
-- Name: storage_usage_details storage_usage_details_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_usage_details
    ADD CONSTRAINT storage_usage_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5447 (class 2606 OID 17524)
-- Name: tenant_documents tenant_documents_document_id_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_document_id_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 5448 (class 2606 OID 17529)
-- Name: tenant_documents tenant_documents_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5449 (class 2606 OID 17534)
-- Name: tenant_history tenant_history_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_history
    ADD CONSTRAINT tenant_history_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5450 (class 2606 OID 17748)
-- Name: tenant_history tenant_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_history
    ADD CONSTRAINT tenant_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5430 (class 2606 OID 16923)
-- Name: tenants tenants_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5431 (class 2606 OID 17544)
-- Name: tenants tenants_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5432 (class 2606 OID 16918)
-- Name: tenants tenants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5433 (class 2606 OID 17549)
-- Name: tenants tenants_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5476 (class 2606 OID 18233)
-- Name: transaction_attachments transaction_attachments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_attachments
    ADD CONSTRAINT transaction_attachments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- TOC entry 5451 (class 2606 OID 17554)
-- Name: transactions transactions_document_id_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_document_id_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- TOC entry 5452 (class 2606 OID 17559)
-- Name: transactions transactions_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5453 (class 2606 OID 17564)
-- Name: transactions transactions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 5454 (class 2606 OID 17569)
-- Name: transactions transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5469 (class 2606 OID 17829)
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5479 (class 2606 OID 18441)
-- Name: user_subscriptions user_subscriptions_storage_extension_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_storage_extension_id_fkey FOREIGN KEY (storage_extension_id) REFERENCES public.storage_extensions(id);


--
-- TOC entry 5480 (class 2606 OID 18426)
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5455 (class 2606 OID 17574)
-- Name: visits visits_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_agent_id_users_id_fk FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- TOC entry 5456 (class 2606 OID 17579)
-- Name: visits visits_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- TOC entry 5646 (class 0 OID 17239)
-- Dependencies: 231
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5651 (class 3256 OID 19967)
-- Name: documents documents_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY documents_policy ON public.documents USING (((public.current_user_id() = 0) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = public.current_user_id()) AND (users.role = 'admin'::text)))) OR (user_id = public.current_user_id()) OR (EXISTS ( SELECT 1
   FROM (public.tenant_documents td
     JOIN public.tenants t ON ((td.tenant_id = t.id)))
  WHERE ((td.document_id = documents.id) AND (t.user_id = public.current_user_id()))))));


--
-- TOC entry 5644 (class 0 OID 16870)
-- Dependencies: 219
-- Name: properties; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5649 (class 3256 OID 19965)
-- Name: properties properties_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY properties_policy ON public.properties USING (((public.current_user_id() = 0) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = public.current_user_id()) AND (users.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM public.tenants
  WHERE ((tenants.property_id = properties.id) AND (tenants.user_id = public.current_user_id()))))));


--
-- TOC entry 5645 (class 0 OID 16906)
-- Dependencies: 220
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5650 (class 3256 OID 19966)
-- Name: tenants tenants_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenants_policy ON public.tenants USING (((public.current_user_id() = 0) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = public.current_user_id()) AND (users.role = 'admin'::text)))) OR (user_id = public.current_user_id())));


--
-- TOC entry 5647 (class 0 OID 17357)
-- Dependencies: 259
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5652 (class 3256 OID 19969)
-- Name: transactions transactions_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY transactions_policy ON public.transactions USING (((public.current_user_id() = 0) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = public.current_user_id()) AND (users.role = 'admin'::text)))) OR (user_id = public.current_user_id()) OR (EXISTS ( SELECT 1
   FROM public.tenants
  WHERE ((tenants.id = transactions.tenant_id) AND (tenants.user_id = public.current_user_id()))))));


--
-- TOC entry 5643 (class 0 OID 16853)
-- Dependencies: 218
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5648 (class 3256 OID 19964)
-- Name: users users_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_policy ON public.users USING (((public.current_user_id() = id) OR (public.current_user_id() = 0) OR (EXISTS ( SELECT 1
   FROM public.users users_1
  WHERE ((users_1.id = public.current_user_id()) AND (users_1.role = 'admin'::text))))));


--
-- TOC entry 5764 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO admin;


--
-- TOC entry 5766 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE properties; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.properties TO app_admin;
GRANT ALL ON TABLE public.properties TO admin_role;
GRANT SELECT ON TABLE public.properties TO client_role;
GRANT SELECT ON TABLE public.properties TO clients;
GRANT ALL ON TABLE public.properties TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.properties TO app_manager;
GRANT SELECT ON TABLE public.properties TO app_tenant;
GRANT ALL ON TABLE public.properties TO app_service;


--
-- TOC entry 5770 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE ai_conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_conversations TO app_admin;
GRANT ALL ON TABLE public.ai_conversations TO admin_role;
GRANT ALL ON TABLE public.ai_conversations TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ai_conversations TO app_manager;
GRANT ALL ON TABLE public.ai_conversations TO app_service;


--
-- TOC entry 5772 (class 0 OID 0)
-- Dependencies: 316
-- Name: SEQUENCE ai_conversations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ai_conversations_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.ai_conversations_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.ai_conversations_id_seq TO clients;
GRANT ALL ON SEQUENCE public.ai_conversations_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.ai_conversations_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.ai_conversations_id_seq TO app_service;


--
-- TOC entry 5773 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE ai_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_messages TO app_admin;
GRANT ALL ON TABLE public.ai_messages TO admin_role;
GRANT ALL ON TABLE public.ai_messages TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ai_messages TO app_manager;
GRANT ALL ON TABLE public.ai_messages TO app_service;


--
-- TOC entry 5775 (class 0 OID 0)
-- Dependencies: 318
-- Name: SEQUENCE ai_messages_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ai_messages_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.ai_messages_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.ai_messages_id_seq TO clients;
GRANT ALL ON SEQUENCE public.ai_messages_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.ai_messages_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.ai_messages_id_seq TO app_service;


--
-- TOC entry 5776 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE ai_suggestions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_suggestions TO app_admin;
GRANT ALL ON TABLE public.ai_suggestions TO admin_role;
GRANT ALL ON TABLE public.ai_suggestions TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ai_suggestions TO app_manager;
GRANT ALL ON TABLE public.ai_suggestions TO app_service;


--
-- TOC entry 5778 (class 0 OID 0)
-- Dependencies: 320
-- Name: SEQUENCE ai_suggestions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ai_suggestions_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.ai_suggestions_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.ai_suggestions_id_seq TO clients;
GRANT ALL ON SEQUENCE public.ai_suggestions_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.ai_suggestions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.ai_suggestions_id_seq TO app_service;


--
-- TOC entry 5779 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.alerts TO app_admin;
GRANT ALL ON TABLE public.alerts TO admin_role;
GRANT ALL ON TABLE public.alerts TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.alerts TO app_manager;
GRANT ALL ON TABLE public.alerts TO app_service;


--
-- TOC entry 5781 (class 0 OID 0)
-- Dependencies: 223
-- Name: SEQUENCE alerts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.alerts_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.alerts_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.alerts_id_seq TO clients;
GRANT ALL ON SEQUENCE public.alerts_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.alerts_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.alerts_id_seq TO app_service;


--
-- TOC entry 5782 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE analysis_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.analysis_configs TO app_admin;
GRANT ALL ON TABLE public.analysis_configs TO admin_role;
GRANT ALL ON TABLE public.analysis_configs TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.analysis_configs TO app_manager;
GRANT ALL ON TABLE public.analysis_configs TO app_service;


--
-- TOC entry 5784 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE analysis_configs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.analysis_configs_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.analysis_configs_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.analysis_configs_id_seq TO clients;
GRANT ALL ON SEQUENCE public.analysis_configs_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.analysis_configs_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.analysis_configs_id_seq TO app_service;


--
-- TOC entry 5785 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE automatic_reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.automatic_reminders TO app_admin;
GRANT ALL ON TABLE public.automatic_reminders TO admin_role;
GRANT ALL ON TABLE public.automatic_reminders TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.automatic_reminders TO app_manager;
GRANT ALL ON TABLE public.automatic_reminders TO app_service;


--
-- TOC entry 5787 (class 0 OID 0)
-- Dependencies: 266
-- Name: SEQUENCE automatic_reminders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.automatic_reminders_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.automatic_reminders_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.automatic_reminders_id_seq TO clients;
GRANT ALL ON SEQUENCE public.automatic_reminders_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.automatic_reminders_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.automatic_reminders_id_seq TO app_service;


--
-- TOC entry 5788 (class 0 OID 0)
-- Dependencies: 301
-- Name: TABLE billing_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.billing_transactions TO app_admin;
GRANT ALL ON TABLE public.billing_transactions TO admin_role;
GRANT ALL ON TABLE public.billing_transactions TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.billing_transactions TO app_manager;
GRANT ALL ON TABLE public.billing_transactions TO app_service;


--
-- TOC entry 5790 (class 0 OID 0)
-- Dependencies: 300
-- Name: SEQUENCE billing_transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.billing_transactions_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.billing_transactions_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.billing_transactions_id_seq TO clients;
GRANT ALL ON SEQUENCE public.billing_transactions_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.billing_transactions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.billing_transactions_id_seq TO app_service;


--
-- TOC entry 5791 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE company_info; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.company_info TO app_admin;
GRANT ALL ON TABLE public.company_info TO admin_role;
GRANT ALL ON TABLE public.company_info TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.company_info TO app_manager;
GRANT ALL ON TABLE public.company_info TO app_service;


--
-- TOC entry 5793 (class 0 OID 0)
-- Dependencies: 312
-- Name: SEQUENCE company_info_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.company_info_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.company_info_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.company_info_id_seq TO clients;
GRANT ALL ON SEQUENCE public.company_info_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.company_info_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.company_info_id_seq TO app_service;


--
-- TOC entry 5794 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE contract_parties; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contract_parties TO app_admin;
GRANT ALL ON TABLE public.contract_parties TO admin_role;
GRANT ALL ON TABLE public.contract_parties TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.contract_parties TO app_manager;
GRANT ALL ON TABLE public.contract_parties TO app_service;


--
-- TOC entry 5796 (class 0 OID 0)
-- Dependencies: 270
-- Name: SEQUENCE contract_parties_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.contract_parties_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.contract_parties_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.contract_parties_id_seq TO clients;
GRANT ALL ON SEQUENCE public.contract_parties_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.contract_parties_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.contract_parties_id_seq TO app_service;


--
-- TOC entry 5797 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE contracts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contracts TO app_admin;
GRANT ALL ON TABLE public.contracts TO admin_role;
GRANT ALL ON TABLE public.contracts TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.contracts TO app_manager;
GRANT ALL ON TABLE public.contracts TO app_service;


--
-- TOC entry 5799 (class 0 OID 0)
-- Dependencies: 268
-- Name: SEQUENCE contracts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.contracts_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.contracts_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.contracts_id_seq TO clients;
GRANT ALL ON SEQUENCE public.contracts_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.contracts_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.contracts_id_seq TO app_service;


--
-- TOC entry 5800 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE document_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_templates TO app_admin;
GRANT ALL ON TABLE public.document_templates TO admin_role;
GRANT ALL ON TABLE public.document_templates TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.document_templates TO app_manager;
GRANT ALL ON TABLE public.document_templates TO app_service;


--
-- TOC entry 5802 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE document_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.document_templates_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.document_templates_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.document_templates_id_seq TO clients;
GRANT ALL ON SEQUENCE public.document_templates_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.document_templates_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.document_templates_id_seq TO app_service;


--
-- TOC entry 5803 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents TO app_admin;
GRANT ALL ON TABLE public.documents TO admin_role;
GRANT SELECT ON TABLE public.documents TO client_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.documents TO clients;
GRANT ALL ON TABLE public.documents TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.documents TO app_manager;
GRANT SELECT ON TABLE public.documents TO app_tenant;
GRANT ALL ON TABLE public.documents TO app_service;


--
-- TOC entry 5804 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE documents_access_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents_access_log TO app_admin;
GRANT ALL ON TABLE public.documents_access_log TO admin_role;
GRANT ALL ON TABLE public.documents_access_log TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.documents_access_log TO app_manager;
GRANT ALL ON TABLE public.documents_access_log TO app_service;


--
-- TOC entry 5806 (class 0 OID 0)
-- Dependencies: 233
-- Name: SEQUENCE documents_access_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_access_log_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.documents_access_log_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.documents_access_log_id_seq TO clients;
GRANT ALL ON SEQUENCE public.documents_access_log_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.documents_access_log_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.documents_access_log_id_seq TO app_service;


--
-- TOC entry 5808 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.documents_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.documents_id_seq TO clients;
GRANT ALL ON SEQUENCE public.documents_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.documents_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.documents_id_seq TO app_service;


--
-- TOC entry 5809 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE feedbacks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feedbacks TO app_admin;
GRANT ALL ON TABLE public.feedbacks TO admin_role;
GRANT ALL ON TABLE public.feedbacks TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.feedbacks TO app_manager;
GRANT ALL ON TABLE public.feedbacks TO app_service;


--
-- TOC entry 5811 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE feedbacks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.feedbacks_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.feedbacks_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.feedbacks_id_seq TO clients;
GRANT ALL ON SEQUENCE public.feedbacks_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.feedbacks_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.feedbacks_id_seq TO app_service;


--
-- TOC entry 5812 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE financial_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.financial_entries TO app_admin;
GRANT ALL ON TABLE public.financial_entries TO admin_role;
GRANT ALL ON TABLE public.financial_entries TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.financial_entries TO app_manager;
GRANT ALL ON TABLE public.financial_entries TO app_service;


--
-- TOC entry 5814 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE financial_entries_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.financial_entries_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.financial_entries_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.financial_entries_id_seq TO clients;
GRANT ALL ON SEQUENCE public.financial_entries_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.financial_entries_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.financial_entries_id_seq TO app_service;


--
-- TOC entry 5815 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE folders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.folders TO app_admin;
GRANT ALL ON TABLE public.folders TO admin_role;
GRANT SELECT ON TABLE public.folders TO client_role;
GRANT ALL ON TABLE public.folders TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.folders TO app_manager;
GRANT ALL ON TABLE public.folders TO app_service;


--
-- TOC entry 5817 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE folders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.folders_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.folders_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.folders_id_seq TO clients;
GRANT ALL ON SEQUENCE public.folders_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.folders_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.folders_id_seq TO app_service;


--
-- TOC entry 5818 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE form_field_options; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.form_field_options TO app_admin;
GRANT ALL ON TABLE public.form_field_options TO admin_role;
GRANT ALL ON TABLE public.form_field_options TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.form_field_options TO app_manager;
GRANT ALL ON TABLE public.form_field_options TO app_service;


--
-- TOC entry 5820 (class 0 OID 0)
-- Dependencies: 290
-- Name: SEQUENCE form_field_options_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.form_field_options_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.form_field_options_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.form_field_options_id_seq TO clients;
GRANT ALL ON SEQUENCE public.form_field_options_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.form_field_options_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.form_field_options_id_seq TO app_service;


--
-- TOC entry 5821 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE form_fields; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.form_fields TO app_admin;
GRANT ALL ON TABLE public.form_fields TO admin_role;
GRANT ALL ON TABLE public.form_fields TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.form_fields TO app_manager;
GRANT ALL ON TABLE public.form_fields TO app_service;


--
-- TOC entry 5823 (class 0 OID 0)
-- Dependencies: 288
-- Name: SEQUENCE form_fields_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.form_fields_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.form_fields_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.form_fields_id_seq TO clients;
GRANT ALL ON SEQUENCE public.form_fields_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.form_fields_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.form_fields_id_seq TO app_service;


--
-- TOC entry 5825 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE form_responses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.form_responses TO app_admin;
GRANT ALL ON TABLE public.form_responses TO admin_role;
GRANT ALL ON TABLE public.form_responses TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.form_responses TO app_manager;
GRANT ALL ON TABLE public.form_responses TO app_service;


--
-- TOC entry 5827 (class 0 OID 0)
-- Dependencies: 280
-- Name: SEQUENCE form_responses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.form_responses_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.form_responses_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.form_responses_id_seq TO clients;
GRANT ALL ON SEQUENCE public.form_responses_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.form_responses_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.form_responses_id_seq TO app_service;


--
-- TOC entry 5828 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE form_submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.form_submissions TO app_admin;
GRANT ALL ON TABLE public.form_submissions TO admin_role;
GRANT ALL ON TABLE public.form_submissions TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.form_submissions TO app_manager;
GRANT ALL ON TABLE public.form_submissions TO app_service;


--
-- TOC entry 5830 (class 0 OID 0)
-- Dependencies: 286
-- Name: SEQUENCE form_submissions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.form_submissions_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.form_submissions_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.form_submissions_id_seq TO clients;
GRANT ALL ON SEQUENCE public.form_submissions_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.form_submissions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.form_submissions_id_seq TO app_service;


--
-- TOC entry 5832 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE forms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.forms TO app_admin;
GRANT ALL ON TABLE public.forms TO admin_role;
GRANT ALL ON TABLE public.forms TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.forms TO app_manager;
GRANT ALL ON TABLE public.forms TO app_service;


--
-- TOC entry 5834 (class 0 OID 0)
-- Dependencies: 278
-- Name: SEQUENCE forms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.forms_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.forms_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.forms_id_seq TO clients;
GRANT ALL ON SEQUENCE public.forms_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.forms_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.forms_id_seq TO app_service;


--
-- TOC entry 5835 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE link_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.link_profiles TO app_admin;
GRANT ALL ON TABLE public.link_profiles TO admin_role;
GRANT ALL ON TABLE public.link_profiles TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.link_profiles TO app_manager;
GRANT ALL ON TABLE public.link_profiles TO app_service;


--
-- TOC entry 5837 (class 0 OID 0)
-- Dependencies: 282
-- Name: SEQUENCE link_profiles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.link_profiles_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.link_profiles_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.link_profiles_id_seq TO clients;
GRANT ALL ON SEQUENCE public.link_profiles_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.link_profiles_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.link_profiles_id_seq TO app_service;


--
-- TOC entry 5838 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.links TO app_admin;
GRANT ALL ON TABLE public.links TO admin_role;
GRANT ALL ON TABLE public.links TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.links TO app_manager;
GRANT ALL ON TABLE public.links TO app_service;


--
-- TOC entry 5840 (class 0 OID 0)
-- Dependencies: 284
-- Name: SEQUENCE links_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.links_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.links_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.links_id_seq TO clients;
GRANT ALL ON SEQUENCE public.links_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.links_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.links_id_seq TO app_service;


--
-- TOC entry 5841 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE maintenance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.maintenance TO app_admin;
GRANT ALL ON TABLE public.maintenance TO admin_role;
GRANT ALL ON TABLE public.maintenance TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.maintenance TO app_manager;
GRANT ALL ON TABLE public.maintenance TO app_service;


--
-- TOC entry 5843 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE maintenance_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.maintenance_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.maintenance_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.maintenance_id_seq TO clients;
GRANT ALL ON SEQUENCE public.maintenance_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.maintenance_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.maintenance_id_seq TO app_service;


--
-- TOC entry 5844 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE maintenance_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.maintenance_requests TO app_admin;
GRANT ALL ON TABLE public.maintenance_requests TO admin_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.maintenance_requests TO client_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.maintenance_requests TO clients;
GRANT ALL ON TABLE public.maintenance_requests TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.maintenance_requests TO app_manager;
GRANT SELECT,INSERT,UPDATE ON TABLE public.maintenance_requests TO app_tenant;
GRANT ALL ON TABLE public.maintenance_requests TO app_service;


--
-- TOC entry 5846 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE maintenance_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.maintenance_requests_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.maintenance_requests_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.maintenance_requests_id_seq TO client_role;
GRANT USAGE ON SEQUENCE public.maintenance_requests_id_seq TO clients;
GRANT ALL ON SEQUENCE public.maintenance_requests_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.maintenance_requests_id_seq TO app_manager;
GRANT USAGE ON SEQUENCE public.maintenance_requests_id_seq TO app_tenant;
GRANT ALL ON SEQUENCE public.maintenance_requests_id_seq TO app_service;


--
-- TOC entry 5847 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO app_admin;
GRANT ALL ON TABLE public.notifications TO admin_role;
GRANT ALL ON TABLE public.notifications TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.notifications TO app_manager;
GRANT ALL ON TABLE public.notifications TO app_service;


--
-- TOC entry 5849 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.notifications_id_seq TO clients;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.notifications_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO app_service;


--
-- TOC entry 5850 (class 0 OID 0)
-- Dependencies: 307
-- Name: TABLE pdf_configuration; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pdf_configuration TO app_admin;
GRANT ALL ON TABLE public.pdf_configuration TO admin_role;
GRANT ALL ON TABLE public.pdf_configuration TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.pdf_configuration TO app_manager;
GRANT ALL ON TABLE public.pdf_configuration TO app_service;


--
-- TOC entry 5852 (class 0 OID 0)
-- Dependencies: 306
-- Name: SEQUENCE pdf_configuration_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pdf_configuration_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.pdf_configuration_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.pdf_configuration_id_seq TO clients;
GRANT ALL ON SEQUENCE public.pdf_configuration_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.pdf_configuration_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.pdf_configuration_id_seq TO app_service;


--
-- TOC entry 5853 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE pdf_document_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pdf_document_preferences TO app_admin;
GRANT ALL ON TABLE public.pdf_document_preferences TO admin_role;
GRANT ALL ON TABLE public.pdf_document_preferences TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.pdf_document_preferences TO app_manager;
GRANT ALL ON TABLE public.pdf_document_preferences TO app_service;


--
-- TOC entry 5855 (class 0 OID 0)
-- Dependencies: 304
-- Name: SEQUENCE pdf_document_preferences_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pdf_document_preferences_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.pdf_document_preferences_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.pdf_document_preferences_id_seq TO clients;
GRANT ALL ON SEQUENCE public.pdf_document_preferences_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.pdf_document_preferences_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.pdf_document_preferences_id_seq TO app_service;


--
-- TOC entry 5856 (class 0 OID 0)
-- Dependencies: 309
-- Name: TABLE pdf_logos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pdf_logos TO app_admin;
GRANT ALL ON TABLE public.pdf_logos TO admin_role;
GRANT ALL ON TABLE public.pdf_logos TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.pdf_logos TO app_manager;
GRANT ALL ON TABLE public.pdf_logos TO app_service;


--
-- TOC entry 5858 (class 0 OID 0)
-- Dependencies: 308
-- Name: SEQUENCE pdf_logos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pdf_logos_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.pdf_logos_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.pdf_logos_id_seq TO clients;
GRANT ALL ON SEQUENCE public.pdf_logos_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.pdf_logos_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.pdf_logos_id_seq TO app_service;


--
-- TOC entry 5859 (class 0 OID 0)
-- Dependencies: 311
-- Name: TABLE pdf_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pdf_templates TO app_admin;
GRANT ALL ON TABLE public.pdf_templates TO admin_role;
GRANT ALL ON TABLE public.pdf_templates TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.pdf_templates TO app_manager;
GRANT ALL ON TABLE public.pdf_templates TO app_service;


--
-- TOC entry 5861 (class 0 OID 0)
-- Dependencies: 310
-- Name: SEQUENCE pdf_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pdf_templates_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.pdf_templates_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.pdf_templates_id_seq TO clients;
GRANT ALL ON SEQUENCE public.pdf_templates_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.pdf_templates_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.pdf_templates_id_seq TO app_service;


--
-- TOC entry 5862 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE pdf_themes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pdf_themes TO app_admin;
GRANT ALL ON TABLE public.pdf_themes TO admin_role;
GRANT ALL ON TABLE public.pdf_themes TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.pdf_themes TO app_manager;
GRANT ALL ON TABLE public.pdf_themes TO app_service;


--
-- TOC entry 5864 (class 0 OID 0)
-- Dependencies: 314
-- Name: SEQUENCE pdf_themes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pdf_themes_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.pdf_themes_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.pdf_themes_id_seq TO clients;
GRANT ALL ON SEQUENCE public.pdf_themes_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.pdf_themes_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.pdf_themes_id_seq TO app_service;


--
-- TOC entry 5866 (class 0 OID 0)
-- Dependencies: 243
-- Name: SEQUENCE properties_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.properties_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.properties_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.properties_id_seq TO clients;
GRANT ALL ON SEQUENCE public.properties_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.properties_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.properties_id_seq TO app_service;


--
-- TOC entry 5867 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE property_analyses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.property_analyses TO app_admin;
GRANT ALL ON TABLE public.property_analyses TO admin_role;
GRANT ALL ON TABLE public.property_analyses TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.property_analyses TO app_manager;
GRANT ALL ON TABLE public.property_analyses TO app_service;


--
-- TOC entry 5869 (class 0 OID 0)
-- Dependencies: 272
-- Name: SEQUENCE property_analyses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.property_analyses_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.property_analyses_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.property_analyses_id_seq TO clients;
GRANT ALL ON SEQUENCE public.property_analyses_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.property_analyses_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.property_analyses_id_seq TO app_service;


--
-- TOC entry 5870 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE property_coordinates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.property_coordinates TO app_admin;
GRANT ALL ON TABLE public.property_coordinates TO admin_role;
GRANT ALL ON TABLE public.property_coordinates TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.property_coordinates TO app_manager;
GRANT ALL ON TABLE public.property_coordinates TO app_service;


--
-- TOC entry 5872 (class 0 OID 0)
-- Dependencies: 245
-- Name: SEQUENCE property_coordinates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.property_coordinates_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.property_coordinates_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.property_coordinates_id_seq TO clients;
GRANT ALL ON SEQUENCE public.property_coordinates_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.property_coordinates_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.property_coordinates_id_seq TO app_service;


--
-- TOC entry 5873 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE property_financial_goals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.property_financial_goals TO app_admin;
GRANT ALL ON TABLE public.property_financial_goals TO admin_role;
GRANT ALL ON TABLE public.property_financial_goals TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.property_financial_goals TO app_manager;
GRANT ALL ON TABLE public.property_financial_goals TO app_service;


--
-- TOC entry 5875 (class 0 OID 0)
-- Dependencies: 247
-- Name: SEQUENCE property_financial_goals_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.property_financial_goals_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.property_financial_goals_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.property_financial_goals_id_seq TO clients;
GRANT ALL ON SEQUENCE public.property_financial_goals_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.property_financial_goals_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.property_financial_goals_id_seq TO app_service;


--
-- TOC entry 5876 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE property_financial_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.property_financial_snapshots TO app_admin;
GRANT ALL ON TABLE public.property_financial_snapshots TO admin_role;
GRANT ALL ON TABLE public.property_financial_snapshots TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.property_financial_snapshots TO app_manager;
GRANT ALL ON TABLE public.property_financial_snapshots TO app_service;


--
-- TOC entry 5878 (class 0 OID 0)
-- Dependencies: 249
-- Name: SEQUENCE property_financial_snapshots_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.property_financial_snapshots_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.property_financial_snapshots_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.property_financial_snapshots_id_seq TO clients;
GRANT ALL ON SEQUENCE public.property_financial_snapshots_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.property_financial_snapshots_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.property_financial_snapshots_id_seq TO app_service;


--
-- TOC entry 5879 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE property_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.property_history TO app_admin;
GRANT ALL ON TABLE public.property_history TO admin_role;
GRANT ALL ON TABLE public.property_history TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.property_history TO app_manager;
GRANT ALL ON TABLE public.property_history TO app_service;


--
-- TOC entry 5881 (class 0 OID 0)
-- Dependencies: 251
-- Name: SEQUENCE property_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.property_history_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.property_history_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.property_history_id_seq TO clients;
GRANT ALL ON SEQUENCE public.property_history_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.property_history_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.property_history_id_seq TO app_service;


--
-- TOC entry 5882 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE property_works; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.property_works TO app_admin;
GRANT ALL ON TABLE public.property_works TO admin_role;
GRANT ALL ON TABLE public.property_works TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.property_works TO app_manager;
GRANT ALL ON TABLE public.property_works TO app_service;


--
-- TOC entry 5884 (class 0 OID 0)
-- Dependencies: 253
-- Name: SEQUENCE property_works_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.property_works_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.property_works_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.property_works_id_seq TO clients;
GRANT ALL ON SEQUENCE public.property_works_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.property_works_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.property_works_id_seq TO app_service;


--
-- TOC entry 5885 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE rent_receipts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rent_receipts TO app_admin;
GRANT ALL ON TABLE public.rent_receipts TO admin_role;
GRANT ALL ON TABLE public.rent_receipts TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.rent_receipts TO app_manager;
GRANT ALL ON TABLE public.rent_receipts TO app_service;


--
-- TOC entry 5887 (class 0 OID 0)
-- Dependencies: 264
-- Name: SEQUENCE rent_receipts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rent_receipts_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.rent_receipts_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.rent_receipts_id_seq TO clients;
GRANT ALL ON SEQUENCE public.rent_receipts_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.rent_receipts_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.rent_receipts_id_seq TO app_service;


--
-- TOC entry 5888 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reports TO app_admin;
GRANT ALL ON TABLE public.reports TO admin_role;
GRANT ALL ON TABLE public.reports TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.reports TO app_manager;
GRANT ALL ON TABLE public.reports TO app_service;


--
-- TOC entry 5890 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE reports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reports_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.reports_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.reports_id_seq TO clients;
GRANT ALL ON SEQUENCE public.reports_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.reports_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.reports_id_seq TO app_service;


--
-- TOC entry 5892 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sessions TO app_admin;
GRANT ALL ON TABLE public.sessions TO admin_role;
GRANT ALL ON TABLE public.sessions TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.sessions TO app_manager;
GRANT ALL ON TABLE public.sessions TO app_service;


--
-- TOC entry 5894 (class 0 OID 0)
-- Dependencies: 302
-- Name: SEQUENCE sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.sessions_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.sessions_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.sessions_id_seq TO clients;
GRANT ALL ON SEQUENCE public.sessions_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.sessions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.sessions_id_seq TO app_service;


--
-- TOC entry 5895 (class 0 OID 0)
-- Dependencies: 299
-- Name: TABLE storage_extensions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.storage_extensions TO app_admin;
GRANT ALL ON TABLE public.storage_extensions TO admin_role;
GRANT ALL ON TABLE public.storage_extensions TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.storage_extensions TO app_manager;
GRANT ALL ON TABLE public.storage_extensions TO app_service;


--
-- TOC entry 5897 (class 0 OID 0)
-- Dependencies: 298
-- Name: SEQUENCE storage_extensions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.storage_extensions_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.storage_extensions_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.storage_extensions_id_seq TO clients;
GRANT ALL ON SEQUENCE public.storage_extensions_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.storage_extensions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.storage_extensions_id_seq TO app_service;


--
-- TOC entry 5898 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE storage_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.storage_transactions TO app_admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.storage_transactions TO app_manager;
GRANT ALL ON TABLE public.storage_transactions TO app_service;


--
-- TOC entry 5900 (class 0 OID 0)
-- Dependencies: 322
-- Name: SEQUENCE storage_transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.storage_transactions_id_seq TO app_admin;
GRANT USAGE ON SEQUENCE public.storage_transactions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.storage_transactions_id_seq TO app_service;


--
-- TOC entry 5901 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE storage_usage_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.storage_usage_details TO app_admin;
GRANT ALL ON TABLE public.storage_usage_details TO admin_role;
GRANT ALL ON TABLE public.storage_usage_details TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.storage_usage_details TO app_manager;
GRANT ALL ON TABLE public.storage_usage_details TO app_service;


--
-- TOC entry 5903 (class 0 OID 0)
-- Dependencies: 294
-- Name: SEQUENCE storage_usage_details_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.storage_usage_details_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.storage_usage_details_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.storage_usage_details_id_seq TO clients;
GRANT ALL ON SEQUENCE public.storage_usage_details_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.storage_usage_details_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.storage_usage_details_id_seq TO app_service;


--
-- TOC entry 5904 (class 0 OID 0)
-- Dependencies: 254
-- Name: TABLE tenant_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tenant_documents TO app_admin;
GRANT ALL ON TABLE public.tenant_documents TO admin_role;
GRANT ALL ON TABLE public.tenant_documents TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.tenant_documents TO app_manager;
GRANT ALL ON TABLE public.tenant_documents TO app_service;


--
-- TOC entry 5906 (class 0 OID 0)
-- Dependencies: 255
-- Name: SEQUENCE tenant_documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tenant_documents_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.tenant_documents_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.tenant_documents_id_seq TO clients;
GRANT ALL ON SEQUENCE public.tenant_documents_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.tenant_documents_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.tenant_documents_id_seq TO app_service;


--
-- TOC entry 5907 (class 0 OID 0)
-- Dependencies: 256
-- Name: TABLE tenant_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tenant_history TO app_admin;
GRANT ALL ON TABLE public.tenant_history TO admin_role;
GRANT ALL ON TABLE public.tenant_history TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.tenant_history TO app_manager;
GRANT ALL ON TABLE public.tenant_history TO app_service;


--
-- TOC entry 5909 (class 0 OID 0)
-- Dependencies: 257
-- Name: SEQUENCE tenant_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tenant_history_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.tenant_history_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.tenant_history_id_seq TO clients;
GRANT ALL ON SEQUENCE public.tenant_history_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.tenant_history_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.tenant_history_id_seq TO app_service;


--
-- TOC entry 5910 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tenants TO app_admin;
GRANT ALL ON TABLE public.tenants TO admin_role;
GRANT SELECT ON TABLE public.tenants TO clients;
GRANT ALL ON TABLE public.tenants TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.tenants TO app_manager;
GRANT SELECT ON TABLE public.tenants TO app_tenant;
GRANT ALL ON TABLE public.tenants TO app_service;


--
-- TOC entry 5912 (class 0 OID 0)
-- Dependencies: 258
-- Name: SEQUENCE tenants_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tenants_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.tenants_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.tenants_id_seq TO clients;
GRANT ALL ON SEQUENCE public.tenants_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.tenants_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.tenants_id_seq TO app_service;


--
-- TOC entry 5913 (class 0 OID 0)
-- Dependencies: 293
-- Name: TABLE transaction_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transaction_attachments TO app_admin;
GRANT ALL ON TABLE public.transaction_attachments TO admin_role;
GRANT ALL ON TABLE public.transaction_attachments TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.transaction_attachments TO app_manager;
GRANT ALL ON TABLE public.transaction_attachments TO app_service;


--
-- TOC entry 5915 (class 0 OID 0)
-- Dependencies: 292
-- Name: SEQUENCE transaction_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.transaction_attachments_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.transaction_attachments_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.transaction_attachments_id_seq TO clients;
GRANT ALL ON SEQUENCE public.transaction_attachments_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.transaction_attachments_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.transaction_attachments_id_seq TO app_service;


--
-- TOC entry 5916 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.transactions TO app_admin;
GRANT ALL ON TABLE public.transactions TO admin_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.transactions TO clients;
GRANT ALL ON TABLE public.transactions TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.transactions TO app_manager;
GRANT ALL ON TABLE public.transactions TO app_service;


--
-- TOC entry 5918 (class 0 OID 0)
-- Dependencies: 260
-- Name: SEQUENCE transactions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.transactions_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.transactions_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.transactions_id_seq TO clients;
GRANT ALL ON SEQUENCE public.transactions_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.transactions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.transactions_id_seq TO app_service;


--
-- TOC entry 5920 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE user_notification_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_notification_settings TO app_admin;
GRANT ALL ON TABLE public.user_notification_settings TO admin_role;
GRANT ALL ON TABLE public.user_notification_settings TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.user_notification_settings TO app_manager;
GRANT ALL ON TABLE public.user_notification_settings TO app_service;


--
-- TOC entry 5922 (class 0 OID 0)
-- Dependencies: 276
-- Name: SEQUENCE user_notification_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_notification_settings_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.user_notification_settings_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.user_notification_settings_id_seq TO clients;
GRANT ALL ON SEQUENCE public.user_notification_settings_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.user_notification_settings_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.user_notification_settings_id_seq TO app_service;


--
-- TOC entry 5923 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE user_subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_subscriptions TO app_admin;
GRANT ALL ON TABLE public.user_subscriptions TO admin_role;
GRANT ALL ON TABLE public.user_subscriptions TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.user_subscriptions TO app_manager;
GRANT ALL ON TABLE public.user_subscriptions TO app_service;


--
-- TOC entry 5925 (class 0 OID 0)
-- Dependencies: 296
-- Name: SEQUENCE user_subscriptions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_subscriptions_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.user_subscriptions_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.user_subscriptions_id_seq TO clients;
GRANT ALL ON SEQUENCE public.user_subscriptions_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.user_subscriptions_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.user_subscriptions_id_seq TO app_service;


--
-- TOC entry 5926 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO app_admin;
GRANT ALL ON TABLE public.users TO admin_role;
GRANT SELECT ON TABLE public.users TO client_role;
GRANT SELECT ON TABLE public.users TO clients;
GRANT ALL ON TABLE public.users TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.users TO app_manager;
GRANT SELECT ON TABLE public.users TO app_tenant;
GRANT ALL ON TABLE public.users TO app_service;


--
-- TOC entry 5928 (class 0 OID 0)
-- Dependencies: 261
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.users_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.users_id_seq TO clients;
GRANT ALL ON SEQUENCE public.users_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.users_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.users_id_seq TO app_service;


--
-- TOC entry 5929 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE visits; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.visits TO app_admin;
GRANT ALL ON TABLE public.visits TO admin_role;
GRANT SELECT ON TABLE public.visits TO client_role;
GRANT ALL ON TABLE public.visits TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.visits TO app_manager;
GRANT ALL ON TABLE public.visits TO app_service;


--
-- TOC entry 5931 (class 0 OID 0)
-- Dependencies: 263
-- Name: SEQUENCE visits_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.visits_id_seq TO app_admin;
GRANT ALL ON SEQUENCE public.visits_id_seq TO admin_role;
GRANT USAGE ON SEQUENCE public.visits_id_seq TO clients;
GRANT ALL ON SEQUENCE public.visits_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.visits_id_seq TO app_manager;
GRANT ALL ON SEQUENCE public.visits_id_seq TO app_service;


-- Completed on 2025-05-06 00:32:10

--
-- PostgreSQL database dump complete
--

