-- Mise à jour des catégories de transaction existantes
UPDATE transactions 
SET category = 'rent' 
WHERE category = 'rent';

UPDATE transactions 
SET category = 'maintenance' 
WHERE category = 'maintenance';

UPDATE transactions 
SET category = 'insurance' 
WHERE category = 'insurance';

UPDATE transactions 
SET category = 'tax' 
WHERE category = 'tax';

UPDATE transactions 
SET category = 'utility' 
WHERE category = 'utility';

UPDATE transactions 
SET category = 'other' 
WHERE category = 'other';

-- Vérification qu'il n'y a pas de catégories invalides
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM transactions 
    WHERE category NOT IN ('rent', 'maintenance', 'insurance', 'tax', 'utility', 'other')
  ) THEN
    RAISE EXCEPTION 'Des catégories de transaction invalides ont été trouvées';
  END IF;
END $$; 