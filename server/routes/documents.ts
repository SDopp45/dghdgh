import { Router } from 'express';
import { db } from "../db";
import { documents as documentsTable, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from 'multer';
import path from 'path';
import express from 'express';
import * as fsPromises from 'fs/promises';
import fs from 'fs';
import logger from '../utils/logger';
import { ensureAuth, getUserId } from '../middleware/auth';

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
router.post("/", ensureAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      logger.error('No file provided in request');
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

    const userId = getUserId(req);
    if (!userId) {
      logger.error('No authenticated user found');
      return res.status(401).json({ error: 'Non autorisé' });
    }

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

    res.status(201).json({
      ...insertedDoc,
      fileUrl: `/api/documents/files/${encodeURIComponent(insertedDoc.filePath)}`
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du document' });
  }
});

// POST endpoint for uploading multiple documents
router.post("/multiple", ensureAuth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      logger.error('No files provided in request');
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

    const userId = getUserId(req);
    if (!userId) {
      logger.error('No authenticated user found');
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const insertedDocs = [];
    const createdFiles = [];

    for (const file of (req.files as Express.Multer.File[])) {
      try {
        logger.info('Processing file:', {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype
        });

        // Vérifier que le fichier existe
        const finalPath = path.join(documentsDir, file.filename);
        if (!fs.existsSync(finalPath)) {
          logger.error(`File does not exist: ${finalPath}`);
          continue;
        }

        // Récupérer le nom personnalisé pour ce fichier s'il existe
        // On utilise l'originalname comme clé pour localiser le nom personnalisé
        const customTitle = fileCustomNames[file.originalname as keyof typeof fileCustomNames] || `${title} - ${file.originalname}`;
        logger.info(`Using title for file ${file.originalname}: ${customTitle}`);

        // Préparation des métadonnées supplémentaires
        let formDataObj: Record<string, string> = {};
        if (file.originalname in fileCustomNames) {
          formDataObj = {
            customFileName: fileCustomNames[file.originalname as keyof typeof fileCustomNames]
          };
        }

        // Insérer le document dans la base de données
        const [insertedDoc] = await db.insert(documentsTable).values({
          title: customTitle,
          type: type || documentType,
          filePath: file.filename,
          originalName: file.originalname,
          template: template === 'true',
          userId: userId,
          folderId: folderId ? parseInt(folderId) : null,
          formData: formDataObj,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        logger.info('Document created in database:', {
          id: insertedDoc.id,
          title: insertedDoc.title,
          filePath: insertedDoc.filePath
        });

        createdFiles.push({
          ...insertedDoc,
          fileUrl: `/api/documents/files/${encodeURIComponent(insertedDoc.filePath)}`
        });
      } catch (fileError) {
        logger.error(`Error processing file ${file.originalname}:`, fileError);
      }
    }

    res.status(201).json({ 
      message: `${createdFiles.length} documents créés avec succès`,
      documents: createdFiles 
    });
  } catch (error) {
    logger.error('Error in multi-document upload:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement des documents' });
  }
});

// GET all documents
router.get("/", async (req, res) => {
  try {
    logger.info('Fetching all documents - starting');
    
    try {
      // Désactiver temporairement la vérification d'authentification
      /*
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Non autorisé' });
      }
      */
      
      // Récupérer tous les documents sans filtrer par utilisateur
      const allDocuments = await db.select().from(documentsTable);
      
      logger.info(`Documents fetched successfully: ${allDocuments.length} found`);
      res.json(allDocuments || []);
    } catch (dbError) {
      logger.error('Database error in documents route:', dbError);
      // Renvoyer un tableau vide au lieu d'une erreur 500
      res.json([]);
    }
  } catch (error: unknown) {
    logger.error('Error fetching documents:', error);
    // Renvoyer un tableau vide au lieu d'une erreur 500
    res.json([]);
  }
});

// GET endpoint for a specific document
router.get("/:id", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const document = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

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

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const document = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const filePath = path.join(documentsDir, document[0].filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    res.download(filePath, document[0].originalName);
  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du document' });
  }
});

// Preview a document
router.get("/:id/preview", async (req, res) => {
  try {
    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    const document = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

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

// DELETE endpoint to remove a document
router.delete("/:id", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'ID de document invalide' });
    }

    // Get document to find file path
    const document = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Update transactions to remove references to this document
    try {
      // Update transactions that use this as the primary document
      await db.execute(
        `UPDATE transactions SET document_id = NULL 
         WHERE document_id = ${documentId}`
      );
      
      // Update transactions that include this document in their documentIds array
      await db.execute(
        `UPDATE transactions 
         SET document_ids = array_remove(document_ids, ${documentId}) 
         WHERE ${documentId} = ANY(document_ids)`
      );
      
      logger.info(`Removed references to document ${documentId} from transactions`);
    } catch (updateError) {
      logger.warn(`Error updating transaction references for document ${documentId}:`, updateError);
      // Continue even if reference updates fail
    }

    // Remove from database
    await db
      .delete(documentsTable)
      .where(eq(documentsTable.id, documentId));

    // Try to remove file
    try {
      const filePath = path.join(documentsDir, document[0].filePath);
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
      }
    } catch (fileError) {
      logger.warn(`Error removing file for document ${documentId}:`, fileError);
      // Continue even if file removal fails
    }

    res.json({ message: 'Document supprimé avec succès' });
  } catch (error) {
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

    const { id } = req.params;
    const documentId = parseInt(id);

    if (isNaN(documentId)) {
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

    if (updatedDoc.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    res.json({
      ...updatedDoc[0],
      fileUrl: `/api/documents/files/${encodeURIComponent(updatedDoc[0].filePath)}`
    });
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du document' });
  }
});

export default router; 