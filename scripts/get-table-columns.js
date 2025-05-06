/**
 * Script pour afficher la structure de la table form_responses
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔍 Analyse de la structure de la table form_responses');

// Client PostgreSQL
const client = new pg.Client({
  connectionString: DATABASE_URL
});

// Fonction principale
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');

    // Obtenir les colonnes de la table form_responses
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'form_responses'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Structure de la table form_responses:');
    console.table(columns);

    // Examiner également form_submissions pour comprendre la relation
    const { rows: submissionColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'client_31' 
      AND table_name = 'form_submissions'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Structure de la table client_31.form_submissions:');
    console.table(submissionColumns);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 