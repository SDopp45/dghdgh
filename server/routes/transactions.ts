import { Router } from "express";
import { db } from "../db";
import { transactions, insertTransactionSchema, properties, documents, tenants, users } from "@db/schema";
import { eq, and, desc, gte, asc, or, like, count, sql } from "drizzle-orm";
import logger from "../utils/logger";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ensureAuth, getUserId } from "../middleware/auth";
import fs from "fs";
import path from "path";
import multer from "multer";

// Configure upload directories
const uploadDir = path.resolve(process.cwd(), 'uploads');
const documentsDir = path.resolve(uploadDir, 'documents');

// Ensure directories exist
[uploadDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    logger.info('Processing upload to directory:', documentsDir);
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${path.parse(safeOriginalName).name}-${uniqueSuffix}${path.extname(file.originalname)}`;
    logger.info('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    logger.info('Validating file:', file.originalname, 'mimetype:', file.mimetype);
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers PDF sont acceptés.'));
  }
});

const router = Router();

// Create a new transaction
router.post("/", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    logger.info('Creating new transaction with data:', req.body);

    // Vérifier explicitement si documentIds est présent dans la requête
    logger.info(`documentId reçu: ${req.body.documentId}, documentIds reçus: ${JSON.stringify(req.body.documentIds)}`);

    // S'assurer que documentIds est bien un tableau si présent
    let documentIds = req.body.documentIds || [];
    if (!Array.isArray(documentIds)) {
      // Si ce n'est pas un tableau, essayer de le convertir
      try {
        if (typeof documentIds === 'string') {
          documentIds = JSON.parse(documentIds);
        } else if (documentIds !== null && documentIds !== undefined) {
          documentIds = [documentIds];
        } else {
          documentIds = [];
        }
      } catch (e) {
        logger.warn(`Failed to parse documentIds, setting to empty array: ${e.message}`);
        documentIds = [];
      }
    }

    // Créer un nouvel objet avec les données modifiées
    const transactionData = {
      ...req.body,
      userId,
      date: new Date(req.body.date),
      documentIds: documentIds // Toujours envoyer le tableau, même s'il est vide
    };

    logger.info(`Transaction data après préparation: ${JSON.stringify(transactionData)}`);
    logger.info(`documentIds après préparation: ${JSON.stringify(transactionData.documentIds)}`);

    // Parse and validate the transaction data
    const validatedData = insertTransactionSchema.parse(transactionData);
    
    // Vérifier si documentIds est présent après validation
    logger.info(`documentIds après validation: ${JSON.stringify(validatedData.documentIds)}`);

    // Insert the transaction
    const [newTransaction] = await db
      .insert(transactions)
      .values(validatedData)
      .returning();

    if (!newTransaction) {
      throw new Error("Failed to create transaction");
    }
    
    // Vérifier si documentIds est présent dans la transaction créée
    logger.info(`Transaction créée avec documentIds: ${JSON.stringify(newTransaction.documentIds)}`);

    // Si newTransaction.documentIds est null ou undefined mais qu'on avait des documentIds,
    // essayer une mise à jour explicite
    if ((!newTransaction.documentIds || newTransaction.documentIds.length === 0) && documentIds.length > 0) {
      logger.info(`Mise à jour explicite des documentIds: ${JSON.stringify(documentIds)}`);
      await db
        .update(transactions)
        .set({ documentIds })
        .where(eq(transactions.id, newTransaction.id));
    }

    // Get the complete transaction data with relations
    const completeTransaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, newTransaction.id),
      with: {
        property: true,
        tenant: {
          with: {
            user: true
          }
        }
      }
    });

    const formattedTransaction = formatTransaction(completeTransaction);

    res.status(201).json(formattedTransaction);
  } catch (error: any) {
    logger.error("Error creating transaction:", error);
    res.status(400).json({ 
      error: "Erreur lors de la création de la transaction",
      details: error.message
    });
  }
});

// Update transaction status
router.put("/:id/status", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['pending', 'completed', 'cancelled', 'failed'].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    logger.info(`Updating transaction ${id} status to ${status}`);

    const [updatedTransaction] = await db
      .update(transactions)
      .set({ status })
      .where(and(
        eq(transactions.id, parseInt(id)),
        eq(transactions.userId, userId)
      ))
      .returning();

    if (!updatedTransaction) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    const completeTransaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, updatedTransaction.id),
      with: {
        property: true,
        tenant: {
          with: {
            user: true
          }
        }
      }
    });

    const formattedTransaction = formatTransaction(completeTransaction);
    if (!formattedTransaction) {
      return res.status(500).json({ error: "Erreur lors du formatage de la transaction" });
    }

    res.json(formattedTransaction);
  } catch (error: any) {
    logger.error("Error updating transaction status:", error);
    res.status(500).json({
      error: "Erreur lors de la mise à jour du statut",
      details: error.message
    });
  }
});

// Get all transactions with pagination and filtering
router.get("/", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { 
      page = "1", 
      pageSize = "9999", // Augmenter la valeur par défaut à un nombre très grand pour charger toutes les transactions
      category = "", 
      propertyId = "", 
      tenantId = "", 
      type = "", 
      status = "", 
      startDate = "", 
      endDate = "", 
      search = "",
      sortBy = "date",
      sortOrder = "desc"
    } = req.query;
    
    // Parse query parameters - permettre des valeurs très grandes
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = req.query.pageSize === "all" ? 99999 : parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * pageSizeNum;
    
    // Build base conditions
    const conditions = [eq(transactions.userId, userId)];

    if (propertyId && propertyId !== "null") {
      conditions.push(eq(transactions.propertyId, parseInt(propertyId as string, 10)));
    }
    
    if (tenantId && tenantId !== "null") {
      conditions.push(eq(transactions.tenantId, parseInt(tenantId as string, 10)));
    }
    
    if (category && category !== "all") {
      conditions.push(eq(transactions.category, category as string));
    }
    
    if (type && type !== "all") {
      conditions.push(eq(transactions.type, type as "income" | "expense" | "credit"));
    }
    
    if (status && status !== "all") {
      conditions.push(eq(transactions.status, status as string));
    }
    
    if (startDate) {
      conditions.push(gte(transactions.date, new Date(startDate as string)));
    }
    
    if (endDate) {
      conditions.push(lte(transactions.date, new Date(endDate as string)));
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
        like(transactions.description, searchTerm),
        like(transactions.notes, searchTerm)
        )
      );
    }

    // Get total count in parallel with data fetch
    const [countResult, transactionData] = await Promise.all([
      db.select({ count: count() })
        .from(transactions)
        .where(and(...conditions)),
      db.select({
        transaction: transactions,
        property: properties,
        tenant: tenants,
        user: users
      })
      .from(transactions)
      .leftJoin(properties, eq(transactions.propertyId, properties.id))
      .leftJoin(tenants, eq(transactions.tenantId, tenants.id))
      .leftJoin(users, eq(tenants.userId, users.id))
      .where(and(...conditions))
      .orderBy(sortOrder === 'asc' ? asc(transactions[sortBy as keyof typeof transactions]) : desc(transactions[sortBy as keyof typeof transactions]))
      .limit(pageSizeNum)
      .offset(skip)
    ]);

    const total = countResult?.[0]?.count || 0;

    // Format transactions
    const formattedTransactions = transactionData.map(({ transaction, property, tenant, user }) => ({
      ...transaction,
      property: property || null,
      tenant: tenant ? { ...tenant, user } : null,
      formattedDate: format(new Date(transaction.date), 'dd/MM/yyyy'),
      formattedAmount: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(parseFloat(transaction.amount)),
      documentIds: Array.isArray(transaction.documentIds) ? transaction.documentIds : []
    }));

    res.json({
      data: formattedTransactions,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (error: any) {
    logger.error("Error fetching transactions:", error);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des transactions", 
      details: error.message 
    });
  }
});

// Helper function to group transactions
function groupTransactions(transactions: any[], groupBy: string) {
  const groups = new Map();
  
  transactions.forEach(transaction => {
    let groupKey;
    
    switch (groupBy) {
      case 'date':
        groupKey = format(new Date(transaction.date), 'yyyy-MM-dd');
        break;
      case 'month':
        groupKey = format(new Date(transaction.date), 'yyyy-MM');
        break;
      case 'property':
        groupKey = transaction.property?.name || 'Sans propriété';
        break;
      case 'category':
        groupKey = transaction.category;
        break;
      case 'type':
        groupKey = transaction.type;
        break;
      case 'status':
        groupKey = transaction.status;
        break;
      default:
        groupKey = format(new Date(transaction.date), 'yyyy-MM-dd');
    }
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        transactions: [],
        totalAmount: 0,
        count: 0
      });
    }
    
    const group = groups.get(groupKey);
    group.transactions.push(transaction);
    group.totalAmount += parseFloat(transaction.amount) || 0;
    group.count++;
  });
  
  return Array.from(groups.values());
}

// Delete transaction
router.delete("/:id", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { id } = req.params;
    logger.info(`Attempting to delete transaction ${id}`);

    // First get the transaction and its associated document
    const transaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, parseInt(id)),
        eq(transactions.userId, userId)
      )
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    // Delete the transaction first
    const [deletedTransaction] = await db
      .delete(transactions)
      .where(and(
        eq(transactions.id, parseInt(id)),
        eq(transactions.userId, userId)
      ))
      .returning();

    if (!deletedTransaction) {
      return res.status(500).json({ error: "Échec de la suppression de la transaction" });
    }

    res.json({ success: true, message: "Transaction supprimée avec succès" });
  } catch (error: any) {
    logger.error("Error deleting transaction:", error);
    res.status(500).json({
      error: "Erreur lors de la suppression de la transaction",
      details: error.message
    });
  }
});

// Get dashboard data
router.get("/dashboard", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    // Get transactions for the last 12 months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const allTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate)
      ),
      with: {
        property: true,
        tenant: {
          with: {
            user: true
          }
        }
      },
      orderBy: [asc(transactions.date)]
    });

    // Group transactions by month for income chart
    const monthlyIncome = groupTransactionsByMonth(
      allTransactions.filter(t => t.type === 'income')
    );

    // Group transactions by month for expenses chart
    const monthlyExpenses = groupTransactionsByMonth(
      allTransactions.filter(t => t.type === 'expense')
    );

    // Calculate income by type (rent, other)
    const incomeByType = calculateIncomeByType(allTransactions);

    // Calculate expenses by category
    const expensesByCategory = calculateExpensesByCategory(allTransactions);

    // Get unpaid rent transactions
    const unpaidRent = await getUnpaidRentByProperty(userId);

    // Calculate monthly balance
    const monthlyBalance = calculateMonthlyBalance(allTransactions);

    res.json({
      monthlyIncome,
      monthlyExpenses,
      incomeByType,
      expensesByCategory,
      unpaidRent,
      monthlyBalance
    });

  } catch (error) {
    logger.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des données du tableau de bord" });
  }
});

// Update transaction
router.patch("/:id", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { id } = req.params;
    logger.info(`Updating transaction ${id} with data:`, req.body);

    // Parse and validate the transaction data
    const validatedData = insertTransactionSchema.partial().parse({
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : undefined
    });

    // Update the transaction
    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(and(
        eq(transactions.id, parseInt(id)),
        eq(transactions.userId, userId)
      ))
      .returning();

    if (!updatedTransaction) {
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    // Get the complete transaction data with relations
    const completeTransaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, updatedTransaction.id),
      with: {
        property: true,
        tenant: {
          with: {
            user: true
          }
        }
      }
    });

    const formattedTransaction = formatTransaction(completeTransaction);
    if (!formattedTransaction) {
      return res.status(500).json({ error: "Erreur lors du formatage de la transaction" });
    }

    res.json(formattedTransaction);
  } catch (error: any) {
    logger.error("Error updating transaction:", error);
    res.status(500).json({
      error: "Erreur lors de la mise à jour de la transaction",
      details: error.message
    });
  }
});

// Format a transaction for display
const formatTransaction = (transaction: any) => {
  if (!transaction) {
    logger.error("Null transaction received");
    return null;
  }

  try {
    // Parse amount ensuring it's a valid number
    const amount = typeof transaction.amount === 'string'
      ? parseFloat(transaction.amount.replace(',', '.'))
      : Number(transaction.amount);

    if (isNaN(amount)) {
      logger.error(`Invalid amount in transaction: ${transaction.id}, amount: ${transaction.amount}`);
      return null;
    }

    // Ensure we have a valid date
    if (!transaction.date) {
      logger.error(`Missing date in transaction: ${transaction.id}`);
      return null;
    }

    // Create a new Date object from the transaction date
    let date: Date;
    try {
      date = new Date(transaction.date);
      if (isNaN(date.getTime())) {
        logger.error(`Invalid date value in transaction: ${transaction.id}, date: ${transaction.date}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error parsing date in transaction: ${transaction.id}, date: ${transaction.date}`, error);
      return null;
    }

    // S'assurer que documentIds est un tableau
    let docIds = [];
    if (transaction.documentIds) {
      // Si c'est déjà un tableau, l'utiliser tel quel
      if (Array.isArray(transaction.documentIds)) {
        docIds = transaction.documentIds;
      } 
      // Si c'est une chaîne JSON, essayer de la parser
      else if (typeof transaction.documentIds === 'string') {
        try {
          docIds = JSON.parse(transaction.documentIds);
        } catch (e) {
          logger.warn(`Failed to parse documentIds string for transaction ${transaction.id}: ${transaction.documentIds}`);
        }
      }
    }
    
    // Si documentId est défini mais documentIds est vide, l'ajouter au tableau documentIds
    if (transaction.documentId && docIds.length === 0) {
      docIds.push(transaction.documentId);
    }
    
    logger.info(`Transaction ${transaction.id} - Processed documentIds: ${JSON.stringify(docIds)}`);

    const formatted = {
      ...transaction,
      propertyName: transaction.property?.name || 'Sans propriété',
      tenantName: transaction.tenant?.user?.fullName || 'Sans locataire',
      formattedDate: format(date, 'dd/MM/yyyy', { locale: fr }),
      displayDate: format(date, 'dd/MM/yyyy', { locale: fr }),
      date: format(date, 'yyyy-MM-dd'),
      amount: amount,
      formattedAmount: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount),
      documentId: transaction.documentId || null,
      documentIds: docIds // Toujours renvoyer le tableau, même s'il est vide
    };

    return formatted;
  } catch (error) {
    logger.error("Error formatting transaction:", error);
    return null;
  }
};

// Helper functions for data transformation
function groupTransactionsByMonth(transactions: any[]) {
  const grouped = new Map();

  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const key = format(date, 'MMM yyyy', { locale: fr });
    const amount = parseFloat(transaction.amount);

    if (!isNaN(amount)) {
      grouped.set(key, (grouped.get(key) || 0) + amount);
    }
  });

  return Array.from(grouped, ([date, amount]) => ({ date, amount }));
}

function calculateIncomeByType(transactions: any[]) {
  const incomeTransactions = transactions.filter(t => t.type === 'income');

  return [
    {
      name: 'Loyers',
      value: sumAmounts(incomeTransactions.filter(t => t.category === 'rent'))
    },
    {
      name: 'Charges',
      value: sumAmounts(incomeTransactions.filter(t => t.category === 'utility'))
    },
    {
      name: 'Autres',
      value: sumAmounts(incomeTransactions.filter(t => !['rent', 'utility'].includes(t.category)))
    }
  ];
}

function calculateExpensesByCategory(transactions: any[]) {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const categories = ['maintenance', 'insurance', 'tax', 'utility', 'other'];

  return categories.map(category => ({
    name: getCategoryLabel(category),
    value: sumAmounts(expenseTransactions.filter(t => t.category === category))
  }));
}

async function getUnpaidRentByProperty(userId: number) {
  const unpaidTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.type, 'income'),
      eq(transactions.category, 'rent'),
      eq(transactions.status, 'pending')
    ),
    with: {
      property: true
    }
  });

  const groupedByProperty = new Map();

  unpaidTransactions.forEach(transaction => {
    const propertyName = transaction.property?.name || 'Sans propriété';
    const amount = parseFloat(transaction.amount);

    if (!isNaN(amount)) {
      groupedByProperty.set(propertyName, (groupedByProperty.get(propertyName) || 0) + amount);
    }
  });

  return Array.from(groupedByProperty, ([property, amount]) => ({ property, amount }));
}

function calculateMonthlyBalance(transactions: any[]) {
  const grouped = new Map();

  transactions.forEach(transaction => {
    const date = format(new Date(transaction.date), 'MMM yyyy', { locale: fr });
    const amount = parseFloat(transaction.amount);

    if (!isNaN(amount)) {
      const entry = grouped.get(date) || { date, income: 0, expenses: 0, balance: 0 };

      if (transaction.type === 'income') {
        entry.income += amount;
      } else if (transaction.type === 'expense') {
        entry.expenses += amount;
      }

      entry.balance = entry.income - entry.expenses;
      grouped.set(date, entry);
    }
  });

  return Array.from(grouped.values());
}

function sumAmounts(transactions: any[]) {
  return transactions.reduce((sum, t) => {
    const amount = parseFloat(t.amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    maintenance: 'Entretien',
    insurance: 'Assurance',
    tax: 'Impôts',
    utility: 'Charges',
    other: 'Autres'
  };
  return labels[category] || category;
}

// POST endpoint for uploading documents to a transaction
router.post("/:id/documents", ensureAuth, upload.array('documents', 5), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      logger.warn("Document upload attempt without authentication");
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { id } = req.params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      logger.warn(`Invalid transaction ID: ${id}`);
      return res.status(400).json({ error: "ID de transaction invalide" });
    }

    logger.info(`Processing document upload for transaction ${id}. Request body:`, req.body);
    logger.info(`Request files:`, req.files ? `${req.files.length} files received` : 'No files received');

    // Récupérer les noms personnalisés des fichiers s'ils existent
    let customFileNames = {};
    if (req.body.customNames) {
      try {
        customFileNames = typeof req.body.customNames === 'string' 
          ? JSON.parse(req.body.customNames) 
          : req.body.customNames;
        logger.info('Custom file names:', customFileNames);
      } catch (error) {
        logger.warn('Error parsing customNames:', error);
        // Continuer avec un objet vide en cas d'erreur
      }
    }

    // Récupérer les types de documents envoyés par le client
    const documentTypesString = req.body.documentTypes ? JSON.stringify(req.body.documentTypes) : '{}';
    let documentTypes = {};
    try {
      // Si les types sont envoyés comme un JSON stringifié
      documentTypes = JSON.parse(documentTypesString);
    } catch (e) {
      // Si les types sont envoyés comme des champs individuels
      documentTypes = req.body;
    }

    // Vérifier si la transaction existe et appartient à l'utilisateur
    const transaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId)
      )
    });

    if (!transaction) {
      logger.warn(`Transaction not found or doesn't belong to user: ${id}, userId: ${userId}`);
      return res.status(404).json({ error: "Transaction non trouvée" });
    }

    logger.info(`Transaction found: ${JSON.stringify(transaction)}`);

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      logger.warn('No files provided in the request');
      return res.status(400).json({ error: "Aucun document fourni" });
    }

    logger.info(`Received ${req.files.length} files for transaction ${id}`);

    const insertedDocuments = [];
    const documentIds = [];

    // Traiter chaque fichier
    for (const file of req.files) {
      try {
        logger.info('Processing file:', {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        });

        // Vérifier si le fichier existe physiquement
        const filePath = path.join(documentsDir, file.filename);
        const fileExists = fs.existsSync(filePath);
        logger.info(`File ${file.filename} exists on disk: ${fileExists}`);

        if (!fileExists) {
          logger.error(`File ${file.filename} does not exist on disk at ${filePath}`);
          throw new Error(`Le fichier ${file.originalname} n'existe pas physiquement`);
        }

        // Déterminer le titre du document
        let documentTitle = file.originalname;
        let customFileName = undefined;
        
        // Vérifier si le nom de fichier a un nom personnalisé
        const origName = file.originalname;
        if (customFileNames && typeof customFileNames === 'object' && origName in customFileNames) {
          customFileName = customFileNames[origName];
          documentTitle = customFileName;
        }
        
        // Récupérer le type du document s'il existe dans les types envoyés
        let documentType = "invoice"; // Type par défaut
        const docTypeKey = `documentTypes[${file.originalname}]`;
        if (documentTypes && typeof documentTypes === 'object' && docTypeKey in documentTypes) {
          documentType = documentTypes[docTypeKey];
        }
        
        logger.info(`Document type for ${file.originalname}: ${documentType}`);

        // Construire les métadonnées supplémentaires
        const documentMetadata: any = {
          section: 'finance',
          description: `Document financier\nDocument uploadé via le formulaire Finances`,
          source: 'finance',
          transactionType: transaction.type,
          uploadSource: 'finance',
          uploadMethod: 'form',
          uploadContext: 'transaction',
          transactionId: transactionId,
          documentCategory: transaction.category === 'maintenance' ? 'maintenance' : 'finance'
        };

        // Ajouter le nom personnalisé aux métadonnées si disponible
        if (customFileName) {
          documentMetadata.customFileName = customFileName;
        }

        // Insérer le document dans la base de données
        const [insertedDoc] = await db.insert(documents).values({
          title: documentTitle,
          type: documentType as any, // Type casting pour éviter l'erreur TypeScript
          filePath: file.filename,
          originalName: file.originalname,
          template: false,
          userId: userId,
          formData: documentMetadata,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        logger.info(`Document inserted in database:`, {
          id: insertedDoc.id,
          title: insertedDoc.title,
          type: insertedDoc.type,
          filePath: insertedDoc.filePath,
          formData: insertedDoc.formData
        });

        documentIds.push(insertedDoc.id);
        insertedDocuments.push({
          ...insertedDoc,
          fileUrl: `/api/documents/files/${encodeURIComponent(insertedDoc.filePath)}`
        });

        logger.info(`Document ${insertedDoc.id} created for transaction ${id}`);
      } catch (error) {
        logger.error(`Error processing file ${file.originalname}:`, error);
        throw error;
      }
    }

    // Récupérer les documentIds existants de la transaction
    let existingDocIds: number[] = [];
    if (transaction.documentIds && Array.isArray(transaction.documentIds)) {
      existingDocIds = transaction.documentIds;
    }
    
    // Fusionner avec les nouveaux documentIds
    const allDocumentIds = [...existingDocIds, ...documentIds];
    
    logger.info(`Updating transaction ${id} with all document IDs: ${JSON.stringify(allDocumentIds)}`);

    // Mettre à jour la transaction avec les documents
      // Mettre à jour documentId avec le premier document (pour la compatibilité)
    const documentId = documentIds.length > 0 ? documentIds[0] : null;
      
    logger.info(`Updating transaction ${id} with documentId: ${documentId} and documentIds: [${allDocumentIds.join(', ')}]`);
      
      // Mettre à jour documentIds avec tous les documents
      const [updatedTransaction] = await db.update(transactions)
        .set({ 
          documentId: documentId,
        documentIds: allDocumentIds,
          updatedAt: new Date()
        })
        .where(eq(transactions.id, transactionId))
        .returning();
      
      logger.info(`Transaction ${id} updated:`, updatedTransaction);

    const response = {
      success: true,
      count: insertedDocuments.length,
      documents: insertedDocuments,
      documentIds: documentIds
    };
    
    logger.info(`Response for transaction ${id} document upload:`, response);
    
    res.status(201).json(response);
  } catch (error: any) {
    logger.error(`Error uploading documents to transaction:`, error);
    res.status(500).json({
      error: "Erreur lors de l'ajout des documents à la transaction",
      details: error.message,
      stack: error.stack
    });
  }
});

// Types de regroupement disponibles
const GROUP_BY_OPTIONS = {
  'property_type_category': {
    label: 'Propriété + Type + Catégorie',
    sql: sql`concat(coalesce(p.name, 'Sans propriété'), ' - ', t.type, ' - ', t.category)`
  },
  'property_category': {
    label: 'Propriété + Catégorie',
    sql: sql`concat(coalesce(p.name, 'Sans propriété'), ' - ', t.category)`
  },
  'type_category': {
    label: 'Type + Catégorie',
    sql: sql`concat(t.type, ' - ', t.category)`
  },
  'category': {
    label: 'Catégorie uniquement',
    sql: sql`t.category`
  },
  'property_type': {
    label: 'Propriété + Type',
    sql: sql`concat(coalesce(p.name, 'Sans propriété'), ' - ', t.type)`
  },
  'property': {
    label: 'Propriété uniquement',
    sql: sql`coalesce(p.name, 'Sans propriété')`
  },
  'type': {
    label: 'Type uniquement',
    sql: sql`t.type`
  },
  'month': {
    label: 'Par mois',
    sql: sql`to_char(t.date, 'YYYY-MM')`
  },
  'month_category': {
    label: 'Mois + Catégorie',
    sql: sql`concat(to_char(t.date, 'YYYY-MM'), ' - ', t.category)`
  },
  'month_type': {
    label: 'Mois + Type',
    sql: sql`concat(to_char(t.date, 'YYYY-MM'), ' - ', t.type)`
  },
  'month_property': {
    label: 'Mois + Propriété',
    sql: sql`concat(to_char(t.date, 'YYYY-MM'), ' - ', coalesce(p.name, 'Sans propriété'))`
  },
  'none': {
    label: 'Aucun regroupement',
    sql: null
  }
} as const;

// Get transaction groups with optional filters
router.get("/groups", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { 
      groupBy = "property_type_category",
      category = "",
      propertyId = "",
      type = "",
      startDate = "",
      endDate = "",
      sortBy = "total_amount",
      sortOrder = "desc",
      page = "1",
      pageSize = "9999" // Augmenter la valeur par défaut à un nombre très grand pour charger tous les groupes
    } = req.query;

    // Vérifier si le type de regroupement est valide
    const groupByKey = groupBy as keyof typeof GROUP_BY_OPTIONS;
    if (!GROUP_BY_OPTIONS[groupByKey]) {
      return res.status(400).json({ error: "Type de regroupement invalide" });
    }

    // Parse query parameters - permettre des valeurs très grandes
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = req.query.pageSize === "all" ? 99999 : parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    // Obtenir la colonne SQL appropriée pour le regroupement
    const groupBySql = GROUP_BY_OPTIONS[groupByKey].sql;
    
    // Préparer les paramètres de requête de manière sécurisée
    const params: any[] = [userId];
    let paramIndex = 1;

    // Construire la clause WHERE de manière sécurisée
    const conditions = ["t.user_id = $1"];
    
    if (propertyId) {
      paramIndex++;
      params.push(propertyId);
      conditions.push(`t.property_id = $${paramIndex}`);
    }
    
    if (category) {
      paramIndex++;
      params.push(category);
      conditions.push(`t.category = $${paramIndex}`);
    }
    
    if (type) {
      paramIndex++;
      params.push(type);
      conditions.push(`t.type = $${paramIndex}`);
    }
    
    if (startDate) {
      paramIndex++;
      params.push(startDate);
      conditions.push(`t.date >= $${paramIndex}`);
    }
    
    if (endDate) {
      paramIndex++;
      params.push(endDate);
      conditions.push(`t.date <= $${paramIndex}`);
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}` 
      : "";

    // Valider l'ordre de tri
    const validSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
    const validSortBy = ['date', 'amount', 'count'].includes(sortBy as string) 
      ? sortBy 
      : 'date';

    // Requête pour compter le nombre total de groupes distincts
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM (
        SELECT ${groupBySql ? groupBySql : 't.id'} as group_key
        FROM transactions t
        LEFT JOIN properties p ON t.property_id = p.id
        ${whereClause}
        GROUP BY ${groupBySql ? groupBySql : 't.id'}
      ) AS groups_count
    `;

    // Requête pour les groupes avec pagination
    const groupsQuery = `
      WITH transaction_stats AS (
        SELECT 
          ${groupBySql ? groupBySql : 't.id'} as group_key,
          COUNT(*) as count,
          SUM(CAST(t.amount AS DECIMAL)) as total_amount,
          MIN(t.date) as first_date,
          MAX(t.date) as last_date
        FROM transactions t
        LEFT JOIN properties p ON t.property_id = p.id
        ${whereClause}
        GROUP BY ${groupBySql ? groupBySql : 't.id'}
      )
      SELECT 
        group_key,
        count,
        total_amount,
        first_date,
        last_date
      FROM transaction_stats
      ORDER BY ${validSortBy === 'amount' ? 'total_amount' :
                validSortBy === 'count' ? 'count' :
                'last_date'} ${validSortOrder}
      LIMIT $${paramIndex + 1}
      OFFSET $${paramIndex + 2}
    `;

    params.push(pageSizeNum, skip);

    logger.info("Executing count query:", countQuery);
    logger.info("Executing groups query:", groupsQuery);

    // Exécuter les requêtes en parallèle pour plus d'efficacité
    const [countResult, groupsResult] = await Promise.all([
      db.execute(sql.raw(countQuery, params.slice(0, paramIndex))),
      db.execute(sql.raw(groupsQuery, params))
    ]);

    const total = parseInt(countResult.rows[0]?.total?.toString() || "0");

    // Formater les groupes
    const groups = groupsResult.rows.map((group: any) => {
      return {
        key: group.group_key || "",
        label: group.group_key || "Non catégorisé",
        count: parseInt(group.count),
        totalAmount: parseFloat(group.total_amount || "0"),
        firstDate: group.first_date ? format(new Date(group.first_date), 'dd/MM/yyyy') : null,
        lastDate: group.last_date ? format(new Date(group.last_date), 'dd/MM/yyyy') : null,
        formattedAmount: new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR'
        }).format(parseFloat(group.total_amount || "0"))
      };
    });

    // Retourner les options et les données groupées
    res.json({
      options: Object.entries(GROUP_BY_OPTIONS).map(([value, { label }]) => ({
        value,
        label
      })),
      groups,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (error: any) {
    logger.error("Error fetching transaction groups:", error);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des groupes de transactions", 
      details: error.message 
    });
  }
});

// Get transactions for a specific group
router.get("/group/:key", ensureAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const { key } = req.params;
    const { 
      page = "1", 
      pageSize = "9999", // Augmenter la valeur par défaut à un nombre très grand pour charger toutes les transactions
      groupBy = "date"
    } = req.query;

    // Vérifier si le type de regroupement est valide
    const groupByKey = groupBy as keyof typeof GROUP_BY_OPTIONS;
    if (!GROUP_BY_OPTIONS[groupByKey]) {
      return res.status(400).json({ error: "Type de regroupement invalide" });
    }

    // Parse query parameters - permettre des valeurs très grandes
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = req.query.pageSize === "all" ? 99999 : parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    // Préparer les paramètres de requête de manière sécurisée
    const params: any[] = [userId, key];

    // Obtenir la colonne SQL appropriée pour le regroupement
    const groupSqlExpr = getGroupColumnForSQL(groupBy as string);
    if (!groupSqlExpr) {
      return res.status(400).json({ error: "Type de regroupement non supporté" });
    }

    // Construire la condition de groupe de manière sécurisée
    const groupCondition = `AND ${groupSqlExpr} = $2`;

    // Requête pour compter le nombre total de transactions dans ce groupe
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      WHERE t.user_id = $1 ${groupCondition}
    `;

    // Requête pour récupérer les transactions paginées pour ce groupe
    // Cette requête utilise une jointure pour récupérer toutes les informations
    // nécessaires en une seule requête
    const transactionsQuery = `
      SELECT 
        t.*,
        p.name as property_name,
        te.id as tenant_id,
        te.name as tenant_name,
        u.full_name as user_full_name
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN tenants te ON t.tenant_id = te.id
      LEFT JOIN users u ON te.user_id = u.id
      WHERE t.user_id = $1 ${groupCondition}
      ORDER BY t.date DESC
      LIMIT $3
      OFFSET $4
    `;

    // Paramètres pour la requête des transactions
    const transactionParams = [...params, pageSizeNum, skip];

    logger.info("Executing count query for group:", countQuery);
    logger.info("Executing transactions query for group:", transactionsQuery);

    // Exécuter les requêtes en parallèle pour plus d'efficacité
    const [countResult, transactionsResult] = await Promise.all([
      db.execute(sql.raw(countQuery, params)),
      db.execute(sql.raw(transactionsQuery, transactionParams))
    ]);

    const total = parseInt(countResult.rows[0]?.total?.toString() || "0");

    // Formater les transactions
    const formattedTransactions = transactionsResult.rows.map((transaction: any) => {
      // S'assurer que documentIds est un tableau
      let documentIds = [];
      if (transaction.document_ids) {
        try {
          documentIds = Array.isArray(transaction.document_ids) 
            ? transaction.document_ids
            : JSON.parse(transaction.document_ids);
        } catch (e) {
          logger.warn(`Failed to parse documentIds for transaction ${transaction.id}: ${transaction.document_ids}`);
          documentIds = [];
        }
      }

      return {
        id: transaction.id,
        propertyId: transaction.property_id,
        tenantId: transaction.tenant_id,
        amount: parseFloat(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        status: transaction.status,
        documentIds: documentIds,
        property: transaction.property_name ? { name: transaction.property_name } : null,
        tenant: transaction.tenant_id ? { 
          name: transaction.tenant_name,
          user: transaction.user_full_name ? { fullName: transaction.user_full_name } : null
        } : null,
        formattedDate: format(new Date(transaction.date), 'dd/MM/yyyy'),
        formattedAmount: new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR'
        }).format(parseFloat(transaction.amount))
      };
    });

    res.json({
      data: formattedTransactions,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum)
      }
    });
  } catch (error: any) {
    logger.error("Error fetching group transactions:", error);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des transactions du groupe", 
      details: error.message 
    });
  }
});

// Helper function to get the SQL column for grouping in raw SQL
function getGroupColumnForSQL(groupBy: string): string | null {
  switch (groupBy) {
    case 'date':
      return "to_char(t.date, 'YYYY-MM-DD')";
    case 'month':
      return "to_char(t.date, 'YYYY-MM')";
    case 'property':
      return "coalesce(p.name, 'Sans propriété')";
    case 'category':
      return "t.category";
    case 'type':
      return "t.type";
    case 'status':
      return "t.status";
    case 'property_type_category':
      return "concat(coalesce(p.name, 'Sans propriété'), ' - ', t.type, ' - ', t.category)";
    case 'property_category':
      return "concat(coalesce(p.name, 'Sans propriété'), ' - ', t.category)";
    case 'type_category':
      return "concat(t.type, ' - ', t.category)";
    case 'property_type':
      return "concat(coalesce(p.name, 'Sans propriété'), ' - ', t.type)";
    case 'month_category':
      return "concat(to_char(t.date, 'YYYY-MM'), ' - ', t.category)";
    case 'month_type':
      return "concat(to_char(t.date, 'YYYY-MM'), ' - ', t.type)";
    case 'month_property':
      return "concat(to_char(t.date, 'YYYY-MM'), ' - ', coalesce(p.name, 'Sans propriété'))";
    default:
      return null;
  }
}

export default router;