-- Script principal pour configurer la gestion du stockage dans tous les schémas

-- Affichage des informations d'exécution
DO $$
BEGIN
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'CONFIGURATION DU SYSTÈME DE GESTION DE STOCKAGE';
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'Étape 1: Vérification et configuration du schéma template';
END $$;

-- Vérification et mise à jour du schéma template
DO $$
DECLARE
    storage_table_exists BOOLEAN;
    update_trigger_exists BOOLEAN;
    entity_trigger_exists BOOLEAN;
BEGIN
    -- Vérifier si la table storage_management existe dans le schéma template
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'template' AND table_name = 'storage_management'
    ) INTO storage_table_exists;
    
    -- Afficher un message de statut
    IF storage_table_exists THEN
        RAISE NOTICE 'La table storage_management existe dans le schéma template ✓';
    ELSE
        RAISE NOTICE 'La table storage_management n''existe pas dans le schéma template, création en cours...';
        
        -- Créer la table storage_management dans le schéma template
        CREATE TABLE IF NOT EXISTS template.storage_management (
            id SERIAL PRIMARY KEY,
            total_used BIGINT DEFAULT 0,  -- Stockage total utilisé en octets
            last_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            storage_categories JSONB DEFAULT '{"documents": 0, "images": 0, "attachments": 0, "other": 0, "database": 0, "storage_usage": 0, "tenant_documents": 0, "contract_documents": 0, "maintenance_documents": 0, "visit_documents": 0}'::jsonb,
            cleanup_history JSONB DEFAULT '[]'::jsonb,  -- Historique des nettoyages
            user_id INTEGER NOT NULL,  -- Référence vers l'utilisateur propriétaire
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'Table storage_management créée dans le schéma template ✓';
    END IF;
    
    -- Vérifier si le trigger update_storage_management_timestamp existe
    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'update_storage_management_timestamp'
        AND tgrelid = 'template.storage_management'::regclass
    ) INTO update_trigger_exists;
    
    -- Créer ou mettre à jour la fonction et le trigger pour le timestamp
    CREATE OR REPLACE FUNCTION template.update_storage_management_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    IF update_trigger_exists THEN
        RAISE NOTICE 'Le trigger update_storage_management_timestamp existe déjà ✓';
    ELSE
        RAISE NOTICE 'Création du trigger update_storage_management_timestamp...';
        
        CREATE TRIGGER update_storage_management_timestamp
        BEFORE UPDATE ON template.storage_management
        FOR EACH ROW
        EXECUTE PROCEDURE template.update_storage_management_timestamp();
        
        RAISE NOTICE 'Trigger update_storage_management_timestamp créé ✓';
    END IF;
    
    -- Vérifier si la fonction update_storage_on_entity_change existe
    SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'update_storage_on_entity_change'
        AND pronamespace = 'template'::regnamespace
    ) INTO entity_trigger_exists;
    
    -- Créer ou mettre à jour la fonction pour mettre à jour le stockage lors des changements d'entité
    CREATE OR REPLACE FUNCTION template.update_storage_on_entity_change()
    RETURNS TRIGGER AS $$
    DECLARE
        user_id INTEGER;
        schema_name TEXT;
    BEGIN
        -- Déterminer le schéma actuel
        schema_name := TG_TABLE_SCHEMA;
        
        -- Extraire l'ID utilisateur du nom du schéma
        IF schema_name LIKE 'client_%' THEN
            user_id := SUBSTRING(schema_name FROM 'client_([0-9]+)')::INTEGER;
            
            -- Marquer que le stockage doit être recalculé
            UPDATE template.storage_management
            SET last_calculation = NOW() - INTERVAL '13 hours'  -- Force un recalcul lors de la prochaine requête
            WHERE user_id = user_id;
        END IF;
        
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    
    IF entity_trigger_exists THEN
        RAISE NOTICE 'La fonction update_storage_on_entity_change existe déjà ✓';
    ELSE
        RAISE NOTICE 'Fonction update_storage_on_entity_change créée ✓';
    END IF;
    
    -- Vérifier si le schéma template a tous les indices nécessaires
    IF NOT EXISTS (
        SELECT FROM pg_indexes
        WHERE schemaname = 'template' 
        AND tablename = 'storage_management'
        AND indexname = 'idx_storage_management_user_id'
    ) THEN
        CREATE INDEX idx_storage_management_user_id ON template.storage_management(user_id);
        RAISE NOTICE 'Index idx_storage_management_user_id créé ✓';
    ELSE
        RAISE NOTICE 'Index idx_storage_management_user_id existe déjà ✓';
    END IF;
    
    -- Ajouter commentaire à la table
    COMMENT ON TABLE template.storage_management IS 'Table de gestion du stockage qui suit l''utilisation par catégorie et permet de gérer les limites et le nettoyage';
    
    RAISE NOTICE 'Configuration de la gestion du stockage pour le schéma template terminée avec succès ✓';
END $$;

-- Étape 2 : Configuration des déclencheurs dans le schéma template
DO $$
BEGIN
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'Étape 2: Configuration des déclencheurs dans le schéma template';
END $$;

-- Configuration des déclencheurs pour le template
DO $$
DECLARE
    tables TEXT[] := ARRAY['documents', 'property_images', 'storage_usage', 'tenant_documents', 
                           'contracts', 'transaction_attachments', 'maintenance', 'visits'];
    table_name TEXT;
    trigger_name TEXT;
    trigger_exists BOOLEAN;
BEGIN
    -- Pour chaque table susceptible d'affecter le stockage, créer les déclencheurs
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Vérifier si la table existe dans le schéma template
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'template' AND table_name = table_name
        ) THEN
            -- Créer un déclencheur pour les opérations INSERT
            trigger_name := 'trg_storage_insert_' || table_name;
            
            SELECT EXISTS (
                SELECT FROM pg_trigger
                WHERE tgname = trigger_name
                AND tgrelid = ('template.' || table_name)::regclass
            ) INTO trigger_exists;
            
            IF NOT trigger_exists THEN
                EXECUTE format('
                    CREATE TRIGGER %I
                    AFTER INSERT ON template.%I
                    FOR EACH ROW
                    EXECUTE PROCEDURE template.update_storage_on_entity_change();
                ', trigger_name, table_name);
                
                RAISE NOTICE 'Déclencheur % créé ✓', trigger_name;
            ELSE
                RAISE NOTICE 'Déclencheur % existe déjà ✓', trigger_name;
            END IF;
            
            -- Créer un déclencheur pour les opérations UPDATE
            trigger_name := 'trg_storage_update_' || table_name;
            
            SELECT EXISTS (
                SELECT FROM pg_trigger
                WHERE tgname = trigger_name
                AND tgrelid = ('template.' || table_name)::regclass
            ) INTO trigger_exists;
            
            IF NOT trigger_exists THEN
                EXECUTE format('
                    CREATE TRIGGER %I
                    AFTER UPDATE ON template.%I
                    FOR EACH ROW
                    WHEN (OLD.* IS DISTINCT FROM NEW.*)
                    EXECUTE PROCEDURE template.update_storage_on_entity_change();
                ', trigger_name, table_name);
                
                RAISE NOTICE 'Déclencheur % créé ✓', trigger_name;
            ELSE
                RAISE NOTICE 'Déclencheur % existe déjà ✓', trigger_name;
            END IF;
            
            -- Créer un déclencheur pour les opérations DELETE
            trigger_name := 'trg_storage_delete_' || table_name;
            
            SELECT EXISTS (
                SELECT FROM pg_trigger
                WHERE tgname = trigger_name
                AND tgrelid = ('template.' || table_name)::regclass
            ) INTO trigger_exists;
            
            IF NOT trigger_exists THEN
                EXECUTE format('
                    CREATE TRIGGER %I
                    AFTER DELETE ON template.%I
                    FOR EACH ROW
                    EXECUTE PROCEDURE template.update_storage_on_entity_change();
                ', trigger_name, table_name);
                
                RAISE NOTICE 'Déclencheur % créé ✓', trigger_name;
            ELSE
                RAISE NOTICE 'Déclencheur % existe déjà ✓', trigger_name;
            END IF;
        ELSE
            RAISE NOTICE 'Table template.% n''existe pas, déclencheurs non créés', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Configuration des déclencheurs de stockage terminée pour le schéma template ✓';
END $$;

-- Étape 3 : Application à tous les schémas client
DO $$
BEGIN
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'Étape 3: Application de la configuration à tous les schémas client';
END $$;

-- Application à tous les schémas client
DO $$
DECLARE
    client_schema RECORD;
    user_id INTEGER;
    tables TEXT[] := ARRAY['documents', 'property_images', 'storage_usage', 'tenant_documents', 
                           'contracts', 'transaction_attachments', 'maintenance', 'visits'];
    table_name TEXT;
    trigger_name TEXT;
    trigger_exists BOOLEAN := FALSE;
BEGIN
    -- Vérifier que la configuration du template est correcte d'abord
    IF NOT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'template' AND table_name = 'storage_management'
    ) THEN
        RAISE EXCEPTION 'La table storage_management n''existe pas dans le schéma template.';
    END IF;
    
    -- Pour chaque schéma client_X
    FOR client_schema IN 
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'client_%'
        ORDER BY schema_name
    LOOP
        RAISE NOTICE 'Traitement du schéma %...', client_schema.schema_name;
        
        -- Extraire l'ID utilisateur du nom du schéma
        user_id := SUBSTRING(client_schema.schema_name FROM 'client_([0-9]+)')::INTEGER;
        
        -- Créer ou mettre à jour la table storage_management
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.storage_management (
                id SERIAL PRIMARY KEY,
                total_used BIGINT DEFAULT 0,
                last_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                storage_categories JSONB DEFAULT ''{"documents": 0, "images": 0, "attachments": 0, "other": 0, "database": 0, "storage_usage": 0, "tenant_documents": 0, "contract_documents": 0, "maintenance_documents": 0, "visit_documents": 0}''::jsonb,
                cleanup_history JSONB DEFAULT ''[]''::jsonb,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ', client_schema.schema_name);
        
        -- S'assurer qu'un enregistrement existe pour cet utilisateur
        EXECUTE format('
            INSERT INTO %I.storage_management (user_id, total_used, created_at, updated_at)
            SELECT %L, 0, NOW(), NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM %I.storage_management WHERE user_id = %L
            )
        ', client_schema.schema_name, user_id, client_schema.schema_name, user_id);
        
        -- Créer la fonction de mise à jour du timestamp
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.update_storage_management_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
               NEW.updated_at = NOW();
               RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        ', client_schema.schema_name);
        
        -- Créer le trigger de mise à jour du timestamp s'il n'existe pas déjà
        IF NOT EXISTS (
            SELECT FROM pg_trigger
            WHERE tgname = 'update_storage_management_timestamp'
            AND tgrelid = (client_schema.schema_name || '.storage_management')::regclass
        ) THEN
            EXECUTE format('
                CREATE TRIGGER update_storage_management_timestamp
                BEFORE UPDATE ON %I.storage_management
                FOR EACH ROW
                EXECUTE PROCEDURE %I.update_storage_management_timestamp()
            ', client_schema.schema_name, client_schema.schema_name);
            
            RAISE NOTICE 'Trigger update_storage_management_timestamp créé pour %', client_schema.schema_name;
        END IF;
        
        -- Créer l'index sur user_id s'il n'existe pas déjà
        IF NOT EXISTS (
            SELECT FROM pg_indexes
            WHERE schemaname = client_schema.schema_name
            AND tablename = 'storage_management'
            AND indexname = 'idx_storage_management_user_id'
        ) THEN
            EXECUTE format('
                CREATE INDEX idx_storage_management_user_id ON %I.storage_management(user_id)
            ', client_schema.schema_name);
            
            RAISE NOTICE 'Index idx_storage_management_user_id créé pour %', client_schema.schema_name;
        END IF;
        
        -- Ajouter commentaire à la table
        EXECUTE format('
            COMMENT ON TABLE %I.storage_management IS ''Table de gestion du stockage qui suit l''''utilisation par catégorie et permet de gérer les limites et le nettoyage''
        ', client_schema.schema_name);
        
        -- Pour chaque table susceptible d'affecter le stockage, créer les déclencheurs
        FOREACH table_name IN ARRAY tables
        LOOP
            -- Vérifier si la table existe dans ce schéma client
            EXECUTE format('
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %L AND table_name = %L
                )
            ', client_schema.schema_name, table_name) INTO trigger_exists;
            
            IF trigger_exists THEN
                -- Créer les déclencheurs pour INSERT
                trigger_name := 'trg_storage_insert_' || table_name;
                
                EXECUTE format('
                    SELECT EXISTS (
                        SELECT FROM pg_trigger
                        WHERE tgname = %L
                        AND tgrelid = (%L || ''.'' || %L)::regclass
                    )
                ', trigger_name, client_schema.schema_name, table_name) INTO trigger_exists;
                
                IF NOT trigger_exists THEN
                    EXECUTE format('
                        CREATE TRIGGER %I
                        AFTER INSERT ON %I.%I
                        FOR EACH ROW
                        EXECUTE PROCEDURE template.update_storage_on_entity_change()
                    ', trigger_name, client_schema.schema_name, table_name);
                    
                    RAISE NOTICE 'Déclencheur % créé pour %.%', trigger_name, client_schema.schema_name, table_name;
                END IF;
                
                -- Créer les déclencheurs pour UPDATE
                trigger_name := 'trg_storage_update_' || table_name;
                
                EXECUTE format('
                    SELECT EXISTS (
                        SELECT FROM pg_trigger
                        WHERE tgname = %L
                        AND tgrelid = (%L || ''.'' || %L)::regclass
                    )
                ', trigger_name, client_schema.schema_name, table_name) INTO trigger_exists;
                
                IF NOT trigger_exists THEN
                    EXECUTE format('
                        CREATE TRIGGER %I
                        AFTER UPDATE ON %I.%I
                        FOR EACH ROW
                        WHEN (OLD.* IS DISTINCT FROM NEW.*)
                        EXECUTE PROCEDURE template.update_storage_on_entity_change()
                    ', trigger_name, client_schema.schema_name, table_name);
                    
                    RAISE NOTICE 'Déclencheur % créé pour %.%', trigger_name, client_schema.schema_name, table_name;
                END IF;
                
                -- Créer les déclencheurs pour DELETE
                trigger_name := 'trg_storage_delete_' || table_name;
                
                EXECUTE format('
                    SELECT EXISTS (
                        SELECT FROM pg_trigger
                        WHERE tgname = %L
                        AND tgrelid = (%L || ''.'' || %L)::regclass
                    )
                ', trigger_name, client_schema.schema_name, table_name) INTO trigger_exists;
                
                IF NOT trigger_exists THEN
                    EXECUTE format('
                        CREATE TRIGGER %I
                        AFTER DELETE ON %I.%I
                        FOR EACH ROW
                        EXECUTE PROCEDURE template.update_storage_on_entity_change()
                    ', trigger_name, client_schema.schema_name, table_name);
                    
                    RAISE NOTICE 'Déclencheur % créé pour %.%', trigger_name, client_schema.schema_name, table_name;
                END IF;
            END IF;
        END LOOP;
        
        -- Forcer un recalcul du stockage pour ce client
        RAISE NOTICE 'Recalcul du stockage pour %...', client_schema.schema_name;
        
        BEGIN
            EXECUTE format('SELECT public.calculate_client_storage_usage(%L)', client_schema.schema_name);
            RAISE NOTICE 'Recalcul du stockage terminé pour % ✓', client_schema.schema_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erreur lors du recalcul du stockage pour % : %', client_schema.schema_name, SQLERRM;
        END;
        
        RAISE NOTICE 'Configuration terminée pour le schéma % ✓', client_schema.schema_name;
    END LOOP;
    
    RAISE NOTICE 'Application de la configuration de gestion du stockage terminée pour tous les schémas client ✓';
END $$;

-- Vérification finale
DO $$
BEGIN
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'Vérification finale du système';
END $$;

-- Rapport final
DO $$
DECLARE 
    schema_count INTEGER;
    configured_count INTEGER;
BEGIN
    -- Compter le nombre de schémas client
    SELECT COUNT(*) INTO schema_count
    FROM information_schema.schemata
    WHERE schema_name LIKE 'client_%';
    
    -- Compter le nombre de schémas client avec table storage_management configurée
    SELECT COUNT(*) INTO configured_count
    FROM (
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'client_%'
    ) AS schemas
    WHERE EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = schemas.schema_name
        AND table_name = 'storage_management'
    );
    
    -- Afficher le résumé
    RAISE NOTICE 'Configuration du système de gestion du stockage terminée';
    RAISE NOTICE '----------------------------------------------------';
    RAISE NOTICE 'Schéma template configuré: %', 
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'template' AND table_name = 'storage_management'
        ) THEN 'Oui' ELSE 'Non' END;
    RAISE NOTICE 'Nombre de schémas client trouvés: %', schema_count;
    RAISE NOTICE 'Nombre de schémas client configurés: %', configured_count;
    RAISE NOTICE 'Pourcentage de couverture: %', 
        CASE WHEN schema_count > 0 
             THEN ROUND((configured_count::NUMERIC / schema_count) * 100, 2) 
             ELSE 0 END || '%';
    RAISE NOTICE '----------------------------------------------------';
    RAISE NOTICE 'Pour plus d''informations, consultez la documentation dans: server/docs/template_storage_management.md';
END $$; 