/**
 * Script pour mettre à jour la table users et l'adapter à la nouvelle architecture de stockage
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

console.log('🚀 Mise à jour de la table users pour la nouvelle architecture de stockage');
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

    // 1. Examiner les colonnes actuelles liées au stockage dans la table users
    const { rows: storageColumns } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('storage_used', 'storage_limit', 'storage_tier');
    `);

    console.log('\n📊 Colonnes de stockage actuelles dans la table users:');
    console.table(storageColumns);

    // 2. Ajouter une colonne pour référencer le plan de stockage
    console.log('🔄 Ajout de la colonne storage_plan_id à la table users...');
    await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS storage_plan_id INTEGER REFERENCES public.storage_plans(id);
    `);
    console.log('✅ Colonne ajoutée');

    // 3. Mettre à jour le plan de stockage pour les utilisateurs existants
    console.log('🔄 Attribution des plans de stockage aux utilisateurs existants...');
    const { rowCount } = await client.query(`
      UPDATE public.users SET storage_plan_id = 
        CASE 
          WHEN role = 'admin' THEN 3  -- Professionnel pour les admin
          ELSE 1                      -- Gratuit pour les autres
        END
      WHERE storage_plan_id IS NULL;
    `);
    console.log(`✅ ${rowCount} utilisateurs mis à jour`);

    // 4. Afficher les utilisateurs avec leurs plans de stockage
    const { rows: usersWithPlans } = await client.query(`
      SELECT u.id, u.username, u.role, u.storage_plan_id, p.name as plan_name, p.storage_limit
      FROM public.users u
      LEFT JOIN public.storage_plans p ON u.storage_plan_id = p.id
      ORDER BY u.id;
    `);

    console.log('\n📊 Utilisateurs avec leurs plans de stockage:');
    console.table(usersWithPlans);

    // 5. Migrer les données des anciennes colonnes vers la nouvelle structure (si applicable)
    if (storageColumns.length > 0) {
      console.log('🔄 Migration des données d\'utilisation de stockage existantes...');
      const { rowCount: insertedCount } = await client.query(`
        INSERT INTO client_31.storage_usage (
          resource_type,
          resource_id,
          filename,
          file_path,
          file_type,
          size_bytes,
          created_at
        )
        SELECT 
          'user_storage',    -- Type générique pour la migration initiale
          id,                -- ID de l'utilisateur comme resource_id
          'migrated_data',   -- Nom de fichier générique pour la migration
          '',                -- Chemin de fichier vide pour la migration
          'application/octet-stream', -- Type MIME générique
          COALESCE(NULLIF(storage_used, ''), '0')::BIGINT, -- Conversion de storage_used en BIGINT
          NOW()              -- Date actuelle pour created_at
        FROM public.users
        WHERE storage_used IS NOT NULL AND storage_used != '0'
        AND id = 31; -- Seulement pour l'utilisateur test (ID 31)
      `);
      
      console.log(`✅ ${insertedCount} enregistrements d'utilisation de stockage migrés`);
    } else {
      console.log('ℹ️ Aucune donnée de stockage à migrer (colonnes non trouvées)');
    }

    // 6. Vérifier les entrées dans la table storage_usage
    const { rows: storageUsage } = await client.query(`
      SELECT * FROM client_31.storage_usage
      ORDER BY id;
    `);

    console.log('\n📊 Données d\'utilisation de stockage migrées:');
    console.table(storageUsage);

    console.log('\n🎉 Mise à jour de la table users terminée avec succès');
    
    // Indiquer les prochaines étapes
    console.log('\n⚠️ PROCHAINES ÉTAPES:');
    console.log('1. Vérifier que toutes les données ont été correctement migrées');
    console.log('2. Adapter le code de l\'application pour utiliser la nouvelle structure');
    console.log('3. Une fois tout vérifié, supprimer les anciennes colonnes avec:');
    console.log('   ALTER TABLE public.users DROP COLUMN storage_used;');
    console.log('   ALTER TABLE public.users DROP COLUMN storage_limit;');
    console.log('   ALTER TABLE public.users DROP COLUMN storage_tier;');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

// Exécuter la fonction principale
main().catch(console.error); 