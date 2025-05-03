import fs from 'fs';
import path from 'path';
import { deleteFile } from './file-manager';
import logger from './logger';

const UPLOAD_ROOT = 'uploads';

async function cleanupImages() {
  try {
    logger.info('Starting image cleanup process');
    const files = await fs.promises.readdir(UPLOAD_ROOT);
    let deletedCount = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.jpg' || ext === '.webp') {
        const filePath = path.join(UPLOAD_ROOT, file);
        await deleteFile(filePath);
        deletedCount++;
        logger.info(`Deleted file: ${filePath}`);
      }
    }

    logger.info(`Cleanup completed. Deleted ${deletedCount} image files`);
    return deletedCount;
  } catch (error) {
    logger.error('Error during image cleanup:', error);
    throw error;
  }
}

// Exécuter le nettoyage
cleanupImages().catch(error => {
  logger.error('Failed to cleanup images:', error);
  process.exit(1);
});
