// Script pour vérifier la configuration RLS sur les tables PostgreSQL
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

async function checkRLS() {
  const client = await pool.connect();
  try {
    console.log('Connexion à la base de données établie');
    
    // Vérifier les tables qui ont RLS activé
    const rlsQuery = `
      SELECT schemaname, tablename, 
             has_table_privilege(current_user, tablename, 'SELECT') as select_priv,
             has_table_privilege(current_user, tablename, 'INSERT') as insert_priv,
             has_table_privilege(current_user, tablename, 'UPDATE') as update_priv,
             has_table_privilege(current_user, tablename, 'DELETE') as delete_priv,
             relrowsecurity as has_rls, 
             relforcerowsecurity as force_rls
      FROM pg_tables t
      JOIN pg_class c ON t.tablename = c.relname 
      WHERE t.schemaname = 'public'
      ORDER BY tablename;
    `;
    
    const result = await client.query(rlsQuery);
    
    console.log('\n=== STATUT DU ROW LEVEL SECURITY (RLS) PAR TABLE ===');
    if (result.rows.length === 0) {
      console.log('Aucune table trouvée dans le schéma public');
    } else {
      console.log('╔════════════════════╤════════╤═════════╤════════════════════╗');
      console.log('║ Table              │ RLS    │ Force   │ Privilèges         ║');
      console.log('╠════════════════════╪════════╪═════════╪════════════════════╣');
      
      result.rows.forEach(row => {
        const rls = row.has_rls ? 'Activé' : 'Désactivé';
        const force = row.force_rls ? 'Oui' : 'Non';
        const privileges = [
          row.select_priv ? 'SELECT' : '',
          row.insert_priv ? 'INSERT' : '',
          row.update_priv ? 'UPDATE' : '',
          row.delete_priv ? 'DELETE' : ''
        ].filter(Boolean).join(', ');
        
        console.log(`║ ${row.tablename.padEnd(18)} │ ${rls.padEnd(7)} │ ${force.padEnd(8)} │ ${privileges.padEnd(18)} ║`);
      });
      
      console.log('╚════════════════════╧════════╧═════════╧════════════════════╝');
    }
    
    // Vérifier les politiques RLS définies
    const policiesQuery = `
      SELECT schemaname, tablename, policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const policiesResult = await client.query(policiesQuery);
    
    console.log('\n=== POLITIQUES RLS DÉFINIES ===');
    if (policiesResult.rows.length === 0) {
      console.log('Aucune politique RLS trouvée');
    } else {
      console.log('╔════════════════════╤════════════════════╤════════╤══════════════════════════════════════╗');
      console.log('║ Table              │ Politique          │ Type   │ Condition                           ║');
      console.log('╠════════════════════╪════════════════════╪════════╪══════════════════════════════════════╣');
      
      policiesResult.rows.forEach(policy => {
        // Tronquer les conditions trop longues pour l'affichage
        const qual = policy.qual ? (policy.qual.length > 40 ? policy.qual.substring(0, 37) + '...' : policy.qual) : 'N/A';
        
        console.log(`║ ${policy.tablename.padEnd(18)} │ ${policy.policyname.padEnd(18)} │ ${policy.cmd.padEnd(7)} │ ${qual.padEnd(38)} ║`);
      });
      
      console.log('╚════════════════════╧════════════════════╧════════╧══════════════════════════════════════╝');
    }
    
    // Tester les politiques RLS avec différents contextes utilisateur
    console.log('\n=== TEST DES POLITIQUES RLS ===');
    
    // Test avec un utilisateur administrateur (ID 1)
    await client.query(`SET LOCAL app.user_id = '1'`);
    
    console.log('\nTest avec l\'ID utilisateur 1 (administrateur):');
    
    // Vérifier l'accès aux données des utilisateurs
    const adminUsersResult = await client.query(`SELECT COUNT(*) FROM users`);
    console.log(`- Nombre d'utilisateurs visibles: ${adminUsersResult.rows[0].count}`);
    
    // Vérifier l'accès aux propriétés
    const adminPropertiesResult = await client.query(`SELECT COUNT(*) FROM properties`);
    console.log(`- Nombre de propriétés visibles: ${adminPropertiesResult.rows[0].count}`);
    
    // Test avec un utilisateur locataire (ID 3, supposant qu'il existe un tel utilisateur)
    console.log('\nTest avec l\'ID utilisateur 3 (locataire):');
    await client.query(`SET LOCAL app.user_id = '3'`);
    
    try {
      // Vérifier l'accès aux données des utilisateurs
      const tenantUsersResult = await client.query(`SELECT COUNT(*) FROM users`);
      console.log(`- Nombre d'utilisateurs visibles: ${tenantUsersResult.rows[0].count}`);
      
      // Vérifier l'accès aux propriétés
      const tenantPropertiesResult = await client.query(`SELECT COUNT(*) FROM properties`);
      console.log(`- Nombre de propriétés visibles: ${tenantPropertiesResult.rows[0].count}`);
    } catch (error) {
      console.log(`- Erreur d'accès aux données: ${error.message}`);
    }
    
    // Réinitialiser le contexte
    await client.query(`RESET app.user_id`);
    
  } catch (error) {
    console.error('Erreur lors de la vérification RLS:', error);
  } finally {
    client.release();
    console.log('\nConnexion à la base de données fermée');
    await pool.end();
  }
}

// Exécuter la fonction
checkRLS(); 