-- Création de la table des contrats
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rental', 'mandate', 'commercial', 'attestation', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'expired', 'terminated')),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  property_id INTEGER REFERENCES properties(id),
  document_id INTEGER REFERENCES documents(id),
  signature_required BOOLEAN DEFAULT TRUE,
  automated_renewal BOOLEAN DEFAULT FALSE,
  renewal_date TIMESTAMP,
  notification_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Création de la table des parties liées aux contrats
CREATE TABLE IF NOT EXISTS contract_parties (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  party_id INTEGER NOT NULL,
  party_type TEXT NOT NULL CHECK (party_type IN ('tenant', 'owner', 'manager', 'other')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Création d'index pour améliorer les performances des requêtes courantes
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_document_id ON contracts(document_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_parties_contract_id ON contract_parties(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_parties_party_id_type ON contract_parties(party_id, party_type);

-- Ajout de contrats d'exemple pour les tests
INSERT INTO contracts (name, type, status, start_date, end_date, property_id, signature_required, automated_renewal, created_at, updated_at)
VALUES 
  ('Bail d''habitation - Dupont', 'rental', 'active', '2023-01-01', '2024-01-01', 1, TRUE, TRUE, NOW(), NOW()),
  ('Mandat de gestion - Résidence Les Pins', 'mandate', 'active', '2023-03-15', NULL, 2, TRUE, FALSE, NOW(), NOW()),
  ('Bail commercial - Boutique Centre', 'commercial', 'pending_signature', '2023-05-01', '2032-04-30', 3, TRUE, FALSE, NOW(), NOW()),
  ('Attestation d''assurance', 'attestation', 'expired', '2022-06-01', '2023-06-01', NULL, FALSE, TRUE, NOW(), NOW()),
  ('Bail meublé - Studio', 'rental', 'draft', '2023-09-01', '2024-08-31', 4, TRUE, FALSE, NOW(), NOW());

-- Ajout des parties pour les contrats d'exemple
-- On utilisera des IDs fictifs qu'il faudra adapter à votre base de données réelle
INSERT INTO contract_parties (contract_id, party_id, party_type, created_at)
VALUES
  (1, 1, 'tenant', NOW()),
  (1, 2, 'owner', NOW()),
  (2, 3, 'owner', NOW()),
  (2, 4, 'manager', NOW()),
  (3, 5, 'tenant', NOW()),
  (3, 6, 'owner', NOW()),
  (4, 7, 'tenant', NOW()),
  (5, 8, 'tenant', NOW()),
  (5, 9, 'owner', NOW()); 