/**
 * Script pour migrer les tables link_profiles et form_responses
 * du schéma public vers template et client_31
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🚀 Migration des tables link_profiles et form_responses');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Client PostgreSQL
const client = new pg.Client({
  connectionString: DATABASE_URL
});

// Tables à migrer
const TABLES_TO_MIGRATE = [
  {
    name: 'link_profiles',
    clientFilter: 'WHERE user_id = 31'
  },
  {
    name: 'form_responses',
    clientFilter: 'WHERE form_id IN (SELECT id FROM public.forms WHERE user_id = 31)'
  }
];

// Fonction principale
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');

    // Migrer chaque table
    for (const table of TABLES_TO_MIGRATE) {
      console.log(`\n🔄 Migration de la table ${table.name}...`);

      // 1. Vérifier si la table existe dans le schéma public
      const { rows: existsPublic } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table.name}'
        ) AS table_exists
      `);

      if (!existsPublic[0].table_exists) {
        console.log(`⚠️ La table ${table.name} n'existe pas dans le schéma public. Migration ignorée.`);
        continue;
      }

      // 2. Vérifier si la table existe déjà dans le schéma template
      const { rows: existsTemplate } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'template' 
          AND table_name = '${table.name}'
        ) AS table_exists
      `);

      if (existsTemplate[0].table_exists) {
        console.log(`ℹ️ La table ${table.name} existe déjà dans le schéma template.`);
      } else {
        // 3. Créer la table dans le schéma template
        console.log(`📝 Création de la table ${table.name} dans le schéma template...`);
        await client.query(`
          CREATE TABLE template.${table.name} (LIKE public.${table.name} INCLUDING ALL);
        `);
        console.log(`✅ Table créée dans template`);
      }

      // 4. Vérifier si la table existe déjà dans le schéma client
      const { rows: existsClient } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'client_31' 
          AND table_name = '${table.name}'
        ) AS table_exists
      `);

      if (existsClient[0].table_exists) {
        console.log(`ℹ️ La table ${table.name} existe déjà dans le schéma client_31.`);
      } else {
        // 5. Créer la table dans le schéma client
        console.log(`📝 Création de la table ${table.name} dans le schéma client_31...`);
        await client.query(`
          CREATE TABLE client_31.${table.name} (LIKE template.${table.name} INCLUDING ALL);
        `);
        console.log(`✅ Table créée dans client_31`);
      }

      // 6. Compter les données à migrer
      try {
        const { rows: countData } = await client.query(`
          SELECT COUNT(*) FROM public.${table.name} ${table.clientFilter}
        `);
        
        const dataCount = parseInt(countData[0].count);
        console.log(`📊 ${dataCount} enregistrements à migrer vers client_31.${table.name}`);

        if (dataCount > 0) {
          // 7. Migrer les données
          console.log(`📦 Migration des données vers client_31.${table.name}...`);
          
          // Obtenir les colonnes pour cette table
          const { rows: columns } = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table.name}'
            ORDER BY ordinal_position
          `);
          
          const columnNames = columns.map(col => col.column_name).join(', ');
          
          await client.query(`
            INSERT INTO client_31.${table.name} (${columnNames})
            SELECT ${columnNames} FROM public.${table.name} ${table.clientFilter}
            ON CONFLICT DO NOTHING;
          `);
          
          console.log(`✅ Données migrées avec succès`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors du traitement des données: ${error.message}`);
      }

      // 8. Générer et afficher le script de suppression (sans l'exécuter)
      console.log(`\n⚠️ Pour supprimer la table public.${table.name} après vérification, utilisez cette commande SQL:`);
      console.log(`DROP TABLE public.${table.name};`);
    }

    console.log('\n🎉 Migration terminée!');
    console.log('\n⚠️ IMPORTANT: Les tables originales dans le schéma public n\'ont pas été supprimées.');
    console.log('Après avoir vérifié que la migration a réussi, vous pouvez les supprimer manuellement.');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 