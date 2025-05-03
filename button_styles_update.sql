-- Ajout de colonnes pour prendre en charge les styles de bouton avancés
ALTER TABLE link_profiles 
ADD COLUMN button_shadow_color VARCHAR(20) DEFAULT NULL,
ADD COLUMN button_shadow_intensity FLOAT DEFAULT 0.3,
ADD COLUMN button_glass_opacity FLOAT DEFAULT 0.1,
ADD COLUMN button_glass_blur INT DEFAULT 10,
ADD COLUMN button_neon_glow VARCHAR(20) DEFAULT NULL,
ADD COLUMN button_neon_intensity FLOAT DEFAULT 0.7,
ADD COLUMN button_border_style VARCHAR(20) DEFAULT 'solid',
ADD COLUMN button_border_width INT DEFAULT 1,
ADD COLUMN button_gradient_direction VARCHAR(20) DEFAULT 'to right',
ADD COLUMN button_gradient_start VARCHAR(20) DEFAULT NULL,
ADD COLUMN button_gradient_end VARCHAR(20) DEFAULT NULL,
ADD COLUMN button_hover_transform VARCHAR(50) DEFAULT 'scale(1.02)',
ADD COLUMN button_hover_transition VARCHAR(50) DEFAULT 'all 0.2s ease',
ADD COLUMN button_text_transform VARCHAR(20) DEFAULT NULL,
ADD COLUMN button_text_shadow VARCHAR(50) DEFAULT NULL;

-- Mise à jour de la colonne buttonStyle pour permettre plus de valeurs
-- Si nécessaire, vous pouvez convertir cette colonne en ENUM avec toutes les valeurs possibles
-- ALTER TABLE link_profiles MODIFY COLUMN button_style ENUM('rounded', 'square', 'pill', 'shadow', 'outline', 'gradient', 'glassmorphism', 'neon', 'brutalist') DEFAULT 'rounded';

-- Mise à jour des données existantes pour les styles spécifiques
-- Glassmorphism
UPDATE link_profiles 
SET button_glass_opacity = 0.1, 
    button_glass_blur = 10
WHERE button_style = 'glassmorphism';

-- Neon
UPDATE link_profiles 
SET button_neon_glow = accent_color, 
    button_neon_intensity = 0.7,
    button_text_shadow = CONCAT('0 0 5px ', accent_color)
WHERE button_style = 'neon';

-- Brutalist
UPDATE link_profiles 
SET button_border_width = 4,
    button_border_style = 'solid',
    button_hover_transform = 'translateY(-2px)'
WHERE button_style = 'brutalist';

-- Gradient
UPDATE link_profiles 
SET button_gradient_direction = 'to right',
    button_gradient_start = accent_color,
    button_gradient_end = CONCAT(accent_color, '90')
WHERE button_style = 'gradient'; 