import { Router } from "express";
import { db } from "../db";
import { visits, insertVisitSchema } from "@shared/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import logger from "../utils/logger";
import { ZodError } from "zod";
import { formatInTimeZone } from 'date-fns-tz';
import { ensureAuth } from "../middleware/auth";

const router = Router();

// Route for creating a new visit
router.post("/", ensureAuth, async (req, res) => {
  const visitLogger = logger.child({ context: 'Visits' });
  try {
    visitLogger.info('Creating new visit with data:', { 
      ...req.body,
      email: '***@***.***' // Mask email for logging
    });

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
      archived: false
    });

    visitLogger.info('Validated data:', {
      ...validatedData,
      email: '***@***.***'
    });

    // Create the visit with validated data
    const [newVisit] = await db.insert(visits)
      .values(validatedData)
      .returning();

    visitLogger.info('Visit created successfully:', { visitId: newVisit.id });

    // Format the visit for response
    const formattedVisit = {
      ...newVisit,
      datetime: formatInTimeZone(newVisit.datetime, 'Europe/Paris', 'dd/MM/yyyy HH:mm'),
      rawDatetime: newVisit.datetime.toISOString()
    };

    // Emit socket event for real-time updates
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
  }
});

// Route for getting all visits
router.get("/", ensureAuth, async (req, res) => {
  try {
    logger.info('Fetching all visits');

    const now = new Date();
    const { filter } = req.query;

    let whereClause;

    switch(filter) {
      case 'upcoming':
        whereClause = and(
          gte(visits.datetime, now),
          eq(visits.archived, false)
        );
        break;
      case 'archived':
        whereClause = eq(visits.archived, true);
        break;
      case 'past':
        whereClause = and(
          lt(visits.datetime, now),
          eq(visits.archived, false)
        );
        break;
      default:
        whereClause = undefined;
    }

    const allVisits = await db.query.visits.findMany({
      where: whereClause,
      with: {
        property: true
      }
    });

    logger.info(`Found ${allVisits.length} visits with filter: ${filter}`);

    // Format dates for response
    const formattedVisits = allVisits.map(visit => ({
      ...visit,
      datetime: visit.datetime.toISOString(),
      formattedDatetime: formatInTimeZone(visit.datetime, 'Europe/Paris', 'dd/MM/yyyy HH:mm')
    }));

    res.json(formattedVisits);
  } catch (error) {
    logger.error('Error fetching visits:', error);
    res.status(500).json({ error: "Erreur lors de la récupération des visites" });
  }
});

// Route for archiving/unarchiving a visit
router.patch("/:id/archive", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;

    logger.info(`Archiving visit ${id} with status ${archived}`);

    const [updatedVisit] = await db
      .update(visits)
      .set({ archived: archived })
      .where(eq(visits.id, parseInt(id)))
      .returning();

    if (!updatedVisit) {
      return res.status(404).json({ error: "Visite non trouvée" });
    }

    // Format the response
    const formattedVisit = {
      ...updatedVisit,
      datetime: updatedVisit.datetime.toISOString(),
      formattedDatetime: formatInTimeZone(updatedVisit.datetime, 'Europe/Paris', 'dd/MM/yyyy HH:mm')
    };

    logger.info(`Visit ${id} archived successfully`);
    res.json(formattedVisit);
  } catch (error) {
    logger.error('Error updating visit archive status:', error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut d'archive" });
  }
});

// Route pour supprimer définitivement une visite
router.delete("/:id", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting visit ${id}`);

    const [deletedVisit] = await db
      .delete(visits)
      .where(eq(visits.id, parseInt(id)))
      .returning();

    if (!deletedVisit) {
      return res.status(404).json({ error: "Visite non trouvée" });
    }

    logger.info(`Visit ${id} deleted successfully`);
    res.json({ message: "Visite supprimée avec succès" });
  } catch (error) {
    logger.error('Error deleting visit:', error);
    res.status(500).json({ error: "Erreur lors de la suppression de la visite" });
  }
});

// Route for updating a visit
router.patch("/:id", ensureAuth, async (req, res) => {
  const visitLogger = logger.child({ context: 'Visits - Update' });
  try {
    const { id } = req.params;
    visitLogger.info(`Updating visit ${id} with data:`, {
      ...req.body,
      email: '***@***.***' // Mask email for logging
    });

    // Validate the incoming data
    const validatedData = insertVisitSchema.partial().parse({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      datetime: req.body.datetime,
      visitType: req.body.visitType,
      message: req.body.message || null,
      manualAddress: req.body.manualAddress || null
    });

    // Update the visit
    const [updatedVisit] = await db
      .update(visits)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(visits.id, parseInt(id)))
      .returning();

    if (!updatedVisit) {
      return res.status(404).json({ error: "Visite non trouvée" });
    }

    // Format the visit for response
    const formattedVisit = {
      ...updatedVisit,
      datetime: updatedVisit.datetime.toISOString(),
      formattedDatetime: formatInTimeZone(updatedVisit.datetime, 'Europe/Paris', 'dd/MM/yyyy HH:mm')
    };

    visitLogger.info(`Visit ${id} updated successfully`);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('visitUpdated', formattedVisit);
    }

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
  }
});

// Route for updating visit status
router.patch("/:id/status", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info(`Updating visit ${id} status to ${status}`);

    if (!['pending', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({
        error: "Statut invalide",
        message: "Le statut doit être l'un des suivants: pending, completed, cancelled, no_show"
      });
    }

    const [updatedVisit] = await db
      .update(visits)
      .set({ 
        status: status,
        updatedAt: new Date()
      })
      .where(eq(visits.id, parseInt(id)))
      .returning();

    if (!updatedVisit) {
      return res.status(404).json({ error: "Visite non trouvée" });
    }

    // Format the response
    const formattedVisit = {
      ...updatedVisit,
      datetime: updatedVisit.datetime.toISOString(),
      formattedDatetime: formatInTimeZone(updatedVisit.datetime, 'Europe/Paris', 'dd/MM/yyyy HH:mm')
    };

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('visitStatusUpdated', formattedVisit);
    }

    logger.info(`Visit ${id} status updated successfully to ${status}`);
    res.json(formattedVisit);
  } catch (error) {
    logger.error('Error updating visit status:', error);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour du statut de la visite",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

export default router;