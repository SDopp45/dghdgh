import { Router } from "express";
import { db, pool } from "../db";
import { visits, insertVisitSchema } from "@shared/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import logger from "../utils/logger";
import { ZodError } from "zod";
import { formatInTimeZone } from 'date-fns-tz';
import { ensureAuth } from "../middleware/auth";
import { getClientDb } from "../db/index";

const router = Router();

// Route for creating a new visit
router.post("/", ensureAuth, async (req, res) => {
  const visitLogger = logger.child({ context: 'Visits' });
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    visitLogger.info(`Creating new visit for user ${user.id} with data:`, { 
      ...req.body,
      email: '***@***.***' // Mask email for logging
    });
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);
    const clientDb = clientDbConnection.db;

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

    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const result = await pool.query(`
      INSERT INTO ${schema}.visits (
        first_name, last_name, email, phone, datetime, visit_type, 
        property_id, manual_address, message, status, archived, 
        agent_id, source, documents, reminder_sent, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING *
    `, [
      validatedData.firstName,                               // first_name
      validatedData.lastName,                                // last_name
      validatedData.email,                                   // email
      validatedData.phone,                                   // phone
      validatedData.datetime,                                // datetime
      validatedData.visitType,                               // visit_type
      validatedData.propertyId,                              // property_id
      validatedData.manualAddress,                           // manual_address
      validatedData.message,                                 // message
      "pending",                                             // status
      false,                                                 // archived
      user.id,                                               // agent_id
      validatedData.source || "manual",                      // source
      validatedData.documents || [],                         // documents
      false                                                  // reminder_sent
    ]);
    
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
  } catch (error) {
    visitLogger.error('Error creating visit:', error);

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
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Route for getting all visits
router.get("/", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    logger.info(`Fetching all visits for user ${user.id}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

    const now = new Date();
    const { filter } = req.query;

    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Créer la condition WHERE en fonction du filtre
    let whereClause = '';
    if (filter === 'upcoming') {
      whereClause = "WHERE datetime >= NOW() AND status != 'completed'";
    } else if (filter === 'archived') {
      whereClause = "WHERE status = 'completed' OR archived = true";
    } else if (filter === 'past') {
      whereClause = "WHERE datetime < NOW() AND status != 'completed' AND archived = false";
    }

    const directVisits = await pool.query(`
      SELECT * FROM ${schema}.visits 
      ${whereClause}
      ORDER BY datetime DESC
    `);

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
  } catch (error) {
    logger.error('Error fetching visits:', error);
    res.status(500).json({ error: "Erreur lors de la récupération des visites" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Route for archiving/unarchiving a visit
router.patch("/:id/archive", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { archived } = req.body;

    logger.info(`Archiving visit ${id} with archived=${archived} for user ${user.id}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);
    
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const result = await pool.query(`
      UPDATE ${schema}.visits
      SET archived = $1, status = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [archived, archived ? 'completed' : 'pending', parseInt(id)]);

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
  } catch (error) {
    logger.error('Error updating visit archive status:', error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut d'archive" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Route pour supprimer définitivement une visite
router.delete("/:id", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const { id } = req.params;
    logger.info(`Deleting visit ${id} for user ${user.id}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);
    
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const result = await pool.query(`
      DELETE FROM ${schema}.visits
      WHERE id = $1
      RETURNING *
    `, [parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Visite non trouvée" });
    }

    logger.info(`Visit ${id} deleted successfully via direct SQL`);
    res.json({ message: "Visite supprimée avec succès" });
  } catch (error) {
    logger.error('Error deleting visit:', error);
    res.status(500).json({ error: "Erreur lors de la suppression de la visite" });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Route for updating a visit
router.patch("/:id", ensureAuth, async (req, res) => {
  const visitLogger = logger.child({ context: 'Visits - Update' });
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const { id } = req.params;
    visitLogger.info(`Updating visit ${id} for user ${user.id} with data:`, {
      ...req.body,
      email: '***@***.***' // Mask email for logging
    });
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

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

    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // D'abord, récupérer la visite actuelle pour préserver les données non modifiées
    const currentVisit = await pool.query(`SELECT * FROM ${schema}.visits WHERE id = $1`, [parseInt(id)]);
    if (currentVisit.rows.length === 0) {
      return res.status(404).json({ error: "Visite non trouvée" });
    }

    // Préparer les données à mettre à jour
    const current = currentVisit.rows[0];
    
    const result = await pool.query(`
      UPDATE ${schema}.visits
      SET 
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        datetime = $5,
        visit_type = $6,
        manual_address = $7,
        message = $8,
        source = $9,
        documents = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      validatedData.firstName || current.first_name,
      validatedData.lastName || current.last_name,
      validatedData.email || current.email,
      validatedData.phone || current.phone,
      validatedData.datetime || current.datetime,
      validatedData.visitType || current.visit_type,
      validatedData.manualAddress !== undefined ? validatedData.manualAddress : current.manual_address,
      validatedData.message !== undefined ? validatedData.message : current.message,
      validatedData.source || current.source,
      validatedData.documents || current.documents,
      parseInt(id)
    ]);

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
  } catch (error) {
    visitLogger.error('Error updating visit:', error);

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
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Route for updating visit status
router.patch("/:id/status", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { status, rating, feedback } = req.body;

    logger.info(`Updating visit ${id} status to ${status} for user ${user.id}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

    if (!['pending', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({
        error: "Statut invalide",
        message: "Le statut doit être l'un des suivants: pending, completed, cancelled, no_show"
      });
    }

    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const result = await pool.query(`
      UPDATE ${schema}.visits
      SET status = $1, archived = $2, updated_at = NOW(), rating = $3, feedback = $4
      WHERE id = $5
      RETURNING *
    `, [status, status === 'completed', rating, feedback, parseInt(id)]);

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
  } catch (error) {
    logger.error('Error updating visit status:', error);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour du statut de la visite",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Route for updating visit reminder status
router.patch("/:id/reminder", ensureAuth, async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const user = req.user as any;
    const { id } = req.params;
    const { reminderSent } = req.body;

    logger.info(`Updating visit ${id} reminder status to ${reminderSent} for user ${user.id}`);
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(user.id);

    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const result = await pool.query(`
      UPDATE ${schema}.visits
      SET reminder_sent = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reminderSent, parseInt(id)]);

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
  } catch (error) {
    logger.error('Error updating visit reminder status:', error);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour du statut de rappel de la visite",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
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