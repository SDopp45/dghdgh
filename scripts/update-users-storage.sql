-- Script pour mettre à jour la table users en l'adaptant à la nouvelle architecture de stockage

-- 1. D'abord, examiner les colonnes actuelles liées au stockage dans la table users
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'users'
-- AND column_name IN ('storage_used', 'storage_limit', 'storage_tier');

-- 2. Ajouter une colonne pour référencer le plan de stockage
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS storage_plan_id INTEGER REFERENCES public.storage_plans(id);

-- 3. Mettre à jour le plan de stockage pour les utilisateurs existants
-- Par défaut, attribuer le plan 'Gratuit' (ID=1) aux utilisateurs normaux
-- et le plan 'Professionnel' (ID=3) aux administrateurs
UPDATE public.users SET storage_plan_id = 
    CASE 
        WHEN role = 'admin' THEN 3  -- Professionnel pour les admin
        ELSE 1                      -- Gratuit pour les autres
    END
WHERE storage_plan_id IS NULL;

-- 4. Migrer les données des anciennes colonnes vers la nouvelle structure
-- Créer une entrée dans la table storage_usage pour chaque utilisateur ayant utilisé du stockage
INSERT INTO template.storage_usage (
    resource_type,
    resource_id,
    filename,
    file_path,
    file_type,
    size_bytes,
    created_at
)
SELECT 
    'user_storage',    -- Type générique pour la migration initiale
    id,                -- ID de l'utilisateur comme resource_id
    'migrated_data',   -- Nom de fichier générique pour la migration
    '',                -- Chemin de fichier vide pour la migration
    'application/octet-stream', -- Type MIME générique
    COALESCE(NULLIF(storage_used, ''), '0')::BIGINT, -- Conversion de storage_used en BIGINT
    NOW()              -- Date actuelle pour created_at
FROM public.users
WHERE storage_used IS NOT NULL AND storage_used != '0';

-- 5. Supprimer les anciennes colonnes liées au stockage
-- ALTER TABLE public.users DROP COLUMN IF EXISTS storage_used;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS storage_limit;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS storage_tier;

-- Note: Les commandes de suppression sont commentées pour sécurité
-- Décommenter seulement après avoir vérifié que la migration s'est bien passée 