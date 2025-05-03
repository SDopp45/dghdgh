import fs from 'fs';
import path from 'path';
import logger from './logger';

const UPLOAD_ROOT = 'uploads';
const TEMP_DIR = path.join(UPLOAD_ROOT, 'temp');
const DOCUMENTS_DIR = path.join(UPLOAD_ROOT, 'documents');
const TEMPLATES_DIR = path.join(UPLOAD_ROOT, 'templates');
const THUMBNAILS_DIR = path.join(UPLOAD_ROOT, 'thumbnails');
const IMAGES_DIR = path.join(UPLOAD_ROOT, 'images');

// Temps maximum de conservation des fichiers
const MAX_TEMP_AGE = 24 * 60 * 60 * 1000; // 24h pour les fichiers temporaires
const MAX_AI_IMAGE_AGE = 2 * 60 * 60 * 1000; // 2h pour les images générées par l'IA

// Extensions de fichiers supportées
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf'];

// Pattern pour identifier les images générées par l'IA
const AI_IMAGE_PATTERN = /^styled-\d+\.webp$/;

export const ensureUploadDirectories = () => {
  const directories = [
    TEMP_DIR, 
    DOCUMENTS_DIR, 
    TEMPLATES_DIR, 
    THUMBNAILS_DIR,
    IMAGES_DIR
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

// Fonction pour nettoyer les images générées par l'IA
export const cleanAIGeneratedImages = async () => {
  try {
    logger.info('Starting AI generated images cleanup');
    const now = Date.now();
    let deletedCount = 0;

    // Parcourir tous les fichiers dans le dossier uploads
    const files = await fs.promises.readdir(UPLOAD_ROOT);

    for (const file of files) {
      if (AI_IMAGE_PATTERN.test(file)) {
        const filePath = path.join(UPLOAD_ROOT, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > MAX_AI_IMAGE_AGE) {
          await fs.promises.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted old AI generated image: ${file}`);
        }
      }
    }

    logger.info(`AI images cleanup completed. Deleted ${deletedCount} files`);
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning AI generated images:', error);
    throw error;
  }
};

export const cleanTempFiles = async () => {
  try {
    logger.info('Starting temporary files cleanup');
    const now = Date.now();

    const files = await fs.promises.readdir(TEMP_DIR);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtimeMs > MAX_TEMP_AGE) {
        await fs.promises.unlink(filePath);
        deletedCount++;
        logger.info(`Deleted old temporary file: ${file}`);
      }
    }

    // Nettoyer également les images IA
    await cleanAIGeneratedImages();

    logger.info(`Cleanup completed. Deleted ${deletedCount} files`);
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning temporary files:', error);
    throw error;
  }
};

export const moveToFinalLocation = async (
  tempPath: string,
  targetPath: string
): Promise<string> => {
  try {
    await fs.promises.rename(tempPath, targetPath);
    logger.info(`Moved file from ${tempPath} to ${targetPath}`);
    return targetPath;
  } catch (error) {
    logger.error(`Error moving file from ${tempPath} to ${targetPath}:`, error);
    throw error;
  }
};

export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found for deletion: ${filePath}`);
      return true;
    }

    const ext = path.extname(filePath).toLowerCase();
    const baseFilename = path.basename(filePath, ext);
    const isImage = SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
    const isDocument = SUPPORTED_DOCUMENT_EXTENSIONS.includes(ext);

    // Supprimer le fichier principal
    await fs.promises.unlink(filePath);
    logger.info(`Successfully deleted file: ${filePath}`);

    // Supprimer les thumbnails associés selon le type de fichier
    if (isImage) {
      const thumbnailPaths = [
        path.join(THUMBNAILS_DIR, `${baseFilename}-thumb${ext}`),
        path.join(THUMBNAILS_DIR, `${baseFilename}-small${ext}`),
        path.join(THUMBNAILS_DIR, `${baseFilename}-medium${ext}`)
      ];

      for (const thumbPath of thumbnailPaths) {
        if (fs.existsSync(thumbPath)) {
          await fs.promises.unlink(thumbPath);
          logger.info(`Deleted associated thumbnail: ${thumbPath}`);
        }
      }
    } else if (isDocument) {
      const thumbnailPath = path.join(
        THUMBNAILS_DIR,
        `${baseFilename}-thumb.pdf`
      );

      if (fs.existsSync(thumbnailPath)) {
        await fs.promises.unlink(thumbnailPath);
        logger.info(`Deleted associated thumbnail: ${thumbnailPath}`);
      }
    }

    return true;
  } catch (error) {
    logger.error(`Error deleting file: ${filePath}`, error);
    return false;
  }
};

export const checkOrphanedFiles = async (validFilePaths: string[]): Promise<string[]> => {
  try {
    const orphanedFiles: string[] = [];
    const directories = [
      DOCUMENTS_DIR, 
      TEMPLATES_DIR, 
      THUMBNAILS_DIR,
      IMAGES_DIR
    ];

    for (const dir of directories) {
      const files = await fs.promises.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        if (!validFilePaths.includes(filePath)) {
          orphanedFiles.push(filePath);
        }
      }
    }

    return orphanedFiles;
  } catch (error) {
    logger.error('Error checking for orphaned files:', error);
    throw error;
  }
};

export const cleanOrphanedFiles = async (validFilePaths: string[]): Promise<number> => {
  try {
    const orphanedFiles = await checkOrphanedFiles(validFilePaths);
    let deletedCount = 0;

    for (const filePath of orphanedFiles) {
      try {
        await fs.promises.unlink(filePath);
        deletedCount++;
        logger.info(`Deleted orphaned file: ${filePath}`);
      } catch (error) {
        logger.error(`Error deleting orphaned file ${filePath}:`, error);
      }
    }

    logger.info(`Orphaned files cleanup completed. Deleted ${deletedCount} files`);
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning orphaned files:', error);
    throw error;
  }
};