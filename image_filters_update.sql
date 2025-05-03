-- Ajout de colonnes pour les filtres d'image
ALTER TABLE link_profiles 
ADD COLUMN background_saturation INT DEFAULT 100,
ADD COLUMN background_hue_rotate INT DEFAULT 0,
ADD COLUMN background_sepia INT DEFAULT 0,
ADD COLUMN background_grayscale INT DEFAULT 0,
ADD COLUMN background_invert INT DEFAULT 0,
ADD COLUMN background_color_filter VARCHAR(20) DEFAULT NULL,
ADD COLUMN background_color_filter_opacity FLOAT DEFAULT 0.3;

-- Mise à jour des données existantes pour initialiser les valeurs par défaut
UPDATE link_profiles 
SET 
  background_saturation = 100,
  background_hue_rotate = 0,
  background_sepia = 0,
  background_grayscale = 0,
  background_invert = 0,
  background_color_filter_opacity = 0.3
WHERE background_image IS NOT NULL; 