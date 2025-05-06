/**
 * Script pour nettoyer le schéma public en supprimant les tables qui existent déjà dans template
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🧹 Nettoyage du schéma public');

// Client PostgreSQL
const client = new pg.Client({
  connectionString: DATABASE_URL
});

// Tables à conserver obligatoirement dans le schéma public
const KEEP_IN_PUBLIC = [
  'users',
  'sessions',
  'storage_plans',
  'storage_quotas',
  'link_profiles',
  'links'
];

// Fonction principale
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');

    // 1. Récupérer les tables du schéma public
    const { rows: publicTables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`\n📊 Tables trouvées dans le schéma public: ${publicTables.length}`);

    // 2. Récupérer les tables du schéma template
    const { rows: templateTables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'template' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`📊 Tables trouvées dans le schéma template: ${templateTables.length}`);

    // 3. Identifier les tables dupliquées (présentes à la fois dans public et template)
    const templateTableNames = templateTables.map(t => t.table_name);
    const tablesToRemove = publicTables
      .map(t => t.table_name)
      .filter(tableName => templateTableNames.includes(tableName) && !KEEP_IN_PUBLIC.includes(tableName));

    console.log(`\n🔍 Tables identifiées pour suppression du schéma public: ${tablesToRemove.length}`);
    console.table(tablesToRemove);

    // 4. Générer le script SQL pour déplacer les données et supprimer les tables
    let migrationScript = '';
    for (const tableName of tablesToRemove) {
      // Vérifier si la table existe dans client_31
      const { rows: clientTableExists } = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'client_31' 
          AND table_name = '${tableName}'
        ) AS table_exists
      `);

      const tableExistsInClient = clientTableExists[0].table_exists;

      if (tableExistsInClient) {
        // A. Insérer les données de public dans client_31 si la table client existe
        console.log(`📦 Transfert des données de public.${tableName} vers client_31.${tableName}...`);
        
        try {
          // Obtenir les colonnes pour cette table
          const { rows: columns } = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `);
          
          const columnNames = columns.map(col => col.column_name).join(', ');
          
          // Compter les lignes à transférer
          const { rows: countRows } = await client.query(`
            SELECT COUNT(*) FROM public.${tableName}
          `);
          
          console.log(`   - ${countRows[0].count} enregistrements à transférer`);
          
          if (parseInt(countRows[0].count) > 0) {
            // Insérer les données dans la table client
            await client.query(`
              INSERT INTO client_31.${tableName} (${columnNames})
              SELECT ${columnNames} FROM public.${tableName}
              ON CONFLICT DO NOTHING
            `);
            
            console.log(`   - ✅ Données transférées`);
          } else {
            console.log(`   - ℹ️ Aucune donnée à transférer`);
          }
        } catch (error) {
          console.error(`   - ❌ Erreur lors du transfert des données: ${error.message}`);
        }
        
        // Ajouter au script SQL
        migrationScript += `
-- Transfert des données de public.${tableName} vers client_31.${tableName}
INSERT INTO client_31.${tableName} 
SELECT * FROM public.${tableName}
ON CONFLICT DO NOTHING;
`;
      }
      
      // B. Supprimer la table de public (désactivé pour sécurité)
      migrationScript += `
-- Suppression de la table dupliquée dans public
-- DROP TABLE public.${tableName};
`;
    }

    // 5. Écrire le script SQL (pour exécution manuelle)
    console.log('\n📝 Script SQL généré pour suppression des tables (à exécuter manuellement):');
    console.log(migrationScript);

    console.log('\n⚠️ IMPORTANT: Les commandes DROP TABLE sont commentées pour sécurité.');
    console.log('Pour supprimer les tables, décommentez les lignes dans le script SQL généré.');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 