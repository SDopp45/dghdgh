-- Script de mise à jour du stockage pour client_109
-- À exécuter dans l'interface de gestion PostgreSQL ou via un client SQL

-- Correction de la fonction de calcul total du stockage
CREATE OR REPLACE FUNCTION public.calculate_total_client_storage(p_client_schema TEXT)
RETURNS BIGINT AS $$
DECLARE
    total_size BIGINT := 0;
    file_storage_size BIGINT := 0;
    schema_size BIGINT := 0;
    table_name TEXT;
    user_id INTEGER;
BEGIN
    -- Extraire l'ID utilisateur du nom du schéma
    user_id := SUBSTRING(p_client_schema FROM 'client_([0-9]+)')::INTEGER;
    
    -- 1. Calculer la taille totale des fichiers uploadés (documents, images, etc.)
    BEGIN
        EXECUTE format('
            SELECT COALESCE(SUM(file_size), 0)
            FROM (
                -- Documents principaux
                SELECT file_size FROM %I.documents
                UNION ALL
                -- Pièces jointes des transactions (si la table existe)
                SELECT file_size FROM %I.transaction_attachments
                WHERE EXISTS (SELECT 1 FROM information_schema.tables 
                             WHERE table_schema = %L AND table_name = ''transaction_attachments'')
                UNION ALL
                -- Images des propriétés (si la table existe)
                SELECT file_size FROM %I.property_images
                WHERE EXISTS (SELECT 1 FROM information_schema.tables 
                             WHERE table_schema = %L AND table_name = ''property_images'')
            ) AS all_files
        ', p_client_schema, p_client_schema, p_client_schema, p_client_schema, p_client_schema) INTO file_storage_size;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors du calcul des fichiers: %', SQLERRM;
        file_storage_size := 0;
    END;

    -- 2. Calculer directement la taille totale du schéma
    BEGIN
        EXECUTE format('
            SELECT SUM(pg_total_relation_size(quote_ident(schemaname) || ''.'' || quote_ident(tablename)))
            FROM pg_tables
            WHERE schemaname = %L
        ', p_client_schema) INTO schema_size;
        
        -- S'assurer que schema_size n'est pas NULL
        IF schema_size IS NULL THEN
            schema_size := 0;
        END IF;
        
        -- Calculer le total
        total_size := file_storage_size + schema_size;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors du calcul de la taille du schéma: %', SQLERRM;
        schema_size := 0;
        total_size := file_storage_size;
    END;

    -- 3. S'assurer que la table storage_management existe
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

-- D'abord supprimer la fonction existante
DROP FUNCTION IF EXISTS public.get_client_schema_statistics(TEXT);

-- Puis créer la nouvelle version avec les colonnes supplémentaires
CREATE OR REPLACE FUNCTION public.get_client_schema_statistics(p_client_schema TEXT)
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    total_size BIGINT,
    index_size BIGINT,
    toast_size BIGINT,
    table_size BIGINT,
    table_type TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        WITH table_counts AS (
            SELECT 
                c.relname::TEXT AS table_name,
                c.reltuples::BIGINT AS row_count,
                pg_total_relation_size(c.oid) AS total_size,
                pg_indexes_size(c.oid) AS index_size,
                COALESCE(pg_total_relation_size(''pg_toast.'' || (SELECT reltoastrelid FROM pg_class WHERE oid = c.oid)::regclass::text), 0) AS toast_size,
                pg_relation_size(c.oid) AS table_size,
                CASE 
                    WHEN c.relname LIKE ''documents'' THEN ''Document''
                    WHEN c.relname LIKE ''property%'' THEN ''Propriété''
                    WHEN c.relname LIKE ''%tenant%'' THEN ''Locataire''
                    WHEN c.relname LIKE ''%contract%'' THEN ''Contrat''
                    WHEN c.relname LIKE ''%transaction%'' THEN ''Finance''
                    WHEN c.relname LIKE ''%maintenance%'' THEN ''Maintenance''
                    WHEN c.relname LIKE ''%visit%'' THEN ''Visite''
                    ELSE ''Autre''
                END AS table_type,
                obj_description(c.oid, ''pg_class'') AS description
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = %L
            AND c.relkind = ''r''
        )
        SELECT 
            table_name,
            row_count,
            total_size,
            index_size,
            toast_size,
            table_size,
            table_type,
            description
        FROM table_counts
        ORDER BY total_size DESC
    ', p_client_schema);
END;
$$ LANGUAGE plpgsql;

-- Exécution pour le client_109
SELECT 'Calcul du stockage pour client_109' as operation;
SELECT public.calculate_total_client_storage('client_109');

-- Vérification des résultats
SELECT 'Vérification des données de stockage' as operation;
SELECT 
    u.id,
    u.storage_used,
    u.storage_limit,
    u.storage_tier,
    sm.storage_categories,
    sm.last_calculation
FROM 
    public.users u 
JOIN 
    client_109.storage_management sm ON u.id = sm.user_id
WHERE 
    u.id = 109;

-- Test des statistiques détaillées
SELECT 'Statistiques détaillées pour client_109' as operation;
SELECT * FROM public.get_client_schema_statistics('client_109') LIMIT 10;

-- Ajout éventuel d'un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_storage_management_user_id ON client_109.storage_management(user_id);

-- Mise à jour du commentaire dans la table storage_management
COMMENT ON TABLE client_109.storage_management IS 'Table de gestion du stockage qui suit l''utilisation par catégorie'; 