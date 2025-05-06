/**
 * Script pour nettoyer la base de données et ne conserver que l'utilisateur testuser
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🧹 Nettoyage de la base de données - conservation uniquement de testuser');
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

    // 1. Supprimer les schémas client_ existants
    console.log('🔄 Suppression des schémas clients existants...');
    const { rows: schemas } = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'client_%'
    `);
    
    if (schemas.length > 0) {
      console.log(`  - Suppression de ${schemas.length} schémas`);
      for (const schema of schemas) {
        await client.query(`DROP SCHEMA IF EXISTS ${schema.schema_name} CASCADE`);
      }
      console.log('  ✅ Schémas supprimés');
    } else {
      console.log('  - Aucun schéma client à supprimer');
    }

    // 2. Supprimer le schéma admin_views s'il existe
    console.log('🔄 Suppression du schéma admin_views...');
    await client.query(`DROP SCHEMA IF EXISTS admin_views CASCADE`);
    console.log('  ✅ Schéma admin_views supprimé');

    // 3. Récupérer l'ID de testuser
    const { rows: testUser } = await client.query(`
      SELECT id FROM public.users WHERE username = 'testuser'
    `);
    
    let testUserId = null;
    if (testUser.length > 0) {
      testUserId = testUser[0].id;
      console.log(`🔍 Utilisateur testuser trouvé avec l'ID: ${testUserId}`);
    } else {
      console.log('❌ Utilisateur testuser non trouvé');
      return;
    }

    // 4. Supprimer toutes les données liées aux autres utilisateurs
    console.log('🔄 Suppression des données liées aux autres utilisateurs...');
    
    // Démarrer une transaction
    await client.query('BEGIN');
    
    try {
      // Désactiver temporairement les contraintes pour faciliter la suppression
      await client.query('SET session_replication_role = replica');
      
      // Supprimer les utilisateurs, sauf testuser et admin
      await client.query(`
        DELETE FROM public.users 
        WHERE username != 'testuser' AND username != 'admin'
      `);
      console.log('  ✅ Utilisateurs supprimés');
      
      // Réactiver les contraintes
      await client.query('SET session_replication_role = DEFAULT');
      
      // Valider la transaction
      await client.query('COMMIT');
    } catch (error) {
      // En cas d'erreur, annuler toutes les modifications
      await client.query('ROLLBACK');
      console.error('❌ Erreur lors de la suppression des utilisateurs:', error);
      throw error;
    }

    console.log('🎉 Nettoyage terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 