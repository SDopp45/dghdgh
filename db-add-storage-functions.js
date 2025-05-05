// Script pour ajouter des fonctions utilitaires à la base de données
import pg from 'pg';
const { Client } = pg;

async function addDbFunctions() {
  // Connexion à la base de données
  const client = new Client({
    connectionString: 'postgresql://postgres:123456789@localhost:5432/property_manager'
  });

  try {
    await client.connect();
    console.log('Connexion réussie à la base de données.');

    // 1. Ajouter une fonction pour recalculer l'espace de stockage utilisé en fonction des documents
    console.log('Création de la fonction recalculate_user_storage...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION recalculate_user_storage(user_id_param INTEGER)
      RETURNS NUMERIC AS $$
      DECLARE
        total_size NUMERIC := 0;
      BEGIN
        -- Calculer la taille totale des documents de l'utilisateur
        SELECT COALESCE(SUM(COALESCE(file_size, 0)), 0) INTO total_size
        FROM documents
        WHERE user_id = user_id_param;
        
        -- Mettre à jour la table users
        UPDATE users
        SET 
          storage_used = total_size,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id_param;
        
        RETURN total_size;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('Fonction recalculate_user_storage créée avec succès.');
    
    // 2. Ajouter un trigger pour mettre à jour automatiquement l'espace de stockage lors de l'ajout/suppression de documents
    console.log('Création du trigger update_storage_on_document_change...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_storage_on_document_change()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Pour les insertions et mises à jour
        IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
          -- Enregistrer l'opération dans storage_usage_details
          IF (TG_OP = 'INSERT') THEN
            INSERT INTO storage_usage_details (
              user_id, document_id, file_size, operation, file_type, file_path
            ) VALUES (
              NEW.user_id, NEW.id, COALESCE(NEW.file_size, 0), 'upload', 
              NEW.file_type, NEW.file_path
            );
          ELSIF (TG_OP = 'UPDATE' AND OLD.file_size IS DISTINCT FROM NEW.file_size) THEN
            INSERT INTO storage_usage_details (
              user_id, document_id, file_size, operation, file_type, file_path
            ) VALUES (
              NEW.user_id, NEW.id, COALESCE(NEW.file_size, 0) - COALESCE(OLD.file_size, 0), 'modify', 
              NEW.file_type, NEW.file_path
            );
          END IF;
          
          -- Mise à jour du stockage utilisateur
          PERFORM recalculate_user_storage(NEW.user_id);
          RETURN NEW;
        
        -- Pour les suppressions
        ELSIF (TG_OP = 'DELETE') THEN
          -- Enregistrer l'opération dans storage_usage_details
          INSERT INTO storage_usage_details (
            user_id, document_id, file_size, operation, file_type, file_path
          ) VALUES (
            OLD.user_id, OLD.id, COALESCE(OLD.file_size, 0) * -1, 'delete', 
            OLD.file_type, OLD.file_path
          );
          
          -- Mise à jour du stockage utilisateur
          PERFORM recalculate_user_storage(OLD.user_id);
          RETURN OLD;
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Supprimer le trigger s'il existe déjà
      DROP TRIGGER IF EXISTS trg_update_storage_on_document_change ON documents;
      
      -- Créer le trigger
      CREATE TRIGGER trg_update_storage_on_document_change
      AFTER INSERT OR UPDATE OR DELETE ON documents
      FOR EACH ROW
      EXECUTE FUNCTION update_storage_on_document_change();
    `);
    
    console.log('Trigger update_storage_on_document_change créé avec succès.');
    
    // 3. Ajouter une colonne file_size à la table documents si elle n'existe pas
    const checkFileSize = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'file_size'
      );
    `);
    
    if (!checkFileSize.rows[0].exists) {
      console.log('Ajout de la colonne file_size à la table documents...');
      
      await client.query(`
        ALTER TABLE documents 
        ADD COLUMN file_size BIGINT DEFAULT 0;
      `);
      
      console.log('Colonne file_size ajoutée.');
    } else {
      console.log('La colonne file_size existe déjà dans la table documents.');
    }
    
    // 4. Mettre à jour les statistiques de stockage pour tous les utilisateurs
    console.log('\nMise à jour des statistiques de stockage pour tous les utilisateurs...');
    
    const usersResult = await client.query(`
      SELECT id, username FROM users;
    `);
    
    for (const user of usersResult.rows) {
      const result = await client.query(`
        SELECT recalculate_user_storage($1) as calculated_size;
      `, [user.id]);
      
      const calculatedSize = result.rows[0].calculated_size;
      console.log(`Utilisateur ${user.username} (ID: ${user.id}): Stockage recalculé = ${calculatedSize} octets`);
    }

  } catch (err) {
    console.error("Erreur lors de la connexion ou de l'exécution des requêtes SQL:", err);
  } finally {
    await client.end();
    console.log('\nConnexion fermée.');
  }
}

addDbFunctions().catch(console.error); 