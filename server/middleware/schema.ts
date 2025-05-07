import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { setUserSchema, resetToPublicSchema, createClientSchema } from '../db/index';
import { pool } from '../db/index';

/**
 * Configure le schéma PostgreSQL en fonction de l'ID utilisateur
 */
export async function setSchemaForUser(userId: number | null) {
  if (!userId) {
    return resetToPublicSchema();
  }
  
  try {
    // Vérifier si le schéma existe
    const schemaExists = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)',
      [`client_${userId}`]
    );

    if (!schemaExists.rows[0].exists) {
      // Si le schéma n'existe pas, le créer
      await createClientSchema(userId);
    }

    // Définir le search_path pour inclure le schéma du client puis le schéma public
    await setUserSchema(userId);
    logger.debug(`Set search_path to client_${userId}, public`);
    return true;
  } catch (error) {
    logger.error(`Failed to set schema for user ${userId}:`, error);
    await resetToPublicSchema();
    return false;
  }
}

/**
 * Middleware pour configurer le schéma PostgreSQL en fonction de l'utilisateur connecté.
 * Ce middleware doit être placé APRÈS votre middleware d'authentification qui définit req.user.
 */
export const schemaMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any; 

    if (user && user.id) {
      await setUserSchema(user.id);
      // logger.debug(`Schéma configuré pour l'utilisateur ${user.id} via schemaMiddleware.`); // Décommenter pour debug si besoin
    } else {
      await resetToPublicSchema();
      // logger.debug('Aucun utilisateur connecté, schéma réinitialisé à public via schemaMiddleware.'); // Décommenter pour debug si besoin
    }
    next();
  } catch (error) {
    logger.error('Erreur dans schemaMiddleware lors de la configuration du schéma:', error);
    // En cas d'erreur critique, réinitialiser au schéma public avant de répondre.
    try {
      await resetToPublicSchema();
    } catch (resetError) {
      logger.error('Erreur lors de la tentative de réinitialisation du schéma après une erreur dans schemaMiddleware:', resetError);
    }
    res.status(500).json({ message: 'Erreur interne du serveur lors de la configuration de la session.' });
  }
};

/**
 * Middleware pour réinitialiser le schéma à public après que la requête a été traitée et la réponse envoyée.
 * Utile pour s'assurer que les connexions du pool retournent à un état par défaut pour la prochaine requête non liée.
 */
export const resetSchemaAfterHandler = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', async () => {
    try {
      // Nous réinitialisons systématiquement à public, car la prochaine requête 
      // (si elle nécessite un schéma spécifique) le reconfigurera via schemaMiddleware.
      // Cela évite de laisser une connexion du pool avec un search_path spécifique à un client.
      await resetToPublicSchema();
      // logger.debug('Schéma réinitialisé à public après la fin de la requête (res.on finish).'); // Décommenter pour debug si besoin
    } catch (error) {
      logger.error('Erreur lors de la réinitialisation du schéma après la fin de la requête (res.on finish):', error);
    }
  });
  next();
}; 