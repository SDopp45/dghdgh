import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { authenticateToken } from '../auth';
import logger from '../utils/logger';
import { db } from '../db';

const router = Router();

// Route de connexion
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: Error, user: any, info: any) => {
    if (err) {
      logger.error('Erreur lors de l\'authentification:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Une erreur est survenue lors de l\'authentification' 
      });
    }
    
    if (!user) {
      logger.warn(`Tentative de connexion échouée: ${info.message}`);
      return res.status(401).json({ 
        success: false, 
        message: info.message || 'Identifiants incorrects' 
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
      
      // Définir l'ID utilisateur dans le contexte PostgreSQL pour RLS
      try {
        const client = await db.$client;
        await client.query(`SELECT set_config('app.user_id', $1, false)`, [user.id.toString()]);
      } catch (error) {
        logger.warn('Erreur lors de la définition de l\'ID utilisateur pour RLS:', error);
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
  const username = req.user ? (req.user as any).username : 'unknown';
  
  req.logout((err) => {
    if (err) {
      logger.error('Erreur lors de la déconnexion:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Une erreur est survenue lors de la déconnexion' 
      });
    }
    
    // Réinitialiser l'ID utilisateur dans le contexte PostgreSQL
    try {
      db.$client.then(client => {
        client.query(`SELECT set_config('app.user_id', '0', false)`).then(() => {
          logger.info(`Utilisateur déconnecté: ${username}`);
        });
      });
    } catch (error) {
      logger.warn('Erreur lors de la réinitialisation de l\'ID utilisateur pour RLS:', error);
    }
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
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

export default router; 