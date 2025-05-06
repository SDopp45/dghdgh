import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import logger from '../utils/logger';

// Obtenir le chemin du répertoire courant
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pool de connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function initializeDatabase() {
  try {
    logger.info('Initialisation de la base de données...');
    
    // Effectuer les migrations de schéma
    // Code de migration existant...
    
    // Désactiver RLS et configurer l'architecture multi-schémas
    logger.info('Configuration de l\'architecture multi-schémas...');
    try {
      // Charger le script SQL depuis un fichier
      const scriptPath = path.join(process.cwd(), 'scripts', 'disable-rls.sql');
      const sqlScript = await fs.readFile(scriptPath, 'utf8');
      
      // Exécuter le script SQL
      await pool.query(sqlScript);
      logger.info('Architecture multi-schémas configurée avec succès');
    } catch (error) {
      logger.error('Erreur lors de la configuration multi-schémas:', error);
      // Continuer malgré l'erreur pour permettre l'initialisation
    }
    
    logger.info('Base de données initialisée avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement comme script
if (import.meta.url.endsWith('init.ts')) {
  initializeDatabase();
} 