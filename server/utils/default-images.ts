import fs from 'fs';
import path from 'path';
import logger from './logger';

// Les types de propriétés disponibles et leurs labels
export const propertyTypeLabels = {
  apartment: "Appartement",
  house: "Maison",
  commercial: "Commercial",
  parking: "Parking",
  garage: "Garage",
  land: "Terrain",
  office: "Bureau",
  building: "Immeuble",
  storage: "Stockage"
} as const;

// Les fichiers d'images par défaut pour chaque type
const defaultImageMappings: Record<string, string> = {
  apartment: 'apartment-default.jpg',
  house: 'house-default.jpg',
  commercial: 'commercial-default.jpg',
  parking: 'parking-default.jpg',
  garage: 'garage-default.jpg',
  land: 'land-default.jpg',
  office: 'office-default.jpg',
  building: 'building-default.jpg',
  storage: 'storage-default.jpg'
};

/**
 * Vérifie si les images par défaut existent déjà dans le dossier des uploads.
 * Si non, les copie depuis le dossier public des images par défaut.
 */
export const setupDefaultImages = () => {
  const uploadDir = path.join(process.cwd(), 'uploads', 'properties');
  const defaultImagesDir = path.join(process.cwd(), 'public', 'images', 'property-types');
  
  logger.info(`Initialisation des images par défaut`);
  logger.info(`Dossier source: ${defaultImagesDir}`);
  logger.info(`Dossier destination: ${uploadDir}`);
  
  // Créer le dossier d'uploads s'il n'existe pas
  if (!fs.existsSync(uploadDir)) {
    logger.info(`Création du dossier de destination: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Vérifie si le dossier des images par défaut existe
  if (!fs.existsSync(defaultImagesDir)) {
    logger.warn(`Le dossier des images par défaut n'existe pas: ${defaultImagesDir}`);
    
    // Tenter de créer le dossier
    try {
      fs.mkdirSync(defaultImagesDir, { recursive: true });
      logger.info(`Dossier des images par défaut créé: ${defaultImagesDir}`);
    } catch (error) {
      logger.error(`Erreur lors de la création du dossier des images par défaut:`, error);
    }
    return;
  }
  
  try {
    // Lister les fichiers dans le dossier source pour déboguer
    const sourceFiles = fs.readdirSync(defaultImagesDir);
    logger.info(`Fichiers trouvés dans le dossier source: ${sourceFiles.join(', ') || 'aucun'}`);
  } catch (error) {
    logger.error(`Erreur lors de la lecture du dossier source:`, error);
  }
  
  // Pour chaque type de propriété, vérifie que l'image existe dans le dossier des uploads
  Object.entries(defaultImageMappings).forEach(([type, filename]) => {
    const sourcePath = path.join(defaultImagesDir, filename);
    const destPath = path.join(uploadDir, filename);
    
    logger.info(`Vérification de l'image pour le type ${type}: ${filename}`);
    logger.info(`Source: ${sourcePath} (existe: ${fs.existsSync(sourcePath)})`);
    logger.info(`Destination: ${destPath} (existe: ${fs.existsSync(destPath)})`);
    
    // Si l'image par défaut n'existe pas déjà dans le dossier des uploads, la copier
    if (!fs.existsSync(destPath) && fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        logger.info(`Image par défaut copiée pour le type ${type}: ${destPath}`);
      } catch (error) {
        logger.error(`Erreur lors de la copie de l'image par défaut pour le type ${type}:`, error);
      }
    } else if (!fs.existsSync(sourcePath)) {
      logger.warn(`L'image source pour le type ${type} n'existe pas: ${sourcePath}`);
    } else {
      logger.info(`L'image pour le type ${type} existe déjà dans la destination: ${destPath}`);
    }
  });
  
  // Vérification finale
  try {
    const destFiles = fs.readdirSync(uploadDir);
    logger.info(`Fichiers dans le dossier destination après traitement: ${destFiles.join(', ') || 'aucun'}`);
  } catch (error) {
    logger.error(`Erreur lors de la lecture du dossier destination:`, error);
  }
};

/**
 * Récupère le nom du fichier de l'image par défaut pour un type de propriété donné.
 * @param propertyType Le type de propriété
 * @returns Le nom du fichier de l'image par défaut, ou null si le type n'est pas valide
 */
export const getDefaultImageForType = (propertyType: string): string | null => {
  // Vérifie si le type de propriété est valide
  if (!defaultImageMappings[propertyType]) {
    logger.warn(`Type de propriété non reconnu pour l'image par défaut: ${propertyType}`);
    return null;
  }
  
  // Récupère le nom de fichier associé au type
  const filename = defaultImageMappings[propertyType];
  const imagePath = path.join(process.cwd(), 'uploads', 'properties', filename);
  
  // Vérifie si l'image existe
  if (!fs.existsSync(imagePath)) {
    logger.warn(`L'image par défaut n'existe pas physiquement: ${imagePath}, mais on retourne quand même le nom du fichier`);
  }
  
  // Retourne le nom du fichier même si l'image n'existe pas physiquement
  return filename;
};

/**
 * Crée une entrée d'image par défaut pour une propriété.
 * @param propertyType Le type de propriété
 * @returns Un objet représentant l'image par défaut, ou null si le type n'est pas valide
 */
export const createDefaultImageEntry = (propertyType: string): { id: number, filename: string, order: number } | null => {
  // Vérifie si le type de propriété est valide
  if (!defaultImageMappings[propertyType]) {
    logger.warn(`Type de propriété non reconnu pour l'image par défaut: ${propertyType}`);
    return null;
  }
  
  // Récupère le nom de fichier, même si l'image n'existe pas physiquement
  const filename = defaultImageMappings[propertyType];
  const imagePath = path.join(process.cwd(), 'uploads', 'properties', filename);
  
  // Vérifier si l'image existe
  if (!fs.existsSync(imagePath)) {
    logger.warn(`L'image par défaut n'existe pas physiquement: ${imagePath}, mais on utilise quand même le nom du fichier`);
  } else {
    logger.info(`Utilisation de l'image par défaut pour le type ${propertyType}: ${filename}`);
  }
  
  // Retourner l'entrée même si l'image n'existe pas pour ne pas bloquer la création de propriété
  return {
    id: Date.now(),
    filename,
    order: 0
  };
}; 