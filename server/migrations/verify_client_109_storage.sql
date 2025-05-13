-- Script de vérification de la configuration du stockage pour client_109
-- Exécuter ce script dans votre interface PostgreSQL pour vérifier l'état actuel

-- 1. Vérifier si les fonctions principales existent
DO $$
BEGIN
    RAISE NOTICE '--- VÉRIFICATION DES FONCTIONS PRINCIPALES ---';
    
    -- Vérifier calculate_total_client_storage
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_total_client_storage') THEN
        RAISE NOTICE 'La fonction calculate_total_client_storage existe ✓';
    ELSE
        RAISE NOTICE 'La fonction calculate_total_client_storage n''existe pas ✗';
    END IF;
    
    -- Vérifier get_client_schema_statistics
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_client_schema_statistics') THEN
        RAISE NOTICE 'La fonction get_client_schema_statistics existe ✓';
    ELSE
        RAISE NOTICE 'La fonction get_client_schema_statistics n''existe pas ✗';
    END IF;
END $$;

-- 2. Vérifier si la table storage_management existe dans client_109
DO $$
BEGIN
    RAISE NOTICE '--- VÉRIFICATION DES TABLES ---';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'client_109' AND table_name = 'storage_management'
    ) THEN
        RAISE NOTICE 'La table storage_management existe dans client_109 ✓';
    ELSE
        RAISE NOTICE 'La table storage_management n''existe pas dans client_109 ✗';
    END IF;
END $$;

-- 3. Vérifier les données de l'utilisateur 109
DO $$
DECLARE
    storage_used_val BIGINT;
    storage_limit_val BIGINT;
    storage_tier_val TEXT;
BEGIN
    RAISE NOTICE '--- VÉRIFICATION DES DONNÉES DE L''UTILISATEUR 109 ---';
    
    SELECT storage_used, storage_limit, storage_tier 
    INTO storage_used_val, storage_limit_val, storage_tier_val
    FROM public.users WHERE id = 109;
    
    IF storage_used_val IS NOT NULL THEN
        RAISE NOTICE 'Utilisation du stockage: % octets (% formaté)', 
            storage_used_val, 
            CASE 
                WHEN storage_used_val >= 1073741824 THEN ROUND(storage_used_val::numeric / 1073741824, 2) || ' GB'
                WHEN storage_used_val >= 1048576 THEN ROUND(storage_used_val::numeric / 1048576, 2) || ' MB'
                WHEN storage_used_val >= 1024 THEN ROUND(storage_used_val::numeric / 1024, 2) || ' KB'
                ELSE storage_used_val || ' Bytes'
            END;
    ELSE
        RAISE NOTICE 'Aucune donnée d''utilisation de stockage trouvée ✗';
    END IF;
    
    IF storage_limit_val IS NOT NULL THEN
        RAISE NOTICE 'Limite de stockage: % octets (% formaté)', 
            storage_limit_val,
            CASE 
                WHEN storage_limit_val >= 1073741824 THEN ROUND(storage_limit_val::numeric / 1073741824, 2) || ' GB'
                WHEN storage_limit_val >= 1048576 THEN ROUND(storage_limit_val::numeric / 1048576, 2) || ' MB'
                WHEN storage_limit_val >= 1024 THEN ROUND(storage_limit_val::numeric / 1024, 2) || ' KB'
                ELSE storage_limit_val || ' Bytes'
            END;
    ELSE
        RAISE NOTICE 'Aucune donnée de limite de stockage trouvée ✗';
    END IF;
    
    IF storage_tier_val IS NOT NULL THEN
        RAISE NOTICE 'Plan de stockage: %', storage_tier_val;
    ELSE
        RAISE NOTICE 'Aucun plan de stockage trouvé ✗';
    END IF;
END $$;

-- 4. Vérifier les données de stockage de client_109
DO $$
DECLARE
    total_used_val BIGINT;
    last_calc_val TIMESTAMP;
    storage_categories_val JSONB;
BEGIN
    RAISE NOTICE '--- VÉRIFICATION DES DONNÉES DE STOCKAGE DE CLIENT_109 ---';
    
    SELECT total_used, last_calculation, storage_categories
    INTO total_used_val, last_calc_val, storage_categories_val
    FROM client_109.storage_management
    WHERE user_id = 109;
    
    IF total_used_val IS NOT NULL THEN
        RAISE NOTICE 'Utilisation totale: % octets (% formaté)', 
            total_used_val,
            CASE 
                WHEN total_used_val >= 1073741824 THEN ROUND(total_used_val::numeric / 1073741824, 2) || ' GB'
                WHEN total_used_val >= 1048576 THEN ROUND(total_used_val::numeric / 1048576, 2) || ' MB'
                WHEN total_used_val >= 1024 THEN ROUND(total_used_val::numeric / 1024, 2) || ' KB'
                ELSE total_used_val || ' Bytes'
            END;
    ELSE
        RAISE NOTICE 'Aucune donnée d''utilisation totale trouvée ✗';
    END IF;
    
    IF last_calc_val IS NOT NULL THEN
        RAISE NOTICE 'Dernier calcul: %', last_calc_val;
    ELSE
        RAISE NOTICE 'Aucune date de dernier calcul trouvée ✗';
    END IF;
    
    IF storage_categories_val IS NOT NULL THEN
        RAISE NOTICE 'Catégories de stockage:';
        RAISE NOTICE '- Documents: % octets', (storage_categories_val->>'documents')::BIGINT;
        RAISE NOTICE '- Base de données: % octets', (storage_categories_val->>'database')::BIGINT;
        RAISE NOTICE '- Total: % octets', (storage_categories_val->>'total')::BIGINT;
    ELSE
        RAISE NOTICE 'Aucune catégorie de stockage trouvée ✗';
    END IF;
END $$;

-- 5. Tester le calcul du stockage pour client_109
DO $$
DECLARE
    calc_result BIGINT;
BEGIN
    RAISE NOTICE '--- TEST DE CALCUL DU STOCKAGE POUR CLIENT_109 ---';
    
    -- Exécuter le calcul
    calc_result := public.calculate_total_client_storage('client_109');
    
    RAISE NOTICE 'Résultat du calcul: % octets (% formaté)', 
        calc_result,
        CASE 
            WHEN calc_result >= 1073741824 THEN ROUND(calc_result::numeric / 1073741824, 2) || ' GB'
            WHEN calc_result >= 1048576 THEN ROUND(calc_result::numeric / 1048576, 2) || ' MB'
            WHEN calc_result >= 1024 THEN ROUND(calc_result::numeric / 1024, 2) || ' KB'
            ELSE calc_result || ' Bytes'
        END;
END $$;

-- 6. Vérifier les statistiques par table pour client_109
DO $$
DECLARE
    stats_record RECORD;
BEGIN
    RAISE NOTICE '--- STATISTIQUES DE STOCKAGE PAR TABLE POUR CLIENT_109 ---';
    
    FOR stats_record IN 
        SELECT 
            table_name, 
            row_count, 
            table_type,
            total_size,
            CASE 
                WHEN total_size >= 1073741824 THEN ROUND(total_size::numeric / 1073741824, 2) || ' GB'
                WHEN total_size >= 1048576 THEN ROUND(total_size::numeric / 1048576, 2) || ' MB'
                WHEN total_size >= 1024 THEN ROUND(total_size::numeric / 1024, 2) || ' KB'
                ELSE total_size || ' Bytes'
            END AS formatted_size
        FROM public.get_client_schema_statistics('client_109')
        ORDER BY total_size DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Table %: % lignes, Type: %, Taille: %', 
            stats_record.table_name, 
            stats_record.row_count, 
            stats_record.table_type, 
            stats_record.formatted_size;
    END LOOP;
END $$;

-- 7. Vérifier la synchronisation des données
DO $$
DECLARE
    user_storage BIGINT;
    management_storage BIGINT;
    docs_storage BIGINT;
    db_storage BIGINT;
    total_storage BIGINT;
BEGIN
    RAISE NOTICE '--- VÉRIFICATION DE LA SYNCHRONISATION DES DONNÉES ---';
    
    -- Récupérer les valeurs
    SELECT storage_used INTO user_storage FROM public.users WHERE id = 109;
    
    SELECT 
        total_used, 
        (storage_categories->>'documents')::BIGINT,
        (storage_categories->>'database')::BIGINT,
        (storage_categories->>'total')::BIGINT
    INTO 
        management_storage, 
        docs_storage, 
        db_storage, 
        total_storage
    FROM client_109.storage_management WHERE user_id = 109;
    
    -- Vérifier la correspondance
    IF user_storage = management_storage THEN
        RAISE NOTICE 'La synchronisation entre users.storage_used et storage_management.total_used est correcte ✓';
    ELSE
        RAISE NOTICE 'ERREUR: Les valeurs ne sont pas synchronisées ✗';
        RAISE NOTICE '- users.storage_used: %', user_storage;
        RAISE NOTICE '- storage_management.total_used: %', management_storage;
    END IF;
    
    -- Vérifier la cohérence des catégories
    IF docs_storage + db_storage = total_storage THEN
        RAISE NOTICE 'La somme des catégories est égale au total ✓';
    ELSE
        RAISE NOTICE 'ERREUR: La somme des catégories ne correspond pas au total ✗';
        RAISE NOTICE '- Documents: %', docs_storage;
        RAISE NOTICE '- Base de données: %', db_storage;
        RAISE NOTICE '- Somme: %', docs_storage + db_storage;
        RAISE NOTICE '- Total indiqué: %', total_storage;
    END IF;
END $$;

-- 8. Vérifier les triggers sur client_109
DO $$
DECLARE
    count_triggers INTEGER;
BEGIN
    RAISE NOTICE '--- VÉRIFICATION DES TRIGGERS SUR CLIENT_109 ---';
    
    SELECT COUNT(*) INTO count_triggers
    FROM information_schema.triggers
    WHERE trigger_schema = 'client_109' AND trigger_name LIKE '%storage%';
    
    RAISE NOTICE 'Nombre de triggers liés au stockage trouvés: %', count_triggers;
    
    IF count_triggers > 0 THEN
        RAISE NOTICE 'Les triggers sont en place ✓';
    ELSE
        RAISE NOTICE 'Aucun trigger lié au stockage trouvé ✗';
    END IF;
END $$; 