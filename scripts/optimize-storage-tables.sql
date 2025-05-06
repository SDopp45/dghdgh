-- Script pour optimiser les tables de stockage

-- 1. Tables de stockage dans le schéma public (partagé)

-- Plans de stockage disponibles
CREATE TABLE IF NOT EXISTS public.storage_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    storage_limit BIGINT NOT NULL, -- en octets
    price_monthly NUMERIC(10,2),
    price_yearly NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    features JSONB, -- fonctionnalités incluses
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Quotas globaux et limites
CREATE TABLE IF NOT EXISTS public.storage_quotas (
    id SERIAL PRIMARY KEY,
    resource_type TEXT NOT NULL, -- 'document', 'image', etc.
    size_limit BIGINT, -- taille max par ressource
    count_limit INTEGER, -- nombre max de ressources
    applies_to TEXT, -- 'all', 'free', 'premium'
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Table de stockage dans le schéma template (à copier pour chaque client)

-- Utilisation du stockage par client
CREATE TABLE template.storage_usage (
    id SERIAL PRIMARY KEY,
    resource_type TEXT NOT NULL, -- 'document', 'image', 'property', etc.
    resource_id INTEGER NOT NULL, -- ID de la ressource
    filename TEXT, -- nom du fichier s'il y a lieu
    file_path TEXT, -- chemin du fichier
    file_type TEXT, -- type MIME
    size_bytes BIGINT NOT NULL, -- taille en octets
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP -- pour soft delete
);

-- 3. Propager la table storage_usage au schéma client existant
CREATE TABLE client_31.storage_usage (LIKE template.storage_usage INCLUDING ALL);

-- 4. Vue admin pour la table storage_usage
CREATE OR REPLACE VIEW admin_views.storage_usage_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.storage_usage;

-- 5. Ajouter des données d'exemple dans les tables publiques

-- Exemples de plans de stockage
INSERT INTO public.storage_plans (name, description, storage_limit, price_monthly, price_yearly, features)
VALUES 
('Gratuit', 'Plan gratuit avec stockage limité', 536870912, 0, 0, '{"max_properties": 3, "image_enhancement": false}'::jsonb),
('Standard', 'Plan standard pour les propriétaires', 5368709120, 9.99, 99.99, '{"max_properties": 15, "image_enhancement": true}'::jsonb),
('Professionnel', 'Plan avancé pour les professionnels', 53687091200, 29.99, 299.99, '{"max_properties": -1, "image_enhancement": true, "ai_assistant": true}'::jsonb);

-- Exemples de quotas
INSERT INTO public.storage_quotas (resource_type, size_limit, count_limit, applies_to)
VALUES 
('document', 10485760, 50, 'free'), -- 10MB max par document, 50 documents max pour les comptes gratuits
('image', 5242880, 20, 'free'),      -- 5MB max par image, 20 images max pour les comptes gratuits
('document', 52428800, -1, 'premium'), -- 50MB max par document, nombre illimité pour les comptes premium
('image', 20971520, -1, 'premium');     -- 20MB max par image, nombre illimité pour les comptes premium 