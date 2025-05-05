// Script pour mettre à jour les rôles PostgreSQL
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

async function updateRoles() {
  const client = await pool.connect();
  try {
    console.log('Connexion à la base de données établie');
    
    // Commencer une transaction
    await client.query('BEGIN');
    
    console.log('Suppression des anciens rôles...');
    
    // Vérifier si les rôles existent avant de les supprimer
    const checkRolesQuery = `
      SELECT rolname FROM pg_roles 
      WHERE rolname IN ('app_manager', 'app_tenant', 'app_service');
    `;
    const { rows } = await client.query(checkRolesQuery);
    
    // Afficher les rôles qui vont être supprimés
    if (rows.length > 0) {
      console.log('Rôles à supprimer:');
      rows.forEach(row => console.log(` - ${row.rolname}`));
    } else {
      console.log('Aucun des rôles à supprimer n\'existe.');
    }
    
    // Supprimer app_service d'abord car il peut être utilisé par d'autres rôles
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_service') THEN
          REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_service;
          REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_service;
          REVOKE app_service FROM postgres;
          DROP ROLE IF EXISTS app_service;
          RAISE NOTICE 'Rôle app_service supprimé';
        ELSE
          RAISE NOTICE 'Rôle app_service n''existe pas';
        END IF;
      END
      $$;
    `);
    
    // Supprimer app_manager
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_manager') THEN
          REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_manager;
          REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_manager;
          DROP ROLE IF EXISTS app_manager;
          RAISE NOTICE 'Rôle app_manager supprimé';
        ELSE
          RAISE NOTICE 'Rôle app_manager n''existe pas';
        END IF;
      END
      $$;
    `);
    
    // Supprimer app_tenant
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_tenant') THEN
          REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_tenant;
          REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_tenant;
          DROP ROLE IF EXISTS app_tenant;
          RAISE NOTICE 'Rôle app_tenant supprimé';
        ELSE
          RAISE NOTICE 'Rôle app_tenant n''existe pas';
        END IF;
      END
      $$;
    `);
    
    console.log('Création du nouveau rôle clients...');
    
    // Créer le nouveau rôle clients
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clients') THEN
          CREATE ROLE clients WITH LOGIN PASSWORD 'clients_password';
          RAISE NOTICE 'Rôle clients créé';
        ELSE
          RAISE NOTICE 'Rôle clients existe déjà';
        END IF;
      END
      $$;
    `);
    
    // Configurer les permissions pour le nouveau rôle
    console.log('Configuration des permissions pour le rôle clients...');
    
    await client.query(`
      -- Accès en lecture aux tables principales
      GRANT SELECT ON properties, maintenance_requests, documents, tenants TO clients;
      
      -- Accès en lecture à sa propre ligne dans la table users (à compléter avec RLS)
      GRANT SELECT ON users TO clients;
      
      -- Accès en lecture/écriture pour les tables client
      GRANT SELECT, INSERT, UPDATE ON maintenance_requests TO clients;
      GRANT SELECT, INSERT, UPDATE ON documents TO clients;
      GRANT SELECT, INSERT, UPDATE ON transactions TO clients;
      
      -- Accès aux séquences
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO clients;
      
      -- Configurer les options par défaut
      ALTER ROLE clients SET search_path TO public;
    `);
    
    // Configurer le nouveau rôle pour postgres
    console.log('Affectation du rôle clients à postgres...');
    await client.query(`
      GRANT clients TO postgres;
    `);
    
    // Valider la transaction
    await client.query('COMMIT');
    console.log('Mise à jour des rôles terminée avec succès');
    
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour des rôles:', error);
  } finally {
    // Libérer le client
    client.release();
    console.log('Connexion à la base de données fermée');
    await pool.end();
  }
}

// Exécuter la fonction
updateRoles(); 