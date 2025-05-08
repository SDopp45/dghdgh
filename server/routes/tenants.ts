import express from "express";
import { db } from "@db";
import { Pool } from 'pg';
import { tenants, users, properties, tenantDocuments as tenantDocumentsTable, documents, visits, transactions, feedbackHistory, tenantHistory, maintenanceRequests } from "@shared/schema";
import { eq, and, count, desc, not, isNull, or, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { addMonths, differenceInMonths, parseISO, format } from "date-fns";
import { fr } from 'date-fns/locale';
import { calculateAverageRating, generateRentTransactions, findOrphanedFeedbacks, handleTransactions } from "../utils/tenant-utils";
import { generateUniqueUsername } from "../utils/auth";
import { ensureAuth, getUserId } from "../middleware/auth";
import { getClientDb } from "../db/index";

const router = express.Router();

// Accès à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Fonction pour obtenir le nom complet d'un utilisateur
const getFullName = async (userId) => {
  try {
    const userResult = await pool.query(
      "SELECT full_name FROM public.users WHERE id = $1",
      [userId]
    );
    return userResult.rows[0]?.full_name || "";
  } catch (error) {
    logger.error(`Error getting full name for user ${userId}:`, error);
    return "";
  }
};

// Routes pour les locataires
router.get("/", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Exécuter la requête dans le schéma client approprié
    const tenantsResult = await pool.query(`
      SELECT 
        t.id, 
        t.user_id, 
        t.property_id, 
        t.lease_start, 
        t.lease_end, 
        t.rent_amount, 
        t.lease_type, 
        t.active, 
        t.lease_status,
        p.name as property_name,
        p.address as property_address,
        u.username,
        u.email,
        u.full_name,
        u.phone_number
      FROM ${schema}.tenants t
      LEFT JOIN ${schema}.properties p ON t.property_id = p.id
      LEFT JOIN public.users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    
    const tenants = tenantsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      propertyId: row.property_id,
      propertyName: row.property_name,
      propertyAddress: row.property_address,
      leaseStart: row.lease_start,
      leaseEnd: row.lease_end,
      rentAmount: row.rent_amount,
      leaseType: row.lease_type,
      active: row.active,
      leaseStatus: row.lease_status,
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        phoneNumber: row.phone_number
      }
    }));
    
    res.json(tenants);
  } catch (error) {
    logger.error("Error retrieving tenants:", error);
    next(error);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Obtenir un locataire spécifique par ID
router.get("/:id", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError("ID de locataire invalide", 400));
    }
    
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Exécuter la requête dans le schéma client approprié
    const tenantResult = await pool.query(`
      SELECT 
        t.id, 
        t.user_id, 
        t.property_id, 
        t.lease_start, 
        t.lease_end, 
        t.rent_amount, 
        t.lease_type, 
        t.active, 
        t.lease_status,
        p.name as property_name,
        p.address as property_address,
        u.username,
        u.email,
        u.full_name,
        u.phone_number
      FROM ${schema}.tenants t
      LEFT JOIN ${schema}.properties p ON t.property_id = p.id
      LEFT JOIN public.users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [id]);
    
    if (tenantResult.rows.length === 0) {
      return next(new AppError("Locataire non trouvé", 404));
    }
    
    const row = tenantResult.rows[0];
    const tenant = {
      id: row.id,
      userId: row.user_id,
      propertyId: row.property_id,
      propertyName: row.property_name,
      propertyAddress: row.property_address,
      leaseStart: row.lease_start,
      leaseEnd: row.lease_end,
      rentAmount: row.rent_amount,
      leaseType: row.lease_type,
      active: row.active,
      leaseStatus: row.lease_status,
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        phoneNumber: row.phone_number
      }
    };
    
    res.json(tenant);
  } catch (error) {
    logger.error(`Error retrieving tenant ${req.params.id}:`, error);
    next(error);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Update tenant creation route to handle automatic transaction creation
router.post("/", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  let client = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;

    // Commencer une transaction SQL
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`SET search_path TO ${schema}, public`);

    const {
      fullName,
      existingUserId,
      email,
      phoneNumber,
      propertyId,
      leaseStart,
      leaseEnd,
      rentAmount,
      leaseType,
      createTransactions,
      documentIds,
      password,
      username: providedUsername,
    } = req.body;

    const existingUser = existingUserId
      ? await client.query('SELECT * FROM public.users WHERE id = $1', [existingUserId])
          .then(res => res.rows[0])
      : null;

    let user;
    let tenant = null;
    let insertedTenantDocs = [];
    let username;
    
    if (existingUser) {
      // Réutiliser l'utilisateur existant
      user = existingUser;
      username = user.username;
      logger.info(`Found existing user with matching name, generating unique username`);
    } else {
      // Generate unique username
      username = await generateUniqueUsername(fullName);
      logger.info(`Generated unique username ${username} for new user ${fullName}`);

      // Create password hash
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // Create user record
      const userInsertResult = await client.query(`
        INSERT INTO public.users (
          username, password, email, phone_number, full_name, role, registration_date
        ) VALUES (
          $1, $2, $3, $4, $5, 'tenant', NOW()
        ) RETURNING *
      `, [
        providedUsername || username,
        hash,
        email,
        phoneNumber,
        fullName
      ]);
      
      user = userInsertResult.rows[0];
      logger.info(`Created new user with ID ${user.id}`);
    }

    try {
      // Create tenant record
      const tenantInsertResult = await client.query(`
        INSERT INTO ${schema}.tenants (
          user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *
      `, [
        user.id,
        Number(propertyId),
        new Date(leaseStart),
        new Date(leaseEnd),
        rentAmount.toString(),
        leaseType,
        true,
        'actif'
      ]);
      
      tenant = tenantInsertResult.rows[0];
      logger.info(`Created tenant ID ${tenant.id} for user ${user.id}`);

      // Update property status and rent amount
      await client.query(`
        UPDATE ${schema}.properties
        SET
          status = 'rented',
          monthly_rent = $1
        WHERE id = $2
      `, [rentAmount.toString(), Number(propertyId)]);

      // Create transactions if requested
      if (createTransactions === "true" || createTransactions === true) {
        logger.info(`Generating rent transactions for tenant ${tenant.id}`);
        
        // Get property information for transaction generation
        const propertyResult = await client.query(`
          SELECT name, address FROM ${schema}.properties WHERE id = $1
        `, [propertyId]);
        
        const property = propertyResult.rows[0];
        
        if (property) {
          // Generate transaction objects for the lease period
          const transactionObjects = generateRentTransactions(
            tenant.id,
            rentAmount,
            new Date(leaseStart),
            new Date(leaseEnd),
            property.name,
            property.address
          );
          
          logger.info(`Generated ${transactionObjects.length} transaction objects`);
          
          // Insert transactions
          if (transactionObjects.length > 0) {
            for (const txObj of transactionObjects) {
              await client.query(`
                INSERT INTO ${schema}.transactions (
                  tenant_id, amount, transaction_date, description, status, 
                  category, property_id, recurring, frequency, 
                  rent_period_start, rent_period_end
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                )
              `, [
                txObj.tenantId,
                txObj.amount,
                txObj.transactionDate,
                txObj.description,
                txObj.status,
                txObj.category,
                propertyId,
                txObj.recurring,
                txObj.frequency,
                txObj.rentPeriodStart,
                txObj.rentPeriodEnd
              ]);
            }
            logger.info(`Created ${transactionObjects.length} rent transactions for tenant ${tenant.id}`);
          }
        }
      }

      // Associate documents with tenant if any
      if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
        logger.info(`Associating ${documentIds.length} documents with tenant ${tenant.id}`);
        
        // Filter to only get documents not already associated with this tenant
        const existingDocsResult = await client.query(`
          SELECT document_id FROM ${schema}.tenant_documents WHERE tenant_id = $1
        `, [tenant.id]);
        
        const existingDocIds = existingDocsResult.rows.map(row => row.document_id);
        const newDocIds = documentIds.filter(id => !existingDocIds.includes(Number(id)));
        
        logger.info(`Found ${existingDocIds.length} existing document associations, adding ${newDocIds.length} new ones`);
        
        // Insert only new associations
        if (newDocIds.length > 0) {
          logger.info(`Adding ${newDocIds.length} new document associations to tenant ${tenant.id}`);
          
          for (const docId of newDocIds) {
            await client.query(`
              INSERT INTO ${schema}.tenant_documents
              (tenant_id, document_id, document_type)
              VALUES ($1, $2, $3)
              ON CONFLICT DO NOTHING
            `, [tenant.id, docId, 'lease']);
          }
        }
      }

      // Commit the transaction
      await client.query('COMMIT');

      res.status(201).json({
        id: tenant.id,
        userId: tenant.user_id,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phoneNumber: user.phone_number,
        },
        propertyId: tenant.property_id,
        leaseStart: tenant.lease_start,
        leaseEnd: tenant.lease_end,
        rentAmount: tenant.rent_amount,
        leaseType: tenant.lease_type,
        active: tenant.active,
        leaseStatus: tenant.lease_status
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error("Error during tenant creation:", error);
    next(new AppError("Erreur lors de la création du locataire", 500));
  } finally {
    if (client) {
      client.release();
    }
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Route pour supprimer un locataire
router.delete("/:id", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  let client = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError("ID de locataire invalide", 400));
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    // Commencer une transaction SQL
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`SET search_path TO ${schema}, public`);

    // Récupérer les informations du locataire
    const tenantResult = await client.query(`
      SELECT * FROM ${schema}.tenants WHERE id = $1
    `, [id]);
    
    if (tenantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return next(new AppError("Locataire non trouvé", 404));
    }
    
    const tenant = tenantResult.rows[0];
    
    // Récupérer la propriété associée
    const propertyResult = await client.query(`
      SELECT * FROM ${schema}.properties WHERE id = $1
    `, [tenant.property_id]);
    
    // Supprimer les associations de documents
    await client.query(`
      DELETE FROM ${schema}.tenant_documents WHERE tenant_id = $1
    `, [id]);
    
    // Supprimer les transactions associées
    await client.query(`
      DELETE FROM ${schema}.transactions WHERE tenant_id = $1
    `, [id]);
    
    // Supprimer le locataire
    await client.query(`
      DELETE FROM ${schema}.tenants WHERE id = $1
    `, [id]);
    
    // Mettre à jour le statut de la propriété si nécessaire
    if (propertyResult.rows.length > 0) {
      // Vérifier s'il y a d'autres locataires pour cette propriété
      const otherTenantsResult = await client.query(`
        SELECT COUNT(*) FROM ${schema}.tenants 
        WHERE property_id = $1 AND active = true
      `, [tenant.property_id]);
      
      const otherTenantsCount = parseInt(otherTenantsResult.rows[0].count);
      
      if (otherTenantsCount === 0) {
        // S'il n'y a plus de locataires actifs, marquer la propriété comme disponible
        await client.query(`
          UPDATE ${schema}.properties 
          SET status = 'available'
          WHERE id = $1
        `, [tenant.property_id]);
      }
    }
    
    // Commit la transaction
    await client.query('COMMIT');
    
    res.status(200).json({ message: "Locataire supprimé avec succès" });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    logger.error(`Error deleting tenant ${req.params.id}:`, error);
    next(error);
  } finally {
    if (client) {
      client.release();
    }
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Archive tenant
router.post("/:id/archive", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const { id } = req.params;
    const { rating, feedback } = req.body;

    // Récupérer les informations sur le locataire
    const tenantResult = await pool.query(`
      SELECT t.*, p.name as property_name, u.full_name
      FROM ${schema}.tenants t 
      LEFT JOIN ${schema}.properties p ON t.property_id = p.id
      LEFT JOIN public.users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [id]);
    
    if (tenantResult.rows.length === 0) {
      return next(new AppError("Locataire non trouvé", 404));
    }
    
    const tenant = tenantResult.rows[0];
    
    // Créer une entrée dans l'historique
    await pool.query(`
      INSERT INTO ${schema}.tenant_history (
        tenant_id, tenant_full_name, rating, feedback, category, 
        bail_id, bail_status, property_name, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `, [
      tenant.id,
      tenant.full_name,
      rating || 0,
      feedback || "",
      "fin_bail",
      tenant.id,
      "terminé",
      tenant.property_name,
      authenticatedUserId
    ]);
    
    // Mettre à jour le locataire comme inactif
    await pool.query(`
      UPDATE ${schema}.tenants 
      SET active = false, lease_status = 'terminé'
      WHERE id = $1
    `, [id]);
    
    // Vérifier s'il y a d'autres locataires pour cette propriété
    const otherTenantsResult = await pool.query(`
      SELECT COUNT(*) FROM ${schema}.tenants 
      WHERE property_id = $1 AND active = true
    `, [tenant.property_id]);
    
    const otherTenantsCount = parseInt(otherTenantsResult.rows[0].count);
    
    // Si aucun autre locataire actif, mettre à jour le statut de la propriété
    if (otherTenantsCount === 0) {
      await pool.query(`
        UPDATE ${schema}.properties 
        SET status = 'available'
        WHERE id = $1
      `, [tenant.property_id]);
    }
    
    res.status(200).json({ 
      message: `Locataire archivé avec succès${feedback ? " avec commentaires" : ""}` 
    });
  } catch (error) {
    logger.error(`Error archiving tenant ${req.params.id}:`, error);
    next(error);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Add feedback to tenant history
router.post("/:id/feedback", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const tenantId = parseInt(req.params.id);
    const { rating, feedback, category } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError("Note invalide, doit être entre 1 et 5", 400));
    }

    // Récupérer les informations sur le locataire
    const tenantResult = await pool.query(`
      SELECT t.*, p.name as property_name, u.full_name
      FROM ${schema}.tenants t 
      LEFT JOIN ${schema}.properties p ON t.property_id = p.id
      LEFT JOIN public.users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      return next(new AppError("Locataire non trouvé", 404));
    }
    
    const tenant = tenantResult.rows[0];

    // Ajouter une entrée dans l'historique du locataire
    const historyResult = await pool.query(`
      INSERT INTO ${schema}.tenant_history (
        tenant_id, tenant_full_name, rating, feedback, category, 
        property_name, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `, [
      tenant.id,
      tenant.full_name,
      rating,
      feedback || "",
      category || "evaluation",
      tenant.property_name,
      authenticatedUserId
    ]);
    
    res.status(201).json({
      message: "Commentaire ajouté avec succès",
      history: historyResult.rows[0]
    });
  } catch (error) {
    logger.error(`Error adding feedback for tenant ${req.params.id}:`, error);
    next(error);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Get tenant feedback history
router.get("/:id/feedback", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const tenantId = parseInt(req.params.id);

    // Get feedback history for the tenant
    const feedbackResult = await pool.query(`
      SELECT 
        th.*,
        u.id as creator_id,
        u.username as creator_username,
        u.full_name as creator_full_name
      FROM ${schema}.tenant_history th
      LEFT JOIN public.users u ON th.created_by = u.id
      WHERE th.tenant_id = $1
      ORDER BY th.created_at DESC
    `, [tenantId]);

    // Format the results
    const feedbacks = feedbackResult.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      rating: row.rating,
      feedback: row.feedback,
      category: row.category,
      createdAt: row.created_at,
      createdBy: {
        id: row.creator_id,
        username: row.creator_username,
        fullName: row.creator_full_name
      }
    }));

    res.json(feedbacks);
  } catch (error) {
    logger.error(`Error getting feedback for tenant ${req.params.id}:`, error);
    next(error);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Delete feedback from history
router.delete("/:tenantId/feedback/:feedbackId", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const tenantId = parseInt(req.params.tenantId);
    const feedbackId = parseInt(req.params.feedbackId);

    // Delete the feedback
    await pool.query(`
      DELETE FROM ${schema}.tenant_history
      WHERE id = $1 AND tenant_id = $2
    `, [feedbackId, tenantId]);

    // Get remaining feedback history for the tenant using the correct client schema
    const feedbacksResult = await pool.query(`
      SELECT 
        th.*,
        u.id as creator_id,
        u.username as creator_username,
        u.full_name as creator_full_name
      FROM ${schema}.tenant_history th
      LEFT JOIN public.users u ON th.created_by = u.id
      WHERE th.tenant_id = $1
      ORDER BY th.created_at DESC
    `, [tenantId]);

    // Formater les résultats pour correspondre au format attendu par le frontend
    const feedbacks = feedbacksResult.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      rating: row.rating,
      feedback: row.feedback,
      category: row.category,
      createdAt: row.created_at,
      createdBy: {
        id: row.creator_id,
        username: row.creator_username,
        fullName: row.creator_full_name
      }
    }));

    res.json({
      message: "Commentaire supprimé avec succès",
      remainingFeedbacks: feedbacks
    });
  } catch (error) {
    logger.error(`Error deleting feedback ${req.params.feedbackId} for tenant ${req.params.tenantId}:`, error);
    next(error);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
});

// Attach an orphaned history to a tenant
router.post("/:id/attach-history/:orphanedHistoryId", ensureAuth, async (req, res, next) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const user = req.user as any;
    const schema = user.role === 'admin' ? 'public' : `client_${user.id}`;
    
    const tenantId = parseInt(req.params.id);
    const orphanedHistoryId = req.params.orphanedHistoryId;

    // Récupérer l'historique orphelin spécifié
    const orphanedHistoryResult = await pool.query(`
      SELECT * FROM ${schema}.tenant_history
      WHERE id = $1 AND is_orphaned = true
    `, [parseInt(orphanedHistoryId.toString())]);
    
    const orphanedHistory = orphanedHistoryResult.rows[0];

    if (!orphanedHistory) {
      return next(new AppError("Entrée d'historique orpheline non trouvée", 404));
    }

    // Récupérer les informations sur le locataire
    const tenantResult = await pool.query(`
      SELECT t.*, u.full_name
      FROM ${schema}.tenants t 
      LEFT JOIN public.users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      return next(new AppError("Locataire non trouvé", 404));
    }
    
    const tenant = tenantResult.rows[0];

    // Mettre à jour l'entrée d'historique pour l'associer au locataire
    await pool.query(`
      UPDATE ${schema}.tenant_history
      SET 
        tenant_id = $1, 
        tenant_full_name = $2,
        is_orphaned = false
      WHERE id = $3
    `, [
      tenant.id,
      tenant.full_name,
      orphanedHistory.id
    ]);

    res.status(200).json({
      message: "Historique attaché avec succès au locataire",
      tenantId: tenant.id,
      historyId: orphanedHistory.id
    });
  } catch (error) {
    logger.error(`Error attaching history ${req.params.orphanedHistoryId} to tenant ${req.params.id}:`, error);
    next(error);
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
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
        visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 60) - 1); // Dans les 60 derniers jours
      }

      // Choisir une propriété aléatoire
      const randomProperty = properties[Math.floor(Math.random() * properties.length)];

      // Créer une visite de test
      const [visit] = await db.insert(visits).values({
        firstName: `Prénom${i}`,
        lastName: `Nom${i}`,
        email: `test${i}@example.com`,
        phone: `0${Math.floor(Math.random() * 10000000) + 600000000}`,
        datetime: visitDate,
        visitType: Math.random() > 0.5 ? "physical" : "virtual",
        propertyId: randomProperty.id,
        status: isUpcoming ? "pending" : "completed",
        archived: !isUpcoming,
        agentId: 1,
        source: "test",
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      testVisits.push(visit);
    }

    res.status(201).json({
      message: `${testVisits.length} visites de test générées avec succès`,
      count: testVisits.length
    });
  } catch (error) {
    logger.error("Error generating test visits:", error);
    next(error);
  }
});

export default router;