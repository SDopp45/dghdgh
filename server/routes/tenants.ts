import express from "express";
import { db } from "@db";
import { tenants, users, properties, tenantDocuments as tenantDocumentsTable, documents, visits, transactions, feedbackHistory, tenantHistory, maintenanceRequests } from "@shared/schema";
import { eq, and, count, desc, not, isNull, or, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { addMonths, differenceInMonths, parseISO, format } from "date-fns";
import { fr } from 'date-fns/locale';
import { calculateAverageRating, generateRentTransactions, handleTransactions, findOrphanedFeedbacks, generateUniqueUsername } from '../utils/tenant-utils';
import { insertTenantHistorySchema } from '@shared/schema';
import { formatDate } from '../utils/date-utils';
import fs from 'fs/promises';
import { ensureAuth, getUserId } from '../middleware/auth';

const router = express.Router();

/**
 * Vérifie si un document est associé à des entités autres que les locataires
 * @param documentId ID du document à vérifier
 * @returns Un objet indiquant si le document a des associations et le détail de ces associations
 */
async function checkDocumentAssociations(documentId: number) {
  try {
    // Vérifier les associations dans les transactions
    const transactionAssociations = await db.query.transactions.findFirst({
      where: or(
        eq(transactions.documentId, documentId),
        sql`${documentId} = ANY(${transactions.documentIds})`
      )
    });

    // Vérifier les associations dans les maintenances
    const maintenanceAssociations = await db.query.maintenanceRequests.findFirst({
      where: or(
        eq(maintenanceRequests.documentId, documentId),
        sql`${documentId} = ANY(${maintenanceRequests.documentIds})`
      )
    });

    // Vérifier les associations dans les propriétés
    // Comme properties.documents est probablement un champ JSONB, nous devons utiliser une approche différente
    const propertyWithDocuments = await db.query.properties.findFirst({
      where: sql`${documentId}::text = ANY(ARRAY(SELECT jsonb_array_elements_text(${properties.images})))`,
    });

    // Résultat avec le détail des associations
    const result = {
      hasAssociations: !!transactionAssociations || !!maintenanceAssociations || !!propertyWithDocuments,
      associations: {
        transactions: !!transactionAssociations,
        maintenance: !!maintenanceAssociations,
        properties: !!propertyWithDocuments
      }
    };

    return result;
  } catch (error) {
    logger.error(`Erreur lors de la vérification des associations pour le document ${documentId}:`, error);
    // En cas d'erreur, considérer que le document a des associations pour éviter de le supprimer par erreur
    return {
      hasAssociations: true,
      associations: {
        transactions: false,
        maintenance: false,
        properties: false
      },
      error: true
    };
  }
}

// Route GET pour récupérer tous les locataires
router.get("/", ensureAuth, async (req, res) => {
  try {
    logger.info("Fetching all tenants");
    
    // Toujours simuler un utilisateur authentifié
    req.user = { 
      id: 1,
      role: "admin",
      username: "admin",
      password: "",
      fullName: "Admin",
      email: null, 
      phoneNumber: null,
      profileImage: null,
      archived: false,
      accountType: "individual",
      parentAccountId: null,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date() 
    };
    
    // Récupérer les locataires avec leurs relations
    const allTenants = await db.query.tenants.findMany({
      with: {
        user: true,
        property: true,
        documents: {
          with: {
            document: true
          }
        }
      }
    }).catch(err => {
      logger.error("Database error in tenants route:", err);
      return [];
    });
    
    // Vérifier et réparer les données manquantes
    const sanitizedTenants = allTenants.map(tenant => {
      // Si user est null, créer un objet minimal
      if (!tenant.user) {
        logger.warn(`Tenant ${tenant.id} has no associated user`);
        tenant.user = {
          id: 0,
          username: "unknown",
          fullName: null,
          email: null,
          phoneNumber: null,
          role: "tenant",
          password: "",
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Si property est null, créer un objet minimal
      if (!tenant.property) {
        logger.warn(`Tenant ${tenant.id} has no associated property`);
        tenant.property = {
          id: 0,
          name: "Propriété inconnue",
          address: "Adresse inconnue",
          type: "apartment",
          status: "available",
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      return tenant;
    });
    
    res.json(sanitizedTenants || []);
  } catch (error) {
    logger.error("Error fetching tenants:", error);
    // Retourner un tableau vide au lieu d'une erreur 500
    res.json([]);
  }
});

// Update tenant creation route to handle automatic transaction creation
router.post("/", async (req, res, next) => {
  try {
    // Simuler l'authentification
    req.user = { 
      id: 1,
      role: "admin",
      username: "admin",
      password: "",
      fullName: "Admin",
      email: null, 
      phoneNumber: null,
      profileImage: null,
      archived: false,
      accountType: "individual",
      parentAccountId: null,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date() 
    };
    const authenticatedUserId = 1;

    const {
      fullName,
      email,
      phoneNumber,
      propertyId,
      leaseStart,
      leaseEnd,
      rentAmount,
      leaseType,
      documentId, // Keep for backward compatibility
      documentIds, // New array of documentIds
      createTransactions,
      orphanedHistoryId // ID de l'historique orphelin à associer
    } = req.body;
    
    logger.info(`Checking for orphaned feedbacks for: ${fullName}`);
    
    // Vérifier les feedbacks orphelins avec le même nom complet
    const orphanedFeedbacks = await findOrphanedFeedbacks(fullName);

    logger.info("Received tenant creation request with data:", {
      fullName,
      email,
      propertyId,
      leaseStart,
      leaseEnd,
      rentAmount,
      leaseType,
      documentId,
      documentIds,
      createTransactions,
      authenticatedUserId,
      orphanedHistoryId
    });

    // Validate required fields
    if (!fullName || !propertyId || !leaseStart || !leaseEnd || !rentAmount || !leaseType) {
      throw new AppError("Données obligatoires manquantes", 400);
    }

    // Process document IDs - combine single documentId with documentIds array if both exist
    const docsToProcess = [];
    if (documentId) docsToProcess.push(documentId);
    if (documentIds && Array.isArray(documentIds)) docsToProcess.push(...documentIds);
    
    // Deduplicate document IDs
    const uniqueDocIds = Array.from(new Set(docsToProcess));
    
    // If document IDs are provided, verify that the documents exist and are of type 'lease'
    if (uniqueDocIds.length > 0) {
      for (const docId of uniqueDocIds) {
      const document = await db.query.documents.findFirst({
          where: eq(documents.id, docId)
      });

      if (!document) {
          throw new AppError(`Document ID ${docId} non trouvé`, 404);
      }

      if (document.type !== 'lease') {
          throw new AppError(`Type de document invalide pour le document ID ${docId}. Le document doit être un bail.`, 400);
        }
      }
    }

    // Check if a user with the same full name already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.fullName, fullName)
    });

    let user;
    let tenant = null; // Définir explicitement avec le type null
    let insertedTenantDocs = [];
    let username;
    
    if (existingUser) {
      // Réutiliser l'utilisateur existant
      user = existingUser;
      username = user.username; // Récupérer le username de l'utilisateur existant
      logger.info(`Found existing user with matching name, generating unique username`);
    } else {
      // Generate unique username
      username = await generateUniqueUsername(fullName);
      logger.info(`Generated unique username`);
      
      // Create new user account for tenant
      [user] = await db.insert(users)
        .values({
          username,
          password: await bcrypt.hash('changeme', 10),
          fullName,
          email,
          phoneNumber,
          role: 'tenant',
          settings: {}
        })
        .returning();

      if (!user) {
        throw new AppError("Échec de la création du compte utilisateur", 500);
      }
      
      logger.info(`Created new user account successfully`);
    }

    try {

      // Create tenant record
      [tenant] = await db.insert(tenants)
        .values({
          userId: user.id,
          propertyId: Number(propertyId),
          leaseStart: new Date(leaseStart),
          leaseEnd: new Date(leaseEnd),
          rentAmount: rentAmount.toString(),
          leaseType,
          active: true,
          leaseStatus: 'actif'
        })
        .returning();

      if (!tenant) {
        throw new AppError("Échec de la création du bail", 500);
      }

      logger.info(`Created tenant record with ID: ${tenant.id}`);

      // Link documents to tenant if provided
      if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
        // Generate array of valid IDs (filter out undefined/null/NaN)
        const validDocIds = documentIds.filter(id => id && !isNaN(Number(id))).map(Number);
        
        if (validDocIds.length > 0) {
          try {
            // Check which documents are already linked to avoid duplicates
            const existingDocs = await db.query.tenantDocuments.findMany({
              where: and(
                eq(tenantDocumentsTable.tenantId, tenant.id),
                inArray(tenantDocumentsTable.documentId, validDocIds)
              )
            });
            
            // Find document IDs that aren't already linked
            const existingDocIds = existingDocs.map(doc => doc.documentId);
            const newDocIds = validDocIds.filter(id => !existingDocIds.includes(id));
            
            if (newDocIds.length > 0) {
              logger.info(`Adding ${newDocIds.length} new document associations to tenant ${tenant.id}`);
              
              // Prepare values to insert
              const tenantDocValuesToInsert = newDocIds.map(docId => ({
            tenantId: tenant.id,
                documentId: docId,
                documentType: 'lease' as const
              }));
              
              // Insert new associations
              insertedTenantDocs = await db.insert(tenantDocumentsTable)
                .values(tenantDocValuesToInsert)
          .returning();

              logger.info(`Successfully linked ${insertedTenantDocs.length} documents to tenant ${tenant.id}`);
            } else {
              logger.info(`No new documents to link with tenant ${tenant.id} (already linked)`);
            }
          } catch (error) {
            logger.error(`Error linking documents to tenant ${tenant.id}:`, error);
            // Continue with the update, don't throw
          }
        }
      }
      
      // Associer les feedbacks orphelins au nouveau locataire
      if (orphanedFeedbacks.length > 0) {
        logger.info(`Found ${orphanedFeedbacks.length} orphaned feedbacks with name ${fullName} to link to new tenant ${tenant.id}`);
        
        // Récupérer les informations de la propriété
        const property = await db.query.properties.findFirst({
          where: eq(properties.id, Number(propertyId))
        });
        
        // Formater la date de début du bail
        const formattedLeaseStart = format(
          new Date(leaseStart),
          'dd MMMM yyyy',
          { locale: fr }
        );
        
        // Mettre à jour chaque feedback orphelin pour l'associer au nouveau locataire
        for (const feedback of orphanedFeedbacks) {
          // Ajouter une note indiquant le début du nouveau bail
          let updatedFeedback = feedback.feedback || '';
          if (updatedFeedback) {
            updatedFeedback += '\n\n';
          }
          
          updatedFeedback += `Début du bail pour la propriété "${property?.name || 'inconnue'}" le ${formattedLeaseStart}.`;
          
          await db.update(feedbackHistory)
            .set({ 
              tenantId: tenant.id,
              isOrphaned: false,  // Marquer comme non-orphelin maintenant qu'il est rattaché
              feedback: updatedFeedback
            })
            .where(eq(feedbackHistory.id, feedback.id));
        }
        
        logger.info(`Successfully linked ${orphanedFeedbacks.length} orphaned feedbacks to new tenant ${tenant.id}`);
      }

      // Si on a réutilisé un utilisateur existant, récupérer les anciens feedbacks (qui sont associés à null)
      // et les associer au nouveau locataire
      if (existingUser) {
        // Récupérer les anciens feedbacks de l'utilisateur qui n'ont pas de tenantId
        const orphanedFeedbacks = await db.query.feedbackHistory.findMany({
          where: and(
            eq(feedbackHistory.createdBy, user.id),
            isNull(feedbackHistory.tenantId),
            eq(feedbackHistory.isOrphaned, true) // S'assurer qu'on ne récupère que les feedbacks marqués comme orphelins
          )
        });

        // Si on trouve des feedbacks orphelins, les lier au nouveau locataire
        if (orphanedFeedbacks.length > 0) {
          logger.info(`Found ${orphanedFeedbacks.length} orphaned feedback entries to relink to tenant ${tenant.id}`);
          
          // Récupérer les informations de la propriété
          const property = await db.query.properties.findFirst({
            where: eq(properties.id, Number(propertyId))
          });
          
          // Formater la date de début du bail
          const formattedLeaseStart = format(
            new Date(leaseStart),
            'dd MMMM yyyy',
            { locale: fr }
          );
          
          // Mettre à jour les feedbacks pour les associer au nouveau locataire
          for (const feedback of orphanedFeedbacks) {
            // Ajouter une note indiquant le début du nouveau bail
            let updatedFeedback = feedback.feedback || '';
            if (updatedFeedback) {
              updatedFeedback += '\n\n';
            }
            
            updatedFeedback += `Début du bail pour la propriété "${property?.name || 'inconnue'}" le ${formattedLeaseStart}.`;
            
            await db.update(feedbackHistory)
              .set({ 
                tenantId: tenant.id,
                isOrphaned: false,  // Marquer comme non-orphelin maintenant qu'il est rattaché
                feedback: updatedFeedback
              })
              .where(eq(feedbackHistory.id, feedback.id));
          }
          
          logger.info(`Successfully relinked ${orphanedFeedbacks.length} feedback entries to tenant ${tenant.id}`);
        }
      }

      // Si un ID d'historique orphelin est fourni, l'associer au nouveau locataire
      if (orphanedHistoryId) {
        logger.info(`Attempting to associate orphaned history with ID ${orphanedHistoryId} to tenant ${tenant.id}`);
        
        // Récupérer l'historique orphelin spécifié
        const orphanedHistory = await db.query.tenantHistory.findFirst({
          where: and(
            eq(tenantHistory.id, parseInt(orphanedHistoryId.toString())),
            eq(tenantHistory.isOrphaned, true)
          )
        });
        
        if (orphanedHistory) {
          // Récupérer les informations de la propriété
          const property = await db.query.properties.findFirst({
            where: eq(properties.id, Number(propertyId))
          });
          
          // Formater la date de début du bail
          const formattedLeaseStart = format(
            new Date(leaseStart),
            'dd MMMM yyyy',
            { locale: fr }
          );
          
          // Mettre à jour l'historique pour l'associer au nouveau locataire
          let updatedFeedback = orphanedHistory.feedback || '';
          if (updatedFeedback) {
            updatedFeedback += '\n\n';
          }
          
          updatedFeedback += `Début du bail pour la propriété "${property?.name || 'inconnue'}" le ${formattedLeaseStart}.`;
          
          await db.update(tenantHistory)
            .set({ 
              tenantId: tenant.id,
              isOrphaned: false,
              feedback: updatedFeedback,
              propertyName: property?.name || null
            })
            .where(eq(tenantHistory.id, orphanedHistory.id));
          
          logger.info(`Successfully associated orphaned history ${orphanedHistoryId} to tenant ${tenant.id}`);
        } else {
          logger.warn(`Orphaned history with ID ${orphanedHistoryId} not found or not marked as orphaned`);
        }
      }

      // Update property status
      await db.update(properties)
        .set({
          status: 'rented',
          monthlyRent: rentAmount.toString()
        })
        .where(eq(properties.id, Number(propertyId)));

      // Générer les transactions si l'option est activée
      if (createTransactions) {
        logger.info("Creating rent transactions as requested");
        await generateRentTransactions(
          authenticatedUserId,
          Number(propertyId),
          tenant.id,
          new Date(leaseStart),
          new Date(leaseEnd),
          rentAmount.toString()
        );
      } else {
        logger.info("Skipping rent transactions creation as it was not requested");
      }

      // Fetch complete tenant data with relations
      const completeTenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenant.id),
        with: {
          user: true,
          property: true,
          documents: {
            with: {
              document: true
            }
          },
          feedbackHistory: {
            orderBy: (history, { desc }) => [desc(history.createdAt)],
            with: {
              creator: true
            }
          }
        }
      });

      if (!completeTenant) {
        throw new AppError("Échec de la récupération des données du locataire", 500);
      }

      logger.info("Tenant creation completed successfully");
      return res.status(201).json(completeTenant);

    } catch (error) {
      logger.error("Error during tenant creation:", error);

      // Cleanup in reverse order if needed
      if (tenant) {
        // Delete tenant document associations first
        await db.delete(tenantDocumentsTable)
          .where(eq(tenantDocumentsTable.tenantId, tenant.id))
          .catch(err => logger.error("Error cleaning up tenant documents:", err));
          
        // Then delete the tenant
        await db.delete(tenants)
          .where(eq(tenants.id, tenant.id))
          .catch(err => logger.error("Error cleaning up tenant:", err));
      }

      // Only delete the user if it was newly created (not when reusing an existing user)
      if (user && !existingUser) {
        await db.delete(users)
          .where(eq(users.id, user.id))
          .catch(err => logger.error("Error cleaning up user:", err));
      }

      throw error;
    }
  } catch (error) {
    logger.error("Error in tenant creation:", error);
    next(error);
  }
});

// GET all tenants
router.get("/", ensureAuth, async (req, res, next) => {
  try {
    logger.info("Fetching tenants");
    const allTenants = await db.query.tenants.findMany({
      with: {
        user: true,
        property: true,
        documents: {
          with: {
            document: true
          }
        },
        feedbackHistory: {
          orderBy: (history, { desc }) => [desc(history.createdAt)],
          with: {
            creator: true
          }
        }
      }
    });

    // Calculer la moyenne des notes pour chaque locataire en utilisant la fonction utilitaire
    const tenantsWithAverageRating = allTenants.map(tenant => {
      // Utiliser la fonction utilitaire pour calculer la note moyenne
      const averageRating = calculateAverageRating(tenant.feedbackHistory || [], 0);

      return {
        ...tenant,
        averageRating
      };
    });

    logger.info(`Successfully fetched ${allTenants.length} tenants`);
    res.json(tenantsWithAverageRating);
  } catch (error) {
    next(error);
  }
});

// Update tenant
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      leaseStart, 
      leaseEnd, 
      rentAmount, 
      phoneNumber, 
      email, 
      leaseType,
      documentId, // Keep for backward compatibility
      documentIds, // New array of documentIds
      folderId 
    } = req.body;

    logger.info("Updating tenant with data:", {
      leaseStart,
      leaseEnd,
      rentAmount,
      phoneNumber,
      email,
      leaseType,
      documentId,
      documentIds,
      folderId
    });

    // Update tenant basic info
    const [updatedTenant] = await db.update(tenants)
      .set({
        leaseStart: new Date(leaseStart),
        leaseEnd: new Date(leaseEnd),
        rentAmount: rentAmount.toString(),
        leaseType
      })
      .where(eq(tenants.id, parseInt(id)))
      .returning();

    if (!updatedTenant) {
      throw new AppError("Failed to update tenant", 404);
    }

    // Update user contact info if provided
    await db.update(users)
      .set({
        phoneNumber: phoneNumber || null,
        email: email || null
      })
      .where(eq(users.id, updatedTenant.userId));
      
    // Process document IDs - combine single documentId with documentIds array if both exist
    const docsToProcess = [];
    if (documentId) docsToProcess.push(documentId);
    if (documentIds && Array.isArray(documentIds)) docsToProcess.push(...documentIds);
    
    // Deduplicate document IDs
    const uniqueDocIds = Array.from(new Set(docsToProcess));
    
    // Link documents to tenant if provided
    if (uniqueDocIds.length > 0) {
      // First, get existing document associations to avoid duplicates
      const existingDocs = await db.query.tenantDocuments.findMany({
        where: eq(tenantDocumentsTable.tenantId, parseInt(id))
      });
      
      // Get IDs of already linked documents
      const existingDocIds = existingDocs.map(doc => doc.documentId);
      
      // Filter out document IDs that are already linked
      const newDocIds = uniqueDocIds.filter(docId => !existingDocIds.includes(docId));
      
      if (newDocIds.length > 0) {
        const tenantDocValuesToInsert = newDocIds.map(docId => ({
          tenantId: parseInt(id),
          documentId: docId,
          documentType: 'lease' as const
        }));
        
        const insertedTenantDocs = await db.insert(tenantDocumentsTable)
          .values(tenantDocValuesToInsert)
          .returning();

        if (!insertedTenantDocs || insertedTenantDocs.length === 0) {
          logger.error("Failed to associate documents with tenant");
        } else {
          logger.info(`Linked ${insertedTenantDocs.length} new documents to tenant ${id}`);
        }
      } else {
        logger.info(`No new documents to link to tenant ${id}, all documents are already linked`);
      }
    }

    // Fetch updated tenant data with all relations
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, parseInt(id)),
      with: {
        user: true,
        property: true,
        documents: {
          with: {
            document: true
          }
        }
      }
    });

    if (!tenant) {
      throw new AppError("Failed to fetch updated tenant data", 404);
    }

    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

// Archive tenant
router.post("/:id/archive", async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { transactionAction } = req.body;

    // Get tenant before archiving
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, parseInt(req.params.id)),
      with: {
        property: true
      }
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    logger.info(`Archiving tenant ${req.params.id} for property ${tenant.propertyId}`);

    // Gérer les transactions si une action est spécifiée
    if (transactionAction) {
      await handleTransactions(tenant.id, transactionAction);
    }

    // Récupérer les feedbacks existants du locataire
    const feedbacks = await db.query.feedbackHistory.findMany({
      where: eq(feedbackHistory.tenantId, parseInt(req.params.id))
    });
    
    // Pour chaque feedback, ajouter une note indiquant la fin du bail
    if (feedbacks.length > 0) {
      logger.info(`Updating ${feedbacks.length} feedback entries with lease end information`);
      
      const leaseEndDate = tenant.leaseEnd || new Date();
      const formattedDate = format(
        typeof leaseEndDate === 'string' ? parseISO(leaseEndDate) : leaseEndDate,
        'dd MMMM yyyy',
        { locale: fr }
      );
      
      for (const feedback of feedbacks) {
        let updatedFeedback = feedback.feedback || '';
        if (updatedFeedback) {
          updatedFeedback += '\n\n';
        }
        
        updatedFeedback += `Fin du bail pour la propriété "${tenant.property?.name || 'inconnue'}" le ${formattedDate}.`;
        
        // Mettre à jour le feedback avec la note de fin de bail
        await db.update(feedbackHistory)
          .set({
            feedback: updatedFeedback,
            // Conserver la référence au locataire mais marquer comme orphelin
            isOrphaned: true
          })
          .where(eq(feedbackHistory.id, feedback.id));
      }
    }
    
    // Archive the tenant
    await db.update(tenants)
      .set({
        active: false,
        leaseStatus: 'fini' as const
      })
      .where(eq(tenants.id, parseInt(req.params.id)));

    // Count remaining active tenants for this property
    const [result] = await db
      .select({ count: count() })
      .from(tenants)
      .where(
        and(
          eq(tenants.propertyId, tenant.propertyId),
          eq(tenants.active, true)
        )
      );

    const activeCount = result?.count || 0;
    logger.info(`Found ${activeCount} active tenants for property ${tenant.propertyId}`);

    // If no active tenants remain, update property status
    if (activeCount === 0) {
      logger.info(`Setting property ${tenant.propertyId} status to available`);
      await db.update(properties)
        .set({ status: 'available' })
        .where(eq(properties.id, tenant.propertyId));
    }

    // Return complete updated tenant data
    const updatedTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, parseInt(req.params.id)),
      with: {
        user: true,
        property: true
      }
    });

    res.json(updatedTenant);
  } catch (error) {
    next(error);
  }
});

// Route pour supprimer un locataire
router.delete("/:id", ensureAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return next(new AppError('Non autorisé', 401));
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError("ID de locataire invalide", 400));
    }

    const { transactionAction = 'cancel', purgeHistory = false, deleteDocuments = false } = req.body || {};

    // 1. Récupérer d'abord le locataire pour avoir ses informations
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
      with: {
        documents: true
      }
    });

    if (!tenant) {
      return next(new AppError("Locataire non trouvé", 404));
    }

    // Récupérer la liste des documents pour éventuellement les supprimer
    let documentIds: number[] = [];
    if (deleteDocuments && tenant.documents && tenant.documents.length) {
      documentIds = tenant.documents
        .filter(doc => doc && doc.document && typeof doc.document === 'object' && doc.document.id)
        .map(doc => doc.document.id);
    }

    // 2. Gérer les transactions associées (si transactionAction est 'delete', les supprimer)
    if (transactionAction === 'delete') {
      try {
        await db
          .update(transactions)
          .set({ status: 'deleted' })
          .where(
            and(
              eq(transactions.tenantId, id),
              eq(transactions.status, 'pending')
            )
          );
      } catch (error) {
        logger.error('Erreur lors de la suppression des transactions associées:', error);
      }
    } else {
      // Sinon, les annuler
      try {
        await db
          .update(transactions)
          .set({ status: 'cancelled' })
          .where(
            and(
              eq(transactions.tenantId, id),
              eq(transactions.status, 'pending')
            )
          );
      } catch (error) {
        logger.error('Erreur lors de l\'annulation des transactions associées:', error);
      }
    }

    // 3. Si purgeHistory est true, supprimer également les notes et l'historique
        if (purgeHistory) {
      try {
        await db.delete(tenantHistory).where(eq(tenantHistory.tenantId, id));
      } catch (error) {
        logger.error('Erreur lors de la suppression de l\'historique:', error);
      }
    }

    // 4. Si deleteDocuments est true, supprimer les documents associés
    if (deleteDocuments && documentIds.length > 0) {
      try {
        // Supprimer d'abord l'association avec le locataire
        await db.delete(tenantDocumentsTable).where(eq(tenantDocumentsTable.tenantId, id));

        // Boucler sur les documents pour les supprimer
        for (const docId of documentIds) {
          try {
            // Vérifie si le document est lié à d'autres entités avant de le supprimer
            const documentAssociations = await checkDocumentAssociations(docId);
            
            // Si aucune autre association n'existe, alors supprimer le document
            if (!documentAssociations.hasAssociations) {
              const document = await db.query.documents.findFirst({
                where: eq(documents.id, docId)
              });

              if (document && document.filepath) {
                // Supprimer le fichier
                try {
                  await fs.unlink(document.filepath);
                } catch (fileError) {
                  logger.error(`Erreur lors de la suppression du fichier ${document.filepath}:`, fileError);
                }
              }

              // Supprimer l'enregistrement dans la base de données
              await db.delete(documents).where(eq(documents.id, docId));
              logger.info(`Document ${docId} supprimé avec succès`);
      } else {
              logger.info(`Document ${docId} conservé car il est lié à d'autres entités`);
            }
          } catch (docError) {
            logger.error(`Erreur lors de la suppression du document ${docId}:`, docError);
          }
        }
      } catch (error) {
        logger.error('Erreur lors de la suppression des documents:', error);
      }
    } else {
      // Si on ne supprime pas les documents, supprimer juste l'association
      try {
        await db.delete(tenantDocumentsTable).where(eq(tenantDocumentsTable.tenantId, id));
      } catch (error) {
        logger.error('Erreur lors de la suppression des associations de documents:', error);
      }
    }

    // 5. Finalement, supprimer le locataire
    await db.delete(tenants).where(eq(tenants.id, id));

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Erreur lors de la suppression du locataire:', error);
    next(new AppError("Erreur lors de la suppression du locataire", 500));
  }
});

// Route pour générer des données de test
router.post("/generate-test-data", async (req, res, next) => {
  try {
    const properties = await db.query.properties.findMany();
    if (properties.length === 0) {
      throw new AppError("Aucune propriété disponible pour créer des locataires test", 400);
    }

    const now = new Date();
    const testTenants = [];

    // Générer 100 locataires
    for (let i = 0; i < 100; i++) {
      const isActive = Math.random() > 0.3; // 70% actifs, 30% archivés
      const leaseStart = new Date(now);
      leaseStart.setMonth(leaseStart.getMonth() - Math.floor(Math.random() * 24)); // Commence entre maintenant et il y a 2 ans
      const leaseEnd = new Date(leaseStart);
      leaseEnd.setMonth(leaseEnd.getMonth() + Math.floor(Math.random() * 24) + 12); // Durée entre 1 et 3 ans

      // Créer l'utilisateur
      const [user] = await db.insert(users)
        .values({
          username: `tenant_test_${i}`,
          password: await bcrypt.hash('changeme', 10),
          fullName: `Locataire Test ${i}`,
          phoneNumber: `0600000${i.toString().padStart(3, '0')}`,
          role: 'tenant',
          settings: {}
        })
        .returning();

      // Affecter une propriété aléatoire
      const property = properties[Math.floor(Math.random() * properties.length)];
      const rentAmount = (2000 + Math.floor(Math.random() * 3000)).toString();

      // Créer le locataire
      const [tenant] = await db.insert(tenants)
        .values({
          userId: user.id,
          propertyId: property.id,
          leaseStart,
          leaseEnd,
          rentAmount,
          leaseType: ['bail_meuble', 'bail_vide', 'bail_commercial'][Math.floor(Math.random() * 3)] as any,
          active: isActive,
          leaseStatus: isActive ? 'actif' : 'fini'
        })
        .returning();

      testTenants.push(tenant);
    }

    res.status(201).json({
      message: "Données de test générées avec succès",
      count: testTenants.length
    });

  } catch (error) {
    next(error);
  }
});

// Route pour générer des données de test de visites
router.post("/generate-visits-test-data", async (req, res, next) => {
  try {
    const properties = await db.query.properties.findMany();
    if (properties.length === 0) {
      throw new AppError("Aucune propriété disponible pour créer des visites test", 400);
    }

    const now = new Date();
    const testVisits = [];

    // Générer 100 visites
    for (let i = 0; i < 100; i++) {
      const isUpcoming = Math.random() > 0.5; // 50% à venir, 50% archivées
      const visitDate = new Date(now);

      if (isUpcoming) {
        visitDate.setDate(visitDate.getDate() + Math.floor(Math.random() * 30)); // Dans les 30 prochains jours
      } else {
        visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 30)); // Dans les 30 derniers jours
      }

      const property = properties[Math.floor(Math.random() * properties.length)];

      const [visit] = await db.insert(visits)
        .values({
          firstName: `Visiteur${i}`,
          lastName: `Test${i}`,
          email: `visiteur${i}@test.com`,
          phone: `0600000${i.toString().padStart(3, '0')}`,
          datetime: visitDate,
          visitType: Math.random() > 0.5 ? 'virtual' : 'physical',
          propertyId: property.id,
          status: isUpcoming ? 'pending' : 'completed',
          message: `Message de test pour la visite ${i}`,
          archived: !isUpcoming
        })
        .returning();

      testVisits.push(visit);
    }

    res.status(201).json({
      message: "Données de test des visites générées avec succès",
      count: testVisits.length
    });

  } catch (error) {
    next(error);
  }
});

// Update the feedback endpoint to use the new feedback_history table
router.post("/:id/feedback", ensureAuth, async (req, res, next) => {
  try {
    logger.info("Feedback endpoint called", {
      isAuthenticated: req.isAuthenticated(),
      tenantId: req.params.id
    });

    if (!req.isAuthenticated()) {
      logger.warn("Unauthenticated feedback attempt");
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { id } = req.params;
    const { rating, feedback, category = 'general' } = req.body;

    logger.info(`Adding feedback for tenant ${id}:`, { rating, feedback, category });

    // Validate input using Zod schema
    try {
      // Valider les champs principaux avec le schéma partagé
      insertTenantHistorySchema.parse({
        rating,
        feedback,
        category,
        tenantId: parseInt(id)
      });
    } catch (validationError: any) {
      logger.warn("Validation error:", validationError);
      return res.status(400).json({ 
        error: "Erreur de validation", 
        details: validationError.errors 
      });
    }

    // Récupérer les informations du locataire pour les stocker dans le feedback
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, parseInt(id)),
      with: {
        user: true,
        property: true
      }
    });

    if (!tenant) {
      logger.error(`Tenant ${id} not found`);
      throw new AppError("Locataire non trouvé", 404);
    }

    // Préparation du texte de feedback
    const feedbackText = feedback?.trim() || '';
    
    // Ajouter des informations complémentaires si nécessaire
    let enhancedFeedback = feedbackText;
    
    // Uniquement si feedback est vide, ajouter des informations de base sur le bail
    if (!enhancedFeedback) {
      // Ajouter l'information sur le début du bail
      const leaseStartDate = tenant.leaseStart || new Date();
      const formattedDate = format(
        typeof leaseStartDate === 'string' ? parseISO(leaseStartDate) : leaseStartDate,
        'dd MMMM yyyy',
        { locale: fr }
      );
      enhancedFeedback = `Évaluation du locataire pour la propriété "${tenant.property?.name || 'inconnue'}" (bail commencé le ${formattedDate}).`;
    }
    
    // Insert new feedback entry with tenant information
    const [newFeedback] = await db.insert(feedbackHistory)
      .values({
        tenantId: parseInt(id),
        rating,
        feedback: enhancedFeedback,
        category,
        tenantFullName: tenant.user.fullName,
        isOrphaned: false,
        originalUserId: tenant.userId,
        createdBy: (req.user as any)?.id || null
      })
      .returning();

    if (!newFeedback) {
      logger.error("Failed to insert feedback");
      throw new AppError("Échec de l'ajout du feedback", 500);
    }

    logger.info("Successfully created feedback with ID:", newFeedback.id);

    // Get all feedback history for the tenant
    const feedbacks = await db.query.feedbackHistory.findMany({
      where: eq(feedbackHistory.tenantId, parseInt(id)),
      orderBy: (history, { desc }) => [desc(history.createdAt)],
      with: {
        creator: true
      }
    });

    res.json(feedbacks);

  } catch (error) {
    logger.error(`Error adding feedback for tenant ${req.params.id}:`, error);
    next(error);
  }
});

// Get feedback history for a tenant
router.get("/:id/feedback", ensureAuth, async (req, res, next) => {
  try {
    logger.info("Get feedback endpoint called", {
      isAuthenticated: req.isAuthenticated(),
      tenantId: req.params.id
    });

    if (!req.isAuthenticated()) {
      logger.warn("Unauthenticated feedback fetch attempt");
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { id } = req.params;

    const feedbacks = await db.query.feedbackHistory.findMany({
      where: eq(feedbackHistory.tenantId, parseInt(id)),
      orderBy: (history, { desc }) => [desc(history.createdAt)],
      with: {
        creator: true
      }
    });

    res.json(feedbacks);
  } catch (error) {
    logger.error(`Error fetching feedback history for tenant ${req.params.id}:`, error);
    next(error);
  }
});

// Get orphaned feedback (feedback with null tenantId)
router.get("/feedbacks/orphaned", ensureAuth, async (req, res, next) => {
  try {
    logger.info("Get orphaned feedback endpoint called", {
      isAuthenticated: req.isAuthenticated()
    });

    if (!req.isAuthenticated()) {
      logger.warn("Unauthenticated orphaned feedback fetch attempt");
      return res.status(401).json({ error: "Non authentifié" });
    }

    // Récupérer les feedbacks où tenantId est null
    // Inclure toutes les informations sauvegardées du locataire (tenantFullName, email, etc.)
    const orphanedFeedbacks = await db.query.feedbackHistory.findMany({
      where: and(
        isNull(feedbackHistory.tenantId),
        eq(feedbackHistory.isOrphaned, true)
      ),
      orderBy: (history, { desc }) => [desc(history.createdAt)],
      with: {
        creator: true
      }
    });

    logger.info(`Found ${orphanedFeedbacks.length} orphaned feedback entries`);
    
    // Ajouter des informations détaillées pour le débogage
    if (orphanedFeedbacks.length > 0) {
      logger.info(`Orphaned feedback details: ${JSON.stringify(orphanedFeedbacks.map(f => ({
        id: f.id,
        isOrphaned: f.isOrphaned,
        tenantId: f.tenantId,
        tenantFullName: f.tenantFullName
      })))}`);
    }
    
    // Formater les données pour inclure clairement les informations du locataire
    const formattedFeedbacks = orphanedFeedbacks.map(feedback => ({
      ...feedback,
      // Ajouter un champ explicite pour la compatibilité
      tenantName: feedback.tenantFullName || 'Ancien locataire'
    }));
    
    res.json(formattedFeedbacks);
  } catch (error) {
    logger.error("Error fetching orphaned feedback:", error);
    next(error);
  }
});

// PUT endpoint to update a feedback
router.put("/:tenantId/feedback/:feedbackId", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      logger.warn("Unauthenticated feedback update attempt");
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { tenantId, feedbackId } = req.params;
    const { rating, feedback, category } = req.body;

    logger.info(`Updating feedback ${feedbackId} for tenant ${tenantId}:`, { rating, feedback, category });

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      logger.warn("Invalid rating value:", rating);
      return res.status(400).json({ error: "La note doit être entre 1 et 5" });
    }

    if (feedback !== undefined && typeof feedback !== 'string') {
      logger.warn("Invalid feedback format:", feedback);
      return res.status(400).json({ error: "Le feedback doit être une chaîne de caractères" });
    }
    
    // Valider la catégorie avec la liste standardisée complète
    if (category) {
      const validCategories = [
        // Catégories financières
        'paiement', 'paiement_retard',
        // Catégories liées au bail
        'debut_bail', 'fin_bail', 'movein', 'moveout',
        // Catégories d'évaluation
        'evaluation', 'comportement', 'respect_regles',
        // Catégories de maintenance
        'entretien', 'maintenance',
        // Catégories de problèmes
        'incident', 'plainte', 'litige',
        // Autres catégories
        'communication', 'visite', 'general'
      ];
      
      if (!validCategories.includes(category)) {
        logger.warn("Invalid category:", category);
        return res.status(400).json({ error: "Catégorie non valide" });
      }
    }

    // Update feedback
    await db.update(feedbackHistory)
      .set({
        rating,
        feedback: feedback?.trim() || null,
        ...(category && { category })
      })
      .where(eq(feedbackHistory.id, parseInt(feedbackId)));

    // Get all feedback history for the tenant
    const feedbacks = await db.query.feedbackHistory.findMany({
      where: eq(feedbackHistory.tenantId, parseInt(tenantId)),
      orderBy: (history, { desc }) => [desc(history.createdAt)],
      with: {
        creator: true
      }
    });

    res.json(feedbacks);

  } catch (error) {
    logger.error(`Error updating feedback ${req.params.feedbackId}:`, error);
    next(error);
  }
});

// DELETE endpoint to remove a feedback
router.delete("/:tenantId/feedback/:feedbackId", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      logger.warn("Unauthenticated feedback deletion attempt");
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { tenantId, feedbackId } = req.params;
    logger.info(`Deleting feedback ${feedbackId} for tenant ${tenantId}`);

    // Delete feedback
    await db.delete(feedbackHistory)
      .where(eq(feedbackHistory.id, parseInt(feedbackId)));

    // Get remaining feedback history for the tenant
    const feedbacks = await db.query.feedbackHistory.findMany({
      where: eq(feedbackHistory.tenantId, parseInt(tenantId)),
      orderBy: (history, { desc }) => [desc(history.createdAt)],
      with: {
        creator: true
      }
    });

    res.json(feedbacks);

  } catch (error) {
    logger.error(`Error deleting feedback ${req.params.feedbackId}:`, error);
    next(error);
  }
});

export default router;