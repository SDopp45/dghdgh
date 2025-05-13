-- Ajout d'une table de plans de stockage dans le schéma public
CREATE TABLE IF NOT EXISTS public.storage_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- basic, standard, pro, premium, enterprise
    storage_limit BIGINT NOT NULL, -- en octets
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2) NOT NULL,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajout d'une table d'abonnements de stockage pour les utilisateurs
CREATE TABLE IF NOT EXISTS public.user_storage_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    plan_id INTEGER NOT NULL REFERENCES public.storage_plans(id),
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly' ou 'yearly'
    next_billing_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    payment_method VARCHAR(50),
    payment_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_active_subscription UNIQUE (user_id, is_active)
);

-- Insertion des plans de stockage par défaut
INSERT INTO public.storage_plans (name, storage_limit, price_monthly, price_yearly, features)
VALUES
    ('basic', 5368709120, 0.00, 0.00, '["Stockage de 5 GB", "Formats de fichiers standards", "Support par email"]'),
    ('standard', 10737418240, 9.99, 99.90, '["Stockage de 10 GB", "Formats de fichiers avancés", "Sauvegarde automatique", "Support prioritaire"]'),
    ('pro', 21474836480, 19.99, 199.90, '["Stockage de 20 GB", "Tous les formats de fichiers", "Analyse avancée des données", "Support prioritaire 24/7"]'),
    ('premium', 53687091200, 39.99, 399.90, '["Stockage de 50 GB", "Analyse de documents avancée", "Accès à toutes les fonctionnalités premium", "Support dédié"]'),
    ('enterprise', 107374182400, 79.99, 799.90, '["Stockage de 100 GB", "API dédiée", "Gestion multi-utilisateurs", "Conformité RGPD avancée", "Support prioritaire avec SLA"]')
ON CONFLICT DO NOTHING;

-- Modification de la table users pour ajouter des champs liés au stockage
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 5368709120, -- 5 GB par défaut
ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(50) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS storage_last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fonction pour mettre à jour les informations de stockage d'un utilisateur
CREATE OR REPLACE FUNCTION public.update_user_storage_info(p_user_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_plan_record RECORD;
BEGIN
    -- Récupérer les informations du plan actif de l'utilisateur
    SELECT sp.* 
    INTO v_plan_record
    FROM public.storage_plans sp
    JOIN public.user_storage_subscriptions uss ON sp.id = uss.plan_id
    WHERE uss.user_id = p_user_id AND uss.is_active = TRUE
    LIMIT 1;

    -- Si aucun plan actif trouvé, utiliser le plan basic
    IF NOT FOUND THEN
        SELECT * INTO v_plan_record FROM public.storage_plans WHERE name = 'basic';
    END IF;

    -- Mettre à jour les informations de stockage dans la table users
    UPDATE public.users
    SET storage_limit = v_plan_record.storage_limit,
        storage_tier = v_plan_record.name,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction améliorée pour calculer l'utilisation du stockage par table et par client
CREATE OR REPLACE FUNCTION public.calculate_storage_usage_details(p_client_schema TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    v_user_id INTEGER;
    v_table_name TEXT;
    v_table_size BIGINT;
    v_tables_details JSONB := '[]';
    v_total_db_size BIGINT := 0;
    v_uploads_size BIGINT := 0;
    v_total_size BIGINT := 0;
BEGIN
    -- Extraire l'ID utilisateur du schéma
    v_user_id := SUBSTRING(p_client_schema FROM 'client_([0-9]+)')::INTEGER;

    -- Calculer la taille de chaque table dans le schéma client
    FOR v_table_name, v_table_size IN
        EXECUTE format('
            SELECT 
                c.relname::TEXT, 
                pg_total_relation_size(c.oid)
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = %L
            AND c.relkind = ''r''
        ', p_client_schema)
    LOOP
        -- Ajouter la taille de cette table au total
        v_total_db_size := v_total_db_size + v_table_size;
        
        -- Ajouter les détails de cette table au résultat JSON
        v_tables_details := v_tables_details || jsonb_build_object(
            'table_name', v_table_name,
            'size_bytes', v_table_size,
            'size_formatted', format_bytes(v_table_size)
        );
    END LOOP;

    -- Tenter de récupérer la taille du répertoire uploads du client depuis storage_management
    BEGIN
        EXECUTE format('
            SELECT COALESCE((storage_categories->>''uploads_directory'')::BIGINT, 0)
            FROM %I.storage_management
            WHERE user_id = %L
        ', p_client_schema, v_user_id) INTO v_uploads_size;
    EXCEPTION WHEN OTHERS THEN
        v_uploads_size := 0;
    END;

    -- Calculer la taille totale (BD + uploads)
    v_total_size := v_total_db_size + v_uploads_size;

    -- Construire le résultat final
    result := jsonb_build_object(
        'user_id', v_user_id,
        'schema_name', p_client_schema,
        'database_size', jsonb_build_object(
            'bytes', v_total_db_size,
            'formatted', format_bytes(v_total_db_size)
        ),
        'uploads_size', jsonb_build_object(
            'bytes', v_uploads_size,
            'formatted', format_bytes(v_uploads_size)
        ),
        'total_size', jsonb_build_object(
            'bytes', v_total_size,
            'formatted', format_bytes(v_total_size)
        ),
        'tables', v_tables_details,
        'calculated_at', NOW()
    );

    -- Mettre à jour le storage_management dans le schéma client
    BEGIN
        EXECUTE format('
            INSERT INTO %I.storage_management (
                user_id, 
                total_used, 
                storage_categories,
                last_calculation
            )
            VALUES (
                %L,
                %L,
                %L,
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE 
            SET 
                total_used = %L,
                storage_categories = %L,
                last_calculation = NOW(),
                updated_at = NOW()
        ', p_client_schema, v_user_id, v_total_size, 
           jsonb_build_object(
               'database', v_total_db_size,
               'uploads', v_uploads_size,
               'total', v_total_size,
               'tables', v_tables_details
           ),
           v_total_size,
           jsonb_build_object(
               'database', v_total_db_size,
               'uploads', v_uploads_size,
               'total', v_total_size,
               'tables', v_tables_details
           )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Si la table storage_management n'existe pas, la créer
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.storage_management (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                total_used BIGINT DEFAULT 0,
                storage_categories JSONB DEFAULT ''{}''::jsonb,
                last_calculation TIMESTAMP DEFAULT NOW(),
                cleanup_history JSONB DEFAULT ''[]''::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ', p_client_schema);
        
        -- Réessayer l'insertion
        EXECUTE format('
            INSERT INTO %I.storage_management (
                user_id, 
                total_used, 
                storage_categories,
                last_calculation
            )
            VALUES (
                %L,
                %L,
                %L,
                NOW()
            )
        ', p_client_schema, v_user_id, v_total_size, 
           jsonb_build_object(
               'database', v_total_db_size,
               'uploads', v_uploads_size,
               'total', v_total_size,
               'tables', v_tables_details
           )
        );
    END;

    -- Mettre à jour la table users dans public
    UPDATE public.users
    SET storage_used = v_total_size,
        storage_last_calculated = NOW(),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction auxiliaire pour formater les octets en taille lisible
CREATE OR REPLACE FUNCTION public.format_bytes(bytes BIGINT)
RETURNS TEXT AS $$
DECLARE
    sizes TEXT[] := ARRAY['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    i INTEGER := 1;
BEGIN
    IF bytes IS NULL THEN 
        RETURN '0 Bytes';
    END IF;
    
    IF bytes = 0 THEN
        RETURN '0 Bytes';
    END IF;
    
    WHILE bytes >= 1024 AND i < array_length(sizes, 1) LOOP
        bytes := bytes / 1024;
        i := i + 1;
    END LOOP;
    
    RETURN ROUND(bytes::NUMERIC, 2)::TEXT || ' ' || sizes[i];
END;
$$ LANGUAGE plpgsql;

-- Fonction pour lancer un calcul de stockage pour tous les schémas client
CREATE OR REPLACE FUNCTION public.calculate_all_clients_storage()
RETURNS VOID AS $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN 
        SELECT nspname FROM pg_namespace WHERE nspname LIKE 'client_%'
    LOOP
        PERFORM public.calculate_storage_usage_details(schema_record.nspname);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour traiter les abonnements aux plans de stockage
CREATE OR REPLACE FUNCTION public.process_storage_subscription_renewals()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    subscription_record RECORD;
BEGIN
    -- Traiter les abonnements qui doivent être renouvelés
    FOR subscription_record IN
        SELECT * FROM public.user_storage_subscriptions
        WHERE is_active = TRUE 
        AND next_billing_date <= CURRENT_DATE
    LOOP
        -- Simulation du renouvellement (dans un système réel, cela déclencherait une facture)
        UPDATE public.user_storage_subscriptions
        SET next_billing_date = 
            CASE 
                WHEN billing_cycle = 'monthly' THEN next_billing_date + INTERVAL '1 month'
                WHEN billing_cycle = 'yearly' THEN next_billing_date + INTERVAL '1 year'
                ELSE next_billing_date + INTERVAL '1 month'
            END,
        payment_history = payment_history || jsonb_build_object(
            'date', CURRENT_TIMESTAMP,
            'amount', CASE 
                WHEN billing_cycle = 'monthly' THEN (SELECT price_monthly FROM public.storage_plans WHERE id = subscription_record.plan_id)
                WHEN billing_cycle = 'yearly' THEN (SELECT price_yearly FROM public.storage_plans WHERE id = subscription_record.plan_id)
                ELSE 0
            END,
            'status', 'processed'
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = subscription_record.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour la limite de stockage lors du changement d'abonnement
CREATE OR REPLACE FUNCTION public.update_storage_limit_on_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Si c'est une insertion ou une mise à jour et que l'abonnement est actif
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = TRUE)) THEN
        -- Désactiver les anciens abonnements actifs pour cet utilisateur (sauf celui-ci)
        IF TG_OP = 'INSERT' THEN
            UPDATE public.user_storage_subscriptions
            SET is_active = FALSE,
                end_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = NEW.user_id
            AND id != NEW.id
            AND is_active = TRUE;
        END IF;
        
        -- Mettre à jour la limite de stockage dans users
        PERFORM public.update_user_storage_info(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table user_storage_subscriptions
DROP TRIGGER IF EXISTS update_storage_limit_on_subscription_change ON public.user_storage_subscriptions;
CREATE TRIGGER update_storage_limit_on_subscription_change
AFTER INSERT OR UPDATE OF is_active, plan_id ON public.user_storage_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_storage_limit_on_subscription_change();

-- API pour mettre à niveau le plan de stockage d'un utilisateur
CREATE OR REPLACE FUNCTION public.upgrade_user_storage_plan(
    p_user_id INTEGER,
    p_plan_name VARCHAR(50),
    p_billing_cycle VARCHAR(20) DEFAULT 'monthly'
)
RETURNS JSONB AS $$
DECLARE
    v_plan_id INTEGER;
    v_subscription_id INTEGER;
    v_price NUMERIC(10, 2);
    v_next_date TIMESTAMP;
    v_result JSONB;
BEGIN
    -- Vérifier si le plan existe
    SELECT id INTO v_plan_id FROM public.storage_plans WHERE name = p_plan_name AND is_active = TRUE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Plan de stockage non trouvé');
    END IF;
    
    -- Calculer le prix et la prochaine date de facturation
    IF p_billing_cycle = 'yearly' THEN
        SELECT price_yearly INTO v_price FROM public.storage_plans WHERE id = v_plan_id;
        v_next_date := CURRENT_DATE + INTERVAL '1 year';
    ELSE
        SELECT price_monthly INTO v_price FROM public.storage_plans WHERE id = v_plan_id;
        v_next_date := CURRENT_DATE + INTERVAL '1 month';
    END IF;
    
    -- Désactiver l'abonnement actuel s'il existe
    UPDATE public.user_storage_subscriptions
    SET is_active = FALSE, 
        end_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Créer le nouvel abonnement
    INSERT INTO public.user_storage_subscriptions (
        user_id, 
        plan_id, 
        start_date, 
        billing_cycle, 
        next_billing_date,
        is_active,
        payment_status,
        payment_history
    ) VALUES (
        p_user_id,
        v_plan_id,
        CURRENT_TIMESTAMP,
        p_billing_cycle,
        v_next_date,
        TRUE,
        'pending',
        jsonb_build_array(
            jsonb_build_object(
                'date', CURRENT_TIMESTAMP,
                'amount', v_price,
                'status', 'pending'
            )
        )
    )
    RETURNING id INTO v_subscription_id;
    
    -- Mettre à jour les informations de stockage de l'utilisateur
    PERFORM public.update_user_storage_info(p_user_id);
    
    -- Construire la réponse
    SELECT 
        jsonb_build_object(
            'success', TRUE,
            'message', 'Plan de stockage mis à niveau avec succès',
            'subscription_id', v_subscription_id,
            'plan', p_plan_name,
            'billing_cycle', p_billing_cycle,
            'price', v_price,
            'next_billing_date', v_next_date
        )
    INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql; 