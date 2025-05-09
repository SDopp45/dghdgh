--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-09 22:52:11

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
-- TOC entry 10 (class 2615 OID 39859)
-- Name: client_109; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_109;


ALTER SCHEMA client_109 OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 544 (class 1259 OID 39905)
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
-- TOC entry 503 (class 1259 OID 39864)
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
-- TOC entry 545 (class 1259 OID 39922)
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
-- TOC entry 505 (class 1259 OID 39866)
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
-- TOC entry 547 (class 1259 OID 39951)
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
-- TOC entry 506 (class 1259 OID 39867)
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
-- TOC entry 549 (class 1259 OID 39979)
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
-- TOC entry 507 (class 1259 OID 39868)
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
-- TOC entry 566 (class 1259 OID 40165)
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
-- TOC entry 523 (class 1259 OID 39884)
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
-- TOC entry 575 (class 1259 OID 40268)
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
-- TOC entry 530 (class 1259 OID 39891)
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
-- TOC entry 567 (class 1259 OID 40180)
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
-- TOC entry 524 (class 1259 OID 39885)
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
-- TOC entry 560 (class 1259 OID 40091)
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
-- TOC entry 518 (class 1259 OID 39879)
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
-- TOC entry 573 (class 1259 OID 40246)
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
-- TOC entry 529 (class 1259 OID 39890)
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
-- TOC entry 562 (class 1259 OID 40116)
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
-- TOC entry 572 (class 1259 OID 40237)
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
-- TOC entry 525 (class 1259 OID 39886)
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
-- TOC entry 516 (class 1259 OID 39877)
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
-- TOC entry 510 (class 1259 OID 39871)
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
-- TOC entry 551 (class 1259 OID 39998)
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
-- TOC entry 568 (class 1259 OID 40190)
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
-- TOC entry 526 (class 1259 OID 39887)
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
-- TOC entry 569 (class 1259 OID 40201)
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
-- TOC entry 527 (class 1259 OID 39888)
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
-- TOC entry 559 (class 1259 OID 40083)
-- Name: form_field_options; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.form_field_options (
    id integer DEFAULT nextval('template.form_field_options_id_seq'::regclass) NOT NULL,
    form_field_id integer NOT NULL,
    value character varying(255) NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_109.form_field_options OWNER TO postgres;

--
-- TOC entry 517 (class 1259 OID 39878)
-- Name: form_field_options_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.form_field_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.form_field_options_id_seq OWNER TO postgres;

--
-- TOC entry 570 (class 1259 OID 40211)
-- Name: form_fields; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.form_fields (
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


ALTER TABLE client_109.form_fields OWNER TO postgres;

--
-- TOC entry 528 (class 1259 OID 39889)
-- Name: form_fields_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.form_fields_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.form_fields_id_seq OWNER TO postgres;

--
-- TOC entry 587 (class 1259 OID 40461)
-- Name: form_responses; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.form_responses (
    id integer NOT NULL,
    form_id integer,
    data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address text
);


ALTER TABLE client_109.form_responses OWNER TO postgres;

--
-- TOC entry 511 (class 1259 OID 39872)
-- Name: form_submissions_id_seq; Type: SEQUENCE; Schema: client_109; Owner: postgres
--

CREATE SEQUENCE client_109.form_submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE client_109.form_submissions_id_seq OWNER TO postgres;

--
-- TOC entry 554 (class 1259 OID 40034)
-- Name: form_submissions; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.form_submissions (
    id integer DEFAULT nextval('client_109.form_submissions_id_seq'::regclass) NOT NULL,
    form_id text NOT NULL,
    form_data jsonb NOT NULL,
    property_id integer,
    tenant_id integer,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE client_109.form_submissions OWNER TO postgres;

--
-- TOC entry 571 (class 1259 OID 40225)
-- Name: forms; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.forms (
    id integer DEFAULT nextval('template.forms_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client_109.forms OWNER TO postgres;

--
-- TOC entry 531 (class 1259 OID 39892)
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
-- TOC entry 586 (class 1259 OID 40435)
-- Name: link_profiles; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.link_profiles (
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
    updated_at timestamp without time zone DEFAULT now(),
    is_paused boolean DEFAULT false
);


ALTER TABLE client_109.link_profiles OWNER TO postgres;

--
-- TOC entry 589 (class 1259 OID 40511)
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
-- TOC entry 576 (class 1259 OID 40278)
-- Name: links; Type: TABLE; Schema: client_109; Owner: postgres
--

CREATE TABLE client_109.links (
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


ALTER TABLE client_109.links OWNER TO postgres;

--
-- TOC entry 532 (class 1259 OID 39893)
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
-- TOC entry 574 (class 1259 OID 40256)
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
-- TOC entry 533 (class 1259 OID 39894)
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
-- TOC entry 580 (class 1259 OID 40331)
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
-- TOC entry 537 (class 1259 OID 39898)
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
-- TOC entry 582 (class 1259 OID 40373)
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
-- TOC entry 539 (class 1259 OID 39900)
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
-- TOC entry 583 (class 1259 OID 40390)
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
-- TOC entry 540 (class 1259 OID 39901)
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
-- TOC entry 584 (class 1259 OID 40403)
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
-- TOC entry 541 (class 1259 OID 39902)
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
-- TOC entry 585 (class 1259 OID 40421)
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
-- TOC entry 542 (class 1259 OID 39903)
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
-- TOC entry 501 (class 1259 OID 39862)
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
-- TOC entry 546 (class 1259 OID 39941)
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
-- TOC entry 515 (class 1259 OID 39876)
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
-- TOC entry 558 (class 1259 OID 40073)
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
-- TOC entry 514 (class 1259 OID 39875)
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
-- TOC entry 555 (class 1259 OID 40044)
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
-- TOC entry 577 (class 1259 OID 40295)
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
-- TOC entry 534 (class 1259 OID 39895)
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
-- TOC entry 578 (class 1259 OID 40306)
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
-- TOC entry 535 (class 1259 OID 39896)
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
-- TOC entry 564 (class 1259 OID 40142)
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
-- TOC entry 521 (class 1259 OID 39882)
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
-- TOC entry 565 (class 1259 OID 40152)
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
-- TOC entry 522 (class 1259 OID 39883)
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
-- TOC entry 579 (class 1259 OID 40316)
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
-- TOC entry 536 (class 1259 OID 39897)
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
-- TOC entry 561 (class 1259 OID 40106)
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
-- TOC entry 519 (class 1259 OID 39880)
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
-- TOC entry 563 (class 1259 OID 40132)
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
-- TOC entry 520 (class 1259 OID 39881)
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
-- TOC entry 538 (class 1259 OID 39899)
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
-- TOC entry 581 (class 1259 OID 40364)
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
-- TOC entry 502 (class 1259 OID 39863)
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
-- TOC entry 548 (class 1259 OID 39969)
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
-- TOC entry 504 (class 1259 OID 39865)
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
-- TOC entry 552 (class 1259 OID 40008)
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
-- TOC entry 508 (class 1259 OID 39869)
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
-- TOC entry 553 (class 1259 OID 40022)
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
-- TOC entry 509 (class 1259 OID 39870)
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
-- TOC entry 550 (class 1259 OID 39988)
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
-- TOC entry 557 (class 1259 OID 40064)
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
-- TOC entry 513 (class 1259 OID 39874)
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
-- TOC entry 556 (class 1259 OID 40054)
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
-- TOC entry 512 (class 1259 OID 39873)
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
-- TOC entry 543 (class 1259 OID 39904)
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
-- TOC entry 588 (class 1259 OID 40470)
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
-- TOC entry 6014 (class 0 OID 39905)
-- Dependencies: 544
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 6015 (class 0 OID 39922)
-- Dependencies: 545
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 6017 (class 0 OID 39951)
-- Dependencies: 547
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 6019 (class 0 OID 39979)
-- Dependencies: 549
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6036 (class 0 OID 40165)
-- Dependencies: 566
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6045 (class 0 OID 40268)
-- Dependencies: 575
-- Data for Name: company_info; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.company_info (id, user_id, company_name, company_address, company_phone, company_email, company_website, company_siret, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6037 (class 0 OID 40180)
-- Dependencies: 567
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6030 (class 0 OID 40091)
-- Dependencies: 560
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6043 (class 0 OID 40246)
-- Dependencies: 573
-- Data for Name: document_templates; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.document_templates (id, name, document_type, field_mappings, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6032 (class 0 OID 40116)
-- Dependencies: 562
-- Data for Name: documents; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.documents (id, title, type, file_path, original_name, template, user_id, folder_id, parent_id, template_id, created_at, updated_at, form_data, content, theme, file_size) FROM stdin;
\.


--
-- TOC entry 6042 (class 0 OID 40237)
-- Dependencies: 572
-- Data for Name: documents_access_log; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.documents_access_log (id, document_id, user_id, access_type, accessed_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 6021 (class 0 OID 39998)
-- Dependencies: 551
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 6038 (class 0 OID 40190)
-- Dependencies: 568
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6039 (class 0 OID 40201)
-- Dependencies: 569
-- Data for Name: folders; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6029 (class 0 OID 40083)
-- Dependencies: 559
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 6040 (class 0 OID 40211)
-- Dependencies: 570
-- Data for Name: form_fields; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6057 (class 0 OID 40461)
-- Dependencies: 587
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 6024 (class 0 OID 40034)
-- Dependencies: 554
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6041 (class 0 OID 40225)
-- Dependencies: 571
-- Data for Name: forms; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 6056 (class 0 OID 40435)
-- Dependencies: 586
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at, is_paused) FROM stdin;
1	109	testuser	Mon Profilererer	Tous mes liens professionnels en un seul endroit	#ffffff	#1f2937	#10b981	\N	316	\N	\N	neon	8	Space Grotesk	shimmer	\N	\N	100	0	0	0	0	\N	0.3	2025-05-09 15:31:55.174092	2025-05-09 22:50:58.66091	f
\.


--
-- TOC entry 6046 (class 0 OID 40278)
-- Dependencies: 576
-- Data for Name: links; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
4	1	ds	https://facebook.com	\N	t	0	1	f	\N	\N	\N	link	\N	2025-05-09 16:18:28.668873	2025-05-09 22:32:43.970842	\N	\N
6	1	teste	https://facebook.com	\N	t	0	3	f	\N	\N	\N	link	\N	2025-05-09 16:57:51.719065	2025-05-09 22:32:43.972928	\N	\N
5	1	teste		\N	t	2	2	f	\N	\N	\N	form	[{"id": "1746800667341", "type": "text", "label": "fdfdf", "options": [], "required": false}]	2025-05-09 16:24:35.773261	2025-05-09 22:32:43.975706	\N	\N
7	1	gfgfdg		\N	t	2	4	f	\N	\N	\N	form	[{"id": "1746822758200", "type": "text", "label": "dfgfg", "options": [], "required": false}]	2025-05-09 22:32:43.978672	2025-05-09 22:34:51.412815	\N	\N
3	1	hgh		\N	t	31	0	f	\N	\N	\N	form	[{"id": "1746798282696", "type": "textarea", "label": "hgh", "options": [], "required": false}, {"id": "1746798297814", "type": "text", "label": "ghgh", "options": [], "required": false}]	2025-05-09 15:45:10.808826	2025-05-09 22:51:43.92083	\N	\N
\.


--
-- TOC entry 6044 (class 0 OID 40256)
-- Dependencies: 574
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id, total_cost, document_id, document_ids, reported_by) FROM stdin;
\.


--
-- TOC entry 6050 (class 0 OID 40331)
-- Dependencies: 580
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 6052 (class 0 OID 40373)
-- Dependencies: 582
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 6053 (class 0 OID 40390)
-- Dependencies: 583
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6054 (class 0 OID 40403)
-- Dependencies: 584
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 6055 (class 0 OID 40421)
-- Dependencies: 585
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6016 (class 0 OID 39941)
-- Dependencies: 546
-- Data for Name: properties; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6028 (class 0 OID 40073)
-- Dependencies: 558
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6025 (class 0 OID 40044)
-- Dependencies: 555
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6047 (class 0 OID 40295)
-- Dependencies: 577
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6048 (class 0 OID 40306)
-- Dependencies: 578
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 6034 (class 0 OID 40142)
-- Dependencies: 564
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_history (id, property_id, field, old_value, new_value, change_type, user_id, created_at, metadata) FROM stdin;
\.


--
-- TOC entry 6035 (class 0 OID 40152)
-- Dependencies: 565
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.property_works (id, property_id, title, description, type, status, start_date, end_date, estimated_cost, actual_cost, contractor, priority, documents, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6049 (class 0 OID 40316)
-- Dependencies: 579
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 6031 (class 0 OID 40106)
-- Dependencies: 561
-- Data for Name: reports; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6033 (class 0 OID 40132)
-- Dependencies: 563
-- Data for Name: storage_transactions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.storage_transactions (id, user_id, previous_tier, new_tier, amount_paid, transaction_date, expiration_date, payment_method, payment_reference, status, notes) FROM stdin;
\.


--
-- TOC entry 6051 (class 0 OID 40364)
-- Dependencies: 581
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 6018 (class 0 OID 39969)
-- Dependencies: 548
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenant_documents (id, tenant_id, document_id, document_type, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6022 (class 0 OID 40008)
-- Dependencies: 552
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenant_history (id, rating, feedback, category, tenant_full_name, original_user_id, event_type, event_severity, event_details, documents, bail_status, bail_id, property_name, created_at, created_by, tenant_id, is_orphaned, tenant_info_id, updated_at, updated_by) FROM stdin;
1	4	gh	general	bcvbcvb	\N	general	0	{}	{}	\N	\N	\N	2025-05-09 15:15:56.422066	109	\N	f	\N	2025-05-09 15:15:56.422066	\N
\.


--
-- TOC entry 6023 (class 0 OID 40022)
-- Dependencies: 553
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenants (id, user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, created_at, updated_at, tenant_id, tenant_info_id) FROM stdin;
\.


--
-- TOC entry 6020 (class 0 OID 39988)
-- Dependencies: 550
-- Data for Name: tenants_info; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.tenants_info (id, full_name, email, phone_number, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6027 (class 0 OID 40064)
-- Dependencies: 557
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at) FROM stdin;
\.


--
-- TOC entry 6026 (class 0 OID 40054)
-- Dependencies: 556
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.transactions (id, user_id, property_id, tenant_id, document_id, document_ids, type, category, amount, description, date, status, payment_method, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6058 (class 0 OID 40470)
-- Dependencies: 588
-- Data for Name: visits; Type: TABLE DATA; Schema: client_109; Owner: postgres
--

COPY client_109.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6065 (class 0 OID 0)
-- Dependencies: 503
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.ai_conversations_id_seq', 1, false);


--
-- TOC entry 6066 (class 0 OID 0)
-- Dependencies: 505
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.ai_messages_id_seq', 1, false);


--
-- TOC entry 6067 (class 0 OID 0)
-- Dependencies: 506
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 6068 (class 0 OID 0)
-- Dependencies: 507
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.analysis_configs_id_seq', 1, false);


--
-- TOC entry 6069 (class 0 OID 0)
-- Dependencies: 523
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 6070 (class 0 OID 0)
-- Dependencies: 530
-- Name: company_info_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.company_info_id_seq', 1, false);


--
-- TOC entry 6071 (class 0 OID 0)
-- Dependencies: 524
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.contract_parties_id_seq', 1, false);


--
-- TOC entry 6072 (class 0 OID 0)
-- Dependencies: 518
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.contracts_id_seq', 1, false);


--
-- TOC entry 6073 (class 0 OID 0)
-- Dependencies: 529
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.document_templates_id_seq', 1, false);


--
-- TOC entry 6074 (class 0 OID 0)
-- Dependencies: 525
-- Name: documents_access_log_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.documents_access_log_id_seq', 1, false);


--
-- TOC entry 6075 (class 0 OID 0)
-- Dependencies: 516
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.documents_id_seq', 1, false);


--
-- TOC entry 6076 (class 0 OID 0)
-- Dependencies: 510
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.feedbacks_id_seq', 1, false);


--
-- TOC entry 6077 (class 0 OID 0)
-- Dependencies: 526
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.financial_entries_id_seq', 1, false);


--
-- TOC entry 6078 (class 0 OID 0)
-- Dependencies: 527
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.folders_id_seq', 1, false);


--
-- TOC entry 6079 (class 0 OID 0)
-- Dependencies: 517
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.form_field_options_id_seq', 1, false);


--
-- TOC entry 6080 (class 0 OID 0)
-- Dependencies: 528
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.form_fields_id_seq', 1, false);


--
-- TOC entry 6081 (class 0 OID 0)
-- Dependencies: 511
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.form_submissions_id_seq', 1, false);


--
-- TOC entry 6082 (class 0 OID 0)
-- Dependencies: 531
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.forms_id_seq', 1, false);


--
-- TOC entry 6083 (class 0 OID 0)
-- Dependencies: 589
-- Name: link_profiles_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.link_profiles_id_seq', 1, true);


--
-- TOC entry 6084 (class 0 OID 0)
-- Dependencies: 532
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.links_id_seq', 1, false);


--
-- TOC entry 6085 (class 0 OID 0)
-- Dependencies: 533
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.maintenance_id_seq', 1, false);


--
-- TOC entry 6086 (class 0 OID 0)
-- Dependencies: 537
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 6087 (class 0 OID 0)
-- Dependencies: 539
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 6088 (class 0 OID 0)
-- Dependencies: 540
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_logos_id_seq', 1, false);


--
-- TOC entry 6089 (class 0 OID 0)
-- Dependencies: 541
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_templates_id_seq', 1, false);


--
-- TOC entry 6090 (class 0 OID 0)
-- Dependencies: 542
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.pdf_themes_id_seq', 1, false);


--
-- TOC entry 6091 (class 0 OID 0)
-- Dependencies: 501
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.properties_id_seq', 1, false);


--
-- TOC entry 6092 (class 0 OID 0)
-- Dependencies: 515
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_analyses_id_seq', 1, false);


--
-- TOC entry 6093 (class 0 OID 0)
-- Dependencies: 514
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_coordinates_id_seq', 1, false);


--
-- TOC entry 6094 (class 0 OID 0)
-- Dependencies: 534
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 6095 (class 0 OID 0)
-- Dependencies: 535
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 6096 (class 0 OID 0)
-- Dependencies: 521
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_history_id_seq', 1, false);


--
-- TOC entry 6097 (class 0 OID 0)
-- Dependencies: 522
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.property_works_id_seq', 1, false);


--
-- TOC entry 6098 (class 0 OID 0)
-- Dependencies: 536
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.rent_receipts_id_seq', 1, false);


--
-- TOC entry 6099 (class 0 OID 0)
-- Dependencies: 519
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.reports_id_seq', 1, false);


--
-- TOC entry 6100 (class 0 OID 0)
-- Dependencies: 520
-- Name: storage_transactions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.storage_transactions_id_seq', 1, false);


--
-- TOC entry 6101 (class 0 OID 0)
-- Dependencies: 538
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.storage_usage_id_seq', 1, false);


--
-- TOC entry 6102 (class 0 OID 0)
-- Dependencies: 502
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenant_documents_id_seq', 1, false);


--
-- TOC entry 6103 (class 0 OID 0)
-- Dependencies: 504
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenant_history_id_seq', 1, true);


--
-- TOC entry 6104 (class 0 OID 0)
-- Dependencies: 508
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenants_id_seq', 1, false);


--
-- TOC entry 6105 (class 0 OID 0)
-- Dependencies: 509
-- Name: tenants_info_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.tenants_info_id_seq', 1, false);


--
-- TOC entry 6106 (class 0 OID 0)
-- Dependencies: 513
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 6107 (class 0 OID 0)
-- Dependencies: 512
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.transactions_id_seq', 1, false);


--
-- TOC entry 6108 (class 0 OID 0)
-- Dependencies: 543
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: client_109; Owner: postgres
--

SELECT pg_catalog.setval('client_109.visits_id_seq', 1, false);


--
-- TOC entry 5701 (class 2606 OID 39919)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5708 (class 2606 OID 39936)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5713 (class 2606 OID 39963)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 5722 (class 2606 OID 39985)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5759 (class 2606 OID 40176)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5785 (class 2606 OID 40277)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 5763 (class 2606 OID 40189)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5746 (class 2606 OID 40105)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5781 (class 2606 OID 40255)
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5779 (class 2606 OID 40245)
-- Name: documents_access_log documents_access_log_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.documents_access_log
    ADD CONSTRAINT documents_access_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5750 (class 2606 OID 40131)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5728 (class 2606 OID 40007)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5765 (class 2606 OID 40200)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5767 (class 2606 OID 40210)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5744 (class 2606 OID 40090)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5769 (class 2606 OID 40223)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 5772 (class 2606 OID 40221)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5821 (class 2606 OID 40468)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5734 (class 2606 OID 40043)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5774 (class 2606 OID 40233)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5776 (class 2606 OID 40235)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 5816 (class 2606 OID 40458)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5818 (class 2606 OID 40460)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5787 (class 2606 OID 40292)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 5783 (class 2606 OID 40267)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 5801 (class 2606 OID 40363)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 5805 (class 2606 OID 40388)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 5808 (class 2606 OID 40386)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5810 (class 2606 OID 40402)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 5812 (class 2606 OID 40420)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5814 (class 2606 OID 40434)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 5711 (class 2606 OID 39950)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5742 (class 2606 OID 40082)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5736 (class 2606 OID 40053)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5791 (class 2606 OID 40305)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 5793 (class 2606 OID 40315)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5754 (class 2606 OID 40151)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5756 (class 2606 OID 40164)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5795 (class 2606 OID 40326)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5748 (class 2606 OID 40115)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5752 (class 2606 OID 40141)
-- Name: storage_transactions storage_transactions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.storage_transactions
    ADD CONSTRAINT storage_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5803 (class 2606 OID 40372)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5720 (class 2606 OID 39978)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5730 (class 2606 OID 40021)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5726 (class 2606 OID 39997)
-- Name: tenants_info tenants_info_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenants_info
    ADD CONSTRAINT tenants_info_pkey PRIMARY KEY (id);


--
-- TOC entry 5732 (class 2606 OID 40033)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5740 (class 2606 OID 40072)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5738 (class 2606 OID 40063)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5823 (class 2606 OID 40484)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_109; Owner: postgres
--

ALTER TABLE ONLY client_109.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5702 (class 1259 OID 39920)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_109.ai_conversations USING btree (user_id);


--
-- TOC entry 5703 (class 1259 OID 39921)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_109.ai_conversations USING btree (user_id);


--
-- TOC entry 5704 (class 1259 OID 39938)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_109.ai_messages USING btree (conversation_id);


--
-- TOC entry 5705 (class 1259 OID 39940)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_109.ai_messages USING btree (conversation_id);


--
-- TOC entry 5706 (class 1259 OID 39939)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_109.ai_messages USING btree (created_at);


--
-- TOC entry 5709 (class 1259 OID 39937)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_109.ai_messages USING btree (user_id);


--
-- TOC entry 5714 (class 1259 OID 39965)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_109.ai_suggestions USING btree (property_id);


--
-- TOC entry 5715 (class 1259 OID 39968)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_109.ai_suggestions USING btree (property_id);


--
-- TOC entry 5716 (class 1259 OID 39966)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_109.ai_suggestions USING btree (type);


--
-- TOC entry 5717 (class 1259 OID 39964)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_109.ai_suggestions USING btree (user_id);


--
-- TOC entry 5718 (class 1259 OID 39967)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_109.ai_suggestions USING btree (user_id);


--
-- TOC entry 5723 (class 1259 OID 39986)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_109.analysis_configs USING btree (property_id);


--
-- TOC entry 5724 (class 1259 OID 39987)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_109.analysis_configs USING btree (user_id);


--
-- TOC entry 5757 (class 1259 OID 40178)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_109.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 5760 (class 1259 OID 40179)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_109.automatic_reminders USING btree (status);


--
-- TOC entry 5761 (class 1259 OID 40177)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_109.automatic_reminders USING btree (user_id);


--
-- TOC entry 5770 (class 1259 OID 40224)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON client_109.form_fields USING btree (link_id);


--
-- TOC entry 5819 (class 1259 OID 40469)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_109.form_responses USING btree (form_id);


--
-- TOC entry 5777 (class 1259 OID 40236)
-- Name: forms_user_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON client_109.forms USING btree (user_id);


--
-- TOC entry 5788 (class 1259 OID 40293)
-- Name: links_profile_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON client_109.links USING btree (profile_id);


--
-- TOC entry 5789 (class 1259 OID 40294)
-- Name: links_type_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX links_type_idx ON client_109.links USING btree (type);


--
-- TOC entry 5806 (class 1259 OID 40389)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_109.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 5796 (class 1259 OID 40328)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_109.rent_receipts USING btree (property_id);


--
-- TOC entry 5797 (class 1259 OID 40330)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_109.rent_receipts USING btree (status);


--
-- TOC entry 5798 (class 1259 OID 40327)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_109.rent_receipts USING btree (tenant_id);


--
-- TOC entry 5799 (class 1259 OID 40329)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_109; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_109.rent_receipts USING btree (transaction_id);


--
-- TOC entry 2893 (class 826 OID 39861)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: client_109; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_109 GRANT ALL ON SEQUENCES TO postgres;


--
-- TOC entry 2892 (class 826 OID 39860)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: client_109; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA client_109 GRANT ALL ON TABLES TO postgres;


-- Completed on 2025-05-09 22:52:11

--
-- PostgreSQL database dump complete
--

