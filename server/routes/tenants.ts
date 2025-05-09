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

const router = express.Router();

// Accès à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Fonction pour obtenir le nom complet d'un utilisateur
const getFullName = async (userId: number) => {
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
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Exécuter la requête dans le schéma client approprié avec join sur tenants_info
    const tenantsResult = await db.execute(sql`
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
        t.tenant_info_id,
        p.name as property_name,
        p.address as property_address,
        u.username,
        u.email as user_email,
        u.full_name as user_full_name,
        u.phone_number as user_phone_number,
        ti.full_name as tenant_full_name,
        ti.email as tenant_email,
        ti.phone_number as tenant_phone_number,
        ti.notes
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN public.users u ON t.user_id = u.id
      LEFT JOIN tenants_info ti ON t.tenant_info_id = ti.id
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
      tenant_info_id: row.tenant_info_id,
      // Préférer les informations de tenants_info si disponibles
      user: {
        id: row.user_id,
        username: row.username,
        email: row.tenant_email || row.user_email,
        fullName: row.tenant_full_name || row.user_full_name || "Locataire sans nom",
        phoneNumber: row.tenant_phone_number || row.user_phone_number,
        notes: row.notes
      }
    }));
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(tenants);
  } catch (error) {
    logger.error("Error retrieving tenants:", error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    next(error);
  }
});

// Obtenir un locataire spécifique par ID
router.get("/:id", ensureAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new AppError("ID de locataire invalide", 400));
    }
    
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Exécuter la requête dans le schéma client approprié avec join sur tenants_info
    const tenantResult = await db.execute(sql`
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
        t.tenant_info_id,
        p.name as property_name,
        p.address as property_address,
        u.username,
        u.email as user_email,
        u.full_name as user_full_name,
        u.phone_number as user_phone_number,
        ti.full_name as tenant_full_name,
        ti.email as tenant_email,
        ti.phone_number as tenant_phone_number,
        ti.notes
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN public.users u ON t.user_id = u.id
      LEFT JOIN tenants_info ti ON t.tenant_info_id = ti.id
      WHERE t.id = ${id}
    `);
    
    if (tenantResult.rows.length === 0) {
      // Réinitialiser le search_path avant de retourner l'erreur
      await db.execute(sql`SET search_path TO public`);
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
      tenant_info_id: row.tenant_info_id,
      // Préférer les informations de tenants_info si disponibles
      user: {
        id: row.user_id,
        username: row.username,
        email: row.tenant_email || row.user_email,
        fullName: row.tenant_full_name || row.user_full_name || "Locataire sans nom",
        phoneNumber: row.tenant_phone_number || row.user_phone_number,
        notes: row.notes
      }
    };
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(tenant);
  } catch (error) {
    logger.error(`Error retrieving tenant ${req.params.id}:`, error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    next(error);
  }
});

// POST: Créer un nouveau locataire
router.post("/", ensureAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

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
      notes
    } = req.body;

    // Vérifier si on utilise un ID d'utilisateur existant ou si on crée une nouvelle entrée dans tenants_info
    let tenantInfoId = null;
    let tenantUserId = null;

    if (existingUserId) {
      // Si un utilisateur existant est fourni, on l'utilise
      tenantUserId = existingUserId;
      
      // Vérifier si l'utilisateur existe
      const userResult = await db.execute(sql`SELECT * FROM public.users WHERE id = ${existingUserId}`);
      if (userResult.rows.length === 0) {
        // Réinitialiser le search_path avant de retourner l'erreur
        await db.execute(sql`SET search_path TO public`);
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      
      // Vérifier si une entrée tenants_info existe déjà pour cet utilisateur
      const tenantInfoResult = await db.execute(sql`
        SELECT id FROM tenants_info 
        WHERE full_name = ${userResult.rows[0].full_name} OR email = ${userResult.rows[0].email}
        LIMIT 1
      `);
      
      if (tenantInfoResult.rows.length > 0) {
        // Utiliser l'entrée existante
        tenantInfoId = tenantInfoResult.rows[0].id;
        logger.info(`Réutilisation de l'entrée tenants_info existante: ${tenantInfoId}`);
      } else {
        // Créer une nouvelle entrée dans tenants_info
        const tenantInfoInsertResult = await db.execute(sql`
          INSERT INTO tenants_info (
            full_name, email, phone_number, notes, created_at, updated_at
          ) VALUES (
            ${userResult.rows[0].full_name},
            ${userResult.rows[0].email},
            ${userResult.rows[0].phone_number},
            ${notes || null},
            NOW(), NOW()
          ) RETURNING *
        `);
        
        tenantInfoId = tenantInfoInsertResult.rows[0].id;
        logger.info(`Création d'une nouvelle entrée tenants_info: ${tenantInfoId}`);
      }
    } else {
      // Créer une nouvelle entrée dans tenants_info
      const tenantInfoInsertResult = await db.execute(sql`
        INSERT INTO tenants_info (
          full_name, email, phone_number, notes, created_at, updated_at
        ) VALUES (
          ${fullName},
          ${email},
          ${phoneNumber},
          ${notes || null},
          NOW(), NOW()
        ) RETURNING *
      `);
      
      tenantInfoId = tenantInfoInsertResult.rows[0].id;
      logger.info(`Création d'une nouvelle entrée tenants_info: ${tenantInfoId}`);
    }

    try {
      // Create tenant record
      const tenantInsertResult = await db.execute(sql`
        INSERT INTO tenants (
          user_id, property_id, lease_start, lease_end, rent_amount, lease_type, active, lease_status, tenant_info_id
        ) VALUES (
          ${tenantUserId}, 
          ${Number(propertyId)},
          ${new Date(leaseStart)},
          ${new Date(leaseEnd)},
          ${rentAmount.toString()},
          ${leaseType},
          ${true},
          ${'actif'},
          ${tenantInfoId}
        ) RETURNING *
      `);
      
      const tenant = tenantInsertResult.rows[0];
      logger.info(`Created tenant ID ${tenant.id} with tenant_info_id ${tenantInfoId}`);

      // Update property status and rent amount
      await db.execute(sql`
        UPDATE properties
        SET
          status = 'rented',
          monthly_rent = ${rentAmount.toString()}
        WHERE id = ${Number(propertyId)}
      `);

      // Create transactions if requested
      if (createTransactions === "true" || createTransactions === true) {
        logger.info(`Generating rent transactions for tenant ${tenant.id}`);
        
        // Get property information for transaction generation
        const propertyResult = await db.execute(sql`
          SELECT name, address FROM properties WHERE id = ${propertyId}
        `);
        
        const property = propertyResult.rows[0];
        
        if (property) {
          // Generate transaction objects for the lease period
          const transactionObjects = generateRentTransactions(
            tenant.id,
            parseFloat(rentAmount),
            new Date(leaseStart),
            new Date(leaseEnd),
            property.name,
            property.address
          );
          
          logger.info(`Generated transaction objects`);
          
          // Insert transactions
          if (transactionObjects && transactionObjects.length > 0) {
            for (const txObj of transactionObjects) {
              await db.execute(sql`
                INSERT INTO transactions (
                  tenant_id, amount, date, description, status, 
                  category, property_id, recurring, frequency, 
                  rent_period_start, rent_period_end
                ) VALUES (
                  ${txObj.tenantId},
                  ${txObj.amount},
                  ${txObj.date || txObj.transactionDate},
                  ${txObj.description},
                  ${txObj.status},
                  ${txObj.category},
                  ${Number(propertyId)},
                  ${txObj.recurring},
                  ${txObj.frequency},
                  ${txObj.rentPeriodStart},
                  ${txObj.rentPeriodEnd}
                )
              `);
            }
            logger.info(`Created rent transactions for tenant ${tenant.id}`);
          }
        }
      }

      // Associate documents with tenant if any
      if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
        logger.info(`Associating ${documentIds.length} documents with tenant ${tenant.id}`);
        
        // Filter to only get documents not already associated with this tenant
        const existingDocsResult = await db.execute(sql`
          SELECT document_id FROM tenant_documents WHERE tenant_id = ${tenant.id}
        `);
        
        const existingDocIds = existingDocsResult.rows.map(row => row.document_id);
        const newDocIds = documentIds.filter(id => !existingDocIds.includes(Number(id)));
        
        logger.info(`Found ${existingDocIds.length} existing document associations, adding ${newDocIds.length} new ones`);
        
        // Insert only new associations
        if (newDocIds.length > 0) {
          logger.info(`Adding ${newDocIds.length} new document associations to tenant ${tenant.id}`);
          
          for (const docId of newDocIds) {
            await db.execute(sql`
              INSERT INTO tenant_documents
              (tenant_id, document_id, document_type)
              VALUES (${tenant.id}, ${docId}, 'lease')
              ON CONFLICT DO NOTHING
            `);
          }
        }
      }

      // Récupérer les infos du locataire pour la réponse
      const tenantInfoResult = await db.execute(sql`
        SELECT * FROM tenants_info WHERE id = ${tenantInfoId}
      `);
      
      const tenantInfo = tenantInfoResult.rows[0];

      // Réinitialiser le search_path après utilisation
      await db.execute(sql`SET search_path TO public`);
      
      res.status(201).json({
        id: tenant.id,
        userId: tenant.user_id,
        tenant_info_id: tenant.tenant_info_id,
        tenantInfo: {
          id: tenantInfo.id,
          fullName: tenantInfo.full_name,
          email: tenantInfo.email,
          phoneNumber: tenantInfo.phone_number,
          notes: tenantInfo.notes
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
      // Réinitialiser le search_path en cas d'erreur dans le bloc interne
      await db.execute(sql`SET search_path TO public`).catch(() => {});
      throw error;
    }
  } catch (error) {
    logger.error("Error during tenant creation:", error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    next(new AppError("Erreur lors de la création du locataire", 500));
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
          SET status = 'available', monthly_rent = 0
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
        SET status = 'available', monthly_rent = 0
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