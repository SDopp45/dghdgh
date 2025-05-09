import { Router } from "express";
import { db } from "../db";
import { visits, insertVisitSchema } from "@shared/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import logger from "../utils/logger";
import { ZodError } from "zod";
import { formatInTimeZone } from 'date-fns-tz';
import { ensureAuth, getUserId } from "../middleware/auth";
import { sql } from "drizzle-orm";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getClientSchemaName, getClientSubdirectory } from '../utils/storage-helpers';

const router = Router();

// Configuration de multer pour les rapports de visite
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = getUserId(req);
    
    if (userId) {
      // Utiliser le dossier spécifique au client pour les rapports de visite
      const clientSchema = getClientSchemaName(userId);
      const clientVisitReportsDir = getClientSubdirectory(userId, 'visit-reports');
      logger.info(`Upload de rapport de visite: utilisation du dossier client ${clientSchema}/visit-reports`);
      cb(null, clientVisitReportsDir);
    } else {
      // Fallback sur le répertoire legacy si pas d'utilisateur
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const visitReportsDir = path.join(uploadsDir, 'visit-reports');
      
      // Créer le dossier s'il n'existe pas
      try {
        if (!fs.existsSync(visitReportsDir)) {
          fs.mkdirSync(visitReportsDir, { recursive: true });
        }
      } catch (error) {
        logger.error('Erreur lors de la création du répertoire visit-reports:', error);
      }
      
      logger.info('Upload de rapport de visite: utilisation du dossier legacy');
      cb(null, visitReportsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, 'visit-report-' + uniqueSuffix + path.extname(safeOriginalName));
  }
});

const uploadVisitReport = multer({ storage });

// Route for creating a new visit
router.post("/", ensureAuth, async (req, res) => {
  const visitLogger = logger.child({ context: 'Visits' });
  
  try {
    const user = req.user as any;
    visitLogger.info(`Creating new visit for user ${user.id} with data:`, { 
      ...req.body,
      email: '***@***.***' // Mask email for logging
    });
    
    // Définir le schéma client
    const clientSchema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Configurer le search_path
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    visitLogger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${user.id}`);

    try {
      // Validate and transform the data using our Zod schema
      const validatedData = insertVisitSchema.parse({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        datetime: req.body.datetime,
        visitType: req.body.visitType,
        propertyId: req.body.propertyId || null,
        manualAddress: req.body.manualAddress || null,
        message: req.body.message || null,
        status: "pending",
        archived: false,
        source: req.body.source || "manual",
        documents: req.body.documents || []
      });

      visitLogger.info('Validated data:', {
        ...validatedData,
        email: '***@***.***'
      });
      
      const result = await db.execute(sql`
        INSERT INTO visits (
          first_name, last_name, email, phone, datetime, visit_type, 
          property_id, manual_address, message, status, archived, 
          agent_id, source, documents, reminder_sent, created_at, updated_at
        ) VALUES (
          ${validatedData.firstName},
          ${validatedData.lastName},
          ${validatedData.email},
          ${validatedData.phone},
          ${validatedData.datetime},
          ${validatedData.visitType},
          ${validatedData.propertyId},
          ${validatedData.manualAddress},
          ${validatedData.message},
          ${"pending"},
          ${false},
          ${user.id},
          ${validatedData.source || "manual"},
          ${validatedData.documents || []},
          ${false},
          NOW(), NOW()
        ) RETURNING *
      `);
      
      const newVisitDirect = result.rows[0];
      visitLogger.info('Visit created successfully with direct SQL:', { visitId: newVisitDirect.id });

      // Format the response to match what the frontend expects
      const formattedVisit = {
        id: newVisitDirect.id,
        firstName: newVisitDirect.first_name,
        lastName: newVisitDirect.last_name,
        email: newVisitDirect.email,
        phone: newVisitDirect.phone,
        datetime: formatInTimeZone(new Date(newVisitDirect.datetime), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
        rawDatetime: new Date(newVisitDirect.datetime).toISOString(),
        visitType: newVisitDirect.visit_type,
        status: newVisitDirect.status,
        propertyId: newVisitDirect.property_id,
        manualAddress: newVisitDirect.manual_address,
        message: newVisitDirect.message,
        source: newVisitDirect.source,
        documents: newVisitDirect.documents,
        archived: newVisitDirect.archived
      };
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('newVisit', formattedVisit);
      }

      res.status(201).json(formattedVisit);
    } finally {
      // Réinitialiser le search_path à public
      await db.execute(sql`SET search_path TO public`);
    }
  } catch (error) {
    visitLogger.error('Error creating visit:', error);

    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (resetError) {
      visitLogger.error('Error resetting search_path:', resetError);
    }

    if (error instanceof ZodError) {
      return res.status(400).json({ 
        error: "Données invalides",
        details: error.errors 
      });
    }

    res.status(500).json({ 
      error: "Une erreur est survenue lors de la création de la visite",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Route for getting all visits
router.get("/", ensureAuth, async (req, res) => {
  try {
    const user = req.user as any;
    logger.info(`Fetching all visits for user ${user.id}`);
    
    // Définir le schéma client
    const clientSchema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Configurer le search_path
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${user.id}`);

    try {
      const now = new Date();
      const { filter } = req.query;
      
      // Créer la condition WHERE en fonction du filtre
      let whereClause = '';
      let visitsQuery;
      
      if (filter === 'upcoming') {
        visitsQuery = sql`
          SELECT * FROM visits 
          WHERE datetime >= NOW() AND status != 'completed'
          ORDER BY datetime DESC
        `;
      } else if (filter === 'archived') {
        visitsQuery = sql`
          SELECT * FROM visits 
          WHERE status = 'completed' OR archived = true
          ORDER BY datetime DESC
        `;
      } else if (filter === 'past') {
        visitsQuery = sql`
          SELECT * FROM visits 
          WHERE datetime < NOW() AND status != 'completed' AND archived = false
          ORDER BY datetime DESC
        `;
      } else {
        visitsQuery = sql`
          SELECT * FROM visits 
          ORDER BY datetime DESC
        `;
      }

      const directVisits = await db.execute(visitsQuery);

      logger.info(`Retrieved ${directVisits.rows.length} visits via direct SQL`);

      // Transformer les données pour qu'elles correspondent à ce qu'attend le frontend
      const formattedVisits = directVisits.rows.map((visit: any) => ({
        id: visit.id,
        firstName: visit.first_name,
        lastName: visit.last_name,
        email: visit.email,
        phone: visit.phone,
        datetime: new Date(visit.datetime).toISOString(),
        formattedDatetime: formatInTimeZone(new Date(visit.datetime), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
        visitType: visit.visit_type,
        status: visit.status,
        propertyId: visit.property_id,
        manualAddress: visit.manual_address,
        message: visit.message,
        source: visit.source,
        documents: visit.documents,
        reminderSent: visit.reminder_sent,
        archived: visit.archived
      }));

      res.json(formattedVisits);
    } finally {
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    }
  } catch (error) {
    logger.error('Error fetching visits:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (resetError) {
      logger.error('Error resetting search_path:', resetError);
    }
    
    res.status(500).json({ error: "Erreur lors de la récupération des visites" });
  }
});

// Route for archiving/unarchiving a visit
router.patch("/:id/archive", ensureAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { archived } = req.body;

    logger.info(`Archiving visit ${id} with archived=${archived} for user ${user.id}`);
    
    // Définir le schéma client
    const clientSchema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Configurer le search_path
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${user.id}`);
    
    try {
      const result = await db.execute(sql`
        UPDATE visits
        SET archived = ${archived}, status = ${archived ? 'completed' : 'pending'}, updated_at = NOW()
        WHERE id = ${parseInt(id)}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Visite non trouvée" });
      }
      
      const updatedVisitDirect = result.rows[0];

      // Format the response
      const formattedVisit = {
        id: updatedVisitDirect.id,
        firstName: updatedVisitDirect.first_name,
        lastName: updatedVisitDirect.last_name,
        email: updatedVisitDirect.email,
        phone: updatedVisitDirect.phone,
        datetime: new Date(updatedVisitDirect.datetime).toISOString(),
        formattedDatetime: formatInTimeZone(new Date(updatedVisitDirect.datetime), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
        visitType: updatedVisitDirect.visit_type,
        status: updatedVisitDirect.status,
        propertyId: updatedVisitDirect.property_id,
        manualAddress: updatedVisitDirect.manual_address,
        message: updatedVisitDirect.message,
        source: updatedVisitDirect.source,
        documents: updatedVisitDirect.documents,
        archived: updatedVisitDirect.archived
      };

      logger.info(`Visit ${id} archived successfully via direct SQL`);
      res.json(formattedVisit);
    } finally {
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    }
  } catch (error) {
    logger.error('Error updating visit archive status:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (resetError) {
      logger.error('Error resetting search_path:', resetError);
    }
    
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut d'archive" });
  }
});

// Route pour supprimer définitivement une visite
router.delete("/:id", ensureAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    logger.info(`Deleting visit ${id} for user ${user.id}`);
    
    // Définir le schéma client
    const clientSchema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Configurer le search_path
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${user.id}`);
    
    try {
      const result = await db.execute(sql`
        DELETE FROM visits
        WHERE id = ${parseInt(id)}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Visite non trouvée" });
      }

      logger.info(`Visit ${id} deleted successfully via direct SQL`);
      res.json({ message: "Visite supprimée avec succès" });
    } finally {
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    }
  } catch (error) {
    logger.error('Error deleting visit:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (resetError) {
      logger.error('Error resetting search_path:', resetError);
    }
    
    res.status(500).json({ error: "Erreur lors de la suppression de la visite" });
  }
});

// Route for updating a visit
router.patch("/:id", ensureAuth, async (req, res) => {
  const visitLogger = logger.child({ context: 'Visits - Update' });
  
  try {
    const user = req.user as any;
    const { id } = req.params;
    visitLogger.info(`Updating visit ${id} for user ${user.id} with data:`, {
      ...req.body,
      email: '***@***.***' // Mask email for logging
    });
    
    // Définir le schéma client
    const clientSchema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Configurer le search_path
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    visitLogger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${user.id}`);
    
    try {
      // Validate the incoming data
      const validatedData = insertVisitSchema.partial().parse({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        datetime: req.body.datetime,
        visitType: req.body.visitType,
        message: req.body.message || null,
        manualAddress: req.body.manualAddress || null,
        source: req.body.source,
        documents: req.body.documents
      });
      
      // D'abord, récupérer la visite actuelle pour préserver les données non modifiées
      const currentVisit = await db.execute(sql`SELECT * FROM visits WHERE id = ${parseInt(id)}`);
      if (currentVisit.rows.length === 0) {
        return res.status(404).json({ error: "Visite non trouvée" });
      }

      // Préparer les données à mettre à jour
      const current = currentVisit.rows[0];
      
      const result = await db.execute(sql`
        UPDATE visits
        SET 
          first_name = ${validatedData.firstName || current.first_name},
          last_name = ${validatedData.lastName || current.last_name},
          email = ${validatedData.email || current.email},
          phone = ${validatedData.phone || current.phone},
          datetime = ${validatedData.datetime || current.datetime},
          visit_type = ${validatedData.visitType || current.visit_type},
          manual_address = ${validatedData.manualAddress !== undefined ? validatedData.manualAddress : current.manual_address},
          message = ${validatedData.message !== undefined ? validatedData.message : current.message},
          source = ${validatedData.source || current.source},
          documents = ${validatedData.documents || current.documents},
          updated_at = NOW()
        WHERE id = ${parseInt(id)}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Visite non trouvée" });
      }

      const updatedVisitDirect = result.rows[0];
      
      // Format the response
      const formattedVisit = {
        id: updatedVisitDirect.id,
        firstName: updatedVisitDirect.first_name,
        lastName: updatedVisitDirect.last_name,
        email: updatedVisitDirect.email,
        phone: updatedVisitDirect.phone,
        datetime: new Date(updatedVisitDirect.datetime).toISOString(),
        formattedDatetime: formatInTimeZone(new Date(updatedVisitDirect.datetime), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
        visitType: updatedVisitDirect.visit_type,
        status: updatedVisitDirect.status,
        propertyId: updatedVisitDirect.property_id,
        manualAddress: updatedVisitDirect.manual_address,
        message: updatedVisitDirect.message,
        source: updatedVisitDirect.source,
        documents: updatedVisitDirect.documents,
        archived: updatedVisitDirect.archived
      };
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('visitUpdated', formattedVisit);
      }

      visitLogger.info(`Visit ${id} updated successfully via direct SQL`);
      res.json(formattedVisit);
    } finally {
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    }
  } catch (error) {
    visitLogger.error('Error updating visit:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (resetError) {
      visitLogger.error('Error resetting search_path:', resetError);
    }

    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Données invalides",
        details: error.errors
      });
    }

    res.status(500).json({
      error: "Une erreur est survenue lors de la modification de la visite",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Route for updating visit status
router.patch("/:id/status", ensureAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { status, rating, feedback } = req.body;

    logger.info(`Updating visit ${id} status to ${status} for user ${user.id}`);
    
    // Définir le schéma client
    const clientSchema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Configurer le search_path
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${user.id}`);
    
    try {
      if (!['pending', 'completed', 'cancelled', 'no_show'].includes(status)) {
        return res.status(400).json({
          error: "Statut invalide",
          message: "Le statut doit être l'un des suivants: pending, completed, cancelled, no_show"
        });
      }
      
      const result = await db.execute(sql`
        UPDATE visits
        SET status = ${status}, archived = ${status === 'completed'}, updated_at = NOW(), rating = ${rating}, feedback = ${feedback}
        WHERE id = ${parseInt(id)}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Visite non trouvée" });
      }
      
      const updatedVisitDirect = result.rows[0];

      // Format the response
      const formattedVisit = {
        id: updatedVisitDirect.id,
        firstName: updatedVisitDirect.first_name,
        lastName: updatedVisitDirect.last_name,
        email: updatedVisitDirect.email,
        phone: updatedVisitDirect.phone,
        datetime: new Date(updatedVisitDirect.datetime).toISOString(),
        formattedDatetime: formatInTimeZone(new Date(updatedVisitDirect.datetime), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
        visitType: updatedVisitDirect.visit_type,
        status: updatedVisitDirect.status,
        propertyId: updatedVisitDirect.property_id,
        manualAddress: updatedVisitDirect.manual_address,
        message: updatedVisitDirect.message,
        source: updatedVisitDirect.source,
        documents: updatedVisitDirect.documents,
        archived: updatedVisitDirect.archived
      };
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('visitStatusUpdated', formattedVisit);
      }

      logger.info(`Visit ${id} status updated successfully to ${status} via direct SQL`);
      res.json(formattedVisit);
    } finally {
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    }
  } catch (error) {
    logger.error('Error updating visit status:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (resetError) {
      logger.error('Error resetting search_path:', resetError);
    }
    
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour du statut de la visite",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Route for updating visit reminder status
router.patch("/:id/reminder", ensureAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { reminderSent } = req.body;

    logger.info(`Updating visit ${id} reminder status to ${reminderSent} for user ${user.id}`);
    
    // Définir le schéma client
    const clientSchema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Configurer le search_path
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    logger.info(`Search path défini à "${clientSchema}, public" pour l'utilisateur ${user.id}`);
    
    try {
      const result = await db.execute(sql`
        UPDATE visits
        SET reminder_sent = ${reminderSent}, updated_at = NOW()
        WHERE id = ${parseInt(id)}
        RETURNING *
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Visite non trouvée" });
      }
      
      const updatedVisitDirect = result.rows[0];

      // Format the response
      const formattedVisit = {
        id: updatedVisitDirect.id,
        firstName: updatedVisitDirect.first_name,
        lastName: updatedVisitDirect.last_name,
        email: updatedVisitDirect.email,
        phone: updatedVisitDirect.phone,
        datetime: new Date(updatedVisitDirect.datetime).toISOString(),
        formattedDatetime: formatInTimeZone(new Date(updatedVisitDirect.datetime), 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
        visitType: updatedVisitDirect.visit_type,
        status: updatedVisitDirect.status,
        propertyId: updatedVisitDirect.property_id,
        manualAddress: updatedVisitDirect.manual_address,
        message: updatedVisitDirect.message,
        source: updatedVisitDirect.source,
        documents: updatedVisitDirect.documents,
        archived: updatedVisitDirect.archived
      };
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('visitReminderUpdated', formattedVisit);
      }

      logger.info(`Visit ${id} reminder status updated successfully to ${reminderSent} via direct SQL`);
      res.json(formattedVisit);
    } finally {
      // Réinitialiser le search_path
      await db.execute(sql`SET search_path TO public`);
    }
  } catch (error) {
    logger.error('Error updating visit reminder status:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (resetError) {
      logger.error('Error resetting search_path:', resetError);
    }
    
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour du statut de rappel de la visite",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Ajouter une interface pour le type Visit
interface VisitType {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  datetime: Date;
  visitType: string;
  propertyId: number | null;
  manualAddress: string | null;
  message: string | null;
  status: string;
  rating?: number;
  feedback?: string;
  archived: boolean;
  agentId: number;
  source: string;
  documents: any[];
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any; // Pour les propriétés additionnelles qui peuvent être retournées par SQL
}

export default router;