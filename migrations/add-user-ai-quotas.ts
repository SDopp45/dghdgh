import { db } from '../server/db';
import { pgTable, integer, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Migration pour ajouter les champs de gestion de quota d'IA à la table utilisateurs
 */
export async function addUserAiQuotaFields() {
  console.log('✅ Migration: Ajout des champs de gestion de quota d\'IA à la table utilisateurs');

  try {
    // Vérifier si la colonne requestCount existe déjà
    const checkRequestCountColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'request_count'
    `);

    // Ajouter la colonne requestCount si elle n'existe pas
    if (checkRequestCountColumn.length === 0) {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN request_count INTEGER DEFAULT 0
      `);
      console.log('  ✅ Colonne request_count ajoutée');
    } else {
      console.log('  ℹ️ Colonne request_count existe déjà');
    }

    // Vérifier si la colonne requestLimit existe déjà
    const checkRequestLimitColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'request_limit'
    `);

    // Ajouter la colonne requestLimit si elle n'existe pas
    if (checkRequestLimitColumn.length === 0) {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN request_limit INTEGER DEFAULT 100
      `);
      console.log('  ✅ Colonne request_limit ajoutée');
    } else {
      console.log('  ℹ️ Colonne request_limit existe déjà');
    }

    // Vérifier si la colonne preferredAiModel existe déjà
    const checkPreferredAiModelColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'preferred_ai_model'
    `);

    // Ajouter la colonne preferredAiModel si elle n'existe pas
    if (checkPreferredAiModelColumn.length === 0) {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN preferred_ai_model TEXT DEFAULT 'openai-gpt-3.5'
      `);
      console.log('  ✅ Colonne preferred_ai_model ajoutée');
    } else {
      console.log('  ℹ️ Colonne preferred_ai_model existe déjà');
    }

    // Ajouter une contrainte pour limiter les valeurs possibles de preferredAiModel
    try {
      await db.execute(sql`
        ALTER TABLE users
        ADD CONSTRAINT chk_preferred_ai_model 
        CHECK (preferred_ai_model IN ('openai-gpt-3.5', 'openai-gpt-4o', 'huggingface-zephyr', 'anthropic-claude', 'mistral-7b', 'local'))
      `);
      console.log('  ✅ Contrainte ajoutée pour preferred_ai_model');
    } catch (error) {
      // La contrainte peut déjà exister, ignorer cette erreur spécifique
      console.log('  ℹ️ Contrainte pour preferred_ai_model non ajoutée (peut déjà exister)');
    }

    // Initialiser les colonnes avec des valeurs par défaut pour tous les utilisateurs existants
    await db.execute(sql`
      UPDATE users
      SET request_count = 0, 
          request_limit = 100, 
          preferred_ai_model = 'openai-gpt-3.5'
      WHERE request_count IS NULL 
         OR request_limit IS NULL 
         OR preferred_ai_model IS NULL
    `);
    console.log('  ✅ Valeurs par défaut initialisées pour les utilisateurs existants');

    console.log('✅ Migration terminée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    return false;
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  addUserAiQuotaFields()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 