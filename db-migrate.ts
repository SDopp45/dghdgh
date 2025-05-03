import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './shared/schema';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';

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