/**
 * Script pour ajouter les tables manquantes au schéma template puis les propager aux clients
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🚀 Configuration complète des tables pour l\'architecture par schéma');
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

    // 1. Lire et exécuter le premier script SQL (ajout des tables au template)
    const script1Path = path.join(process.cwd(), 'scripts', 'add-missing-tables.sql');
    console.log(`📄 Lecture du premier script SQL: ${script1Path}`);
    const sqlScript1 = await fs.readFile(script1Path, 'utf8');

    console.log('🔄 Ajout des tables au schéma template...');
    await client.query(sqlScript1);
    console.log('✅ Tables ajoutées au schéma template');

    // 2. Lire et exécuter le deuxième script SQL (propagation aux schémas clients)
    const script2Path = path.join(process.cwd(), 'scripts', 'propagate-tables.sql');
    console.log(`📄 Lecture du deuxième script SQL: ${script2Path}`);
    const sqlScript2 = await fs.readFile(script2Path, 'utf8');

    console.log('🔄 Propagation des tables aux schémas clients...');
    await client.query(sqlScript2);
    console.log('✅ Tables propagées aux schémas clients');

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

    console.log('\n🎉 Configuration des tables terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 