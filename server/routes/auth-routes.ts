import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { db } from '../db';
import logger from '../utils/logger';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { setClientSchema } from '../middleware/schema';

const router = Router();

// Route de connexion
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: Error, user: any, info: any) => {
    if (err) {
      logger.error('Erreur d\'authentification:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de l\'authentification' 
      });
    }
    
    if (!user) {
      logger.warn(`Tentative de connexion échouée pour ${req.body.username}`);
      return res.status(401).json({ 
        success: false, 
        message: info?.message || 'Nom d\'utilisateur ou mot de passe incorrect' 
      });
    }
    
    req.login(user, async (loginErr) => {
      if (loginErr) {
        logger.error('Erreur lors de l\'initialisation de la session:', loginErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Une erreur est survenue lors de l\'initialisation de la session' 
        });
      }
      
      logger.info(`Utilisateur connecté: ${user.username} (ID: ${user.id})`);
      
      // Application du middleware de schéma client
      try {
        await setClientSchema(req, res, () => {});
      } catch (error) {
        logger.warn('Erreur lors de la définition du schéma client:', error);
      }
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          storageUsed: user.storageUsed,
          storageLimit: user.storageLimit,
          storageTier: user.storageTier
        }
      });
    });
  })(req, res, next);
});

// Route de déconnexion
router.post('/logout', (req: Request, res: Response) => {
  const username = (req.user as any)?.username;
  req.logout((err) => {
    if (err) {
      logger.error('Erreur lors de la déconnexion:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
    }
    
    logger.info(`Utilisateur déconnecté: ${username || 'Anonyme'}`);
    res.json({ success: true, message: 'Déconnexion réussie' });
  });
});

// Route pour vérifier l'état de l'authentification
router.get('/check', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    logger.debug(`Vérification de session: utilisateur ${user.username} authentifié`);
    
    res.json({
      isAuthenticated: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        storageTier: user.storageTier
      }
    });
  } else {
    logger.debug('Vérification de session: aucun utilisateur authentifié');
    res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

// Route d'inscription (en option)
router.post('/register', async (req: Request, res: Response) => {
  // Cette route est une illustration - vous voudrez probablement la limiter en production
  try {
    const { username, password, email, fullName } = req.body;
    
    // Vérification si l'utilisateur existe déjà
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Un utilisateur avec ce nom d\'utilisateur existe déjà' 
      });
    }
    
    // Vérifier l'email
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (existingEmail) {
      return res.status(409).json({ 
        success: false, 
        message: 'Un utilisateur avec cet email existe déjà' 
      });
    }
    
    // Hasher le mot de passe (à implémenter avec votre fonction de hachage)
    const { hashPassword } = await import('../auth');
    const passwordHash = await hashPassword(password);
    
    // Création du nouvel utilisateur
    await db.insert(users).values({
      username,
      password: passwordHash,
      email,
      fullName,
      role: 'user', // Par défaut, attribuer un rôle standard
      storageUsed: 0,
      storageLimit: 1073741824, // 1 GB par défaut
      storageTier: 'basic',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    logger.info(`Nouvel utilisateur inscrit: ${username}`);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Inscription réussie' 
    });
    
  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue lors de l\'inscription' 
    });
  }
});

export default router; 