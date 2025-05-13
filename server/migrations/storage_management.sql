-- Création de la table de gestion du stockage dans le schéma template
CREATE TABLE IF NOT EXISTS template.storage_management (
    id SERIAL PRIMARY KEY,
    total_used BIGINT DEFAULT 0,  -- Stockage total utilisé en octets
    last_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    storage_categories JSONB DEFAULT '{"documents": 0, "images": 0, "attachments": 0, "other": 0}'::jsonb,
    cleanup_history JSONB DEFAULT '[]'::jsonb,  -- Historique des nettoyages
    user_id INTEGER NOT NULL,  -- Référence vers l'utilisateur propriétaire
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fonction auxiliaire pour calculer la taille des documents à partir d'un array de document_ids
CREATE OR REPLACE FUNCTION public.calculate_documents_size(p_client_schema TEXT, p_document_ids JSONB)
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT := 0;
BEGIN
    -- Si le tableau est vide, renvoyer 0
    IF p_document_ids IS NULL OR p_document_ids = '[]'::jsonb THEN
        RETURN 0;
    END IF;
    
    -- Calculer la taille des documents
    EXECUTE format('
        SELECT COALESCE(SUM(file_size), 0)
        FROM %I.documents
        WHERE id IN (SELECT jsonb_array_elements_text(%L::jsonb)::integer)
        AND deleted_at IS NULL
    ', p_client_schema, p_document_ids) INTO total_size;
    
    RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- Création de la fonction pour calculer l'utilisation du stockage d'un schéma client
CREATE OR REPLACE FUNCTION public.calculate_client_storage_usage(p_client_schema TEXT) 
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT := 0;
    doc_size BIGINT := 0;
    img_size BIGINT := 0;
    attach_size BIGINT := 0;
    other_size BIGINT := 0;
    user_id INTEGER;
    storage_usage_size BIGINT := 0;
    tenant_docs_size BIGINT := 0;
    contract_docs_size BIGINT := 0;
    transaction_attachments_size BIGINT := 0;
    maintenance_docs_size BIGINT := 0;
    visit_docs_size BIGINT := 0;
    maintenance_array_docs_size BIGINT := 0;
    uploads_dir_size BIGINT := 0;
BEGIN
    -- Extraire l'ID utilisateur du nom du schéma
    user_id := SUBSTRING(p_client_schema FROM 'client_([0-9]+)')::INTEGER;
    
    -- Calculer l'espace utilisé par les documents
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(file_size), 0)
            FROM %I.documents
            WHERE 1=1
        ', p_client_schema) INTO doc_size;
    EXCEPTION WHEN OTHERS THEN
        doc_size := 0;
    END;
    
    -- Calculer l'espace utilisé par les images de propriétés (si la table existe)
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(file_size), 0)
            FROM %I.property_images
            WHERE 1=1
        ', p_client_schema) INTO img_size;
    EXCEPTION WHEN OTHERS THEN
        img_size := 0;
    END;
    
    -- Calculer l'espace utilisé par la table storage_usage
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(size_bytes), 0)
            FROM %I.storage_usage
            WHERE 1=1
        ', p_client_schema) INTO storage_usage_size;
    EXCEPTION WHEN OTHERS THEN
        storage_usage_size := 0;
    END;
    
    -- Calculer l'espace utilisé par les documents des locataires
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(d.file_size), 0)
            FROM %I.tenant_documents td
            JOIN %I.documents d ON td.document_id = d.id
            WHERE 1=1
        ', p_client_schema, p_client_schema) INTO tenant_docs_size;
    EXCEPTION WHEN OTHERS THEN
        tenant_docs_size := 0;
    END;
    
    -- Calculer l'espace utilisé par les documents de contrats
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(d.file_size), 0)
            FROM %I.contracts c
            JOIN %I.documents d ON c.document_id = d.id
            WHERE 1=1
        ', p_client_schema, p_client_schema) INTO contract_docs_size;
    EXCEPTION WHEN OTHERS THEN
        contract_docs_size := 0;
    END;
    
    -- Calculer l'espace utilisé par les pièces jointes des transactions
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(file_size), 0)
            FROM %I.transaction_attachments
        ', p_client_schema) INTO transaction_attachments_size;
    EXCEPTION WHEN OTHERS THEN
        transaction_attachments_size := 0;
    END;
    
    -- Calculer l'espace utilisé par les documents de maintenance via la colonne document_id
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(d.file_size), 0)
            FROM %I.maintenance m
            JOIN %I.documents d ON m.document_id = d.id
            WHERE 1=1
        ', p_client_schema, p_client_schema) INTO maintenance_docs_size;
    EXCEPTION WHEN OTHERS THEN
        maintenance_docs_size := 0;
    END;
    
    -- Calculer l'espace utilisé par les documents de maintenance via le champ JSONB document_ids
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(
                public.calculate_documents_size(%L, document_ids)
            ), 0)
            FROM %I.maintenance
            WHERE document_ids IS NOT NULL AND document_ids != ''[]''::jsonb
        ', p_client_schema, p_client_schema) INTO maintenance_array_docs_size;
    EXCEPTION WHEN OTHERS THEN
        maintenance_array_docs_size := 0;
    END;
    
    -- Calculer l'espace utilisé par les documents de visites
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(
                public.calculate_documents_size(%L, documents)
            ), 0)
            FROM %I.visits
            WHERE documents IS NOT NULL AND documents != ''[]''::jsonb
        ', p_client_schema, p_client_schema) INTO visit_docs_size;
    EXCEPTION WHEN OTHERS THEN
        visit_docs_size := 0;
    END;
    
    -- Calculer l'espace utilisé par le répertoire uploads/client_X
    BEGIN
        -- Utiliser la fonction pg_stat_file pour obtenir la taille des répertoires
        -- Cette fonction nécessite des privilèges administrateurs, nous utilisons donc une variante
        -- plus sécurisée qui n'utilise que la taille des fichiers enregistrés dans la base de données
        
        -- Nous stockons cette information dans la table storage_management
        uploads_dir_size := 0;
        
        -- Dans un environnement de production, vous pourriez envisager d'utiliser
        -- une fonction externe qui parcourt physiquement le répertoire et calcule sa taille
        -- Par exemple avec plpython3u et os.walk
    EXCEPTION WHEN OTHERS THEN
        uploads_dir_size := 0;
    END;
    
    -- Ajouter toutes les tailles à la catégorie appropriée
    -- Les documents sont déjà comptés dans doc_size
    attach_size := transaction_attachments_size;
    other_size := maintenance_array_docs_size + uploads_dir_size;
    
    -- Les documents liés à d'autres tables sont déjà comptés dans documents
    -- Nous calculons donc le total sans les dupliquer
    total_size := doc_size + img_size + attach_size + storage_usage_size + uploads_dir_size;
    
    -- S'assurer que la table storage_management existe
    BEGIN
        EXECUTE format('
            SELECT 1 FROM %I.storage_management LIMIT 1
        ', p_client_schema);
    EXCEPTION WHEN OTHERS THEN
        -- La table n'existe pas, la créer
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.storage_management (
                id SERIAL PRIMARY KEY,
                total_used BIGINT DEFAULT 0,
                last_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                storage_categories JSONB DEFAULT ''{"documents": 0, "images": 0, "attachments": 0, "other": 0}''::jsonb,
                cleanup_history JSONB DEFAULT ''[]''::jsonb,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ', p_client_schema);
        
        -- Insérer la première entrée
        EXECUTE format('
            INSERT INTO %I.storage_management (user_id, total_used, created_at, updated_at)
            VALUES (%L, 0, NOW(), NOW())
        ', p_client_schema, user_id);
    END;
    
    -- Mettre à jour la table storage_management avec des informations détaillées
    EXECUTE format('
        UPDATE %I.storage_management 
        SET total_used = %L,
            storage_categories = jsonb_build_object(
                ''documents'', %L,
                ''images'', %L,
                ''attachments'', %L,
                ''other'', %L,
                ''storage_usage'', %L,
                ''tenant_documents'', %L,
                ''contract_documents'', %L,
                ''maintenance_documents'', %L,
                ''visit_documents'', %L,
                ''maintenance_array_documents'', %L,
                ''uploads_directory'', %L
            ),
            last_calculation = NOW(),
            updated_at = NOW()
        WHERE user_id = %L
    ', p_client_schema, total_size, doc_size, img_size, attach_size, other_size, 
       storage_usage_size, tenant_docs_size, contract_docs_size, maintenance_docs_size, visit_docs_size, 
       maintenance_array_docs_size, uploads_dir_size, user_id);
    
    -- Mettre à jour aussi la table users dans public
    EXECUTE format('
        UPDATE public.users 
        SET storage_used = %L,
            updated_at = NOW()
        WHERE id = %L
    ', total_size, user_id);
    
    RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- Modification des triggers pour le schéma template et pour tous les schémas client_X
-- Trigger pour mettre à jour le champ updated_at dans la table storage_management
CREATE OR REPLACE FUNCTION template.update_storage_management_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger dans le schéma template pour qu'il soit copié dans les nouveaux schémas client
CREATE TRIGGER update_storage_management_timestamp
BEFORE UPDATE ON template.storage_management
FOR EACH ROW
EXECUTE PROCEDURE template.update_storage_management_timestamp();

-- Fonction pour recalculer automatiquement l'utilisation du stockage lorsqu'une entité est modifiée
CREATE OR REPLACE FUNCTION template.update_storage_on_entity_change()
RETURNS TRIGGER AS $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Obtenir le nom du schéma courant
    schema_name := TG_TABLE_SCHEMA;
    
    -- Planifier la mise à jour du calcul du stockage pour ce schéma
    -- Nous utilisons pg_notify pour éviter de bloquer la transaction
    PERFORM pg_notify('storage_calculation_needed', schema_name);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour les tables qui affectent le stockage

-- Trigger pour les visites
CREATE TRIGGER update_storage_after_visit_change
AFTER INSERT OR UPDATE OR DELETE ON template.visits
FOR EACH STATEMENT
EXECUTE PROCEDURE template.update_storage_on_entity_change();

-- Trigger pour les documents
CREATE TRIGGER update_storage_after_document_change
AFTER INSERT OR UPDATE OR DELETE ON template.documents
FOR EACH STATEMENT
EXECUTE PROCEDURE template.update_storage_on_entity_change();

-- Trigger pour les images de propriétés
CREATE TRIGGER update_storage_after_property_image_change
AFTER INSERT OR UPDATE OR DELETE ON template.property_images
FOR EACH STATEMENT
EXECUTE PROCEDURE template.update_storage_on_entity_change();

-- Trigger pour les documents des locataires
CREATE TRIGGER update_storage_after_tenant_document_change
AFTER INSERT OR UPDATE OR DELETE ON template.tenant_documents
FOR EACH STATEMENT
EXECUTE PROCEDURE template.update_storage_on_entity_change();

-- Trigger pour les contrats
CREATE TRIGGER update_storage_after_contract_change
AFTER INSERT OR UPDATE OR DELETE ON template.contracts
FOR EACH STATEMENT
EXECUTE PROCEDURE template.update_storage_on_entity_change();

-- Trigger pour la maintenance
CREATE TRIGGER update_storage_after_maintenance_change
AFTER INSERT OR UPDATE OR DELETE ON template.maintenance
FOR EACH STATEMENT
EXECUTE PROCEDURE template.update_storage_on_entity_change();

-- Trigger pour les pièces jointes des transactions
CREATE TRIGGER update_storage_after_transaction_attachment_change
AFTER INSERT OR UPDATE OR DELETE ON template.transaction_attachments
FOR EACH STATEMENT
EXECUTE PROCEDURE template.update_storage_on_entity_change();

-- Fonction pour écouter les notifications et recalculer le stockage
-- Cette fonction doit être exécutée dans un processus séparé ou un job programmé
CREATE OR REPLACE FUNCTION public.listen_for_storage_recalculation()
RETURNS void AS $$
DECLARE
    channel TEXT := 'storage_calculation_needed';
    schema_name TEXT;
BEGIN
    -- Écouter le canal pour les notifications
    LISTEN storage_calculation_needed;
    
    -- La notification est maintenant stockée dans pg_event_trigger_dropped_objects()
    -- Mais dans un job réel, vous exécuteriez une boucle qui attend les notifications
    
    -- Pour simuler, nous recalculons directement tous les schémas
    FOR schema_name IN 
        SELECT nspname 
        FROM pg_namespace 
        WHERE nspname LIKE 'client_%'
    LOOP
        PERFORM public.calculate_total_client_storage(schema_name);
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour initialiser une tâche planifiée qui mettra à jour l'utilisation du stockage périodiquement
CREATE OR REPLACE FUNCTION public.setup_storage_usage_tracking()
RETURNS void AS $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Pour chaque schéma client existant, recalculer l'utilisation actuelle
    FOR schema_name IN 
        SELECT nspname 
        FROM pg_namespace 
        WHERE nspname LIKE 'client_%'
    LOOP
        PERFORM public.calculate_client_storage_usage(schema_name);
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Planifier la tâche de recalcul du stockage quotidiennement à minuit
-- (Cette commande doit être exécutée une seule fois, généralement lors de l'installation)
-- SELECT cron.schedule('0 0 * * *', 'SELECT public.setup_storage_usage_tracking()');

-- Créer une fonction pour nettoyer les anciens fichiers non utilisés et réduire l'usage de stockage
CREATE OR REPLACE FUNCTION public.cleanup_old_unused_files(p_client_schema TEXT, p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cleanup_record JSONB;
BEGIN
    -- Marquer tous les documents qui n'ont pas été accédés depuis p_days_old jours
    EXECUTE format('
        UPDATE %I.documents
        SET deleted_at = NOW()
        WHERE 
            id NOT IN (
                SELECT document_id FROM %I.tenant_documents
                UNION
                SELECT document_id FROM %I.contracts WHERE document_id IS NOT NULL
                UNION
                SELECT (jsonb_array_elements_text(documents)::integer) 
                FROM %I.visits 
                WHERE documents IS NOT NULL AND documents != ''[]''::jsonb
                UNION
                SELECT document_id FROM %I.maintenance WHERE document_id IS NOT NULL
                UNION
                SELECT (jsonb_array_elements_text(document_ids)::integer) 
                FROM %I.maintenance 
                WHERE document_ids IS NOT NULL AND document_ids != ''[]''::jsonb
            )
            AND created_at < NOW() - INTERVAL ''%s days''
            AND deleted_at IS NULL
        RETURNING id
    ', p_client_schema, p_client_schema, p_client_schema, p_client_schema, p_client_schema, 
       p_client_schema, p_days_old) INTO deleted_count;
    
    -- Enregistrer l'opération de nettoyage
    IF deleted_count > 0 THEN
        cleanup_record := jsonb_build_object(
            'date', NOW(),
            'files_cleaned', deleted_count,
            'criteria', format('files unused for more than %s days', p_days_old)
        );
        
        -- Mettre à jour l'historique de nettoyage
        EXECUTE format('
            UPDATE %I.storage_management
            SET cleanup_history = cleanup_history || %L::jsonb
            WHERE id = 1
        ', p_client_schema, cleanup_record);
        
        -- Recalculer le stockage après nettoyage
        PERFORM public.calculate_client_storage_usage(p_client_schema);
    END IF;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer la taille totale du schéma client et de ses données
CREATE OR REPLACE FUNCTION public.calculate_total_client_storage(p_client_schema TEXT)
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT := 0;
    file_storage_size BIGINT := 0;
    data_storage_size BIGINT := 0;
    table_name TEXT;
    user_id INTEGER;
BEGIN
    -- Extraire l'ID utilisateur du nom du schéma
    user_id := SUBSTRING(p_client_schema FROM 'client_([0-9]+)')::INTEGER;
    
    -- 1. Calculer la taille totale des fichiers uploadés (documents, images, etc.)
    -- Cette requête additionne tous les fichiers des principales tables
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(file_size), 0)
            FROM (
                -- Documents principaux
                SELECT file_size FROM %I.documents WHERE deleted_at IS NULL
                UNION ALL
                -- Pièces jointes des transactions
                SELECT file_size FROM %I.transaction_attachments
                UNION ALL
                -- Autres tables avec file_size (ajouter selon besoin)
                SELECT size_bytes AS file_size FROM %I.storage_usage WHERE deleted_at IS NULL
            ) AS all_files
        ', p_client_schema, p_client_schema, p_client_schema) INTO file_storage_size;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors du calcul des fichiers: %', SQLERRM;
        file_storage_size := 0;
    END;

    -- 2. Calculer la taille occupée par toutes les tables dans le schéma client
    -- Méthode 1: Utiliser pg_total_relation_size pour chaque table du schéma
    BEGIN
        -- Initialiser à zéro
        data_storage_size := 0;
        
        -- Pour chaque table dans le schéma client, calculer sa taille
        FOR table_name IN 
            EXECUTE format('
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = %L
            ', p_client_schema)
        LOOP
            -- Ajouter la taille de cette table
            EXECUTE format('
                SELECT pg_total_relation_size(%L)
            ', p_client_schema || '.' || table_name) INTO data_storage_size;
            
            -- Ajouter à la taille totale
            total_size := total_size + data_storage_size;
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors du calcul de la taille des tables: %', SQLERRM;
    END;
    
    -- Méthode 2: Calculer directement la taille totale du schéma
    DECLARE
        schema_size BIGINT := 0;
    BEGIN
        EXECUTE format('
            SELECT SUM(pg_total_relation_size(quote_ident(schemaname) || ''.'' || quote_ident(tablename)))
            FROM pg_tables
            WHERE schemaname = %L
        ', p_client_schema) INTO schema_size;
        
        -- Si la méthode 1 a échoué ou donne un résultat nul, utiliser la méthode 2
        IF total_size IS NULL OR total_size = 0 THEN
            total_size := schema_size;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors du calcul de la taille du schéma: %', SQLERRM;
    END;

    -- 3. Ajouter la taille des fichiers
    total_size := total_size + file_storage_size;
    
    -- S'assurer que la table storage_management existe
    BEGIN
        EXECUTE format('
            SELECT 1 FROM %I.storage_management LIMIT 1
        ', p_client_schema);
    EXCEPTION WHEN OTHERS THEN
        -- La table n'existe pas, la créer
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I.storage_management (
                id SERIAL PRIMARY KEY,
                total_used BIGINT DEFAULT 0,
                last_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                storage_categories JSONB DEFAULT ''{"documents": 0, "images": 0, "attachments": 0, "other": 0, "database": 0}''::jsonb,
                cleanup_history JSONB DEFAULT ''[]''::jsonb,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ', p_client_schema);
        
        -- Insérer la première entrée
        EXECUTE format('
            INSERT INTO %I.storage_management (user_id, total_used, created_at, updated_at)
            VALUES (%L, 0, NOW(), NOW())
        ', p_client_schema, user_id);
    END;
    
    -- Mettre à jour la table storage_management avec la taille totale et une répartition par catégories
    EXECUTE format('
        UPDATE %I.storage_management 
        SET total_used = %L,
            storage_categories = jsonb_build_object(
                ''documents'', %L,
                ''database'', %L,
                ''total'', %L
            ),
            last_calculation = NOW(),
            updated_at = NOW()
        WHERE user_id = %L
    ', p_client_schema, total_size, file_storage_size, schema_size, total_size, user_id);
    
    -- Mettre à jour aussi la table users dans public
    EXECUTE format('
        UPDATE public.users 
        SET storage_used = %L,
            updated_at = NOW()
        WHERE id = %L
    ', total_size, user_id);
    
    RETURN total_size;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir des statistiques détaillées sur l'espace utilisé par chaque table
CREATE OR REPLACE FUNCTION public.get_client_schema_statistics(p_client_schema TEXT)
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    total_size BIGINT,
    index_size BIGINT,
    toast_size BIGINT,
    table_size BIGINT
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT 
            c.relname::TEXT AS table_name,
            c.reltuples::BIGINT AS row_count,
            pg_total_relation_size(c.oid) AS total_size,
            pg_indexes_size(c.oid) AS index_size,
            COALESCE(pg_total_relation_size(''pg_toast.'' || (SELECT reltoastrelid FROM pg_class WHERE oid = c.oid)::regclass::text), 0) AS toast_size,
            pg_relation_size(c.oid) AS table_size
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = %L
        AND c.relkind = ''r''
        ORDER BY pg_total_relation_size(c.oid) DESC
    ', p_client_schema);
END;
$$ LANGUAGE plpgsql;

-- Instructions d'utilisation:
-- SELECT public.calculate_total_client_storage('client_109');

-- Exemple d'exécution pour client_109 uniquement:
-- SELECT public.calculate_client_storage_usage('client_109'); 