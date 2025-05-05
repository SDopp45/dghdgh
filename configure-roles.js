// Script pour configurer les rôles PostgreSQL et leurs permissions
import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();

// Vérifier si l'URL de la base de données est définie
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL doit être définie dans les variables d\'environnement');
  process.exit(1);
}

// Créer un pool de connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function configureRoles() {
  const client = await pool.connect();
  try {
    console.log('Connexion à la base de données établie');
    
    // Commencer une transaction
    await client.query('BEGIN');
    
    // 1. Créer les rôles de base
    console.log('Création des rôles...');
    
    // Rôle pour l'administrateur
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
          CREATE ROLE app_admin;
        END IF;
      END
      $$;
    `);
    
    // Rôle pour les gestionnaires
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_manager') THEN
          CREATE ROLE app_manager;
        END IF;
      END
      $$;
    `);
    
    // Rôle pour les locataires
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_tenant') THEN
          CREATE ROLE app_tenant;
        END IF;
      END
      $$;
    `);
    
    // Rôle pour les applications (services web)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_service') THEN
          CREATE ROLE app_service WITH LOGIN PASSWORD 'service_password';
        END IF;
      END
      $$;
    `);
    
    // 2. Configuration des permissions pour chaque rôle
    console.log('Configuration des permissions pour les rôles...');
    
    // Administrateur - accès complet à toutes les tables
    await client.query(`
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
    `);
    
    // Gestionnaire - accès en lecture/écriture aux tables principales, mais pas de suppression
    await client.query(`
      GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_manager;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_manager;
      
      -- Permissions spécifiques pour certaines tables sensibles
      -- Note: La clause WHERE ne peut pas être utilisée dans REVOKE pour les tables
      -- À la place, nous allons utiliser des politiques RLS
    `);
    
    // Locataire - accès très restreint
    await client.query(`
      -- Accès en lecture aux tables de base
      GRANT SELECT ON properties, maintenance_requests, documents, tenants TO app_tenant;
      
      -- Accès en lecture limitée à sa propre ligne dans la table users
      GRANT SELECT ON users TO app_tenant;
      
      -- Possibilité de créer des demandes de maintenance
      GRANT INSERT, UPDATE ON maintenance_requests TO app_tenant;
      
      -- Accès aux séquences
      GRANT USAGE ON SEQUENCE maintenance_requests_id_seq TO app_tenant;
    `);
    
    // Service - accès complet mais utilisera RLS
    await client.query(`
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_service;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_service;
    `);
    
    // 3. Configurer le rôle par défaut pour les connexions
    console.log('Configuration des autorisations par défaut...');
    
    // Définir app_service comme utilisateur par défaut pour les connexions
    await client.query(`
      ALTER ROLE app_service SET search_path TO public;
      GRANT app_service TO postgres;
    `);
    
    // Valider la transaction
    await client.query('COMMIT');
    console.log('Configuration des rôles terminée avec succès');
    
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error('Erreur lors de la configuration des rôles:', error);
  } finally {
    // Libérer le client
    client.release();
    console.log('Connexion à la base de données fermée');
    await pool.end();
  }
}

// Exécuter la fonction
configureRoles(); 