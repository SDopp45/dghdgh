/**
 * Script pour mettre à jour les politiques RLS pour la table des visites
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔒 Mise à jour de la politique RLS pour les visites...');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Fonction pour exécuter des requêtes SQL
async function executeSQL(sql) {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    console.log(`🔍 Exécution de la requête SQL...`);
    await client.query(sql);
    console.log(`✅ Requête SQL exécutée avec succès`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de la requête SQL:`, error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Fonction pour vérifier si la politique existe déjà
async function checkPolicy() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT tablename, policyname 
      FROM pg_policies 
      WHERE tablename = 'visits' AND policyname = 'visits_policy'
    `);
    
    if (result.rows.length > 0) {
      console.log(`📋 Politique existante: ${result.rows[0].policyname} sur la table ${result.rows[0].tablename}`);
      return true;
    } else {
      console.log(`❗ Aucune politique RLS trouvée pour la table 'visits'`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de la politique:`, error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Fonction pour vérifier si RLS est activé sur la table
async function checkRLSEnabled() {
  const client = new Client({
    connectionString: DATABASE_URL
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = 'visits' AND n.nspname = 'public'
    `);
    
    if (result.rows.length > 0) {
      const isEnabled = result.rows[0].relrowsecurity;
      console.log(`📋 RLS sur la table 'visits': ${isEnabled ? 'Activé' : 'Désactivé'}`);
      return isEnabled;
    } else {
      console.log(`❗ Table 'visits' non trouvée`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de RLS:`, error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Programme principal
async function main() {
  console.log('🚀 Vérification de la configuration RLS actuelle...');
  
  // Vérifier si RLS est déjà activé
  const isRLSEnabled = await checkRLSEnabled();
  
  // Vérifier si la politique existe déjà
  const policyExists = await checkPolicy();
  
  if (!isRLSEnabled) {
    console.log('⚙️ Activation de RLS sur la table des visites...');
    
    // Activer RLS sur la table
    await executeSQL(`ALTER TABLE visits ENABLE ROW LEVEL SECURITY;`);
  }
  
  if (!policyExists) {
    console.log('⚙️ Création de la politique RLS pour les visites...');
    
    // Créer la politique de sécurité
    const policySQL = `
      CREATE POLICY visits_policy ON visits 
      USING (
        current_setting('role') = 'postgres' OR
        EXISTS (SELECT 1 FROM properties WHERE properties.id = visits.property_id AND properties.user_id = current_setting('app.user_id')::integer) OR
        agent_id = current_setting('app.user_id')::integer
      );
    `;
    
    await executeSQL(policySQL);
  } else {
    console.log('⚙️ Mise à jour de la politique RLS pour les visites...');
    
    // Mettre à jour la politique existante
    const updatePolicySQL = `
      DROP POLICY IF EXISTS visits_policy ON visits;
      CREATE POLICY visits_policy ON visits 
      USING (
        current_setting('role') = 'postgres' OR
        EXISTS (SELECT 1 FROM properties WHERE properties.id = visits.property_id AND properties.user_id = current_setting('app.user_id')::integer) OR
        agent_id = current_setting('app.user_id')::integer
      );
    `;
    
    await executeSQL(updatePolicySQL);
  }
  
  console.log('✅ Mise à jour de la politique RLS terminée!');
}

// Exécuter le programme principal
main().catch(error => {
  console.error('❌ Une erreur est survenue:', error);
  process.exit(1);
}); 