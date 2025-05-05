import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

// Fonction pour normaliser les propriétés de stockage utilisateur
function normalizeUser(user: any) {
  if (!user) return null;
  
  // Créer un nouvel objet pour éviter les références directes
  const normalizedUser = { ...user };
  
  // Normaliser les propriétés de stockage (gérer à la fois camelCase et snake_case)
  normalizedUser.storageUsed = (user.storage_used || user.storageUsed || '0').toString();
  normalizedUser.storageLimit = (user.storage_limit || user.storageLimit || '5368709120').toString(); // 5GB par défaut
  normalizedUser.storageTier = user.storage_tier || user.storageTier || 'basic';
  
  return normalizedUser;
}

// Configuration de la stratégie d'authentification locale
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      // En développement, utiliser un utilisateur de test
      if (process.env.NODE_ENV === 'development') {
        logger.info('Mode développement: authentification avec utilisateur test');
        return done(null, {
          id: 1,
          username: 'testuser',
          fullName: 'Test User',
          role: 'manager',
          email: 'test@example.com',
          storageUsed: '0',
          storageLimit: '5368709120',
          storageTier: 'basic'
        });
      }
      
      // En production, vérifier les identifiants dans la base de données
      const result = await db.select().from(users).where(eq(users.username, username));
      
      if (result.length === 0) {
        logger.warn(`Tentative d'authentification avec un nom d'utilisateur inexistant: ${username}`);
        return done(null, false, { message: 'Nom d\'utilisateur ou mot de passe incorrect' });
      }
      
      const user = result[0];
      
      // Vérifier le mot de passe (en production, utilisez bcrypt pour comparer)
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        logger.warn(`Mot de passe incorrect pour l'utilisateur: ${username}`);
        return done(null, false, { message: 'Nom d\'utilisateur ou mot de passe incorrect' });
      }
      
      logger.info(`Authentification réussie pour l'utilisateur: ${username}`);
      return done(null, normalizeUser(user));
    } catch (error) {
      logger.error('Erreur lors de l\'authentification:', error);
      return done(error);
    }
  }
));

// Sérialisation de l'utilisateur pour la session
passport.serializeUser((user: any, done) => {
  logger.debug(`Sérialisation de l'utilisateur: ${user.id}`);
  done(null, user.id);
});

// Désérialisation de l'utilisateur depuis la session
passport.deserializeUser(async (id: number, done) => {
  try {
    // En développement, utiliser un utilisateur de test
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Mode développement: désérialisation avec utilisateur test');
      return done(null, {
        id: 1,
        username: 'testuser',
        fullName: 'Test User',
        role: 'manager',
        email: 'test@example.com',
        storageUsed: '0',
        storageLimit: '5368709120',
        storageTier: 'basic'
      });
    }
    
    // En production, récupérer l'utilisateur depuis la base de données
    const result = await db.select().from(users).where(eq(users.id, id));
    
    if (result.length === 0) {
      logger.warn(`Tentative de désérialisation d'un utilisateur inexistant: ${id}`);
      return done(null, false);
    }
    
    logger.debug(`Désérialisation réussie pour l'utilisateur: ${id}`);
    done(null, normalizeUser(result[0]));
  } catch (error) {
    logger.error('Erreur lors de la désérialisation:', error);
    done(error);
  }
});

export default passport; 