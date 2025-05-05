// Script pour mettre à jour les politiques RLS pour le nouveau rôle clients
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

// Tables qui nécessitent des politiques RLS
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

async function updateRLSPolicies() {
  const client = await pool.connect();
  try {
    console.log('Connexion à la base de données établie');
    
    // Commencer une transaction
    await client.query('BEGIN');
    
    // Pour chaque table, mettre à jour ou créer des politiques RLS pour le rôle clients
    for (const table of tablesRequiringRLS) {
      console.log(`Mise à jour des politiques RLS pour la table: ${table}`);
      
      // S'assurer que le RLS est activé sur la table
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      
      // Créer une politique d'accès pour clients selon le type de table
      if (table === 'users') {
        // Politique pour la table users - un client ne peut voir et modifier que son propre profil
        await client.query(`
          DROP POLICY IF EXISTS users_client_policy ON users;
          CREATE POLICY users_client_policy ON users
            USING (
              id = current_setting('app.user_id')::integer
            )
            WITH CHECK (
              id = current_setting('app.user_id')::integer
            );
        `);
      } else if (table === 'properties') {
        // Politique pour la table properties - les clients ne voient que les propriétés auxquelles ils sont liés
        await client.query(`
          DROP POLICY IF EXISTS properties_client_policy ON properties;
          CREATE POLICY properties_client_policy ON properties
            USING (
              EXISTS (
                SELECT 1 FROM tenants
                WHERE tenants.user_id = current_setting('app.user_id')::integer
                AND tenants.property_id = properties.id
              )
            );
        `);
      } else if (table === 'tenants') {
        // Politique pour la table tenants - un client ne voit que ses propres données locataires
        await client.query(`
          DROP POLICY IF EXISTS tenants_client_policy ON tenants;
          CREATE POLICY tenants_client_policy ON tenants
            USING (
              user_id = current_setting('app.user_id')::integer
            )
            WITH CHECK (
              user_id = current_setting('app.user_id')::integer
            );
        `);
      } else if (table === 'transactions') {
        // Politique pour la table transactions - clients voient leurs propres transactions
        await client.query(`
          DROP POLICY IF EXISTS transactions_client_policy ON transactions;
          CREATE POLICY transactions_client_policy ON transactions
            USING (
              EXISTS (
                SELECT 1 FROM tenants
                WHERE tenants.user_id = current_setting('app.user_id')::integer
                AND transactions.tenant_id = tenants.id
              )
            );
        `);
      } else if (table === 'documents') {
        // Politique pour la table documents - clients voient leurs propres documents
        await client.query(`
          DROP POLICY IF EXISTS documents_client_policy ON documents;
          CREATE POLICY documents_client_policy ON documents
            USING (
              EXISTS (
                SELECT 1 FROM tenant_documents
                JOIN tenants ON tenant_documents.tenant_id = tenants.id
                WHERE tenant_documents.document_id = documents.id
                AND tenants.user_id = current_setting('app.user_id')::integer
              )
            );
        `);
      } else if (table === 'maintenance_requests') {
        // Politique pour la table maintenance_requests - clients voient/créent leurs propres demandes
        await client.query(`
          DROP POLICY IF EXISTS maintenance_requests_client_policy ON maintenance_requests;
          CREATE POLICY maintenance_requests_client_policy ON maintenance_requests
            USING (
              EXISTS (
                SELECT 1 FROM tenants
                WHERE tenants.user_id = current_setting('app.user_id')::integer
                AND maintenance_requests.tenant_id = tenants.id
              )
            )
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM tenants
                WHERE tenants.user_id = current_setting('app.user_id')::integer
                AND maintenance_requests.tenant_id = tenants.id
              )
            );
        `);
      } else {
        // Politique générique pour les autres tables
        await client.query(`
          DROP POLICY IF EXISTS ${table}_client_policy ON ${table};
          CREATE POLICY ${table}_client_policy ON ${table}
            USING (
              EXISTS (
                SELECT 1 FROM users
                WHERE users.id = current_setting('app.user_id')::integer
              )
            );
        `);
      }
      
      console.log(`Politiques RLS mises à jour pour la table: ${table}`);
    }
    
    // Valider la transaction
    await client.query('COMMIT');
    console.log('Mise à jour des politiques RLS terminée avec succès');
    
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour des politiques RLS:', error);
  } finally {
    // Libérer le client
    client.release();
    console.log('Connexion à la base de données fermée');
    await pool.end();
  }
}

// Exécuter la fonction
updateRLSPolicies(); 