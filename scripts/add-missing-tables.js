/**
 * Script pour ajouter les tables manquantes au schéma template
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🚀 Ajout des tables manquantes au schéma template');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Client PostgreSQL pour les opérations
const client = new pg.Client({
  connectionString: DATABASE_URL
});

/**
 * Fonction principale d'exécution
 */
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');

    // 1. Lire le fichier SQL
    const scriptPath = path.join(process.cwd(), 'scripts', 'add-missing-tables.sql');
    console.log(`📄 Lecture du script SQL: ${scriptPath}`);
    const sqlScript = await fs.readFile(scriptPath, 'utf8');

    // 2. Exécuter le script SQL
    console.log('🔄 Exécution du script SQL...');
    await client.query(sqlScript);

    // 3. Vérifier les tables du schéma template
    const { rows: templateTables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'template'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n✅ Tables dans le schéma template:');
    console.table(templateTables);

    // 4. Vérifier les tables du schéma client_31
    const { rows: clientTables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'client_31'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n✅ Tables dans le schéma client_31:');
    console.table(clientTables);

    // 5. Vérifier les vues dans admin_views
    const { rows: adminViews } = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'admin_views'
      ORDER BY table_name
    `);

    console.log('\n✅ Vues dans le schéma admin_views:');
    console.table(adminViews);

    console.log('\n🎉 Ajout des tables terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des tables:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 