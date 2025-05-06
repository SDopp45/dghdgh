import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import logger from '../utils/logger';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { loginUser, logoutUser, hashPassword } from '../auth';

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
    
    // Utiliser la nouvelle fonction loginUser
    const result = await loginUser(username, password, req);
    
    if (!result.success) {
      logger.warn(`Tentative de connexion échouée pour ${username}`);
      return res.status(401).json({
        success: false,
        message: result.message || 'Nom d\'utilisateur ou mot de passe incorrect'
      });
    }
    
    logger.info(`Utilisateur connecté: ${username} (ID: ${result.user.id})`);
    
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
    await db.insert(users).values([{
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
    }]);
    
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