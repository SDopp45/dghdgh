/**
 * Script pour vérifier les utilisateurs clients
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔍 Vérification des utilisateurs clients');
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

    // Vérifier les utilisateurs clients
    const { rows: clients } = await client.query(`
      SELECT id, username, role, settings
      FROM public.users
      WHERE role = 'clients'
    `);
    
    console.log('\n📊 Liste des utilisateurs clients:');
    if (clients.length > 0) {
      console.table(clients);
    } else {
      console.log('Aucun utilisateur avec le rôle "clients" trouvé');
    }
    
    // Compter les propriétés de chaque client
    if (clients.length > 0) {
      console.log('\n📊 Nombre de propriétés par client:');
      for (const userClient of clients) {
        const { rows: propertiesCount } = await client.query(`
          SELECT COUNT(*) as count
          FROM public.properties
          WHERE user_id = ${userClient.id}
        `);
        
        console.log(`- ${userClient.username} (ID: ${userClient.id}): ${propertiesCount[0].count} propriétés`);
      }
    }

    console.log('\n🎉 Vérification terminée');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 