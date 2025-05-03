import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import logger from './logger.js';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: '.env.local' });

const runMigration = async (migrationFilePath) => {
  // Vérifier si le fichier existe
  if (!fs.existsSync(migrationFilePath)) {
    logger.error(`Le fichier de migration ${migrationFilePath} n'existe pas.`);
    process.exit(1);
  }

  // Configuration de la connexion à la base de données
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error('La variable d\'environnement DATABASE_URL n\'est pas définie.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    // Lecture du fichier SQL
    const sql = fs.readFileSync(migrationFilePath, 'utf8');
    
    // Connexion à la base de données
    await client.connect();
    logger.info(`Connexion à la base de données établie.`);
    
    // Exécution de la migration
    logger.info(`Exécution de la migration ${path.basename(migrationFilePath)}...`);
    await client.query(sql);
    
    logger.info('Migration exécutée avec succès.');
  } catch (error) {
    logger.error('Erreur lors de l\'exécution de la migration:', error);
    process.exit(1);
  } finally {
    // Fermeture de la connexion
    await client.end();
  }
};

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

// Vérifier si un fichier de migration est spécifié en paramètre
if (args.length < 1) {
  logger.error('Veuillez spécifier le chemin du fichier de migration SQL.');
  console.log('Utilisation: node run-migration.js <chemin-du-fichier-sql>');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFilePath = path.resolve(process.cwd(), args[0]);
runMigration(migrationFilePath); 