const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Utiliser directement les variables d'environnement pour la connexion
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/immo'
});

async function updateDatabase() {
  try {
    console.log('Début de la mise à jour de la base de données pour les tables AI...');

    // Lire le fichier SQL
    const sqlContent = fs.readFileSync('./update-ai-models.sql', 'utf8');
    
    // Connexion
    const client = await pool.connect();
    
    try {
      // Exécuter tout le script SQL en une fois
      await client.query(sqlContent);
      console.log('Script SQL exécuté avec succès!');
      
      // Vérifier si les colonnes existent
      const { rows: columns } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name IN ('preferred_ai_model', 'request_count', 'request_limit')
      `);
      
      console.log('Colonnes vérifiées dans la table users:', columns);
      
      // Vérifier les tables AI
      const { rows: tables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('ai_conversations', 'ai_messages', 'ai_suggestions')
          AND table_schema = 'public'
      `);
      
      console.log('Tables AI vérifiées:', tables);
    } finally {
      client.release();
    }
    
    console.log('Mise à jour terminée avec succès!');
    pool.end();
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    process.exit(1);
  }
}

updateDatabase(); 