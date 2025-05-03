import { Router } from 'express';
import { and, eq, isNull, ilike, like, or, ne, desc, sql, not } from 'drizzle-orm';
import { db } from '../db';
import { tenantHistory, tenants, properties, users, documents as documentsTable, tenantDocuments } from '@shared/schema';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { getUserFromSession } from '../utils/session';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

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
router.get('/tenants', asyncHandler(async (req, res) => {
  const userId = await getUserFromSession(req);

  logger.info(`Fetching ONLY tenantFullName from tenant_history for tenant-history view`);

  try {
    // Récupérer les locataires qui existent uniquement dans l'historique (noms manuels)
    const historyOnlyTenants = await db.selectDistinct({
      tenantFullName: tenantHistory.tenantFullName
    })
    .from(tenantHistory)
    .where(
      not(isNull(tenantHistory.tenantFullName))
    )
    .orderBy(tenantHistory.tenantFullName); // Trier directement ici

    // Transformer les résultats de l'historique en format compatible
    const historyTenantsList = historyOnlyTenants
      .filter(t => t.tenantFullName && t.tenantFullName.trim() !== '') // Filtrer les noms vides ou juste des espaces
      .map((t, index) => ({
        // Utiliser un ID négatif basé sur l'index pour stabilité?
        // Ou continuer avec aléatoire si pas de problème
        id: -Math.floor(Math.random() * 1000000) - 1, // ID négatif aléatoire
        fullName: t.tenantFullName,
        propertyId: 0, 
        propertyName: null,
        active: true, // Non pertinent mais attendu par le type?
        isHistoryOnly: true // Toutes les entrées viennent de l'historique maintenant
      }));

    // Combiner les deux listes et enlever les doublons
    const combinedTenants = [...historyTenantsList]; // Utiliser seulement la liste de l'historique
    
    // La déduplication n'est plus nécessaire car on ne source que de l'historique

    // Trier par nom (déjà fait dans la requête SQL, mais on peut re-trier si besoin)

    res.json(combinedTenants);
  } catch (error) {
    logger.error('Error fetching tenants for history:', error);
    res.status(500).json({ error: 'Impossible de récupérer la liste des locataires pour l\'historique' });
  }
}));

// Nouvel endpoint pour récupérer les propriétés pour tenant-history
router.get('/properties', asyncHandler(async (req, res) => {
  const userId = await getUserFromSession(req);

  logger.info(`Fetching properties for tenant-history view`);

  // Récupérer uniquement les données nécessaires des propriétés
  const propertiesData = await db.select({
    id: properties.id,
    name: properties.name,
    address: properties.address,
  })
  .from(properties)
  .orderBy(properties.name);

  res.json(propertiesData);
}));

// GET toutes les entrées de l'historique des locataires (avec filtre optionnel)
router.get('/', asyncHandler(async (req, res) => {
  const { filter, tenantId, propertyId, search } = req.query;
  const userId = await getUserFromSession(req);

  logger.info(`Fetching tenant history with filter=${filter}, tenantId=${tenantId}, search=${search}`);

  let queryBuilder = db.select({
    id: tenantHistory.id,
    rating: tenantHistory.rating,
    feedback: tenantHistory.feedback,
    category: tenantHistory.category,
    tenantFullName: tenantHistory.tenantFullName,
    eventType: tenantHistory.eventType,
    eventSeverity: tenantHistory.eventSeverity,
    eventDetails: tenantHistory.eventDetails,
    documents: tenantHistory.documents,
    bailStatus: tenantHistory.bailStatus,
    bailId: tenantHistory.bailId,
    propertyName: tenantHistory.propertyName,
    createdAt: tenantHistory.createdAt,
    createdBy: tenantHistory.createdBy,
    tenantUserFullName: users.fullName,
    tenantUserEmail: users.email,
    tenantUserPhone: users.phoneNumber,
    propertyId: properties.id,
    propertyName2: properties.name,
    propertyAddress: properties.address
  })
  .from(tenantHistory)
  .leftJoin(users, ilike(tenantHistory.tenantFullName, users.fullName))
  .leftJoin(properties, eq(tenantHistory.propertyName, properties.name));
  
  // Préparation de la requête avec filtres
  let whereCondition = undefined;
  
  if (filter && filter !== 'all') {
    whereCondition = sql`${tenantHistory.category} = ${String(filter)}`;
  }
  
  if (tenantId) {
    logger.warn("Filtrage par tenantId numérique non supporté car tenantHistory.tenantId n'existe pas.");
  }
  
  if (propertyId) {
    const propertyCondition = ilike(tenantHistory.propertyName, `%${propertyId}%`);
    whereCondition = whereCondition ? and(whereCondition, propertyCondition) : propertyCondition;
  }
  
  if (search) {
    const searchCondition = or(
      ilike(tenantHistory.tenantFullName, `%${search}%`),
      ilike(tenantHistory.feedback, `%${search}%`),
      ilike(tenantHistory.propertyName, `%${search}%`),
      ilike(users.fullName, `%${search}%`),
      ilike(users.email, `%${search}%`)
    );
    whereCondition = whereCondition ? and(whereCondition, searchCondition) : searchCondition;
  }
  
  // Exécuter la requête avec les conditions et le tri
  const resultRows = whereCondition 
    ? await queryBuilder.where(whereCondition).orderBy(desc(tenantHistory.createdAt))
    : await queryBuilder.orderBy(desc(tenantHistory.createdAt));
  
  // Restructurer les données pour inclure tenant et property comme objets imbriqués
  const results = resultRows.map(row => {
    // Créer une copie pour la manipulation
    const restructured: Record<string, any> = { ...row };
    
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
        name: restructured.propertyName2 || null,
        address: restructured.propertyAddress || null
      };
    }
    
    // Supprimer les champs temporaires utilisés pour la construction
    const fieldsToDelete = [
      'tenantUserFullName',
      'tenantUserEmail',
      'tenantUserPhone',
      'propertyId2',
      'propertyName2',
      'propertyAddress'
    ];
    
    // Supprimer les champs de manière sécurisée
    fieldsToDelete.forEach(field => {
      if (field in restructured) {
        delete restructured[field];
      }
    });
    
    return restructured;
  });
  
  res.json(results);
}));

// GET les statistiques de l'historique des locataires
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = await getUserFromSession(req);

  // Calculer la date d'il y a 30 jours pour compter les incidents récents
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  // Récupérer le compte total d'entrées
  const totalEntriesResult = await db.select({
    count: sql<number>`count(*)`,
  }).from(tenantHistory);
  const totalEntries = totalEntriesResult[0]?.count || 0;

  // Compter le nombre de locataires distincts avec un historique
  const tenantsWithHistoryResult = await db.select({
    count: sql<number>`count(distinct ${tenantHistory.tenantFullName})`,
  }).from(tenantHistory)
  .where(sql`${tenantHistory.tenantFullName} IS NOT NULL`);
  const tenantsWithHistory = tenantsWithHistoryResult[0]?.count || 0;

  // Récupérer les incidents récents (derniers 30 jours)
  const recentIncidentsResult = await db.select({
    count: sql<number>`count(*)`,
  }).from(tenantHistory)
  .where(and(
    or(
      eq(tenantHistory.eventType, 'incident'),
      eq(tenantHistory.eventType, 'litige')
    ),
    sql`${tenantHistory.createdAt} >= ${thirtyDaysAgoISO}`
  ));
  const recentIncidents = recentIncidentsResult[0]?.count || 0;

  // Récupérer les problèmes de paiement
  const paymentIssuesResult = await db.select({
    count: sql<number>`count(*)`,
  }).from(tenantHistory)
  .where(and(
    eq(tenantHistory.eventType, 'paiement'),
    eq(tenantHistory.eventSeverity, -2)
  ));
  const paymentIssuesCount = paymentIssuesResult[0]?.count || 0;

  // Calculer le pourcentage d'évaluations positives (≥ 4)
  const ratingsResult = await db.select({
    positiveCount: sql<number>`count(*) filter (where ${tenantHistory.rating} >= 4)`,
    totalRatingsCount: sql<number>`count(*) filter (where ${tenantHistory.rating} is not null)`,
  }).from(tenantHistory);
  
  const positiveCount = ratingsResult[0]?.positiveCount || 0;
  const totalRatingsCount = ratingsResult[0]?.totalRatingsCount || 0;
  const positiveRatingsPercentage = totalRatingsCount > 0 
    ? Math.round((positiveCount / totalRatingsCount) * 100) 
    : 0;

  // Compter les entrées par type d'événement
  const entriesByTypeResult = await db.select({
    eventType: tenantHistory.eventType,
    count: sql<number>`count(*)`,
  }).from(tenantHistory)
  .groupBy(tenantHistory.eventType);

  const entriesByTypeCount: Record<string, number> = {};
  entriesByTypeResult.forEach(entry => {
    if (entry.eventType) {
      entriesByTypeCount[entry.eventType] = entry.count;
    }
  });

  // Compter les entrées par catégorie
  const entriesByCategoryResult = await db.select({
    category: tenantHistory.category,
    count: sql<number>`count(*)`,
  }).from(tenantHistory)
  .groupBy(tenantHistory.category);

  const entriesByCategoryCount: Record<string, number> = {};
  entriesByCategoryResult.forEach(entry => {
    if (entry.category) {
      entriesByCategoryCount[entry.category] = entry.count;
    }
  });

  // Récupérer les statistiques de base
  const stats = await db.select({
    total: sql`COUNT(*)`,
    movein: sql`SUM(CASE WHEN ${tenantHistory.category} = 'movein' THEN 1 ELSE 0 END)`,
    moveout: sql`SUM(CASE WHEN ${tenantHistory.category} = 'moveout' THEN 1 ELSE 0 END)`,
    evaluation: sql`SUM(CASE WHEN ${tenantHistory.category} = 'evaluation' THEN 1 ELSE 0 END)`,
    incident: sql`SUM(CASE WHEN ${tenantHistory.category} = 'incident' THEN 1 ELSE 0 END)`,
    communication: sql`SUM(CASE WHEN ${tenantHistory.category} = 'communication' THEN 1 ELSE 0 END)`,
    withoutTenantId: sql`SUM(CASE WHEN ${tenantHistory.tenantFullName} IS NOT NULL THEN 1 ELSE 0 END)`
  })
  .from(tenantHistory)
  .limit(1);

  res.json({
    ...stats[0],
    totalEntries: totalEntries,
    tenantsWithHistory: tenantsWithHistory,
    recentIncidents: recentIncidents,
    paymentIssuesCount: paymentIssuesCount,
    positiveRatingsPercentage,
    entriesByTypeCount,
    entriesByCategoryCount
  });
}));

// GET une entrée spécifique de l'historique des locataires par son ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = await getUserFromSession(req);

  logger.info(`Fetching tenant history entry with id=${id}`);

  const entry = await db.select({
    id: tenantHistory.id,
    rating: tenantHistory.rating,
    feedback: tenantHistory.feedback,
    category: tenantHistory.category,
    tenantFullName: tenantHistory.tenantFullName,
    eventType: tenantHistory.eventType,
    eventSeverity: tenantHistory.eventSeverity,
    eventDetails: tenantHistory.eventDetails,
    documents: tenantHistory.documents,
    bailStatus: tenantHistory.bailStatus,
    bailId: tenantHistory.bailId,
    propertyName: tenantHistory.propertyName,
    createdAt: tenantHistory.createdAt,
    createdBy: tenantHistory.createdBy,
    tenantUserFullName: users.fullName,
    tenantUserEmail: users.email,
    tenantUserPhone: users.phoneNumber,
    propertyId: properties.id,
    propertyName2: properties.name,
    propertyAddress: properties.address,
  })
  .from(tenantHistory)
  .leftJoin(users, ilike(tenantHistory.tenantFullName, users.fullName))
  .leftJoin(properties, eq(tenantHistory.propertyName, properties.name))
  .where(eq(tenantHistory.id, Number(id)))
  .limit(1);

  if (entry.length === 0) {
    return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
  }
  
  // Restructurer les données pour inclure tenant et property comme objets imbriqués
  const result: Record<string, any> = { ...entry[0] };
  
  // Ajouter l'objet tenant si les données sont disponibles
  if (result.tenantUserFullName || result.tenantUserEmail || result.tenantUserPhone) {
    result.tenantInfo = {
      id: null,
      user: {
        fullName: result.tenantUserFullName || null,
        email: result.tenantUserEmail || null,
        phoneNumber: result.tenantUserPhone || null
      }
    };
  }
  
  // Ajouter l'objet property si les données sont disponibles
  if (result.propertyId) {
    result.propertyInfo = {
      id: result.propertyId,
      name: result.propertyName2 || null,
      address: result.propertyAddress || null
    };
  }
  
  // Supprimer les champs temporaires utilisés pour la construction
  const fieldsToDelete = [
    'tenantUserFullName',
    'tenantUserEmail',
    'tenantUserPhone',
    'propertyId2',
    'propertyName2',
    'propertyAddress'
  ];
  
  // Supprimer les champs de manière sécurisée
  fieldsToDelete.forEach(field => {
    if (field in result) {
      delete result[field];
    }
  });

  res.json(result);
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
    documentNames
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

  // Création de l'entrée dans la base de données
  const newEntry = await db.insert(tenantHistory).values({
    rating: rating ? Number(rating) : 0,
    feedback: feedback || undefined,
    category: category || "general",
    tenantFullName: tenantFullName || undefined,
    eventType: eventType || "evaluation",
    eventSeverity: eventSeverity ? Number(eventSeverity) : 0,
    eventDetails: eventDetails ? JSON.parse(eventDetails) : {},
    documents: documentPaths.length > 0 ? documentPaths : [],
    bailStatus: bailStatus || undefined,
    bailId: bailId ? Number(bailId) : undefined,
    propertyName: finalPropertyName || undefined,
    createdBy: userId,
    createdAt: new Date()
  }).returning();

  res.status(201).json(newEntry[0]);
}));

// PUT mettre à jour une entrée existante
router.put('/:id', uploadMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = await getUserFromSession(req);
  
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

  // Vérifier si l'entrée existe
  const existingEntry = await db.select()
    .from(tenantHistory)
    .where(eq(tenantHistory.id, Number(id)))
    .limit(1);

  if (existingEntry.length === 0) {
    return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
  }

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
          userId: userId,
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
    ...(existingEntry[0].documents || []),
    ...newDocumentPaths
  ];

  logger.info(`Updating tenant history entry id=${id}`);

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

  // Mise à jour de l'entrée dans la base de données avec les nouveaux documents
  const [updatedEntry] = await db.update(tenantHistory)
    .set({
      rating: rating ? Number(rating) : undefined,
      feedback: feedback || undefined,
      category: category || undefined,
      tenantFullName: tenantFullName || undefined,
      eventType: eventType || undefined,
      eventSeverity: eventSeverity ? Number(eventSeverity) : undefined,
      eventDetails: eventDetails ? JSON.parse(eventDetails) : undefined,
      documents: documents,
      bailStatus: bailStatus || undefined,
      bailId: bailId ? Number(bailId) : undefined,
      propertyName: finalPropertyName || undefined,
      updatedAt: new Date()
    })
    .where(eq(tenantHistory.id, Number(id)))
    .returning();

  res.json(updatedEntry);
}));

// DELETE supprimer une entrée
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = await getUserFromSession(req);

  logger.info(`Deleting tenant history entry id=${id}`);

  // Vérifier si l'entrée existe
  const existingEntry = await db.select()
    .from(tenantHistory)
    .where(eq(tenantHistory.id, Number(id)))
    .limit(1);

  if (existingEntry.length === 0) {
    return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
  }

  // Supprimer les fichiers associés
  if (existingEntry[0].documents && existingEntry[0].documents.length > 0) {
    for (const docPath of existingEntry[0].documents) {
      try {
        await fs.unlink(docPath);
      } catch (error) {
        logger.error(`Error deleting document file ${docPath}:`, error);
      }
    }
  }

  // Supprimer l'entrée
  await db.delete(tenantHistory)
    .where(eq(tenantHistory.id, Number(id)));

  res.status(204).send();
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

export default router;