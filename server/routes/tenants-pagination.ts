import express from "express";
import { db } from "@db";
import { tenants, users, properties, feedbackHistory } from "@shared/schema";
import { eq, and, count, desc, asc, sql, like, or, between, gte, lte, isNull, not } from "drizzle-orm";
import logger from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { calculateAverageRating, buildTenantFilterConditions } from "../utils/tenant-utils";
import { ensureAuth, getUserId } from "../middleware/auth";

const router = express.Router();

/**
 * Route GET pour récupérer les locataires avec pagination et filtres
 */
router.get("/paginated", ensureAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      throw new AppError("Non authentifié", 401);
    }

    logger.info("Fetching paginated tenants with query params:", req.query);

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);

    // Paramètres de pagination
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const offset = (page - 1) * pageSize;

    // Paramètres de tri
    const sortField = (req.query.sortField as string) || 'leaseEnd';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    // Construire les filtres
    const filters: any = {};
    
    // Filtre par nom
    if (req.query.fullName) {
      filters.fullName = req.query.fullName;
    }
    
    // Filtre par propriété
    if (req.query.propertyId) {
      filters.propertyId = parseInt(req.query.propertyId as string);
    }
    
    // Filtre par type de bail
    if (req.query.leaseType) {
      filters.leaseType = req.query.leaseType; // Peut être une chaîne ou un tableau
    }
    
    // Filtre par dates de fin de bail
    if (req.query.leaseEndFrom || req.query.leaseEndTo) {
      filters.leaseEndRange = {
        from: req.query.leaseEndFrom ? new Date(req.query.leaseEndFrom as string) : null,
        to: req.query.leaseEndTo ? new Date(req.query.leaseEndTo as string) : null
      };
    }
    
    // Filtre par statut (actif, archivé)
    if (req.query.status) {
      filters.status = req.query.status; // Peut être 'active', 'archived' ou un tableau
    }
    
    // Filtre par note minimale
    if (req.query.minRating) {
      filters.minRating = parseFloat(req.query.minRating as string);
    }

    // Construction de la requête avec les filtres
    let query = db.select({
      tenant: tenants,
      user: users,
      property: properties,
      count: count(tenants.id).as("total")
    })
    .from(tenants)
    .leftJoin(users, eq(tenants.userId, users.id))
    .leftJoin(properties, eq(tenants.propertyId, properties.id));

    // Appliquer les filtres
    const conditions = buildTenantFilterConditions(filters);
    
    // Ajouter les conditions à la requête
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Exécuter la requête pour obtenir le nombre total
    const countResult = await query;
    const totalItems = countResult.length > 0 ? Number(countResult[0].count) : 0;
    
    // Construire la requête pour récupérer les données paginées
    let dataQuery = db.select()
      .from(tenants)
      .leftJoin(users, eq(tenants.userId, users.id))
      .leftJoin(properties, eq(tenants.propertyId, properties.id));
    
    // Appliquer les mêmes filtres
    if (conditions.length > 0) {
      dataQuery = dataQuery.where(and(...conditions));
    }
    
    // Appliquer le tri
    if (sortField && sortOrder) {
      // Gestion spéciale pour les champs imbriqués
      if (sortField === 'fullName') {
        dataQuery = dataQuery.orderBy(
          sortOrder === 'desc' ? desc(users.fullName) : asc(users.fullName)
        );
      } else if (sortField === 'propertyName') {
        dataQuery = dataQuery.orderBy(
          sortOrder === 'desc' ? desc(properties.name) : asc(properties.name)
        );
      } else {
        // Pour les champs directement dans tenants
        const field = tenants[sortField as keyof typeof tenants];
        if (field) {
          dataQuery = dataQuery.orderBy(
            sortOrder === 'desc' ? desc(field) : asc(field)
          );
        }
      }
    }
    
    // Ajouter la pagination
    dataQuery = dataQuery.limit(pageSize).offset(offset);
    
    // Exécuter la requête de données
    const tenantsData = await dataQuery;
    
    // Récupérer l'historique des feedbacks pour calculer les notes moyennes
    const tenantIds = tenantsData.map(row => row.tenants.id);
    
    let feedbacks = [];
    if (tenantIds.length > 0) {
      feedbacks = await db.select()
        .from(feedbackHistory)
        .where(
          or(
            // Soit le feedback est associé à un locataire existant
            and(
              not(isNull(feedbackHistory.tenantId)),
              or(...tenantIds.map(id => eq(feedbackHistory.tenantId, id)))
            ),
            // Soit c'est un feedback orphelin de l'un des utilisateurs
            and(
              isNull(feedbackHistory.tenantId),
              eq(feedbackHistory.isOrphaned, true),
              or(...tenantsData.map(row => eq(feedbackHistory.originalUserId, row.users.id)))
            )
          )
        );
    }
    
    // Organiser les feedbacks par tenantId
    const feedbacksByTenant = feedbacks.reduce((acc, feedback) => {
      const id = feedback.tenantId;
      if (id) {
        if (!acc[id]) acc[id] = [];
        acc[id].push(feedback);
      }
      return acc;
    }, {} as Record<number, any[]>);
    
    // Organiser les feedbacks orphelins par originalUserId
    const orphanedFeedbacksByUser = feedbacks
      .filter(f => f.isOrphaned && !f.tenantId)
      .reduce((acc, feedback) => {
        const id = feedback.originalUserId;
        if (id) {
          if (!acc[id]) acc[id] = [];
          acc[id].push(feedback);
        }
        return acc;
      }, {} as Record<number, any[]>);
    
    // Format des données finales
    const formattedTenants = tenantsData.map(row => {
      const tenantId = row.tenants.id;
      const userId = row.users.id;
      
      // Combinaison des feedbacks directs et orphelins
      const directFeedbacks = feedbacksByTenant[tenantId] || [];
      const orphanedFeedbacks = orphanedFeedbacksByUser[userId] || [];
      const allFeedbacks = [...directFeedbacks, ...orphanedFeedbacks];
      
      // Calcul de la note moyenne
      const averageRating = calculateAverageRating(allFeedbacks);
      
      // Note: filtre par note minimale appliqué côté client pour ce prototype
      // Dans une implémentation complète, ce serait fait côté serveur avec une sous-requête
      
      return {
        ...row.tenants,
        user: row.users,
        property: row.properties,
        feedbackHistory: allFeedbacks,
        averageRating
      };
    });
    
    // Filtrer par note minimale ici si spécifié
    let filteredTenants = formattedTenants;
    if (filters.minRating !== undefined) {
      filteredTenants = formattedTenants.filter(tenant => 
        tenant.averageRating !== null && 
        tenant.averageRating >= filters.minRating
      );
    }
    
    // Ajuster le comptage total si filtré par note
    const finalTotal = filters.minRating !== undefined 
      ? filteredTenants.length 
      : totalItems;
    
    // Calculer les métadonnées de pagination
    const totalPages = Math.ceil(finalTotal / pageSize);
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json({
      data: filteredTenants,
      meta: {
        totalItems: finalTotal,
        totalPages,
        currentPage: page,
        pageSize
      }
    });
    
  } catch (error) {
    logger.error("Error in paginated tenants fetch:", error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (e) {
      // Ignorer les erreurs de réinitialisation
    }
    
    next(error);
  }
});

export default router; 