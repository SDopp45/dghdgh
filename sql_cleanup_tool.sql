-- ========================================================
-- OUTIL DE NETTOYAGE SQL - FINALISATION DE LA MIGRATION
-- ========================================================
--
-- Ce script va finaliser le nettoyage après la migration initiale :
--   1. Suppression de la colonne form_definition
--   2. Suppression des anciennes tables
--   3. Suppression des séquences inutilisées
--   4. Validation finale des données

-- ========================================================
-- CONFIGURATION
-- ========================================================

-- Schémas à traiter
DO $$
BEGIN
    -- CONFIGURER ICI : Commentez/décommentez les schémas à traiter
    CREATE TEMPORARY TABLE schemas_to_process(name TEXT) ON COMMIT DROP;
    INSERT INTO schemas_to_process VALUES 
        ('template'),
        ('client_109')
        -- Autres schémas à ajouter ici si nécessaire
    ;

    -- Configuration pour le nettoyage
    CREATE TEMPORARY TABLE execution_options(
        key TEXT PRIMARY KEY,
        value BOOLEAN
    ) ON COMMIT DROP;
    
    -- Options de nettoyage activées
    INSERT INTO execution_options VALUES 
        ('migrate_forms_to_links', false),           -- Désactivé car déjà fait
        ('migrate_link_definitions', false),         -- Désactivé car déjà fait
        ('remove_form_definition_column', true),     -- Suppression de la colonne form_definition
        ('drop_old_tables', true),                   -- Suppression des anciennes tables
        ('drop_unused_sequences', true)              -- Suppression des séquences inutilisées
    ;
END $$;

-- ========================================================
-- FONCTION PRINCIPALE DE NETTOYAGE
-- ========================================================

CREATE OR REPLACE FUNCTION perform_cleanup()
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
    form_count INTEGER := 0;
    definition_count INTEGER := 0;
    option_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '=== DÉBUT DU PROCESSUS DE NETTOYAGE ===';

    -- Parcourir tous les schémas configurés
    FOR schema_name IN SELECT name FROM schemas_to_process LOOP
        RAISE NOTICE '----- Nettoyage du schéma % -----', schema_name;

        -- 1. Suppression de la colonne form_definition de links
        SELECT value INTO option_enabled FROM execution_options WHERE key = 'remove_form_definition_column';
        IF option_enabled THEN
            RAISE NOTICE '% : Suppression de la colonne form_definition de links...', schema_name;
            
            -- Vérifier si la colonne existe
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = schema_name AND table_name = 'links' AND column_name = 'form_definition'
            ) THEN
                -- Supprimer la colonne
                EXECUTE format('
                    ALTER TABLE %I.links
                    DROP COLUMN form_definition',
                    schema_name
                );
                
                RAISE NOTICE '% : Colonne form_definition supprimée', schema_name;
            ELSE
                RAISE NOTICE '% : Colonne form_definition inexistante, étape ignorée', schema_name;
            END IF;
        END IF;

        -- 2. Suppression des anciennes tables
        SELECT value INTO option_enabled FROM execution_options WHERE key = 'drop_old_tables';
        IF option_enabled THEN
            RAISE NOTICE '% : Suppression des anciennes tables...', schema_name;
            
            -- Supprimer les tables obsolètes
            EXECUTE format('DROP TABLE IF EXISTS %I.form_submissions CASCADE', schema_name);
            EXECUTE format('DROP TABLE IF EXISTS %I.form_fields CASCADE', schema_name);
            EXECUTE format('DROP TABLE IF EXISTS %I.form_field_options CASCADE', schema_name);
            
            -- Supprimer forms uniquement si elle existe
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = schema_name AND table_name = 'forms'
            ) THEN
                EXECUTE format('DROP TABLE IF EXISTS %I.forms CASCADE', schema_name);
                RAISE NOTICE '% : Table forms supprimée', schema_name;
            END IF;
            
            RAISE NOTICE '% : Anciennes tables supprimées', schema_name;
        END IF;

        -- 3. Suppression des séquences inutilisées
        SELECT value INTO option_enabled FROM execution_options WHERE key = 'drop_unused_sequences';
        IF option_enabled THEN
            RAISE NOTICE '% : Suppression des séquences inutilisées...', schema_name;
            
            -- Supprimer les séquences obsolètes si elles existent
            EXECUTE format('
                DO $seq$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = %L AND sequencename = ''form_fields_id_seq'') THEN
                        EXECUTE ''DROP SEQUENCE IF EXISTS ' || schema_name || '.form_fields_id_seq'';
                        RAISE NOTICE ''Séquence form_fields_id_seq supprimée'';
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = %L AND sequencename = ''form_field_options_id_seq'') THEN
                        EXECUTE ''DROP SEQUENCE IF EXISTS ' || schema_name || '.form_field_options_id_seq'';
                        RAISE NOTICE ''Séquence form_field_options_id_seq supprimée'';
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = %L AND sequencename = ''form_submissions_id_seq'') THEN
                        EXECUTE ''DROP SEQUENCE IF EXISTS ' || schema_name || '.form_submissions_id_seq'';
                        RAISE NOTICE ''Séquence form_submissions_id_seq supprimée'';
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = %L AND sequencename = ''forms_id_seq'') THEN
                        EXECUTE ''DROP SEQUENCE IF EXISTS ' || schema_name || '.forms_id_seq'';
                        RAISE NOTICE ''Séquence forms_id_seq supprimée'';
                    END IF;
                END $seq$',
                schema_name, schema_name, schema_name, schema_name
            );
            
            RAISE NOTICE '% : Séquences inutilisées supprimées', schema_name;
        END IF;

        RAISE NOTICE '----- Nettoyage du schéma % terminé -----', schema_name;
    END LOOP;

    -- 4. Validation finale des données
    RAISE NOTICE '';
    RAISE NOTICE '=== VALIDATION FINALE DES DONNÉES ===';
    
    FOR schema_name IN SELECT name FROM schemas_to_process LOOP
        RAISE NOTICE '----- Validation du schéma % -----', schema_name;
        
        -- Compter les links de type form
        EXECUTE format('
            SELECT COUNT(*) FROM %I.links WHERE type = ''form''', 
            schema_name
        ) INTO form_count;
        RAISE NOTICE '% : % liens de type formulaire', schema_name, form_count;
        
        -- Compter les définitions de formulaire
        EXECUTE format('
            SELECT COUNT(*) FROM %I.form_definitions', 
            schema_name
        ) INTO definition_count;
        RAISE NOTICE '% : % définitions de formulaire', schema_name, definition_count;
        
        -- Vérifier la cohérence
        IF form_count <> definition_count THEN
            RAISE WARNING '% : ATTENTION - Incohérence détectée : % liens de type form mais % définitions', 
                schema_name, form_count, definition_count;
        ELSE
            RAISE NOTICE '% : ✓ Cohérence vérifiée : % forms = % définitions', schema_name, form_count, definition_count;
        END IF;
        
        -- Compter les réponses aux formulaires
        EXECUTE format('
            SELECT COUNT(*) FROM %I.form_responses', 
            schema_name
        ) INTO form_count;
        RAISE NOTICE '% : % réponses de formulaire', schema_name, form_count;
        
        RAISE NOTICE '----- Validation du schéma % terminée -----', schema_name;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== FIN DU PROCESSUS DE NETTOYAGE ===';
    RAISE NOTICE 'Tout est terminé ! La refactorisation est complète.';
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- EXÉCUTION DU NETTOYAGE
-- ========================================================

-- Exécuter le nettoyage
SELECT perform_cleanup();

-- Nettoyer la fonction après utilisation
DROP FUNCTION perform_cleanup();

-- ========================================================
-- FIN DU SCRIPT
-- ======================================================== 