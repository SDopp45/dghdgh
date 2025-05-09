import { Router } from 'express';
import { db } from "@db";
import { eq, inArray, and, isNull, sql } from "drizzle-orm";
import { ensureAuth } from '../middleware/auth';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

import { folders, documents } from "@shared/schema";
import type { InferSelectModel } from 'drizzle-orm';

const router = Router();


type Folder = InferSelectModel<typeof folders>;
type Document = InferSelectModel<typeof documents>;

// Create a new folder
router.post("/", ensureAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${req.user.id}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const { name, parentId } = req.body;

    const insertedFolders = await db.insert(folders)
      .values({
        name,
        parentId: parentId || null,
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (!insertedFolders.length) {
      throw new Error('Failed to create folder');
    }

    res.status(201).json(insertedFolders[0]);
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error creating folder:', error);
    res.status(500).json({ error: 'Erreur lors de la création du dossier' });
  }
});

// Get all folders for the current user
router.get("/", ensureAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${req.user.id}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    logger.info("Fetching all folders");
    
    // Récupérer les dossiers
    const allFolders = await db.select().from(folders).catch(err => {
      logger.error("Database error in folders route:", err);
      return [];
    });
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(allFolders || []);
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error("Error fetching folders:", error);
    // Retourner un tableau vide au lieu d'une erreur 500
    res.json([]);
  }
});

// Download folder as ZIP
router.get("/:id/download", ensureAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${req.user.id}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const folderId = parseInt(req.params.id);
    logger.info(`Starting download for folder ID: ${folderId}`);

    // Get folder details
    const foundFolders = await db
      .select()
      .from(folders)
      .where(and(
        eq(folders.id, folderId),
        eq(folders.userId, req.user.id)
      ));

    if (!foundFolders || foundFolders.length === 0) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.warn(`Folder not found: ${folderId}`);
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    const folder = foundFolders[0];

    // Get all documents in the folder
    const folderDocuments = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.folderId, folderId),
        eq(documents.userId, req.user.id)
      ));

    if (!folderDocuments || folderDocuments.length === 0) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      logger.info(`No documents found in folder: ${folderId}`);
      return res.status(404).json({ error: 'Aucun document dans ce dossier' });
    }

    // Réinitialiser le search_path après avoir récupéré les données
    await db.execute(sql`SET search_path TO public`);

    // Verify uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const documentsDir = path.join(uploadsDir, 'documents');
    const tempDir = path.join(uploadsDir, 'temp');

    // Create directories if they don't exist
    [uploadsDir, documentsDir, tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });

    // Create export directory with sanitized folder name
    const sanitizedFolderName = folder.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const zipFileName = `${sanitizedFolderName}_${Date.now()}.zip`;
    const zipFilePath = path.join(tempDir, zipFileName);

    // Create ZIP archive
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Listen for archive errors
    archive.on('error', (err) => {
      logger.error('Archive error:', err);
      res.status(500).json({ error: 'Erreur lors de la création de l\'archive' });
    });

    // Set response headers
    res.attachment(zipFileName);
    res.setHeader('Content-Type', 'application/zip');

    // Pipe archive data to response
    archive.pipe(res);

    // Add documents to archive
    for (const doc of folderDocuments) {
      try {
        const filePath = path.join(documentsDir, doc.filePath);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `${doc.title}${path.extname(doc.filePath)}` });
          logger.info(`Added file to archive: ${doc.title}`);
        } else {
          logger.warn(`File not found: ${filePath}`);
        }
      } catch (err) {
        logger.error('Error adding file to archive:', err);
      }
    }

    // Finalize archive
    await archive.finalize();

  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error downloading folder:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du dossier' });
  }
});

// Update a folder
router.patch("/:id", ensureAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${req.user.id}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const { id } = req.params;
    const { name, parentId } = req.body;

    const updatedFolder = await db
      .update(folders)
      .set({
        name,
        parentId: parentId || null,
        updatedAt: new Date()
      })
      .where(and(
        eq(folders.id, parseInt(id)),
        eq(folders.userId, req.user.id)
      ))
      .returning();

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (!updatedFolder.length) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    res.json(updatedFolder[0]);
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error updating folder:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du dossier' });
  }
});

// Delete a folder
router.delete("/:id", ensureAuth, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${req.user.id}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    const { id } = req.params;
    const folderId = parseInt(id);

    logger.info(`Attempting to delete folder: ${folderId}`);

    const folderDocuments = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.folderId, folderId),
        eq(documents.userId, req.user.id)
      ));

    if (folderDocuments.length > 0) {
      // Si nous avons des documents, mettre à jour leur folderId à null
      await db
        .update(documents)
        .set({ folderId: null })
        .where(and(
          eq(documents.folderId, folderId),
          eq(documents.userId, req.user.id)
        ));
    }

    // Supprimer le dossier
    const deletedFolders = await db
      .delete(folders)
      .where(and(
        eq(folders.id, folderId),
        eq(folders.userId, req.user.id)
      ))
      .returning();

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    if (!deletedFolders.length) {
      logger.error(`Failed to delete folder: ${folderId}`);
      return res.status(500).json({ error: 'Erreur lors de la suppression du dossier' });
    }

    logger.info(`Successfully deleted folder: ${folderId}`);
    res.json({ success: true, deletedFolder: deletedFolders[0] });

  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    logger.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du dossier' });
  }
});

export default router;