import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import logger from '../utils/logger';
import { enhanceImageWithLocalAI } from '../services/image-enhancement';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { ensureAuth, getUserId } from '../middleware/auth';

const router = Router();

// Nouveau dossier spécifique pour les améliorations d'images
const ENHANCED_IMAGES_DIR = 'uploads/ameliorationimages';

// Fonction pour nettoyer le dossier des images temporaires
const cleanupOldImages = async () => {
  try {
    const dir = path.join(process.cwd(), ENHANCED_IMAGES_DIR);
    const exists = await fs.promises.access(dir).then(() => true).catch(() => false);
    
    if (!exists) {
      return;
    }
    
    const files = await fs.promises.readdir(dir);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
    
    for (const file of files) {
      if (file.startsWith('enhanced-')) {
        try {
          const filePath = path.join(dir, file);
          const stats = await fs.promises.stat(filePath);
          
          // Supprimer les fichiers créés il y a plus de 24 heures
          if (now - stats.ctimeMs > oneDayMs) {
            await fs.promises.unlink(filePath);
            logger.info(`Suppression d'une image temporaire: ${file}`);
          }
        } catch (err) {
          logger.error(`Erreur lors de la suppression du fichier ${file}:`, err);
        }
      }
    }
  } catch (err) {
    logger.error('Erreur lors du nettoyage des images temporaires:', err);
  }
};

// Nettoyer les anciennes images au démarrage et toutes les 6 heures
cleanupOldImages();
setInterval(cleanupOldImages, 6 * 60 * 60 * 1000);

// Configuration plus robuste de multer pour la gestion des fichiers
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      logger.error(`Rejected file upload - invalid type: ${file.mimetype}`);
      cb(new Error('Only .jpeg, .png and .webp format allowed!'));
      return;
    }
    logger.info(`Accepting file upload: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  }
});

// Middleware de gestion des erreurs de multer
const handleMulterErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer error:', err);
    return res.status(400).json({
      error: 'Erreur de téléchargement',
      details: err.message
    });
  } else if (err) {
    logger.error('Upload error:', err);
    return res.status(400).json({
      error: 'Erreur de téléchargement',
      details: err.message
    });
  }
  next();
};

router.post('/', ensureAuth, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'watermark', maxCount: 1 }
]), handleMulterErrors, async (req: Request, res: Response) => {
  try {
    // Récupérer l'ID utilisateur
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête si nécessaire
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imageFile = files?.['image']?.[0];
    const watermarkFile = files?.['watermark']?.[0];

    const {
      enhancement: enhancementType,
      watermarkSettings,
      style,
      intensity,
      format = 'webp',
      quality = 92
    } = req.body;

    logger.info('Processing enhancement request', {
      enhancementType,
      style,
      intensity,
      format,
      quality,
      hasImage: !!imageFile,
      hasWatermark: !!watermarkFile,
    });

    if (!imageFile) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!enhancementType) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Enhancement type is required' });
    }

    let parsedWatermarkSettings;
    try {
      parsedWatermarkSettings = watermarkSettings ? JSON.parse(watermarkSettings) : undefined;
    } catch (e) {
      logger.warn('Failed to parse watermark settings:', e);
      parsedWatermarkSettings = undefined;
    }

    // Crée le dossier ameliorationimages s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), ENHANCED_IMAGES_DIR);
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    // Traitement de l'image avec protection contre les erreurs
    try {
      // Traitement de l'image
      const enhancedBuffer = await enhanceImageWithLocalAI(imageFile.buffer, enhancementType, {
        style,
        intensity: parseFloat(intensity) || 1,
        format,
        quality: parseInt(quality as string) || 92,
        watermarkSettings: parsedWatermarkSettings,
        watermarkBuffer: watermarkFile?.buffer
      });

      // Sauvegarde du fichier avec un nom unique
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const filename = `enhanced-${timestamp}-${uniqueId}.${format}`;
      const outputPath = path.join(uploadsDir, filename);

      await fs.promises.writeFile(outputPath, enhancedBuffer);

      // Réinitialiser le search_path après utilisation
      await db.execute(sql`SET search_path TO public`);

      logger.info('Enhancement completed successfully', {
        filename,
        type: enhancementType,
        format
      });

      return res.json({
        imageUrl: `/${ENHANCED_IMAGES_DIR}/${filename}`,
        method: 'sharp',
        enhancementType,
        format
      });
      
    } catch (processingError) {
      // Réinitialiser le search_path en cas d'erreur
      await db.execute(sql`SET search_path TO public`).catch(() => {});
      
      logger.error('Error during image processing:', processingError);
      
      // Générer une image d'erreur
      const errorBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite([{
        input: Buffer.from(`
          <svg width="800" height="600">
            <rect width="100%" height="100%" fill="#f8f9fa" />
            <text x="400" y="250" font-family="Arial" font-size="24" text-anchor="middle" fill="#dc3545">
              Erreur de traitement
            </text>
            <text x="400" y="300" font-family="Arial" font-size="16" text-anchor="middle" fill="#6c757d">
              ${processingError instanceof Error ? processingError.message : 'Erreur inconnue'}
            </text>
          </svg>
        `),
        gravity: 'center'
      }])
      .webp({ quality: 90 })
      .toBuffer();
      
      // Sauvegarder l'image d'erreur
      const errorFilename = `error-${Date.now()}.webp`;
      const errorPath = path.join(uploadsDir, errorFilename);
      
      await fs.promises.writeFile(errorPath, errorBuffer);
      
      return res.status(500).json({
        error: 'Erreur lors du traitement de l\'image',
        errorImage: `/${ENHANCED_IMAGES_DIR}/${errorFilename}`,
        details: processingError instanceof Error ? processingError.message : 'Erreur inconnue'
      });
    }

  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Unhandled error processing image:', error);
    return res.status(500).json({
      error: 'Erreur lors du traitement de l\'image',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Ajouter la route pour le transfert de style qui est appelée dans le frontend
router.post('/style-transfer', ensureAuth, upload.single('image'), async (req, res) => {
  try {
    // Récupérer l'ID utilisateur
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête si nécessaire
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const imageFile = req.file;
    const { style, prompt, strength } = req.body;

    logger.info('Processing style transfer request', {
      style,
      prompt,
      strength,
      hasImage: !!imageFile
    });

    if (!imageFile) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!style) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Style parameter is required' });
    }

    // Traitement de l'image avec transfert de style
    const enhancedBuffer = await enhanceImageWithLocalAI(imageFile.buffer, `style-${style}`, {
      style,
      intensity: parseFloat(strength) || 0.5,
      format: 'webp',
      quality: 92
    });

    // Sauvegarde du fichier
    const filename = `styled-${Date.now()}.webp`;
    const outputPath = path.join(process.cwd(), ENHANCED_IMAGES_DIR, filename);

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, enhancedBuffer);

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    logger.info('Style transfer completed successfully', {
      filename,
      style
    });

    // Analyse simple de l'image pour créer une critique fictive
    const analysis = {
      description: `Image améliorée avec le style "${style}"`,
      suggestions: [
        "Ajuster la luminosité pour un meilleur rendu",
        "Considérer l'ajout d'un filigrane pour protéger votre image"
      ],
      lighting: 8,
      composition: 7
    };

    return res.json({
      imageUrl: `/${ENHANCED_IMAGES_DIR}/${filename}`,
      method: 'sharp',
      analysis
    });

  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Error processing style transfer:', error);
    return res.status(500).json({
      error: 'Erreur lors du transfert de style',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour la génération d'images
router.post('/generate', ensureAuth, upload.none(), async (req, res) => {
  try {
    // Récupérer l'ID utilisateur
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête si nécessaire
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { prompt, style, ratio } = req.body;

    logger.info('Processing image generation request', {
      prompt,
      style,
      ratio
    });

    if (!prompt) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Logique de génération d'image simplifiée
    // Dans un vrai environnement, cela ferait appel à un modèle comme DALL-E ou Stable Diffusion
    const width = ratio === 'landscape' ? 1200 : ratio === 'portrait' ? 800 : 1000;
    const height = ratio === 'landscape' ? 800 : ratio === 'portrait' ? 1200 : 1000;

    // Créer une image de base avec le texte du prompt
    const generatedBuffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: style === 'artistic' ? { r: 120, g: 80, b: 180, alpha: 1 } : 
                   style === 'realistic' ? { r: 70, g: 110, b: 90, alpha: 1 } : 
                   { r: 100, g: 100, b: 120, alpha: 1 }
      }
    })
    .composite([{
      input: Buffer.from(`
        <svg width="${width}" height="${height}">
          <rect width="100%" height="100%" fill="none" />
          <text x="${width/2}" y="${height/2-20}" font-family="Arial" font-size="24" text-anchor="middle" fill="white">
            Image générée
          </text>
          <text x="${width/2}" y="${height/2+20}" font-family="Arial" font-size="16" text-anchor="middle" fill="rgba(255,255,255,0.8)">
            ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}
          </text>
          <text x="${width/2}" y="${height/2+60}" font-family="Arial" font-size="14" text-anchor="middle" fill="rgba(255,255,255,0.6)">
            Style: ${style}, Format: ${ratio}
          </text>
        </svg>
      `),
      gravity: 'center'
    }])
    .blur(10)
    .webp({ quality: 90 })
    .toBuffer();

    // Sauvegarde du fichier
    const filename = `generated-${Date.now()}.webp`;
    const outputPath = path.join(process.cwd(), ENHANCED_IMAGES_DIR, filename);

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, generatedBuffer);

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    logger.info('Image generation completed successfully', {
      filename,
      prompt: prompt.substring(0, 30),
      style,
      ratio
    });

    return res.json({
      imageUrl: `/${ENHANCED_IMAGES_DIR}/${filename}`,
      prompt,
      style,
      ratio
    });

  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Error generating image:', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération de l\'image',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Ajouter une route pour le nettoyage des images temporaires
router.post('/cleanup', ensureAuth, async (req, res) => {
  try {
    // Pas besoin de changer de schéma ici car c'est une opération sur le système de fichiers
    await cleanupOldImages();
    return res.json({ success: true, message: 'Images temporaires nettoyées avec succès' });
  } catch (error) {
    logger.error('Error cleaning up temporary images:', error);
    return res.status(500).json({
      error: 'Erreur lors du nettoyage des images temporaires',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

function getGravity(position: string): sharp.Gravity {
  const gravityMap: { [key: string]: sharp.Gravity } = {
    'top-left': 'northwest',
    'top-right': 'northeast',
    'bottom-left': 'southwest',
    'bottom-right': 'southeast',
    'center': 'center'
  };
  return gravityMap[position] || 'southeast';
}

async function applyWatermark(image: sharp.Sharp, options: any): Promise<sharp.Sharp> {
  if (!options?.watermarkType || !options?.settings) {
    logger.warn('No watermark options provided');
    return image;
  }

  try {
    if (options.watermarkType === 'logo' && options.watermark?.buffer) {
      logger.info('Applying logo watermark with settings:', options.settings);
      const metadata = await image.metadata();
      const width = metadata.width || 1024;
      const height = metadata.height || 1024;

      const watermarkSize = Math.min(width, height) * (options.settings.size / 100);
      const watermarkImage = await sharp(options.watermark.buffer)
        .resize(Math.round(watermarkSize), Math.round(watermarkSize), {
          fit: 'inside',
          withoutEnlargement: true
        })
        .composite([{
          input: Buffer.from(`<svg><rect width="100%" height="100%" fill="white" fill-opacity="${options.settings.opacity / 100}"/></svg>`),
          blend: 'multiply'
        }])
        .toBuffer();

      logger.info('Logo watermark processed successfully');
      return image.composite([{
        input: watermarkImage,
        gravity: getGravity(options.settings.position),
        blend: 'over'
      }]);
    }

    if (options.watermarkType === 'text' && options.settings?.text) {
      logger.info('Applying text watermark with settings:', options.settings);
      const { text, font = 'Arial', color = '#000000', size, position, opacity } = options.settings;

      return image.composite([{
        input: Buffer.from(`
          <svg width="1000" height="1000">
            <style>
              .text { 
                font-family: ${font}, sans-serif; 
                font-size: ${size * 10}px;
                fill: ${color};
                fill-opacity: ${opacity / 100};
              }
            </style>
            <text
              x="50%"
              y="50%"
              text-anchor="middle"
              dominant-baseline="middle"
              class="text"
            >${text}</text>
          </svg>
        `),
        gravity: getGravity(position),
        blend: 'over'
      }]);
    }

    logger.warn('Invalid watermark configuration');
    return image;
  } catch (error) {
    logger.error('Error applying watermark:', error);
    throw new Error('Failed to apply watermark');
  }
}

async function enhanceImageWithSharp(buffer: Buffer, type: string, options?: any): Promise<Buffer> {
  let pipeline = sharp(buffer);
  const intensity = options?.intensity || 1;

  try {
    logger.info(`Starting image enhancement: ${type} with intensity ${intensity}`);

    switch (type) {
      case 'real-estate-filter':
        const realEstateStyle = options?.style || 'luxury-interior';
        switch (realEstateStyle) {
          case 'luxury-interior':
            pipeline = pipeline
              .modulate({ brightness: 1.1, saturation: 1.2 })
              .tint({ r: 255, g: 240, b: 220 })
              .gamma(1.1);
            break;
          case 'modern-apartment':
            pipeline = pipeline
              .modulate({ brightness: 1.15, saturation: 0.9 })
              .tint({ r: 220, g: 230, b: 255 })
              .gamma(1.2);
            break;
          case 'cozy-house':
            pipeline = pipeline
              .modulate({ brightness: 1.05, saturation: 1.3 })
              .tint({ r: 255, g: 235, b: 215 })
              .gamma(1.2);
            break;
          case 'office-space':
            pipeline = pipeline
              .modulate({ brightness: 1.2, saturation: 0.95 })
              .gamma(1.1);
            break;
          case 'high-end-property':
            pipeline = pipeline
              .modulate({ brightness: 1.1, saturation: 1.15 })
              .tint({ r: 250, g: 245, b: 240 })
              .gamma(1.2);
            break;
          case 'urban-loft':
            pipeline = pipeline
              .modulate({ brightness: 1.2, saturation: 0.85 })
              .tint({ r: 230, g: 230, b: 235 })
              .gamma(1.15);
            break;
        }
        break;

      case 'lighting-filter':
        const lightingStyle = options?.style || 'bright-day';
        switch (lightingStyle) {
          case 'bright-day':
            pipeline = pipeline
              .modulate({ brightness: 1.1, saturation: 0.9 })
              .gamma(1.1);
            break;
          case 'cloudy-day':
            pipeline = pipeline
              .modulate({ brightness: 1.2, saturation: 1.1 })
              .gamma(1.1);
            break;
          case 'golden-hour':
            pipeline = pipeline
              .modulate({ brightness: 1.05, saturation: 1.3, hue: 5 })
              .tint({ r: 255, g: 230, b: 200 })
              .gamma(1.2);
            break;
          case 'indoor-light':
            pipeline = pipeline
              .modulate({ brightness: 1.15, saturation: 1.1 })
              .tint({ r: 255, g: 245, b: 235 })
              .gamma(1.15);
            break;
        }
        break;
      case 'brighten':
        const brightnessStyle = options?.style || 'natural';
        switch (brightnessStyle) {
          case 'vivid':
            pipeline = pipeline.modulate({ brightness: 1 + (0.5 * intensity), saturation: 1.2 });
            break;
          case 'soft':
            pipeline = pipeline.modulate({ brightness: 1 + (0.3 * intensity), saturation: 0.9 });
            break;
          case 'dramatic':
            pipeline = pipeline.modulate({ brightness: 1 + (0.4 * intensity), saturation: 1.3 }).gamma(1.2);
            break;
          case 'natural':
            pipeline = pipeline.modulate({ brightness: 1 + (0.3 * intensity), saturation: 1.1 });
            break;
          default:
            pipeline = pipeline.modulate({ brightness: 1 + (0.3 * intensity), saturation: 1.1 });
        }
        pipeline = pipeline.normalize().gamma(1.1);
        break;

      case 'enhance-resolution':
        const resolutionStyle = options?.style || 'sharp';
        switch (resolutionStyle) {
          case 'smooth':
            pipeline = pipeline.sharpen({ sigma: 1.0 * intensity, m1: 1, m2: 1.5 });
            break;
          case 'detailed':
            pipeline = pipeline.sharpen({ sigma: 1.5 * intensity, m1: 2, m2: 2.5 });
            break;
          case 'sharp':
          default:
            pipeline = pipeline.sharpen({ sigma: 1.2 * intensity, m1: 1.5, m2: 2.0 });
        }
        pipeline = pipeline.normalize();
        break;

      case 'enhance-colors':
        const colorStyle = options?.style || 'natural';
        switch (colorStyle) {
          case 'vibrant':
            pipeline = pipeline.modulate({ saturation: 1 + (0.5 * intensity), brightness: 1.1 });
            break;
          case 'warm':
            pipeline = pipeline.modulate({ saturation: 1 + (0.3 * intensity), brightness: 1.05 })
              .tint({ r: 255, g: 240, b: 220 });
            break;
          case 'cool':
            pipeline = pipeline.modulate({ saturation: 1 + (0.3 * intensity), brightness: 1.05 })
              .tint({ r: 220, g: 240, b: 255 });
            break;
          case 'natural':
          default:
            pipeline = pipeline.modulate({ saturation: 1 + (0.2 * intensity), brightness: 1.05 });
        }
        pipeline = pipeline.normalize().gamma(1.1);
        break;

      case 'sharpen':
        const sharpStyle = options?.style || 'medium';
        switch (sharpStyle) {
          case 'soft':
            pipeline = pipeline.sharpen({ sigma: 0.8 * intensity, m1: 1, m2: 1.5 });
            break;
          case 'strong':
            pipeline = pipeline.sharpen({ sigma: 2.0 * intensity, m1: 2, m2: 3.0 });
            break;
          case 'medium':
          default:
            pipeline = pipeline.sharpen({ sigma: 1.5 * intensity, m1: 1.5, m2: 2.0 });
        }
        pipeline = pipeline.normalize();
        break;
      case 'add-logo':
      case 'add-watermark':
        pipeline = pipeline.normalize();
        break;
      case 'convert-format':
        pipeline = pipeline.normalize();
        break;
      case 'specialty-filter':
        const specialtyStyle = options?.style || 'hotel-style';
        switch (specialtyStyle) {
          case 'hotel-style':
            pipeline = pipeline
              .modulate({ brightness: 1.1, saturation: 1.2 })
              .tint({ r: 250, g: 245, b: 240 })
              .gamma(1.1);
            break;
          case 'restaurant':
            pipeline = pipeline
              .modulate({ brightness: 1.05, saturation: 1.3 })
              .tint({ r: 255, g: 235, b: 220 })
              .gamma(1.15);
            break;
          case 'garden-view':
            pipeline = pipeline
              .modulate({ brightness: 1.1, saturation: 1.4, hue: -5 })
              .normalize();
            break;
          case 'pool-area':
            pipeline = pipeline
              .modulate({ brightness: 1.15, saturation: 1.2, hue: 5 })
              .normalize();
            break;
        }
        break;
      case 'seasonal-filter':
        const seasonStyle = options?.style || 'summer';
        switch (seasonStyle) {
          case 'spring':
            pipeline = pipeline
              .modulate({ brightness: 1.1, saturation: 1.2, hue: -5 })
              .tint({ r: 240, g: 255, b: 245 })
              .normalize();
            break;
          case 'summer':
            pipeline = pipeline
              .modulate({ brightness: 1.15, saturation: 1.3 })
              .tint({ r: 255, g: 245, b: 235 })
              .normalize();
            break;
          case 'autumn':
            pipeline = pipeline
              .modulate({ brightness: 1.05, saturation: 1.3, hue: 5 })
              .tint({ r: 255, g: 235, b: 215 })
              .gamma(1.1);
            break;
          case 'winter':
            pipeline = pipeline
              .modulate({ brightness: 1.2, saturation: 0.9 })
              .tint({ r: 235, g: 245, b: 255 })
              .gamma(1.05);
            break;
        }
        break;
      default:
        pipeline = pipeline.modulate({ brightness: 1.1, saturation: 1.1 }).sharpen().normalize();
    }

    // Apply watermark if needed
    if (['add-logo', 'add-watermark'].includes(type)) {
      logger.info('Applying watermark...');
      pipeline = await applyWatermark(pipeline, options);
    }

    // Format conversion
    const format = options?.format || 'webp';
    const quality = options?.quality || 92;

    let finalPipeline;
    switch (format) {
      case 'jpeg':
        finalPipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        finalPipeline = pipeline.png({ quality: Math.floor(quality * 0.8) });
        break;
      case 'avif':
        finalPipeline = pipeline.avif({ quality });
        break;
      case 'webp':
      default:
        finalPipeline = pipeline.webp({
          quality,
          effort: 6,
          smartSubsample: true,
          force: true
        });
    }

    const finalBuffer = await finalPipeline.toBuffer();
    logger.info(`Image processing completed successfully in ${format} format`);
    return finalBuffer;

  } catch (error) {
    logger.error('Error in image processing:', error);
    throw error;
  }
}

export default router;