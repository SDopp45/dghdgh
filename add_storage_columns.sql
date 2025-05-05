-- Ajouter les colonnes de stockage si elles n'existent pas
DO $$
BEGIN
    -- Vérifier et ajouter la colonne storage_used
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'storage_used') THEN
        ALTER TABLE users ADD COLUMN storage_used DECIMAL(20, 2) DEFAULT 0;
        RAISE NOTICE 'Colonne storage_used ajoutée à la table users';
    ELSE
        RAISE NOTICE 'La colonne storage_used existe déjà dans la table users';
    END IF;

    -- Vérifier et ajouter la colonne storage_limit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'storage_limit') THEN
        ALTER TABLE users ADD COLUMN storage_limit DECIMAL(20, 2) DEFAULT 5368709120; -- 5GB en octets
        RAISE NOTICE 'Colonne storage_limit ajoutée à la table users';
    ELSE
        RAISE NOTICE 'La colonne storage_limit existe déjà dans la table users';
    END IF;

    -- Vérifier et ajouter la colonne storage_tier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'storage_tier') THEN
        ALTER TABLE users ADD COLUMN storage_tier VARCHAR(10) DEFAULT 'basic';
        RAISE NOTICE 'Colonne storage_tier ajoutée à la table users';
    ELSE
        RAISE NOTICE 'La colonne storage_tier existe déjà dans la table users';
    END IF;

    -- Vérifier si la table storage_transactions existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_transactions') THEN
        -- Créer la table storage_transactions
        CREATE TABLE storage_transactions (
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
        );
        RAISE NOTICE 'Table storage_transactions créée';
    ELSE
        RAISE NOTICE 'La table storage_transactions existe déjà';
    END IF;
END $$; 