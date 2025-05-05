// Script pour tester le middleware d'authentification avec les colonnes de stockage
import pg from 'pg';
const { Client } = pg;

// Simulation du middleware d'authentification
function simulateMiddleware(user, isDevelopment) {
  console.log(`Simulation en mode ${isDevelopment ? 'développement' : 'production'}`);
  
  // Créer un objet de requête simulé
  let req = { user: user ? { ...user } : null };
  
  // Simulation du middleware en mode développement
  if (isDevelopment) {
    console.log('État initial de req.user:', req.user);
    
    if (!req.user) {
      req.user = {
        id: 1,
        username: 'testuser',
        fullName: 'Test User',
        role: 'manager',
        email: 'test@example.com',
        storageUsed: "0",
        storageLimit: "5368709120", // 5GB en octets
        storageTier: "basic"
      };
      console.log('User créé en mode dev:', req.user);
    } else {
      // Si l'utilisateur existe mais n'a pas les propriétés de stockage, les ajouter
      if (!req.user.storageUsed) {
        req.user.storageUsed = "0";
      }
      if (!req.user.storageLimit) {
        req.user.storageLimit = "5368709120"; // 5GB en octets
      }
      if (!req.user.storageTier) {
        req.user.storageTier = "basic";
      }
      console.log('User existant mis à jour en mode dev:', req.user);
    }
  } 
  // Simulation du middleware en mode production
  else {
    console.log('État initial de req.user:', req.user);
    
    // En production, vérifier l'utilisateur
    if (req.user) {
      // Ajouter les propriétés de stockage si elles n'existent pas
      if (!req.user.storageUsed) {
        req.user.storageUsed = "0";
      }
      if (!req.user.storageLimit) {
        req.user.storageLimit = "5368709120"; // 5GB en octets
      }
      if (!req.user.storageTier) {
        req.user.storageTier = "basic";
      }
      console.log('User mis à jour en mode prod:', req.user);
    } else {
      console.log('Non authentifié en mode production');
    }
  }
  
  return req.user;
}

async function testMiddleware() {
  // Connexion à la base de données
  const client = new Client({
    connectionString: 'postgresql://postgres:123456789@localhost:5432/property_manager'
  });

  try {
    await client.connect();
    console.log('Connexion réussie à la base de données.');

    // Récupérer un utilisateur de test
    const userResult = await client.query(`
      SELECT id, username, full_name, role, email, storage_used, storage_limit, storage_tier
      FROM users
      LIMIT 1;
    `);
    
    let testUser = null;
    if (userResult.rows.length > 0) {
      testUser = userResult.rows[0];
      // Convertir les noms de colonnes snake_case en camelCase pour simuler l'ORM
      testUser.fullName = testUser.full_name;
      delete testUser.full_name;
      
      // Convertir les valeurs numériques en chaînes pour simuler le comportement réel
      testUser.storage_used = testUser.storage_used.toString();
      testUser.storage_limit = testUser.storage_limit.toString();
      
      console.log('Utilisateur de test récupéré:', testUser);
    } else {
      console.log('Aucun utilisateur trouvé dans la base de données.');
    }

    console.log('\n--- TEST 1: Mode développement, utilisateur null ---');
    simulateMiddleware(null, true);
    
    console.log('\n--- TEST 2: Mode développement, utilisateur sans propriétés de stockage ---');
    const userWithoutStorage = testUser ? 
      { id: testUser.id, username: testUser.username, fullName: testUser.fullName, role: testUser.role } : 
      { id: 2, username: 'testuser2', fullName: 'Test User 2', role: 'user' };
    simulateMiddleware(userWithoutStorage, true);
    
    console.log('\n--- TEST 3: Mode développement, utilisateur avec propriétés de stockage ---');
    simulateMiddleware(testUser, true);
    
    console.log('\n--- TEST 4: Mode production, utilisateur null ---');
    simulateMiddleware(null, false);
    
    console.log('\n--- TEST 5: Mode production, utilisateur sans propriétés de stockage ---');
    simulateMiddleware(userWithoutStorage, false);
    
    console.log('\n--- TEST 6: Mode production, utilisateur avec propriétés de stockage ---');
    simulateMiddleware(testUser, false);

  } catch (err) {
    console.error('Erreur lors de la connexion ou de la requête:', err);
  } finally {
    await client.end();
    console.log('\nConnexion fermée.');
  }
}

testMiddleware().catch(console.error); 