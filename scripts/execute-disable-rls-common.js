/**
 * Version simplifiée du script pour désactiver RLS
 * Utilise uniquement les modules de base
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🔐 Désactivation de Row-Level Security...');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Client PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL
});

// Script SQL pour désactiver RLS
const disableRlsScript = `
-- Activation du mode super-utilisateur pour supprimer les politiques et désactiver RLS
SET session_replication_role = 'replica';

-- 1. Désactiver RLS sur toutes les tables publiques
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Désactivation de RLS sur toutes les tables du schéma public...';
    
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'RLS désactivé sur public.%', r.tablename;
    END LOOP;
END
$$;

-- 2. Supprimer toutes les politiques RLS existantes
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Suppression de toutes les politiques RLS...';
    
    FOR r IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Politique % supprimée sur %.%', 
                     r.policyname, r.schemaname, r.tablename;
    END LOOP;
END
$$;

-- 3. Supprimer les fonctions RLS
DROP FUNCTION IF EXISTS public.setup_user_environment(integer);
DROP FUNCTION IF EXISTS public.set_current_user_id();
DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.user_has_access_to_record(integer);

-- Restaurer le mode normal
SET session_replication_role = 'origin';
`;

// Fonction principale
async function main() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    console.log('📜 Exécution du script SQL pour désactiver RLS...');
    
    // Exécuter le script SQL
    await client.query(disableRlsScript);
    
    console.log('✅ Row-Level Security désactivé avec succès!');
    console.log('🔒 La sécurité est maintenant assurée par la séparation des schémas.');

  } catch (error) {
    console.error('❌ Erreur lors de la désactivation de RLS:', error);
  } finally {
    // Fermer la connexion
    if (client) client.release();
    await pool.end();
  }
}

// Exécuter le script
main(); 