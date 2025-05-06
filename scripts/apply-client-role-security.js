/**
 * Script pour appliquer la nouvelle configuration de sécurité à base unique de rôle 'clients'
 * à une base de données existante
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Obtenir le répertoire actuel avec ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔒 Application de la nouvelle configuration de sécurité RLS...');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

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
 * Vérifier l'état actuel des rôles dans la base de données
 */
async function checkDatabaseRoles() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    
    // Lister les rôles existants
    const rolesResult = await client.query(`
      SELECT rolname FROM pg_roles 
      WHERE rolname NOT LIKE 'pg_%' 
      ORDER BY rolname
    `);
    
    console.log('📊 Rôles existants dans la base de données:');
    rolesResult.rows.forEach(role => {
      console.log(`- ${role.rolname}`);
    });
    
    // Vérifier les politiques RLS
    const policiesResult = await client.query(`
      SELECT tablename, policyname FROM pg_policies
      ORDER BY tablename, policyname
    `);
    
    console.log('\n📊 Politiques RLS existantes:');
    policiesResult.rows.forEach(policy => {
      console.log(`- Table: ${policy.tablename}, Politique: ${policy.policyname}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Impossible de vérifier les rôles:');
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
  console.log('🚀 Démarrage de la mise à jour de la sécurité...');

  // 1. Vérifier l'état actuel
  await checkDatabaseRoles();

  // 2. Appliquer le script de configuration RLS
  const rlsScriptPath = path.join(__dirname, 'setup-postgres-rls.sql');
  const rlsSuccess = await executeSqlScript(rlsScriptPath);
  
  if (!rlsSuccess) {
    console.error('❌ La configuration RLS a échoué.');
    process.exit(1);
  }

  // 3. Vérifier l'état après mise à jour
  console.log('\n📊 État après la mise à jour:');
  await checkDatabaseRoles();

  console.log('\n✅ Configuration de la sécurité terminée!');
  console.log('📝 Assurez-vous de modifier également les paramètres d\'authentification dans le code de l\'application.');
}

// Exécuter le programme principal
main().catch(error => {
  console.error('❌ Une erreur est survenue lors de la configuration:');
  console.error(error);
  process.exit(1); 
}); 