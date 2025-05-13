-- Script de vérification de la configuration du stockage
-- Ce script vérifie la configuration des schémas public, template et client_109

-- 1. Vérification des fonctions dans le schéma public
SELECT '--- VÉRIFICATION DES FONCTIONS DANS LE SCHÉMA PUBLIC ---' AS section;
SELECT 
    routine_name, 
    routine_type, 
    data_type AS return_type,
    last_altered AS derniere_modification
FROM 
    information_schema.routines 
WHERE 
    routine_schema = 'public' 
    AND routine_name IN (
        'calculate_client_storage_usage',
        'calculate_total_client_storage',
        'get_client_schema_statistics',
        'cleanup_old_unused_files',
        'calculate_documents_size'
    )
ORDER BY 
    routine_name;

-- 2. Vérification des tables dans le schéma template
SELECT '--- VÉRIFICATION DES TABLES DANS LE SCHÉMA TEMPLATE ---' AS section;
SELECT 
    table_name, 
    table_type
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'template' 
    AND table_name IN ('storage_management');

-- 3. Vérification des colonnes de la table storage_management dans le schéma template
SELECT '--- COLONNES DE LA TABLE STORAGE_MANAGEMENT (TEMPLATE) ---' AS section;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'template' 
    AND table_name = 'storage_management' 
ORDER BY 
    ordinal_position;

-- 4. Vérification des triggers dans le schéma template
SELECT '--- VÉRIFICATION DES TRIGGERS DANS LE SCHÉMA TEMPLATE ---' AS section;
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing
FROM 
    information_schema.triggers 
WHERE 
    trigger_schema = 'template' 
    AND trigger_name LIKE '%storage%' 
ORDER BY 
    trigger_name;

-- 5. Vérification des tables dans le schéma client_109
SELECT '--- VÉRIFICATION DES TABLES DANS LE SCHÉMA CLIENT_109 ---' AS section;
SELECT 
    table_name, 
    table_type
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'client_109' 
    AND table_name IN ('storage_management');

-- 6. Vérification des colonnes de la table storage_management dans le schéma client_109
SELECT '--- COLONNES DE LA TABLE STORAGE_MANAGEMENT (CLIENT_109) ---' AS section;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'client_109' 
    AND table_name = 'storage_management' 
ORDER BY 
    ordinal_position;

-- 7. Vérification des données de stockage pour client_109
SELECT '--- DONNÉES DE STOCKAGE POUR CLIENT_109 ---' AS section;
SELECT 
    id,
    total_used,
    last_calculation,
    storage_categories,
    user_id
FROM 
    client_109.storage_management;

-- 8. Vérification de la table users dans le schéma public (pour client_109)
SELECT '--- DONNÉES DE L''UTILISATEUR 109 DANS LA TABLE USERS ---' AS section;
SELECT 
    id,
    storage_used,
    storage_limit,
    storage_tier
FROM 
    public.users 
WHERE 
    id = 109;

-- 9. Vérification des index sur les tables storage_management
SELECT '--- INDEX SUR LES TABLES STORAGE_MANAGEMENT ---' AS section;
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef
FROM 
    pg_indexes 
WHERE 
    (schemaname = 'template' OR schemaname = 'client_109') 
    AND tablename = 'storage_management';

-- 10. Exécuter un test de calcul pour client_109
SELECT '--- TEST DE CALCUL POUR CLIENT_109 ---' AS section;
-- Récupérer les valeurs actuelles avant le test
SELECT 
    'Valeurs avant calcul' AS info,
    u.storage_used,
    sm.total_used,
    sm.storage_categories
FROM 
    public.users u
    JOIN client_109.storage_management sm ON u.id = sm.user_id
WHERE 
    u.id = 109;

-- Exécuter le calcul
SELECT public.calculate_total_client_storage('client_109') AS resultat_calcul;

-- Récupérer les valeurs après le test
SELECT 
    'Valeurs après calcul' AS info,
    u.storage_used,
    sm.total_used,
    sm.storage_categories
FROM 
    public.users u
    JOIN client_109.storage_management sm ON u.id = sm.user_id
WHERE 
    u.id = 109;

-- 11. Tester les statistiques du schéma
SELECT '--- TEST DES STATISTIQUES POUR CLIENT_109 ---' AS section;
SELECT 
    table_name, 
    row_count, 
    table_type,
    pg_size_pretty(total_size) AS taille_totale
FROM 
    public.get_client_schema_statistics('client_109')
ORDER BY 
    total_size DESC
LIMIT 5;

-- 12. Vérification d'intégrité finale
SELECT '--- VÉRIFICATION D''INTÉGRITÉ FINALE ---' AS section;
-- Vérifier la correspondance entre les valeurs de storage_used dans users et total_used dans storage_management
SELECT 
    CASE 
        WHEN u.storage_used = sm.total_used THEN 'OK: Les valeurs sont synchronisées'
        ELSE 'ERREUR: Les valeurs ne sont pas synchronisées'
    END AS verification_synchronisation,
    u.storage_used AS user_storage_used,
    sm.total_used AS storage_management_total_used
FROM 
    public.users u
    JOIN client_109.storage_management sm ON u.id = sm.user_id
WHERE 
    u.id = 109;

-- Vérifier la présence des clés nécessaires dans storage_categories
SELECT 
    CASE 
        WHEN storage_categories ? 'documents' 
             AND storage_categories ? 'database' 
             AND storage_categories ? 'total' THEN 'OK: Toutes les clés requises sont présentes'
        ELSE 'ERREUR: Certaines clés sont manquantes'
    END AS verification_cles
FROM 
    client_109.storage_management
WHERE 
    user_id = 109; 