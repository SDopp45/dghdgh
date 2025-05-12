#!/usr/bin/env node

/**
 * Script pour réparer les fonctions de gestion des schémas dans la base de données
 * Exécutez ce script avec: 
 * $env:DATABASE_URL="postgresql://postgres:123456789@localhost:5432/property_manager"; node scripts/repair-database.js
 */

// Configurer les variables d'environnement
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

// Configurer le chemin pour .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: '.env.local' });

// Utiliser la variable d'environnement DATABASE_URL
const connectionString = process.env.DATABASE_URL || 
                        "postgresql://postgres:123456789@localhost:5432/property_manager";

console.log(`Utilisation de la connexion: ${connectionString.replace(/:[^:]*@/, ':***@')}`);

// Créer une connexion à la base de données
const dbPool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

async function main() {
  console.log('🔧 Démarrage de la réparation de la base de données...');
  
  try {
    // Tester la connexion
    console.log('🔌 Test de la connexion à PostgreSQL...');
    
    await dbPool.query('SELECT NOW()');
    console.log('✅ Connexion à PostgreSQL établie');
    
    // Lire le script SQL
    console.log('📄 Lecture du script SQL de réparation...');
    const sqlPath = path.join(__dirname, 'initdb.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Exécuter le script SQL
    console.log('🔄 Exécution du script SQL...');
    await dbPool.query(sqlScript);
    console.log('✅ Script SQL exécuté avec succès');
    
    // Vérifier les fonctions
    console.log('🔍 Vérification des fonctions installées...');
    const functions = await dbPool.query(`
      SELECT proname, pg_get_function_arguments(oid) as arguments
      FROM pg_proc
      WHERE proname IN ('setup_user_environment', 'create_client_schema', 'set_schema_for_user')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);
    
    if (functions.rows.length > 0) {
      console.log('📋 Fonctions installées:');
      functions.rows.forEach(fn => {
        console.log(`   - ${fn.proname}(${fn.arguments})`);
      });
    } else {
      console.warn('⚠️ Aucune fonction installée trouvée.');
    }
    
    // Vérifier les schémas existants
    console.log('📊 Vérification des schémas clients existants...');
    const schemas = await dbPool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'client_%'
    `);
    
    if (schemas.rows.length > 0) {
      console.log('📋 Schémas clients trouvés:', schemas.rows.map(r => r.schema_name).join(', '));
    } else {
      console.log('⚠️ Aucun schéma client trouvé');
    }
    
    // Vérifier les utilisateurs
    console.log('👤 Vérification des utilisateurs...');
    const users = await dbPool.query(`
      SELECT id, username, role FROM users
    `);
    
    console.log(`👥 ${users.rows.length} utilisateurs trouvés`);
    users.rows.forEach(user => {
      console.log(`   - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    console.log('✅ Réparation terminée');
    
  } catch (error) {
    console.error('❌ Erreur lors de la réparation:', error);
    process.exit(1);
  } finally {
    // Fermer la connexion à la base de données
    await dbPool.end();
  }
}

// Exécuter le script
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
}); 