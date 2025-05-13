-- Configuration des déclencheurs (triggers) pour la gestion du stockage dans le schéma template
DO $$
DECLARE
    tables TEXT[] := ARRAY['documents', 'property_images', 'storage_usage', 'tenant_documents', 
                           'contracts', 'transaction_attachments', 'maintenance', 'visits'];
    table_name TEXT;
    trigger_name TEXT;
    trigger_exists BOOLEAN;
BEGIN
    -- Vérifier si la fonction update_storage_on_entity_change existe, sinon la créer
    IF NOT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'update_storage_on_entity_change'
        AND pronamespace = 'template'::regnamespace
    ) THEN
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
        
        RAISE NOTICE 'Fonction template.update_storage_on_entity_change créée ✓';
    ELSE
        RAISE NOTICE 'Fonction template.update_storage_on_entity_change existe déjà ✓';
    END IF;
    
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