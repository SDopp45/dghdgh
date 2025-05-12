// Script pour créer une association entre un lien et un formulaire
const { Pool } = require('pg');

// Configuration de la connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/immovault'
});

async function createAssociation() {
  const client = await pool.connect();
  
  try {
    console.log('Création de l\'association entre le lien 8 et le formulaire 1...');
    
    // Définir le search_path sur le schéma client
    await client.query('SET search_path TO client_109, public');
    
    // Insérer l'association
    const result = await client.query(
      'INSERT INTO link_forms (link_id, form_id, created_at) VALUES ($1, $2, NOW()) RETURNING id',
      [8, 1]
    );
    
    if (result.rowCount > 0) {
      console.log(`Association créée avec succès! ID: ${result.rows[0].id}`);
    } else {
      console.log('Aucune ligne insérée');
    }
    
    // Réinitialiser le search_path
    await client.query('SET search_path TO public');
    
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    client.release();
    pool.end();
  }
}

// Exécuter la fonction
createAssociation(); 