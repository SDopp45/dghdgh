import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import logger from '../utils/logger';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { loginUser, logoutUser, hashPassword, requireAuth } from '../auth';
import { setupUserEnvironment } from '../middleware/schema';
import { pool } from '../db';

const router = Router();

// Route de connexion
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur et mot de passe requis'
      });
    }
    
    // Utiliser la fonction loginUser qui configure aussi le schéma
    const result = await loginUser(username, password, req);
    
    if (!result.success) {
      logger.warn(`Tentative de connexion échouée pour ${username}`);
      return res.status(401).json({
        success: false,
        message: result.message || 'Nom d\'utilisateur ou mot de passe incorrect'
      });
    }
    
    // Configurer la session avec l'utilisateur authentifié
    req.session.save((err) => {
      if (err) {
        logger.error(`Erreur lors de la sauvegarde de la session: ${err}`);
      }
      logger.info(`Utilisateur connecté: ${username} (ID: ${result.user.id})`);
    });
    
    // Réponse JSON après authentification réussie
    return res.json({
      success: true,
      user: result.user
    });
  } catch (error) {
    logger.error('Erreur lors de l\'authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de l\'authentification'
    });
  }
});

// Route de déconnexion
router.post('/logout', (req: Request, res: Response) => {
  const username = (req.user as any)?.username;
  
  try {
    // Utiliser la nouvelle fonction logoutUser
    logoutUser(req);
    
    logger.info(`Utilisateur déconnecté: ${username || 'Anonyme'}`);
    res.json({ success: true, message: 'Déconnexion réussie' });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la déconnexion' 
    });
  }
});

// Route pour vérifier l'état de l'authentification
router.get('/check', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    const user = req.user;
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
    
    // Hasher le mot de passe
    const passwordHash = await hashPassword(password);
    
    // Création du nouvel utilisateur
    const result = await db.insert(users).values({
      username,
      password: passwordHash,
      email,
      fullName,
      role: 'clients', // Attribuer le rôle clients à tous les utilisateurs
      storageUsed: 0,
      storageLimit: 1073741824, // 1 GB par défaut
      storageTier: 'basic',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning({ id: users.id });
    
    if (result.length > 0) {
      const userId = result[0].id;
      
      // Créer le schéma pour ce nouvel utilisateur
      try {
        // Créer directement le schéma pour cet utilisateur
        await db.execute(`CREATE SCHEMA IF NOT EXISTS client_${userId}`);
        logger.info(`Schéma client_${userId} créé pour l'utilisateur ${username}`);
      } catch (schemaError) {
        logger.error(`Erreur lors de la création du schéma pour l'utilisateur ${username}:`, schemaError);
        // Continuer malgré l'erreur de schéma
      }
    }
    
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

// Route de diagnostic pour vérifier la configuration des schémas (réservée au développement)
if (process.env.NODE_ENV === 'development') {
  router.get('/diagnostic', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      
      // Vérifier la session utilisateur
      const sessionInfo = {
        isAuthenticated: req.isAuthenticated?.() || false,
        user: user ? { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        } : null,
        sessionID: req.sessionID
      };
      
      // Vérifier la configuration du schéma actuel
      let schemaInfo;
      try {
        const schemaResult = await pool.query('SHOW search_path');
        schemaInfo = {
          currentSearchPath: schemaResult.rows[0].search_path,
          status: 'ok'
        };
      } catch (error) {
        schemaInfo = {
          status: 'error',
          error: error.message || 'Erreur inconnue'
        };
      }
      
      // Essayer de reconfigurer le schéma si un utilisateur est connecté
      let reconfigureResult = { success: false, message: 'Non tenté (pas d\'utilisateur)' };
      if (user?.id) {
        try {
          const success = await setupUserEnvironment(user.id);
          reconfigureResult = { 
            success, 
            message: success ? 'Schéma reconfiguré avec succès' : 'Échec de la reconfiguration'
          };
        } catch (error) {
          reconfigureResult = { 
            success: false, 
            message: `Erreur: ${error.message || 'Erreur inconnue'}` 
          };
        }
      }
      
      res.json({
        sessionInfo,
        schemaInfo,
        reconfigureResult,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Erreur lors du diagnostic:', error);
      res.status(500).json({ 
        error: 'Erreur lors du diagnostic', 
        message: error.message || 'Erreur inconnue' 
      });
    }
  });
}

export default router; 