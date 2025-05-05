// Script pour corriger les rôles des utilisateurs dans la base de données
import pg from 'pg';
const { Pool } = pg;

// Configuration de la connexion à la base de données
const pool = new Pool({
  connectionString: 'postgresql://postgres:123456789@localhost:5432/property_manager'
});

async function fixRolesInDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connexion à la base de données établie');
    
    // Commencer une transaction
    await client.query('BEGIN');
    
    // 1. Vérifier les rôles existants dans PostgreSQL
    console.log('Vérification des rôles PostgreSQL...');
    const pgRolesResult = await client.query(`
      SELECT rolname 
      FROM pg_roles 
      WHERE rolname IN ('admin', 'clients', 'app_admin', 'app_manager', 'app_tenant', 'app_service');
    `);
    
    console.log('Rôles PostgreSQL trouvés:', pgRolesResult.rows.map(r => r.rolname));
    
    // 2. Vérifier les contraintes sur la table users
    console.log('\nVérification des contraintes sur la table users...');
    const constraintsResult = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as constraint_def 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND conname LIKE '%role%';
    `);
    
    console.log('Contraintes trouvées:');
    constraintsResult.rows.forEach(constraint => {
      console.log(`Nom: ${constraint.conname}, Définition: ${constraint.constraint_def}`);
    });
    
    // 3. Supprimer la contrainte existante et créer une nouvelle qui inclut "clients"
    console.log('\nMise à jour de la contrainte pour la colonne role...');
    
    // Rechercher le nom exact de la contrainte avant de la supprimer
    if (constraintsResult.rows.length > 0) {
      const constraintName = constraintsResult.rows[0].conname;
      console.log(`Suppression de la contrainte existante: ${constraintName}`);
      
      await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${constraintName};`);
      
      // Créer la nouvelle contrainte
      await client.query(`
        ALTER TABLE users ADD CONSTRAINT ${constraintName} 
        CHECK (role IN ('admin', 'clients', 'manager', 'tenant', 'client'));
      `);
      console.log(`Contrainte ${constraintName} recréée avec les valeurs: 'admin', 'clients', 'manager', 'tenant', 'client'`);
    } else {
      console.log('Aucune contrainte spécifique trouvée pour la colonne role');
    }
    
    // 4. Vérifier les utilisateurs et leurs rôles actuels
    console.log('\nVérification des utilisateurs et leurs rôles...');
    const usersResult = await client.query(`
      SELECT id, username, role 
      FROM users 
      ORDER BY id;
    `);
    
    console.log('Utilisateurs trouvés:');
    usersResult.rows.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    // 5. Mettre à jour les rôles des utilisateurs
    console.log('\nMise à jour des rôles des utilisateurs...');
    
    // Mettre à jour testuser en admin
    await client.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE username = 'testuser';
    `);
    console.log('Utilisateur testuser mis à jour en admin');
    
    // Mettre à jour les autres utilisateurs en clients
    await client.query(`
      UPDATE users 
      SET role = 'clients' 
      WHERE username != 'testuser';
    `);
    console.log('Autres utilisateurs mis à jour en clients');
    
    // 6. Vérifier les rôles après mise à jour
    const updatedUsersResult = await client.query(`
      SELECT id, username, role 
      FROM users 
      ORDER BY id;
    `);
    
    console.log('Utilisateurs après mise à jour:');
    updatedUsersResult.rows.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    // 7. S'assurer que les rôles PostgreSQL existent
    console.log('\nS\'assurer que les rôles PostgreSQL nécessaires existent...');
    
    // Créer rôle admin si nécessaire
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
          CREATE ROLE admin WITH LOGIN PASSWORD 'admin_password';
          RAISE NOTICE 'Rôle admin créé';
        ELSE
          RAISE NOTICE 'Rôle admin existe déjà';
        END IF;
      END
      $$;
    `);
    
    // Créer rôle clients si nécessaire
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
    
    // 8. Nettoyer les anciens rôles si nécessaires
    console.log('\nNettoyage des anciens rôles PostgreSQL...');
    
    await client.query(`
      DO $$
      BEGIN
        -- Révoquer les privilèges et supprimer app_service s'il existe
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_service') THEN
          REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_service;
          REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_service;
          REVOKE app_service FROM postgres;
          DROP ROLE IF EXISTS app_service;
          RAISE NOTICE 'Rôle app_service supprimé';
        END IF;

        -- Révoquer les privilèges et supprimer app_tenant s'il existe
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_tenant') THEN
          REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_tenant;
          REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_tenant;
          DROP ROLE IF EXISTS app_tenant;
          RAISE NOTICE 'Rôle app_tenant supprimé';
        END IF;

        -- Révoquer les privilèges et supprimer app_manager s'il existe
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_manager') THEN
          REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_manager;
          REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_manager;
          DROP ROLE IF EXISTS app_manager;
          RAISE NOTICE 'Rôle app_manager supprimé';
        END IF;
      END
      $$;
    `);
    
    // 9. Configurer les autorisations pour admin
    console.log('\nConfiguration des autorisations pour le rôle admin...');
    
    await client.query(`
      -- Accès complet pour admin
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;
      GRANT USAGE ON SCHEMA public TO admin;
      GRANT admin TO postgres;
    `);
    
    // 10. Configurer les autorisations pour clients
    console.log('\nConfiguration des autorisations pour le rôle clients...');
    
    await client.query(`
      -- Accès en lecture aux tables principales
      GRANT SELECT ON properties, maintenance_requests, documents, tenants TO clients;
      
      -- Accès en lecture à sa propre ligne dans la table users
      GRANT SELECT ON users TO clients;
      
      -- Accès en lecture/écriture pour les tables client
      GRANT SELECT, INSERT, UPDATE ON maintenance_requests TO clients;
      GRANT SELECT, INSERT, UPDATE ON documents TO clients;
      GRANT SELECT, INSERT, UPDATE ON transactions TO clients;
      
      -- Accès aux séquences
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO clients;
      
      -- Configurer les options par défaut
      ALTER ROLE clients SET search_path TO public;
      
      -- Accorder le rôle clients à postgres
      GRANT clients TO postgres;
    `);
    
    // 11. Vérifier que RLS est activé sur les tables importantes
    console.log('\nVérification de l\'activation de RLS sur les tables importantes...');
    
    await client.query(`
      -- S'assurer que RLS est activé
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
    `);
    
    // Valider la transaction
    await client.query('COMMIT');
    console.log('\nMise à jour des rôles terminée avec succès');
    
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
fixRolesInDatabase(); 