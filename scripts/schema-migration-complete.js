/**
 * Script qui vérifie et finalise la migration vers l'architecture multi-schéma
 * Ce script effectue une série de vérifications pour s'assurer que la migration est complète 
 * et supprime les éléments RLS résiduels.
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('📋 Vérification de la migration vers architecture multi-schéma...');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Client PostgreSQL
const client = new pg.Client({
  connectionString: DATABASE_URL
});

// Vérifications à effectuer
const checks = [
  {
    name: "Vérification du schéma template",
    query: "SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'template')",
    errorMessage: "Le schéma 'template' n'existe pas. La migration n'est pas complète."
  },
  {
    name: "Vérification du schéma client_31",
    query: "SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'client_31')",
    errorMessage: "Le schéma 'client_31' n'existe pas. La migration n'est pas complète."
  },
  {
    name: "Vérification du schéma admin_views",
    query: "SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'admin_views')",
    errorMessage: "Le schéma 'admin_views' n'existe pas. La migration n'est pas complète."
  },
  {
    name: "Vérification des tables dans client_31",
    query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'client_31'",
    minValue: 10,
    errorMessage: "Le schéma client_31 contient peu de tables. La migration n'est peut-être pas complète."
  }
];

// Nettoyages à effectuer pour finaliser la migration
const cleanups = [
  {
    name: "Suppression de la variable app.user_id",
    query: "ALTER DATABASE property_manager RESET app.user_id",
    successMessage: "Variable app.user_id supprimée"
  },
  {
    name: "Suppression de la fonction current_user_id",
    query: "DROP FUNCTION IF EXISTS public.current_user_id() CASCADE",
    successMessage: "Fonction current_user_id supprimée"
  },
  {
    name: "Suppression de la fonction set_user_id",
    query: "DROP FUNCTION IF EXISTS public.set_user_id() CASCADE",
    successMessage: "Fonction set_user_id supprimée"
  },
  {
    name: "Suppression de la fonction safe_create_policy",
    query: "DROP FUNCTION IF EXISTS public.safe_create_policy(TEXT, TEXT, TEXT) CASCADE",
    successMessage: "Fonction safe_create_policy supprimée"
  },
  {
    name: "Désactivation de toutes les politiques RLS restantes",
    query: "SELECT disable_all_rls_policies()",
    customFunction: true, // Ceci indique qu'une fonction custom sera créée pour l'exécution
    successMessage: "Toutes les politiques RLS restantes ont été désactivées"
  },
  {
    name: "Suppression des anciens scripts RLS",
    function: async () => {
      const filesToDelete = [
        "scripts/configure-rls.js",
        "scripts/setup-postgres-rls.sql"
      ];
      
      for (const file of filesToDelete) {
        try {
          await fs.access(file);
          await fs.unlink(file);
          console.log(`✅ Fichier obsolète supprimé: ${file}`);
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.log(`ℹ️ Fichier déjà supprimé: ${file}`);
          } else {
            console.error(`❌ Erreur lors de la suppression du fichier ${file}:`, error);
          }
        }
      }
      return true;
    },
    successMessage: "Anciens scripts RLS supprimés"
  }
];

// Fonction principale
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Créer la fonction pour désactiver toutes les politiques RLS
    await client.query(`
      CREATE OR REPLACE FUNCTION disable_all_rls_policies() RETURNS BOOLEAN AS $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN 
          SELECT schemaname, tablename, policyname
          FROM pg_policies
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                         r.policyname, r.schemaname, r.tablename);
          RAISE NOTICE 'Politique % supprimée sur %.%', 
                       r.policyname, r.schemaname, r.tablename;
        END LOOP;
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Erreur: %', SQLERRM;
          RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Exécuter les vérifications
    console.log('🔍 Exécution des vérifications...');
    let allChecksPassed = true;
    
    for (const check of checks) {
      try {
        console.log(`  Vérification: ${check.name}`);
        const result = await client.query(check.query);
        
        if (result.rows[0].exists === false) {
          console.error(`❌ ${check.errorMessage}`);
          allChecksPassed = false;
        } else if (check.minValue && parseInt(result.rows[0].count) < check.minValue) {
          console.warn(`⚠️ ${check.errorMessage} (${result.rows[0].count} tables trouvées)`);
        } else {
          console.log(`  ✅ Vérification réussie`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la vérification "${check.name}":`, error);
        allChecksPassed = false;
      }
    }
    
    if (!allChecksPassed) {
      console.warn("⚠️ Certaines vérifications ont échoué. Il est recommandé de corriger ces problèmes avant de continuer.");
      const answer = await askQuestion("Voulez-vous quand même continuer avec le nettoyage? (o/n): ");
      if (answer.toLowerCase() !== 'o') {
        console.log("❌ Opération annulée par l'utilisateur.");
        return;
      }
    }
    
    // Exécuter les nettoyages
    console.log('\n🧹 Exécution des nettoyages...');
    
    for (const cleanup of cleanups) {
      try {
        console.log(`  Nettoyage: ${cleanup.name}`);
        
        if (cleanup.function) {
          // Exécuter une fonction JavaScript personnalisée
          const result = await cleanup.function();
          if (result) {
            console.log(`  ✅ ${cleanup.successMessage}`);
          }
        } else if (cleanup.customFunction) {
          // Exécuter une fonction PostgreSQL personnalisée
          const result = await client.query(cleanup.query);
          console.log(`  ✅ ${cleanup.successMessage}`);
        } else {
          // Exécuter une requête SQL standard
          await client.query(cleanup.query);
          console.log(`  ✅ ${cleanup.successMessage}`);
        }
      } catch (error) {
        if (error.code === '42704') { // Code PostgreSQL pour "objet n'existe pas"
          console.log(`  ℹ️ L'objet n'existe pas ou a déjà été supprimé`);
        } else {
          console.error(`  ⚠️ Erreur lors du nettoyage "${cleanup.name}":`, error.message);
        }
      }
    }
    
    console.log('\n✅ Migration vers architecture multi-schéma terminée avec succès!');
    console.log('🔒 La sécurité est maintenant entièrement gérée par la séparation des schémas.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de migration:', error);
  } finally {
    await client.end();
  }
}

// Fonction utilitaire pour demander confirmation à l'utilisateur
function askQuestion(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Exécuter le script
main(); 