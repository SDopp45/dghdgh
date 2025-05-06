/**
 * Script pour supprimer les anciennes tables de stockage
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🚀 Nettoyage des anciennes tables de stockage');
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

    // 1. Lister les tables de stockage existantes avant nettoyage
    const { rows: beforeTables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'storage_%'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables de stockage avant nettoyage:');
    console.table(beforeTables);

    // 2. Lire le fichier SQL
    const scriptPath = path.join(process.cwd(), 'scripts', 'cleanup-storage-tables.sql');
    console.log(`📄 Lecture du script SQL: ${scriptPath}`);
    const sqlScript = await fs.readFile(scriptPath, 'utf8');

    // 3. Exécuter le script SQL
    console.log('🔄 Suppression des anciennes tables...');
    await client.query(sqlScript);
    console.log('✅ Anciennes tables supprimées');

    // 4. Lister les tables de stockage restantes après nettoyage
    const { rows: afterTables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'storage_%'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables de stockage après nettoyage:');
    console.table(afterTables);

    // 5. Vérifier les nouvelles tables conservées
    const { rows: allStorage } = await client.query(`
      SELECT 
        table_schema, 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_name LIKE 'storage_%'
      ORDER BY table_schema, table_name
    `);

    console.log('\n📊 Toutes les tables/vues de stockage dans la base de données:');
    console.table(allStorage);

    console.log('\n🎉 Nettoyage des tables de stockage terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 