-- Script de mise à jour pour l'assistant IA et le sélecteur de modèle

-- 1. Ajouter la colonne preferred_ai_model si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_ai_model TEXT DEFAULT 'openai-gpt-3.5';

-- 2. Ajouter les colonnes requestCount et requestLimit si elles n'existent pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_limit INTEGER DEFAULT 100;

-- 3. Mettre à jour tous les utilisateurs pour avoir un modèle par défaut
UPDATE users SET preferred_ai_model = 'openai-gpt-3.5' WHERE preferred_ai_model IS NULL;

-- 4. Vérifier et créer les tables AI si elles n'existent pas
-- Table ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  category TEXT DEFAULT 'general' NOT NULL,
  context JSONB DEFAULT '{}'::jsonb
);

-- Table ai_messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  conversation_id INTEGER REFERENCES ai_conversations(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_urgent BOOLEAN DEFAULT false
);

-- Table ai_suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  property_id INTEGER REFERENCES properties(id),
  type TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'pending'
);

-- 5. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_property_id ON ai_suggestions(property_id);
CREATE INDEX IF NOT EXISTS idx_users_preferred_ai_model ON users(preferred_ai_model); 