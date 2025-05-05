-- Script de configuration de la sécurité au niveau des lignes (Row-Level Security) pour PostgreSQL
-- À exécuter avec les privilèges admin pour initialiser correctement la base de données

-- Vérification des prérequis
DO $$
BEGIN
  -- S'assurer que la base de données peut utiliser des variables personnalisées
  EXECUTE 'SHOW server_version';
  RAISE NOTICE 'PostgreSQL est prêt pour la configuration RLS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de la vérification de PostgreSQL: %', SQLERRM;
END $$;

-- Configuration des variables d'environnement d'application
CREATE OR REPLACE FUNCTION set_app_variables() RETURNS VOID AS $$
BEGIN
  -- Créer la fonction qui définit les variables d'application par défaut
  EXECUTE 'ALTER DATABASE ' || current_database() || ' SET app.user_id TO ''0''';
  RAISE NOTICE 'Variables d''application configurées avec succès';
END;
$$ LANGUAGE plpgsql;

SELECT set_app_variables();

-- Fonction pour obtenir l'ID utilisateur actuel depuis le contexte
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(nullif(current_setting('app.user_id', TRUE), ''), '0')::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la récupération de l''ID utilisateur: %', SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer ou remplacer une politique en toute sécurité
CREATE OR REPLACE FUNCTION safe_create_policy(
  p_policy_name TEXT,
  p_table_name TEXT,
  p_using_expr TEXT
) RETURNS VOID AS $$
BEGIN
  -- Vérifier si la politique existe déjà
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = p_policy_name AND tablename = p_table_name
  ) THEN
    -- Supprimer la politique existante
    EXECUTE format('DROP POLICY %I ON %I', p_policy_name, p_table_name);
    RAISE NOTICE 'Politique % sur la table % remplacée', p_policy_name, p_table_name;
  END IF;
  
  -- Créer la nouvelle politique
  EXECUTE format('CREATE POLICY %I ON %I USING (%s)', 
    p_policy_name, p_table_name, p_using_expr);
  RAISE NOTICE 'Politique % sur la table % créée avec succès', p_policy_name, p_table_name;
EXCEPTION
  WHEN undefined_table THEN
    RAISE WARNING 'La table % n''existe pas encore, politique % ignorée', p_table_name, p_policy_name;
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la création de la politique % sur la table %: %', 
      p_policy_name, p_table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Configurer la policy RLS pour les utilisateurs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    EXECUTE 'ALTER TABLE users ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'users_policy',
      'users',
      'current_user_id() = id OR EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role = ''admin'')'
    );
  ELSE
    RAISE NOTICE 'Table users non trouvée, création de la politique reportée';
  END IF;
END $$;

-- Politique pour les propriétés
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'properties') THEN
    EXECUTE 'ALTER TABLE properties ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'properties_policy',
      'properties',
      'EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role = ''admin'') OR ' ||
      'EXISTS (SELECT 1 FROM tenants WHERE tenants.property_id = properties.id AND tenants.user_id = current_user_id())'
    );
  END IF;
END $$;

-- Configuration pour les locataires
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tenants') THEN
    EXECUTE 'ALTER TABLE tenants ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'tenants_policy',
      'tenants',
      'EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role = ''admin'') OR user_id = current_user_id()'
    );
  END IF;
END $$;

-- Configuration pour les documents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'documents') THEN
    EXECUTE 'ALTER TABLE documents ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'documents_policy',
      'documents',
      'EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role = ''admin'') OR ' ||
      'user_id = current_user_id() OR ' ||
      'EXISTS (SELECT 1 FROM tenant_documents td JOIN tenants t ON td.tenant_id = t.id ' ||
      'WHERE td.document_id = documents.id AND t.user_id = current_user_id())'
    );
  END IF;
END $$;

-- Configuration pour les transactions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'transactions') THEN
    EXECUTE 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'transactions_policy',
      'transactions',
      'EXISTS (SELECT 1 FROM users WHERE id = current_user_id() AND role = ''admin'') OR ' ||
      'user_id = current_user_id() OR ' ||
      'EXISTS (SELECT 1 FROM tenants WHERE tenants.id = transactions.tenant_id AND tenants.user_id = current_user_id())'
    );
  END IF;
END $$;

-- Activer les triggers pour la journalisation des modifications
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Enregistre les modifications dans la table d'historique appropriée
    IF TG_TABLE_NAME = 'properties' AND EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'property_history') THEN
      INSERT INTO property_history (property_id, field, old_value, new_value, change_type, user_id)
      SELECT 
        NEW.id, 
        key, 
        CAST(jsonb_build_object(key, OLD.*)::jsonb->>key AS TEXT), 
        CAST(jsonb_build_object(key, NEW.*)::jsonb->>key AS TEXT),
        'update',
        current_user_id()
      FROM jsonb_object_keys(to_jsonb(NEW.*)) k(key)
      WHERE jsonb_build_object(key, OLD.*)::jsonb->>key IS DISTINCT FROM jsonb_build_object(key, NEW.*)::jsonb->>key;
    END IF;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur dans le trigger de journalisation: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ajouter un commentaire sur la configuration
COMMENT ON FUNCTION current_user_id() IS 'Retourne l''ID de l''utilisateur actuel à partir du contexte d''application';
COMMENT ON FUNCTION log_table_changes() IS 'Fonction pour journaliser les modifications des tables principales';
COMMENT ON FUNCTION safe_create_policy(TEXT, TEXT, TEXT) IS 'Crée ou remplace une politique RLS de manière sécurisée';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Configuration de la sécurité RLS terminée avec succès';
  RAISE NOTICE 'Base de données: %', current_database();
  RAISE NOTICE 'Date: %', now();
  RAISE NOTICE '========================================================';
END $$; 