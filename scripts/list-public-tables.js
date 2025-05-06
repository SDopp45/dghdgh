/**
 * Script pour lister les tables du schéma public
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔍 Liste des tables dans le schéma public');

// Client PostgreSQL
const client = new pg.Client({
  connectionString: DATABASE_URL
});

// Fonction principale
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');

    // Récupérer les tables du schéma public
    const { rows: publicTables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables dans le schéma public:');
    console.table(publicTables);

    // Récupérer les tables du schéma template
    const { rows: templateTables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'template' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables dans le schéma template:');
    console.table(templateTables);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 