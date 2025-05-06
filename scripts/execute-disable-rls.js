/**
 * Script pour exécuter la désactivation du Row-Level Security après migration vers architecture multi-schéma
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔐 Désactivation de Row-Level Security...');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Client PostgreSQL
const client = new pg.Client({
  connectionString: DATABASE_URL
});

// Fonction principale
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');

    // Charger le script SQL
    const sqlPath = path.join(process.cwd(), 'scripts', 'disable-rls.sql');
    const sqlScript = await fs.readFile(sqlPath, 'utf8');
    
    console.log('📜 Exécution du script SQL pour désactiver RLS...');
    
    // Exécuter le script SQL
    await client.query(sqlScript);
    
    console.log('✅ Row-Level Security désactivé avec succès!');
    console.log('🔒 La sécurité est maintenant assurée par la séparation des schémas.');

  } catch (error) {
    console.error('❌ Erreur lors de la désactivation de RLS:', error);
    process.exit(1);
  } finally {
    // Fermer la connexion
    await client.end();
  }
}

// Exécuter le script
main(); 