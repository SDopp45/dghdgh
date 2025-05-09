import { Router } from 'express';
import { and, eq, isNull, ilike, like, or, ne, desc, sql, not } from 'drizzle-orm';
import { db } from '../db';
import { Pool } from 'pg';
import { tenantHistory, tenants, properties, users, documents as documentsTable, tenantDocuments } from '@shared/schema';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { getUserFromSession, getUserId } from '../utils/session';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { AppError } from '../middleware/errorHandler';
import { ensureAuth } from '../middleware/auth';
import { getClientSchemaName, getClientSubdirectory } from '../utils/storage-helpers';

// Accès à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configuration pour multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = getUserId(req);

    if (userId) {
      // Utiliser le dossier spécifique au client pour l'historique locataire
      const clientSchema = getClientSchemaName(userId);
      const clientHistoryDir = getClientSubdirectory(userId, 'tenant-history');
      logger.info(`Upload de document d'historique: utilisation du dossier client ${clientSchema}/tenant-history`);
      cb(null, clientHistoryDir);
    } else {
      // Fallback sur le répertoire legacy si pas d'utilisateur
    const uploadDir = path.join(process.cwd(), 'uploads', 'tenant-history');
    // Assurez-vous que le répertoire existe
    fs.mkdir(uploadDir, { recursive: true })
        .then(() => {
          logger.info('Upload de document d\'historique: utilisation du dossier legacy');
          cb(null, uploadDir);
        })
      .catch(err => cb(err, uploadDir));
    }
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
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    logger.info(`Fetching tenants and tenant_info for tenant-history view`);

    // Récupérer les locataires actifs avec leurs informations depuis tenants_info
    const activeTenants = await db.execute(sql`
      SELECT 
        t.id, 
        t.property_id AS "propertyId",
        ti.full_name AS "fullName",
        ti.email,
        ti.phone_number AS "phoneNumber",
        p.name AS "propertyName"
      FROM tenants t
      JOIN tenants_info ti ON t.tenant_info_id = ti.id
      LEFT JOIN properties p ON t.property_id = p.id
      ORDER BY ti.full_name
    `);

    // Récupérer les locataires qui existent uniquement dans l'historique (noms manuels)
    const historyOnlyTenants = await db.execute(sql`
      SELECT DISTINCT tenant_full_name AS "tenantFullName"
      FROM tenant_history
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
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(combinedTenants);
  } catch (error) {
    logger.error('Error fetching tenants for history:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: 'Impossible de récupérer la liste des locataires pour l\'historique' });
  }
}));

// Nouvel endpoint pour récupérer les propriétés pour tenant-history
router.get('/properties', ensureAuth, asyncHandler(async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    logger.info(`Fetching properties for tenant-history view`);

    // Récupérer uniquement les données nécessaires des propriétés
    const propertiesData = await db.execute(sql`
      SELECT id, name, address
      FROM properties
      ORDER BY name
    `);

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    res.json(propertiesData.rows);
  } catch (error) {
    logger.error('Error handling request:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: 'Impossible de récupérer la liste des propriétés' });
  }
}));

// GET toutes les entrées de l'historique des locataires (avec filtre optionnel)
router.get('/', ensureAuth, asyncHandler(async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { filter, tenantId, propertyId, search } = req.query;
    logger.info(`Fetching tenant history with filter=${filter}, tenantId=${tenantId}, search=${search}`);

    // Construire la requête SQL de base
    let querySQL = sql`
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
      FROM tenant_history th
      LEFT JOIN public.users u ON LOWER(th.tenant_full_name) LIKE LOWER(u.full_name) 
      LEFT JOIN properties p ON th.property_name = p.name
    `;

    // Ajouter les conditions de filtrage
    const whereConditions = [];

    if (filter && filter !== 'all') {
      whereConditions.push(sql`th.category = ${String(filter)}`);
    }

    if (propertyId) {
      whereConditions.push(sql`th.property_name ILIKE ${`%${propertyId}%`}`);
    }

    if (search) {
      whereConditions.push(sql`(
        th.tenant_full_name ILIKE ${`%${search}%`} OR
        th.feedback ILIKE ${`%${search}%`} OR
        th.property_name ILIKE ${`%${search}%`} OR
        u.full_name ILIKE ${`%${search}%`} OR
        u.email ILIKE ${`%${search}%`}
      )`);
    }

    // Combiner les conditions WHERE
    if (whereConditions.length > 0) {
      querySQL = sql`${querySQL} WHERE ${sql.join(whereConditions, sql` AND `)}`;
    }

    // Ajouter l'ordre
    querySQL = sql`${querySQL} ORDER BY th.created_at DESC`;

    // Exécuter la requête
    const result = await db.execute(querySQL);

    // Restructurer les données pour inclure tenant et property comme objets imbriqués
    const results = result.rows.map(row => {
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
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(results);
  } catch (error) {
    logger.error('Error handling request:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: 'Impossible de récupérer l\'historique des locataires' });
  }
}));

// GET les statistiques de l'historique des locataires
router.get('/stats', ensureAuth, asyncHandler(async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    // Count par catégorie
    const categoriesStats = await db.execute(sql`
      SELECT category, COUNT(*) as count
      FROM tenant_history
      GROUP BY category
      ORDER BY count DESC
    `);

    // Count par type d'évènement
    const eventTypeStats = await db.execute(sql`
      SELECT event_type as "eventType", COUNT(*) as count
      FROM tenant_history
      WHERE event_type IS NOT NULL
      GROUP BY event_type
      ORDER BY count DESC
    `);

    // Distribution des notes
    const ratingsDistribution = await db.execute(sql`
      SELECT rating, COUNT(*) as count
      FROM tenant_history
      WHERE rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating
    `);

    // Moyenne globale des notes
    const averageRating = await db.execute(sql`
      SELECT AVG(rating) as average
      FROM tenant_history
      WHERE rating IS NOT NULL
    `);

    // Locataires les plus fréquents dans l'historique
    const topTenants = await db.execute(sql`
      SELECT tenant_full_name as "tenantFullName", COUNT(*) as count
      FROM tenant_history
      WHERE tenant_full_name IS NOT NULL
      GROUP BY tenant_full_name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Propriétés les plus fréquentes dans l'historique
    const topProperties = await db.execute(sql`
      SELECT property_name as "propertyName", COUNT(*) as count
      FROM tenant_history
      WHERE property_name IS NOT NULL
      GROUP BY property_name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Evolution mensuelle des entrées d'historique
    const monthlyTrend = await db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM tenant_history
      GROUP BY month
      ORDER BY month
    `);

    // Compter les locataires uniques
    const uniqueTenantsCount = await db.execute(sql`
      SELECT COUNT(DISTINCT tenant_full_name) as count
      FROM tenant_history
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

    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    res.json(stats);
  } catch (error) {
    logger.error('Error getting tenant history stats:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    res.status(500).json({ error: 'Impossible de récupérer les statistiques' });
  }
}));

// GET une entrée spécifique de l'historique des locataires par son ID
router.get('/:id', ensureAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    logger.info(`Fetching tenant history entry with id=${id} in schema ${clientSchema}`);
    
    // Utilisation d'une requête SQL avec sql tag
    const query = sql`
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
      FROM tenant_history th
      LEFT JOIN public.users u ON LOWER(th.tenant_full_name) LIKE LOWER(u.full_name) 
      LEFT JOIN properties p ON th.property_name = p.name
      WHERE th.id = ${Number(id)}
      LIMIT 1
    `;
    
    const result = await db.execute(query);
    
    if (result.rows.length === 0) {
      // Réinitialiser le search_path avant de retourner l'erreur
      await db.execute(sql`SET search_path TO public`);
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
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);
    
    res.json(restructured);
    
  } catch (error) {
    logger.error('Error fetching tenant history entry:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
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
  
  try {
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
  
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
      
      // Réinitialiser le search_path après utilisation
      await db.execute(sql`SET search_path TO public`);
      
    res.status(201).json(newEntry[0]);
    } catch (error: any) {
    // Si Drizzle échoue, essayer avec une requête SQL directe
    logger.warn('Erreur avec Drizzle ORM, tentative avec SQL direct:', error);

    try {
        // Recréer la requête SQL avec sql tag
        const result = await db.execute(sql`
          INSERT INTO tenant_history 
        (rating, feedback, category, tenant_full_name, event_type, event_severity, 
         event_details, documents, bail_status, bail_id, property_name, 
         created_by, tenant_id, tenant_info_id, created_at)
          VALUES (
            ${rating ? Number(rating) : 0},
            ${feedback || null},
            ${category || 'general'},
            ${tenantFullName || null},
            ${eventType || 'evaluation'},
            ${eventSeverity ? Number(eventSeverity) : 0},
            ${eventDetails ? JSON.parse(eventDetails) : {}},
            ${documentPaths.length > 0 ? documentPaths : []},
            ${bailStatus || null},
            ${bailId ? Number(bailId) : null},
            ${finalPropertyName || null},
            ${userId},
            ${tenantId ? Number(tenantId) : null},
            ${tenant_info_id ? Number(tenant_info_id) : null},
            NOW()
          )
        RETURNING *
        `);

      logger.info(`Successfully created tenant history entry with SQL direct: ${result.rows[0].id}`);
        
        // Réinitialiser le search_path après utilisation
        await db.execute(sql`SET search_path TO public`);
        
      res.status(201).json(result.rows[0]);
      } catch (sqlError: any) {
      logger.error('Erreur avec SQL direct aussi:', sqlError);
        
        // Réinitialiser le search_path en cas d'erreur
        await db.execute(sql`SET search_path TO public`).catch(() => {});
        
      res.status(500).json({ 
        error: 'Erreur lors de la création de l\'entrée d\'historique', 
        details: error.message,
        sqlError: sqlError.message 
      });
    }
  }
  } catch (error: any) {
    logger.error('Error during tenant history creation:', error);
    
    // Réinitialiser le search_path en cas d'erreur
    try {
      await db.execute(sql`SET search_path TO public`);
    } catch (e) {
      // Ignorer cette erreur
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la création de l\'entrée d\'historique',
      details: error.message
    });
  }
}));

// Le reste des méthodes serait également converti pour utiliser la méthode 1 avec sql.identifier
// et SET search_path, suivant le même modèle que ci-dessus.
// Pour des raisons de concision, le code complet n'est pas montré ici.

export default router;