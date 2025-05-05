-- Correction du problème de sélection du modèle IA
-- Ce script SQL ajoute/vérifie les colonnes nécessaires pour faire fonctionner le sélecteur de modèle

-- 1. Vérifie et ajoute les colonnes manquantes dans la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_ai_model TEXT DEFAULT 'openai-gpt-3.5';
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_limit INTEGER DEFAULT 100;

-- 2. Mise à jour de tous les utilisateurs pour avoir une valeur par défaut
UPDATE users SET preferred_ai_model = 'openai-gpt-3.5' WHERE preferred_ai_model IS NULL;
UPDATE users SET request_count = 0 WHERE request_count IS NULL;
UPDATE users SET request_limit = 100 WHERE request_limit IS NULL; 