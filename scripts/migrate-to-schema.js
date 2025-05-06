/**
 * Script de migration de l'architecture RLS vers une architecture par schéma client
 * Ce script:
 * 1. Crée un schéma par client
 * 2. Copie les données pertinentes dans chaque schéma
 * 3. Configure les droits d'accès appropriés
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Obtenir le répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Récupérer la connexion à la base de données
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';

// Ajouter une option pour forcer la recréation des schémas
const FORCE_RECREATE_SCHEMAS = process.env.FORCE_RECREATE_SCHEMAS === 'true';

console.log('🚀 Début de la migration vers une architecture par schéma client');
console.log(`🔌 Connexion: ${DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Client PostgreSQL pour les opérations
const client = new pg.Client({
  connectionString: DATABASE_URL
});

// Tables principales avec leurs relations
const MAIN_TABLES = [
  'properties',
  'tenants',
  'transactions',
  'documents',
  'visits',
  'maintenance_requests',
  'feedbacks',
  'form_submissions',
  'tenant_documents',
  'tenant_history',
  'property_history',
  'property_works',
  'property_coordinates',
  'property_analyses'
];

// Tables qui doivent rester dans le schéma public
const SHARED_TABLES = [
  'users',
  'sessions',
  'user_notification_settings',
  'notifications',
  'pdf_templates',
  'pdf_themes'
];

/**
 * Supprimer et recréer tous les schémas clients existants
 */
async function cleanupExistingSchemas() {
  if (!FORCE_RECREATE_SCHEMAS) {
    console.log('ℹ️ Mode conservation des schémas existants (définir FORCE_RECREATE_SCHEMAS=true pour forcer la recréation)');
    return;
  }
  
  console.log('🔄 Nettoyage des schémas existants...');
  
  try {
    // Récupérer tous les schémas client existants
    const { rows: schemas } = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'client_%'
    `);
    
    if (schemas.length === 0) {
      console.log('✅ Aucun schéma client existant à nettoyer');
      return;
    }
    
    console.log(`🗑️ Suppression de ${schemas.length} schémas clients existants`);
    
    // Pour chaque schéma, supprimer toutes les tables puis le schéma
    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      console.log(`  - Nettoyage du schéma ${schemaName}`);
      
      try {
        // Supprimer le schéma et son contenu
        await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
        console.log(`    ✅ Schéma ${schemaName} supprimé avec succès`);
      } catch (error) {
        console.error(`    ❌ Erreur lors de la suppression du schéma ${schemaName}:`, error);
      }
    }
    
    // Nettoyer également le schéma admin_views
    try {
      console.log(`  - Nettoyage du schéma admin_views`);
      await client.query(`DROP SCHEMA IF EXISTS admin_views CASCADE`);
      console.log(`    ✅ Schéma admin_views supprimé avec succès`);
    } catch (error) {
      console.error(`    ❌ Erreur lors de la suppression du schéma admin_views:`, error);
    }
    
    console.log('✅ Nettoyage des schémas terminé');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des schémas:', error);
    return false;
  }
}

/**
 * Migrer les types enum personnalisés
 * Cette fonction doit être appelée avant de migrer les données des clients
 */
async function migrateCustomTypes() {
  console.log('🔄 Migration des types personnalisés...');
  
  try {
    // Récupérer tous les types enum de la base de données
    const { rows: enumTypes } = await client.query(`
      SELECT t.typname AS enum_name, 
             array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `);
    
    console.log(`📊 ${enumTypes.length} types enum trouvés`);
    
    // Migrer chaque type enum vers tous les schémas client existants
    const { rows: schemas } = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name LIKE 'client_%'
    `);
    
    // Si aucun type enum n'est trouvé, terminer la fonction
    if (enumTypes.length === 0) {
      console.log('✅ Aucun type enum à migrer');
      return;
    }
    
    // Si aucun schéma client n'est trouvé, terminer la fonction
    if (schemas.length === 0) {
      console.log('❌ Aucun schéma client trouvé pour migrer les types enum');
      return;
    }
    
    // Pour chaque schéma client, créer tous les types enum
    for (const schema of schemas) {
      const schemaName = schema.schema_name;
      console.log(`  - Migration des types enum vers le schéma ${schemaName}`);
      
      for (const enumType of enumTypes) {
        const enumName = enumType.enum_name;
        const enumValues = enumType.enum_values;
        const enumValuesSql = enumValues.map(v => `'${v}'`).join(', ');
        
        // Créer le type enum dans le schéma client
        const createEnumSql = `
          CREATE TYPE ${schemaName}.${enumName} AS ENUM (${enumValuesSql});
        `;
        
        try {
          await client.query(createEnumSql);
          console.log(`    ✅ Type enum ${enumName} migré avec succès`);
        } catch (error) {
          // Si le type existe déjà, ignorer l'erreur
          if (error.code === '42710') { // Code pour "type already exists"
            console.log(`    ℹ️ Type enum ${enumName} existe déjà dans le schéma ${schemaName}`);
          } else {
            console.error(`    ❌ Erreur lors de la migration du type enum ${enumName}:`, error);
          }
        }
      }
    }
    
    console.log('✅ Migration des types personnalisés terminée');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la migration des types personnalisés:', error);
    return false;
  }
}

/**
 * Fonction principale d'exécution
 */
async function main() {
  try {
    await client.connect();
    console.log('✅ Connexion à la base de données établie');

    // 1. Nettoyer les schémas existants si demandé
    await cleanupExistingSchemas();

    // 2. Migrer les types personnalisés (ENUM, etc.)
    await migrateCustomTypes();

    // 3. Récupérer tous les clients (utilisateurs avec rôle 'clients')
    console.log('🔍 Récupération des clients...');
    const { rows: clients } = await client.query(`
      SELECT id, username, role FROM users 
      WHERE role = 'clients'
    `);
    console.log(`📊 ${clients.length} clients trouvés`);

    // 4. Créer un répertoire pour sauvegarder les scripts SQL
    const scriptsDir = path.join(process.cwd(), 'migration_scripts');
    try {
      await fs.mkdir(scriptsDir, { recursive: true });
    } catch (err) {
      // Ignorer si le répertoire existe déjà
    }
    
    // 5. Générer et exécuter le script pour chaque client
    for (const client_info of clients) {
      await migrateClientData(client_info);
    }

    // 6. Créer la table de mapping et les vues pour l'admin
    await createAdminViews();
    
    // 7. Configurer la fonction de routing automatique
    await setupRoutingFunction();

    console.log('🎉 Migration vers architecture par schéma terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await client.end();
  }
}

/**
 * Migrer les données d'un client vers son propre schéma
 */
async function migrateClientData(client_info) {
  const clientId = client_info.id;
  const username = client_info.username;
  const schemaName = `client_${clientId}`;
  
  console.log(`\n🔄 Migration des données pour le client ${username} (ID: ${clientId})`);
  
  try {
    // 1. Créer un schéma pour le client
    console.log(`  - Création du schéma ${schemaName}`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // 2. Générer le script pour la création des tables et la migration des données
    const migrationSql = await generateMigrationScript(clientId, schemaName);
    
    // 3. Sauvegarder le script SQL dans un fichier
    const scriptPath = path.join(process.cwd(), 'migration_scripts', `migrate_client_${clientId}.sql`);
    await fs.writeFile(scriptPath, migrationSql);
    console.log(`  - Script SQL sauvegardé dans ${scriptPath}`);
    
    // 4. Exécuter le script SQL avec les contraintes complètement désactivées
    console.log(`  - Exécution du script SQL pour ${schemaName}`);
    
    // Démarrer une transaction
    await client.query('BEGIN');
    
    try {
      // Désactiver COMPLÈTEMENT la vérification des contraintes
      // session_replication_role = replica désactive toutes les contraintes, triggers, etc.
      await client.query('SET session_replication_role = replica');
      
      // Exécuter le script de migration
      await client.query(migrationSql);
      
      // Réactiver les contraintes
      await client.query('SET session_replication_role = DEFAULT');
      
      // Valider la transaction
      await client.query('COMMIT');
      console.log(`    ✅ Migration des tables et données réussie`);
    } catch (error) {
      // En cas d'erreur, annuler toutes les modifications
      await client.query('ROLLBACK');
      throw error;
    }
    
    // 5. Configurer les permissions du schéma
    await setupSchemaPermissions(clientId, schemaName);
    
    console.log(`✅ Migration terminée pour le client ${username}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la migration du client ${username}:`, error);
    return false;
  }
}

/**
 * Générer le script SQL pour la migration d'un client
 */
async function generateMigrationScript(clientId, schemaName) {
  let script = `-- Script de migration pour le client ${clientId} vers le schéma ${schemaName}\n\n`;
  
  // Ajouter la création du schéma
  script += `-- 1. Création du schéma\n`;
  script += `CREATE SCHEMA IF NOT EXISTS ${schemaName};\n\n`;
  
  // Trier les tables par ordre de dépendance (les tables sans dépendances d'abord)
  // Cet ordre est important pour les contraintes de clé étrangère
  const TABLES_ORDER = [
    'properties',         // Table principale
    'tenants',            // Dépend de properties
    'documents',          // Table indépendante
    'transactions',       // Peut dépendre de properties
    'visits',             // Dépend de properties
    'maintenance_requests', // Dépend de properties
    'feedbacks',          // Peut dépendre de tenants
    'form_submissions',   // Table généralement indépendante
    'tenant_documents',   // Dépend de tenants
    'tenant_history',     // Dépend de tenants
    'property_history',   // Dépend de properties
    'property_works',     // Dépend de properties
    'property_coordinates', // Dépend de properties
    'property_analyses'   // Dépend de properties
  ];
  
  // Faire une première passe pour créer toutes les tables sans les contraintes FK
  script += `-- 2. Création des tables (sans contraintes de clé étrangère)\n`;
  
  for (const table of TABLES_ORDER) {
    if (!MAIN_TABLES.includes(table)) continue;
    
    script += `-- Table: ${table}\n`;
    
    // Récupérer la structure de la table
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type, character_maximum_length, 
             column_default, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table}'
      ORDER BY ordinal_position
    `);
    
    if (columns.length === 0) {
      script += `-- Table ${table} n'existe pas, ignorée\n\n`;
      continue;
    }
    
    // Générer le CREATE TABLE sans les clés étrangères
    script += `CREATE TABLE IF NOT EXISTS ${schemaName}.${table} (\n`;
    script += columns.map(col => {
      // Gestion correcte des types de données, y compris les ARRAY
      let dataType = col.data_type;
      
      // Les tableaux sont identifiés par le préfixe ARRAY dans data_type
      // et le type réel est dans udt_name (sans le préfixe "_")
      if (dataType === 'ARRAY') {
        const elementType = col.udt_name.startsWith('_') 
          ? col.udt_name.substring(1) 
          : col.udt_name;
        dataType = `${elementType}[]`;
      }
      
      // Pour les autres types qui peuvent avoir des dimensions spécifiques
      else if (col.character_maximum_length) {
        dataType = `${dataType}(${col.character_maximum_length})`;
      }
      
      let columnDef = `  "${col.column_name}" ${dataType}`;
      
      if (col.column_default) {
        // Échapper correctement les valeurs par défaut pour éviter les erreurs de syntaxe
        columnDef += ` DEFAULT ${col.column_default}`;
      }
      
      if (col.is_nullable === 'NO') {
        columnDef += ' NOT NULL';
      }
      
      return columnDef;
    }).join(',\n');
    
    // Récupérer les contraintes de clé primaire
    const { rows: primaryKeys } = await client.query(`
      SELECT c.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS c ON tc.constraint_name = c.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' 
      AND tc.table_schema = 'public' 
      AND tc.table_name = '${table}'
    `);
    
    if (primaryKeys.length > 0) {
      script += `,\n  PRIMARY KEY (${primaryKeys.map(pk => `"${pk.column_name}"`).join(', ')})`;
    }
    
    script += `\n);\n\n`;
  }
  
  // Insertion des données dans l'ordre pour respecter les dépendances
  script += `-- 3. Insertion des données\n`;
  
  for (const table of TABLES_ORDER) {
    if (!MAIN_TABLES.includes(table)) continue;
    
    // Vérifier si la table existe
    const { rows: tableExists } = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${table}'
    `);
    
    if (tableExists.length === 0) {
      continue;
    }
    
    script += `-- Copier les données du client pour la table ${table}\n`;
    
    // Récupérer les colonnes de la table
    const { rows: columns } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table}'
    `);
    
    // Déterminer la colonne pour filtrer les données du client
    let filterColumn = 'user_id'; // Par défaut
    
    // Vérifier si la table a une colonne user_id
    const hasUserIdColumn = columns.some(col => col.column_name === 'user_id');
    
    if (!hasUserIdColumn) {
      if (table === 'tenant_documents' || table === 'tenant_history') {
        filterColumn = 'tenant_id';
        script += `-- Cette table utilise tenant_id pour le filtrage\n`;
        script += `INSERT INTO ${schemaName}.${table} SELECT * FROM public.${table} WHERE tenant_id IN (SELECT id FROM public.tenants WHERE user_id = ${clientId});\n\n`;
        continue;
      } else if (table === 'property_coordinates' || table === 'property_works' || table === 'property_history' || table === 'property_analyses') {
        filterColumn = 'property_id';
        script += `-- Cette table utilise property_id pour le filtrage\n`;
        script += `INSERT INTO ${schemaName}.${table} SELECT * FROM public.${table} WHERE property_id IN (SELECT id FROM public.properties WHERE user_id = ${clientId});\n\n`;
        continue;
      } else {
        script += `-- Impossible de déterminer la colonne de filtrage pour cette table\n`;
        script += `-- Avertissement: Toutes les données seront copiées, à filtrer manuellement\n`;
        script += `INSERT INTO ${schemaName}.${table} SELECT * FROM public.${table};\n\n`;
        continue;
      }
    }
    
    script += `INSERT INTO ${schemaName}.${table} SELECT * FROM public.${table} WHERE ${filterColumn} = ${clientId};\n\n`;
  }
  
  // Ajout des contraintes de clé étrangère après l'insertion des données
  script += `-- 4. Ajout des contraintes de clé étrangère\n`;
  const { rows: foreignKeys } = await client.query(`
    SELECT
      tc.table_name, kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
      AND ccu.table_name IN (${MAIN_TABLES.map(t => `'${t}'`).join(',')})
  `);
  
  for (const fk of foreignKeys) {
    if (MAIN_TABLES.includes(fk.table_name) && MAIN_TABLES.includes(fk.foreign_table_name)) {
      script += `ALTER TABLE ${schemaName}.${fk.table_name} ADD CONSTRAINT fk_${fk.table_name}_${fk.column_name} `;
      script += `FOREIGN KEY (${fk.column_name}) REFERENCES ${schemaName}.${fk.foreign_table_name} (${fk.foreign_column_name});\n`;
    }
  }
  
  return script;
}

/**
 * Configurer les permissions sur le schéma pour le client
 */
async function setupSchemaPermissions(clientId, schemaName) {
  // 1. Créer un rôle PostgreSQL pour le client s'il n'existe pas déjà
  const roleName = `client_role_${clientId}`;
  
  try {
    // Vérifier si le rôle existe
    const { rows: existingRoles } = await client.query(`
      SELECT 1 FROM pg_roles WHERE rolname = '${roleName}'
    `);
    
    if (existingRoles.length === 0) {
      console.log(`  - Création du rôle PostgreSQL ${roleName}`);
      await client.query(`CREATE ROLE ${roleName}`);
    } else {
      console.log(`  - Le rôle ${roleName} existe déjà`);
    }
    
    // 2. Configurer les permissions sur le schéma client
    console.log(`  - Configuration des permissions sur le schéma ${schemaName}`);
    await client.query(`
      GRANT USAGE ON SCHEMA ${schemaName} TO ${roleName};
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schemaName} TO ${roleName};
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} 
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName};
    `);
    
    // 3. Configurer les permissions sur le schéma public
    console.log(`  - Configuration des permissions sur le schéma public pour ${roleName}`);
    await client.query(`
      GRANT USAGE ON SCHEMA public TO ${roleName};
      GRANT SELECT ON public.users TO ${roleName};
      GRANT SELECT ON public.sessions TO ${roleName};
    `);
    
    // 4. Associer le rôle de la base de données à l'utilisateur dans la table users
    console.log(`  - Mise à jour de l'utilisateur ${clientId} avec le rôle PostgreSQL ${roleName}`);
    await client.query(`
      UPDATE public.users 
      SET settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb), 
        '{postgres_role}', 
        '"${roleName}"'
      ) 
      WHERE id = ${clientId}
    `);
    
    console.log(`✅ Permissions configurées pour le client ${clientId}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la configuration des permissions pour le client ${clientId}:`, error);
    return false;
  }
}

/**
 * Créer les vues pour l'administrateur
 */
async function createAdminViews() {
  console.log('\n🔄 Création des vues pour l\'administrateur');
  
  try {
    // 1. Créer un schéma pour les vues admin
    await client.query(`CREATE SCHEMA IF NOT EXISTS admin_views`);
    
    // 2. Pour chaque table principale, créer une vue qui agrège les données de tous les schémas
    for (const table of MAIN_TABLES) {
      console.log(`  - Création de la vue admin pour ${table}`);
      
      // Vérifier si la table existe
      const { rows: tableExists } = await client.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '${table}'
      `);
      
      if (tableExists.length === 0) {
        console.log(`    Table ${table} n'existe pas, ignorée`);
        continue;
      }
      
      // Récupérer la liste des schémas client
      const { rows: schemas } = await client.query(`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name LIKE 'client_%'
      `);
      
      if (schemas.length === 0) {
        console.log(`    Pas de schémas client trouvés, vue ignorée`);
        continue;
      }
      
      // Construire la requête UNION pour la vue admin
      let viewQuery = `
        CREATE OR REPLACE VIEW admin_views.${table}_all AS
      `;
      
      const unionParts = schemas.map(schema => `
        SELECT *, '${schema.schema_name}' as _schema_name
        FROM ${schema.schema_name}.${table}
      `);
      
      viewQuery += unionParts.join('\nUNION ALL\n');
      viewQuery += ';';
      
      await client.query(viewQuery);
    }
    
    // 3. Créer une table de mapping des schémas vers les utilisateurs
    console.log(`  - Création de la table de mapping schéma-utilisateur`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_mapping (
        schema_name TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES public.users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Remplir la table de mapping
      INSERT INTO public.schema_mapping (schema_name, user_id)
      SELECT DISTINCT ON (schema_name)
        'client_' || id AS schema_name,
        id AS user_id
      FROM public.users
      WHERE role = 'clients'
      ON CONFLICT (schema_name) DO NOTHING;
    `);
    
    console.log('✅ Vues administrateur créées avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la création des vues administrateur:', error);
    return false;
  }
}

/**
 * Configurer la fonction de routage automatique
 */
async function setupRoutingFunction() {
  console.log('\n🔄 Configuration de la fonction de routage automatique');
  
  try {
    // Créer une fonction pour définir le search_path selon l'utilisateur connecté
    await client.query(`
      CREATE OR REPLACE FUNCTION public.set_schema_for_user(user_id INTEGER) 
      RETURNS TEXT AS $$
      DECLARE
        schema_name TEXT;
        user_role TEXT;
      BEGIN
        -- Récupérer le rôle de l'utilisateur
        SELECT role INTO user_role FROM public.users WHERE id = user_id;
        
        IF user_role = 'admin' THEN
          -- L'administrateur a accès à tout
          RETURN 'public, admin_views';
        ELSE
          -- Récupérer le nom du schéma pour cet utilisateur
          SELECT 'client_' || user_id::TEXT INTO schema_name;
          
          -- Définir le search_path
          RETURN schema_name || ', public';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Fonction à appeler pour configurer l'environnement de l'utilisateur
      CREATE OR REPLACE FUNCTION public.setup_user_environment(user_id INTEGER) 
      RETURNS VOID AS $$
      DECLARE
        search_path_value TEXT;
      BEGIN
        -- Définir le search_path
        search_path_value := public.set_schema_for_user(user_id);
        EXECUTE 'SET search_path TO ' || search_path_value;
        
        -- Définir l'ID utilisateur courant (pour compatibilité avec l'ancien code)
        PERFORM set_config('app.user_id', user_id::TEXT, FALSE);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Fonction de routage automatique configurée');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la configuration de la fonction de routage:', error);
    return false;
  }
}

// Exécuter le script
main().catch(console.error);