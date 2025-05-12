#!/usr/bin/env node

/**
 * Script pour nettoyer les anciennes tables form_submissions des bases de données client
 * 
 * Ce script va:
 * 1. Identifier tous les schémas client
 * 2. Pour chaque schéma, vérifier si la table form_submissions existe
 * 3. Migrer toutes les données de form_submissions vers form_responses
 * 4. Supprimer la table form_submissions
 * 
 * Usage: 
 * node scripts/cleanup-forms-tables.js [--dry-run]
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Options de ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Connexion à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Message d'information
console.log(`
======================================
Script de nettoyage des tables de formulaires
======================================
${isDryRun ? '⚠️  MODE SIMULATION ACTIVE - Aucune modification ne sera effectuée' : '⚠️  MODE RÉEL - Les modifications seront effectuées'}
`);

// Fonction principale
async function main() {
  try {
    // Récupérer tous les schémas client
    const clientSchemas = await getClientSchemas();
    console.log(`📊 ${clientSchemas.length} schémas client trouvés`);
    
    // Statistiques
    let stats = {
      schemasProcessed: 0,
      tablesFound: 0,
      rowsMigrated: 0,
      tablesDropped: 0,
      errors: 0
    };
    
    // Pour chaque schéma client
    for (const schema of clientSchemas) {
      try {
        console.log(`\n📁 Traitement du schéma: ${schema}`);
        
        // Vérifier si la table form_submissions existe
        const tableExists = await checkTableExists(schema, 'form_submissions');
        
        if (tableExists) {
          stats.tablesFound++;
          console.log(`   ✅ Table form_submissions existe dans ${schema}`);
          
          // Vérifier si la table form_responses existe
          const responseTableExists = await checkTableExists(schema, 'form_responses');
          
          if (!responseTableExists) {
            console.log(`   ⚠️  Table form_responses n'existe pas dans ${schema}, création...`);
            if (!isDryRun) {
              await createFormResponsesTable(schema);
            }
          }
          
          // Vérifier les colonnes de form_responses
          const hasCorrectStructure = await ensureCorrectStructure(schema);
          
          if (!hasCorrectStructure) {
            console.log(`   ⚠️  Structure de form_responses incorrecte dans ${schema}, migration impossible`);
            stats.errors++;
            continue;
          }
          
          // Migrer les données de form_submissions vers form_responses
          const migratedCount = await migrateData(schema);
          stats.rowsMigrated += migratedCount;
          
          // Supprimer la table form_submissions
          if (!isDryRun) {
            await dropTable(schema, 'form_submissions');
            stats.tablesDropped++;
            console.log(`   🗑️  Table form_submissions supprimée de ${schema}`);
          } else {
            console.log(`   🗑️  [SIMULATION] Table form_submissions SERAIT supprimée de ${schema}`);
          }
        } else {
          console.log(`   ℹ️  Table form_submissions n'existe pas dans ${schema}, rien à faire`);
        }
        
        stats.schemasProcessed++;
      } catch (err) {
        console.error(`   ❌ Erreur lors du traitement du schéma ${schema}:`, err);
        stats.errors++;
      }
    }
    
    // Afficher les statistiques
    console.log(`
======================================
Résumé de l'opération ${isDryRun ? '[SIMULATION]' : ''}
======================================
📊 Schémas traités: ${stats.schemasProcessed}/${clientSchemas.length}
🗃️ Tables form_submissions trouvées: ${stats.tablesFound}
📦 Lignes migrées: ${stats.rowsMigrated}
🗑️ Tables supprimées: ${stats.tablesDropped}
❌ Erreurs: ${stats.errors}
    `);
    
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  } finally {
    // Fermer la connexion à la base de données
    await pool.end();
  }
}

// Récupérer tous les schémas client
async function getClientSchemas() {
  const result = await pool.query(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'client_%'
    ORDER BY schema_name
  `);
  
  return result.rows.map(row => row.schema_name);
}

// Vérifier si une table existe dans un schéma
async function checkTableExists(schema, table) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_name = $2
    ) as exists
  `, [schema, table]);
  
  return result.rows[0].exists;
}

// Créer la table form_responses si elle n'existe pas
async function createFormResponsesTable(schema) {
  await pool.query(`
    CREATE TABLE ${schema}.form_responses (
      id SERIAL PRIMARY KEY,
      link_id INTEGER,
      form_id INTEGER,
      response_data JSONB NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )
  `);
  console.log(`   ✅ Table form_responses créée dans ${schema}`);
}

// Vérifier et corriger la structure de form_responses
async function ensureCorrectStructure(schema) {
  try {
    // Récupérer les colonnes de form_responses
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = $1 
      AND table_name = 'form_responses'
    `, [schema]);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    
    // Vérifier les colonnes essentielles
    const hasLinkId = columns.includes('link_id');
    const hasResponseData = columns.includes('response_data') || 
                           columns.includes('data') || 
                           columns.includes('form_data');
    
    // Si les colonnes essentielles n'existent pas, ajouter les colonnes manquantes
    if (!isDryRun) {
      if (!hasLinkId) {
        await pool.query(`
          ALTER TABLE ${schema}.form_responses
          ADD COLUMN link_id INTEGER
        `);
        console.log(`   ✅ Colonne link_id ajoutée à form_responses dans ${schema}`);
      }
      
      if (!hasResponseData) {
        await pool.query(`
          ALTER TABLE ${schema}.form_responses
          ADD COLUMN response_data JSONB DEFAULT '{}'::jsonb NOT NULL
        `);
        console.log(`   ✅ Colonne response_data ajoutée à form_responses dans ${schema}`);
      }
      
      // Si data ou form_data existe mais pas response_data, renommer la colonne
      if (!columns.includes('response_data') && columns.includes('data')) {
        await pool.query(`
          ALTER TABLE ${schema}.form_responses
          RENAME COLUMN data TO response_data
        `);
        console.log(`   ✅ Colonne data renommée en response_data dans ${schema}`);
      } else if (!columns.includes('response_data') && columns.includes('form_data')) {
        await pool.query(`
          ALTER TABLE ${schema}.form_responses
          RENAME COLUMN form_data TO response_data
        `);
        console.log(`   ✅ Colonne form_data renommée en response_data dans ${schema}`);
      }
    }
    
    return true;
  } catch (err) {
    console.error(`   ❌ Erreur lors de la vérification/correction de la structure:`, err);
    return false;
  }
}

// Migrer les données de form_submissions vers form_responses
async function migrateData(schema) {
  try {
    // Compter le nombre de lignes à migrer
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM ${schema}.form_submissions
    `);
    
    const count = parseInt(countResult.rows[0].count);
    console.log(`   📦 ${count} entrées à migrer de form_submissions vers form_responses`);
    
    if (count === 0) {
      console.log(`   ℹ️  Aucune donnée à migrer dans ${schema}`);
      return 0;
    }
    
    if (!isDryRun) {
      // Insérer les données dans form_responses
      await pool.query(`
        INSERT INTO ${schema}.form_responses 
          (link_id, response_data, ip_address, user_agent, created_at)
        SELECT 
          link_id, 
          form_data as response_data, 
          ip_address, 
          user_agent, 
          created_at
        FROM ${schema}.form_submissions
        WHERE NOT EXISTS (
          SELECT 1 FROM ${schema}.form_responses 
          WHERE form_responses.link_id = form_submissions.link_id 
          AND form_responses.response_data = form_submissions.form_data
        )
      `);
      
      console.log(`   ✅ Données migrées de form_submissions vers form_responses dans ${schema}`);
    } else {
      console.log(`   ✅ [SIMULATION] Données SERAIENT migrées de form_submissions vers form_responses dans ${schema}`);
    }
    
    return count;
  } catch (err) {
    console.error(`   ❌ Erreur lors de la migration des données:`, err);
    return 0;
  }
}

// Supprimer une table
async function dropTable(schema, table) {
  await pool.query(`
    DROP TABLE ${schema}.${table}
  `);
}

// Exécuter le script
main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
}); 