import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index';
import logger from '../utils/logger';

// Obtenir le chemin du répertoire courant
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initializeDatabase() {
  try {
    logger.info('Initialisation de la base de données...');
    
    // Effectuer les migrations de schéma
    // Code de migration existant...
    
    logger.info('Base de données initialisée avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === import.meta.main) {
  initializeDatabase();
} 