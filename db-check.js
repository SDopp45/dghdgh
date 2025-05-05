// Script pour vérifier la connexion et la structure de la base de données
import pg from 'pg';
const { Client } = pg;

async function checkDatabase() {
  // Connexion à la base de données
  const client = new Client({
    connectionString: 'postgresql://postgres:123456789@localhost:5432/property_manager'
  });

  try {
    await client.connect();
    console.log('Connexion réussie à la base de données.');

    // Vérifier les tables existantes
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nTables dans la base de données:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Vérifier la structure de la table users
    if (tablesResult.rows.some(row => row.table_name === 'users')) {
      const usersColumnsResult = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nStructure de la table users:');
      usersColumnsResult.rows.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type})${column.column_default ? ' DEFAULT ' + column.column_default : ''}`);
      });

      // Vérifier si les colonnes de stockage existent
      const storageColumns = ['storage_used', 'storage_limit', 'storage_tier'];
      const missingColumns = storageColumns.filter(col => 
        !usersColumnsResult.rows.some(row => row.column_name === col)
      );

      if (missingColumns.length > 0) {
        console.log('\nColonnes manquantes dans la table users:');
        missingColumns.forEach(col => console.log(`- ${col}`));
      } else {
        console.log('\nToutes les colonnes de stockage sont présentes.');
      }
    }

  } catch (err) {
    console.error('Erreur lors de la connexion ou de la requête:', err);
  } finally {
    await client.end();
    console.log('\nConnexion fermée.');
  }
}

checkDatabase().catch(console.error); 