/**
 * Script pour optimiser les tables de stockage
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🚀 Optimisation des tables de stockage');
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
    const scriptPath = path.join(process.cwd(), 'scripts', 'optimize-storage-tables.sql');
    console.log(`📄 Lecture du script SQL: ${scriptPath}`);
    const sqlScript = await fs.readFile(scriptPath, 'utf8');

    // 2. Exécuter le script SQL
    console.log('🔄 Exécution du script SQL...');
    await client.query(sqlScript);
    console.log('✅ Tables de stockage optimisées');

    // 3. Vérifier les tables publiques
    const { rows: publicTables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'storage_%'
      ORDER BY table_name
    `);

    console.log('\n✅ Tables de stockage dans le schéma public:');
    console.table(publicTables);

    // 4. Vérifier les données dans storage_plans
    const { rows: storagePlans } = await client.query(`
      SELECT id, name, storage_limit, price_monthly, price_yearly
      FROM public.storage_plans
      ORDER BY id
    `);

    console.log('\n✅ Plans de stockage:');
    console.table(storagePlans);

    // 5. Vérifier les données dans storage_quotas
    const { rows: storageQuotas } = await client.query(`
      SELECT id, resource_type, size_limit, count_limit, applies_to
      FROM public.storage_quotas
      ORDER BY id
    `);

    console.log('\n✅ Quotas de stockage:');
    console.table(storageQuotas);

    // 6. Vérifier la table storage_usage dans le template
    const { rows: templateStorageTable } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'template'
      AND table_name = 'storage_usage'
    `);

    console.log('\n✅ Table storage_usage dans le template:');
    console.table(templateStorageTable);

    // 7. Vérifier la table storage_usage dans le schéma client
    const { rows: clientStorageTable } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'client_31'
      AND table_name = 'storage_usage'
    `);

    console.log('\n✅ Table storage_usage dans le schéma client:');
    console.table(clientStorageTable);

    console.log('\n🎉 Optimisation des tables de stockage terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 