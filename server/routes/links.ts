import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { desc, eq, sql } from 'drizzle-orm';
import logger from '../utils/logger';
import { db } from '@db/index';
import { linkProfiles, links, users } from '@db/schema';
import { authenticateMiddleware } from '../middleware/auth';
import { getUserId } from '../middleware/auth';
import slugify from 'slugify';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { formSubmissions } from '../schema/links';
import { getClientSchemaName, getClientSubdirectory } from '../utils/storage-helpers';

const router = express.Router();

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = getUserId(req);
    
    if (userId) {
      // Utiliser le dossier spécifique au client pour les uploads de logos
      const clientSchema = getClientSchemaName(userId);
      const clientLogosDir = getClientSubdirectory(userId, 'logos');
      logger.info(`Upload de logo: utilisation du dossier client ${clientSchema}/logos`);
      cb(null, clientLogosDir);
    } else {
      // Fallback sur le répertoire legacy si pas d'utilisateur
      const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      logger.info('Upload de logo: utilisation du dossier legacy');
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id;
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-logo-${uniqueSuffix}${extension}`);
  }
});

// Define file filter to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non pris en charge. Seules les images sont autorisées.'));
  }
};

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: fileFilter
});

// Configure multer for background uploads
const backgroundStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = getUserId(req);
    
    if (userId) {
      // Utiliser le dossier spécifique au client pour les uploads d'arrière-plans
      const clientSchema = getClientSchemaName(userId);
      const clientBackgroundsDir = getClientSubdirectory(userId, 'backgrounds');
      logger.info(`Upload d'arrière-plan: utilisation du dossier client ${clientSchema}/backgrounds`);
      cb(null, clientBackgroundsDir);
    } else {
      // Fallback sur le répertoire legacy si pas d'utilisateur
      const uploadDir = path.join(process.cwd(), 'uploads', 'backgrounds');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      logger.info('Upload d\'arrière-plan: utilisation du dossier legacy');
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id;
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-background-${uniqueSuffix}${extension}`);
  }
});

const backgroundUpload = multer({
  storage: backgroundStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: fileFilter
});

// Configure multer for link icon uploads
const linkImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = getUserId(req);
    
    if (userId) {
      // Utiliser le dossier spécifique au client pour les uploads d'images de liens
      const clientSchema = getClientSchemaName(userId);
      const clientLinkImagesDir = getClientSubdirectory(userId, 'link-images');
      logger.info(`Upload d'image de lien: utilisation du dossier client ${clientSchema}/link-images`);
      cb(null, clientLinkImagesDir);
    } else {
      // Fallback sur le répertoire legacy si pas d'utilisateur
      const uploadDir = path.join(process.cwd(), 'uploads', 'link-images');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      logger.info('Upload d\'image de lien: utilisation du dossier legacy');
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id;
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-link-image-${uniqueSuffix}${extension}`);
  }
});

const linkImageUpload = multer({
  storage: linkImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size for images
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterErrors = (err: any, req: Request, res: Response, next: Function) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Le fichier est trop volumineux. La taille maximale est de 5 Mo'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Erreur lors de l\'upload du fichier'
    });
  } else if (err) {
    logger.error('Upload error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Erreur lors de l\'upload du fichier'
    });
  }
  next();
};

// Get the current user's link profile
router.get('/profile', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    try {
      // Check if the user already has a link profile
      const linkProfile = await db.query.linkProfiles.findFirst({
        where: eq(linkProfiles.userId, userId),
        with: {
          links: true
        }
      });
      
      if (!linkProfile) {
        // Create a default profile if none exists
        const userInfo = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            fullName: true
          }
        });
        
        const fullName = userInfo?.fullName || 'user';
        const slugBase = fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        // Generate a unique slug
        let slug = slugBase;
        let counter = 1;
        let slugExists = true;
        
        while (slugExists) {
          const existingProfile = await db.query.linkProfiles.findFirst({
            where: eq(linkProfiles.slug, slug)
          });
          
          if (!existingProfile) {
            slugExists = false;
          } else {
            slug = `${slugBase}-${counter}`;
            counter++;
          }
        }
        
        // Create a new profile
        const newProfile = await db.insert(linkProfiles).values({
          userId,
          slug,
          title: 'Mon Linktree',
          description: 'Tous mes liens professionnels en un seul endroit',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          accentColor: '#70C7BA',
          logoUrl: '',
          views: 0,
          backgroundSaturation: 100,
          backgroundHueRotate: 0,
          backgroundSepia: 0,
          backgroundGrayscale: 0,
          backgroundInvert: 0,
          backgroundColorFilter: null,
          backgroundColorFilterOpacity: 0.3,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        // Réinitialiser le search_path avant de quitter
        await db.execute(sql`SET search_path TO public`);
        logger.info('Search path réinitialisé à "public"');
        
        return res.json({
          success: true,
          data: {
            ...newProfile[0],
            links: []
          }
        });
      }
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
      
      return res.json({
        success: true,
        data: linkProfile
      });
    } finally {
      // S'assurer que le search_path est réinitialisé même en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(err => {
        logger.error('Erreur lors de la réinitialisation du search_path:', err);
      });
    }
  } catch (error) {
    logger.error('Error fetching link profile:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil de liens'
    });
  }
});

// Update a user's link profile
router.post('/profile', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    const profileData = req.body;
    logger.info(`Mise à jour du profil pour l'utilisateur ${userId}`);
    logger.info(`Nombre de liens reçus: ${profileData.links?.length || 0}`);
    
    if (profileData.links && profileData.links.length > 0) {
      const linksWithIcons = profileData.links.filter(link => link.icon);
      logger.info(`Nombre de liens avec icônes: ${linksWithIcons.length}`);
      linksWithIcons.forEach((link, idx) => {
        logger.info(`Lien ${idx + 1} avec icône: ${link.title}, icône: ${link.icon}`);
      });
    }
    
    try {
      // Check if the profile belongs to the user
      const existingProfile = await db.query.linkProfiles.findFirst({
        where: eq(linkProfiles.userId, userId)
      });
      
      if (!existingProfile) {
        // Réinitialiser le search_path avant de quitter
        await db.execute(sql`SET search_path TO public`);
        logger.info('Search path réinitialisé à "public"');
        return res.status(404).json({
          success: false,
          message: 'Profil non trouvé'
        });
      }
      
      // Check if the slug is unique
      if (profileData.slug !== existingProfile.slug) {
        const slugExists = await db.query.linkProfiles.findFirst({
          where: eq(linkProfiles.slug, profileData.slug)
        });
        
        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: 'Ce lien personnalisé est déjà utilisé'
          });
        }
      }
      
      // Check if background image was removed and delete the file if needed
      if (existingProfile.backgroundImage && (!profileData.backgroundImage || profileData.backgroundImage === '')) {
        const oldBackgroundPath = path.join(process.cwd(), existingProfile.backgroundImage.replace(/^\//, ''));
        
        if (fs.existsSync(oldBackgroundPath)) {
          try {
            fs.unlinkSync(oldBackgroundPath);
            logger.info(`Deleted background image: ${oldBackgroundPath}`);
          } catch (err) {
            logger.error('Error deleting background image:', err);
          }
        }
      }
      
      // Update the profile
      await db.update(linkProfiles)
        .set({
          slug: profileData.slug,
          title: profileData.title,
          description: profileData.description,
          backgroundColor: profileData.backgroundColor,
          textColor: profileData.textColor,
          accentColor: profileData.accentColor,
          logoUrl: profileData.logoUrl,
          backgroundImage: profileData.backgroundImage,
          backgroundPattern: profileData.backgroundPattern,
          buttonStyle: profileData.buttonStyle,
          buttonRadius: profileData.buttonRadius,
          fontFamily: profileData.fontFamily,
          animation: profileData.animation,
          customCss: profileData.customCss,
          customTheme: profileData.customTheme,
          backgroundSaturation: profileData.backgroundSaturation,
          backgroundHueRotate: profileData.backgroundHueRotate,
          backgroundSepia: profileData.backgroundSepia,
          backgroundGrayscale: profileData.backgroundGrayscale,
          backgroundInvert: profileData.backgroundInvert,
          backgroundColorFilter: profileData.backgroundColorFilter,
          backgroundColorFilterOpacity: profileData.backgroundColorFilterOpacity || 0.3,
          updatedAt: new Date()
        })
        .where(eq(linkProfiles.id, existingProfile.id));
      
      // Remplacer la suppression et recréation par une mise à jour intelligente
      logger.info(`Mise à jour des liens pour le profil ${existingProfile.id}`);
      
      // Obtenir tous les liens existants
      const existingLinks = await db.query.links.findMany({
        where: eq(links.profileId, existingProfile.id)
      });
      
      // Identifier les IDs des liens existants
      const existingLinkIds = existingLinks.map(link => link.id);
      const newLinkIds = profileData.links?.map(link => parseInt(String(link.id), 10)).filter(id => !isNaN(id)) || [];
      
      // Trouver les liens à supprimer (ceux qui n'ont pas de soumissions)
      const linksToDelete = existingLinks.filter(link => !newLinkIds.includes(link.id));
      
      // Vérifier si chaque lien à supprimer a des soumissions
      for (const link of linksToDelete) {
        // Vérifier s'il y a des soumissions pour ce lien
        const submissionCount = await db.query.formSubmissions.findMany({
          where: eq(formSubmissions.linkId, link.id),
          limit: 1
        });
        
        if (submissionCount.length === 0) {
          // Pas de soumissions, on peut supprimer en toute sécurité
          try {
            await db.delete(links)
              .where(eq(links.id, link.id));
            logger.info(`Lien ${link.id} supprimé car il n'a pas de soumissions`);
          } catch (deleteError) {
            logger.error(`Erreur lors de la suppression du lien ${link.id}:`, deleteError);
          }
        } else {
          // Il y a des soumissions, on désactive le lien au lieu de le supprimer
          try {
            await db.update(links)
              .set({ 
                enabled: false,
                updatedAt: new Date() 
              })
              .where(eq(links.id, link.id));
            logger.info(`Lien ${link.id} désactivé car il a des soumissions`);
          } catch (updateError) {
            logger.error(`Erreur lors de la désactivation du lien ${link.id}:`, updateError);
          }
        }
      }
      
      // Traiter les nouveaux liens et mettre à jour les liens existants
      if (profileData.links && profileData.links.length > 0) {
        for (const link of profileData.links) {
          // Vérifier si c'est un nouveau lien (propriété isNew) ou un lien existant avec un ID
          const isNewLink = link.isNew === true || !link.id;
          const linkId = !isNewLink ? parseInt(String(link.id), 10) : NaN;
          
          if (!isNewLink && !isNaN(linkId) && existingLinkIds.includes(linkId)) {
            // C'est un lien existant à mettre à jour
          try {
              logger.info(`Mise à jour du lien ${linkId}: "${link.title}"`);
              
              await db.update(links)
                .set({
                  title: link.title,
                  url: link.url || '',
                  icon: link.icon || null,
                  enabled: link.enabled,
                  position: link.position || 0,
                  featured: link.featured || false,
                  customColor: link.customColor || null,
                  customTextColor: link.customTextColor || null,
                  animation: link.animation || null,
                  type: link.type || 'link',
                  formDefinition: link.formDefinition || null,
                  updatedAt: new Date()
                })
                .where(eq(links.id, linkId));
              
              logger.info(`Lien ${linkId} mis à jour avec succès`);
            } catch (updateError) {
              logger.error(`Erreur lors de la mise à jour du lien ${linkId}:`, updateError);
            }
          } else {
            // C'est un nouveau lien à créer
            try {
              logger.info(`Ajout d'un nouveau lien: "${link.title}"`);
              
              // Supprimer la propriété isNew avant l'insertion si elle existe
              const linkData = { ...link };
              delete linkData.isNew;
            
            await db.insert(links).values({
              profileId: existingProfile.id,
              title: link.title,
              url: link.url || '',
              icon: link.icon || null,
              enabled: link.enabled,
              clicks: link.clicks || 0,
              position: link.position || 0,
              featured: link.featured || false,
              customColor: link.customColor || null,
              customTextColor: link.customTextColor || null,
              animation: link.animation || null,
              type: link.type || 'link',
              formDefinition: link.formDefinition || null,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
              logger.info(`Nouveau lien "${link.title}" ajouté avec succès`);
            } catch (insertError) {
              logger.error(`Erreur lors de l'ajout du lien ${link.title}:`, insertError);
            }
          }
        }
      }
      
      // Get updated profile
      const updatedProfile = await db.query.linkProfiles.findFirst({
        where: eq(linkProfiles.id, existingProfile.id),
        with: {
          links: true
        }
      });
      
      logger.info(`Profil mis à jour avec ${updatedProfile?.links?.length || 0} liens`);
      
      if (updatedProfile?.links) {
        const linksWithIcons = updatedProfile.links.filter(link => link.icon);
        logger.info(`Nombre de liens avec icônes après mise à jour: ${linksWithIcons.length}`);
      }
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
      
      return res.json({
        success: true,
        data: updatedProfile
      });
    } finally {
      // S'assurer que le search_path est réinitialisé même en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(err => {
        logger.error('Erreur lors de la réinitialisation du search_path:', err);
      });
    }
  } catch (error) {
    logger.error('Error updating link profile:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil de liens'
    });
  }
});

// Get a public link profile by slug
router.get('/profile/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    // Note: Les profils publics restent dans le schéma public pour maintenir l'accès sans authentification    
    const linkProfile = await db.query.linkProfiles.findFirst({
      where: eq(linkProfiles.slug, slug),
      with: {
        links: true
      }
    });
    
    if (!linkProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé'
      });
    }
    
    // Increment view count
    await db.update(linkProfiles)
      .set({ views: sql`${linkProfiles.views} + 1` })
      .where(eq(linkProfiles.id, linkProfile.id));
    
    return res.json({
      success: true,
      data: linkProfile
    });
    
  } catch (error) {
    logger.error('Error fetching public link profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// Record a view for a profile
router.post('/profile/:slug/view', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const profile = await db.query.linkProfiles.findFirst({
      where: eq(linkProfiles.slug, slug)
    });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé'
      });
    }
    
    // Increment views count
    await db.update(linkProfiles)
      .set({
        views: (profile.views || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(linkProfiles.id, profile.id));
    
    return res.json({
      success: true
    });
    
  } catch (error) {
    logger.error('Error recording profile view:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la vue'
    });
  }
});

// Record a click on a link
router.post('/click/:linkId', async (req, res) => {
  try {
    const linkId = parseInt(req.params.linkId);
    
    if (isNaN(linkId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de lien invalide'
      });
    }
    
    const link = await db.query.links.findFirst({
      where: eq(links.id, linkId)
    });
    
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Lien non trouvé'
      });
    }
    
    // Increment clicks count
    await db.update(links)
      .set({
        clicks: (link.clicks || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(links.id, link.id));
    
    return res.json({
      success: true
    });
    
  } catch (error) {
    logger.error('Error recording link click:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du clic'
    });
  }
});

// Handle form submissions
router.post('/form-submit/:linkId', async (req, res) => {
  try {
    logger.info('Demande de soumission de formulaire reçue');
    
    // Vérification des données évitant de logger des informations sensibles
    logger.info('Requête reçue pour formId:', req.params.linkId);
    
    const linkId = parseInt(req.params.linkId);
    logger.info(`ID du lien: ${linkId}`);
    
    if (isNaN(linkId)) {
      logger.error(`ID invalide: ${req.params.linkId}`);
      return res.status(400).json({
        success: false,
        message: 'ID de lien invalide'
      });
    }
    
    // Vérification du format des données reçues avec une meilleure robustesse
    let formData;
    if (req.body.data) {
      formData = req.body.data;
    } else if (typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      // Supportons différents formats d'entrée
      formData = req.body;
      logger.info('Utilisation du body directement comme données de formulaire');
    } else {
      logger.error('Format de données invalide - aucune donnée exploitable');
      return res.status(400).json({
        success: false,
        message: 'Format de données invalide: aucune donnée de formulaire'
      });
    }
    
    // Log sécurisé (avec limitation de taille)
    const formDataStr = JSON.stringify(formData);
    logger.info(`Données du formulaire: ${formDataStr.substring(0, 200)}${formDataStr.length > 200 ? '...' : ''}`);
    
    try {
      const link = await db.query.links.findFirst({
        where: eq(links.id, linkId),
        with: {
          profile: true
        }
      });
      
      if (!link) {
        logger.error(`Lien/formulaire ${linkId} non trouvé`);
        return res.status(404).json({
          success: false,
          message: 'Formulaire non trouvé'
        });
      }
      
      logger.info(`Formulaire trouvé: ${link.title}`);
      
      // Increment form submissions count
      try {
        await db.update(links)
          .set({
            clicks: (link.clicks || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(links.id, link.id));
        
        logger.info(`Compteur de soumissions mis à jour pour ${link.id}`);
      } catch (updateError) {
        logger.error('Erreur lors de la mise à jour du compteur:', updateError);
        // Continue même en cas d'erreur lors de la mise à jour du compteur
      }
      
      // Stocker la soumission dans la base de données avec plus de robustesse
      try {
        const { formSubmissions } = await import('../schema/links');
        
        // Récupérer des informations sur l'utilisateur pour des raisons de sécurité
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        
        // Conversion explicite en JSON pour éviter les erreurs de type
        const jsonFormData = typeof formData === 'string' 
          ? JSON.parse(formData) 
          : formData;
        
        // Validation que les données sont un objet
        if (typeof jsonFormData !== 'object') {
          throw new Error('Les données du formulaire doivent être un objet');
        }
        
        // Insertion avec gestion d'erreur améliorée
        const result = await db.insert(formSubmissions).values({
          linkId,
          formData: jsonFormData,
          ipAddress: ipAddress ? String(ipAddress).substring(0, 50) : null,
          userAgent: userAgent ? String(userAgent) : null,
          createdAt: new Date()
        });
        
        logger.info(`Soumission de formulaire enregistrée avec succès, ID: ${result.insertId || 'N/A'}`);
      } catch (storageError) {
        logger.error('Erreur lors de l\'enregistrement de la soumission:', storageError);
        
        // Dans un environnement de production, on pourrait vouloir échouer complètement ici
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'enregistrement de la soumission'
          });
        }
        // Sinon en dev, on continue pour faciliter le débogage
      }
      
      // Notification par email (commenté pour l'instant)
      /*
      try {
        // Implémentation future de notification par email
        const { sendFormSubmissionNotification } = await import('../services/email');
        await sendFormSubmissionNotification(link.profile.email, {
          formTitle: link.title,
          formData: formData
        });
      } catch (notificationError) {
        logger.error('Erreur lors de l\'envoi de la notification:', notificationError);
      }
      */
      
      logger.info('Traitement terminé avec succès');
      return res.json({
        success: true,
        message: 'Formulaire soumis avec succès'
      });
      
    } catch (dbError) {
      logger.error('Erreur lors de l\'accès à la base de données:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Erreur de base de données'
      });
    }
    
  } catch (error) {
    logger.error('Error handling form submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission du formulaire',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route de compatibilité pour les anciens clients qui utilisaient /submit au lieu de /form-submit
router.post('/submit/:linkId', async (req, res) => {
  try {
    logger.info('Demande de soumission reçue via la route de compatibilité /submit');
    logger.info('Body de la requête:', JSON.stringify(req.body));
    
    const linkId = parseInt(req.params.linkId);
    logger.info(`ID du lien: ${linkId}`);
    
    if (isNaN(linkId)) {
      logger.error(`ID invalide: ${req.params.linkId}`);
      return res.status(400).json({
        success: false,
        message: 'ID de lien invalide'
      });
    }
    
    // Format des données - adaptation pour la compatibilité
    let formData = req.body;
    
    // Si les données sont directement dans le corps, les encapsuler dans 'data'
    if (!req.body.data) {
      formData = { data: req.body };
      logger.info('Reformatage des données pour compatibilité');
    }
    
    logger.info('Données du formulaire:', JSON.stringify(formData.data));
    
    const link = await db.query.links.findFirst({
      where: eq(links.id, linkId),
      with: {
        profile: true
      }
    });
    
    if (!link) {
      logger.error(`Lien/formulaire ${linkId} non trouvé`);
      return res.status(404).json({
        success: false,
        message: 'Formulaire non trouvé'
      });
    }
    
    logger.info(`Formulaire trouvé: ${link.title}`);
    
    // Increment form submissions count
    try {
      await db.update(links)
        .set({
          clicks: (link.clicks || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(links.id, link.id));
      
      logger.info(`Compteur de soumissions mis à jour pour ${link.id}`);
    } catch (updateError) {
      logger.error('Erreur lors de la mise à jour du compteur:', updateError);
    }
    
    // Stocker la soumission dans la base de données
    try {
      const { formSubmissions } = await import('../schema/links');
      
      // Récupérer des informations sur l'utilisateur pour des raisons de sécurité
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;
      
      await db.insert(formSubmissions).values({
        linkId,
        formData: formData.data,
        ipAddress: ipAddress ? String(ipAddress).substring(0, 50) : null,
        userAgent: userAgent ? String(userAgent) : null,
        createdAt: new Date()
      });
      
      logger.info(`Soumission de formulaire enregistrée dans la base de données (via route de compatibilité)`);
    } catch (storageError) {
      logger.error('Erreur lors de l\'enregistrement de la soumission:', storageError);
      // Continue même en cas d'erreur lors de l'enregistrement de la soumission
    }
    
    logger.info('Traitement terminé avec succès');
    return res.json({
      success: true,
      message: 'Formulaire soumis avec succès'
    });
    
  } catch (error) {
    logger.error('Error handling form submission:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission du formulaire'
    });
  }
});

// Upload logo for link profile
router.post('/upload-logo', authenticateMiddleware, logoUpload.single('logo'), handleMulterErrors, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier n\'a été téléchargé'
        });
      }
      
      // Get the uploaded file path
      const logoUrl = `/uploads/${clientSchema}/logos/${path.basename(req.file.path)}`;
      
      // Get the user's profile
      const profile = await db.query.linkProfiles.findFirst({
        where: eq(linkProfiles.userId, userId)
      });
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profil non trouvé'
        });
      }
      
      // Delete old logo if exists
      if (profile.logoUrl) {
        const oldLogoPath = path.join(process.cwd(), profile.logoUrl.replace(/^\//, ''));
        
        if (fs.existsSync(oldLogoPath)) {
          try {
            fs.unlinkSync(oldLogoPath);
          } catch (err) {
            logger.error('Error deleting old logo:', err);
          }
        }
      }
      
      // Update the profile with new logo URL
      await db.update(linkProfiles)
        .set({
          logoUrl,
          updatedAt: new Date()
        })
        .where(eq(linkProfiles.id, profile.id));
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
      
      return res.json({
        success: true,
        logoUrl
      });
    } finally {
      // S'assurer que le search_path est réinitialisé même en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(err => {
        logger.error('Erreur lors de la réinitialisation du search_path:', err);
      });
    }
  } catch (error) {
    logger.error('Error uploading logo:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload du logo'
    });
  }
});

// Upload background image for link profile
router.post('/upload-background', authenticateMiddleware, backgroundUpload.single('background'), handleMulterErrors, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier n\'a été téléchargé'
        });
      }
      
      // Get the uploaded file path
      const backgroundUrl = `/uploads/${clientSchema}/backgrounds/${path.basename(req.file.path)}`;
      
      // Get the user's profile
      const profile = await db.query.linkProfiles.findFirst({
        where: eq(linkProfiles.userId, userId)
      });
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profil non trouvé'
        });
      }
      
      // Delete old background if exists
      if (profile.backgroundImage) {
        const oldBackgroundPath = path.join(process.cwd(), profile.backgroundImage.replace(/^\//, ''));
        
        if (fs.existsSync(oldBackgroundPath)) {
          try {
            fs.unlinkSync(oldBackgroundPath);
          } catch (err) {
            logger.error('Error deleting old background:', err);
          }
        }
      }
      
      // Update the profile with new background URL
      await db.update(linkProfiles)
        .set({
          backgroundImage: backgroundUrl,
          updatedAt: new Date()
        })
        .where(eq(linkProfiles.id, profile.id));
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
      
      return res.json({
        success: true,
        backgroundUrl
      });
    } finally {
      // S'assurer que le search_path est réinitialisé même en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(err => {
        logger.error('Erreur lors de la réinitialisation du search_path:', err);
      });
    }
  } catch (error) {
    logger.error('Error uploading background:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de l\'image de fond'
    });
  }
});

// Upload image for link
router.post('/upload-link-image', authenticateMiddleware, linkImageUpload.single('image'), handleMulterErrors, async (req: Request, res: Response) => {
  try {
    logger.info('Début de l\'upload d\'image de lien');
    const userId = req.user?.id;
    
    if (!userId) {
      logger.error('Upload image - Utilisateur non authentifié');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    try {
      // Check if file was uploaded
      if (!req.file) {
        logger.error('Upload image - Aucun fichier téléchargé');
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier n\'a été téléchargé'
        });
      }
      
      logger.info(`Fichier téléchargé: ${req.file.path}`);
      
      // Get the uploaded file path
      const imageUrl = `/uploads/${clientSchema}/link-images/${path.basename(req.file.path)}`;
      logger.info(`URL de l'image: ${imageUrl}`);
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
      
      // Return the image URL
      return res.json({
        success: true,
        imageUrl
      });
    } finally {
      // S'assurer que le search_path est réinitialisé même en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(err => {
        logger.error('Erreur lors de la réinitialisation du search_path:', err);
      });
    }
  } catch (error) {
    logger.error('Error uploading link image:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de l\'image'
    });
  }
});

// Route rétrocompatible pour l'ancien endpoint
router.post('/upload-link-icon', authenticateMiddleware, linkImageUpload.single('icon'), handleMulterErrors, async (req: Request, res: Response) => {
  try {
    logger.info('Utilisation de l\'ancien endpoint d\'upload d\'icône (redirigé vers image)');
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier n\'a été téléchargé'
        });
      }
      
      // Get the uploaded file path
      const imageUrl = `/uploads/${clientSchema}/link-images/${path.basename(req.file.path)}`;
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
      
      // Return the URL as iconUrl for backward compatibility
      return res.json({
        success: true,
        iconUrl: imageUrl // Keep old property name for compatibility
      });
    } finally {
      // S'assurer que le search_path est réinitialisé même en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(err => {
        logger.error('Erreur lors de la réinitialisation du search_path:', err);
      });
    }
  } catch (error) {
    logger.error('Error uploading link icon (legacy endpoint):', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de l\'image'
    });
  }
});

// Get form submissions for a link
router.get('/form-submissions/:linkId', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    // Récupérer les soumissions sans filtrage
    try {
      // Connexion directe à la base de données
      const { pool } = await import('../db');
      
      // Récupérer TOUTES les soumissions pour déboguer
      const allSubmissionsResult = await pool.query(
        'SELECT * FROM form_submissions ORDER BY created_at DESC'
      );
      
      console.log("TOUTES LES SOUMISSIONS:", JSON.stringify(allSubmissionsResult.rows, null, 2));
      
      // Aussi, récupérer les soumissions pour le lien demandé
      const linkId = parseInt(req.params.linkId);
      console.log("RECHERCHE POUR LINKID:", linkId);
      
      // Transformer les résultats
      const submissions = allSubmissionsResult.rows.map((row: any) => ({
        id: row.id,
        linkId: row.link_id,
        formData: row.form_data,
        createdAt: row.created_at
      }));
      
      // Filtrer côté serveur pour éviter les problèmes SQL
      const filteredSubmissions = linkId 
        ? submissions.filter((sub: any) => sub.linkId === linkId)
        : submissions;
      
      console.log("SOUMISSIONS FILTRÉES:", JSON.stringify(filteredSubmissions, null, 2));
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
        
      return res.json({
        success: true,
        data: filteredSubmissions
      });
    } catch (dbError: any) {
      // Réinitialiser le search_path en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(() => {});
      
      console.error('Erreur complète:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des soumissions'
      });
    }
  } catch (error: any) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    console.error('Erreur générale:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

export default router; 