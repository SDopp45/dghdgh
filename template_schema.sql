-- Script SQL pour le schéma template

-- 1. Créer une nouvelle table pour stocker les informations des locataires
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'template' AND table_name = 'tenants_info') THEN
    CREATE TABLE template.tenants_info (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT,
      phone_number TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  END IF;
END $$;

-- 2. Modifier la table tenants pour référencer tenants_info
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'template' AND table_name = 'tenants' AND column_name = 'tenant_info_id') THEN
    ALTER TABLE template.tenants ADD COLUMN tenant_info_id INTEGER;
    
    -- Ajouter une contrainte de clé étrangère
    ALTER TABLE template.tenants
      ADD CONSTRAINT tenants_tenant_info_fkey 
      FOREIGN KEY (tenant_info_id) 
      REFERENCES template.tenants_info(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Rendre user_id optionnel
DO $$
BEGIN
  -- Vérifier si la colonne user_id est NOT NULL
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'template' 
    AND table_name = 'tenants' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE template.tenants ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Créer la table tenant_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'template' AND table_name = 'tenant_history') THEN
    CREATE TABLE template.tenant_history (
      id SERIAL PRIMARY KEY,
      rating INTEGER NOT NULL,
      feedback TEXT,
      category TEXT DEFAULT 'general',
      tenant_full_name TEXT,
      original_user_id INTEGER,
      event_type TEXT DEFAULT 'evaluation',
      event_severity INTEGER DEFAULT 0,
      event_details JSONB,
      documents TEXT[],
      bail_status TEXT,
      bail_id INTEGER,
      property_name TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      created_by INTEGER,
      tenant_id INTEGER,
      is_orphaned BOOLEAN DEFAULT FALSE,
      tenant_info_id INTEGER
    );
  ELSE
    -- Si la table existe mais que la colonne tenant_info_id n'existe pas, l'ajouter
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'template' AND table_name = 'tenant_history' AND column_name = 'tenant_info_id') THEN
      ALTER TABLE template.tenant_history ADD COLUMN tenant_info_id INTEGER;
    END IF;
  END IF;
  
  -- Vérifier si la contrainte de clé étrangère existe avant de l'ajouter
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints 
                WHERE constraint_schema = 'template' AND table_name = 'tenant_history' 
                AND constraint_name = 'tenant_history_tenant_info_fkey') THEN
    ALTER TABLE template.tenant_history
      ADD CONSTRAINT tenant_history_tenant_info_fkey
      FOREIGN KEY (tenant_info_id)
      REFERENCES template.tenants_info(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Modifier la table feedbacks
DO $$
BEGIN
  -- Vérifier si la colonne tenant_info_id existe dans la table feedbacks
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_schema = 'template' AND table_name = 'feedbacks' AND column_name = 'tenant_info_id') THEN
    ALTER TABLE template.feedbacks ADD COLUMN tenant_info_id INTEGER;
    
    -- Ajouter une contrainte de clé étrangère
    ALTER TABLE template.feedbacks
      ADD CONSTRAINT feedbacks_tenant_info_fkey
      FOREIGN KEY (tenant_info_id)
      REFERENCES template.tenants_info(id)
      ON DELETE SET NULL;
  END IF;
END $$; 