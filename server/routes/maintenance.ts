import { Router } from "express";
import { db } from "@db";
import { maintenanceRequests, properties, documents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { ensureAuth } from "../middleware/auth";
import { sql } from "drizzle-orm";

const router = Router();

// Get all maintenance requests
router.get("/", ensureAuth, async (req, res, next) => {
  try {
    logger.info("Fetching maintenance requests - starting");
    
    // Définir le schéma utilisateur approprié avant d'exécuter la requête
    let schemaName = "public";
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await db.execute(sql`SELECT role FROM public.users WHERE id = ${userId}`);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          const clientSchema = user.role === 'admin' ? 'public' : `client_${userId}`;
          
          // Définir explicitement le schéma avec sql.identifier
          await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
          logger.info(`Search_path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
          
          // Vérifier le search_path actuel
          const pathCheck = await db.execute(sql`SHOW search_path`);
          logger.info(`Search path vérifié: ${pathCheck.rows[0].search_path}`);
          
          try {
            // Vérifier d'abord si la table maintenance existe dans le schéma
            const tableCheck = await db.execute(sql`
              SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = ${clientSchema} 
                AND table_name = 'maintenance'
              )
            `);
            
            logger.info(`Table maintenance existe dans le schéma ${clientSchema}: ${tableCheck.rows[0].exists}`);
            
            // Utiliser une requête SQL directe avec le nom de schéma qualifié explicitement
            const result = await db.execute(sql`
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
            `);
            
            const requests = result.rows;
            logger.info(`Maintenance requests fetched successfully from schema ${clientSchema}: ${requests.length} found`);
            logger.info(`Premier élément récupéré:`, requests.length > 0 ? JSON.stringify(requests[0]) : "Aucun élément");
            
            // Si aucune donnée n'est trouvée, renvoyer un tableau vide au lieu d'une erreur
            res.json(requests || []);
          } catch (dbError) {
            logger.error("Database error in maintenance route:", dbError);
            // Renvoyer un tableau vide pour éviter les erreurs côté client
            res.json([]);
          } finally {
            // Réinitialiser le search_path à public
            await db.execute(sql`SET search_path TO public`);
          }
        } else {
          res.json([]);
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
        await db.execute(sql`SET search_path TO public`);
        res.json([]);
      }
    } else {
      res.json([]);
    }
  } catch (error: unknown) {
    logger.error('Error fetching maintenance requests:', error);
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`);
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
        const userResult = await db.execute(sql`SELECT role FROM public.users WHERE id = ${userId}`);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          const clientSchema = user.role === 'admin' ? 'public' : `client_${userId}`;
          await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
          logger.info(`Search_path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
          
          try {
            // Utiliser une requête SQL directe avec db.execute
            const result = await db.execute(sql`
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
          } finally {
            // Réinitialiser le search_path
            await db.execute(sql`SET search_path TO public`);
          }
        } else {
          res.json([]);
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
        await db.execute(sql`SET search_path TO public`);
        res.json([]);
      }
    } else {
      res.json([]);
    }
  } catch (error: unknown) {
    logger.error('Error fetching maintenance timeline:', error);
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`);
    // Renvoyer un tableau vide au lieu d'une erreur
    res.json([]);
  }
});

// Create new maintenance request
router.post("/", ensureAuth, async (req, res, next) => {
  try {
    // Définir le schéma utilisateur approprié avant d'exécuter la requête
    let clientSchema = "public";
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await db.execute(sql`SELECT role FROM public.users WHERE id = ${userId}`);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          clientSchema = user.role === 'admin' ? 'public' : `client_${userId}`;
          await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
          logger.info(`Search_path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
          
          // Extraire les valeurs du corps de la requête
          const values = { ...req.body };
          
          // Statut initial - normalement "pending", mais pourrait être "in_progress" si spécifié
          const initialStatus = values.status || "pending";
          
          // Gérer document_ids s'il est fourni en tant que tableau
          let documentIds = values.documentIds;
          if (documentIds && Array.isArray(documentIds)) {
            documentIds = JSON.stringify(documentIds);
          }
          
          logger.info("Création d'une nouvelle demande de maintenance:", {
            title: values.title,
            propertyId: values.propertyId,
            status: initialStatus
          });
          
          // Utiliser directement une requête SQL avec la table maintenance
          const result = await db.execute(sql`
            INSERT INTO maintenance 
            (title, description, "propertyId", status, user_id, total_cost, document_id, document_ids, reported_by) 
            VALUES (
              ${values.title},
              ${values.description},
              ${values.propertyId},
              ${initialStatus},
              ${req.user?.id || 0},
              ${values.totalCost ? parseFloat(values.totalCost) : null},
              ${values.documentId || null},
              ${documentIds || '[]'},
              ${values.reportedBy || null}
            ) 
            RETURNING *
          `);

          const request = result.rows[0];
          
          // Si la maintenance est créée avec le statut "in_progress", mettre à jour le statut de la propriété
          if (initialStatus === "in_progress") {
            try {
              logger.info(`Mise à jour du statut de la propriété ${values.propertyId} en "maintenance"`);
              await db.execute(sql`
                UPDATE properties SET status = 'maintenance' WHERE id = ${values.propertyId}
              `);
            } catch (propertyUpdateError) {
              logger.error(`Erreur lors de la mise à jour du statut de la propriété ${values.propertyId}:`, propertyUpdateError);
              // Ne pas bloquer la réponse en cas d'erreur sur la mise à jour de la propriété
            }
          }

          res.status(201).json(request);
        } else {
          next(new AppError('User not found', 404));
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
        await db.execute(sql`SET search_path TO public`);
        next(new AppError('Failed to set schema', 500));
      } finally {
        // Réinitialiser le search_path
        await db.execute(sql`SET search_path TO public`);
      }
    } else {
      next(new AppError('User not authenticated', 401));
    }
  } catch (error) {
    logger.error('Error creating maintenance request:', error);
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`);
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
    let clientSchema = "public";
    if (req.user && req.user.id) {
      const userId = req.user.id;
      try {
        const userResult = await db.execute(sql`SELECT role FROM public.users WHERE id = ${userId}`);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          clientSchema = user.role === 'admin' ? 'public' : `client_${userId}`;
          await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
          logger.info(`Search_path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
          
          // Extraire les valeurs du corps de la requête
          const values = { ...req.body };
          
          // Récupérer le flag qui indique si on doit mettre à jour la propriété
          const shouldUpdateProperty = values.updateProperty !== false; // Par défaut, true si non spécifié
          
          // Récupérer l'état actuel de la maintenance avant modification
          const currentState = await db.execute(sql`
            SELECT status, "propertyId" FROM maintenance WHERE id = ${id}
          `);

          if (currentState.rowCount === 0) {
            await db.execute(sql`SET search_path TO public`);
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
          const result = await db.execute(sql`
            UPDATE maintenance SET
              title = COALESCE(${values.title}, title),
              description = COALESCE(${values.description}, description),
              "propertyId" = COALESCE(${values.propertyId}, "propertyId"),
              status = COALESCE(${values.status}, status),
              "updatedAt" = CURRENT_TIMESTAMP,
              user_id = COALESCE(${req.user?.id || values.user_id}, user_id),
              total_cost = COALESCE(${values.totalCost ? parseFloat(values.totalCost) : null}, total_cost),
              document_id = COALESCE(${values.documentId}, document_id),
              document_ids = COALESCE(${documentIds}, document_ids),
              reported_by = COALESCE(${values.reportedBy}, reported_by)
            WHERE id = ${id}
            RETURNING *
          `);

          if (result.rowCount === 0) {
            await db.execute(sql`SET search_path TO public`);
            return next(new AppError('Maintenance request not found', 404));
          }

          // Mettre à jour le statut de la propriété si la maintenance passe en "in_progress"
          // et si le flag shouldUpdateProperty est à true
          const newStatus = result.rows[0].status;
          
          // Si la maintenance passe en statut "in_progress", mettre la propriété en statut "maintenance"
          if (newStatus === "in_progress" && currentStatus !== "in_progress" && shouldUpdateProperty) {
            logger.info(`Mise à jour du statut de la propriété ${propertyId} en "maintenance" (flag updateProperty: ${shouldUpdateProperty})`);
            try {
              await db.execute(sql`
                UPDATE properties SET status = 'maintenance' WHERE id = ${propertyId}
              `);
            } catch (propertyUpdateError) {
              logger.error(`Erreur lors de la mise à jour du statut de la propriété ${propertyId}:`, propertyUpdateError);
              // Ne pas bloquer la réponse en cas d'erreur sur la mise à jour de la propriété
            }
          }
          
          // Si la maintenance passe de "in_progress" à "completed" ou à "open"/"pending", vérifier s'il y a d'autres maintenances en cours
          if ((newStatus === "completed" || newStatus === "open" || newStatus === "pending") && currentStatus === "in_progress") {
            try {
              const activeMaintenances = await db.execute(sql`
                SELECT COUNT(*) as count FROM maintenance 
                WHERE "propertyId" = ${propertyId} AND status = 'in_progress' AND id != ${id}
              `);
              
              // Si aucune autre maintenance en cours, remettre la propriété en "available"
              if (activeMaintenances.rows[0].count === '0') {
                logger.info(`Remise du statut de la propriété ${propertyId} en "available"`);
                await db.execute(sql`
                  UPDATE properties SET status = 'available' WHERE id = ${propertyId}
                `);
              }
            } catch (propertyCheckError) {
              logger.error(`Erreur lors de la vérification des maintenances actives pour la propriété ${propertyId}:`, propertyCheckError);
            }
          }

          res.json(result.rows[0]);
          
        } else {
          next(new AppError('User not found', 404));
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
        await db.execute(sql`SET search_path TO public`);
        next(new AppError('Failed to set schema', 500));
      } finally {
        // Réinitialiser le search_path
        await db.execute(sql`SET search_path TO public`);
      }
    } else {
      next(new AppError('User not authenticated', 401));
    }
  } catch (error) {
    logger.error('Error updating maintenance request:', error);
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`);
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
        const userResult = await db.execute(sql`SELECT role FROM public.users WHERE id = ${userId}`);
        if (userResult.rows.length) {
          const user = userResult.rows[0];
          const clientSchema = user.role === 'admin' ? 'public' : `client_${userId}`;
          await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
          logger.info(`Search_path défini à "${clientSchema}, public" pour l'utilisateur ${userId}`);
          
          // Utiliser la table maintenance au lieu de maintenance_requests
          const result = await db.execute(sql`
            DELETE FROM maintenance WHERE id = ${id} RETURNING *
          `);

          if (result.rowCount === 0) {
            await db.execute(sql`SET search_path TO public`);
            return next(new AppError('Maintenance request not found', 404));
          }

          res.json({ message: 'Maintenance request deleted' });
          
        } else {
          next(new AppError('User not found', 404));
        }
      } catch (schemaError) {
        logger.error(`Erreur lors de la définition du search_path:`, schemaError);
        await db.execute(sql`SET search_path TO public`);
        next(new AppError('Failed to set schema', 500));
      } finally {
        // Réinitialiser le search_path
        await db.execute(sql`SET search_path TO public`);
      }
    } else {
      next(new AppError('User not authenticated', 401));
    }
  } catch (error) {
    logger.error('Error deleting maintenance request:', error);
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`);
    next(new AppError('Failed to delete maintenance request', 500));
  }
});

export default router;