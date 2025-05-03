-- Mise à jour des statuts de transaction existants
UPDATE transactions 
SET status = 'pending' 
WHERE status = 'pending';

UPDATE transactions 
SET status = 'completed' 
WHERE status = 'completed';

UPDATE transactions 
SET status = 'cancelled' 
WHERE status = 'cancelled';

UPDATE transactions 
SET status = 'failed' 
WHERE status = 'failed';

UPDATE transactions 
SET status = 'archived' 
WHERE status = 'archived';

UPDATE transactions 
SET status = 'deleted' 
WHERE status = 'deleted';

-- Vérification qu'il n'y a pas de statuts invalides
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM transactions 
    WHERE status NOT IN ('pending', 'completed', 'cancelled', 'failed', 'archived', 'deleted')
  ) THEN
    RAISE EXCEPTION 'Des statuts de transaction invalides ont été trouvés';
  END IF;
END $$; 