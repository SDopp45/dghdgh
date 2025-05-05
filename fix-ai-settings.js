// Script pour corriger les tables d'IA
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

async function fixAiTables() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Connexion à la base de données...');
    await client.connect();
    
    console.log('Mise à jour des tables d\'IA...');
    
    // 1. Ajouter les colonnes manquantes si nécessaire
    await client.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_ai_model TEXT DEFAULT 'openai-gpt-3.5';
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'La colonne preferred_ai_model existe déjà';
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'La colonne request_count existe déjà';
        END;
        
        BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS request_limit INTEGER DEFAULT 100;
        EXCEPTION
          WHEN duplicate_column THEN 
            RAISE NOTICE 'La colonne request_limit existe déjà';
        END;
      END $$;
    `);
    
    // 2. Mettre à jour tous les utilisateurs pour avoir une valeur par défaut
    await client.query(`
      UPDATE users SET preferred_ai_model = 'openai-gpt-3.5' WHERE preferred_ai_model IS NULL;
      UPDATE users SET request_count = 0 WHERE request_count IS NULL;
      UPDATE users SET request_limit = 100 WHERE request_limit IS NULL;
    `);
    
    console.log('Vérification des colonnes de la table users...');
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('preferred_ai_model', 'request_count', 'request_limit')
    `);
    
    console.log('Colonnes trouvées:', res.rows);
    console.log('Mise à jour terminée avec succès!');
    
  } catch (err) {
    console.error('Erreur lors de la mise à jour:', err);
  } finally {
    await client.end();
  }
}

fixAiTables(); 