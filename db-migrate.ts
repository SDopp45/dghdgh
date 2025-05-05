import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './shared/schema';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';

// Import des migrations personnalisées
import { addUserAiQuotaFields } from './migrations/add-user-ai-quotas';

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialisation du client Drizzle
const db = drizzle(pool, { schema });

/**
 * Execute les migrations Drizzle et les migrations SQL personnalisées
 * Les migrations sont exécutées dans l'ordre suivant:
 * 1. Migrations Drizzle basées sur le schéma
 * 2. Migrations SQL personnalisées basées sur le préfixe de la date
 * 3. Migrations TypeScript personnalisées
 */
async function runMigration() {
  try {
    console.log('🔄 Démarrage de la migration de base de données...');
    
    // 1. Appliquer les migrations Drizzle
    console.log('📊 Application des migrations Drizzle...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('✅ Migrations Drizzle appliquées avec succès');
    
    // 2. Trouver et exécuter les migrations SQL personnalisées (prefixées par une date)
    const migrationFiles = readdirSync('./migrations')
      .filter(file => file.match(/^\d{8,}_.*\.sql$/)) // Format: YYYYMMDD_name.sql
      .sort();
    
    if (migrationFiles.length > 0) {
      console.log(`🔍 Trouvé ${migrationFiles.length} migrations SQL personnalisées`);
      
      for (const file of migrationFiles) {
        const migrationPath = join(process.cwd(), 'migrations', file);
        console.log(`⚙️ Exécution de la migration: ${file}`);
        
        const migrationSql = readFileSync(migrationPath, 'utf8');
        await db.execute(sql.raw(migrationSql));
        
        console.log(`✅ Migration ${file} appliquée avec succès`);
      }
    } else {
      console.log('ℹ️ Aucune migration SQL personnalisée trouvée');
    }
    
    // 3. Exécuter les migrations TypeScript personnalisées
    console.log('📊 Application des migrations TypeScript personnalisées...');
    
    // Migration pour les quotas d'IA
    console.log('⚙️ Exécution de la migration pour les quotas d\'IA');
    const aiQuotaResult = await addUserAiQuotaFields();
    if (aiQuotaResult) {
      console.log('✅ Migration des quotas d\'IA appliquée avec succès');
    } else {
      console.warn('⚠️ La migration des quotas d\'IA n\'a pas été appliquée correctement');
    }
    
    // Migration pour mettre à jour le champ preferred_ai_model
    console.log('✅ Migration: Mise à jour des modèles d\'IA disponibles');
    
    // Mettre à jour tous les utilisateurs qui utilisent des modèles désormais non supportés
    await db.execute(sql`
      UPDATE users
      SET preferred_ai_model = 'openai-gpt-3.5'
      WHERE preferred_ai_model NOT IN ('openai-gpt-3.5', 'openai-gpt-4o')
    `);
    console.log('  ✅ Modèles IA des utilisateurs mis à jour vers openai-gpt-3.5 pour les modèles non supportés');
    
    // Supprimer la contrainte existante si elle existe
    try {
      await db.execute(sql`
        ALTER TABLE users
        DROP CONSTRAINT IF EXISTS chk_preferred_ai_model
      `);
      console.log('  ✅ Ancienne contrainte de preferred_ai_model supprimée (si elle existait)');
    } catch (error) {
      console.log('  ℹ️ Impossible de supprimer la contrainte (peut ne pas exister)');
    }
    
    // Ajouter la nouvelle contrainte pour limiter les valeurs possibles à seulement openai-gpt-3.5 et openai-gpt-4o
    try {
      await db.execute(sql`
        ALTER TABLE users
        ADD CONSTRAINT chk_preferred_ai_model 
        CHECK (preferred_ai_model IN ('openai-gpt-3.5', 'openai-gpt-4o'))
      `);
      console.log('  ✅ Nouvelle contrainte ajoutée pour preferred_ai_model');
    } catch (error) {
      console.error('  ❌ Erreur lors de l\'ajout de la nouvelle contrainte:', error);
    }
    
    console.log('🎉 Migration terminée avec succès');
    
    // Fermer la connexion
    await pool.end();
  } catch (error) {
    console.error('❌ Échec de la migration:', error);
    process.exit(1);
  }
}

// Exécuter la migration si ce script est appelé directement
if (require.main === module) {
  runMigration();
}

// Exporter la fonction pour permettre son utilisation depuis d'autres scripts
export { runMigration };

/**
 * Migration pour mettre à jour le champ preferred_ai_model
 * Cette migration s'assure que tous les utilisateurs ont une valeur valide pour preferred_ai_model
 * après avoir restreint les modèles disponibles à seulement openai-gpt-3.5 et openai-gpt-4o
 */
export async function updateAiModels() {
  try {
    console.log('✅ Migration: Mise à jour des modèles d\'IA disponibles');
    
    // Mettre à jour tous les utilisateurs qui utilisent des modèles désormais non supportés
    await db.execute(sql`
      UPDATE users
      SET preferred_ai_model = 'openai-gpt-3.5'
      WHERE preferred_ai_model NOT IN ('openai-gpt-3.5', 'openai-gpt-4o')
    `);
    console.log('  ✅ Modèles IA des utilisateurs mis à jour vers openai-gpt-3.5 pour les modèles non supportés');
    
    // Supprimer la contrainte existante si elle existe
    try {
      await db.execute(sql`
        ALTER TABLE users
        DROP CONSTRAINT IF EXISTS chk_preferred_ai_model
      `);
      console.log('  ✅ Ancienne contrainte de preferred_ai_model supprimée (si elle existait)');
    } catch (error) {
      console.log('  ℹ️ Impossible de supprimer la contrainte (peut ne pas exister)');
    }
    
    // Ajouter la nouvelle contrainte pour limiter les valeurs possibles à seulement openai-gpt-3.5 et openai-gpt-4o
    try {
      await db.execute(sql`
        ALTER TABLE users
        ADD CONSTRAINT chk_preferred_ai_model 
        CHECK (preferred_ai_model IN ('openai-gpt-3.5', 'openai-gpt-4o'))
      `);
      console.log('  ✅ Nouvelle contrainte ajoutée pour preferred_ai_model');
    } catch (error) {
      console.error('  ❌ Erreur lors de l\'ajout de la nouvelle contrainte:', error);
    }
    
    console.log('✅ Migration terminée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    return false;
  }
}