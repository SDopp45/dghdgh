// Script pour inspecter en détail la structure complète de la base de données
import pg from 'pg';
const { Client } = pg;

async function inspectDatabase() {
  // Connexion à la base de données
  const client = new Client({
    connectionString: 'postgresql://postgres:123456789@localhost:5432/property_manager'
  });

  try {
    await client.connect();
    console.log('Connexion réussie à la base de données PostgreSQL.');

    // 1. Lister toutes les tables
    const tablesQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const tables = tablesQuery.rows.map(row => row.table_name);
    console.log(`\nBase de données contient ${tables.length} tables:`);
    tables.forEach(table => console.log(`- ${table}`));

    // 2. Pour chaque table, obtenir des informations détaillées sur les colonnes
    console.log('\n=== STRUCTURE DÉTAILLÉE DE CHAQUE TABLE ===');
    
    for (const table of tables) {
      // Obtenir les informations sur les colonnes
      const columnsQuery = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          column_default,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      // Obtenir les informations sur les clés primaires
      const pkQuery = await client.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name = $1;
      `, [table]);
      
      const primaryKeys = pkQuery.rows.map(row => row.column_name);
      
      // Obtenir les informations sur les clés étrangères
      const fkQuery = await client.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1;
      `, [table]);
      
      // Afficher les informations de la table
      console.log(`\n--- Table: ${table} ---`);
      console.log(`Colonnes (${columnsQuery.rows.length}):`);
      
      columnsQuery.rows.forEach(column => {
        const isPK = primaryKeys.includes(column.column_name) ? '(PK)' : '';
        const fk = fkQuery.rows.find(fk => fk.column_name === column.column_name);
        const fkInfo = fk ? `(FK -> ${fk.foreign_table_name}.${fk.foreign_column_name})` : '';
        const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const maxLength = column.character_maximum_length ? `(${column.character_maximum_length})` : '';
        const defaultValue = column.column_default ? `DEFAULT ${column.column_default}` : '';
        
        console.log(`  - ${column.column_name}: ${column.data_type}${maxLength} ${nullable} ${defaultValue} ${isPK} ${fkInfo}`);
      });
      
      // Obtenir le nombre d'enregistrements
      const countQuery = await client.query(`SELECT COUNT(*) FROM "${table}";`);
      console.log(`  Nombre d'enregistrements: ${countQuery.rows[0].count}`);
    }

    // 3. Analyser spécifiquement la table users et les tables liées à l'authentification
    console.log('\n=== ANALYSE SPÉCIFIQUE DES TABLES D\'AUTHENTIFICATION ===');
    
    // Vérifier la présence d'une table sessions
    if (tables.includes('sessions')) {
      const sessionColumns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable sessions détectée:');
      sessionColumns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
      
      // Échantillon de sessions
      const sessionSample = await client.query(`
        SELECT * FROM sessions LIMIT 1;
      `);
      
      if (sessionSample.rows.length > 0) {
        console.log('\nStructure d\'une session:');
        console.log(sessionSample.rows[0]);
      }
    }
    
    // Vérifier le système d'authentification utilisé
    console.log('\nAnalyse du système d\'authentification:');
    
    if (tables.includes('users')) {
      // Vérifier les colonnes spécifiques aux différents systèmes d'auth
      const authColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('password', 'password_hash', 'oauth_provider', 'oauth_id');
      `);
      
      const authColumnNames = authColumns.rows.map(row => row.column_name);
      
      if (authColumnNames.includes('password')) {
        console.log('- Système d\'authentification local (username/password) détecté');
      }
      
      if (authColumnNames.includes('oauth_provider') || authColumnNames.includes('oauth_id')) {
        console.log('- Support OAuth/authentification sociale détecté');
      }
      
      // Vérifier les extensions potentielles de PostgreSQL pour l'authentification
      const extensions = await client.query(`
        SELECT extname FROM pg_extension;
      `);
      
      const extensionNames = extensions.rows.map(row => row.extname);
      if (extensionNames.includes('pgcrypto')) {
        console.log('- Extension pgcrypto détectée (peut être utilisée pour le hachage de mots de passe)');
      }
    }

  } catch (err) {
    console.error("Erreur lors de l'inspection de la base de données:", err);
  } finally {
    await client.end();
    console.log('\nConnexion fermée.');
  }
}

inspectDatabase().catch(console.error); 