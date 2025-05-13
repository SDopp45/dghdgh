-- Script simplifié pour configurer uniquement la gestion du stockage pour le schéma template
-- Ce script ne nécessite pas de connexion spéciale et peut être exécuté manuellement avec psql ou pgAdmin

-- Partie 1: Création et configuration de la table storage_management dans le schéma template
DO $$
DECLARE
    storage_table_exists BOOLEAN;
    update_trigger_exists BOOLEAN;
    entity_trigger_exists BOOLEAN;
BEGIN
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'CONFIGURATION DU SYSTÈME DE GESTION DE STOCKAGE POUR TEMPLATE';
    RAISE NOTICE '-----------------------------------------------------';
    
    -- Vérifier si le schéma template existe, sinon le créer
    IF NOT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = 'template'
    ) THEN
        RAISE NOTICE 'Le schéma template n''existe pas, création en cours...';
        CREATE SCHEMA template;
        RAISE NOTICE 'Schéma template créé ✓';
    ELSE
        RAISE NOTICE 'Le schéma template existe déjà ✓';
    END IF;
    
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
    
    -- Créer ou mettre à jour la fonction pour le timestamp
    CREATE OR REPLACE FUNCTION template.update_storage_management_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Vérifier si le trigger update_storage_management_timestamp existe
    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'update_storage_management_timestamp'
        AND tgrelid = 'template.storage_management'::regclass
    ) INTO update_trigger_exists;
    
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
    
    -- Créer ou mettre à jour la fonction pour les changements d'entité
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
    
    -- Vérifier si la fonction update_storage_on_entity_change existe
    SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'update_storage_on_entity_change'
        AND pronamespace = 'template'::regnamespace
    ) INTO entity_trigger_exists;
    
    IF entity_trigger_exists THEN
        RAISE NOTICE 'La fonction update_storage_on_entity_change existe déjà ✓';
    ELSE
        RAISE NOTICE 'Fonction update_storage_on_entity_change créée ✓';
    END IF;
    
    -- Vérifier et créer l'index sur user_id
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

-- Partie 2: Configuration des déclencheurs pour les tables du schéma template
DO $$
DECLARE
    tables TEXT[] := ARRAY['documents', 'property_images', 'storage_usage', 'tenant_documents', 
                           'contracts', 'transaction_attachments', 'maintenance', 'visits'];
    table_name TEXT;
    trigger_name TEXT;
    trigger_exists BOOLEAN;
BEGIN
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'CONFIGURATION DES DÉCLENCHEURS POUR LE SCHÉMA TEMPLATE';
    RAISE NOTICE '-----------------------------------------------------';
    
    -- Pour chaque table susceptible d'affecter le stockage, vérifier si elle existe
    -- et créer les déclencheurs si nécessaire
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Vérifier si la table existe dans le schéma template
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'template' AND table_name = table_name
        ) THEN
            RAISE NOTICE 'Table template.% trouvée, configuration des déclencheurs...', table_name;
            
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
    RAISE NOTICE '-----------------------------------------------------';
    RAISE NOTICE 'SCRIPT DE CONFIGURATION TERMINÉ AVEC SUCCÈS';
    RAISE NOTICE 'Pour plus d''informations, consultez la documentation dans: server/docs/template_storage_management.md';
    RAISE NOTICE '-----------------------------------------------------';
END $$; 