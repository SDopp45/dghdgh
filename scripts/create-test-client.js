/**
 * Script pour créer un utilisateur client de test
 */

import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🧑‍💼 Création d\'un utilisateur client de test');
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

    // Vérifier la structure de la table users
    const { rows: columns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    console.log('📋 Colonnes de la table users:');
    console.table(columns.map(c => c.column_name));

    // Vérifier si l'utilisateur testclient existe déjà
    const { rows: existingUser } = await client.query(`
      SELECT id FROM users WHERE username = 'testclient'
    `);
    
    // Hasher le mot de passe
    const password = 'testclient123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let clientId;
    
    if (existingUser.length > 0) {
      // Mettre à jour l'utilisateur existant
      console.log('ℹ️ L\'utilisateur testclient existe déjà, mise à jour...');
      await client.query(`
        UPDATE users 
        SET password = $1, role = 'clients' 
        WHERE username = 'testclient'
      `, [hashedPassword]);
      clientId = existingUser[0].id;
    } else {
      // Insérer un nouvel utilisateur
      console.log('ℹ️ Création d\'un nouvel utilisateur testclient...');
      const { rows } = await client.query(`
        INSERT INTO users (
          username, 
          password, 
          role, 
          email, 
          full_name,
          settings,
          account_type,
          created_at,
          updated_at
        ) VALUES (
          'testclient',
          $1,
          'clients',
          'testclient@example.com',
          'Test Client',
          '{}',
          'individual',
          NOW(),
          NOW()
        ) 
        RETURNING id, username, role
      `, [hashedPassword]);
      
      clientId = rows[0].id;
    }
    
    console.log(`✅ Utilisateur client (ID: ${clientId})`);
    
    // Créer des données de test pour cet utilisateur
    console.log(`🔄 Ajout de données de test pour l'utilisateur ${clientId}...`);
    
    // Vérifier la structure de la table properties
    const { rows: propColumns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'properties'
    `);
    
    // Ajouter une propriété de test si la table existe
    if (propColumns.length > 0) {
      console.log('📋 Colonnes de la table properties trouvées, ajout d\'une propriété...');
      
      const propertyInsert = `
        INSERT INTO properties (
          name,
          address,
          city,
          zip_code,
          country,
          user_id,
          created_at,
          updated_at,
          description,
          property_type
        ) VALUES (
          'Appartement Test',
          '123 Rue de Test',
          'Ville Test',
          '75000',
          'France',
          $1,
          NOW(),
          NOW(),
          'Un appartement de test',
          'apartment'
        )
        RETURNING id
      `;
      
      try {
        const { rows: propertyRows } = await client.query(propertyInsert, [clientId]);
        const propertyId = propertyRows[0].id;
        console.log(`  ✅ Propriété créée avec ID: ${propertyId}`);
        
        // Vérifier la structure de la table tenants
        const { rows: tenantColumns } = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'tenants'
        `);
        
        // Ajouter un locataire de test si la table existe
        if (tenantColumns.length > 0) {
          console.log('📋 Colonnes de la table tenants trouvées, ajout d\'un locataire...');
          
          const tenantInsert = `
            INSERT INTO tenants (
              first_name,
              last_name,
              email,
              phone,
              property_id,
              user_id,
              created_at,
              updated_at
            ) VALUES (
              'Jean',
              'Dupont',
              'jean.dupont@example.com',
              '0612345678',
              $1,
              $2,
              NOW(),
              NOW()
            )
            RETURNING id
          `;
          
          try {
            const { rows: tenantRows } = await client.query(tenantInsert, [propertyId, clientId]);
            const tenantId = tenantRows[0].id;
            console.log(`  ✅ Locataire créé avec ID: ${tenantId}`);
          } catch (error) {
            console.error('  ❌ Erreur lors de la création du locataire:', error.message);
          }
        }
      } catch (error) {
        console.error('  ❌ Erreur lors de la création de la propriété:', error.message);
      }
    }
    
    console.log('🎉 Création des données de test terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 