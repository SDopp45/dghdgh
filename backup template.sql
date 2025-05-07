--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-07 19:01:23

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
-- TOC entry 6 (class 2615 OID 27263)
-- Name: template; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA template;


ALTER SCHEMA template OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 28191)
-- Name: folders_id_seq; Type: SEQUENCE; Schema: template; Owner: postgres
--

CREATE SEQUENCE template.folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE template.folders_id_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 292 (class 1259 OID 28181)
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
-- TOC entry 297 (class 1259 OID 28221)
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
-- TOC entry 296 (class 1259 OID 28209)
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
-- TOC entry 276 (class 1259 OID 27944)
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
-- TOC entry 272 (class 1259 OID 27881)
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
-- TOC entry 277 (class 1259 OID 27946)
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
-- TOC entry 273 (class 1259 OID 27898)
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
-- TOC entry 278 (class 1259 OID 27948)
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
-- TOC entry 274 (class 1259 OID 27917)
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
-- TOC entry 279 (class 1259 OID 27950)
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
-- TOC entry 275 (class 1259 OID 27935)
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
-- TOC entry 287 (class 1259 OID 28154)
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
-- TOC entry 286 (class 1259 OID 28139)
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
-- TOC entry 289 (class 1259 OID 28166)
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
-- TOC entry 288 (class 1259 OID 28156)
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
-- TOC entry 284 (class 1259 OID 28095)
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
-- TOC entry 281 (class 1259 OID 28068)
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
-- TOC entry 245 (class 1259 OID 27313)
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
-- TOC entry 244 (class 1259 OID 27312)
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
-- TOC entry 5786 (class 0 OID 0)
-- Dependencies: 244
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.documents_id_seq OWNED BY template.documents.id;


--
-- TOC entry 249 (class 1259 OID 27437)
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
-- TOC entry 248 (class 1259 OID 27436)
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
-- TOC entry 5787 (class 0 OID 0)
-- Dependencies: 248
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.feedbacks_id_seq OWNED BY template.feedbacks.id;


--
-- TOC entry 291 (class 1259 OID 28179)
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
-- TOC entry 290 (class 1259 OID 28168)
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
-- TOC entry 283 (class 1259 OID 28093)
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
-- TOC entry 280 (class 1259 OID 28060)
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
-- TOC entry 295 (class 1259 OID 28207)
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
-- TOC entry 294 (class 1259 OID 28193)
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
-- TOC entry 271 (class 1259 OID 27826)
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
-- TOC entry 251 (class 1259 OID 27458)
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
-- TOC entry 250 (class 1259 OID 27457)
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
-- TOC entry 5788 (class 0 OID 0)
-- Dependencies: 250
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.form_submissions_id_seq OWNED BY template.form_submissions.id;


--
-- TOC entry 270 (class 1259 OID 27774)
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
-- TOC entry 299 (class 1259 OID 28240)
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
-- TOC entry 298 (class 1259 OID 28223)
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
-- TOC entry 301 (class 1259 OID 28253)
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
-- TOC entry 300 (class 1259 OID 28242)
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
-- TOC entry 247 (class 1259 OID 27414)
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
-- TOC entry 246 (class 1259 OID 27413)
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
-- TOC entry 5789 (class 0 OID 0)
-- Dependencies: 246
-- Name: maintenance_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.maintenance_requests_id_seq OWNED BY template.maintenance_requests.id;


--
-- TOC entry 311 (class 1259 OID 28342)
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
-- TOC entry 310 (class 1259 OID 28309)
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
-- TOC entry 313 (class 1259 OID 28361)
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
-- TOC entry 312 (class 1259 OID 28344)
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
-- TOC entry 315 (class 1259 OID 28376)
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
-- TOC entry 314 (class 1259 OID 28363)
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
-- TOC entry 317 (class 1259 OID 28396)
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
-- TOC entry 316 (class 1259 OID 28378)
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
-- TOC entry 319 (class 1259 OID 28412)
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
-- TOC entry 318 (class 1259 OID 28398)
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
-- TOC entry 239 (class 1259 OID 27265)
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
-- TOC entry 238 (class 1259 OID 27264)
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
-- TOC entry 5790 (class 0 OID 0)
-- Dependencies: 238
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.properties_id_seq OWNED BY template.properties.id;


--
-- TOC entry 263 (class 1259 OID 27565)
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
-- TOC entry 262 (class 1259 OID 27564)
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
-- TOC entry 5791 (class 0 OID 0)
-- Dependencies: 262
-- Name: property_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_analyses_id_seq OWNED BY template.property_analyses.id;


--
-- TOC entry 261 (class 1259 OID 27549)
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
-- TOC entry 260 (class 1259 OID 27548)
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
-- TOC entry 5792 (class 0 OID 0)
-- Dependencies: 260
-- Name: property_coordinates_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_coordinates_id_seq OWNED BY template.property_coordinates.id;


--
-- TOC entry 303 (class 1259 OID 28266)
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
-- TOC entry 302 (class 1259 OID 28255)
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
-- TOC entry 305 (class 1259 OID 28278)
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
-- TOC entry 304 (class 1259 OID 28268)
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
-- TOC entry 257 (class 1259 OID 27515)
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
-- TOC entry 256 (class 1259 OID 27514)
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
-- TOC entry 5793 (class 0 OID 0)
-- Dependencies: 256
-- Name: property_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_history_id_seq OWNED BY template.property_history.id;


--
-- TOC entry 259 (class 1259 OID 27532)
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
-- TOC entry 258 (class 1259 OID 27531)
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
-- TOC entry 5794 (class 0 OID 0)
-- Dependencies: 258
-- Name: property_works_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.property_works_id_seq OWNED BY template.property_works.id;


--
-- TOC entry 307 (class 1259 OID 28295)
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
-- TOC entry 306 (class 1259 OID 28280)
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
-- TOC entry 285 (class 1259 OID 28097)
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
-- TOC entry 282 (class 1259 OID 28083)
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
-- TOC entry 269 (class 1259 OID 27750)
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
-- TOC entry 268 (class 1259 OID 27749)
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
-- TOC entry 5795 (class 0 OID 0)
-- Dependencies: 268
-- Name: storage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.storage_usage_id_seq OWNED BY template.storage_usage.id;


--
-- TOC entry 253 (class 1259 OID 27479)
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
-- TOC entry 252 (class 1259 OID 27478)
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
-- TOC entry 5796 (class 0 OID 0)
-- Dependencies: 252
-- Name: tenant_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_documents_id_seq OWNED BY template.tenant_documents.id;


--
-- TOC entry 255 (class 1259 OID 27498)
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
-- TOC entry 254 (class 1259 OID 27497)
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
-- TOC entry 5797 (class 0 OID 0)
-- Dependencies: 254
-- Name: tenant_history_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenant_history_id_seq OWNED BY template.tenant_history.id;


--
-- TOC entry 241 (class 1259 OID 27276)
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
-- TOC entry 240 (class 1259 OID 27275)
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
-- TOC entry 5798 (class 0 OID 0)
-- Dependencies: 240
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.tenants_id_seq OWNED BY template.tenants.id;


--
-- TOC entry 309 (class 1259 OID 28307)
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
-- TOC entry 308 (class 1259 OID 28297)
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
-- TOC entry 243 (class 1259 OID 27292)
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
-- TOC entry 242 (class 1259 OID 27291)
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
-- TOC entry 5799 (class 0 OID 0)
-- Dependencies: 242
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.transactions_id_seq OWNED BY template.transactions.id;


--
-- TOC entry 403 (class 1259 OID 29334)
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
-- TOC entry 404 (class 1259 OID 29346)
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
-- TOC entry 5800 (class 0 OID 0)
-- Dependencies: 404
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: template; Owner: postgres
--

ALTER SEQUENCE template.visits_id_seq OWNED BY template.visits.id;


--
-- TOC entry 5212 (class 2604 OID 27316)
-- Name: documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents ALTER COLUMN id SET DEFAULT nextval('template.documents_id_seq'::regclass);


--
-- TOC entry 5220 (class 2604 OID 27440)
-- Name: feedbacks id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks ALTER COLUMN id SET DEFAULT nextval('template.feedbacks_id_seq'::regclass);


--
-- TOC entry 5223 (class 2604 OID 27461)
-- Name: form_submissions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions ALTER COLUMN id SET DEFAULT nextval('template.form_submissions_id_seq'::regclass);


--
-- TOC entry 5215 (class 2604 OID 27417)
-- Name: maintenance_requests id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests ALTER COLUMN id SET DEFAULT nextval('template.maintenance_requests_id_seq'::regclass);


--
-- TOC entry 5203 (class 2604 OID 27268)
-- Name: properties id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties ALTER COLUMN id SET DEFAULT nextval('template.properties_id_seq'::regclass);


--
-- TOC entry 5244 (class 2604 OID 27568)
-- Name: property_analyses id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses ALTER COLUMN id SET DEFAULT nextval('template.property_analyses_id_seq'::regclass);


--
-- TOC entry 5241 (class 2604 OID 27552)
-- Name: property_coordinates id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates ALTER COLUMN id SET DEFAULT nextval('template.property_coordinates_id_seq'::regclass);


--
-- TOC entry 5233 (class 2604 OID 27518)
-- Name: property_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history ALTER COLUMN id SET DEFAULT nextval('template.property_history_id_seq'::regclass);


--
-- TOC entry 5237 (class 2604 OID 27535)
-- Name: property_works id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works ALTER COLUMN id SET DEFAULT nextval('template.property_works_id_seq'::regclass);


--
-- TOC entry 5247 (class 2604 OID 27753)
-- Name: storage_usage id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage ALTER COLUMN id SET DEFAULT nextval('template.storage_usage_id_seq'::regclass);


--
-- TOC entry 5226 (class 2604 OID 27482)
-- Name: tenant_documents id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents ALTER COLUMN id SET DEFAULT nextval('template.tenant_documents_id_seq'::regclass);


--
-- TOC entry 5229 (class 2604 OID 27501)
-- Name: tenant_history id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history ALTER COLUMN id SET DEFAULT nextval('template.tenant_history_id_seq'::regclass);


--
-- TOC entry 5206 (class 2604 OID 27279)
-- Name: tenants id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants ALTER COLUMN id SET DEFAULT nextval('template.tenants_id_seq'::regclass);


--
-- TOC entry 5209 (class 2604 OID 27295)
-- Name: transactions id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions ALTER COLUMN id SET DEFAULT nextval('template.transactions_id_seq'::regclass);


--
-- TOC entry 5401 (class 2604 OID 29347)
-- Name: visits id; Type: DEFAULT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits ALTER COLUMN id SET DEFAULT nextval('template.visits_id_seq'::regclass);


--
-- TOC entry 5731 (class 0 OID 27881)
-- Dependencies: 272
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 5732 (class 0 OID 27898)
-- Dependencies: 273
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 5733 (class 0 OID 27917)
-- Dependencies: 274
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 5734 (class 0 OID 27935)
-- Dependencies: 275
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5745 (class 0 OID 28139)
-- Dependencies: 286
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5747 (class 0 OID 28156)
-- Dependencies: 288
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 5740 (class 0 OID 28068)
-- Dependencies: 281
-- Data for Name: contracts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5708 (class 0 OID 27313)
-- Dependencies: 245
-- Data for Name: documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5712 (class 0 OID 27437)
-- Dependencies: 249
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5749 (class 0 OID 28168)
-- Dependencies: 290
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5751 (class 0 OID 28181)
-- Dependencies: 292
-- Data for Name: folders; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5739 (class 0 OID 28060)
-- Dependencies: 280
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 5753 (class 0 OID 28193)
-- Dependencies: 294
-- Data for Name: form_fields; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5730 (class 0 OID 27826)
-- Dependencies: 271
-- Data for Name: form_responses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 5714 (class 0 OID 27458)
-- Dependencies: 251
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5755 (class 0 OID 28209)
-- Dependencies: 296
-- Data for Name: forms; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 5729 (class 0 OID 27774)
-- Dependencies: 270
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5757 (class 0 OID 28223)
-- Dependencies: 298
-- Data for Name: links; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 5759 (class 0 OID 28242)
-- Dependencies: 300
-- Data for Name: maintenance; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 5710 (class 0 OID 27414)
-- Dependencies: 247
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5769 (class 0 OID 28309)
-- Dependencies: 310
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 5771 (class 0 OID 28344)
-- Dependencies: 312
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 5773 (class 0 OID 28363)
-- Dependencies: 314
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5775 (class 0 OID 28378)
-- Dependencies: 316
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 5777 (class 0 OID 28398)
-- Dependencies: 318
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5702 (class 0 OID 27265)
-- Dependencies: 239
-- Data for Name: properties; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.properties (id, name, address, description, type, units, bedrooms, floors, bathrooms, toilets, energy_class, energy_emissions, living_area, land_area, has_parking, has_terrace, has_garage, has_outbuilding, has_balcony, has_elevator, has_cellar, has_garden, is_new_construction, purchase_price, monthly_rent, monthly_expenses, loan_amount, monthly_loan_payment, loan_duration, status, construction_year, purchase_date, rooms, isnewconstruction, images, user_id, area, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5726 (class 0 OID 27565)
-- Dependencies: 263
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5724 (class 0 OID 27549)
-- Dependencies: 261
-- Data for Name: property_coordinates; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_coordinates (id, property_id, latitude, longitude, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5761 (class 0 OID 28255)
-- Dependencies: 302
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5763 (class 0 OID 28268)
-- Dependencies: 304
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 5720 (class 0 OID 27515)
-- Dependencies: 257
-- Data for Name: property_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5722 (class 0 OID 27532)
-- Dependencies: 259
-- Data for Name: property_works; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5765 (class 0 OID 28280)
-- Dependencies: 306
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5741 (class 0 OID 28083)
-- Dependencies: 282
-- Data for Name: reports; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5728 (class 0 OID 27750)
-- Dependencies: 269
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 5716 (class 0 OID 27479)
-- Dependencies: 253
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5718 (class 0 OID 27498)
-- Dependencies: 255
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5704 (class 0 OID 27276)
-- Dependencies: 241
-- Data for Name: tenants; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5767 (class 0 OID 28297)
-- Dependencies: 308
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at, user_id) FROM stdin;
\.


--
-- TOC entry 5706 (class 0 OID 27292)
-- Dependencies: 243
-- Data for Name: transactions; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5779 (class 0 OID 29334)
-- Dependencies: 403
-- Data for Name: visits; Type: TABLE DATA; Schema: template; Owner: postgres
--

COPY template.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5801 (class 0 OID 0)
-- Dependencies: 276
-- Name: ai_conversations_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_conversations_id_seq', 1, false);


--
-- TOC entry 5802 (class 0 OID 0)
-- Dependencies: 277
-- Name: ai_messages_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_messages_id_seq', 1, false);


--
-- TOC entry 5803 (class 0 OID 0)
-- Dependencies: 278
-- Name: ai_suggestions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.ai_suggestions_id_seq', 1, false);


--
-- TOC entry 5804 (class 0 OID 0)
-- Dependencies: 279
-- Name: analysis_configs_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.analysis_configs_id_seq', 1, false);


--
-- TOC entry 5805 (class 0 OID 0)
-- Dependencies: 287
-- Name: automatic_reminders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.automatic_reminders_id_seq', 1, false);


--
-- TOC entry 5806 (class 0 OID 0)
-- Dependencies: 289
-- Name: contract_parties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contract_parties_id_seq', 1, false);


--
-- TOC entry 5807 (class 0 OID 0)
-- Dependencies: 284
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.contracts_id_seq', 1, false);


--
-- TOC entry 5808 (class 0 OID 0)
-- Dependencies: 244
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.documents_id_seq', 1, false);


--
-- TOC entry 5809 (class 0 OID 0)
-- Dependencies: 248
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.feedbacks_id_seq', 1, false);


--
-- TOC entry 5810 (class 0 OID 0)
-- Dependencies: 291
-- Name: financial_entries_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.financial_entries_id_seq', 1, false);


--
-- TOC entry 5811 (class 0 OID 0)
-- Dependencies: 293
-- Name: folders_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.folders_id_seq', 1, false);


--
-- TOC entry 5812 (class 0 OID 0)
-- Dependencies: 283
-- Name: form_field_options_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_field_options_id_seq', 1, false);


--
-- TOC entry 5813 (class 0 OID 0)
-- Dependencies: 295
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_fields_id_seq', 1, false);


--
-- TOC entry 5814 (class 0 OID 0)
-- Dependencies: 250
-- Name: form_submissions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.form_submissions_id_seq', 1, false);


--
-- TOC entry 5815 (class 0 OID 0)
-- Dependencies: 297
-- Name: forms_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.forms_id_seq', 1, false);


--
-- TOC entry 5816 (class 0 OID 0)
-- Dependencies: 299
-- Name: links_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.links_id_seq', 1, false);


--
-- TOC entry 5817 (class 0 OID 0)
-- Dependencies: 301
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_id_seq', 1, false);


--
-- TOC entry 5818 (class 0 OID 0)
-- Dependencies: 246
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.maintenance_requests_id_seq', 1, false);


--
-- TOC entry 5819 (class 0 OID 0)
-- Dependencies: 311
-- Name: pdf_configuration_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_configuration_id_seq', 1, false);


--
-- TOC entry 5820 (class 0 OID 0)
-- Dependencies: 313
-- Name: pdf_document_preferences_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_document_preferences_id_seq', 1, false);


--
-- TOC entry 5821 (class 0 OID 0)
-- Dependencies: 315
-- Name: pdf_logos_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_logos_id_seq', 1, false);


--
-- TOC entry 5822 (class 0 OID 0)
-- Dependencies: 317
-- Name: pdf_templates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_templates_id_seq', 1, false);


--
-- TOC entry 5823 (class 0 OID 0)
-- Dependencies: 319
-- Name: pdf_themes_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.pdf_themes_id_seq', 1, false);


--
-- TOC entry 5824 (class 0 OID 0)
-- Dependencies: 238
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.properties_id_seq', 9, true);


--
-- TOC entry 5825 (class 0 OID 0)
-- Dependencies: 262
-- Name: property_analyses_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_analyses_id_seq', 1, false);


--
-- TOC entry 5826 (class 0 OID 0)
-- Dependencies: 260
-- Name: property_coordinates_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_coordinates_id_seq', 5, true);


--
-- TOC entry 5827 (class 0 OID 0)
-- Dependencies: 303
-- Name: property_financial_goals_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_goals_id_seq', 1, false);


--
-- TOC entry 5828 (class 0 OID 0)
-- Dependencies: 305
-- Name: property_financial_snapshots_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_financial_snapshots_id_seq', 1, false);


--
-- TOC entry 5829 (class 0 OID 0)
-- Dependencies: 256
-- Name: property_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_history_id_seq', 1, false);


--
-- TOC entry 5830 (class 0 OID 0)
-- Dependencies: 258
-- Name: property_works_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.property_works_id_seq', 1, false);


--
-- TOC entry 5831 (class 0 OID 0)
-- Dependencies: 307
-- Name: rent_receipts_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.rent_receipts_id_seq', 1, false);


--
-- TOC entry 5832 (class 0 OID 0)
-- Dependencies: 285
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.reports_id_seq', 1, false);


--
-- TOC entry 5833 (class 0 OID 0)
-- Dependencies: 268
-- Name: storage_usage_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.storage_usage_id_seq', 1, false);


--
-- TOC entry 5834 (class 0 OID 0)
-- Dependencies: 252
-- Name: tenant_documents_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_documents_id_seq', 1, false);


--
-- TOC entry 5835 (class 0 OID 0)
-- Dependencies: 254
-- Name: tenant_history_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenant_history_id_seq', 1, false);


--
-- TOC entry 5836 (class 0 OID 0)
-- Dependencies: 240
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.tenants_id_seq', 1, false);


--
-- TOC entry 5837 (class 0 OID 0)
-- Dependencies: 309
-- Name: transaction_attachments_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transaction_attachments_id_seq', 1, false);


--
-- TOC entry 5838 (class 0 OID 0)
-- Dependencies: 242
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.transactions_id_seq', 1, false);


--
-- TOC entry 5839 (class 0 OID 0)
-- Dependencies: 404
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: template; Owner: postgres
--

SELECT pg_catalog.setval('template.visits_id_seq', 7, true);


--
-- TOC entry 5455 (class 2606 OID 27895)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5462 (class 2606 OID 27912)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5465 (class 2606 OID 27929)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 5472 (class 2606 OID 27941)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5483 (class 2606 OID 28150)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5487 (class 2606 OID 28165)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5478 (class 2606 OID 28082)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5426 (class 2606 OID 27322)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5430 (class 2606 OID 27446)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5489 (class 2606 OID 28178)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5491 (class 2606 OID 28190)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5476 (class 2606 OID 28067)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5493 (class 2606 OID 28205)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 5496 (class 2606 OID 28203)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5453 (class 2606 OID 27834)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5432 (class 2606 OID 27467)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5498 (class 2606 OID 28217)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5500 (class 2606 OID 28219)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 5448 (class 2606 OID 27797)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5450 (class 2606 OID 27799)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5503 (class 2606 OID 28237)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 5507 (class 2606 OID 28252)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 5428 (class 2606 OID 27425)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5522 (class 2606 OID 28341)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 5524 (class 2606 OID 28359)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 5527 (class 2606 OID 28357)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5529 (class 2606 OID 28375)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 5531 (class 2606 OID 28395)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5533 (class 2606 OID 28411)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 5420 (class 2606 OID 27274)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5444 (class 2606 OID 27574)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5442 (class 2606 OID 27558)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5509 (class 2606 OID 28265)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 5511 (class 2606 OID 28277)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5438 (class 2606 OID 27525)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5440 (class 2606 OID 27542)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5513 (class 2606 OID 28290)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5480 (class 2606 OID 28092)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5446 (class 2606 OID 27758)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5434 (class 2606 OID 27486)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5436 (class 2606 OID 27508)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5422 (class 2606 OID 27285)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5519 (class 2606 OID 28305)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5424 (class 2606 OID 27301)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5535 (class 2606 OID 29349)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5456 (class 1259 OID 27896)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 5457 (class 1259 OID 27897)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON template.ai_conversations USING btree (user_id);


--
-- TOC entry 5458 (class 1259 OID 27914)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 5459 (class 1259 OID 27916)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON template.ai_messages USING btree (conversation_id);


--
-- TOC entry 5460 (class 1259 OID 27915)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON template.ai_messages USING btree (created_at);


--
-- TOC entry 5463 (class 1259 OID 27913)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON template.ai_messages USING btree (user_id);


--
-- TOC entry 5466 (class 1259 OID 27931)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 5467 (class 1259 OID 27934)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON template.ai_suggestions USING btree (property_id);


--
-- TOC entry 5468 (class 1259 OID 27932)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON template.ai_suggestions USING btree (type);


--
-- TOC entry 5469 (class 1259 OID 27930)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 5470 (class 1259 OID 27933)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON template.ai_suggestions USING btree (user_id);


--
-- TOC entry 5473 (class 1259 OID 27942)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON template.analysis_configs USING btree (property_id);


--
-- TOC entry 5474 (class 1259 OID 27943)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON template.analysis_configs USING btree (user_id);


--
-- TOC entry 5481 (class 1259 OID 28152)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON template.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 5484 (class 1259 OID 28153)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON template.automatic_reminders USING btree (status);


--
-- TOC entry 5485 (class 1259 OID 28151)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON template.automatic_reminders USING btree (user_id);


--
-- TOC entry 5494 (class 1259 OID 28206)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON template.form_fields USING btree (link_id);


--
-- TOC entry 5451 (class 1259 OID 27835)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON template.form_responses USING btree (form_id);


--
-- TOC entry 5501 (class 1259 OID 28220)
-- Name: forms_user_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON template.forms USING btree (user_id);


--
-- TOC entry 5504 (class 1259 OID 28238)
-- Name: links_profile_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON template.links USING btree (profile_id);


--
-- TOC entry 5505 (class 1259 OID 28239)
-- Name: links_type_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX links_type_idx ON template.links USING btree (type);


--
-- TOC entry 5525 (class 1259 OID 28360)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON template.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 5514 (class 1259 OID 28292)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON template.rent_receipts USING btree (property_id);


--
-- TOC entry 5515 (class 1259 OID 28294)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON template.rent_receipts USING btree (status);


--
-- TOC entry 5516 (class 1259 OID 28291)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON template.rent_receipts USING btree (tenant_id);


--
-- TOC entry 5517 (class 1259 OID 28293)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON template.rent_receipts USING btree (transaction_id);


--
-- TOC entry 5520 (class 1259 OID 28306)
-- Name: transaction_attachments_transaction_id_idx; Type: INDEX; Schema: template; Owner: postgres
--

CREATE INDEX transaction_attachments_transaction_id_idx ON template.transaction_attachments USING btree (transaction_id);


--
-- TOC entry 5539 (class 2606 OID 27323)
-- Name: documents documents_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5540 (class 2606 OID 27328)
-- Name: documents documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.documents
    ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5543 (class 2606 OID 27452)
-- Name: feedbacks feedbacks_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5544 (class 2606 OID 27447)
-- Name: feedbacks feedbacks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.feedbacks
    ADD CONSTRAINT feedbacks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5545 (class 2606 OID 27468)
-- Name: form_submissions form_submissions_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5546 (class 2606 OID 27473)
-- Name: form_submissions form_submissions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.form_submissions
    ADD CONSTRAINT form_submissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5541 (class 2606 OID 27426)
-- Name: maintenance_requests maintenance_requests_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5542 (class 2606 OID 27431)
-- Name: maintenance_requests maintenance_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.maintenance_requests
    ADD CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5553 (class 2606 OID 27575)
-- Name: property_analyses property_analyses_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_analyses
    ADD CONSTRAINT property_analyses_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5552 (class 2606 OID 27559)
-- Name: property_coordinates property_coordinates_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_coordinates
    ADD CONSTRAINT property_coordinates_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5550 (class 2606 OID 27526)
-- Name: property_history property_history_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_history
    ADD CONSTRAINT property_history_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5551 (class 2606 OID 27543)
-- Name: property_works property_works_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.property_works
    ADD CONSTRAINT property_works_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5547 (class 2606 OID 27492)
-- Name: tenant_documents tenant_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES template.documents(id);


--
-- TOC entry 5548 (class 2606 OID 27487)
-- Name: tenant_documents tenant_documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_documents
    ADD CONSTRAINT tenant_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5549 (class 2606 OID 27509)
-- Name: tenant_history tenant_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenant_history
    ADD CONSTRAINT tenant_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


--
-- TOC entry 5536 (class 2606 OID 27286)
-- Name: tenants tenants_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.tenants
    ADD CONSTRAINT tenants_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5537 (class 2606 OID 27302)
-- Name: transactions transactions_property_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES template.properties(id);


--
-- TOC entry 5538 (class 2606 OID 27307)
-- Name: transactions transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: template; Owner: postgres
--

ALTER TABLE ONLY template.transactions
    ADD CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES template.tenants(id);


-- Completed on 2025-05-07 19:01:23

--
-- PostgreSQL database dump complete
--

