// Script pour vérifier les colonnes des tables qui ont posé problème
import { Client } from 'pg';

// Connexion à la base de données
const client = new Client({
  connectionString: 'postgresql://postgres:123456789@localhost:5432/property_manager'
});

async function checkTables() {
  try {
    await client.connect();
    console.log('Connexion à la base de données établie');
    
    // Tables à vérifier
    const tables = ['maintenance_requests', 'form_submissions', 'feedbacks'];
    
    for (const table of tables) {
      try {
        // Obtenir les colonnes de la table
        const result = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = '${table}'
          ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
          console.log(`\nLa table '${table}' n'existe pas ou n'a pas de colonnes`);
          continue;
        }
        
        console.log(`\nColonnes de la table '${table}':`);
        result.rows.forEach(row => {
          console.log(`- ${row.column_name} (${row.data_type})`);
        });
        
        // Vérifier si la table a une relation avec property_id ou tenant_id
        const fkResult = await client.query(`
          SELECT
            ccu.column_name as column_name,
            tc.table_name as foreign_table
          FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.key_column_usage AS kcu
              ON kcu.constraint_name = tc.constraint_name
          WHERE
            tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = '${table}'
        `);
        
        if (fkResult.rows.length > 0) {
          console.log(`\nClés étrangères de la table '${table}':`);
          fkResult.rows.forEach(row => {
            console.log(`- ${row.column_name} -> ${row.foreign_table}`);
          });
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification de la table '${table}':`, error.message);
      }
    }
  } catch (error) {
    console.error('Erreur de connexion:', error.message);
  } finally {
    await client.end();
    console.log('\nConnexion à la base de données fermée');
  }
}

// Exécuter la fonction principale
checkTables(); 