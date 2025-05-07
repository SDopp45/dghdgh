import { Router } from "express";
import { db } from "@db";
import { maintenanceRequests, properties, documents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { ensureAuth } from "../middleware/auth";
import { pool } from "../db";

const router = Router();

// Get all maintenance requests
router.get("/", ensureAuth, async (req, res, next) => {
  try {
    logger.info("Fetching maintenance requests - starting");
    
    // Définir le schéma utilisateur approprié avant d'exécuter la requête
    let schemaName = "public";
    let fullSchemaPath = "public";
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await pool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          schemaName = user.role === 'admin' ? 'public' : `client_${userId}`;
          fullSchemaPath = `${schemaName}, public`;
          
          // Définir explicitement le schéma en qualifiant le nom de table plus tard
          await pool.query(`SET search_path TO ${fullSchemaPath}`);
          logger.info(`Search_path défini à "${fullSchemaPath}" pour l'utilisateur ${userId}`);
          
          // Vérifier le search_path actuel
          const pathCheck = await pool.query(`SHOW search_path`);
          logger.info(`Search path vérifié: ${pathCheck.rows[0].search_path}`);
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
      }
    }
    
    try {
      // Vérifier d'abord si la table maintenance existe dans le schéma
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = 'maintenance'
        )
      `, [schemaName]);
      
      logger.info(`Table maintenance existe dans le schéma ${schemaName}: ${tableCheck.rows[0].exists}`);
      
      // Utiliser une requête SQL directe avec le nom de schéma qualifié explicitement
      const query = `
        SELECT 
          m.*,
          p.name as property_name,
          p.address as property_address
        FROM 
          ${schemaName}.maintenance m
        LEFT JOIN 
          ${schemaName}.properties p ON m."propertyId" = p.id
        ORDER BY 
          m."createdAt" DESC
      `;
      
      logger.info(`Exécution de la requête: ${query}`);
      
      const result = await pool.query(query);
      
      const requests = result.rows;
      logger.info(`Maintenance requests fetched successfully from schema ${schemaName}: ${requests.length} found`);
      logger.info(`Premier élément récupéré:`, requests.length > 0 ? JSON.stringify(requests[0]) : "Aucun élément");
      
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
    // Définir le schéma utilisateur approprié avant d'exécuter la requête
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await pool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          const schemaName = user.role === 'admin' ? 'public' : `client_${userId}`;
          await pool.query(`SET search_path TO ${schemaName}, public`);
          logger.info(`Search_path défini à "${schemaName}, public" pour l'utilisateur ${userId}`);
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
      }
    }
    
    try {
      // Utiliser une requête SQL directe
      // Utiliser la table maintenance (et non maintenance_requests)
      const result = await pool.query(`
        SELECT 
          m.*,
          p.name as property_name,
          p.address as property_address
        FROM 
          maintenance m
        LEFT JOIN 
          properties p ON m."propertyId" = p.id
        ORDER BY 
          m."createdAt" DESC
        LIMIT 10
      `);
      
      const timeline = result.rows;
    res.json(timeline || []);
    } catch (timelineError) {
      logger.error("Database error in maintenance timeline route:", timelineError);
      res.json([]);
    }
  } catch (error: unknown) {
    logger.error('Error fetching maintenance timeline:', error);
    // Renvoyer un tableau vide au lieu d'une erreur
    res.json([]);
  }
});

// Create new maintenance request
router.post("/", ensureAuth, async (req, res, next) => {
  try {
    // Définir le schéma utilisateur approprié avant d'exécuter la requête
    let schemaName = "public";
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await pool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          schemaName = user.role === 'admin' ? 'public' : `client_${userId}`;
          await pool.query(`SET search_path TO ${schemaName}, public`);
          logger.info(`Search_path défini à "${schemaName}, public" pour l'utilisateur ${userId}`);
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
      }
    }
    
    // Extraire les valeurs du corps de la requête
    const values = { ...req.body };
    
    // Statut initial - normalement "pending", mais pourrait être "in_progress" si spécifié
    const initialStatus = values.status || "pending";
    
    // Gérer document_ids s'il est fourni en tant que tableau
    let documentIds = values.documentIds;
    if (documentIds && Array.isArray(documentIds)) {
      documentIds = JSON.stringify(documentIds);
    }
    
    // Créer l'objet de données pour l'insertion dans la table maintenance
    const requestData = {
      title: values.title,
      description: values.description,
      propertyId: values.propertyId,
      status: initialStatus,
      user_id: req.user?.id || 0, // Ajouter l'ID de l'utilisateur connecté
      total_cost: values.totalCost ? parseFloat(values.totalCost) : null,
      document_id: values.documentId || null,
      document_ids: documentIds || '[]',
      reported_by: values.reportedBy || null
    };

    // createdAt et updatedAt sont générés automatiquement
    
    logger.info("Création d'une nouvelle demande de maintenance:", requestData);
    
    // Utiliser directement une requête SQL avec la table maintenance
    const result = await pool.query(
      `INSERT INTO maintenance 
       (title, description, "propertyId", status, user_id, total_cost, document_id, document_ids, reported_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        requestData.title,
        requestData.description,
        requestData.propertyId,
        requestData.status,
        requestData.user_id,
        requestData.total_cost,
        requestData.document_id,
        requestData.document_ids,
        requestData.reported_by
      ]
    );

    const request = result.rows[0];
    
    // Si la maintenance est créée avec le statut "in_progress", mettre à jour le statut de la propriété
    if (initialStatus === "in_progress") {
      try {
        logger.info(`Mise à jour du statut de la propriété ${requestData.propertyId} en "maintenance"`);
        await pool.query(
          `UPDATE properties SET status = 'maintenance' WHERE id = $1`,
          [requestData.propertyId]
        );
      } catch (propertyUpdateError) {
        logger.error(`Erreur lors de la mise à jour du statut de la propriété ${requestData.propertyId}:`, propertyUpdateError);
        // Ne pas bloquer la réponse en cas d'erreur sur la mise à jour de la propriété
      }
    }

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
    
    // Définir le schéma utilisateur approprié avant d'exécuter la requête
    let schemaName = "public";
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await pool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          schemaName = user.role === 'admin' ? 'public' : `client_${userId}`;
          await pool.query(`SET search_path TO ${schemaName}, public`);
          logger.info(`Search_path défini à "${schemaName}, public" pour l'utilisateur ${userId}`);
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
      }
    }
    
    // Extraire les valeurs du corps de la requête
    const values = { ...req.body };
    
    // Récupérer le flag qui indique si on doit mettre à jour la propriété
    const shouldUpdateProperty = values.updateProperty !== false; // Par défaut, true si non spécifié
    
    // Récupérer l'état actuel de la maintenance avant modification
    const currentState = await pool.query(
      `SELECT status, "propertyId" FROM maintenance WHERE id = $1`,
      [id]
    );

    if (currentState.rowCount === 0) {
      return next(new AppError('Maintenance request not found', 404));
    }

    const currentStatus = currentState.rows[0].status;
    const propertyId = currentState.rows[0].propertyId;
    
    // Gérer document_ids s'il est fourni en tant que tableau
    let documentIds = values.documentIds;
    if (documentIds && Array.isArray(documentIds)) {
      documentIds = JSON.stringify(documentIds);
    }
    
    // Utiliser la table maintenance au lieu de maintenance_requests
    const result = await pool.query(
      `UPDATE maintenance SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        "propertyId" = COALESCE($3, "propertyId"),
        status = COALESCE($4, status),
        "updatedAt" = CURRENT_TIMESTAMP,
        user_id = COALESCE($5, user_id),
        total_cost = COALESCE($6, total_cost),
        document_id = COALESCE($7, document_id),
        document_ids = COALESCE($8, document_ids),
        reported_by = COALESCE($9, reported_by)
       WHERE id = $10
       RETURNING *`,
      [
        values.title,
        values.description,
        values.propertyId,
        values.status,
        req.user?.id || values.user_id,
        values.totalCost ? parseFloat(values.totalCost) : null,
        values.documentId,
        documentIds,
        values.reportedBy,
        id
      ]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Maintenance request not found', 404));
    }

    // Mettre à jour le statut de la propriété si la maintenance passe en "in_progress"
    // et si le flag shouldUpdateProperty est à true
    const newStatus = result.rows[0].status;
    
    // Si la maintenance passe en statut "in_progress", mettre la propriété en statut "maintenance"
    if (newStatus === "in_progress" && currentStatus !== "in_progress" && shouldUpdateProperty) {
      logger.info(`Mise à jour du statut de la propriété ${propertyId} en "maintenance" (flag updateProperty: ${shouldUpdateProperty})`);
      try {
        await pool.query(
          `UPDATE properties SET status = 'maintenance' WHERE id = $1`,
          [propertyId]
        );
      } catch (propertyUpdateError) {
        logger.error(`Erreur lors de la mise à jour du statut de la propriété ${propertyId}:`, propertyUpdateError);
        // Ne pas bloquer la réponse en cas d'erreur sur la mise à jour de la propriété
      }
    }
    
    // Si la maintenance passe de "in_progress" à "completed", vérifier s'il y a d'autres maintenances en cours
    if (newStatus === "completed" && currentStatus === "in_progress") {
      try {
        const activeMaintenances = await pool.query(
          `SELECT COUNT(*) as count FROM maintenance 
           WHERE "propertyId" = $1 AND status = 'in_progress' AND id != $2`,
          [propertyId, id]
        );
        
        // Si aucune autre maintenance en cours, remettre la propriété en "available"
        if (activeMaintenances.rows[0].count === '0') {
          logger.info(`Remise du statut de la propriété ${propertyId} en "available"`);
          await pool.query(
            `UPDATE properties SET status = 'available' WHERE id = $1`,
            [propertyId]
          );
        }
      } catch (propertyCheckError) {
        logger.error(`Erreur lors de la vérification des maintenances actives pour la propriété ${propertyId}:`, propertyCheckError);
      }
    }

    res.json(result.rows[0]);
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

    // Définir le schéma utilisateur approprié avant d'exécuter la requête
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await pool.query('SELECT role FROM public.users WHERE id = $1', [userId]);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          const schemaName = user.role === 'admin' ? 'public' : `client_${userId}`;
          await pool.query(`SET search_path TO ${schemaName}, public`);
          logger.info(`Search_path défini à "${schemaName}, public" pour l'utilisateur ${userId}`);
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
      }
    }

    // Utiliser la table maintenance au lieu de maintenance_requests
    const result = await pool.query(
      `DELETE FROM maintenance WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return next(new AppError('Maintenance request not found', 404));
    }

    res.json({ message: 'Maintenance request deleted' });
  } catch (error) {
    logger.error('Error deleting maintenance request:', error);
    next(new AppError('Failed to delete maintenance request', 500));
  }
});

export default router;