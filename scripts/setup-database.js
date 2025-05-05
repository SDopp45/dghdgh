/**
 * Script de configuration complète de la base de données
 * Exécute les migrations, initialise les tables et configure la sécurité RLS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔧 Configuration de la base de données...');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

/**
 * Exécuter une commande shell avec gestion d'erreur
 */
function runCommand(command, options = {}) {
  try {
    console.log(`Exécution: ${command}`);
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de la commande: ${command}`);
    console.error(error.message);
    if (options.fatal !== false) {
      process.exit(1);
    }
    return false;
  }
}

/**
 * Exécuter un script SQL sur la base de données
 */
async function executeSqlScript(scriptPath) {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    console.log(`📜 Exécution du script SQL: ${scriptPath}`);
    await client.connect();
    const sqlScript = fs.readFileSync(scriptPath, 'utf8');
    await client.query(sqlScript);
    console.log(`✅ Script SQL exécuté avec succès: ${scriptPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution du script SQL: ${scriptPath}`);
    console.error(error.message);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Vérifier la connexion à la base de données
 */
async function checkDatabaseConnection() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW() as now');
    console.log(`✅ Connexion à la base de données réussie! Heure du serveur: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données:');
    console.error(error.message);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Programme principal
 */
async function main() {
  console.log('🚀 Démarrage de la configuration de la base de données...');

  // 1. Vérifier la connexion à la base de données
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    console.error('❌ La connexion à la base de données a échoué. Veuillez vérifier vos paramètres.');
    process.exit(1);
  }

  // 2. Générer les migrations si nécessaire
  console.log('📊 Génération des migrations Drizzle...');
  runCommand('npx drizzle-kit generate', { fatal: false });

  // 3. Appliquer les migrations avec drizzle
  console.log('🔄 Application des migrations...');
  runCommand('npx drizzle-kit push:pg');

  // 4. Configurer Row-Level Security (RLS)
  const rlsScriptPath = path.join(__dirname, 'setup-postgres-rls.sql');
  const rlsSuccess = await executeSqlScript(rlsScriptPath);
  
  if (!rlsSuccess) {
    console.warn('⚠️ La configuration RLS a échoué. L\'application fonctionnera mais sans sécurité au niveau des lignes.');
  }

  // 5. Créer des données de test si en mode développement
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Création des données de test...');
    const seedScriptPath = path.join(__dirname, 'seed-test-data.sql');
    
    if (fs.existsSync(seedScriptPath)) {
      await executeSqlScript(seedScriptPath);
    } else {
      console.log('ℹ️ Aucun script de données de test trouvé.');
    }
  }

  console.log('✅ Configuration de la base de données terminée!');
}

// Exécuter le programme principal
main().catch(error => {
  console.error('❌ Une erreur est survenue lors de la configuration:');
  console.error(error);
  process.exit(1);
}); 