import { Router } from 'express';
import { db } from "../db";
import { documents as documentsTable, users } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import multer from 'multer';
import path from 'path';
import express from 'express';
import * as fsPromises from 'fs/promises';
import fs from 'fs';
import logger from '../utils/logger';
import { ensureAuth, getUserId } from '../middleware/auth';
import * as storageService from '../services/storage-service';

const router = Router();

// Configure upload directories
const uploadDir = path.resolve(process.cwd(), 'uploads');
const documentsDir = path.resolve(uploadDir, 'documents');

// Ensure directories exist with proper permissions
[uploadDir, documentsDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  } catch (error) {
    logger.error(`Error managing directory ${dir}:`, error);
    throw new Error(`Failed to manage directory: ${dir}`);
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    logger.info('Processing upload to directory:', documentsDir);
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Récupérer le titre personnalisé s'il existe
    const customName = req.body.title;
    
    // Utiliser le titre personnalisé ou le nom original
    let baseName = file.originalname;
    if (customName) {
      // Si un titre personnalisé est fourni, l'utiliser comme base (s'assurer qu'il a l'extension .pdf)
      const hasExtension = customName.toLowerCase().endsWith('.pdf');
      baseName = hasExtension ? customName : `${customName}.pdf`;
    }
    
    // Nettoyer le nom de fichier
    const safeOriginalName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${path.parse(safeOriginalName).name}-${uniqueSuffix}${path.extname(safeOriginalName)}`;
    
    logger.info('Generated filename:', filename, 'from title:', customName || 'not provided');
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    logger.info('Validating file:', file.originalname, 'mimetype:', file.mimetype);
    const validPdfTypes = [
      'application/pdf',
      'application/x-pdf',
      'application/acrobat',
      'application/vnd.pdf',
      'text/pdf',
      'text/x-pdf'
    ];
    
    if (validPdfTypes.includes(file.mimetype) || path.extname(file.originalname).toLowerCase() === '.pdf') {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers PDF sont acceptés.'));
  }
});

// POST endpoint for uploading single document
router.post("/", ensureAuth, async (req, res) => {
  try {
    // Vérifier les limites de stockage avant l'upload
    const userId = getUserId(req);
    if (!userId) {
      logger.error('No authenticated user found');
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    // Estimation de la taille du fichier à partir du Content-Length header
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > 0) {
      const hasEnoughStorage = await storageService.hasEnoughStorage(userId, contentLength);
      if (!hasEnoughStorage) {
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`);
        return res.status(413).json({ 
          error: 'Espace de stockage insuffisant', 
          storageInfo: await storageService.getUserStorageInfo(userId)
        });
      }
    }

    // Continuer avec l'upload
    upload.single('file')(req, res, async (err) => {
      if (err) {
        logger.error('Error in multer upload:', err);
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`).catch(() => {});
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'Le fichier dépasse la taille maximale autorisée (50 MB)' });
        }
        return res.status(400).json({ error: err.message || 'Erreur lors du téléchargement du fichier' });
      }

      if (!req.file) {
        logger.error('No file provided in request');
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`).catch(() => {});
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      logger.info('File received:', {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
      logger.info('Request body for document:', req.body);

      // Utiliser le titre personnalisé ou le nom du fichier original
      const { 
        title = req.file.originalname, 
        type = 'other', 
        template = false, 
        folderId = null, 
        formData = '{}'
      } = req.body;
      
      const customTitle = title || req.file.originalname;
      logger.info('Using title for document:', customTitle);

      // Traiter les métadonnées formData
      let parsedFormData = {};
      try {
        parsedFormData = typeof formData === 'string' ? JSON.parse(formData) : formData;
        logger.info('Parsed formData:', parsedFormData);
        
        // Ajouter le titre personnalisé aux métadonnées si différent du nom original
        if (customTitle !== req.file.originalname) {
          parsedFormData = {
            ...parsedFormData,
            customFileName: customTitle
          };
        }
      } catch (e) {
        logger.warn('Error parsing formData:', e);
        // En cas d'erreur, on continue avec un objet vide
      }

      try {
        const [insertedDoc] = await db.insert(documentsTable).values({
          title: customTitle,
          type: type,
          filePath: req.file.filename,
          originalName: req.file.originalname,
          template: template === 'true',
          userId: userId,
          folderId: folderId ? parseInt(folderId) : null,
          formData: parsedFormData,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        logger.info('Document created successfully:', {
          id: insertedDoc.id,
          title: insertedDoc.title,
          type: insertedDoc.type,
          filePath: insertedDoc.filePath,
          formData: insertedDoc.formData
        });

        // Final verification
        const finalPath = path.join(documentsDir, insertedDoc.filePath);
        if (!fs.existsSync(finalPath)) {
          throw new Error('Le fichier final n\'existe pas');
        }

        // Mettre à jour l'utilisation du stockage
        await storageService.updateStorageUsed(userId, req.file.size);

        // Réinitialiser le search_path après utilisation
        await db.execute(sql`SET search_path TO public`);

        res.status(201).json({
          ...insertedDoc,
          fileUrl: `/api/documents/files/${encodeURIComponent(insertedDoc.filePath)}`
        });
      } catch (error) {
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`).catch(() => {});
        throw error;
      }
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error uploading document:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du document' });
  }
});

// POST endpoint for uploading multiple documents
router.post("/multiple", ensureAuth, async (req, res) => {
  try {
    // Vérifier les limites de stockage avant l'upload
    const userId = getUserId(req);
    if (!userId) {
      logger.error('No authenticated user found');
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    // Estimation de la taille totale à partir du Content-Length header
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > 0) {
      const hasEnoughStorage = await storageService.hasEnoughStorage(userId, contentLength);
      if (!hasEnoughStorage) {
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`);
        return res.status(413).json({ 
          error: 'Espace de stockage insuffisant', 
          storageInfo: await storageService.getUserStorageInfo(userId)
        });
      }
    }

    // Continuer avec l'upload
    upload.array('files', 10)(req, res, async (err) => {
      if (err) {
        logger.error('Error in multer upload:', err);
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`).catch(() => {});
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'Un fichier dépasse la taille maximale autorisée (50 MB)' });
        }
        return res.status(400).json({ error: err.message || 'Erreur lors du téléchargement des fichiers' });
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        logger.error('No files provided in request');
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`).catch(() => {});
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      logger.info(`Received ${req.files.length} files`);
      logger.info('Request body for multiple documents:', req.body);

      const { 
        type = 'other', 
        documentType = 'other',
        template = false, 
        title = 'Document',
        folderId = null,
        customNames = '{}' // Nouveau champ pour stocker les noms personnalisés par fichier
      } = req.body;

      // Récupérer les noms personnalisés pour chaque fichier s'ils existent
      let fileCustomNames = {};
      try {
        fileCustomNames = typeof customNames === 'string' ? JSON.parse(customNames) : customNames;
        logger.info('Custom names for files:', fileCustomNames);
      } catch (e) {
        logger.warn('Error parsing customNames:', e);
        // En cas d'erreur, on continue avec un objet vide
      }

      try {
        // Créer les entrées dans la base de données pour chaque fichier
        const insertPromises = [];
        let totalSize = 0;

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          totalSize += file.size;
          
          // Déterminer le titre pour ce fichier
          let fileTitle;
          if (req.files.length === 1) {
            // S'il n'y a qu'un seul fichier, utiliser le titre général
            fileTitle = title;
          } else {
            // Sinon essayer de trouver un titre personnalisé, ou utiliser le nom original
            fileTitle = fileCustomNames[i] || fileCustomNames[file.originalname] || file.originalname;
          }

          insertPromises.push(
            db.insert(documentsTable).values({
              title: fileTitle,
              type: type,
              filePath: file.filename,
              originalName: file.originalname,
              template: template === 'true',
              userId: userId,
              folderId: folderId ? parseInt(folderId) : null,
              formData: {
                customFileName: fileTitle,
                documentType: documentType
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }).returning()
          );
        }

        const results = await Promise.all(insertPromises);
        const insertedDocs = results.map(result => result[0]);

        // Mettre à jour l'utilisation du stockage
        await storageService.updateStorageUsed(userId, totalSize);

        // Réinitialiser le search_path après utilisation
        await db.execute(sql`SET search_path TO public`);

        res.status(201).json({
          success: true,
          count: insertedDocs.length,
          documents: insertedDocs.map(doc => ({
            ...doc,
            fileUrl: `/api/documents/files/${encodeURIComponent(doc.filePath)}`
          }))
        });
      } catch (error) {
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`).catch(() => {});
        throw error;
      }
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error uploading multiple documents:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement des documents' });
  }
});

// Get all documents - ensure authentication to respect schema-based security
router.get("/", ensureAuth, async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis la requête
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Le chemin de recherche PostgreSQL filtre automatiquement les documents en fonction du schéma de l'utilisateur
    const all = await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
    
    logger.info(`Documents fetched successfully: ${all.length} documents found`);
    
    // Fetch and associate folder information
    const docs = await Promise.all(all.map(async doc => {
      if (doc.folderId) {
        const [folder] = await db.select().from(folders).where(eq(folders.id, doc.folderId));
        return { ...doc, folder };
      }
      return doc;
    }));
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(docs);
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error(`Error fetching documents: ${error}`);
    res.status(500).json({ error: "Error fetching documents" });
  }
});

// GET endpoint for a specific document
router.get("/:id", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const document = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (document.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const filePath = path.join(documentsDir, document[0].filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    res.json({
      ...document[0],
      fileExists: true,
      fileUrl: `/api/documents/files/${encodeURIComponent(document[0].filePath)}`
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error fetching document:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du document' });
  }
});

// GET endpoint to download a document by ID
router.get("/:id/download", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const document = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (document.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const filePath = path.join(documentsDir, document[0].filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    res.download(filePath, document[0].originalName);
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error downloading document:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du document' });
  }
});

// Preview a document
router.get("/:id/preview", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const document = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (document.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const filePath = path.join(documentsDir, document[0].filePath);
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Set appropriate headers for PDF streaming and security
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document[0].title)}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Headers de base sans restrictions Cross-Origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Stream the file
    const stream = fs.createReadStream(filePath);
    
    // Handle potential streaming errors
    stream.on('error', (error) => {
      logger.error(`Error streaming file: ${filePath}`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors de la lecture du fichier' });
      }
    });
    
    stream.pipe(res);
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error("Error previewing document:", error);
    res.status(500).json({ error: 'Erreur lors de la prévisualisation du document' });
  }
});

// Serve document files
router.get("/files/:filename", ensureAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(documentsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error serving document file:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du fichier' });
  }
});

// DELETE endpoint for deleting a document by ID
router.delete("/:id", ensureAuth, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    // Récupérer les informations du document avant suppression
    const [document] = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId));

    if (!document) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Vérifier que l'utilisateur est autorisé à supprimer ce document
    if (document.userId !== userId) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer ce document' });
    }

    // Obtenir la taille du fichier pour mettre à jour le stockage
    let fileSize = 0;
    const filePath = path.join(documentsDir, document.filePath);
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }
    } catch (err) {
      logger.warn(`Error getting file size for document ${documentId}:`, err);
    }

    // Supprimer l'entrée de la base de données
    await db.delete(documentsTable).where(eq(documentsTable.id, documentId));

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    // Supprimer le fichier physique
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`File deleted: ${filePath}`);
      } else {
        logger.warn(`File not found for deletion: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error deleting file ${filePath}:`, error);
      // Continue même si la suppression du fichier échoue
    }

    // Mettre à jour l'utilisation du stockage (valeur négative pour réduire)
    if (fileSize > 0) {
      await storageService.updateStorageUsed(userId, -fileSize);
    }

    res.json({ 
      success: true,
      message: 'Document supprimé avec succès',
      id: documentId,
      fileName: document.originalName
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error deleting document:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du document' });
  }
});

// PUT endpoint to update document information
router.put("/:id", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const { title, type, folderId, formData } = req.body;

    // Update document in database
    const updatedDoc = await db
      .update(documentsTable)
      .set({
        title: title,
        type: type,
        folderId: folderId ? parseInt(folderId) : null,
        formData: formData || {},
        updatedAt: new Date()
      })
      .where(eq(documentsTable.id, documentId))
      .returning();

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (updatedDoc.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    res.json({
      ...updatedDoc[0],
      fileUrl: `/api/documents/files/${encodeURIComponent(updatedDoc[0].filePath)}`
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error updating document:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du document' });
  }
});

export default router; 