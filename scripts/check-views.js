/**
 * Script pour vérifier les tables et vues dans les différents schémas
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔍 Vérification des schémas, tables et vues');
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

    // 1. Lister tous les schémas
    const { rows: schemas } = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    
    console.log('\n📊 Liste des schémas:');
    console.table(schemas.map(s => s.schema_name));

    // 2. Compter les tables dans chaque schéma
    console.log('\n📊 Nombre de tables par schéma:');
    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      const { rows: tableCount } = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = '${schemaName}'
        AND table_type = 'BASE TABLE'
      `);
      
      console.log(`- ${schemaName}: ${tableCount[0].count} tables`);
    }

    // 3. Compter les vues dans chaque schéma
    console.log('\n📊 Nombre de vues par schéma:');
    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      const { rows: viewCount } = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.views
        WHERE table_schema = '${schemaName}'
      `);
      
      console.log(`- ${schemaName}: ${viewCount[0].count} vues`);
    }

    // 4. Lister les vues dans admin_views
    const { rows: adminViews } = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'admin_views'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Vues dans le schéma admin_views:');
    if (adminViews.length > 0) {
      console.table(adminViews.map(v => v.table_name));
    } else {
      console.log('Aucune vue trouvée dans le schéma admin_views');
    }

    console.log('\n🎉 Vérification terminée');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 