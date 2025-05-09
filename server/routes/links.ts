import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { desc, eq, sql, and, asc } from 'drizzle-orm';
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
      const profileQuery = await db.execute(
        sql`SELECT * FROM link_profiles WHERE user_id = ${userId} LIMIT 1`
      );
      
      // Si aucun profil n'existe, en créer un automatiquement
      if (!profileQuery.rowCount || profileQuery.rowCount === 0) {
        logger.info(`Aucun profil trouvé pour l'utilisateur ${userId}. Création d'un profil initial...`);
        
        // Récupérer le nom d'utilisateur pour le slug
        const userQuery = await db.execute(
          sql`SELECT username FROM users WHERE id = ${userId}`
        );
      
        const username = userQuery.rows[0]?.username || `user-${userId}`;
        const slug = typeof username === 'string' ? username.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : `user-${userId}`;
      
        logger.info(`Création d'un profil initial pour l'utilisateur ${userId} avec slug ${slug}`);
        
        // Créer la séquence pour link_profiles si elle n'existe pas
        try {
          await db.execute(sql`
            CREATE SEQUENCE IF NOT EXISTS link_profiles_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
          `);
        } catch (seqError) {
          logger.warn(`Erreur lors de la création de la séquence, elle existe peut-être déjà: ${seqError}`);
        }
        
        // Créer un profil initial en utilisant la séquence locale
        await db.execute(sql`
          INSERT INTO link_profiles
          (id, user_id, slug, title, description, created_at, updated_at)
          VALUES
          (nextval('link_profiles_id_seq'), ${userId}, ${slug}, 'Mon Profil', 'Tous mes liens professionnels en un seul endroit', NOW(), NOW())
        `);
        
        logger.info(`Profil de liens initial créé pour l'utilisateur ${userId} avec slug ${slug}`);
      
      return res.json({
        success: true,
        data: {
            ...profileQuery.rows[0],
          links: []
        }
        });
      }
      
      // Le profil existe, continuer avec le code existant
      const linkProfile = await db.query.linkProfiles.findFirst({
        where: eq(linkProfiles.userId, userId),
        with: {
          links: true
        }
      });

      if (!linkProfile) {
        // Cette situation ne devrait plus arriver grâce à la création automatique ci-dessus
        return res.status(404).json({
          success: false,
          message: 'Profil non trouvé'
      });
    }
    
    return res.json({
      success: true,
      data: linkProfile
    });
  } catch (error) {
    logger.error('Error fetching link profile:', error);
      await db.execute(sql`SET search_path TO public`).catch(() => {}); // Reset search path
      throw error; // Rethrow to be caught by the outer try-catch
    } finally {
      // Always reset the search path to public
      await db.execute(sql`SET search_path TO public`).catch((e) => {
        logger.error('Failed to reset search path:', e);
      });
    }
  } catch (error) {
    logger.error('Error in profile route:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
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
      const linksWithIcons = profileData.links.filter((link: any) => link.icon);
      logger.info(`Nombre de liens avec icônes: ${linksWithIcons.length}`);
      linksWithIcons.forEach((link: any, idx: number) => {
        logger.info(`Lien ${idx + 1} avec icône: ${link.title}, icône: ${link.icon}`);
      });
    }
    
    try {
    // Vérifier si l'utilisateur a un profil avec SQL brut au lieu de Drizzle
    const existingProfileQuery = await db.execute(
      sql`SELECT * FROM link_profiles WHERE user_id = ${userId} LIMIT 1`
    );
    
    // Si aucun profil n'existe, créer un automatiquement
    if (!existingProfileQuery.rowCount || existingProfileQuery.rowCount === 0) {
      // Récupérer le nom d'utilisateur pour le slug
      const userQuery = await db.execute(
        sql`SELECT username FROM users WHERE id = ${userId}`
      );
      
      const username = userQuery.rows[0]?.username || `user-${userId}`;
      const slug = typeof username === 'string' ? username.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : `user-${userId}`;
      
      logger.info(`Création d'un profil initial pour l'utilisateur ${userId} avec slug ${slug}`);
      
      // Créer la séquence pour link_profiles si elle n'existe pas
      try {
        await db.execute(sql`
          CREATE SEQUENCE IF NOT EXISTS link_profiles_id_seq
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1
        `);
      } catch (seqError) {
        logger.warn(`Erreur lors de la création de la séquence, elle existe peut-être déjà: ${seqError}`);
      }
      
      // Créer un profil initial en utilisant la séquence locale
      await db.execute(sql`
        INSERT INTO link_profiles
        (id, user_id, slug, title, description, created_at, updated_at)
        VALUES
        (nextval('link_profiles_id_seq'), ${userId}, ${slug}, 'Mon Profil', 'Tous mes liens professionnels en un seul endroit', NOW(), NOW())
      `);
      
      logger.info(`Profil de liens initial créé pour l'utilisateur ${userId} avec slug ${slug}`);
      
      // Récupérer le profil nouvellement créé
      const newProfileQuery = await db.execute(
        sql`SELECT * FROM link_profiles WHERE user_id = ${userId} LIMIT 1`
      );
    
      if (!newProfileQuery.rowCount || newProfileQuery.rowCount === 0) {
        // Réinitialiser le search_path avant de quitter
        await db.execute(sql`SET search_path TO public`);
        logger.error('Impossible de créer un nouveau profil');
        return res.status(500).json({
        success: false,
          message: 'Erreur lors de la création du profil'
      });
    }
      
      const existingProfile = newProfileQuery.rows[0];

      // Continuer avec la mise à jour du profil
    } else {
      const existingProfile = existingProfileQuery.rows[0];
    
    // Check if the slug is unique if it changed
    if (profileData.slug !== existingProfile.slug) {
      const slugExistsQuery = await db.execute(
        sql`SELECT id FROM link_profiles WHERE slug = ${profileData.slug} AND id != ${existingProfile.id} LIMIT 1`
      );
      
      if (slugExistsQuery.rowCount && slugExistsQuery.rowCount > 0) {
        // Réinitialiser le search_path avant de quitter
        await db.execute(sql`SET search_path TO public`);
        return res.status(400).json({
          success: false,
          message: 'Ce lien personnalisé est déjà utilisé'
        });
      }
    }
    
    // Check if background image was removed and delete the file if needed
    if (existingProfile.background_image && (!profileData.backgroundImage || profileData.backgroundImage === '')) {
      const oldBackgroundPath = path.join(
        process.cwd(), 
        typeof existingProfile.background_image === 'string' 
          ? existingProfile.background_image.replace(/^\//, '') 
          : ''
      );
      
      if (fs.existsSync(oldBackgroundPath)) {
        try {
          fs.unlinkSync(oldBackgroundPath);
          logger.info(`Deleted background image: ${oldBackgroundPath}`);
        } catch (err) {
          logger.error('Error deleting background image:', err);
        }
      }
    }
    }
    
    // Update the profile using SQL directly
    await db.execute(sql`
      UPDATE link_profiles
      SET
        slug = ${profileData.slug || ''},
        title = ${profileData.title || ''},
        description = ${profileData.description || null},
        background_color = ${profileData.backgroundColor || '#ffffff'},
        text_color = ${profileData.textColor || '#000000'},
        accent_color = ${profileData.accentColor || '#70C7BA'},
        logo_url = ${profileData.logoUrl || null},
        background_image = ${profileData.backgroundImage || null},
        background_pattern = ${profileData.backgroundPattern || null},
        button_style = ${profileData.buttonStyle || 'rounded'},
        button_radius = ${profileData.buttonRadius || 8},
        font_family = ${profileData.fontFamily || 'Inter'},
        animation = ${profileData.animation || 'fade'},
        custom_css = ${profileData.customCss || null},
        custom_theme = ${profileData.customTheme ? JSON.stringify(profileData.customTheme) : null},
        background_saturation = ${profileData.backgroundSaturation || 100},
        background_hue_rotate = ${profileData.backgroundHueRotate || 0},
        background_sepia = ${profileData.backgroundSepia || 0},
        background_grayscale = ${profileData.backgroundGrayscale || 0},
        background_invert = ${profileData.backgroundInvert || 0},
        background_color_filter = ${profileData.backgroundColorFilter || null},
        background_color_filter_opacity = ${profileData.backgroundColorFilterOpacity || 0.3},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `);
    
    // Récupérer tous les liens existants avec SQL brut
    const existingLinksQuery = await db.execute(
      sql`SELECT * FROM links WHERE profile_id = (SELECT id FROM link_profiles WHERE user_id = ${userId} LIMIT 1)`
    );
    const existingLinks = existingLinksQuery.rows || [];
    
    // Identifier les IDs des liens existants
    const existingLinkIds = existingLinks.map((link: any) => link.id);
    const newLinkIds = profileData.links?.map((link: any) => parseInt(String(link.id), 10)).filter((id: any) => !isNaN(id)) || [];
    
    // Trouver les liens à supprimer
    const linksToDelete = existingLinks.filter((link: any) => !newLinkIds.includes(link.id));
    
    // Vérifier les soumissions pour chaque lien à supprimer
    for (const link of linksToDelete) {
      // Vérifier s'il y a des soumissions pour ce lien
      const submissionCountQuery = await db.execute(
        sql`SELECT COUNT(*) FROM form_submissions WHERE link_id = ${link.id} LIMIT 1`
      );
      
      const hasSubmissions = submissionCountQuery.rows[0] && 
                            typeof submissionCountQuery.rows[0].count !== 'undefined' ? 
                            Number(submissionCountQuery.rows[0].count) > 0 : false;
      
      if (!hasSubmissions) {
        // Pas de soumissions, on peut supprimer en toute sécurité
        try {
          await db.execute(
            sql`DELETE FROM links WHERE id = ${link.id}`
          );
          logger.info(`Lien ${link.id} supprimé car il n'a pas de soumissions`);
        } catch (deleteError) {
          logger.error(`Erreur lors de la suppression du lien ${link.id}:`, deleteError);
        }
      } else {
        // Il y a des soumissions, on désactive le lien au lieu de le supprimer
        try {
          await db.execute(
            sql`UPDATE links SET enabled = false, updated_at = NOW() WHERE id = ${link.id}`
          );
          logger.info(`Lien ${link.id} désactivé car il a des soumissions`);
        } catch (updateError) {
          logger.error(`Erreur lors de la désactivation du lien ${link.id}:`, updateError);
        }
      }
    }
    
    // Récupérer l'ID du profil
    const profileIdQuery = await db.execute(
      sql`SELECT id FROM link_profiles WHERE user_id = ${userId} LIMIT 1`
    );
    const profileId = profileIdQuery.rows[0].id;
    
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
            
            await db.execute(sql`
              UPDATE links
              SET
                title = ${link.title || ''},
                url = ${link.url || ''},
                icon = ${link.icon || null},
                enabled = ${link.enabled},
                position = ${link.position || 0},
                featured = ${link.featured || false},
                custom_color = ${link.customColor || null},
                custom_text_color = ${link.customTextColor || null},
                animation = ${link.animation || null},
                type = ${link.type || 'link'},
                form_definition = ${link.formDefinition ? JSON.stringify(link.formDefinition) : null},
                updated_at = NOW()
              WHERE id = ${linkId}
            `);
            
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
          
          await db.execute(sql`
            INSERT INTO links
            (profile_id, title, url, icon, enabled, clicks, position, featured, custom_color, custom_text_color, animation, type, form_definition, created_at, updated_at)
            VALUES
            (${profileId}, ${link.title || ''}, ${link.url || ''}, ${link.icon || null}, ${link.enabled}, ${link.clicks || 0}, ${link.position || 0}, ${link.featured || false}, ${link.customColor || null}, ${link.customTextColor || null}, ${link.animation || null}, ${link.type || 'link'}, ${link.formDefinition ? JSON.stringify(link.formDefinition) : null}, NOW(), NOW())
          `);
          
            logger.info(`Nouveau lien "${link.title}" ajouté avec succès`);
          } catch (insertError) {
            logger.error(`Erreur lors de l'ajout du lien ${link.title}:`, insertError);
          }
        }
      }
    }
    
    // Get updated profile with links
    const updatedProfileQuery = await db.execute(
      sql`SELECT * FROM link_profiles WHERE user_id = ${userId} LIMIT 1`
    );
    
    const updatedLinksQuery = await db.execute(
      sql`SELECT * FROM links WHERE profile_id = (SELECT id FROM link_profiles WHERE user_id = ${userId} LIMIT 1) ORDER BY position ASC`
    );
    
    const updatedProfile = updatedProfileQuery.rows[0];
    const updatedLinks = updatedLinksQuery.rows || [];
    
    logger.info(`Profil mis à jour avec ${updatedLinks.length || 0} liens`);
    
    const linksWithIcons = updatedLinks.filter((link: any) => link.icon);
      logger.info(`Nombre de liens avec icônes après mise à jour: ${linksWithIcons.length}`);
      
    // Réinitialiser le search_path avant de quitter
    await db.execute(sql`SET search_path TO public`);
    logger.info('Search path réinitialisé à "public"');
    
    return res.json({
      success: true,
      data: {
        ...updatedProfile,
        links: updatedLinks
      }
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
    logger.info(`Recherche du profil public pour slug: ${slug}`);
    
    // Rechercher d'abord dans tous les schémas client pour trouver le profile correspondant au slug
    const schemaQuery = await db.execute(
      sql`SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'client_%'`
    );
    
    const clientSchemas = schemaQuery.rows.map(row => row.schema_name as string);
    logger.info(`Recherche du profil ${slug} dans ${clientSchemas.length} schémas clients`);
    
    let profileFound: any = null;
    let linksFound: any[] = [];
    let schemaFound: string | null = null;
    
    // Essayer de trouver le profil dans chaque schéma client
    for (const schema of clientSchemas) {
      try {
        // Rechercher le profil dans ce schéma avec TOUTES les colonnes explicitement
        const profileQuery = await db.execute(
          sql`SELECT 
                lp.id, lp.user_id, lp.slug, lp.title, lp.description,
                lp.background_color, lp.text_color, lp.accent_color,
                lp.logo_url, lp.views, lp.background_image, 
                lp.background_pattern, lp.button_style, lp.button_radius,
                lp.font_family, lp.animation, lp.custom_css, lp.custom_theme,
                lp.background_saturation, lp.background_hue_rotate, 
                lp.background_sepia, lp.background_grayscale, lp.background_invert,
                lp.background_color_filter, lp.background_color_filter_opacity,
                lp.created_at, lp.updated_at, lp.is_paused
              FROM ${sql.identifier(schema)}."link_profiles" lp 
              WHERE lp.slug = ${slug} 
              AND (lp.is_paused IS NULL OR lp.is_paused = false)
              LIMIT 1`
        );
        
        if (profileQuery && profileQuery.rowCount && profileQuery.rowCount > 0) {
          profileFound = profileQuery.rows[0];
          schemaFound = schema;
          
          // Convertir les noms de colonnes snake_case en camelCase pour le frontend
          profileFound = {
            id: profileFound.id,
            userId: profileFound.user_id,
            slug: profileFound.slug,
            title: profileFound.title,
            description: profileFound.description,
            backgroundColor: profileFound.background_color,
            textColor: profileFound.text_color,
            accentColor: profileFound.accent_color,
            logoUrl: profileFound.logo_url,
            views: profileFound.views,
            backgroundImage: profileFound.background_image,
            backgroundPattern: profileFound.background_pattern,
            buttonStyle: profileFound.button_style,
            buttonRadius: profileFound.button_radius,
            fontFamily: profileFound.font_family,
            animation: profileFound.animation,
            customCss: profileFound.custom_css,
            customTheme: profileFound.custom_theme,
            backgroundSaturation: profileFound.background_saturation,
            backgroundHueRotate: profileFound.background_hue_rotate,
            backgroundSepia: profileFound.background_sepia,
            backgroundGrayscale: profileFound.background_grayscale,
            backgroundInvert: profileFound.background_invert,
            backgroundColorFilter: profileFound.background_color_filter,
            backgroundColorFilterOpacity: profileFound.background_color_filter_opacity,
            createdAt: profileFound.created_at,
            updatedAt: profileFound.updated_at,
            isPaused: profileFound.is_paused
          };
          
          // Récupérer les liens actifs pour ce profil dans ce schéma avec TOUTES les colonnes
          const linksQuery = await db.execute(
            sql`SELECT 
                  id, profile_id, title, url, icon, enabled, clicks, 
                  position, featured, custom_color, custom_text_color, 
                  animation, type, form_definition, created_at, 
                  updated_at, button_style, user_id
                FROM ${sql.identifier(schema)}."links" 
                WHERE profile_id = ${profileFound.id}
                AND enabled = true
                ORDER BY position ASC`
          );
          
          // Convertir les liens en format camelCase également
          linksFound = (linksQuery.rows || []).map(link => ({
            id: link.id,
            profileId: link.profile_id,
            title: link.title,
            url: link.url,
            icon: link.icon,
            enabled: link.enabled,
            clicks: link.clicks,
            position: link.position,
            featured: link.featured,
            customColor: link.custom_color,
            customTextColor: link.custom_text_color,
            animation: link.animation,
            type: link.type,
            formDefinition: link.form_definition,
            createdAt: link.created_at,
            updatedAt: link.updated_at,
            buttonStyle: link.button_style,
            userId: link.user_id
          }));
          
          // Incrémenter le compteur de vues
          await db.execute(
            sql`UPDATE ${sql.identifier(schema)}."link_profiles"
                SET views = views + 1 
                WHERE id = ${profileFound.id}`
          );
          
          logger.info(`Profil trouvé dans le schéma ${schema} avec ${linksFound.length} liens`);
          
          // Profil trouvé, sortir de la boucle
          break;
        }
      } catch (schemaError) {
        // Ignorer l'erreur et continuer avec le schéma suivant
        logger.warn(`Erreur lors de la recherche dans le schéma ${schema}:`, schemaError);
      }
    }
    
    // Si aucun profil n'est trouvé, vérifier aussi dans le schéma public
    if (!profileFound) {
      try {
        // Rechercher le profil dans le schéma public avec TOUTES les colonnes
        const publicProfileQuery = await db.execute(
          sql`SELECT 
                lp.id, lp.user_id, lp.slug, lp.title, lp.description,
                lp.background_color, lp.text_color, lp.accent_color,
                lp.logo_url, lp.views, lp.background_image, 
                lp.background_pattern, lp.button_style, lp.button_radius,
                lp.font_family, lp.animation, lp.custom_css, lp.custom_theme,
                lp.background_saturation, lp.background_hue_rotate, 
                lp.background_sepia, lp.background_grayscale, lp.background_invert,
                lp.background_color_filter, lp.background_color_filter_opacity,
                lp.created_at, lp.updated_at, lp.is_paused
              FROM public."link_profiles" lp 
              WHERE lp.slug = ${slug} 
              AND (lp.is_paused IS NULL OR lp.is_paused = false)
              LIMIT 1`
        );
        
        if (publicProfileQuery && publicProfileQuery.rowCount && publicProfileQuery.rowCount > 0) {
          profileFound = publicProfileQuery.rows[0];
          schemaFound = 'public';
          
          // Convertir les noms de colonnes snake_case en camelCase pour le frontend
          profileFound = {
            id: profileFound.id,
            userId: profileFound.user_id,
            slug: profileFound.slug,
            title: profileFound.title,
            description: profileFound.description,
            backgroundColor: profileFound.background_color,
            textColor: profileFound.text_color,
            accentColor: profileFound.accent_color,
            logoUrl: profileFound.logo_url,
            views: profileFound.views,
            backgroundImage: profileFound.background_image,
            backgroundPattern: profileFound.background_pattern,
            buttonStyle: profileFound.button_style,
            buttonRadius: profileFound.button_radius,
            fontFamily: profileFound.font_family,
            animation: profileFound.animation,
            customCss: profileFound.custom_css,
            customTheme: profileFound.custom_theme,
            backgroundSaturation: profileFound.background_saturation,
            backgroundHueRotate: profileFound.background_hue_rotate,
            backgroundSepia: profileFound.background_sepia,
            backgroundGrayscale: profileFound.background_grayscale,
            backgroundInvert: profileFound.background_invert,
            backgroundColorFilter: profileFound.background_color_filter,
            backgroundColorFilterOpacity: profileFound.background_color_filter_opacity,
            createdAt: profileFound.created_at,
            updatedAt: profileFound.updated_at,
            isPaused: profileFound.is_paused
          };
          
          // Récupérer les liens actifs pour ce profil dans le schéma public avec TOUTES les colonnes
          const publicLinksQuery = await db.execute(
            sql`SELECT 
                  id, profile_id, title, url, icon, enabled, clicks, 
                  position, featured, custom_color, custom_text_color, 
                  animation, type, form_definition, created_at, 
                  updated_at, button_style, user_id
                FROM public."links" 
                WHERE profile_id = ${profileFound.id}
                AND enabled = true
                ORDER BY position ASC`
          );
          
          // Convertir les liens en format camelCase également
          linksFound = (publicLinksQuery.rows || []).map(link => ({
            id: link.id,
            profileId: link.profile_id,
            title: link.title,
            url: link.url,
            icon: link.icon,
            enabled: link.enabled,
            clicks: link.clicks,
            position: link.position,
            featured: link.featured,
            customColor: link.custom_color,
            customTextColor: link.custom_text_color,
            animation: link.animation,
            type: link.type,
            formDefinition: link.form_definition,
            createdAt: link.created_at,
            updatedAt: link.updated_at,
            buttonStyle: link.button_style,
            userId: link.user_id
          }));
          
          // Incrémenter le compteur de vues
          await db.execute(
            sql`UPDATE public."link_profiles"
                SET views = views + 1 
                WHERE id = ${profileFound.id}`
          );
          
          logger.info(`Profil trouvé dans le schéma public avec ${linksFound.length} liens`);
        }
      } catch (publicError) {
        logger.warn('Erreur lors de la recherche dans le schéma public:', publicError);
      }
    }
    
    // Si toujours aucun profil trouvé, renvoyer une erreur 404
    if (!profileFound) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé ou temporairement indisponible'
      });
    }
    
    logger.info(`Renvoi du profil ${profileFound.slug} avec ${linksFound.length} liens`);
    logger.debug(`Données de style: backgroundColor=${profileFound.backgroundColor}, buttonStyle=${profileFound.buttonStyle}`);
    
    // Formater la réponse avec les liens
    const formattedProfile = {
      ...profileFound,
      links: linksFound || []
    };
    
    return res.json({
      success: true,
      data: formattedProfile
    });
    
  } catch (error) {
    logger.error('Error fetching public link profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// Alias pour accéder au profil via /u/username
router.get('/u/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    logger.info(`Recherche du profil via /u/ pour slug: ${slug}`);
    
    // Rechercher d'abord dans tous les schémas client pour trouver le profile correspondant au slug
    const schemaQuery = await db.execute(
      sql`SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'client_%'`
    );
    
    const clientSchemas = schemaQuery.rows.map(row => row.schema_name as string);
    logger.info(`Recherche du profil ${slug} dans ${clientSchemas.length} schémas clients`);
    
    let profileFound: any = null;
    let linksFound: any[] = [];
    let schemaFound: string | null = null;
    
    // Essayer de trouver le profil dans chaque schéma client
    for (const schema of clientSchemas) {
      try {
        // Rechercher le profil dans ce schéma avec TOUTES les colonnes explicitement
        const profileQuery = await db.execute(
          sql`SELECT 
                lp.id, lp.user_id, lp.slug, lp.title, lp.description,
                lp.background_color, lp.text_color, lp.accent_color,
                lp.logo_url, lp.views, lp.background_image, 
                lp.background_pattern, lp.button_style, lp.button_radius,
                lp.font_family, lp.animation, lp.custom_css, lp.custom_theme,
                lp.background_saturation, lp.background_hue_rotate, 
                lp.background_sepia, lp.background_grayscale, lp.background_invert,
                lp.background_color_filter, lp.background_color_filter_opacity,
                lp.created_at, lp.updated_at, lp.is_paused
              FROM ${sql.identifier(schema)}."link_profiles" lp 
              WHERE lp.slug = ${slug} 
              AND (lp.is_paused IS NULL OR lp.is_paused = false)
              LIMIT 1`
        );
        
        if (profileQuery && profileQuery.rowCount && profileQuery.rowCount > 0) {
          profileFound = profileQuery.rows[0];
          schemaFound = schema;
          
          // Convertir les noms de colonnes snake_case en camelCase pour le frontend
          profileFound = {
            id: profileFound.id,
            userId: profileFound.user_id,
            slug: profileFound.slug,
            title: profileFound.title,
            description: profileFound.description,
            backgroundColor: profileFound.background_color,
            textColor: profileFound.text_color,
            accentColor: profileFound.accent_color,
            logoUrl: profileFound.logo_url,
            views: profileFound.views,
            backgroundImage: profileFound.background_image,
            backgroundPattern: profileFound.background_pattern,
            buttonStyle: profileFound.button_style,
            buttonRadius: profileFound.button_radius,
            fontFamily: profileFound.font_family,
            animation: profileFound.animation,
            customCss: profileFound.custom_css,
            customTheme: profileFound.custom_theme,
            backgroundSaturation: profileFound.background_saturation,
            backgroundHueRotate: profileFound.background_hue_rotate,
            backgroundSepia: profileFound.background_sepia,
            backgroundGrayscale: profileFound.background_grayscale,
            backgroundInvert: profileFound.background_invert,
            backgroundColorFilter: profileFound.background_color_filter,
            backgroundColorFilterOpacity: profileFound.background_color_filter_opacity,
            createdAt: profileFound.created_at,
            updatedAt: profileFound.updated_at,
            isPaused: profileFound.is_paused
          };
          
          // Récupérer les liens actifs pour ce profil dans ce schéma avec TOUTES les colonnes
          const linksQuery = await db.execute(
            sql`SELECT 
                  id, profile_id, title, url, icon, enabled, clicks, 
                  position, featured, custom_color, custom_text_color, 
                  animation, type, form_definition, created_at, 
                  updated_at, button_style, user_id
                FROM ${sql.identifier(schema)}."links" 
                WHERE profile_id = ${profileFound.id}
                AND enabled = true
                ORDER BY position ASC`
          );
          
          // Convertir les liens en format camelCase également
          linksFound = (linksQuery.rows || []).map(link => ({
            id: link.id,
            profileId: link.profile_id,
            title: link.title,
            url: link.url,
            icon: link.icon,
            enabled: link.enabled,
            clicks: link.clicks,
            position: link.position,
            featured: link.featured,
            customColor: link.custom_color,
            customTextColor: link.custom_text_color,
            animation: link.animation,
            type: link.type,
            formDefinition: link.form_definition,
            createdAt: link.created_at,
            updatedAt: link.updated_at,
            buttonStyle: link.button_style,
            userId: link.user_id
          }));
          
          // Incrémenter le compteur de vues
          await db.execute(
            sql`UPDATE ${sql.identifier(schema)}."link_profiles"
                SET views = views + 1 
                WHERE id = ${profileFound.id}`
          );
          
          logger.info(`Profil trouvé dans le schéma ${schema} avec ${linksFound.length} liens`);
          
          // Profil trouvé, sortir de la boucle
          break;
        }
      } catch (schemaError) {
        // Ignorer l'erreur et continuer avec le schéma suivant
        logger.warn(`Erreur lors de la recherche dans le schéma ${schema}:`, schemaError);
      }
    }
    
    // Si aucun profil n'est trouvé, vérifier aussi dans le schéma public
    if (!profileFound) {
      try {
        // Rechercher le profil dans le schéma public avec TOUTES les colonnes
        const publicProfileQuery = await db.execute(
          sql`SELECT 
                lp.id, lp.user_id, lp.slug, lp.title, lp.description,
                lp.background_color, lp.text_color, lp.accent_color,
                lp.logo_url, lp.views, lp.background_image, 
                lp.background_pattern, lp.button_style, lp.button_radius,
                lp.font_family, lp.animation, lp.custom_css, lp.custom_theme,
                lp.background_saturation, lp.background_hue_rotate, 
                lp.background_sepia, lp.background_grayscale, lp.background_invert,
                lp.background_color_filter, lp.background_color_filter_opacity,
                lp.created_at, lp.updated_at, lp.is_paused
              FROM public."link_profiles" lp 
              WHERE lp.slug = ${slug} 
              AND (lp.is_paused IS NULL OR lp.is_paused = false)
              LIMIT 1`
        );
        
        if (publicProfileQuery && publicProfileQuery.rowCount && publicProfileQuery.rowCount > 0) {
          profileFound = publicProfileQuery.rows[0];
          schemaFound = 'public';
          
          // Convertir les noms de colonnes snake_case en camelCase pour le frontend
          profileFound = {
            id: profileFound.id,
            userId: profileFound.user_id,
            slug: profileFound.slug,
            title: profileFound.title,
            description: profileFound.description,
            backgroundColor: profileFound.background_color,
            textColor: profileFound.text_color,
            accentColor: profileFound.accent_color,
            logoUrl: profileFound.logo_url,
            views: profileFound.views,
            backgroundImage: profileFound.background_image,
            backgroundPattern: profileFound.background_pattern,
            buttonStyle: profileFound.button_style,
            buttonRadius: profileFound.button_radius,
            fontFamily: profileFound.font_family,
            animation: profileFound.animation,
            customCss: profileFound.custom_css,
            customTheme: profileFound.custom_theme,
            backgroundSaturation: profileFound.background_saturation,
            backgroundHueRotate: profileFound.background_hue_rotate,
            backgroundSepia: profileFound.background_sepia,
            backgroundGrayscale: profileFound.background_grayscale,
            backgroundInvert: profileFound.background_invert,
            backgroundColorFilter: profileFound.background_color_filter,
            backgroundColorFilterOpacity: profileFound.background_color_filter_opacity,
            createdAt: profileFound.created_at,
            updatedAt: profileFound.updated_at,
            isPaused: profileFound.is_paused
          };
          
          // Récupérer les liens actifs pour ce profil dans le schéma public avec TOUTES les colonnes
          const publicLinksQuery = await db.execute(
            sql`SELECT 
                  id, profile_id, title, url, icon, enabled, clicks, 
                  position, featured, custom_color, custom_text_color, 
                  animation, type, form_definition, created_at, 
                  updated_at, button_style, user_id
                FROM public."links" 
                WHERE profile_id = ${profileFound.id}
                AND enabled = true
                ORDER BY position ASC`
          );
          
          // Convertir les liens en format camelCase également
          linksFound = (publicLinksQuery.rows || []).map(link => ({
            id: link.id,
            profileId: link.profile_id,
            title: link.title,
            url: link.url,
            icon: link.icon,
            enabled: link.enabled,
            clicks: link.clicks,
            position: link.position,
            featured: link.featured,
            customColor: link.custom_color,
            customTextColor: link.custom_text_color,
            animation: link.animation,
            type: link.type,
            formDefinition: link.form_definition,
            createdAt: link.created_at,
            updatedAt: link.updated_at,
            buttonStyle: link.button_style,
            userId: link.user_id
          }));
          
          // Incrémenter le compteur de vues
          await db.execute(
            sql`UPDATE public."link_profiles"
                SET views = views + 1 
                WHERE id = ${profileFound.id}`
          );
          
          logger.info(`Profil trouvé dans le schéma public avec ${linksFound.length} liens`);
        }
      } catch (publicError) {
        logger.warn('Erreur lors de la recherche dans le schéma public:', publicError);
      }
    }
    
    // Si toujours aucun profil trouvé, renvoyer une erreur 404
    if (!profileFound) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé ou temporairement indisponible'
      });
    }
    
    logger.info(`Renvoi du profil ${profileFound.slug} avec ${linksFound.length} liens`);
    logger.debug(`Données de style: backgroundColor=${profileFound.backgroundColor}, buttonStyle=${profileFound.buttonStyle}`);
    
    // Formater la réponse avec les liens
    const formattedProfile = {
      ...profileFound,
      links: linksFound || []
    };
    
    return res.json({
      success: true,
      data: formattedProfile
    });
    
  } catch (error) {
    logger.error('Error fetching public link profile via /u/:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
});

// Route pour activer/désactiver la pause d'un profil
router.patch('/profile/toggle-pause', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Support du format camelCase dans le corps de la requête
    const { isPaused, is_paused } = req.body;
    // Utiliser is_paused si fourni, sinon isPaused (pour compatibilité)
    const pauseValue = is_paused !== undefined ? is_paused : isPaused;
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    try {
      // NOTE: La colonne is_paused doit être ajoutée à la table link_profiles:
      // ALTER TABLE template.link_profiles ADD COLUMN is_paused BOOLEAN DEFAULT FALSE;
      
      // Mettre à jour le statut de pause avec SQL brut pour éviter les erreurs de schéma
      const updateResult = await db.execute(
        sql`UPDATE link_profiles 
            SET is_paused = ${!!pauseValue}, updated_at = NOW() 
            WHERE user_id = ${userId} 
            RETURNING *`
      );
      
      if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé'
      });
    }
    
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    
    return res.json({
        success: true,
        data: { 
          isPaused: !!pauseValue, // Format camelCase pour le client
          is_paused: !!pauseValue // Format snake_case pour compatibilité
        }
      });
    } finally {
      await db.execute(sql`SET search_path TO public`).catch(() => {});
    }
  } catch (error) {
    logger.error('Error toggling profile pause state:', error);
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut de pause'
    });
  }
});

// Record a view for a profile
router.post('/profile/:slug/view', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Rechercher d'abord dans tous les schémas client pour trouver le profile correspondant au slug
    const schemaQuery = await db.execute(
      sql`SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'client_%'`
    );
    
    const clientSchemas = schemaQuery.rows.map(row => row.schema_name as string);
    logger.info(`Recherche du profil ${slug} pour enregistrer une vue dans ${clientSchemas.length} schémas clients`);
    
    let profileFound = null;
    let schemaFound = null;
    
    // Essayer de trouver le profil dans chaque schéma client
    for (const schema of clientSchemas) {
      try {
        // Rechercher le profil dans ce schéma
        const profileQuery = await db.execute(
          sql`SELECT * FROM ${sql.identifier(schema)}."link_profiles" 
              WHERE slug = ${slug} LIMIT 1`
        );
        
        if (profileQuery && profileQuery.rowCount && profileQuery.rowCount > 0) {
          profileFound = profileQuery.rows[0];
          schemaFound = schema;
          break;
        }
      } catch (schemaError) {
        // Ignorer l'erreur et continuer avec le schéma suivant
        logger.warn(`Erreur lors de la recherche dans le schéma ${schema} pour enregistrer une vue:`, schemaError);
      }
    }
    
    // Si aucun profil n'est trouvé, vérifier aussi dans le schéma public
    if (!profileFound) {
      try {
        const publicProfileQuery = await db.execute(
          sql`SELECT * FROM public."link_profiles" WHERE slug = ${slug} LIMIT 1`
        );
        
        if (publicProfileQuery && publicProfileQuery.rowCount && publicProfileQuery.rowCount > 0) {
          profileFound = publicProfileQuery.rows[0];
          schemaFound = 'public';
        }
      } catch (publicError) {
        logger.warn('Erreur lors de la recherche dans le schéma public pour enregistrer une vue:', publicError);
      }
    }
    
    if (!profileFound || !schemaFound) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé'
      });
    }
    
    // Incrémenter le compteur de vues dans le schéma approprié
    await db.execute(
      sql`UPDATE ${sql.identifier(schemaFound)}."link_profiles"
          SET views = views + 1, 
              updated_at = NOW() 
          WHERE id = ${profileFound.id}`
    );
    
    return res.json({ success: true });
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
    
    // Rechercher d'abord dans tous les schémas client pour trouver le lien correspondant à linkId
    const schemaQuery = await db.execute(
      sql`SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'client_%'`
    );
    
    const clientSchemas = schemaQuery.rows.map(row => row.schema_name as string);
    logger.info(`Recherche du lien ${linkId} dans ${clientSchemas.length} schémas clients`);
    
    let linkFound: any = null;
    let schemaFound: string | null = null;
    let profileFound: any = null;
    
    // Essayer de trouver le lien dans chaque schéma client
    for (const schema of clientSchemas) {
      try {
        // Rechercher le lien dans ce schéma
        const linkQuery = await db.execute(
          sql`SELECT l.*, lp.* 
              FROM ${sql.identifier(schema)}."links" l
              JOIN ${sql.identifier(schema)}."link_profiles" lp ON l.profile_id = lp.id
              WHERE l.id = ${linkId} 
              LIMIT 1`
        );
        
        if (linkQuery.rowCount && linkQuery.rowCount > 0 && linkQuery.rows[0]) {
          linkFound = {
            id: linkQuery.rows[0].id,
            title: linkQuery.rows[0].title,
            clicks: typeof linkQuery.rows[0].clicks === 'number' ? linkQuery.rows[0].clicks : 0
          };
          profileFound = {
            id: linkQuery.rows[0].profile_id
          };
          schemaFound = schema;
          break;
        }
      } catch (schemaError) {
        // Ignorer l'erreur et continuer avec le schéma suivant
        logger.warn(`Erreur lors de la recherche dans le schéma ${schema} pour le lien ${linkId}:`, schemaError);
      }
    }
    
    // Si aucun lien n'est trouvé, vérifier aussi dans le schéma public
    if (!linkFound) {
      try {
        const publicLinkQuery = await db.execute(
          sql`SELECT l.*, lp.* 
              FROM public."links" l
              JOIN public."link_profiles" lp ON l.profile_id = lp.id
              WHERE l.id = ${linkId} 
              LIMIT 1`
        );
        
        if (publicLinkQuery.rowCount && publicLinkQuery.rowCount > 0 && publicLinkQuery.rows[0]) {
          linkFound = {
            id: publicLinkQuery.rows[0].id,
            title: publicLinkQuery.rows[0].title,
            clicks: typeof publicLinkQuery.rows[0].clicks === 'number' ? publicLinkQuery.rows[0].clicks : 0
          };
          profileFound = {
            id: publicLinkQuery.rows[0].profile_id
          };
          schemaFound = 'public';
        }
      } catch (publicError) {
        logger.warn('Erreur lors de la recherche dans le schéma public pour le lien:', publicError);
      }
    }
    
    if (!linkFound || !schemaFound || !profileFound) {
      logger.error(`Lien/formulaire ${linkId} non trouvé dans aucun schéma`);
        return res.status(404).json({
          success: false,
          message: 'Formulaire non trouvé'
        });
      }
      
    logger.info(`Formulaire trouvé dans le schéma ${schemaFound}: ${linkFound.title}`);
    
    // Increment form submissions count dans le bon schéma
    try {
      await db.execute(
        sql`UPDATE ${sql.identifier(schemaFound)}."links"
            SET clicks = ${typeof linkFound.clicks === 'number' ? linkFound.clicks + 1 : 1}, 
                updated_at = NOW() 
            WHERE id = ${linkId}`
      );
      
      logger.info(`Compteur de soumissions mis à jour pour le lien ${linkId} dans le schéma ${schemaFound}`);
      } catch (updateError) {
        logger.error('Erreur lors de la mise à jour du compteur:', updateError);
        // Continue même en cas d'erreur lors de la mise à jour du compteur
      }
      
      // Stocker la soumission dans la base de données avec plus de robustesse
      try {
      // Vérifier d'abord la structure de la table form_submissions
      const tableInfo = await db.execute(
        sql`SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = ${schemaFound} 
            AND table_name = 'form_submissions'`
      );
      
      // Récupérer toutes les colonnes disponibles
      const columns = tableInfo.rows.map((row: {column_name: string; data_type: string}) => ({
        name: row.column_name,
        type: row.data_type
      }));
      
      const columnNames = columns.map(c => c.name);
      logger.info(`Colonnes disponibles: ${columnNames.join(', ')}`);
      
      // Convertir les données en JSON
        const jsonFormData = typeof formData === 'string' 
          ? JSON.parse(formData) 
          : formData;
        
      // Vérifier le type de structure
      const hasLinkId = columnNames.includes('link_id');
      const hasFormId = columnNames.includes('form_id');
      const formIdType = columns.find(c => c.name === 'form_id')?.type;
      
      logger.info(`Structure de table détectée: hasLinkId=${hasLinkId}, hasFormId=${hasFormId}, formIdType=${formIdType || 'N/A'}`);
      
      if (hasLinkId) {
        // Structure moderne avec link_id (integer)
        const hasIpAddress = columnNames.includes('ip_address');
        const hasUserAgent = columnNames.includes('user_agent');
        
        // Construire la requête dynamiquement en fonction des colonnes présentes
        const columnsList = ['link_id', 'form_data'];
        const valuesList = [linkId, sql`${JSON.stringify(jsonFormData)}`];
        
        if (hasIpAddress) {
          const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
          columnsList.push('ip_address');
          valuesList.push(ipAddress ? String(ipAddress).substring(0, 50) : null);
        }
        
        if (hasUserAgent) {
          const userAgent = req.headers['user-agent'];
          columnsList.push('user_agent');
          valuesList.push(userAgent ? String(userAgent) : null);
        }
        
        // Ajouter created_at si présent
        if (columnNames.includes('created_at')) {
          columnsList.push('created_at');
          valuesList.push(sql`NOW()`);
        }
        
        // Préparer les noms de colonnes et les valeurs pour la requête
        const columnsStr = columnsList.map(col => sql.identifier(col)).join(', ');
        
        // Requête dynamique
        await db.execute(
          sql`INSERT INTO ${sql.identifier(schemaFound)}."form_submissions" 
              (${sql.raw(columnsStr)}) 
              VALUES (${sql.join(valuesList, sql`, `)})`
        );
      } else if (hasFormId) {
        // Structure avec form_id
        // Détecter les autres colonnes qui pourraient exister
        const hasUserId = columnNames.includes('user_id');
        const hasPropertyId = columnNames.includes('property_id');
        const hasTenantId = columnNames.includes('tenant_id');
        const hasUpdatedAt = columnNames.includes('updated_at');
        
        // Construire la requête dynamiquement en fonction des colonnes présentes
        const columnsList = ['form_id', 'form_data'];
        const valuesList = [formIdType === 'text' ? linkId.toString() : linkId, sql`${JSON.stringify(jsonFormData)}`];
        
        // Ajouter les colonnes spécifiques si présentes
        if (hasUserId) {
          columnsList.push('user_id');
          // Valeur par défaut pour user_id (1 si requis)
          valuesList.push(req.user?.id || 1);
        }
        
        if (hasPropertyId) {
          columnsList.push('property_id');
          valuesList.push(null); // Valeur par défaut
        }
        
        if (hasTenantId) {
          columnsList.push('tenant_id');
          valuesList.push(null); // Valeur par défaut
        }
        
        // Ajouter created_at si présent
        if (columnNames.includes('created_at')) {
          columnsList.push('created_at');
          valuesList.push(sql`NOW()`);
        }
        
        // Ajouter updated_at si présent
        if (hasUpdatedAt) {
          columnsList.push('updated_at');
          valuesList.push(sql`NOW()`);
        }
        
        // Préparer les noms de colonnes et les valeurs pour la requête
        const columnsStr = columnsList.map(col => sql.identifier(col)).join(', ');
        
        // Requête dynamique
        await db.execute(
          sql`INSERT INTO ${sql.identifier(schemaFound)}."form_submissions" 
              (${sql.raw(columnsStr)}) 
              VALUES (${sql.join(valuesList, sql`, `)})`
        );
      } else {
        throw new Error(`Structure de table non supportée. Colonnes disponibles: ${columnNames.join(', ')}`);
      }
      
      logger.info(`Soumission de formulaire enregistrée avec succès dans le schéma ${schemaFound}`);
      } catch (storageError) {
        logger.error('Erreur lors de l\'enregistrement de la soumission:', storageError);
        
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'enregistrement de la soumission'
          });
        }
        // Sinon en dev, on continue pour faciliter le débogage
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
      message: 'Erreur lors de la soumission du formulaire',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
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
    
    // Rechercher d'abord dans tous les schémas client pour trouver le lien correspondant à linkId
    const schemaQuery = await db.execute(
      sql`SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name LIKE 'client_%'`
    );
    
    const clientSchemas = schemaQuery.rows.map(row => row.schema_name as string);
    logger.info(`Recherche du lien ${linkId} dans ${clientSchemas.length} schémas clients (compatibilité)`);
    
    let linkFound: any = null;
    let schemaFound: string | null = null;
    let profileFound: any = null;
    
    // Essayer de trouver le lien dans chaque schéma client
    for (const schema of clientSchemas) {
      try {
        // Rechercher le lien dans ce schéma
        const linkQuery = await db.execute(
          sql`SELECT l.*, lp.* 
              FROM ${sql.identifier(schema)}."links" l
              JOIN ${sql.identifier(schema)}."link_profiles" lp ON l.profile_id = lp.id
              WHERE l.id = ${linkId} 
              LIMIT 1`
        );
        
        if (linkQuery.rowCount && linkQuery.rowCount > 0 && linkQuery.rows[0]) {
          linkFound = {
            id: linkQuery.rows[0].id,
            title: linkQuery.rows[0].title,
            clicks: typeof linkQuery.rows[0].clicks === 'number' ? linkQuery.rows[0].clicks : 0
          };
          profileFound = {
            id: linkQuery.rows[0].profile_id
          };
          schemaFound = schema;
          break;
        }
      } catch (schemaError) {
        // Ignorer l'erreur et continuer avec le schéma suivant
        logger.warn(`Erreur lors de la recherche dans le schéma ${schema} pour le lien ${linkId} (compatibilité):`, schemaError);
      }
    }
    
    // Si aucun lien n'est trouvé, vérifier aussi dans le schéma public
    if (!linkFound) {
      try {
        const publicLinkQuery = await db.execute(
          sql`SELECT l.*, lp.* 
              FROM public."links" l
              JOIN public."link_profiles" lp ON l.profile_id = lp.id
              WHERE l.id = ${linkId} 
              LIMIT 1`
        );
        
        if (publicLinkQuery.rowCount && publicLinkQuery.rowCount > 0 && publicLinkQuery.rows[0]) {
          linkFound = {
            id: publicLinkQuery.rows[0].id,
            title: publicLinkQuery.rows[0].title,
            clicks: typeof publicLinkQuery.rows[0].clicks === 'number' ? publicLinkQuery.rows[0].clicks : 0
          };
          profileFound = {
            id: publicLinkQuery.rows[0].profile_id
          };
          schemaFound = 'public';
        }
      } catch (publicError) {
        logger.warn('Erreur lors de la recherche dans le schéma public pour le lien (compatibilité):', publicError);
      }
    }
    
    if (!linkFound || !schemaFound) {
      logger.error(`Lien/formulaire ${linkId} non trouvé dans aucun schéma (compatibilité)`);
      return res.status(404).json({
        success: false,
        message: 'Formulaire non trouvé'
      });
    }
    
    logger.info(`Formulaire trouvé dans le schéma ${schemaFound}: ${linkFound.title} (compatibilité)`);
    
    // Increment form submissions count dans le bon schéma
    try {
      await db.execute(
        sql`UPDATE ${sql.identifier(schemaFound)}."links"
            SET clicks = ${typeof linkFound.clicks === 'number' ? linkFound.clicks + 1 : 1}, 
                updated_at = NOW() 
            WHERE id = ${linkId}`
      );
      
      logger.info(`Compteur de soumissions mis à jour pour le lien ${linkId} dans le schéma ${schemaFound} (compatibilité)`);
    } catch (updateError) {
      logger.error('Erreur lors de la mise à jour du compteur (compatibilité):', updateError);
    }
    
    // Stocker la soumission dans la base de données
    try {
      // Vérifier d'abord la structure de la table form_submissions
      const tableInfo = await db.execute(
        sql`SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = ${schemaFound} 
            AND table_name = 'form_submissions'`
      );
      
      // Récupérer toutes les colonnes disponibles
      const columns = tableInfo.rows.map((row: {column_name: string; data_type: string}) => ({
        name: row.column_name,
        type: row.data_type
      }));
      
      const columnNames = columns.map(c => c.name);
      logger.info(`Colonnes disponibles (compatibilité): ${columnNames.join(', ')}`);
      
      // Vérifier le type de structure
      const hasLinkId = columnNames.includes('link_id');
      const hasFormId = columnNames.includes('form_id');
      const formIdType = columns.find(c => c.name === 'form_id')?.type;
      
      logger.info(`Structure de table détectée (compatibilité): hasLinkId=${hasLinkId}, hasFormId=${hasFormId}, formIdType=${formIdType || 'N/A'}`);
      
      if (hasLinkId) {
        // Structure moderne avec link_id (integer)
        const hasIpAddress = columnNames.includes('ip_address');
        const hasUserAgent = columnNames.includes('user_agent');
        
        // Construire la requête dynamiquement en fonction des colonnes présentes
        const columnsList = ['link_id', 'form_data'];
        const valuesList = [linkId, sql`${JSON.stringify(formData.data)}`];
        
        if (hasIpAddress) {
          const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
          columnsList.push('ip_address');
          valuesList.push(ipAddress ? String(ipAddress).substring(0, 50) : null);
        }
        
        if (hasUserAgent) {
          const userAgent = req.headers['user-agent'];
          columnsList.push('user_agent');
          valuesList.push(userAgent ? String(userAgent) : null);
        }
        
        // Ajouter created_at si présent
        if (columnNames.includes('created_at')) {
          columnsList.push('created_at');
          valuesList.push(sql`NOW()`);
        }
        
        // Préparer les noms de colonnes et les valeurs pour la requête
        const columnsStr = columnsList.map(col => sql.identifier(col)).join(', ');
        
        // Requête dynamique
        await db.execute(
          sql`INSERT INTO ${sql.identifier(schemaFound)}."form_submissions" 
              (${sql.raw(columnsStr)}) 
              VALUES (${sql.join(valuesList, sql`, `)})`
        );
      } else if (hasFormId) {
        // Structure avec form_id
        // Détecter les autres colonnes qui pourraient exister
        const hasUserId = columnNames.includes('user_id');
        const hasPropertyId = columnNames.includes('property_id');
        const hasTenantId = columnNames.includes('tenant_id');
        const hasUpdatedAt = columnNames.includes('updated_at');
        
        // Construire la requête dynamiquement en fonction des colonnes présentes
        const columnsList = ['form_id', 'form_data'];
        const valuesList = [formIdType === 'text' ? linkId.toString() : linkId, sql`${JSON.stringify(formData.data)}`];
        
        // Ajouter les colonnes spécifiques si présentes
        if (hasUserId) {
          columnsList.push('user_id');
          // Valeur par défaut pour user_id (1 si requis)
          valuesList.push(req.user?.id || 1);
        }
        
        if (hasPropertyId) {
          columnsList.push('property_id');
          valuesList.push(null); // Valeur par défaut
        }
        
        if (hasTenantId) {
          columnsList.push('tenant_id');
          valuesList.push(null); // Valeur par défaut
        }
        
        // Ajouter created_at si présent
        if (columnNames.includes('created_at')) {
          columnsList.push('created_at');
          valuesList.push(sql`NOW()`);
        }
        
        // Ajouter updated_at si présent
        if (hasUpdatedAt) {
          columnsList.push('updated_at');
          valuesList.push(sql`NOW()`);
        }
        
        // Préparer les noms de colonnes et les valeurs pour la requête
        const columnsStr = columnsList.map(col => sql.identifier(col)).join(', ');
        
        // Requête dynamique
        await db.execute(
          sql`INSERT INTO ${sql.identifier(schemaFound)}."form_submissions" 
              (${sql.raw(columnsStr)}) 
              VALUES (${sql.join(valuesList, sql`, `)})`
        );
      } else {
        throw new Error(`Structure de table non supportée. Colonnes disponibles: ${columnNames.join(', ')}`);
      }
      
      logger.info(`Soumission de formulaire enregistrée dans la base de données (via route de compatibilité, schéma ${schemaFound})`);
    } catch (storageError) {
      logger.error('Erreur lors de l\'enregistrement de la soumission (compatibilité):', storageError);
      // Continue même en cas d'erreur lors de l'enregistrement de la soumission
    }
    
    logger.info('Traitement terminé avec succès (compatibilité)');
    return res.json({
      success: true,
      message: 'Formulaire soumis avec succès'
    });
    
  } catch (error) {
    logger.error('Error handling form submission (compatibility):', error);
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
      const oldBackgroundPath = path.join(
        process.cwd(), 
        typeof profile.backgroundImage === 'string' 
          ? profile.backgroundImage.replace(/^\//, '') 
          : ''
      );
      
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
    logger.info(`Récupération des soumissions de formulaire pour l'utilisateur ${userId} dans le schéma ${clientSchema}`);
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
    
    try {
      // Récupérer l'ID du lien demandé
      const linkId = parseInt(req.params.linkId);
      logger.info(`Recherche des soumissions pour le lien ${linkId}`);
      
      if (isNaN(linkId)) {
        logger.error(`ID de lien invalide: ${req.params.linkId}`);
        // Réinitialiser le search path avant de quitter
        await db.execute(sql`SET search_path TO public`);
        return res.status(400).json({
          success: false,
          message: 'ID de lien invalide'
        });
      }
      
      // Structure pour les soumissions
      interface FormSubmission {
        id: number;
        linkId: number;
        formData: any;
        createdAt: string;
        ipAddress?: string | null;
        userAgent?: string | null;
        propertyId?: number | null;
        tenantId?: number | null;
        userId?: number | null;
        updatedAt?: string | null;
        [key: string]: any; // Pour les champs additionnels
      }
      
      let submissions: FormSubmission[] = [];
      
      // Vérifier l'existence de la table form_submissions
      try {
        const tableCheck = await db.execute(
          sql`SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = ${clientSchema}
              AND table_name = 'form_submissions'
            )`
        );
        
        const tableExists = tableCheck.rows[0]?.exists === true;
        
        if (!tableExists) {
          logger.warn(`Table form_submissions non trouvée dans le schéma ${clientSchema}`);
        } else {
          logger.info(`Table form_submissions trouvée dans le schéma ${clientSchema}, analyse de la structure...`);
          
          // Vérifier les colonnes pour déterminer la structure
          const columnsQuery = await db.execute(
            sql`SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = ${clientSchema} 
                AND table_name = 'form_submissions'`
          );
          
          interface ColumnDef {
            name: string;
            type: string;
          }
          
          const columns = columnsQuery.rows.map((r: {column_name: string; data_type: string}) => ({ 
            name: r.column_name, 
            type: r.data_type 
          }) as ColumnDef);
          
          const hasLinkId = columns.some(col => col.name === 'link_id');
          const hasFormId = columns.some(col => col.name === 'form_id');
          const formIdType = columns.find(col => col.name === 'form_id')?.type;
          
          logger.info(`Structure de la table form_submissions: hasLinkId=${hasLinkId}, hasFormId=${hasFormId}, formIdType=${formIdType || 'N/A'}`);
          
          if (hasLinkId) {
            // Structure avec link_id (integer)
            const submissionsQuery = await db.execute(
              sql`SELECT id, link_id, form_data, created_at, 
                     ip_address, user_agent 
                  FROM ${sql.identifier(clientSchema)}."form_submissions"
                  WHERE link_id = ${linkId}
                  ORDER BY created_at DESC`
            );
            
            submissions = submissionsQuery.rows.map((row: {
              id: number;
              link_id: number;
              form_data: any;
              created_at: string;
              ip_address?: string;
              user_agent?: string;
            }) => ({
        id: row.id,
        linkId: row.link_id,
        formData: row.form_data,
              createdAt: row.created_at,
              ipAddress: row.ip_address,
              userAgent: row.user_agent
            }));
          } else if (hasFormId) {
            if (formIdType === 'text') {
              // Structure avec form_id (text)
              const submissionsQuery = await db.execute(
                sql`SELECT id, form_id, form_data, created_at, 
                       property_id, tenant_id, user_id, updated_at
                    FROM ${sql.identifier(clientSchema)}."form_submissions"
                    WHERE form_id = ${linkId.toString()}
                    ORDER BY created_at DESC`
              );
              
              submissions = submissionsQuery.rows.map((row: {
                id: number;
                form_id: string;
                form_data: any;
                created_at: string;
                property_id?: number;
                tenant_id?: number;
                user_id?: number;
                updated_at?: string;
              }) => ({
                id: row.id,
                linkId: linkId, // Utilisons l'ID du lien passé en paramètre
                formData: row.form_data,
                createdAt: row.created_at,
                // Ajoutons d'autres champs spécifiques à cette structure
                propertyId: row.property_id,
                tenantId: row.tenant_id,
                userId: row.user_id,
                updatedAt: row.updated_at
              }));
            } else {
              // Structure avec form_id (integer ou autre)
              const submissionsQuery = await db.execute(
                sql`SELECT * FROM ${sql.identifier(clientSchema)}."form_submissions"
                    WHERE CAST(form_id AS TEXT) = ${linkId.toString()} 
                       OR form_id = ${linkId}
                    ORDER BY created_at DESC`
              );
              
              submissions = submissionsQuery.rows.map((row: Record<string, any>) => {
                const formIdStr = String(row.form_id || '');
                return {
                  id: row.id,
                  linkId: formIdStr ? parseInt(formIdStr) : linkId,
                  formData: row.form_data,
                  createdAt: row.created_at,
                  // Incluons tous les autres champs disponibles
                  ...Object.entries(row)
                    .filter(([key]) => !['id', 'form_id', 'form_data', 'created_at'].includes(key))
                    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, any>)
                };
              });
            }
          } else {
            // Structure inconnue, essayons une approche générique qui tente les deux types de colonnes
            logger.warn(`Structure de table non reconnue dans ${clientSchema}, tentative avec link_id et form_id...`);
            
            // D'abord avec link_id
            try {
              const linkSubmissionsQuery = await db.execute(
                sql`SELECT * FROM ${sql.identifier(clientSchema)}."form_submissions"
                    WHERE link_id = ${linkId} 
                    ORDER BY created_at DESC`
              );
              
              if (linkSubmissionsQuery.rowCount > 0) {
                submissions = linkSubmissionsQuery.rows.map((row: Record<string, any>) => ({
                  id: row.id,
                  linkId: row.link_id,
                  formData: row.form_data,
                  createdAt: row.created_at,
                  // Autres champs dynamiques
                  ...Object.entries(row)
                    .filter(([key]) => !['id', 'link_id', 'form_data', 'created_at'].includes(key))
                    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, any>)
                }));
                
                logger.info(`Trouvé ${submissions.length} soumissions via link_id dans une structure non standard`);
              }
            } catch (linkIdError) {
              logger.warn(`Échec de la requête avec link_id: ${linkIdError}`);
            }
            
            // Si aucune soumission trouvée, essayer avec form_id (text et int)
            if (submissions.length === 0) {
              try {
                const formSubmissionsQuery = await db.execute(
                  sql`SELECT * FROM ${sql.identifier(clientSchema)}."form_submissions"
                      WHERE form_id = ${linkId.toString()} 
                         OR CAST(form_id AS TEXT) = ${linkId.toString()}
                      ORDER BY created_at DESC`
                );
                
                if (formSubmissionsQuery.rowCount > 0) {
                  submissions = formSubmissionsQuery.rows.map((row: Record<string, any>) => ({
                    id: row.id,
                    linkId: linkId,
                    formData: row.form_data,
                    createdAt: row.created_at,
                    // Autres champs dynamiques
                    ...Object.entries(row)
                      .filter(([key]) => !['id', 'form_id', 'form_data', 'created_at'].includes(key))
                      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, any>)
                  }));
                  
                  logger.info(`Trouvé ${submissions.length} soumissions via form_id dans une structure non standard`);
                }
              } catch (formIdError) {
                logger.warn(`Échec de la requête avec form_id: ${formIdError}`);
              }
            }
          }
        }
      } catch (structureError) {
        logger.error(`Erreur lors de l'analyse de la structure de la table:`, structureError);
      }
      
      logger.info(`${submissions.length} soumissions trouvées pour le lien ${linkId}`);
      
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info('Search path réinitialisé à "public"');
        
        return res.json({
          success: true,
        data: submissions
      });
    } catch (dbError) {
      // Réinitialiser le search_path en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(() => {});
      logger.error('Erreur lors de la récupération des soumissions:', dbError);
      
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des soumissions'
      });
    }
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Erreur dans la route de récupération des soumissions:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

export default router; 