import { Router } from "express";
import { db } from "@db";
import { maintenanceRequests, properties, documents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { ensureAuth } from "../middleware/auth";

const router = Router();

// Get all maintenance requests
router.get("/", ensureAuth, async (req, res, next) => {
  try {
    logger.info("Fetching maintenance requests - starting");
    
    try {
      // Récupérer les demandes de maintenance avec les informations de la propriété
      const requests = await db.select({
        id: maintenanceRequests.id,
        title: maintenanceRequests.title,
        description: maintenanceRequests.description,
        priority: maintenanceRequests.priority,
        status: maintenanceRequests.status,
        propertyId: maintenanceRequests.propertyId,
        tenantId: maintenanceRequests.tenantId,
        reportedBy: maintenanceRequests.reportedBy,
        totalCost: maintenanceRequests.totalCost,
        documentId: maintenanceRequests.documentId,
        documentIds: maintenanceRequests.documentIds,
        createdAt: maintenanceRequests.createdAt,
        updatedAt: maintenanceRequests.updatedAt,
        property: properties,
      })
      .from(maintenanceRequests)
      .leftJoin(properties, eq(maintenanceRequests.propertyId, properties.id));
      
      logger.info(`Maintenance requests fetched successfully: ${requests.length} found`);
      
      // Si aucune donnée n'est trouvée, renvoyer un tableau vide au lieu d'une erreur
      res.json(requests || []);
    } catch (dbError) {
      logger.error("Database error in maintenance route:", dbError);
      // Renvoyer un tableau vide pour éviter les erreurs côté client
      res.json([]);
    }
  } catch (error: unknown) {
    logger.error('Error fetching maintenance requests:', error);
    // Renvoyer un tableau vide au lieu d'une erreur 500
    res.json([]);
  }
});

// Get maintenance timeline for dashboard widget
router.get("/timeline", ensureAuth, async (req, res, next) => {
  try {
    const timeline = await db.select({
      id: maintenanceRequests.id,
      title: maintenanceRequests.title,
      createdAt: maintenanceRequests.createdAt,
      status: maintenanceRequests.status,
      priority: maintenanceRequests.priority,
      documentId: maintenanceRequests.documentId,
      documentIds: maintenanceRequests.documentIds,
      property: properties,
    })
    .from(maintenanceRequests)
    .leftJoin(properties, eq(maintenanceRequests.propertyId, properties.id));

    res.json(timeline || []);
  } catch (error: unknown) {
    logger.error('Error fetching maintenance timeline:', error);
    // Renvoyer un tableau vide au lieu d'une erreur
    res.json([]);
  }
});

// Create new maintenance request
router.post("/", ensureAuth, async (req, res, next) => {
  try {
    // S'assurer que documentIds est correctement formaté en JSONB si présent
    const values = { ...req.body };
    
    // Convertir les documentIds en JSONB si fournis
    if (values.documentIds && Array.isArray(values.documentIds)) {
      values.documentIds = JSON.stringify(values.documentIds);
    }
    
    const requestData = {
      ...values,
      status: "open",
      totalCost: Number(values.totalCost),
      reportedBy: values.reportedBy.trim(),
      createdAt: values.date,
      documentId: values.documentId,
      documentIds: values.documentIds,
      folderId: values.folderId,
    };

    const [request] = await db.insert(maintenanceRequests)
      .values(requestData)
      .returning();

    res.status(201).json(request);
  } catch (error) {
    logger.error('Error creating maintenance request:', error);
    next(new AppError('Failed to create maintenance request', 500));
  }
});

// Update maintenance request
router.put("/:id", ensureAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError('Invalid maintenance request ID', 400));
    }
    
    // S'assurer que documentIds est correctement formaté en JSONB si présent
    const values = { ...req.body };
    
    // Convertir les documentIds en JSONB si fournis
    if (values.documentIds && Array.isArray(values.documentIds)) {
      values.documentIds = JSON.stringify(values.documentIds);
    }

    const [updated] = await db
      .update(maintenanceRequests)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRequests.id, id))
      .returning();

    if (!updated) {
      return next(new AppError('Maintenance request not found', 404));
    }

    res.json(updated);
  } catch (error) {
    logger.error('Error updating maintenance request:', error);
    next(new AppError('Failed to update maintenance request', 500));
  }
});

// Delete maintenance request
router.delete("/:id", ensureAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError('Invalid maintenance request ID', 400));
    }

    const [deleted] = await db
      .delete(maintenanceRequests)
      .where(eq(maintenanceRequests.id, id))
      .returning();

    if (!deleted) {
      return next(new AppError('Maintenance request not found', 404));
    }

    res.json({ message: 'Maintenance request deleted' });
  } catch (error) {
    logger.error('Error deleting maintenance request:', error);
    next(new AppError('Failed to delete maintenance request', 500));
  }
});

export default router;