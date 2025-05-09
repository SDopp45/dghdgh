import path from 'path';
import fs from 'fs';
import logger from './logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Constantes pour les chemins de fichiers
 */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Sous-répertoires standards pour chaque client
 */
export const CLIENT_SUBDIRECTORIES = [
  'properties',
  'documents',
  'visit-reports',
  'contracts',
  'profiles',
  'temp',
  'backgrounds',
  'link-icons',
  'link-images',
  'logos',
  'tenant-history',
  'pdf-logos'
];

/**
 * Obtient l'identifiant du schéma client à partir de l'ID utilisateur
 * @param userId ID de l'utilisateur
 * @returns Le nom du schéma client (client_X)
 */
export function getClientSchemaName(userId: string | number): string {
  return `client_${userId}`;
}

/**
 * Obtient le chemin du dossier racine pour un client spécifique
 * @param userId ID de l'utilisateur
 * @returns Le chemin du dossier client
 */
export function getClientDirectory(userId: string | number): string {
  const clientSchema = getClientSchemaName(userId);
  const clientDir = path.resolve(UPLOAD_DIR, clientSchema);
  
  // Créer le répertoire s'il n'existe pas
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
    logger.info(`Created client directory: ${clientDir}`);
  }
  
  return clientDir;
}

/**
 * S'assure que tous les sous-répertoires nécessaires pour un client existent
 * @param userId ID de l'utilisateur
 * @returns Le chemin du dossier client racine
 */
export function ensureClientDirectories(userId: string | number): string {
  const clientDir = getClientDirectory(userId);
  
  // S'assurer que tous les sous-répertoires existent
  CLIENT_SUBDIRECTORIES.forEach(dir => {
    const fullPath = path.resolve(clientDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      logger.info(`Created client subdirectory: ${fullPath}`);
    }
  });
  
  return clientDir;
}

/**
 * Obtient le chemin complet d'un sous-répertoire pour un client spécifique
 * @param userId ID de l'utilisateur
 * @param subdirectory Le nom du sous-répertoire
 * @returns Le chemin complet du sous-répertoire
 */
export function getClientSubdirectory(userId: string | number, subdirectory: string): string {
  const clientDir = getClientDirectory(userId);
  const subDir = path.resolve(clientDir, subdirectory);
  
  // Créer le sous-répertoire s'il n'existe pas
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
    logger.info(`Created client subdirectory: ${subDir}`);
  }
  
  return subDir;
}

/**
 * Initialise la structure de base des dossiers uploads
 */
export function initializeUploadDirectories(): void {
  // S'assurer que le répertoire uploads principal existe
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    logger.info(`Created main uploads directory: ${UPLOAD_DIR}`);
  }
  
  // Créer les répertoires legacy pour la rétrocompatibilité
  const legacyDirectories = [
    'properties',
    'documents',
    'visit-reports',
    'contracts',
    'profile',
    'temp',
    'backgrounds',
    'link-icons',
    'link-images',
    'logos',
    'tenant-history',
    'pdf-logos'
  ];
  
  legacyDirectories.forEach(dir => {
    const fullPath = path.resolve(UPLOAD_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      logger.info(`Created legacy directory for compatibility: ${fullPath}`);
    }
  });
}

/**
 * Synchronise les dossiers clients avec les schémas existants dans la base de données
 * Crée tous les dossiers client_X qui correspondent aux schémas PostgreSQL
 */
export async function syncClientDirectoriesWithSchemas(): Promise<void> {
  try {
    logger.info('Synchronisation des dossiers clients avec les schémas SQL...');
    
    // Requête SQL pour obtenir tous les schémas client_X
    const result = await db.execute<{ schema_name: string }>(
      sql`SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'client_%'`
    );
    
    // Extraire les noms de schémas
    const clientSchemas = result.rows.map(row => row.schema_name);
    logger.info(`Schémas clients trouvés: ${clientSchemas.join(', ')}`);
    
    // Créer les dossiers correspondants
    for (const schema of clientSchemas) {
      const clientDir = path.resolve(UPLOAD_DIR, schema);
      
      // Assurer que le dossier client existe
      if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
        logger.info(`Création du dossier client pour le schéma existant: ${schema}`);
      }
      
      // Créer tous les sous-dossiers nécessaires
      CLIENT_SUBDIRECTORIES.forEach(subDir => {
        const fullPath = path.resolve(clientDir, subDir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          logger.info(`Création du sous-dossier ${subDir} pour le schéma ${schema}`);
        }
      });
    }
    
    logger.info('Synchronisation des dossiers clients terminée avec succès');
  } catch (error) {
    logger.error('Erreur lors de la synchronisation des dossiers clients:', error);
  }
} 