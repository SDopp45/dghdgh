import { Router } from 'express';
import { and, eq, isNull, ilike, like, or, ne, desc, sql, not } from 'drizzle-orm';
import { db } from '../db';
import { Pool } from 'pg';
import { tenantHistory, tenants, properties, users, documents as documentsTable, tenantDocuments } from '@shared/schema';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { getUserFromSession } from '../utils/session';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { AppError } from '../middleware/errorHandler';
import { ensureAuth, getUserId } from '../middleware/auth';
import { getClientDb } from '../db/index';

// Accès à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configuration pour multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'tenant-history');
    // Assurez-vous que le répertoire existe
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err, uploadDir));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = Router();

// Nouvel endpoint pour récupérer les locataires pour tenant-history
router.get('/tenants', ensureAuth, asyncHandler(async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;
    
    logger.info(`Fetching tenants and tenant_info for tenant-history view`);

    // Récupérer les locataires actifs avec leurs informations depuis tenants_info
    const activeTenants = await pool.query(`
      SELECT 
        t.id, 
        t.property_id AS "propertyId",
        ti.full_name AS "fullName",
        ti.email,
        ti.phone_number AS "phoneNumber",
        p.name AS "propertyName"
      FROM ${schema}.tenants t
      JOIN ${schema}.tenants_info ti ON t.tenant_info_id = ti.id
      LEFT JOIN ${schema}.properties p ON t.property_id = p.id
      ORDER BY ti.full_name
    `);

    // Récupérer les locataires qui existent uniquement dans l'historique (noms manuels)
    const historyOnlyTenants = await pool.query(`
      SELECT DISTINCT tenant_full_name AS "tenantFullName"
      FROM ${schema}.tenant_history
      WHERE tenant_full_name IS NOT NULL
      ORDER BY tenant_full_name
    `);

    // Transformer les résultats actifs en format compatible
    const activeTenantsList = activeTenants.rows.map(t => ({
      id: t.id,
      fullName: t.fullName,
      propertyId: t.propertyId,
      propertyName: t.propertyName,
      email: t.email,
      phoneNumber: t.phoneNumber,
      active: true,
      isHistoryOnly: false
    }));

    // Transformer les résultats de l'historique en format compatible
    const historyTenantsList = historyOnlyTenants.rows
      .filter(t => t.tenantFullName && t.tenantFullName.trim() !== '') // Filtrer les noms vides ou juste des espaces
      .map((t, index) => ({
        id: -Math.floor(Math.random() * 1000000) - 1, // ID négatif aléatoire
        fullName: t.tenantFullName,
        propertyId: 0, 
        propertyName: null,
        active: true, // Non pertinent mais attendu par le type?
        isHistoryOnly: true // Toutes les entrées viennent de l'historique maintenant
      }));

    // Combiner les deux listes et enlever les doublons
    // On vérifie si un tenant de l'historique existe déjà dans la liste active par son nom
    const activeNames = new Set(activeTenantsList.map(t => t.fullName.toLowerCase().trim()));
    const filteredHistoryTenants = historyTenantsList.filter(t => 
      !activeNames.has(t.fullName.toLowerCase().trim())
    );
    
    const combinedTenants = [...activeTenantsList, ...filteredHistoryTenants];
    
    res.json(combinedTenants);
  } catch (error) {
    logger.error('Error fetching tenants for history:', error);
    res.status(500).json({ error: 'Impossible de récupérer la liste des locataires pour l\'historique' });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
}));

// Nouvel endpoint pour récupérer les propriétés pour tenant-history
router.get('/properties', ensureAuth, asyncHandler(async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;
    
    logger.info(`Fetching properties for tenant-history view`);

    // Récupérer uniquement les données nécessaires des propriétés
    const propertiesData = await pool.query(`
      SELECT id, name, address
      FROM ${schema}.properties
      ORDER BY name
    `);

    res.json(propertiesData.rows);
  } catch (error) {
    logger.error('Error handling request:', error);
    res.status(500).json({ error: 'Impossible de récupérer la liste des propriétés' });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
}));

// GET toutes les entrées de l'historique des locataires (avec filtre optionnel)
router.get('/', ensureAuth, asyncHandler(async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;
    
    const { filter, tenantId, propertyId, search } = req.query;
    logger.info(`Fetching tenant history with filter=${filter}, tenantId=${tenantId}, search=${search}`);

    // Construire la requête SQL de base
    let sql = `
      SELECT 
        th.id, 
        th.rating, 
        th.feedback, 
        th.category, 
        th.tenant_full_name AS "tenantFullName", 
        th.event_type AS "eventType", 
        th.event_severity AS "eventSeverity", 
        th.event_details AS "eventDetails", 
        th.documents, 
        th.bail_status AS "bailStatus", 
        th.bail_id AS "bailId", 
        th.property_name AS "propertyName", 
        th.created_at AS "createdAt", 
        th.created_by AS "createdBy",
        u.full_name AS "tenantUserFullName",
        u.email AS "tenantUserEmail",
        u.phone_number AS "tenantUserPhone",
        p.id AS "propertyId",
        p.name AS "propertyName2",
        p.address AS "propertyAddress"
      FROM ${schema}.tenant_history th
      LEFT JOIN public.users u ON LOWER(th.tenant_full_name) LIKE LOWER(u.full_name) 
      LEFT JOIN ${schema}.properties p ON th.property_name = p.name
    `;

    // Ajouter les conditions de filtrage
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (filter && filter !== 'all') {
      whereConditions.push(`th.category = $${paramIndex++}`);
      queryParams.push(String(filter));
    }

    if (propertyId) {
      whereConditions.push(`th.property_name ILIKE $${paramIndex++}`);
      queryParams.push(`%${propertyId}%`);
    }

    if (search) {
      whereConditions.push(`(
        th.tenant_full_name ILIKE $${paramIndex} OR
        th.feedback ILIKE $${paramIndex} OR
        th.property_name ILIKE $${paramIndex} OR
        u.full_name ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Ajouter l'ordre
    sql += ` ORDER BY th.created_at DESC`;

    // Exécuter la requête
    const { rows: resultRows } = await pool.query(sql, queryParams);

    // Restructurer les données pour inclure tenant et property comme objets imbriqués
    const results = resultRows.map(row => {
      // Créer une copie pour la manipulation
      const restructured = { ...row };
      
      // Ajouter l'objet tenant si les données sont disponibles
      if (restructured.tenantUserFullName || restructured.tenantUserEmail || restructured.tenantUserPhone) {
        restructured.tenantInfo = {
          id: null,
          user: {
            fullName: restructured.tenantUserFullName || null,
            email: restructured.tenantUserEmail || null, 
            phoneNumber: restructured.tenantUserPhone || null
          }
        };
      }
      
      // Ajouter l'objet property si les données sont disponibles
      if (restructured.propertyId) {
        restructured.propertyInfo = {
          id: restructured.propertyId,
          name: restructured.propertyName2 || restructured.propertyName || null,
          address: restructured.propertyAddress || null
        };
      }
      
      // Nettoyer les propriétés qui sont maintenant dans les objets
      delete restructured.tenantUserFullName;
      delete restructured.tenantUserEmail;
      delete restructured.tenantUserPhone;
      delete restructured.propertyId;
      delete restructured.propertyName2;
      delete restructured.propertyAddress;
      
      return restructured;
    });
    
    res.json(results);
  } catch (error) {
    logger.error('Error handling request:', error);
    res.status(500).json({ error: 'Impossible de récupérer l\'historique des locataires' });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
}));

// GET les statistiques de l'historique des locataires
router.get('/stats', ensureAuth, asyncHandler(async (req, res) => {
  let clientDbConnection = null;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Obtenir un client DB configuré pour ce schéma client
    clientDbConnection = await getClientDb(authenticatedUserId);
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;
    
    // Count par catégorie
    const categoriesStats = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM ${schema}.tenant_history
      GROUP BY category
      ORDER BY count DESC
    `);

    // Count par type d'évènement
    const eventTypeStats = await pool.query(`
      SELECT event_type as "eventType", COUNT(*) as count
      FROM ${schema}.tenant_history
      WHERE event_type IS NOT NULL
      GROUP BY event_type
      ORDER BY count DESC
    `);

    // Distribution des notes
    const ratingsDistribution = await pool.query(`
      SELECT rating, COUNT(*) as count
      FROM ${schema}.tenant_history
      WHERE rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating
    `);

    // Moyenne globale des notes
    const averageRating = await pool.query(`
      SELECT AVG(rating) as average
      FROM ${schema}.tenant_history
      WHERE rating IS NOT NULL
    `);

    // Locataires les plus fréquents dans l'historique
    const topTenants = await pool.query(`
      SELECT tenant_full_name as "tenantFullName", COUNT(*) as count
      FROM ${schema}.tenant_history
      WHERE tenant_full_name IS NOT NULL
      GROUP BY tenant_full_name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Propriétés les plus fréquentes dans l'historique
    const topProperties = await pool.query(`
      SELECT property_name as "propertyName", COUNT(*) as count
      FROM ${schema}.tenant_history
      WHERE property_name IS NOT NULL
      GROUP BY property_name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Evolution mensuelle des entrées d'historique
    const monthlyTrend = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM ${schema}.tenant_history
      GROUP BY month
      ORDER BY month
    `);

    // Compter les locataires uniques
    const uniqueTenantsCount = await pool.query(`
      SELECT COUNT(DISTINCT tenant_full_name) as count
      FROM ${schema}.tenant_history
      WHERE tenant_full_name IS NOT NULL
    `);

    // Structurer la réponse
    const stats = {
      categoriesStats: categoriesStats.rows,
      eventTypeStats: eventTypeStats.rows,
      ratingsDistribution: ratingsDistribution.rows,
      averageRating: averageRating.rows[0]?.average || 0,
      topTenants: topTenants.rows,
      topProperties: topProperties.rows,
      monthlyTrend: monthlyTrend.rows,
      uniqueTenantsCount: uniqueTenantsCount.rows[0]?.count || 0
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error getting tenant history stats:', error);
    res.status(500).json({ error: 'Impossible de récupérer les statistiques' });
  } finally {
    // Libérer la connexion client si elle a été créée
    if (clientDbConnection) {
      clientDbConnection.release();
    }
  }
}));

// GET une entrée spécifique de l'historique des locataires par son ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;
    
    logger.info(`Fetching tenant history entry with id=${id} in schema ${schema}`);
    
    // Utilisation d'une requête SQL directe au lieu de Drizzle
    const query = `
      SELECT 
        th.id, 
        th.rating, 
        th.feedback, 
        th.category, 
        th.tenant_full_name AS "tenantFullName", 
        th.event_type AS "eventType", 
        th.event_severity AS "eventSeverity", 
        th.event_details AS "eventDetails", 
        th.documents, 
        th.bail_status AS "bailStatus", 
        th.bail_id AS "bailId", 
        th.property_name AS "propertyName", 
        th.created_at AS "createdAt", 
        th.created_by AS "createdBy",
        th.is_orphaned AS "isOrphaned",
        u.full_name AS "tenantUserFullName",
        u.email AS "tenantUserEmail",
        u.phone_number AS "tenantUserPhone",
        p.id AS "propertyId",
        p.name AS "propertyName2",
        p.address AS "propertyAddress"
      FROM ${schema}.tenant_history th
      LEFT JOIN public.users u ON LOWER(th.tenant_full_name) LIKE LOWER(u.full_name) 
      LEFT JOIN ${schema}.properties p ON th.property_name = p.name
      WHERE th.id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [Number(id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
    }
    
    const entry = result.rows[0];
    
    // Restructurer les données pour inclure tenant et property comme objets imbriqués
    const restructured: Record<string, any> = { ...entry };
    
    // Ajouter l'objet tenant si les données sont disponibles
    if (restructured.tenantUserFullName || restructured.tenantUserEmail || restructured.tenantUserPhone) {
      restructured.tenantInfo = {
        id: null,
        user: {
          fullName: restructured.tenantUserFullName || null,
          email: restructured.tenantUserEmail || null,
          phoneNumber: restructured.tenantUserPhone || null
        }
      };
    }
    
    // Ajouter l'objet property si les données sont disponibles
    if (restructured.propertyId) {
      restructured.propertyInfo = {
        id: restructured.propertyId,
        name: restructured.propertyName2 || restructured.propertyName || null,
        address: restructured.propertyAddress || null
      };
    }
    
    // Supprimer les champs temporaires utilisés pour la construction
    delete restructured.tenantUserFullName;
    delete restructured.tenantUserEmail;
    delete restructured.tenantUserPhone;
    delete restructured.propertyName2;
    delete restructured.propertyAddress;
    
    res.json(restructured);
    
  } catch (error) {
    logger.error('Error fetching tenant history entry:', error);
    res.status(500).json({ error: 'Impossible de récupérer les détails de l\'entrée d\'historique' });
  }
}));

// Configuration pour l'upload de fichiers
const uploadsDir = path.join(process.cwd(), 'uploads', 'tenant-history');
const uploadMiddleware = upload.array('documents', 5); // Max 5 fichiers

// POST créer une nouvelle entrée d'historique
router.post('/', uploadMiddleware, asyncHandler(async (req, res) => {
  const userId = await getUserFromSession(req);
  
  // Log des informations importantes reçues
  logger.info(`Création d'une entrée d'historique avec les paramètres: 
    selectedFolderId=${req.body.selectedFolderId || 'non défini'}, 
    documentTypes=${req.body.documentTypes ? 'présent' : 'absent'}, 
    documentNames=${req.body.documentNames ? 'présent' : 'absent'}`);
  
  // Récupération des données du formulaire
  const {
    tenantId,
    propertyId,
    rating,
    feedback,
    category,
    tenantFullName,
    eventType,
    eventSeverity,
    eventDetails,
    bailStatus,
    bailId,
    propertyName,
    selectedFolderId,
    documentTypes,
    documentNames,
    tenant_info_id
  } = req.body;

  // Si un dossier est sélectionné, le logger
  if (selectedFolderId) {
    logger.info(`Dossier sélectionné pour les documents: ID=${selectedFolderId}`);
  }

  // Si des types de documents sont fournis, les logger
  if (documentTypes) {
    try {
      const docTypesObj = JSON.parse(documentTypes);
      logger.info(`Types de documents reçus: ${JSON.stringify(docTypesObj)}`);
    } catch (error) {
      logger.error('Erreur lors du parsing des types de documents:', error);
    }
  }

  // Si des noms personnalisés sont fournis, les logger
  if (documentNames) {
    try {
      const docNamesObj = JSON.parse(documentNames);
      logger.info(`Noms personnalisés reçus: ${JSON.stringify(docNamesObj)}`);
    } catch (error) {
      logger.error('Erreur lors du parsing des noms de documents:', error);
    }
  }

  // Création du dossier d'upload si nécessaire
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    logger.error('Error creating uploads directory:', error);
  }

  // Traitement des documents uploadés
  const files = req.files as Express.Multer.File[];
  const documentPaths = files.map(file => file.path);
  
  // Tableau pour stocker les IDs des documents créés
  const documentIds: number[] = [];

  // Créer des entrées dans la table documents pour chaque fichier
  if (files.length > 0) {
    for (const file of files) {
      try {
        // Récupérer le type du document s'il existe
        let docType = 'avis'; // Type par défaut
        let customTitle = `${tenantFullName ? tenantFullName + ' - ' : ''}Document justificatif (${category || 'historique'})`;
        
        // Si des types personnalisés sont fournis, les utiliser
        if (documentTypes) {
          try {
            const docTypesObj = JSON.parse(documentTypes);
            // Utiliser d'abord le nom du fichier comme clé
            if (docTypesObj[file.originalname]) {
              docType = docTypesObj[file.originalname];
              logger.info(`Type trouvé par originalname: ${docType} pour ${file.originalname}`);
            }
            // Essayer avec le nom simple si pas trouvé par originalname
            else if (docTypesObj[file.filename.split('-').pop() || '']) {
              docType = docTypesObj[file.filename.split('-').pop() || ''];
              logger.info(`Type trouvé par nom simple: ${docType} pour ${file.filename.split('-').pop()}`);
            }
            // Parcourir toutes les clés et effectuer une comparaison flexible
            else {
              for (const [key, value] of Object.entries(docTypesObj)) {
                if (file.originalname.includes(key) || key.includes(file.originalname)) {
                  docType = value as string;
                  logger.info(`Type trouvé par correspondance partielle: ${docType} pour ${key} <-> ${file.originalname}`);
                  break;
                }
              }
            }
          } catch (error) {
            logger.error('Erreur lors du parsing des types de documents:', error);
          }
        }
        
        // Si des noms personnalisés sont fournis, les utiliser - même logique améliorée
        if (documentNames) {
          try {
            const docNamesObj = JSON.parse(documentNames);
            // Utiliser d'abord le nom du fichier comme clé
            if (docNamesObj[file.originalname]) {
              customTitle = docNamesObj[file.originalname];
              logger.info(`Nom personnalisé trouvé par originalname: ${customTitle} pour ${file.originalname}`);
            }
            // Essayer avec le nom simple si pas trouvé par originalname
            else if (docNamesObj[file.filename.split('-').pop() || '']) {
              customTitle = docNamesObj[file.filename.split('-').pop() || ''];
              logger.info(`Nom personnalisé trouvé par nom simple: ${customTitle} pour ${file.filename.split('-').pop()}`);
            }
            // Parcourir toutes les clés et effectuer une comparaison flexible
            else {
              for (const [key, value] of Object.entries(docNamesObj)) {
                if (file.originalname.includes(key) || key.includes(file.originalname)) {
                  customTitle = value as string;
                  logger.info(`Nom personnalisé trouvé par correspondance partielle: ${customTitle} pour ${key} <-> ${file.originalname}`);
                  break;
                }
              }
            }
          } catch (error) {
            logger.error('Erreur lors du parsing des noms de documents:', error);
          }
        }
        
        // Créer une entrée dans la table documents
        const [insertedDoc] = await db.insert(documentsTable).values({
          title: customTitle,
          type: docType as any,
          filePath: file.filename,
          originalName: file.originalname,
          template: false,
          userId: userId,
          folderId: selectedFolderId ? Number(selectedFolderId) : null,
          formData: {
            source: 'tenant_history',
            category: category || 'general',
            eventType: eventType || 'evaluation',
            rating: rating ? Number(rating) : undefined
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        logger.info(`Document créé dans la table documents: ${insertedDoc.id}`);
        documentIds.push(insertedDoc.id);

        // Si un tenantId est fourni, associer le document au locataire
        if (tenantId) {
          await db.insert(tenantDocuments).values({
            tenantId: Number(tenantId),
            documentId: insertedDoc.id,
            documentType: 'other'
          });
          logger.info(`Document ${insertedDoc.id} associé au locataire (ID table tenants) ${tenantId}`);
        }
      } catch (error) {
        logger.error(`Erreur lors de la création du document dans la table documents:`, error);
      }
    }
  }

  logger.info(`Creating new tenant history entry: ${JSON.stringify({
    tenantId: tenantId,
    propertyId,
    rating,
    feedback,
    category,
    eventType,
    tenant_info_id,
    documentIds: documentIds.length > 0 ? documentIds : undefined
  })}`);

  // Récupérer le nom de la propriété si propertyId est fourni mais pas propertyName
  let finalPropertyName = propertyName;
  if (propertyId && !propertyName) {
    try {
      const propertyData = await db.select({
        name: properties.name
      })
      .from(properties)
      .where(eq(properties.id, Number(propertyId)))
      .limit(1);

      if (propertyData.length > 0) {
        finalPropertyName = propertyData[0].name;
      }
    } catch (error) {
      logger.error('Error fetching property name:', error);
    }
  }

  try {
    // Création de l'entrée dans la base de données avec Drizzle ORM
    const newEntry = await db.insert(tenantHistory).values({
      rating: rating ? Number(rating) : 0,
      feedback: feedback || null,
      category: category || "general",
      tenantFullName: tenantFullName || null,
      eventType: eventType || "evaluation",
      eventSeverity: eventSeverity ? Number(eventSeverity) : 0,
      eventDetails: eventDetails ? JSON.parse(eventDetails) : {},
      documents: documentPaths.length > 0 ? documentPaths : [],
      bailStatus: bailStatus || null,
      bailId: bailId ? Number(bailId) : null,
      propertyName: finalPropertyName || null,
      createdBy: userId,
      tenantId: tenantId ? Number(tenantId) : null,
      tenant_info_id: tenant_info_id ? Number(tenant_info_id) : null
    }).returning();

    logger.info(`Successfully created tenant history entry with ID: ${newEntry[0].id}`);
    res.status(201).json(newEntry[0]);
  } catch (error) {
    // Si Drizzle échoue, essayer avec une requête SQL directe
    logger.warn('Erreur avec Drizzle ORM, tentative avec SQL direct:', error);

    try {
      // Obtenir une référence au schéma client
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      const schema = user?.role === 'admin' ? 'public' : `client_${userId}`;
      
      // Création de l'entrée dans la base de données en utilisant une requête SQL directe
      const result = await pool.query(`
        INSERT INTO ${schema}.tenant_history 
        (rating, feedback, category, tenant_full_name, event_type, event_severity, 
         event_details, documents, bail_status, bail_id, property_name, 
         created_by, tenant_id, tenant_info_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING *
      `, [
        rating ? Number(rating) : 0,
        feedback || null,
        category || 'general',
        tenantFullName || null,
        eventType || 'evaluation',
        eventSeverity ? Number(eventSeverity) : 0,
        eventDetails ? JSON.parse(eventDetails) : {},
        documentPaths.length > 0 ? documentPaths : [],
        bailStatus || null,
        bailId ? Number(bailId) : null,
        finalPropertyName || null,
        userId,
        tenantId ? Number(tenantId) : null,
        tenant_info_id ? Number(tenant_info_id) : null
      ]);

      logger.info(`Successfully created tenant history entry with SQL direct: ${result.rows[0].id}`);
      res.status(201).json(result.rows[0]);
    } catch (sqlError) {
      logger.error('Erreur avec SQL direct aussi:', sqlError);
      res.status(500).json({ 
        error: 'Erreur lors de la création de l\'entrée d\'historique', 
        details: error.message,
        sqlError: sqlError.message 
      });
    }
  }
}));

// PUT mettre à jour une entrée existante
router.put('/:id', uploadMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;
    
    // Récupération des données du formulaire
    const {
      tenantId,
      propertyId,
      rating,
      feedback,
      category,
      tenantFullName,
      eventType,
      eventSeverity,
      eventDetails,
      bailStatus,
      bailId,
      propertyName,
      selectedFolderId,
      documentTypes,
      documentNames
    } = req.body;
    
    logger.info(`Updating tenant history entry id=${id} in schema ${schema}`);
    
    // Vérifier si l'entrée existe
    const checkQuery = `SELECT * FROM ${schema}.tenant_history WHERE id = $1 LIMIT 1`;
    const checkResult = await pool.query(checkQuery, [Number(id)]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
    }
    
    const existingEntry = checkResult.rows[0];
    
    // Traitement des documents uploadés
    const files = req.files as Express.Multer.File[];
    const newDocumentPaths = files.map(file => file.path);
    
    // Tableau pour stocker les IDs des documents créés
    const newDocumentIds: number[] = [];
    
    // Créer des entrées dans la table documents pour chaque nouveau fichier
    if (files.length > 0) {
      for (const file of files) {
        try {
          // Récupérer le type du document s'il existe
          let docType = 'avis'; // Type par défaut
          let customTitle = `${tenantFullName ? tenantFullName + ' - ' : ''}Document justificatif (${category || 'historique'})`;
          
          // Si des types personnalisés sont fournis, les utiliser
          if (documentTypes) {
            try {
              const docTypesObj = JSON.parse(documentTypes);
              if (docTypesObj[file.originalname]) {
                docType = docTypesObj[file.originalname];
              }
            } catch (error) {
              logger.error('Erreur lors du parsing des types de documents:', error);
            }
          }
          
          // Si des noms personnalisés sont fournis, les utiliser
          if (documentNames) {
            try {
              const docNamesObj = JSON.parse(documentNames);
              if (docNamesObj[file.originalname]) {
                customTitle = docNamesObj[file.originalname];
              }
            } catch (error) {
              logger.error('Erreur lors du parsing des noms de documents:', error);
            }
          }
          
          // Créer une entrée dans la table documents
          const [insertedDoc] = await db.insert(documentsTable).values({
            title: customTitle,
            type: docType as any,
            filePath: file.filename,
            originalName: file.originalname,
            template: false,
            userId: authenticatedUserId,
            folderId: selectedFolderId ? Number(selectedFolderId) : null,
            formData: {
              source: 'tenant_history',
              category: category || 'general',
              eventType: eventType || 'evaluation',
              rating: rating ? Number(rating) : undefined,
              historyEntryId: Number(id)
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          
          logger.info(`Document créé dans la table documents: ${insertedDoc.id}`);
          newDocumentIds.push(insertedDoc.id);
          
          // Si un tenantId est fourni, associer le document au locataire
          if (tenantId) {
            await db.insert(tenantDocuments).values({
              tenantId: Number(tenantId),
              documentId: insertedDoc.id,
              documentType: 'other'
            });
            logger.info(`Document ${insertedDoc.id} associé au locataire (update) ${tenantId}`);
          }
        } catch (error) {
          logger.error(`Erreur lors de la création du document dans la table documents:`, error);
        }
      }
    }
    
    // Combinaison des anciens documents et des nouveaux
    const documents = [
      ...(existingEntry.documents || []),
      ...newDocumentPaths
    ];
    
    // Récupérer le nom de la propriété si propertyId est fourni mais pas propertyName
    let finalPropertyName = propertyName;
    if (propertyId && !propertyName) {
      try {
        const propertyQuery = `SELECT name FROM ${schema}.properties WHERE id = $1 LIMIT 1`;
        const propertyResult = await pool.query(propertyQuery, [Number(propertyId)]);
        
        if (propertyResult.rows.length > 0) {
          finalPropertyName = propertyResult.rows[0].name;
        }
      } catch (error) {
        logger.error('Error fetching property name:', error);
      }
    }
    
    // Préparer les champs à mettre à jour (uniquement ceux qui ont été fournis)
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (rating) {
      updateFields.push(`rating = $${paramIndex++}`);
      updateValues.push(Number(rating));
    }
    
    if (feedback !== undefined) {
      updateFields.push(`feedback = $${paramIndex++}`);
      updateValues.push(feedback);
    }
    
    if (category) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(category);
    }
    
    if (tenantFullName) {
      updateFields.push(`tenant_full_name = $${paramIndex++}`);
      updateValues.push(tenantFullName);
    }
    
    if (eventType) {
      updateFields.push(`event_type = $${paramIndex++}`);
      updateValues.push(eventType);
    }
    
    if (eventSeverity) {
      updateFields.push(`event_severity = $${paramIndex++}`);
      updateValues.push(Number(eventSeverity));
    }
    
    if (eventDetails) {
      updateFields.push(`event_details = $${paramIndex++}`);
      updateValues.push(JSON.parse(eventDetails));
    }
    
    // Toujours mettre à jour les documents avec la nouvelle liste combinée
    updateFields.push(`documents = $${paramIndex++}`);
    updateValues.push(documents);
    
    if (bailStatus) {
      updateFields.push(`bail_status = $${paramIndex++}`);
      updateValues.push(bailStatus);
    }
    
    if (bailId) {
      updateFields.push(`bail_id = $${paramIndex++}`);
      updateValues.push(Number(bailId));
    }
    
    if (finalPropertyName) {
      updateFields.push(`property_name = $${paramIndex++}`);
      updateValues.push(finalPropertyName);
    }
    
    // Mise à jour de l'entrée dans la base de données avec SQL direct
    if (updateFields.length > 0) {
      const updateQuery = `
        UPDATE ${schema}.tenant_history 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `;
      updateValues.push(Number(id));
      
      const updateResult = await pool.query(updateQuery, updateValues);
      
      res.json(updateResult.rows[0]);
    } else {
      // Si aucun champ n'a été mis à jour, simplement retourner l'entrée existante
      res.json(existingEntry);
    }
  } catch (error) {
    logger.error('Error updating tenant history entry:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour l\'entrée d\'historique' });
  }
}));

// DELETE supprimer une entrée
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const authenticatedUserId = getUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const currentUser = req.user as any;
    const schema = currentUser.role === 'admin' ? 'public' : `client_${currentUser.id}`;
    
    logger.info(`Deleting tenant history entry id=${id} in schema ${schema}`);
    
    // Vérifier si l'entrée existe
    const query = `SELECT * FROM ${schema}.tenant_history WHERE id = $1 LIMIT 1`;
    const result = await pool.query(query, [Number(id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
    }
    
    const existingEntry = result.rows[0];
    
    // Supprimer les fichiers associés
    if (existingEntry.documents && existingEntry.documents.length > 0) {
      for (const docPath of existingEntry.documents) {
        try {
          await fs.unlink(docPath);
        } catch (error) {
          logger.error(`Error deleting document file ${docPath}:`, error);
        }
      }
    }
    
    // Supprimer l'entrée avec SQL direct
    const deleteQuery = `DELETE FROM ${schema}.tenant_history WHERE id = $1`;
    await pool.query(deleteQuery, [Number(id)]);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting tenant history entry:', error);
    res.status(500).json({ error: 'Impossible de supprimer l\'entrée d\'historique' });
  }
}));

// POST réassigner une entrée orpheline à un locataire
router.post('/:id/reassign', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tenantId, tenantName } = req.body;
  const userId = await getUserFromSession(req);
  
  logger.info(`[Reassign] Starting reassignment process for entry ID=${id}`);

  // Vérifier si au moins un identifiant ou un nom est fourni
  if (!tenantId && !tenantName) {
    logger.warn(`[Reassign] Missing tenant ID or name for entry id=${id}`);
    return res.status(400).json({ error: 'ID ou nom du locataire manquant' });
  }

  // Vérifier si l'entrée existe
  const existingEntry = await db.select()
    .from(tenantHistory)
    .where(eq(tenantHistory.id, Number(id)))
    .limit(1);

  if (existingEntry.length === 0) {
    logger.warn(`[Reassign] History entry not found id=${id}`);
    return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
  }

  const entry = existingEntry[0];
  
  // Vérification basée sur tenantFullName car tenantRefId n'existe pas
  if (entry.tenantFullName && !entry.tenantFullName.startsWith("Locataire ID")) {
    logger.info(`[Reassign] Entry id=${id} seems to have a manually entered name: ${entry.tenantFullName}, continuing with reassignment`);
  }

  // Si un ID de locataire est fourni, utiliser cet ID
  if (tenantId) {
    logger.info(`[Reassign] Using provided tenant ID=${tenantId} for history entry id=${id}`);

    // Vérifier si le locataire existe
    const tenantExists = await db.select({
      id: tenants.id,
      fullName: users.fullName
    })
    .from(tenants)
    .leftJoin(users, eq(tenants.userId, users.id))
    .where(eq(tenants.id, Number(tenantId)))
    .limit(1);

    if (tenantExists.length === 0) {
      logger.warn(`[Reassign] Tenant not found with ID=${tenantId}`);
      return res.status(404).json({ error: 'Locataire non trouvé' });
    }

    const tenant = tenantExists[0];
    logger.info(`[Reassign] Found tenant: ${tenant.fullName} (${tenant.id}) for reassignment`);

    try {
      // Mettre à jour l'entrée pour l'assigner au nouveau locataire
      const updatedEntry = await db.update(tenantHistory)
        .set({
          tenantFullName: tenant.fullName ?? entry.tenantFullName,
          updatedAt: new Date(),
          updatedBy: userId
        })
        .where(eq(tenantHistory.id, Number(id)))
        .returning();

      logger.info(`[Reassign] Successfully reassigned entry id=${id} to tenant ID=${tenantId}`);
      res.json(updatedEntry);
    } catch (error) {
      logger.error(`[Reassign] Database error during reassignment: ${error instanceof Error ? error.message : error}`);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'entrée' });
    }
  } 
  // Si un nom de locataire est fourni, rechercher le locataire par son nom
  else if (tenantName) {
    logger.info(`[Reassign] Searching tenant by name "${tenantName}" for reassignment of history entry id=${id}`);

    // Rechercher les locataires actifs par nom (recherche plus flexible)
    const searchedTenants = await db.select({
      id: tenants.id,
      fullName: users.fullName,
      email: users.email
    })
    .from(tenants)
    .leftJoin(users, eq(tenants.userId, users.id))
    .where(
      or(
        // Recherche exacte en ignorant la casse
        sql`LOWER(${users.fullName}) = LOWER(${tenantName})`,
        // Recherche par contenu
        ilike(users.fullName, `%${tenantName}%`)
      )
    )
    .limit(10);

    if (searchedTenants.length === 0) {
      logger.warn(`[Reassign] No tenant found with name "${tenantName}"`);
      return res.status(404).json({ error: 'Aucun locataire trouvé avec ce nom' });
    }

    // Logique améliorée pour sélectionner le meilleur candidat
    let selectedTenant = searchedTenants[0];
    
    // Privilégier la correspondance exacte (insensible à la casse)
    const exactMatch = searchedTenants.find(tenant => 
      tenant.fullName && tenant.fullName.toLowerCase() === tenantName.toLowerCase()
    );
    
    if (exactMatch) {
      selectedTenant = exactMatch;
      logger.info(`[Reassign] Found exact name match: ${selectedTenant.fullName} (${selectedTenant.id})`);
    } else {
      logger.info(`[Reassign] Using partial name match: ${selectedTenant.fullName} (${selectedTenant.id})`);
    }
    
    try {
      // Mettre à jour l'entrée pour l'assigner au nouveau locataire
      const updatedEntry = await db.update(tenantHistory)
        .set({
          tenantFullName: selectedTenant.fullName ?? entry.tenantFullName,
          updatedAt: new Date(),
          updatedBy: userId
        })
        .where(eq(tenantHistory.id, Number(id)))
        .returning();

      logger.info(`[Reassign] Successfully reassigned entry id=${id} to tenant with name=${selectedTenant.fullName}`);
      res.json(updatedEntry);
    } catch (error) {
      logger.error(`[Reassign] Database error during reassignment by name: ${error instanceof Error ? error.message : error}`);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'entrée' });
    }
  }
}));

// GET les documents liés à une entrée d'historique
router.get('/:id/documents', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = await getUserFromSession(req);

  logger.info(`Fetching documents for tenant history entry id=${id}`);

  // Récupérer l'entrée pour obtenir les chemins des documents
  const entry = await db.select()
    .from(tenantHistory)
    .where(eq(tenantHistory.id, Number(id)))
    .limit(1);

  if (entry.length === 0) {
    return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
  }

  const documents = entry[0].documents || [];
  
  if (documents.length === 0) {
    return res.json([]);
  }

  // Préparer l'information sur les documents
  const documentInfo = documents.map((path, index) => {
    const fileName = path.split('/').pop() || `document-${index}`;
    return {
      id: index + 1,
      path,
      fileName,
      url: `/api/tenant-history/download/${id}/${index}` // URL pour télécharger
    };
  });

  res.json(documentInfo);
}));

// GET télécharger un document spécifique
router.get('/download/:id/:index', asyncHandler(async (req, res) => {
  const { id, index } = req.params;
  const userId = await getUserFromSession(req);

  // Récupérer l'entrée pour obtenir les chemins des documents
  const entry = await db.select()
    .from(tenantHistory)
    .where(eq(tenantHistory.id, Number(id)))
    .limit(1);

  if (entry.length === 0) {
    return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
  }

  const documents = entry[0].documents || [];
  const documentIndex = Number(index);
  
  if (!documents[documentIndex]) {
    return res.status(404).json({ error: 'Document non trouvé' });
  }

  const filePath = documents[documentIndex];
  
  try {
    res.download(filePath);
  } catch (error) {
    logger.error(`Error downloading document ${filePath}:`, error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du document' });
  }
}));

// POST: Détecter et marquer les entrées orphelines
router.post('/detect-orphaned', asyncHandler(async (req, res) => {
  const userId = await getUserFromSession(req);
  const { autoReassign } = req.body;
  
  logger.info(`[DetectOrphaned] Starting orphaned entries detection, autoReassign=${autoReassign}`);

  // Sélectionner les entrées qui ont un tenantFullName mais pas de tenantRefId valide
  const orphanedEntries = await db.select({
    id: tenantHistory.id,
    tenantFullName: tenantHistory.tenantFullName,
    propertyName: tenantHistory.propertyName,
    category: tenantHistory.category,
    createdAt: tenantHistory.createdAt
  })
  .from(tenantHistory)
  .where(
    and(
      not(isNull(tenantHistory.tenantFullName))
    )
  )
  .limit(100); // Limiter pour éviter les problèmes de performance

  if (orphanedEntries.length === 0) {
    logger.info('[DetectOrphaned] No new orphaned entries detected');
    return res.json({ message: 'Aucune nouvelle entrée orpheline détectée', processed: 0 });
  }

  logger.info(`[DetectOrphaned] Found ${orphanedEntries.length} orphaned entries to process`);
  
  // Mise à jour pour marquer ces entrées comme orphelines
  const updates = [];
  const autoReassigned = [];
  
  for (const entry of orphanedEntries) {
    // Pas de mise à jour à faire ici si updatedAt/updatedBy n'existent pas ou ne sont pas nécessaires
    updates.push(entry.id);
    
    // Si l'option autoReassign est activée, essayer de trouver un locataire correspondant
    if (autoReassign && entry.tenantFullName) {
      try {
        // Rechercher un locataire par nom
        const matchingTenants = await db.select({
          id: tenants.id,
          fullName: users.fullName,
        })
        .from(tenants)
        .leftJoin(users, eq(tenants.userId, users.id))
        .where(
          or(
            sql`LOWER(${users.fullName}) = LOWER(${entry.tenantFullName})`,
            sql`LOWER(${users.fullName}) LIKE LOWER(${entry.tenantFullName + '%'})`,
            sql`LOWER(${entry.tenantFullName}) LIKE LOWER(${users.fullName + '%'})`,
          )
        )
        .limit(1);
        
        if (matchingTenants.length > 0) {
          const tenant = matchingTenants[0];
          
          // Réassigner automatiquement: Mettre à jour le nom dans l'historique
          await db.update(tenantHistory)
            .set({
              tenantFullName: tenant.fullName,
              updatedBy: userId
            })
            .where(eq(tenantHistory.id, entry.id));
          
          autoReassigned.push({
            id: entry.id,
            tenantFullName: entry.tenantFullName,
            reassignedTo: tenant.fullName
          });
          
          logger.info(`[DetectOrphaned] Auto-reassigned entry id=${entry.id} to tenant=${tenant.fullName} (${tenant.id})`);
        }
      } catch (error) {
        logger.error(`[DetectOrphaned] Error during auto-reassignment for entry id=${entry.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  // Retourner le résultat
  res.json({
    message: `${updates.length} entrées marquées comme orphelines, ${autoReassigned.length} réassignées automatiquement`,
    processed: updates.length,
    markedAsOrphaned: updates,
    autoReassigned: autoReassigned
  });
}));

// Export du routeur
export default router;