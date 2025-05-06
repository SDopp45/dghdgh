/**
 * Script pour configurer l'architecture par schéma dans PostgreSQL
 * Ce script exécute le fichier SQL pour configurer le système multi-schéma
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🚀 Configuration de l\'architecture par schéma pour PostgreSQL');
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

    // 1. Lire le fichier SQL
    const scriptPath = path.join(process.cwd(), 'scripts', 'setup-schema-architecture.sql');
    console.log(`📄 Lecture du script SQL: ${scriptPath}`);
    const sqlScript = await fs.readFile(scriptPath, 'utf8');

    // 2. Exécuter le script SQL
    console.log('🔄 Exécution du script SQL...');
    await client.query(sqlScript);

    // 3. Vérifier les schémas créés
    const { rows: schemas } = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name IN ('template', 'admin_views') 
      OR schema_name LIKE 'client_%'
    `);

    console.log('\n✅ Schémas créés:');
    console.table(schemas);

    // 4. Vérifier les tables du schéma template
    const { rows: templateTables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'template'
      AND table_type = 'BASE TABLE'
    `);

    console.log('\n✅ Tables dans le schéma template:');
    console.table(templateTables);

    // 5. Vérifier les utilisateurs clients
    const { rows: clients } = await client.query(`
      SELECT id, username, role, settings
      FROM users
      WHERE role = 'clients'
    `);

    console.log('\n✅ Utilisateurs clients:');
    console.table(clients);

    console.log('\n🎉 Configuration de l\'architecture par schéma terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 