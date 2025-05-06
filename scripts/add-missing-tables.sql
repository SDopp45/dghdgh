-- Script pour ajouter les tables manquantes au schéma template

-- Table des visites
CREATE TABLE template.visits (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES template.properties(id),
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    visitor_phone TEXT,
    visit_date TIMESTAMP NOT NULL,
    status TEXT,
    notes TEXT,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des demandes de maintenance
CREATE TABLE template.maintenance_requests (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES template.properties(id),
    tenant_id INTEGER REFERENCES template.tenants(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT,
    reported_date TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_date TIMESTAMP,
    resolution_notes TEXT,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des feedbacks
CREATE TABLE template.feedbacks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES template.tenants(id),
    property_id INTEGER REFERENCES template.properties(id),
    rating INTEGER,
    comment TEXT,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des soumissions de formulaire
CREATE TABLE template.form_submissions (
    id SERIAL PRIMARY KEY,
    form_id TEXT NOT NULL,
    form_data JSONB NOT NULL,
    property_id INTEGER REFERENCES template.properties(id),
    tenant_id INTEGER REFERENCES template.tenants(id),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des documents des locataires
CREATE TABLE template.tenant_documents (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES template.tenants(id),
    document_id INTEGER NOT NULL REFERENCES template.documents(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table de l'historique des locataires
CREATE TABLE template.tenant_history (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES template.tenants(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    event_date TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table de l'historique des propriétés
CREATE TABLE template.property_history (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES template.properties(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    event_date TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des travaux sur les propriétés
CREATE TABLE template.property_works (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES template.properties(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    cost NUMERIC,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    contractor TEXT,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des coordonnées des propriétés
CREATE TABLE template.property_coordinates (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES template.properties(id),
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des analyses de propriétés
CREATE TABLE template.property_analyses (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES template.properties(id),
    analysis_type TEXT NOT NULL,
    analysis_data JSONB,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
); 