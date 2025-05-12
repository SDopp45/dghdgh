import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import logger from '../utils/logger';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { loginUser, logoutUser, requireAuth, hashPassword, type LoginResult } from '../auth';
import { createClientSchema } from '../db/index';
import path from 'path';
import fs from 'fs';

const router = Router();

// Nouveau dossier spécifique pour les améliorations d'images
const ENHANCED_IMAGES_DIR = 'uploads/ameliorationimages';

// Fonction pour nettoyer les images d'un utilisateur
const cleanupUserImages = async (userId: number) => {
  try {
    const dir = path.join(process.cwd(), ENHANCED_IMAGES_DIR);
    const exists = await fs.promises.access(dir).then(() => true).catch(() => false);
    
    if (!exists) {
      return;
    }
    
    const files = await fs.promises.readdir(dir);
    let deletedCount = 0;
    
    // Supprimer toutes les images améliorées
    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        await fs.promises.unlink(filePath);
        deletedCount++;
        logger.info(`Image supprimée lors de la déconnexion: ${file}`);
      } catch (err) {
        logger.error(`Erreur lors de la suppression du fichier ${file}:`, err);
      }
    }
    
    logger.info(`Nettoyage des images terminé: ${deletedCount} fichier(s) supprimé(s)`);
  } catch (err) {
    logger.error('Erreur lors du nettoyage des images:', err);
  }
};

// Fonction interne pour configurer le schéma pour un utilisateur
async function setUserSchema(userId: number) {
  const clientSchema = `client_${userId}`;
  logger.info(`Configuration du schéma ${clientSchema} pour l'utilisateur ID ${userId}`);
  return await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
}

// Fonction pour réinitialiser le schéma à public
async function resetToPublicSchema() {
  return await db.execute(sql`SET search_path TO public`);
}

// Route pour la connexion
router.post('/login', async (req: Request, res: Response) => {
  try {
    logger.info(`Tentative de connexion pour l'utilisateur: ${req.body?.username || 'inconnu'}`);
    
    const { username, password } = req.body;

    if (!username || !password) {
      logger.warn(`Tentative de connexion avec des identifiants incomplets`);
      return res.status(400).json({ 
        success: false, 
        message: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }

    // Utiliser la fonction loginUser mise à jour qui ne nécessite plus la requête
    logger.info(`Vérification des identifiants pour l'utilisateur: ${username}`);
    const result = await loginUser(username, password);

    if (!result.success) {
      logger.warn(`Échec de connexion pour l'utilisateur: ${username} - ${result.message}`);
      return res.status(401).json(result);
    }

    // Si connexion réussie, créer la session
    logger.info(`Authentification réussie pour l'utilisateur: ${username}, création de la session...`);
    req.session.userId = result.userId;
    req.session.username = result.username;
    req.session.role = result.role;

    // Sauvegarder la session avant de continuer
    req.session.save((err) => {
      if (err) {
        logger.error(`Erreur lors de la sauvegarde de la session pour ${username}:`, err);
        return res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde de la session' });
      }

      logger.info(`Utilisateur ${username} connecté avec succès, ID: ${result.userId}`);
      
      try {
        // Essayer de configurer le schéma pour l'utilisateur
        setUserSchema(result.userId!).then(() => {
          logger.info(`Schéma configuré avec succès pour l'utilisateur ${username}`);
        }).catch(schemaErr => {
          logger.error(`Erreur lors de la configuration du schéma pour ${username}:`, schemaErr);
          // Ne pas bloquer la connexion si le schéma ne peut pas être configuré
        });

        // Renvoyer la réponse sans attendre la configuration du schéma
      res.json({
        success: true,
        user: {
          id: result.userId,
          username: result.username,
          role: result.role
        }
      });
      } catch (responseError) {
        logger.error(`Erreur lors de l'envoi de la réponse pour ${username}:`, responseError);
        // Essayer d'envoyer une réponse d'erreur si la réponse n'a pas encore été envoyée
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            message: 'Erreur interne du serveur' 
          });
        }
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    
    // S'assurer que la réponse est toujours envoyée, même en cas d'erreur
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Erreur serveur lors de la connexion',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
});

// Route pour la déconnexion
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // Récupérer l'ID utilisateur avant la déconnexion
    const userId = req.user?.id;
    
    const success = await logoutUser(req);
    
    if (!success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la déconnexion' 
      });
    }
    
    // Nettoyer les images de l'utilisateur si un ID est disponible
    if (userId) {
      await cleanupUserImages(userId);
    }
    
    // Réinitialiser le schéma à public avant de déconnecter
    await resetToPublicSchema();
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    // Essayer de réinitialiser le schéma même en cas d'erreur
    try {
      await resetToPublicSchema();
    } catch (schemaError) {
      logger.error('Erreur lors de la réinitialisation du schéma:', schemaError);
    }
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la déconnexion' });
  }
});

// Route pour l'inscription (création de compte)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, email, fullName } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    
    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce nom d\'utilisateur est déjà utilisé' 
      });
    }
    
    // Hasher le mot de passe avec la fonction mise à jour
    const hashedPassword = await hashPassword(password);
    
    // Insérer le nouvel utilisateur
    const role = 'clients'; // Par défaut, tous les nouveaux utilisateurs sont des clients
    const [newUser] = await db.insert(users).values({
      username,
      password: hashedPassword,
      email: email || null,
      fullName: fullName || null,
      role,
      createdAt: new Date()
    }).returning();
    
    if (!newUser) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la création du compte' 
      });
    }
    
    // Créer un schéma pour ce nouvel utilisateur avec la fonction standardisée
    await createClientSchema(newUser.id);
    
    // Créer automatiquement un profil de liens pour le nouvel utilisateur
    try {
      const clientSchema = `client_${newUser.id}`;
      // Définir le search_path pour ce client
      await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
      
      // Créer un slug à partir du nom d'utilisateur
      const slug = username.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Insérer le profil initial de liens
      await db.execute(sql`
        INSERT INTO link_profiles
        (user_id, slug, title, description, created_at, updated_at)
        VALUES
        (${newUser.id}, ${slug}, 'Mon Profil', 'Tous mes liens professionnels en un seul endroit', NOW(), NOW())
      `);
      
      logger.info(`Profil de liens initial créé pour l'utilisateur ${newUser.id} avec slug ${slug}`);
      
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    } catch (profileError) {
      logger.error(`Erreur lors de la création du profil de liens pour l'utilisateur ${newUser.id}:`, profileError);
      // Ne pas bloquer la création du compte si le profil de liens ne peut pas être créé
    }
    
    // Configurer la session pour le nouvel utilisateur
    req.session.userId = newUser.id;
    req.session.username = newUser.username;
    req.session.role = newUser.role || 'clients';
    
    req.session.save((err) => {
      if (err) {
        logger.error('Erreur lors de la sauvegarde de la session:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Compte créé mais erreur lors de la connexion automatique' 
        });
      }
      
      logger.info(`Nouvel utilisateur inscrit: ${username} (ID: ${newUser.id})`);
      
      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès',
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role
        }
      });
    });
  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'inscription' });
  }
});

// Route pour vérifier l'état de l'authentification
router.get('/check', (req: Request, res: Response) => {
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    const user = req.user;
    
    if (!user) {
      return res.json({
        isAuthenticated: false,
        user: null
      });
    }
    
    logger.debug(`Session active pour l'utilisateur: ${user.username} (ID: ${user.id})`);
    
    return res.json({
      isAuthenticated: true,
      user
    });
  } else {
    return res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

// Route protégée pour tester l'authentification
router.get('/profile', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
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
        const schemaResult = await db.execute(sql`SHOW search_path`);
        schemaInfo = {
          currentSearchPath: schemaResult.rows[0].search_path,
          status: 'ok'
        };
      } catch (error) {
        schemaInfo = {
          status: 'error',
          error: (error as Error).message || 'Erreur inconnue'
        };
      }
      
      // Essayer de reconfigurer le schéma si un utilisateur est connecté
      let reconfigureResult = { success: false, message: 'Non tenté (pas d\'utilisateur)' };
      if (user?.id) {
        try {
          await setUserSchema(user.id);
          reconfigureResult = { 
            success: true, 
            message: 'Schéma reconfiguré avec succès' 
          };
        } catch (error) {
          reconfigureResult = { 
            success: false, 
            message: `Erreur: ${(error as Error).message || 'Erreur inconnue'}` 
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
        message: (error as Error).message || 'Erreur inconnue' 
      });
    }
  });
}

// Route publique pour diagnostiquer les problèmes d'authentification
router.get('/system-check', async (req: Request, res: Response) => {
  try {
    // Vérifier l'état de la session
    const sessionInfo = {
      sessionID: req.sessionID,
      userId: req.session.userId,
      isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false,
      hasUser: req.user ? true : false,
      userInfo: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      } : null
    };
    
    // Vérifier les schémas et fonctions de la base de données
    let dbInfo = {};
    try {
      // Vérifier les fonctions de schéma
      const schemaFunctionsResult = await db.execute(sql`
        SELECT proname, pronamespace::regnamespace as schema
        FROM pg_proc 
        WHERE proname IN ('setup_user_environment', 'create_client_schema')
      `);
      
      // Vérifier la configuration de schéma actuelle
      const searchPathResult = await db.execute(sql`SHOW search_path`);
      
      // Vérifier les schémas existants
      const schemasResult = await db.execute(sql`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'client_%'
      `);
      
      dbInfo = {
        schemaFunctions: schemaFunctionsResult.rows,
        currentSearchPath: searchPathResult.rows[0]?.search_path,
        availableSchemas: schemasResult.rows.map(row => row.schema_name)
      };
    } catch (dbError) {
      dbInfo = { error: (dbError as Error).message };
    }
    
    // Renvoyer un diagnostic complet
    res.json({
      timestamp: new Date().toISOString(),
      session: sessionInfo,
      database: dbInfo,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'undefined'
      }
    });
  } catch (error) {
    logger.error('Erreur lors du diagnostic système:', error);
    res.status(500).json({
      error: 'Erreur lors du diagnostic',
      message: (error as Error).message
    });
  }
});

export default router; 