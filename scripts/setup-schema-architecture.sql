-- Script pour configurer l'architecture par schéma
-- Exécuter ce script en tant qu'administrateur PostgreSQL

-- Étape 1: Nettoyer les schémas existants (si nécessaire)
DROP SCHEMA IF EXISTS template CASCADE;
DROP SCHEMA IF EXISTS admin_views CASCADE;
DROP SCHEMA IF EXISTS client_31 CASCADE;

-- Étape 2: Créer le schéma template qui servira de modèle pour tous les clients
CREATE SCHEMA template;

-- Étape 3: Créer les tables du schéma template (sans données)
-- Créer les tables principales dans le schéma template
CREATE TABLE template.properties (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    units INTEGER,
    bedrooms INTEGER,
    floors INTEGER,
    bathrooms INTEGER, 
    toilets INTEGER,
    energy_class TEXT,
    energy_emissions TEXT,
    living_area INTEGER,
    land_area INTEGER,
    has_parking BOOLEAN,
    has_terrace BOOLEAN,
    has_garage BOOLEAN,
    has_outbuilding BOOLEAN,
    has_balcony BOOLEAN,
    has_elevator BOOLEAN,
    has_cellar BOOLEAN,
    has_garden BOOLEAN,
    is_new_construction BOOLEAN,
    purchase_price NUMERIC,
    monthly_rent NUMERIC,
    monthly_expenses NUMERIC,
    loan_amount NUMERIC,
    monthly_loan_payment NUMERIC,
    loan_duration INTEGER,
    status TEXT,
    construction_year INTEGER,
    purchase_date TIMESTAMP,
    rooms INTEGER,
    isNewConstruction BOOLEAN,
    images JSONB,
    user_id INTEGER NOT NULL,
    area INTEGER[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE template.tenants (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    property_id INTEGER NOT NULL REFERENCES template.properties(id),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE template.transactions (
    id SERIAL PRIMARY KEY,
    amount NUMERIC NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL,
    type TEXT NOT NULL,
    property_id INTEGER REFERENCES template.properties(id),
    tenant_id INTEGER REFERENCES template.tenants(id),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE template.documents (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    property_id INTEGER REFERENCES template.properties(id),
    tenant_id INTEGER REFERENCES template.tenants(id),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ajouter d'autres tables selon vos besoins...

-- Étape 4: Créer le schéma admin_views pour les vues d'administration
CREATE SCHEMA admin_views;

-- Étape 5: Créer une fonction pour générer automatiquement un schéma client
CREATE OR REPLACE FUNCTION public.create_client_schema(p_user_id INTEGER)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Étape 6: Créer une fonction pour configurer l'environnement utilisateur
CREATE OR REPLACE FUNCTION public.setup_user_environment(user_id INTEGER) 
RETURNS VOID AS $$
DECLARE
    search_path_value TEXT;
    user_role TEXT;
BEGIN
    -- Récupérer le rôle de l'utilisateur
    SELECT role INTO user_role FROM public.users WHERE id = user_id;
    
    IF user_role = 'admin' THEN
        -- L'administrateur a accès à tout
        search_path_value := 'public, admin_views';
    ELSE
        -- Récupérer le nom du schéma pour cet utilisateur
        search_path_value := 'client_' || user_id::TEXT || ', public';
    END IF;
    
    -- Définir le search_path
    EXECUTE 'SET search_path TO ' || search_path_value;
    
    -- Définir l'ID utilisateur courant (pour compatibilité)
    PERFORM set_config('app.user_id', user_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Étape 7: Créer un déclencheur pour créer automatiquement un schéma lors de l'inscription
CREATE OR REPLACE FUNCTION public.create_schema_for_new_client()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'clients' THEN
        PERFORM public.create_client_schema(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_client_schema
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.create_schema_for_new_client();

-- Étape 8: Appliquer le schéma pour les clients existants
DO $$
DECLARE
    client_record RECORD;
BEGIN
    FOR client_record IN 
        SELECT id FROM public.users WHERE role = 'clients'
    LOOP
        PERFORM public.create_client_schema(client_record.id);
    END LOOP;
END
$$;

-- Étape 9: Créer une vue de mapping des schémas
CREATE TABLE IF NOT EXISTS public.schema_mapping (
    schema_name TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Remplir la table de mapping
INSERT INTO public.schema_mapping (schema_name, user_id)
SELECT DISTINCT ON (schema_name)
    'client_' || id AS schema_name,
    id AS user_id
FROM public.users
WHERE role = 'clients'
ON CONFLICT (schema_name) DO NOTHING;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Configuration de l''architecture par schéma terminée avec succès!';
END
$$; 