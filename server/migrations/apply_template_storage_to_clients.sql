-- Script pour appliquer la configuration de gestion de stockage du template à tous les schémas client
DO $$
DECLARE
    client_schema RECORD;
    user_id INTEGER;
    tables TEXT[] := ARRAY['documents', 'property_images', 'storage_usage', 'tenant_documents', 
                           'contracts', 'transaction_attachments', 'maintenance', 'visits'];
    table_name TEXT;
    trigger_name TEXT;
BEGIN
    -- Vérifier que la configuration du template est correcte d'abord
    IF NOT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'template' AND table_name = 'storage_management'
    ) THEN
        RAISE EXCEPTION 'La table storage_management n''existe pas dans le schéma template. Exécutez d''abord verify_template_storage.sql';
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
            ', client_schema.schema_name, table_name) INTO STRICT trigger_exists;
            
            IF trigger_exists THEN
                -- Créer les déclencheurs pour INSERT, UPDATE, DELETE
                -- INSERT
                trigger_name := 'trg_storage_insert_' || table_name;
                
                EXECUTE format('
                    SELECT EXISTS (
                        SELECT FROM pg_trigger
                        WHERE tgname = %L
                        AND tgrelid = (%L || ''.'' || %L)::regclass
                    )
                ', trigger_name, client_schema.schema_name, table_name) INTO STRICT trigger_exists;
                
                IF NOT trigger_exists THEN
                    EXECUTE format('
                        CREATE TRIGGER %I
                        AFTER INSERT ON %I.%I
                        FOR EACH ROW
                        EXECUTE PROCEDURE template.update_storage_on_entity_change()
                    ', trigger_name, client_schema.schema_name, table_name);
                    
                    RAISE NOTICE 'Déclencheur % créé pour %.%', trigger_name, client_schema.schema_name, table_name;
                END IF;
                
                -- UPDATE
                trigger_name := 'trg_storage_update_' || table_name;
                
                EXECUTE format('
                    SELECT EXISTS (
                        SELECT FROM pg_trigger
                        WHERE tgname = %L
                        AND tgrelid = (%L || ''.'' || %L)::regclass
                    )
                ', trigger_name, client_schema.schema_name, table_name) INTO STRICT trigger_exists;
                
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
                
                -- DELETE
                trigger_name := 'trg_storage_delete_' || table_name;
                
                EXECUTE format('
                    SELECT EXISTS (
                        SELECT FROM pg_trigger
                        WHERE tgname = %L
                        AND tgrelid = (%L || ''.'' || %L)::regclass
                    )
                ', trigger_name, client_schema.schema_name, table_name) INTO STRICT trigger_exists;
                
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