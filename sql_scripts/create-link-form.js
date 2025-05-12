// Script pour créer une association entre un lien et un formulaire
const { db } = require('../dist/db');
const { sql } = require('drizzle-orm');

async function createAssociation() {
  try {
    console.log('Création de l\'association entre le lien 8 et le formulaire 1...');
    
    // Définir le search_path sur le schéma client
    await db.execute(sql`SET search_path TO client_109, public`);
    
    // Insérer l'association
    const result = await db.execute(
      sql`INSERT INTO link_forms (link_id, form_id, created_at) 
          VALUES (8, 1, NOW())
          RETURNING id`
    );
    
    if (result.rowCount > 0) {
      console.log(`Association créée avec succès! ID: ${result.rows[0].id}`);
    } else {
      console.log('Aucune ligne insérée');
    }
    
    // Réinitialiser le search_path
    await db.execute(sql`SET search_path TO public`);
    
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    process.exit();
  }
}

// Exécuter la fonction
createAssociation(); 