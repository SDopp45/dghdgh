import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import logger from './logger';

// Pool PostgreSQL partagé
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20
});

// Cache des clients Drizzle par schéma
const clientCache: Record<string, any> = {};

/**
 * Obtient une instance Drizzle configurée pour un schéma client spécifique
 * 
 * @param schema Nom du schéma client (ex: 'client_109')
 * @returns Instance Drizzle configurée pour le schéma spécifié
 */
export const getClientDb = (schema: string) => {
  if (!schema.startsWith('client_')) {
    schema = `client_${schema}`;
  }
  
  // Vérifier si l'instance existe déjà dans le cache
  if (clientCache[schema]) {
    return clientCache[schema];
  }
  
  // Créer une nouvelle instance
  const db = drizzle(pool);
  
  // Fonction pour exécuter des requêtes dans le contexte du schéma client
  const executeInSchema = async <T>(query: any): Promise<T> => {
    try {
      // Définir le schéma pour cette session
      await db.execute(sql`SET search_path TO ${sql.identifier(schema)}, public`);
      
      // Exécuter la requête
      const result = await db.execute(query);
      
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
      
      return result as T;
    } catch (error) {
      // Réinitialiser le search_path même en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(() => {});
      
      logger.error(`Erreur lors de l'exécution de la requête dans le schéma ${schema}:`, error);
      throw error;
    }
  };
  
  // Fonction execute standard pour assurer la compatibilité avec les fonctions existantes
  // mais toujours en utilisant le schéma correct
  const execute = async <T>(query: any): Promise<T> => {
    try {
      // Définir le schéma pour cette session
      await db.execute(sql`SET search_path TO ${sql.identifier(schema)}, public`);
      
      // Exécuter la requête
      const result = await db.execute(query);
      
      return result as T;
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de la requête standard dans le schéma ${schema}:`, error);
      throw error;
    }
  };
  
  // Instance étendue avec executeInSchema et execute compatible
  const clientDb = {
    ...db,
    executeInSchema,
    execute,  // Ajoute la méthode execute pour la compatibilité
    schema
  };
  
  // Mettre en cache l'instance
  clientCache[schema] = clientDb;
  
  return clientDb;
};

/**
 * Obtient une instance Drizzle pour le contexte actuel
 * 
 * @param req Requête Express (si disponible)
 * @returns Instance Drizzle
 */
export const getContextDb = (req?: any) => {
  // Si une requête est fournie, essayer d'extraire l'ID client
  if (req) {
    // Option 1: Extraire de l'en-tête X-Client-ID
    const clientId = req.headers['x-client-id'];
    if (clientId) {
      return getClientDb(`client_${clientId}`);
    }
    
    // Option 2: Extraire de l'utilisateur connecté
    const userId = req.user?.id;
    if (userId) {
      return getClientDb(`client_${userId}`);
    }
  }
  
  // Fallback sur la base de données partagée
  return drizzle(pool);
};

// Base de données partagée (pour les migrations, etc.)
export const db = drizzle(pool);

export default db; 