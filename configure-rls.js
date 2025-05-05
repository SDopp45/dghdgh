// Script pour configurer le Row Level Security (RLS) sur les tables PostgreSQL
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

// Tables qui nécessitent des politiques RLS spécifiques
const tablesRequiringRLS = [
  'users',
  'properties',
  'tenants',
  'transactions',
  'documents',
  'folders',
  'tenant_documents',
  'visits',
  'maintenance_requests',
  'tenant_history',
  'notifications',
  'property_works'
];

async function configureRLS() {
  const client = await pool.connect();
  try {
    console.log('Connexion à la base de données établie');
    
    // Commencer une transaction
    await client.query('BEGIN');
    
    // Activer le RLS sur les tables appropriées
    for (const table of tablesRequiringRLS) {
      console.log(`Configuration du RLS pour la table: ${table}`);
      
      // Activer le RLS sur la table
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      
      // Créer une politique d'accès basée sur le rôle
      if (table === 'users') {
        // Politique pour la table users - un utilisateur ne peut voir et modifier que son propre profil,
        // mais les administrateurs et managers peuvent tout voir
        await client.query(`
          DROP POLICY IF EXISTS users_access_policy ON users;
          CREATE POLICY users_access_policy ON users
            USING (
              role = 'admin' OR
              role = 'manager' OR
              id = current_setting('app.user_id')::integer
            )
            WITH CHECK (
              role = 'admin' OR
              role = 'manager' OR
              id = current_setting('app.user_id')::integer
            );
        `);
      } else if (table === 'properties') {
        // Politique pour la table properties - les locataires ne voient que les propriétés auxquelles ils sont liés
        await client.query(`
          DROP POLICY IF EXISTS properties_access_policy ON properties;
          CREATE POLICY properties_access_policy ON properties
            USING (
              EXISTS (
                SELECT 1 FROM users
                WHERE users.id = current_setting('app.user_id')::integer
                AND (users.role = 'admin' OR users.role = 'manager' OR
                     EXISTS (
                       SELECT 1 FROM tenants
                       WHERE tenants.user_id = users.id
                       AND tenants.property_id = properties.id
                     ))
              )
            );
        `);
      } else if (table === 'tenants') {
        // Politique pour la table tenants - un locataire ne voit que ses propres données
        await client.query(`
          DROP POLICY IF EXISTS tenants_access_policy ON tenants;
          CREATE POLICY tenants_access_policy ON tenants
            USING (
              EXISTS (
                SELECT 1 FROM users
                WHERE users.id = current_setting('app.user_id')::integer
                AND (users.role = 'admin' OR users.role = 'manager' OR users.id = tenants.user_id)
              )
            )
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM users
                WHERE users.id = current_setting('app.user_id')::integer
                AND (users.role = 'admin' OR users.role = 'manager')
              )
            );
        `);
      } else {
        // Politique générique pour les autres tables - accès basé sur le rôle
        await client.query(`
          DROP POLICY IF EXISTS ${table}_access_policy ON ${table};
          CREATE POLICY ${table}_access_policy ON ${table}
            USING (
              EXISTS (
                SELECT 1 FROM users
                WHERE users.id = current_setting('app.user_id')::integer
                AND (users.role = 'admin' OR users.role = 'manager')
              )
            )
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM users
                WHERE users.id = current_setting('app.user_id')::integer
                AND (users.role = 'admin' OR users.role = 'manager')
              )
            );
        `);
      }
      
      console.log(`RLS configuré avec succès pour la table: ${table}`);
    }
    
    // Créer une fonction pour définir l'ID utilisateur pour les requêtes
    await client.query(`
      CREATE OR REPLACE FUNCTION set_user_id()
      RETURNS VOID AS $$
      BEGIN
        IF current_setting('app.user_id', true) IS NULL THEN
          PERFORM set_config('app.user_id', '0', false);
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Valider la transaction
    await client.query('COMMIT');
    console.log('Configuration RLS terminée avec succès');
    
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error('Erreur lors de la configuration du RLS:', error);
  } finally {
    // Libérer le client
    client.release();
    console.log('Connexion à la base de données fermée');
    await pool.end();
  }
}

// Exécuter la fonction
configureRLS(); 