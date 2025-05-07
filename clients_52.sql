--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-07 19:17:42

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
-- TOC entry 9 (class 2615 OID 29427)
-- Name: client_52; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA client_52;


ALTER SCHEMA client_52 OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 406 (class 1259 OID 29428)
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
-- TOC entry 410 (class 1259 OID 29475)
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
-- TOC entry 412 (class 1259 OID 29504)
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
-- TOC entry 413 (class 1259 OID 29522)
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
-- TOC entry 426 (class 1259 OID 29657)
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
-- TOC entry 427 (class 1259 OID 29672)
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
-- TOC entry 424 (class 1259 OID 29632)
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
-- TOC entry 411 (class 1259 OID 29494)
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
-- TOC entry 415 (class 1259 OID 29543)
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
-- TOC entry 428 (class 1259 OID 29682)
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
-- TOC entry 429 (class 1259 OID 29693)
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
-- TOC entry 423 (class 1259 OID 29624)
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
-- TOC entry 430 (class 1259 OID 29703)
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
-- TOC entry 445 (class 1259 OID 29932)
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
-- TOC entry 416 (class 1259 OID 29553)
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
-- TOC entry 431 (class 1259 OID 29717)
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
-- TOC entry 444 (class 1259 OID 29907)
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
-- TOC entry 432 (class 1259 OID 29729)
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
-- TOC entry 433 (class 1259 OID 29746)
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
-- TOC entry 414 (class 1259 OID 29531)
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
-- TOC entry 438 (class 1259 OID 29803)
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
-- TOC entry 440 (class 1259 OID 29845)
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
-- TOC entry 441 (class 1259 OID 29862)
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
-- TOC entry 442 (class 1259 OID 29875)
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
-- TOC entry 443 (class 1259 OID 29893)
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
-- TOC entry 407 (class 1259 OID 29445)
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
-- TOC entry 422 (class 1259 OID 29614)
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
-- TOC entry 421 (class 1259 OID 29604)
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
-- TOC entry 434 (class 1259 OID 29757)
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
-- TOC entry 435 (class 1259 OID 29768)
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
-- TOC entry 419 (class 1259 OID 29582)
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
-- TOC entry 420 (class 1259 OID 29593)
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
-- TOC entry 436 (class 1259 OID 29778)
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
-- TOC entry 425 (class 1259 OID 29647)
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
-- TOC entry 439 (class 1259 OID 29836)
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
-- TOC entry 417 (class 1259 OID 29563)
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
-- TOC entry 418 (class 1259 OID 29571)
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
-- TOC entry 408 (class 1259 OID 29455)
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
-- TOC entry 437 (class 1259 OID 29793)
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
-- TOC entry 409 (class 1259 OID 29465)
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
-- TOC entry 446 (class 1259 OID 29941)
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
-- TOC entry 5683 (class 0 OID 29428)
-- Dependencies: 406
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_conversations (id, user_id, title, created_at, updated_at, status, category, context) FROM stdin;
\.


--
-- TOC entry 5687 (class 0 OID 29475)
-- Dependencies: 410
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_messages (id, user_id, role, content, metadata, conversation_id, created_at, is_urgent, model_id, provider) FROM stdin;
\.


--
-- TOC entry 5689 (class 0 OID 29504)
-- Dependencies: 412
-- Data for Name: ai_suggestions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.ai_suggestions (id, user_id, property_id, type, suggestion, data, created_at, status) FROM stdin;
\.


--
-- TOC entry 5690 (class 0 OID 29522)
-- Dependencies: 413
-- Data for Name: analysis_configs; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.analysis_configs (id, property_id, user_id, name, period_type, period_value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5703 (class 0 OID 29657)
-- Dependencies: 426
-- Data for Name: automatic_reminders; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.automatic_reminders (id, user_id, type, related_entity_type, related_entity_id, title, message, next_trigger_date, days_in_advance, recurrence, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5704 (class 0 OID 29672)
-- Dependencies: 427
-- Data for Name: contract_parties; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.contract_parties (id, contract_id, party_id, party_type, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 5701 (class 0 OID 29632)
-- Dependencies: 424
-- Data for Name: contracts; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.contracts (id, name, type, status, start_date, end_date, property_id, document_id, signature_required, automated_renewal, renewal_date, notification_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5688 (class 0 OID 29494)
-- Dependencies: 411
-- Data for Name: documents; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.documents (id, name, file_path, file_type, file_size, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5692 (class 0 OID 29543)
-- Dependencies: 415
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.feedbacks (id, tenant_id, property_id, rating, comment, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5705 (class 0 OID 29682)
-- Dependencies: 428
-- Data for Name: financial_entries; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.financial_entries (id, property_id, date, type, category, amount, recurring, frequency, description, source, related_entity_id, related_entity_type, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5706 (class 0 OID 29693)
-- Dependencies: 429
-- Data for Name: folders; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.folders (id, name, parent_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5700 (class 0 OID 29624)
-- Dependencies: 423
-- Data for Name: form_field_options; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_field_options (id, form_field_id, value, "position", created_at) FROM stdin;
\.


--
-- TOC entry 5707 (class 0 OID 29703)
-- Dependencies: 430
-- Data for Name: form_fields; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_fields (id, link_id, field_id, type, label, required, "position", created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5722 (class 0 OID 29932)
-- Dependencies: 445
-- Data for Name: form_responses; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_responses (id, form_id, data, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 5693 (class 0 OID 29553)
-- Dependencies: 416
-- Data for Name: form_submissions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.form_submissions (id, form_id, form_data, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5708 (class 0 OID 29717)
-- Dependencies: 431
-- Data for Name: forms; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.forms (id, user_id, title, slug, fields, created_at) FROM stdin;
\.


--
-- TOC entry 5721 (class 0 OID 29907)
-- Dependencies: 444
-- Data for Name: link_profiles; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.link_profiles (id, user_id, slug, title, description, background_color, text_color, accent_color, logo_url, views, background_image, background_pattern, button_style, button_radius, font_family, animation, custom_css, custom_theme, background_saturation, background_hue_rotate, background_sepia, background_grayscale, background_invert, background_color_filter, background_color_filter_opacity, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5709 (class 0 OID 29729)
-- Dependencies: 432
-- Data for Name: links; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.links (id, profile_id, title, url, icon, enabled, clicks, "position", featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at, button_style, user_id) FROM stdin;
\.


--
-- TOC entry 5710 (class 0 OID 29746)
-- Dependencies: 433
-- Data for Name: maintenance; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.maintenance (id, title, description, "propertyId", status, "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- TOC entry 5691 (class 0 OID 29531)
-- Dependencies: 414
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.maintenance_requests (id, property_id, tenant_id, title, description, status, priority, reported_date, resolved_date, resolution_notes, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5715 (class 0 OID 29803)
-- Dependencies: 438
-- Data for Name: pdf_configuration; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_configuration (id, user_id, name, orientation, page_size, margin_top, margin_right, margin_bottom, margin_left, show_header, show_footer, show_pagination, show_filters, default_config, created_at, updated_at, header_color, alternate_row_color, items_per_page, custom_title, font_family, font_size, theme_id, accent_color, watermark_text, watermark_opacity, compress_pdf, password_protection, print_background, scale, landscape_scaling, header_height, footer_height) FROM stdin;
\.


--
-- TOC entry 5717 (class 0 OID 29845)
-- Dependencies: 440
-- Data for Name: pdf_document_preferences; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_document_preferences (id, configuration_id, document_type, enabled, display_order, created_at, updated_at, columns_to_display, custom_title, table_header_color, table_text_color, table_alternate_color, max_items_per_page, user_id) FROM stdin;
\.


--
-- TOC entry 5718 (class 0 OID 29862)
-- Dependencies: 441
-- Data for Name: pdf_logos; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_logos (id, user_id, name, image_data, width, height, is_default, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5719 (class 0 OID 29875)
-- Dependencies: 442
-- Data for Name: pdf_templates; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_templates (id, name, type, columns, header_template, footer_template, is_default, created_at, updated_at, header_color, alternate_row_color, items_per_page, default_title, border_style, border_width, row_padding, cell_alignment, user_id) FROM stdin;
\.


--
-- TOC entry 5720 (class 0 OID 29893)
-- Dependencies: 443
-- Data for Name: pdf_themes; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.pdf_themes (id, name, header_color, alternate_row_color, text_color, border_color, accent_color, background_color, font_family, is_default, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5684 (class 0 OID 29445)
-- Dependencies: 407
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
-- TOC entry 5699 (class 0 OID 29614)
-- Dependencies: 422
-- Data for Name: property_analyses; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_analyses (id, property_id, analysis_type, analysis_data, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5698 (class 0 OID 29604)
-- Dependencies: 421
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
-- TOC entry 5711 (class 0 OID 29757)
-- Dependencies: 434
-- Data for Name: property_financial_goals; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_financial_goals (id, property_id, title, type, target_value, current_value, deadline, status, notes, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5712 (class 0 OID 29768)
-- Dependencies: 435
-- Data for Name: property_financial_snapshots; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_financial_snapshots (id, property_id, snapshot_date, gross_rental_yield, net_rental_yield, cash_on_cash_return, cap_rate, monthly_cash_flow, total_income, total_expenses, occupancy_rate, metadata, created_at, user_id) FROM stdin;
\.


--
-- TOC entry 5696 (class 0 OID 29582)
-- Dependencies: 419
-- Data for Name: property_history; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_history (id, property_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5697 (class 0 OID 29593)
-- Dependencies: 420
-- Data for Name: property_works; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.property_works (id, property_id, title, description, status, cost, start_date, end_date, contractor, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5713 (class 0 OID 29778)
-- Dependencies: 436
-- Data for Name: rent_receipts; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.rent_receipts (id, tenant_id, property_id, transaction_id, amount, charges, rent_period_start, rent_period_end, status, document_id, created_at, updated_at, user_id) FROM stdin;
\.


--
-- TOC entry 5702 (class 0 OID 29647)
-- Dependencies: 425
-- Data for Name: reports; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.reports (id, title, description, "reportType", "fileUrl", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5716 (class 0 OID 29836)
-- Dependencies: 439
-- Data for Name: storage_usage; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.storage_usage (id, resource_type, resource_id, filename, file_path, file_type, size_bytes, created_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 5694 (class 0 OID 29563)
-- Dependencies: 417
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenant_documents (id, tenant_id, document_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5695 (class 0 OID 29571)
-- Dependencies: 418
-- Data for Name: tenant_history; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenant_history (id, tenant_id, event_type, event_data, event_date, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5685 (class 0 OID 29455)
-- Dependencies: 408
-- Data for Name: tenants; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.tenants (id, first_name, last_name, email, phone, property_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5714 (class 0 OID 29793)
-- Dependencies: 437
-- Data for Name: transaction_attachments; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.transaction_attachments (id, transaction_id, file_name, file_path, file_type, file_size, uploaded_at, user_id) FROM stdin;
\.


--
-- TOC entry 5686 (class 0 OID 29465)
-- Dependencies: 409
-- Data for Name: transactions; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.transactions (id, amount, description, date, type, property_id, tenant_id, user_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5723 (class 0 OID 29941)
-- Dependencies: 446
-- Data for Name: visits; Type: TABLE DATA; Schema: client_52; Owner: postgres
--

COPY client_52.visits (id, first_name, last_name, email, phone, datetime, visit_type, property_id, manual_address, message, status, rating, feedback, archived, agent_id, source, documents, reminder_sent, created_at, updated_at) FROM stdin;
7	doulma	dfdf	gf@gmail.com	06 59 81 88 49	2025-05-23 16:00:00	virtual	\N	vbv	\N	pending	\N	\N	f	52	manual	{}	f	2025-05-07 16:58:31.770558	2025-05-07 16:58:31.770558
\.


--
-- TOC entry 5420 (class 2606 OID 29442)
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 5433 (class 2606 OID 29489)
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5438 (class 2606 OID 29516)
-- Name: ai_suggestions ai_suggestions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.ai_suggestions
    ADD CONSTRAINT ai_suggestions_pkey PRIMARY KEY (id);


--
-- TOC entry 5445 (class 2606 OID 29528)
-- Name: analysis_configs analysis_configs_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.analysis_configs
    ADD CONSTRAINT analysis_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5474 (class 2606 OID 29668)
-- Name: automatic_reminders automatic_reminders_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.automatic_reminders
    ADD CONSTRAINT automatic_reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5478 (class 2606 OID 29681)
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5469 (class 2606 OID 29646)
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5436 (class 2606 OID 29503)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5451 (class 2606 OID 29552)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5480 (class 2606 OID 29692)
-- Name: financial_entries financial_entries_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.financial_entries
    ADD CONSTRAINT financial_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5482 (class 2606 OID 29702)
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5467 (class 2606 OID 29631)
-- Name: form_field_options form_field_options_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_field_options
    ADD CONSTRAINT form_field_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5484 (class 2606 OID 29715)
-- Name: form_fields form_fields_link_id_field_id_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_fields
    ADD CONSTRAINT form_fields_link_id_field_id_key UNIQUE (link_id, field_id);


--
-- TOC entry 5487 (class 2606 OID 29713)
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5533 (class 2606 OID 29939)
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- TOC entry 5453 (class 2606 OID 29562)
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5489 (class 2606 OID 29725)
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- TOC entry 5491 (class 2606 OID 29727)
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- TOC entry 5528 (class 2606 OID 29929)
-- Name: link_profiles link_profiles_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.link_profiles
    ADD CONSTRAINT link_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5530 (class 2606 OID 29931)
-- Name: link_profiles link_profiles_slug_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.link_profiles
    ADD CONSTRAINT link_profiles_slug_key UNIQUE (slug);


--
-- TOC entry 5494 (class 2606 OID 29743)
-- Name: links links_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- TOC entry 5498 (class 2606 OID 29756)
-- Name: maintenance maintenance_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.maintenance
    ADD CONSTRAINT maintenance_pkey PRIMARY KEY (id);


--
-- TOC entry 5449 (class 2606 OID 29542)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5513 (class 2606 OID 29835)
-- Name: pdf_configuration pdf_configuration_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_configuration
    ADD CONSTRAINT pdf_configuration_pkey PRIMARY KEY (id);


--
-- TOC entry 5517 (class 2606 OID 29860)
-- Name: pdf_document_preferences pdf_document_preferences_configuration_id_document_type_key; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_configuration_id_document_type_key UNIQUE (configuration_id, document_type);


--
-- TOC entry 5520 (class 2606 OID 29858)
-- Name: pdf_document_preferences pdf_document_preferences_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_document_preferences
    ADD CONSTRAINT pdf_document_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5522 (class 2606 OID 29874)
-- Name: pdf_logos pdf_logos_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_logos
    ADD CONSTRAINT pdf_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 5524 (class 2606 OID 29892)
-- Name: pdf_templates pdf_templates_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_templates
    ADD CONSTRAINT pdf_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5526 (class 2606 OID 29906)
-- Name: pdf_themes pdf_themes_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.pdf_themes
    ADD CONSTRAINT pdf_themes_pkey PRIMARY KEY (id);


--
-- TOC entry 5424 (class 2606 OID 29454)
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- TOC entry 5465 (class 2606 OID 29623)
-- Name: property_analyses property_analyses_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_analyses
    ADD CONSTRAINT property_analyses_pkey PRIMARY KEY (id);


--
-- TOC entry 5463 (class 2606 OID 29613)
-- Name: property_coordinates property_coordinates_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_coordinates
    ADD CONSTRAINT property_coordinates_pkey PRIMARY KEY (id);


--
-- TOC entry 5500 (class 2606 OID 29767)
-- Name: property_financial_goals property_financial_goals_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_financial_goals
    ADD CONSTRAINT property_financial_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 5502 (class 2606 OID 29777)
-- Name: property_financial_snapshots property_financial_snapshots_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_financial_snapshots
    ADD CONSTRAINT property_financial_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 5459 (class 2606 OID 29592)
-- Name: property_history property_history_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_history
    ADD CONSTRAINT property_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5461 (class 2606 OID 29603)
-- Name: property_works property_works_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.property_works
    ADD CONSTRAINT property_works_pkey PRIMARY KEY (id);


--
-- TOC entry 5504 (class 2606 OID 29788)
-- Name: rent_receipts rent_receipts_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.rent_receipts
    ADD CONSTRAINT rent_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5471 (class 2606 OID 29656)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5515 (class 2606 OID 29844)
-- Name: storage_usage storage_usage_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.storage_usage
    ADD CONSTRAINT storage_usage_pkey PRIMARY KEY (id);


--
-- TOC entry 5455 (class 2606 OID 29570)
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5457 (class 2606 OID 29581)
-- Name: tenant_history tenant_history_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenant_history
    ADD CONSTRAINT tenant_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5426 (class 2606 OID 29464)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 5510 (class 2606 OID 29801)
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5428 (class 2606 OID 29474)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5535 (class 2606 OID 29955)
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: client_52; Owner: postgres
--

ALTER TABLE ONLY client_52.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- TOC entry 5421 (class 1259 OID 29443)
-- Name: ai_conversations_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx ON client_52.ai_conversations USING btree (user_id);


--
-- TOC entry 5422 (class 1259 OID 29444)
-- Name: ai_conversations_user_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_conversations_user_id_idx1 ON client_52.ai_conversations USING btree (user_id);


--
-- TOC entry 5429 (class 1259 OID 29491)
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx ON client_52.ai_messages USING btree (conversation_id);


--
-- TOC entry 5430 (class 1259 OID 29493)
-- Name: ai_messages_conversation_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_conversation_id_idx1 ON client_52.ai_messages USING btree (conversation_id);


--
-- TOC entry 5431 (class 1259 OID 29492)
-- Name: ai_messages_created_at_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_created_at_idx ON client_52.ai_messages USING btree (created_at);


--
-- TOC entry 5434 (class 1259 OID 29490)
-- Name: ai_messages_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_messages_user_id_idx ON client_52.ai_messages USING btree (user_id);


--
-- TOC entry 5439 (class 1259 OID 29518)
-- Name: ai_suggestions_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx ON client_52.ai_suggestions USING btree (property_id);


--
-- TOC entry 5440 (class 1259 OID 29521)
-- Name: ai_suggestions_property_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_property_id_idx1 ON client_52.ai_suggestions USING btree (property_id);


--
-- TOC entry 5441 (class 1259 OID 29519)
-- Name: ai_suggestions_type_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_type_idx ON client_52.ai_suggestions USING btree (type);


--
-- TOC entry 5442 (class 1259 OID 29517)
-- Name: ai_suggestions_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx ON client_52.ai_suggestions USING btree (user_id);


--
-- TOC entry 5443 (class 1259 OID 29520)
-- Name: ai_suggestions_user_id_idx1; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX ai_suggestions_user_id_idx1 ON client_52.ai_suggestions USING btree (user_id);


--
-- TOC entry 5446 (class 1259 OID 29529)
-- Name: analysis_configs_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX analysis_configs_property_id_idx ON client_52.analysis_configs USING btree (property_id);


--
-- TOC entry 5447 (class 1259 OID 29530)
-- Name: analysis_configs_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX analysis_configs_user_id_idx ON client_52.analysis_configs USING btree (user_id);


--
-- TOC entry 5472 (class 1259 OID 29670)
-- Name: automatic_reminders_next_trigger_date_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_next_trigger_date_idx ON client_52.automatic_reminders USING btree (next_trigger_date);


--
-- TOC entry 5475 (class 1259 OID 29671)
-- Name: automatic_reminders_status_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_status_idx ON client_52.automatic_reminders USING btree (status);


--
-- TOC entry 5476 (class 1259 OID 29669)
-- Name: automatic_reminders_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX automatic_reminders_user_id_idx ON client_52.automatic_reminders USING btree (user_id);


--
-- TOC entry 5485 (class 1259 OID 29716)
-- Name: form_fields_link_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX form_fields_link_id_idx ON client_52.form_fields USING btree (link_id);


--
-- TOC entry 5531 (class 1259 OID 29940)
-- Name: form_responses_form_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX form_responses_form_id_idx ON client_52.form_responses USING btree (form_id);


--
-- TOC entry 5492 (class 1259 OID 29728)
-- Name: forms_user_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX forms_user_id_idx ON client_52.forms USING btree (user_id);


--
-- TOC entry 5495 (class 1259 OID 29744)
-- Name: links_profile_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX links_profile_id_idx ON client_52.links USING btree (profile_id);


--
-- TOC entry 5496 (class 1259 OID 29745)
-- Name: links_type_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX links_type_idx ON client_52.links USING btree (type);


--
-- TOC entry 5518 (class 1259 OID 29861)
-- Name: pdf_document_preferences_configuration_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX pdf_document_preferences_configuration_id_idx ON client_52.pdf_document_preferences USING btree (configuration_id);


--
-- TOC entry 5505 (class 1259 OID 29790)
-- Name: rent_receipts_property_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_property_id_idx ON client_52.rent_receipts USING btree (property_id);


--
-- TOC entry 5506 (class 1259 OID 29792)
-- Name: rent_receipts_status_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_status_idx ON client_52.rent_receipts USING btree (status);


--
-- TOC entry 5507 (class 1259 OID 29789)
-- Name: rent_receipts_tenant_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_tenant_id_idx ON client_52.rent_receipts USING btree (tenant_id);


--
-- TOC entry 5508 (class 1259 OID 29791)
-- Name: rent_receipts_transaction_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX rent_receipts_transaction_id_idx ON client_52.rent_receipts USING btree (transaction_id);


--
-- TOC entry 5511 (class 1259 OID 29802)
-- Name: transaction_attachments_transaction_id_idx; Type: INDEX; Schema: client_52; Owner: postgres
--

CREATE INDEX transaction_attachments_transaction_id_idx ON client_52.transaction_attachments USING btree (transaction_id);


-- Completed on 2025-05-07 19:17:42

--
-- PostgreSQL database dump complete
--

