// Script pour vérifier et réparer les incompatibilités entre le middleware et la base de données
import pg from 'pg';
const { Client } = pg;

async function fixDatabase() {
  // Connexion à la base de données
  const client = new Client({
    connectionString: 'postgresql://postgres:123456789@localhost:5432/property_manager'
  });

  try {
    await client.connect();
    console.log('Connexion réussie à la base de données.');

    // 1. Vérifier d'abord si les tables storage_transactions existent
    const checkStorageTransactions = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'storage_transactions'
      );
    `);

    if (!checkStorageTransactions.rows[0].exists) {
      console.log('La table storage_transactions n\'existe pas, création en cours...');
      await client.query(`
        CREATE TABLE storage_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          previous_tier VARCHAR(10) NOT NULL,
          new_tier VARCHAR(10) NOT NULL,
          amount_paid DECIMAL(10, 2) NOT NULL,
          transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expiration_date TIMESTAMP,
          payment_method VARCHAR(50),
          payment_reference VARCHAR(100),
          status VARCHAR(20) DEFAULT 'completed',
          notes TEXT
        );
      `);
      console.log('Table storage_transactions créée avec succès.');
    } else {
      console.log('La table storage_transactions existe déjà.');
    }

    // 2. Vérifier s'il y a des utilisateurs avec des valeurs NULL pour les colonnes de stockage
    const checkNullValues = await client.query(`
      SELECT COUNT(*) AS count
      FROM users 
      WHERE storage_used IS NULL OR storage_limit IS NULL OR storage_tier IS NULL;
    `);

    if (parseInt(checkNullValues.rows[0].count) > 0) {
      console.log(`${checkNullValues.rows[0].count} utilisateurs ont des valeurs NULL pour le stockage, mise à jour en cours...`);
      
      // Mettre à jour les valeurs NULL
      await client.query(`
        UPDATE users 
        SET 
          storage_used = COALESCE(storage_used, 0),
          storage_limit = COALESCE(storage_limit, 5368709120),
          storage_tier = COALESCE(storage_tier, 'basic'),
          updated_at = NOW()
        WHERE storage_used IS NULL OR storage_limit IS NULL OR storage_tier IS NULL;
      `);
      console.log('Les valeurs NULL ont été mises à jour.');
    } else {
      console.log('Aucun utilisateur n\'a de valeurs NULL pour le stockage.');
    }

    // 3. Vérifier les types de données des colonnes de stockage
    const columnsInfo = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('storage_used', 'storage_limit', 'storage_tier');
    `);

    console.log('\nInformation sur les colonnes de stockage:');
    columnsInfo.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });

    // 4. S'assurer que la table storage_usage_details existe pour le suivi détaillé
    const checkStorageUsageDetails = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'storage_usage_details'
      );
    `);

    if (!checkStorageUsageDetails.rows[0].exists) {
      console.log('La table storage_usage_details n\'existe pas, création en cours...');
      await client.query(`
        CREATE TABLE storage_usage_details (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          document_id INTEGER REFERENCES documents(id),
          file_size BIGINT NOT NULL,
          recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          operation VARCHAR(10) NOT NULL CHECK (operation IN ('upload', 'delete', 'modify')),
          file_type VARCHAR(50),
          file_path TEXT
        );
      `);
      console.log('Table storage_usage_details créée avec succès.');
    } else {
      console.log('La table storage_usage_details existe déjà.');
    }

    // 5. Vérifier s'il y a des incohérences entre les documents et l'espace utilisé déclaré
    console.log('\nVérification des incohérences d\'utilisation du stockage...');
    const storageUsageCheck = await client.query(`
      WITH document_sizes AS (
        SELECT 
          user_id,
          COALESCE(SUM(COALESCE(file_size, 0)), 0) as calculated_size
        FROM documents
        GROUP BY user_id
      )
      SELECT 
        u.id, 
        u.username, 
        u.storage_used, 
        COALESCE(ds.calculated_size, 0) as calculated_size,
        ABS(u.storage_used - COALESCE(ds.calculated_size, 0)) as difference
      FROM users u
      LEFT JOIN document_sizes ds ON u.id = ds.user_id
      WHERE ABS(u.storage_used - COALESCE(ds.calculated_size, 0)) > 1024
      LIMIT 10;
    `);

    if (storageUsageCheck.rows.length > 0) {
      console.log('\nUtilisateurs avec des incohérences de stockage:');
      storageUsageCheck.rows.forEach(user => {
        console.log(`- ${user.username} (ID: ${user.id}): Stockage déclaré=${user.storage_used}, Stockage calculé=${user.calculated_size}, Différence=${user.difference} octets`);
      });
    } else {
      console.log('Aucune incohérence majeure d\'utilisation du stockage détectée.');
    }

  } catch (err) {
    console.error('Erreur lors de la connexion ou de la requête:', err);
  } finally {
    await client.end();
    console.log('\nConnexion fermée.');
  }
}

fixDatabase().catch(console.error); 