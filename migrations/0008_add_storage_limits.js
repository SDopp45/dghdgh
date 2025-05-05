const { sql } = require('drizzle-orm');

/**
 * Migration pour ajouter les fonctionnalités de limitation du stockage utilisateur
 */
exports.up = async function(db) {
  console.log('Running migration: Add storage limits');

  // Ajouter les colonnes de stockage à la table users
  await db.run(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS storage_used DECIMAL(20, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS storage_limit DECIMAL(20, 2) DEFAULT 5368709120, -- 5GB en octets
    ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(10) DEFAULT 'basic'
  `);

  // Créer la table des transactions de stockage
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS storage_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      previous_tier VARCHAR(10) NOT NULL,
      new_tier VARCHAR(10) NOT NULL,
      amount_paid DECIMAL(10, 2) NOT NULL,
      transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expiration_date TIMESTAMP,
      payment_method VARCHAR(50),
      payment_reference VARCHAR(100),
      status VARCHAR(20) DEFAULT 'completed',
      notes TEXT
    )
  `);

  // Recalculer l'espace de stockage utilisé pour les utilisateurs existants
  await db.run(sql`
    WITH document_sizes AS (
      SELECT 
        user_id,
        COALESCE(SUM(pgstattuple.pg_relation_size('documents')::decimal / NULLIF(COUNT(*) OVER(), 0)::decimal), 0) as total_size
      FROM documents
      GROUP BY user_id
    )
    UPDATE users
    SET 
      storage_used = COALESCE(ds.total_size, 0),
      updated_at = CURRENT_TIMESTAMP
    FROM document_sizes ds
    WHERE users.id = ds.user_id
  `);

  console.log('Migration completed: Add storage limits');
};

/**
 * Migration pour annuler les changements
 */
exports.down = async function(db) {
  console.log('Running migration rollback: Remove storage limits');

  // Supprimer la table des transactions de stockage
  await db.run(sql`DROP TABLE IF EXISTS storage_transactions`);

  // Supprimer les colonnes de stockage de la table users
  await db.run(sql`
    ALTER TABLE users
    DROP COLUMN IF EXISTS storage_used,
    DROP COLUMN IF EXISTS storage_limit,
    DROP COLUMN IF EXISTS storage_tier
  `);

  console.log('Migration rollback completed: Remove storage limits');
}; 