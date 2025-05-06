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

-- Création ou vérification du rôle 'clients'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clients') THEN
    CREATE ROLE clients;
    RAISE NOTICE 'Le rôle clients a été créé';
  ELSE
    RAISE NOTICE 'Le rôle clients existe déjà';
  END IF;
  
  -- Accorder les permissions sur la base de données et le schéma
  EXECUTE 'GRANT CONNECT ON DATABASE ' || current_database() || ' TO clients';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO clients';
  
  -- Accorder SELECT à toutes les tables
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO clients';
  
  -- Accorder INSERT, UPDATE, DELETE sur les tables spécifiques
  EXECUTE 'GRANT INSERT, UPDATE, DELETE ON properties, tenants, transactions, maintenance_requests, documents, form_submissions, feedbacks TO clients';
  
  -- Accorder USAGE sur toutes les séquences
  EXECUTE 'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO clients';
  
  -- Accorder EXECUTE sur toutes les fonctions
  EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO clients';
END $$;

-- Configurer la policy RLS pour les utilisateurs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    EXECUTE 'ALTER TABLE users ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'users_policy',
      'users',
      'current_user_id() = id OR current_setting(''role'') = ''postgres'''
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
      'current_setting(''role'') = ''postgres'' OR user_id = current_user_id()'
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
      'current_setting(''role'') = ''postgres'' OR user_id = current_user_id()'
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
      'current_setting(''role'') = ''postgres'' OR user_id = current_user_id()'
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
      'current_setting(''role'') = ''postgres'' OR user_id = current_user_id()'
    );
  END IF;
END $$;

-- Configuration pour les demandes de maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'maintenance_requests') THEN
    EXECUTE 'ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'maintenance_requests_policy',
      'maintenance_requests',
      'current_setting(''role'') = ''postgres'' OR ' ||
      'EXISTS (SELECT 1 FROM tenants WHERE tenants.id = maintenance_requests.tenant_id AND tenants.user_id = current_user_id()) OR ' ||
      'EXISTS (SELECT 1 FROM properties WHERE properties.id = maintenance_requests.property_id AND properties.user_id = current_user_id())'
    );
  END IF;
END $$;

-- Configuration pour les formulaires soumis
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'form_submissions') THEN
    EXECUTE 'ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'form_submissions_policy',
      'form_submissions',
      'current_setting(''role'') = ''postgres'''
    );
  END IF;
END $$;

-- Configuration pour les feedbacks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'feedbacks') THEN
    EXECUTE 'ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY';
    PERFORM safe_create_policy(
      'feedbacks_policy',
      'feedbacks',
      'current_setting(''role'') = ''postgres'''
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

-- Nettoyer les autres rôles custom, sauf postgres et clients
DO $$
DECLARE
  role_record RECORD;
BEGIN
  FOR role_record IN 
    SELECT rolname 
    FROM pg_roles 
    WHERE rolname NOT IN ('postgres', 'clients')
    AND rolname NOT LIKE 'pg_%'
  LOOP
    BEGIN
      -- Essayer de réassigner les objets détenus par ce rôle à postgres
      EXECUTE format('REASSIGN OWNED BY %I TO postgres', role_record.rolname);
      
      -- Essayer de supprimer les objets détenus
      EXECUTE format('DROP OWNED BY %I', role_record.rolname);
      
      -- Supprimer le rôle
      EXECUTE format('DROP ROLE IF EXISTS %I', role_record.rolname);
      
      RAISE NOTICE 'Rôle % supprimé avec succès', role_record.rolname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Impossible de supprimer le rôle %: %', role_record.rolname, SQLERRM;
    END;
  END LOOP;
END $$;

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